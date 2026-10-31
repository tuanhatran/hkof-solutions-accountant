/// <reference types="cypress" />

import { downloadAndReadPdf, waitForValue } from "../support/helpers";

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

const PASSWORD = "motdepasse-onboarding";
const RECEIPT_MONTH = "2026-03";
const RENT_INPUT = "1 200,00";
const RENT_API = "1200.00";
const CHARGES_INPUT = "100,00";
const PROPERTY_ADDRESS = "10 rue de la Colocation, 75011 Paris";
const LANDLORD = { firstName: "Camille", lastName: "BAILLEUR" };
const FIRST_TENANT = { firstName: "Alice", lastName: "DUPONT" };
const SECOND_TENANT = { firstName: "Bob", lastName: "MARTIN" };

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

/** Draws a stroke with real pointer events on the signature canvas. */
function drawSignature() {
  cy.get('[data-cy="signature-pad-canvas"]')
    .should("be.visible")
    .then(($canvas) => {
      const canvas = $canvas[0] as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      const points = [
        { x: rect.left + 30, y: rect.top + 90 },
        { x: rect.left + 90, y: rect.top + 40 },
        { x: rect.left + 150, y: rect.top + 120 },
        { x: rect.left + 220, y: rect.top + 60 },
      ];
      const [first, ...rest] = points;
      cy.window().then((window) => {
        const fire = (
          type: "pointerdown" | "pointermove" | "pointerup",
          point: { x: number; y: number },
        ) =>
          canvas.dispatchEvent(
            new window.PointerEvent(type, {
              bubbles: true,
              cancelable: true,
              clientX: point.x,
              clientY: point.y,
              pointerId: 1,
              pointerType: "mouse",
              isPrimary: true,
            }),
          );
        fire("pointerdown", first);
        for (const point of rest) {
          fire("pointermove", point);
        }
        fire("pointerup", rest[rest.length - 1]);
      });
    });
}

describe("onboarding and colocation", () => {
  it("registers a fresh account, completes the wizard and lists both co-tenants on the receipt", () => {
    const email = `e2e-onboarding-${Date.now()}@example.test`;
    cy.resetState();
    cy.visit("/inscription");
    fillRegistration(email, PASSWORD);

    cy.contains(
      "Un e-mail de confirmation vient de vous être envoyé. Ouvrez le lien reçu pour activer votre compte.",
    ).should("be.visible");

    findConfirmationMessage(email).then((message) => {
      cy.visit(`/confirmer-email?token=${confirmationToken(message)}`);
      cy.contains("Adresse confirmée").should("be.visible");
    });

    // A fresh account lands on the wizard, never on the generator.
    cy.visit("/connexion");
    signIn(email, PASSWORD);
    cy.location("pathname").should("eq", "/bienvenue");
    cy.contains(`Connecté en tant que ${email}`).should("be.visible");

    // Step 1: identity, phone, address note, agency and a 14-digit SIRET.
    cy.get('[data-cy="input-onboarding-first-name"]').type(LANDLORD.firstName);
    cy.get('[data-cy="input-onboarding-last-name"]').type(LANDLORD.lastName);
    cy.get('[data-cy="input-onboarding-phone"]').type("0612345678");
    cy.get('[data-cy="input-onboarding-person-address"]').type(
      "1 rue du Bailleur, 75001 Paris",
    );
    cy.get('[data-cy="input-onboarding-address-note"]').type("Bâtiment B");
    cy.get('[data-cy="input-onboarding-agency-name"]').type("Agence E2E");
    cy.get('[data-cy="input-onboarding-legal-form"]').type("EURL");
    cy.get('[data-cy="input-onboarding-siren-siret"]').type("12345678901234");
    cy.get('[data-cy="input-onboarding-agency-address"]').type(
      "2 rue de l'Agence, 75002 Paris",
    );
    cy.get('[data-cy="btn-save-onboarding-profile"]').click();
    cy.get('[data-cy="onboarding-signature"]').should("be.visible");

    // The pad is portalled inside the profile form: validating it also submits
    // the profile, so the wizard advances to step 2 on the confirmed signature.
    cy.intercept("POST", "/api/signatures").as("createSignature");
    cy.get('[data-cy="btn-draw-signature"]').click();
    cy.get('[data-cy="signature-pad-canvas"]').should("be.visible");
    drawSignature();
    cy.get('[data-cy="btn-confirm-signature-pad"]').click();
    cy.wait("@createSignature").its("response.statusCode").should("eq", 201);
    cy.get("@createSignature")
      .its("response.body")
      .should("have.property", "name", "Signature dessinée");

    // Step 2: the dwelling and the pre-filled landlord (the account itself).
    cy.get('[data-cy="input-onboarding-property-address"]').type(
      PROPERTY_ADDRESS,
    );
    cy.get('[data-cy="input-onboarding-rent"]').clear().type(RENT_INPUT);
    cy.get('[data-cy="input-onboarding-charges"]').clear().type(CHARGES_INPUT);
    cy.get('[data-cy="onboarding-landlord"]')
      .should("contain.text", "Camille BAILLEUR")
      .and("contain.text", email);
    cy.get('[data-cy="btn-next-onboarding-property"]').click();

    // Step 3: solidary colocation with two co-tenants.
    cy.get('[data-cy="onboarding-lease-colocation"]').check();
    cy.get('[data-cy="input-onboarding-tenant-first-0"]').type(
      FIRST_TENANT.firstName,
    );
    cy.get('[data-cy="input-onboarding-tenant-last-0"]').type(
      FIRST_TENANT.lastName,
    );
    cy.get('[data-cy="input-onboarding-tenant-first-1"]').type(
      SECOND_TENANT.firstName,
    );
    cy.get('[data-cy="input-onboarding-tenant-last-1"]').type(
      SECOND_TENANT.lastName,
    );
    cy.get('[data-cy="btn-next-onboarding-lease"]').click();

    // Summary: the colocation and both co-tenants before finalization.
    cy.contains("Bail de colocation solidaire").should("be.visible");
    cy.contains("Locataire 1 · Alice DUPONT").should("be.visible");
    cy.contains("Locataire 2 · Bob MARTIN").should("be.visible");
    cy.get('[data-cy="onboarding-finalize"]').click();

    cy.location("pathname", { timeout: 30_000 }).should(
      "eq",
      "/generer/quittance",
    );
    cy.request<{ tenantIds?: number[] }[]>("/api/leases").then(({ body }) => {
      expect(body, "leases of the fresh account").to.have.length(1);
      expect(
        body[0].tenantIds,
        "co-tenants linked to the lease",
      ).to.have.length(2);
    });

    cy.get('[data-cy="lease-detail"]', { timeout: 20_000 })
      .should("be.visible")
      .and("contain.text", PROPERTY_ADDRESS);
    cy.chooseMonth(RECEIPT_MONTH);
    waitForValue("#quittance-loyer", RENT_API);

    cy.get('[data-cy="btn-generate-rent-receipt"]')
      .should("not.be.disabled")
      .click();
    cy.contains("Quittance générée", { timeout: 25_000 }).should("be.visible");

    // The preview is a PDF iframe: the downloaded receipt carries both names.
    downloadAndReadPdf(
      '[data-cy="btn-download-rent-receipt"]',
      `quittance_${RECEIPT_MONTH}.pdf`,
      (text) => {
        expect(text).to.contain("QUITTANCE DE LOYER");
        expect(text).to.contain("Alice DUPONT");
        expect(text).to.contain("Bob MARTIN");
        expect(text).to.contain("1 300,00 €");
      },
    );
  });
});
