package fr.hkof.homeofficeexpenses.config;

import java.io.IOException;
import java.util.List;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;

import tools.jackson.databind.ObjectMapper;

import fr.hkof.homeofficeexpenses.repository.AppUserRepository;
import fr.hkof.homeofficeexpenses.service.AuthService.AuthenticatedUser;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Session-cookie security: the API is closed except for the public auth endpoints, the e2e
 * reset (only under the e2e profile) and the health probe. CSRF uses the XSRF-TOKEN cookie
 * mirrored in the X-XSRF-TOKEN header. Setting {@code app.security.enabled=false} keeps the
 * existing test profile usable without a session.
 */
@Configuration
@EnableConfigurationProperties(AppProperties.Auth.class)
public class SecurityConfig {

    static final String CSRF_COOKIE = "XSRF-TOKEN";
    static final String CSRF_HEADER = "X-XSRF-TOKEN";

    private static final String[] PUBLIC_PATHS = {
            "/api/auth/register",
            "/api/auth/confirm-email",
            "/api/auth/resend-confirmation",
            "/api/auth/login",
            "/actuator/health",
            "/actuator/health/**",
            "/actuator/info",
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
    };

    private final AppProperties properties;
    private final AppUserRepository users;
    private final boolean securityEnabled;
    private final boolean e2eProfile;

    public SecurityConfig(AppProperties properties, AppUserRepository users, Environment environment) {
        this.properties = properties;
        this.users = users;
        this.securityEnabled = environment.getProperty("app.security.enabled", Boolean.class, Boolean.TRUE);
        this.e2eProfile = environment.matchesProfiles("e2e");
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = properties.corsAllowedOrigins();
        if (origins != null) {
            configuration.setAllowedOrigins(origins);
        }
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Content-Disposition"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, ObjectMapper objectMapper) throws Exception {
        if (!securityEnabled) {
            http.csrf(AbstractHttpConfigurer::disable)
                    .authorizeHttpRequests(authorize -> authorize.anyRequest().permitAll());
            return http.build();
        }

        CookieCsrfTokenRepository csrfRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrfRepository.setCookieName(CSRF_COOKIE);
        csrfRepository.setHeaderName(CSRF_HEADER);
        http.csrf(csrf -> {
            csrf.csrfTokenRepository(csrfRepository)
                    .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler());
            List<String> ignored = new java.util.ArrayList<>(List.of(
                    "/api/auth/register",
                    "/api/auth/confirm-email",
                    "/api/auth/resend-confirmation",
                    "/api/auth/login"));
            if (e2eProfile) {
                ignored.add("/api/e2e/**");
            }
            csrf.ignoringRequestMatchers(ignored.toArray(String[]::new));
        });
        http.cors(Customizer.withDefaults());
        http.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED));
        http.formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable);
        http.authorizeHttpRequests(authorize -> authorize
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(PUBLIC_PATHS).permitAll()
                .requestMatchers("/api/e2e/**").access((authentication, context) -> e2eProfile
                        ? new org.springframework.security.authorization.AuthorizationDecision(true)
                        : new org.springframework.security.authorization.AuthorizationDecision(false))
                .requestMatchers("/api/admin/users", "/api/admin/users/**").hasRole("ADMIN")
                .anyRequest().authenticated());
        http.exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint((request, response, authException) -> writeProblem(objectMapper, response,
                        HttpStatus.UNAUTHORIZED, "Non authentifié",
                        "Vous devez vous connecter pour accéder à cette ressource.", "UNAUTHENTICATED"))
                .accessDeniedHandler(accessDeniedHandler(objectMapper)));
        http.addFilterBefore(new CsrfCookieFilter(csrfRepository), CsrfFilter.class);
        http.addFilterAfter(new PasswordChangeRequiredFilter(objectMapper), AuthorizationFilter.class);
        http.addFilterAfter(new ModuleAccessFilter(users, objectMapper), AuthorizationFilter.class);
        return http.build();
    }

    private static AccessDeniedHandler accessDeniedHandler(ObjectMapper objectMapper) {
        return (request, response, accessDeniedException) -> {
            if (accessDeniedException instanceof CsrfException) {
                writeProblem(objectMapper, response, HttpStatus.FORBIDDEN, "Jeton de sécurité invalide",
                        "Le jeton de sécurité est absent ou invalide. Rechargez la page.", "CSRF_INVALID");
                return;
            }
            writeProblem(objectMapper, response, HttpStatus.FORBIDDEN, "Accès refusé",
                    "Vous n'avez pas accès à cette action.", "ACCESS_DENIED");
        };
    }

    private static void writeProblem(ObjectMapper objectMapper, HttpServletResponse response, HttpStatus status,
            String title, String detail, String code) throws IOException {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(title);
        problem.setProperty("code", code);
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), problem);
    }

    /** Ensures the XSRF-TOKEN cookie exists before the first authenticated mutation. */
    private static final class CsrfCookieFilter extends OncePerRequestFilter {

        private final CsrfTokenRepository repository;

        private CsrfCookieFilter(CsrfTokenRepository repository) {
            this.repository = repository;
        }

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                FilterChain filterChain) throws ServletException, IOException {
            CsrfToken token = repository.loadToken(request);
            if (token == null) {
                token = repository.generateToken(request);
            }
            repository.saveToken(token, request, response);
            filterChain.doFilter(request, response);
        }
    }

    /** Blocks every API while a forced password change is pending. */
    private static final class PasswordChangeRequiredFilter extends OncePerRequestFilter {

        private final ObjectMapper objectMapper;

        private PasswordChangeRequiredFilter(ObjectMapper objectMapper) {
            this.objectMapper = objectMapper;
        }

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                FilterChain filterChain) throws ServletException, IOException {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser user
                    && user.mustChangePassword() && !isAllowed(request)) {
                writeProblem(objectMapper, response, HttpStatus.FORBIDDEN, "Changement de mot de passe requis",
                        "Changez votre mot de passe avant de continuer.", "PASSWORD_CHANGE_REQUIRED");
                return;
            }
            filterChain.doFilter(request, response);
        }

        private static boolean isAllowed(HttpServletRequest request) {
            String path = request.getRequestURI();
            String method = request.getMethod();
            if (HttpMethod.OPTIONS.matches(method)) {
                return true;
            }
            if (HttpMethod.GET.matches(method) && "/api/auth/me".equals(path)) {
                return true;
            }
            return HttpMethod.POST.matches(method)
                    && ("/api/auth/logout".equals(path) || "/api/auth/change-password".equals(path));
        }
    }
}
