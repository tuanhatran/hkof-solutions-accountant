/// <reference types="cypress" />

interface MailpitAddress {
  Address: string;
}

interface MailpitSummary {
  ID: string;
  To?: MailpitAddress[];
}

interface MailpitMessageList {
  messages?: MailpitSummary[];
}

interface MailpitMessage {
  Text?: string;
  HTML?: string;
}

const SEEDED_EMAIL = "thtran@homeofficeexpenses.local";
const E2E_EMAIL = "e2e@homeofficeexpenses.local";
const E2E_PASSWORD = "e2e-password";
const NEW_PASSWORD = "motdepasse-e2e";

function mailpitUrl(): string {
  const configured = Cypress.expose("mailpitUrl") as string | undefined;
  return configured ?? "http://localhost:8025";
}

/** Polls Mailpit until the confirmation e-mail for the recipient is delivered. */
function findConfirmationMessage(
  recipient: string,
  attempt = 0,
): Cypress.Chainable<MailpitMessage> {
  return cy
    .request({ url: `${mailpitUrl()}/api/v1/messages`, log: false })
    .then((response) => {
      const list = response.body as MailpitMessageList;
      const summary = (list.messages ?? []).find((message) =>
        (message.To ?? []).some(
          (to) => to.Address.toLowerCase() === recipient.toLowerCase(),
        ),
      );
      if (summary) {
        return cy
          .request({
            url: `${mailpitUrl()}/api/v1/message/${summary.ID}`,
            log: false,
          })
          .then((detail) => detail.body as MailpitMessage);
      }
      if (attempt >= 40) {
        throw new Error(`Confirmation e-mail missing for ${recipient}`);
      }
      return cy
        .wait(250)
        .then(() => findConfirmationMessage(recipient, attempt + 1));
    });
}

function confirmationToken(message: MailpitMessage): string {
  const source = message.Text ?? message.HTML ?? "";
  const match = /confirmer-email\?token=([A-Za-z0-9_-]+)/.exec(source);
  if (!match) {
    throw new Error("Confirmation token missing from the e-mail");
  }
  return match[1];
}

function fillRegistration(email: string, password: string) {
  cy.get('[data-cy="auth-email"]').clear().type(email);
  cy.get('[data-cy="auth-password"]').clear().type(password);
  cy.get('[data-cy="auth-password-confirm"]').clear().type(password);
  cy.get('[data-cy="auth-submit"]').click();
}

function signIn(email: string, password: string) {
  cy.get('[data-cy="auth-email"]').clear().type(email);
  cy.get('[data-cy="auth-password"]').clear().type(password);
  cy.get('[data-cy="auth-submit"]').click();
}

describe("authentication", () => {
  it("registers, confirms through Mailpit, rejects the used link and signs in", () => {
    const email = `e2e-auth-${Date.now()}@example.test`;
    cy.visit("/inscription");
    fillRegistration(email, NEW_PASSWORD);

    cy.contains(
      "Un e-mail de confirmation vient de vous être envoyé. Ouvrez le lien reçu pour activer votre compte.",
    ).should("be.visible");

    findConfirmationMessage(email).then((message) => {
      const token = confirmationToken(message);
      cy.visit(`/confirmer-email?token=${token}`);
      cy.contains("Adresse confirmée").should("be.visible");

      cy.visit(`/confirmer-email?token=${token}`);
      cy.contains("Ce lien de confirmation est invalide ou a expiré.").should(
        "be.visible",
      );

      cy.visit("/connexion");
      signIn(email, NEW_PASSWORD);
      cy.location("pathname").should("eq", "/bienvenue");
      cy.contains(email).should("be.visible");
    });
  });

  it("shows French errors for a duplicate e-mail and a wrong password", () => {
    cy.visit("/inscription");
    fillRegistration(SEEDED_EMAIL, NEW_PASSWORD);
    cy.contains("Un compte existe déjà avec cette adresse e-mail.").should(
      "be.visible",
    );

    cy.visit("/connexion");
    signIn(E2E_EMAIL, "mauvais-mot-de-passe");
    cy.contains("Adresse e-mail ou mot de passe incorrect.").should(
      "be.visible",
    );
  });

  it("signs a normal user in and out", () => {
    cy.visit("/connexion");
    signIn(E2E_EMAIL, E2E_PASSWORD);
    cy.location("pathname").should("eq", "/generer/quittance");

    cy.get('[data-cy="logout"]').click();
    cy.location("pathname").should("eq", "/connexion");
    cy.contains("Connexion").should("be.visible");

    cy.request({ url: "/api/companies", failOnStatusCode: false })
      .its("status")
      .should("eq", 401);
  });

  it("forces the seeded account to change its provisional password", () => {
    cy.visit("/connexion");
    signIn(SEEDED_EMAIL, "thtran");
    cy.location("pathname").should("eq", "/mot-de-passe");
    cy.contains(
      "Votre mot de passe provisoire doit être remplacé avant de continuer.",
    ).should("be.visible");

    cy.request({ url: "/api/companies", failOnStatusCode: false })
      .its("status")
      .should("eq", 403);
    cy.request({ url: "/api/companies", failOnStatusCode: false })
      .its("body.code")
      .should("eq", "PASSWORD_CHANGE_REQUIRED");

    cy.get('[data-cy="auth-current-password"]').clear().type("thtran");
    cy.get('[data-cy="auth-new-password"]').clear().type(NEW_PASSWORD);
    cy.get('[data-cy="auth-password-confirm"]').clear().type(NEW_PASSWORD);
    cy.get('[data-cy="auth-submit"]').click();

    cy.location("pathname").should("eq", "/generer/quittance");
    cy.request({ url: "/api/companies" }).its("status").should("eq", 200);
  });

  it("redirects an anonymous visitor from a protected page to the login page", () => {
    cy.visit("/historique");
    cy.location("pathname").should("eq", "/connexion");
    cy.get("h1").should("contain.text", "Connexion");
  });
});
