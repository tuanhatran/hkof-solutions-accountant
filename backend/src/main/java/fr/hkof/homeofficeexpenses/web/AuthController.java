package fr.hkof.homeofficeexpenses.web;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import fr.hkof.homeofficeexpenses.service.AuthService;
import fr.hkof.homeofficeexpenses.service.AuthService.AuthenticatedUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

import fr.hkof.homeofficeexpenses.web.dto.AuthDtos.ChangePasswordRequest;
import fr.hkof.homeofficeexpenses.web.dto.AuthDtos.ConfirmEmailRequest;
import fr.hkof.homeofficeexpenses.web.dto.AuthDtos.CurrentUserDto;
import fr.hkof.homeofficeexpenses.web.dto.AuthDtos.LoginRequest;
import fr.hkof.homeofficeexpenses.web.dto.AuthDtos.RegisterRequest;
import fr.hkof.homeofficeexpenses.web.dto.AuthDtos.ResendConfirmationRequest;

@RestController
@RequestMapping("/api/auth")
@Validated
public class AuthController {

    private final AuthService service;
    private final SecurityContextRepository securityContextRepository;

    public AuthController(AuthService service, SecurityContextRepository securityContextRepository) {
        this.service = service;
        this.securityContextRepository = securityContextRepository;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void register(@Valid @RequestBody RegisterRequest request) {
        service.register(request.email(), request.password());
    }

    @PostMapping("/confirm-email")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void confirmEmail(@Valid @RequestBody ConfirmEmailRequest request) {
        service.confirmEmail(request.token());
    }

    @PostMapping("/resend-confirmation")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resendConfirmation(@Valid @RequestBody ResendConfirmationRequest request) {
        service.resendConfirmation(request.email());
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
        AuthenticatedUser user;
        try {
            user = service.login(request.email(), request.password());
        } catch (AuthService.InvalidCredentialsException ex) {
            return problem(HttpStatus.UNAUTHORIZED, "Identifiants incorrects",
                    "Adresse e-mail ou mot de passe incorrect.", AuthService.INVALID_CREDENTIALS);
        } catch (AuthService.EmailNotConfirmedException ex) {
            return problem(HttpStatus.FORBIDDEN, "Adresse non confirmée",
                    "Confirmez votre adresse e-mail avant de vous connecter.", AuthService.EMAIL_NOT_CONFIRMED);
        }
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(user, user.getPassword(),
                user.getAuthorities()));
        SecurityContextHolder.setContext(context);
        servletRequest.getSession(true);
        servletRequest.changeSessionId();
        securityContextRepository.saveContext(context, servletRequest, servletResponse);
        return ResponseEntity.ok(currentUser(user));
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@Valid @RequestBody ChangePasswordRequest request,
            Authentication authentication, HttpServletRequest servletRequest, HttpServletResponse servletResponse) {
        AuthenticatedUser principal = principalOf(authentication);
        if (principal == null) {
            return problem(HttpStatus.UNAUTHORIZED, "Non authentifié",
                    "Vous devez vous connecter pour accéder à cette ressource.", "UNAUTHENTICATED");
        }
        AuthenticatedUser updated = service.changePassword(principal.id(), request.currentPassword(),
                request.newPassword());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(updated, updated.getPassword(),
                updated.getAuthorities()));
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, servletRequest, servletResponse);
        return ResponseEntity.ok(currentUser(updated));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        AuthenticatedUser principal = principalOf(authentication);
        if (principal == null) {
            return problem(HttpStatus.UNAUTHORIZED, "Non authentifié",
                    "Vous devez vous connecter pour accéder à cette ressource.", "UNAUTHENTICATED");
        }
        return ResponseEntity.ok(currentUser(principal));
    }

    private static AuthenticatedUser principalOf(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser user)) {
            return null;
        }
        return user;
    }

    private static CurrentUserDto currentUser(AuthenticatedUser user) {
        return new CurrentUserDto(user.email(), user.mustChangePassword(), user.role(),
                user.companyEnabled(), user.lmnpEnabled());
    }

    private static ResponseEntity<ProblemDetail> problem(HttpStatus status, String title, String detail,
            String code) {
        ProblemDetail body = ProblemDetail.forStatusAndDetail(status, detail);
        body.setTitle(title);
        body.setProperty("code", code);
        return ResponseEntity.status(status)
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .body(body);
    }
}
