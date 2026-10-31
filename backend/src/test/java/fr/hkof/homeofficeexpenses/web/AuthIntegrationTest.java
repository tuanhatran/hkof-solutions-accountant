package fr.hkof.homeofficeexpenses.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import jakarta.servlet.http.Cookie;

import fr.hkof.homeofficeexpenses.domain.AppUser;
import fr.hkof.homeofficeexpenses.repository.AppUserRepository;

@SpringBootTest(properties = "app.security.enabled=true")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthIntegrationTest {

    private static final String SEED_EMAIL = "thtran@homeofficeexpenses.local";
    private static final String SEED_PASSWORD = "thtran";
    private static final String JSON = MediaType.APPLICATION_JSON_VALUE;
    private static final String CSRF_HEADER = "X-XSRF-TOKEN";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AppUserRepository users;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private JavaMailSender mailSender;

    @AfterEach
    void restoreSeedUser() {
        users.findByEmailIgnoreCase(SEED_EMAIL).ifPresent(user -> {
            user.setPasswordHash(passwordEncoder.encode(SEED_PASSWORD));
            user.setConfirmed(true);
            user.setMustChangePassword(true);
            user.setConfirmationTokenHash(null);
            user.setConfirmationTokenExpiresAt(null);
            users.save(user);
        });
    }

    @Test
    @DisplayName("Unauthenticated API calls are rejected with a French problem detail")
    void rejectsUnauthenticatedRequests() throws Exception {
        mockMvc.perform(get("/api/companies"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"))
                .andExpect(jsonPath("$.detail").value(
                        "Vous devez vous connecter pour accéder à cette ressource."));

        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("The onboarding completion is idempotent and exposed by me and login")
    void completesOnboardingOnce() throws Exception {
        register("ines@example.test", "motdepasse");
        confirm(lastConfirmationTokenFor("ines@example.test"));
        MvcResult login = login("ines@example.test", "motdepasse");
        MockHttpSession session = sessionOf(login);
        Cookie csrf = csrfCookieOf(login, session);

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.onboardingCompleted").value(false));

        mockMvc.perform(post("/api/auth/onboarding-complete").session(session)
                        .cookie(csrf).header(CSRF_HEADER, csrf.getValue()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("ines@example.test"))
                .andExpect(jsonPath("$.onboardingCompleted").value(true));
        mockMvc.perform(post("/api/auth/onboarding-complete").session(session)
                        .cookie(csrf).header(CSRF_HEADER, csrf.getValue()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.onboardingCompleted").value(true));

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.onboardingCompleted").value(true));
        mockMvc.perform(post("/api/auth/login").contentType(JSON)
                        .content("{\"email\":\"ines@example.test\",\"password\":\"motdepasse\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.onboardingCompleted").value(true));
    }

    @Test
    @DisplayName("Registration stores only a token hash, sends the link and confirmation enables login")
    void registersConfirmsAndLogsIn() throws Exception {
        register("alice@example.test", "motdepasse");
        String token = lastConfirmationToken();

        AppUser pending = users.findByEmailIgnoreCase("alice@example.test").orElseThrow();
        assertThat(pending.isConfirmed()).isFalse();
        assertThat(pending.getConfirmationTokenHash()).isNotEqualTo(token).hasSize(64);
        assertThat(pending.getConfirmationTokenExpiresAt()).isAfter(Instant.now());

        mockMvc.perform(post("/api/auth/confirm-email")
                        .contentType(JSON)
                        .content("{\"token\":\"" + token + "\"}"))
                .andExpect(status().isNoContent());

        AppUser confirmed = users.findByEmailIgnoreCase("alice@example.test").orElseThrow();
        assertThat(confirmed.isConfirmed()).isTrue();
        assertThat(confirmed.getConfirmationTokenHash()).isNull();

        MvcResult login = login("alice@example.test", "motdepasse");
        MockHttpSession session = sessionOf(login);

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("alice@example.test"))
                .andExpect(jsonPath("$.mustChangePassword").value(false));
    }

    @Test
    @DisplayName("Duplicate email is refused and resending for an unknown address stays silent")
    void refusesDuplicateEmailWithoutEnumeratingResend() throws Exception {
        register("bob@example.test", "motdepasse");
        reset(mailSender);

        mockMvc.perform(post("/api/auth/register").contentType(JSON)
                        .content("{\"email\":\"bob@example.test\",\"password\":\"motdepasse\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("EMAIL_ALREADY_USED"));

        mockMvc.perform(post("/api/auth/resend-confirmation").contentType(JSON)
                        .content("{\"email\":\"inconnu@example.test\"}"))
                .andExpect(status().isNoContent());
        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    @DisplayName("An unconfirmed account and a wrong password are rejected with distinct French errors")
    void rejectsUnconfirmedAndWrongPassword() throws Exception {
        register("carol@example.test", "motdepasse");

        mockMvc.perform(post("/api/auth/login").contentType(JSON)
                        .content("{\"email\":\"carol@example.test\",\"password\":\"motdepasse\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("EMAIL_NOT_CONFIRMED"));

        confirm(carolToken());

        mockMvc.perform(post("/api/auth/login").contentType(JSON)
                        .content("{\"email\":\"carol@example.test\",\"password\":\"mauvais-mot-de-passe\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.detail").value("Adresse e-mail ou mot de passe incorrect."));
    }

    @Test
    @DisplayName("A used or expired confirmation token is refused")
    void rejectsUsedAndExpiredTokens() throws Exception {
        register("dave@example.test", "motdepasse");
        String token = lastConfirmationToken();
        confirm(token);

        mockMvc.perform(post("/api/auth/confirm-email").contentType(JSON)
                        .content("{\"token\":\"" + token + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("CONFIRMATION_TOKEN_INVALID"));

        register("erin@example.test", "motdepasse");
        String expired = lastConfirmationToken();
        AppUser user = users.findByEmailIgnoreCase("erin@example.test").orElseThrow();
        user.setConfirmationTokenExpiresAt(Instant.now().minusSeconds(60));
        users.save(user);

        mockMvc.perform(post("/api/auth/confirm-email").contentType(JSON)
                        .content("{\"token\":\"" + expired + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("CONFIRMATION_TOKEN_INVALID"));
    }

    @Test
    @DisplayName("The seeded account must change its password before any other API, and CSRF guards mutations")
    void forcesPasswordChangeAndProtectsMutations() throws Exception {
        MvcResult login = login(SEED_EMAIL, SEED_PASSWORD);
        MockHttpSession session = sessionOf(login);
        Cookie csrf = csrfCookieOf(login, session);

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(SEED_EMAIL))
                .andExpect(jsonPath("$.mustChangePassword").value(true))
                .andExpect(jsonPath("$.onboardingCompleted").value(true));

        mockMvc.perform(get("/api/companies").session(session))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("PASSWORD_CHANGE_REQUIRED"));

        mockMvc.perform(post("/api/auth/change-password").session(session)
                        .contentType(JSON)
                        .content("{\"currentPassword\":\"thtran\",\"newPassword\":\"nouveau-mot-de-passe\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"));

        mockMvc.perform(post("/api/auth/change-password").session(session)
                        .cookie(csrf).header(CSRF_HEADER, csrf.getValue())
                        .contentType(JSON)
                        .content("{\"currentPassword\":\"thtran\",\"newPassword\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));

        mockMvc.perform(post("/api/auth/change-password").session(session)
                        .cookie(csrf).header(CSRF_HEADER, csrf.getValue())
                        .contentType(JSON)
                        .content("{\"currentPassword\":\"thtran\",\"newPassword\":\"" + "x".repeat(101) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));

        mockMvc.perform(post("/api/auth/change-password").session(session)
                        .cookie(csrf).header(CSRF_HEADER, csrf.getValue())
                        .contentType(JSON)
                        .content("{\"currentPassword\":\"faux\",\"newPassword\":\"nouveau-mot-de-passe\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PASSWORD"));

        mockMvc.perform(post("/api/auth/change-password").session(session)
                        .cookie(csrf).header(CSRF_HEADER, csrf.getValue())
                        .contentType(JSON)
                        .content("{\"currentPassword\":\"thtran\",\"newPassword\":\"n\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mustChangePassword").value(false));

        mockMvc.perform(get("/api/companies").session(session))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/logout").session(session).cookie(csrf).header(CSRF_HEADER, csrf.getValue()))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/auth/login").contentType(JSON)
                        .content("{\"email\":\"" + SEED_EMAIL + "\",\"password\":\"n\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Registration accepts a one-character password but still rejects a blank or too long one")
    void registersWithoutMinimumPasswordLength() throws Exception {
        register("gina@example.test", "a");

        mockMvc.perform(post("/api/auth/register").contentType(JSON)
                        .content("{\"email\":\"hugo@example.test\",\"password\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        mockMvc.perform(post("/api/auth/register").contentType(JSON)
                        .content("{\"email\":\"hugo@example.test\",\"password\":\"" + "x".repeat(101) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    @DisplayName("A mail delivery failure does not prevent registration and can be retried")
    void keepsRegistrationUsableWhenMailFails() throws Exception {
        doThrow(new MailSendException("smtp down")).when(mailSender).send(any(SimpleMailMessage.class));

        register("frank@example.test", "motdepasse");

        mockMvc.perform(post("/api/auth/resend-confirmation").contentType(JSON)
                        .content("{\"email\":\"frank@example.test\"}"))
                .andExpect(status().isNoContent());
    }

    private void register(String email, String password) throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isNoContent());
    }

    private void confirm(String token) throws Exception {
        mockMvc.perform(post("/api/auth/confirm-email").contentType(JSON)
                        .content("{\"token\":\"" + token + "\"}"))
                .andExpect(status().isNoContent());
    }

    private String carolToken() throws Exception {
        return lastConfirmationTokenFor("carol@example.test");
    }

    private String lastConfirmationToken() {
        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender, atLeastOnce()).send(captor.capture());
        return tokenOf(captor.getValue().getText());
    }

    private String lastConfirmationTokenFor(String email) {
        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender, atLeastOnce()).send(captor.capture());
        return captor.getAllValues().stream()
                .filter(message -> email.equals(message.getTo() == null ? null : message.getTo()[0]))
                .reduce((first, second) -> second)
                .map(SimpleMailMessage::getText)
                .map(AuthIntegrationTest::tokenOf)
                .orElseThrow();
    }

    private static String tokenOf(String text) {
        Matcher matcher = Pattern.compile("token=([A-Za-z0-9_-]+)").matcher(text);
        assertThat(matcher.find()).isTrue();
        return matcher.group(1);
    }

    private MvcResult login(String email, String password) throws Exception {
        return mockMvc.perform(post("/api/auth/login").contentType(JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
    }

    private MockHttpSession sessionOf(MvcResult result) {
        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
        assertThat(session).isNotNull();
        return session;
    }

    private Cookie csrfCookieOf(MvcResult login, MockHttpSession session) throws Exception {
        if (login.getResponse().getCookie("XSRF-TOKEN") != null) {
            return login.getResponse().getCookie("XSRF-TOKEN");
        }
        MvcResult me = mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(me.getResponse().getCookie("XSRF-TOKEN")).isNotNull();
        return me.getResponse().getCookie("XSRF-TOKEN");
    }
}
