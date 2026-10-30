package fr.hkof.homeofficeexpenses.config;

import java.io.IOException;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import tools.jackson.databind.ObjectMapper;

import fr.hkof.homeofficeexpenses.domain.AppUser;
import fr.hkof.homeofficeexpenses.repository.AppUserRepository;
import fr.hkof.homeofficeexpenses.service.AuthService.AuthenticatedUser;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Rejects the routes of a module that the authenticated account has disabled. The flags are
 * read from the database on every request so revoking a module takes effect without a new login.
 */
final class ModuleAccessFilter extends OncePerRequestFilter {

    static final String MODULE_COMPANY_DISABLED = "MODULE_COMPANY_DISABLED";
    static final String MODULE_LMNP_DISABLED = "MODULE_LMNP_DISABLED";

    private static final List<String> COMPANY_PREFIXES = List.of(
            "/api/companies", "/api/expense-statements", "/api/expense-items");
    private static final List<String> LMNP_PREFIXES = List.of(
            "/api/leases", "/api/rent-receipts", "/api/persons");

    private final AppUserRepository users;
    private final ObjectMapper objectMapper;

    ModuleAccessFilter(AppUserRepository users, ObjectMapper objectMapper) {
        this.users = users;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser principal) {
            String path = request.getRequestURI();
            boolean companyRoute = matches(COMPANY_PREFIXES, path);
            boolean lmnpRoute = matches(LMNP_PREFIXES, path);
            if (companyRoute || lmnpRoute) {
                AppUser user = users.findById(principal.id()).orElse(null);
                if (companyRoute && user != null && !user.isCompanyEnabled()) {
                    writeProblem(response, "Module entreprise désactivé",
                            "Le module entreprise est désactivé pour ce compte.", MODULE_COMPANY_DISABLED);
                    return;
                }
                if (lmnpRoute && user != null && !user.isLmnpEnabled()) {
                    writeProblem(response, "Module LMNP désactivé",
                            "Le module LMNP est désactivé pour ce compte.", MODULE_LMNP_DISABLED);
                    return;
                }
            }
        }
        filterChain.doFilter(request, response);
    }

    private static boolean matches(List<String> prefixes, String path) {
        return prefixes.stream().anyMatch(prefix -> path.equals(prefix) || path.startsWith(prefix + "/"));
    }

    private void writeProblem(HttpServletResponse response, String title, String detail, String code)
            throws IOException {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, detail);
        problem.setTitle(title);
        problem.setProperty("code", code);
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), problem);
    }
}
