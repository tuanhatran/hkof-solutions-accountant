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
    /** A landlord may need to link a tenant company even with the company module disabled. */
    private static final String COMPANY_LOOKUP_PATH = "/api/companies/lookup";
    private static final List<String> LMNP_PREFIXES = List.of(
            "/api/rent-receipts", "/api/persons", "/api/tenants", "/api/agency");
    /**
     * A landlord and a lease belong to either module: an LMNP owner uses them for its own
     * receipts, while a company owner needs them to declare its company lease. The route stays
     * open as soon as one of the two modules is enabled.
     */
    private static final List<String> SHARED_PREFIXES = List.of("/api/leases", "/api/landlords");
    /**
     * A company-only owner has no LMNP module but must still read the receipts a landlord issued
     * for its company. Only the received read paths bypass the LMNP gate; every other receipt
     * operation (issue, list, active, draft, generation, download) stays gated.
     */
    private static final String RECEIVED_RENT_RECEIPT_PATH = "/api/rent-receipts/received";

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
            boolean companyRoute = matches(COMPANY_PREFIXES, path) && !COMPANY_LOOKUP_PATH.equals(path);
            boolean lmnpRoute = matches(LMNP_PREFIXES, path) && !isReceivedRentReceiptPath(path);
            boolean sharedRoute = matches(SHARED_PREFIXES, path);
            if (companyRoute || lmnpRoute || sharedRoute) {
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
                if (sharedRoute && user != null && !user.isLmnpEnabled() && !user.isCompanyEnabled()) {
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

    private static boolean isReceivedRentReceiptPath(String path) {
        return path.equals(RECEIVED_RENT_RECEIPT_PATH) || path.startsWith(RECEIVED_RENT_RECEIPT_PATH + "/");
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
