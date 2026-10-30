package fr.hkof.homeofficeexpenses.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import fr.hkof.homeofficeexpenses.domain.AppUser;
import fr.hkof.homeofficeexpenses.domain.UserRole;
import fr.hkof.homeofficeexpenses.repository.AppUserRepository;
import jakarta.servlet.http.Cookie;

@SpringBootTest(properties = "app.security.enabled=true")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminUserControllerIntegrationTest {

    private static final String JSON = MediaType.APPLICATION_JSON_VALUE;
    private static final String CSRF_HEADER = "X-XSRF-TOKEN";
    private static final String PASSWORD = "motdepasse-admin";
    private static final String ADMIN_EMAIL = "admin.manage@example.test";
    private static final String USER_EMAIL = "regular.manage@example.test";
    private static final String ME_EMAIL = "me.profile@example.test";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AppUserRepository users;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private JavaMailSender mailSender;

    @Test
    @DisplayName("GET /api/auth/me exposes the role and both module flags")
    void meExposesRoleAndModules() throws Exception {
        Session session = sessionFor(ME_EMAIL, UserRole.USER, false, true);

        mockMvc.perform(get("/api/auth/me").session(session.http()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(ME_EMAIL))
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.companyEnabled").value(false))
                .andExpect(jsonPath("$.lmnpEnabled").value(true));
    }

    @Test
    @DisplayName("An admin lists accounts, toggles modules and changes a role")
    void adminManagesUsers() throws Exception {
        Session admin = sessionFor(ADMIN_EMAIL, UserRole.ADMIN, true, true);
        sessionFor(USER_EMAIL, UserRole.USER, true, true);

        mockMvc.perform(get("/api/admin/users").session(admin.http()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.email == '" + ADMIN_EMAIL + "')]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.email == '" + USER_EMAIL + "')]").isNotEmpty());

        long userId = userId(USER_EMAIL);
        mockMvc.perform(mutation(patch("/api/admin/users/{id}/modules", userId), admin)
                        .contentType(JSON)
                        .content("{\"companyEnabled\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.companyEnabled").value(false))
                .andExpect(jsonPath("$.lmnpEnabled").value(true));

        AppUser updated = users.findById(userId).orElseThrow();
        assertThat(updated.isCompanyEnabled()).isFalse();
        assertThat(updated.isLmnpEnabled()).isTrue();

        mockMvc.perform(mutation(patch("/api/admin/users/{id}/role", userId), admin)
                        .contentType(JSON)
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));

        assertThat(users.findById(userId).orElseThrow().getRole()).isEqualTo(UserRole.ADMIN);
    }

    @Test
    @DisplayName("A non-admin account cannot use the admin endpoints")
    void nonAdminIsForbidden() throws Exception {
        Session user = sessionFor(USER_EMAIL, UserRole.USER, true, true);

        mockMvc.perform(get("/api/admin/users").session(user.http()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));

        mockMvc.perform(mutation(patch("/api/admin/users/{id}/modules", userId(USER_EMAIL)), user)
                        .contentType(JSON)
                        .content("{\"companyEnabled\":false}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));

        assertThat(users.findById(userId(USER_EMAIL)).orElseThrow().isCompanyEnabled()).isTrue();
    }

    @Test
    @DisplayName("A non-admin keeps its own LLM configuration but cannot manage users")
    void nonAdminKeepsOwnLlmConfigButNotUserManagement() throws Exception {
        Session user = sessionFor(USER_EMAIL, UserRole.USER, true, true);

        mockMvc.perform(get("/api/admin/llm").session(user.http()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.remoteUrl").value(false));

        mockMvc.perform(mutation(put("/api/admin/llm"), user)
                        .contentType(JSON)
                        .content("{\"url\":\"https://llm.exemple.fr\",\"apiKey\":\"secret-de-test\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.remoteUrl").value(true))
                .andExpect(jsonPath("$.apiKeyConfigured").value(true));

        mockMvc.perform(get("/api/admin/llm").session(user.http()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.remoteUrl").value(true));

        mockMvc.perform(get("/api/admin/users").session(user.http()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }

    @Test
    @DisplayName("An unknown account answers USER_NOT_FOUND and an empty module body is refused")
    void rejectsUnknownUserAndEmptyModules() throws Exception {
        Session admin = sessionFor(ADMIN_EMAIL, UserRole.ADMIN, true, true);

        mockMvc.perform(mutation(patch("/api/admin/users/{id}/modules", 999_999L), admin)
                        .contentType(JSON)
                        .content("{\"companyEnabled\":false}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));

        mockMvc.perform(mutation(patch("/api/admin/users/{id}/modules", userId(ADMIN_EMAIL)), admin)
                        .contentType(JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MODULES_REQUIRED"));
    }

    private long userId(String email) {
        return users.findByEmailIgnoreCase(email).orElseThrow().getId();
    }

    private Session sessionFor(String email, UserRole role, boolean companyEnabled, boolean lmnpEnabled)
            throws Exception {
        AppUser user = users.findByEmailIgnoreCase(email).orElseGet(AppUser::new);
        Instant now = Instant.now();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setConfirmed(true);
        user.setMustChangePassword(false);
        user.setRole(role);
        user.setCompanyEnabled(companyEnabled);
        user.setLmnpEnabled(lmnpEnabled);
        if (user.getCreatedAt() == null) {
            user.setCreatedAt(now);
        }
        user.setUpdatedAt(now);
        users.save(user);

        MvcResult result = mockMvc.perform(post("/api/auth/login").contentType(JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
        assertThat(session).isNotNull();
        Cookie csrf = result.getResponse().getCookie("XSRF-TOKEN");
        if (csrf == null) {
            MvcResult me = mockMvc.perform(get("/api/auth/me").session(session))
                    .andExpect(status().isOk())
                    .andReturn();
            csrf = me.getResponse().getCookie("XSRF-TOKEN");
        }
        assertThat(csrf).isNotNull();
        return new Session(session, csrf);
    }

    private MockHttpServletRequestBuilder mutation(MockHttpServletRequestBuilder builder, Session session) {
        return builder.session(session.http()).cookie(session.csrf())
                .header(CSRF_HEADER, session.csrf().getValue());
    }

    private record Session(MockHttpSession http, Cookie csrf) {
    }
}
