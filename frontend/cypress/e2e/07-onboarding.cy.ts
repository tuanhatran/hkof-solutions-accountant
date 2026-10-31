/// <reference types="cypress" />

import {
  addSignatureToPerson,
  downloadAndReadPdf,
  waitForValue,
} from "../support/helpers";

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
const PROPERTY_SEARCH = "10 rue de la Paix";
const PERSONAL_AGENCY_NAME = "Gestion Personnelle E2E";
const PRO_AGENCY_NAME = "Agence Pro E2E";
const MANAGER = { firstName: "Jean", lastName: "GERANT" };
const LANDLORD = {
  firstName: "Camille",
  lastName: "BAILLEUR",
  phone: "0612345678",
  email: "bailleur@example.test",
};
const FIRST_TENANT = { firstName: "Alice", lastName: "DUPONT" };
const SECOND_TENANT = { firstName: "Bob", lastName: "MARTIN" };
const COMPANY = {
  name: "HKOF Conseil E2E",
  legalForm: "SAS",
  siren: "123456789",
  siret: "12345678900017",
  address: "10 avenue de la Société, 75008 Paris",
  managerName: `${MANAGER.firstName} ${MANAGER.lastName}`,
  issuePlace: "Paris",
};
const COMPANY_LEASE = {
  propertyAddress: "20 rue du Bail, 75011 Paris",
  landlordAddress: "1 rue du Bailleur, 75012 Paris",
  totalArea: "100",
  businessArea: "40",
  rent: "1 200,00",
  charges: "100,00",
};
const COMPANY_EMPLOYEE = {
  firstName: "Alice",
  lastName: "MARTIN",
  email: "alice.martin@example.test",
};

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
  const match = /confirm-email\?token=([A-Za-z0-9_-]+)/.exec(source);
  if (!match) {
    throw new Error("Confirmation token missing from the e-mail");
  }
  return match[1];
}

function fillRegistration(
  email: string,
  password: string,
  options?: { onlyAgency?: boolean; onlyCompany?: boolean },
) {
  cy.get('[data-cy="auth-email"]').clear().type(email);
  cy.get('[data-cy="auth-password"]').clear().type(password);
  cy.get('[data-cy="auth-password-confirm"]').clear().type(password);
  if (options?.onlyAgency) {
    cy.get('[data-cy="auth-module-company"]').uncheck();
    cy.get('[data-cy="auth-module-agency"]').should("be.checked");
  } else if (options?.onlyCompany) {
    cy.get('[data-cy="auth-module-agency"]').uncheck();
    cy.get('[data-cy="auth-module-company"]').should("be.checked");
  } else {
    cy.get('[data-cy="auth-module-agency"]').check();
  }
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
  it("registers an agency-only account, uses personal agency, resumes onboarding and edits agency in settings", () => {
    const email = `e2e-onboarding-${Date.now()}@example.test`;
    cy.resetState();

    // 1. Language switcher on /login
    cy.visit("/login");
    cy.contains("Connexion").should("be.visible");
    cy.get('[data-cy="select-language"]').should("be.visible");
    cy.get('[data-cy="select-language"]').contains("English").click();
    cy.contains("Sign in").should("be.visible");
    cy.get('[data-cy="select-language"]').contains("Français").click();
    cy.contains("Connexion").should("be.visible");

    // 2. Register account with only the Agency module enabled
    cy.visit("/register");
    fillRegistration(email, PASSWORD, { onlyAgency: true });
    cy.contains(
      "Un e-mail de confirmation vient de vous être envoyé. Ouvrez le lien reçu pour activer votre compte.",
    ).should("be.visible");

    findConfirmationMessage(email).then((message) => {
      cy.visit(`/confirm-email?token=${confirmationToken(message)}`);
      cy.contains("Adresse confirmée").should("be.visible");
    });

    // Sign in lands on the onboarding wizard
    cy.visit("/login");
    signIn(email, PASSWORD);
    cy.location("pathname").should("eq", "/welcome");
    cy.contains(`Connecté en tant que ${email}`).should("be.visible");

    // 3. Language switcher on /welcome
    cy.get('[data-cy="select-language"]').should("be.visible");
    cy.get('[data-cy="select-language"]').contains("English").click();
    cy.contains("Welcome to HomeOfficeExpenses").should("be.visible");
    cy.contains("Skip to dashboard").should("be.visible");
    cy.get('[data-cy="select-language"]').contains("Français").click();
    cy.contains("Bienvenue dans HomeOfficeExpenses").should("be.visible");
    cy.contains("Passer au tableau de bord").should("be.visible");

    // Spy to ensure no /api/companies call is made (no company module, no 403)
    const companiesSpy = cy.spy();
    cy.intercept("/api/companies*", companiesSpy).as("companiesCheck");

    // 4. Step 1: manager profile with "Agence personnelle" checked
    cy.get('[data-cy="input-onboarding-first-name"]').type(MANAGER.firstName);
    cy.get('[data-cy="input-onboarding-last-name"]').type(MANAGER.lastName);
    cy.get('[data-cy="select-onboarding-phone-country"]').select("+33");
    cy.get('[data-cy="input-onboarding-phone"]').type("0612345678");
    cy.get('[data-cy="input-onboarding-person-address"]').type(
      "1 rue de la Paix",
    );
    cy.get('[id="onboarding-person-address-listbox-opt-0"]', {
      timeout: 10_000,
    }).click();
    cy.get('[data-cy="input-onboarding-address-note"]').type("Bâtiment B");

    cy.get('[data-cy="input-onboarding-personal-agency"]').check();
    cy.get('[data-cy="input-onboarding-legal-form"]').should("not.exist");
    cy.get('[data-cy="input-onboarding-siren-siret"]').should("not.exist");
    cy.get('[data-cy="input-onboarding-agency-address"]').should("not.exist");
    cy.get('[data-cy="input-onboarding-agency-name"]').type(
      PERSONAL_AGENCY_NAME,
    );
    cy.get('[data-cy="btn-save-onboarding-profile"]').click();
    cy.get('[data-cy="onboarding-signature"]').should("be.visible");

    // Confirm signature to advance to Step 2
    cy.intercept("POST", "/api/signatures").as("createSignature");
    cy.get('[data-cy="btn-draw-signature"]').click();
    cy.get('[data-cy="signature-pad-canvas"]').should("be.visible");
    drawSignature();
    cy.get('[data-cy="btn-confirm-signature-pad"]').click();
    cy.wait("@createSignature").its("response.statusCode").should("eq", 201);
    cy.get("@createSignature")
      .its("response.body")
      .should("have.property", "name", "Signature dessinée");

    // Reached step 2; assert /api/companies was never called
    cy.get('[data-cy="input-onboarding-property-address-0"]').should(
      "be.visible",
    );
    cy.wrap(companiesSpy).should("not.have.been.called");

    // 5. Skip to dashboard, verify OnboardingProgressCard, and resume back to /welcome
    cy.get('[data-cy="btn-skip-onboarding"]').click();
    cy.location("pathname").should("eq", "/dashboard");
    cy.get('[data-cy="dashboard-page"]').should("be.visible");
    cy.get('[data-cy="onboarding-progress-card"]').should("be.visible");

    cy.get('[data-cy="btn-resume-onboarding"]').click();
    cy.location("pathname").should("eq", "/welcome");

    // 6. Complete onboarding (Step 2: property & landlord)
    cy.get('[data-cy="input-onboarding-property-address-0"]').type(
      PROPERTY_SEARCH,
    );
    cy.get('[id="onboarding-property-address-listbox-opt-0"]', {
      timeout: 10_000,
    }).click();
    cy.get('[data-cy="input-onboarding-landlord-first-name-0"]').type(
      LANDLORD.firstName,
    );
    cy.get('[data-cy="input-onboarding-landlord-last-name-0"]').type(
      LANDLORD.lastName,
    );
    cy.get('[data-cy="select-onboarding-landlord-phone-country-0"]').select(
      "+33",
    );
    cy.get('[data-cy="input-onboarding-landlord-phone-0"]').type(
      LANDLORD.phone,
    );
    cy.get('[data-cy="input-onboarding-landlord-email-0"]').type(
      LANDLORD.email,
    );
    cy.get('[data-cy="btn-next-onboarding-property"]').click();

    // Step 3: attach solidary colocation lease to the property
    cy.get('[data-cy="select-onboarding-lease-property"]').should("be.visible");
    cy.get('[data-cy="onboarding-lease-colocation"]').check();
    cy.get('[data-cy="input-onboarding-total-rent"]').clear().type(RENT_INPUT);
    cy.get('[data-cy="input-onboarding-total-charges"]')
      .clear()
      .type(CHARGES_INPUT);
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

    // Summary & Finalize
    cy.contains("Bail de colocation solidaire").should("be.visible");
    cy.contains("Locataire 1").should("be.visible");
    cy.contains("Alice DUPONT").should("be.visible");
    cy.contains("Locataire 2").should("be.visible");
    cy.contains("Bob MARTIN").should("be.visible");
    cy.get('[data-cy="onboarding-finalize"]').click();

    // 7. Verify dashboard after completion
    cy.location("pathname", { timeout: 30_000 }).should("eq", "/dashboard");
    cy.reload();
    cy.get('[data-cy="dashboard-page"]').should("be.visible");
    cy.get('[data-cy="onboarding-progress-card"]').should("not.exist");
    cy.get('[data-cy="dashboard-agency-name"]').should(
      "contain.text",
      PERSONAL_AGENCY_NAME,
    );
    cy.get('[data-cy="dashboard-kpi-properties"]').should("contain.text", "1");
    cy.get('[data-cy="dashboard-kpi-leases"]').should("contain.text", "1");

    // 8. Navigate to /settings/agency, switch to Agence tab, edit agency to professional agency, and save
    cy.visit("/settings/agency");
    cy.location("pathname").should("eq", "/settings/agency");
    cy.get('[data-cy="tab-agency"]').click();
    cy.get('[data-cy="agency-section"]').should("be.visible");
    cy.get('[data-cy="agency-is-personal"]').should("be.checked");
    cy.get('[data-cy="agency-is-personal"]').uncheck();

    cy.get('[data-cy="agency-name"]').clear().type(PRO_AGENCY_NAME);
    cy.get('[data-cy="agency-legal-form"]').type("SAS");
    cy.get('[data-cy="agency-siren-siret"]').type("12345678901234");
    cy.get('[data-cy="agency-address"]').type("2 rue de l'Agence, 75002 Paris");

    cy.intercept("PUT", "/api/agency").as("saveAgency");
    cy.get('[data-cy="btn-save-agency"]').click();
    cy.wait("@saveAgency").its("response.statusCode").should("eq", 200);
    cy.contains("Profil de l'agence enregistré.").should("be.visible");
    cy.get('[data-cy="agency-is-personal"]').should("not.be.checked");

    // Add signature for landlord to allow receipt generation
    cy.request<{ id: number; landlordId?: number; tenantIds?: number[] }[]>(
      "/api/leases",
    ).then(({ body }) => {
      expect(body, "leases of the fresh account").to.have.length(1);
      expect(
        body[0].tenantIds,
        "co-tenants linked to the lease",
      ).to.have.length(2);
      if (body[0].landlordId) {
        addSignatureToPerson(body[0].landlordId, "Signature Bailleur");
      }
    });

    // 9. Back to dashboard and generate rent receipt to verify full end-to-end flow
    cy.visit("/dashboard");
    cy.get('[data-cy="dashboard-agency-name"]').should(
      "contain.text",
      PRO_AGENCY_NAME,
    );
    cy.get('[data-cy="action-generate-receipt"]').click();
    cy.location("pathname").should("eq", "/generate/rent-receipt");

    cy.get('[data-cy="lease-detail"]', { timeout: 20_000 })
      .should("be.visible")
      .and("contain.text", "10 Rue de la Paix");
    cy.chooseMonth(RECEIPT_MONTH);
    waitForValue("#quittance-loyer", RENT_API);

    cy.get('[data-cy="btn-generate-rent-receipt"]')
      .should("not.be.disabled")
      .click();
    cy.contains("Quittance générée", { timeout: 25_000 }).should("be.visible");

    // Assert generated PDF contains both co-tenants
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

  it("registers a company-only account and completes the five-step company wizard", () => {
    const email = `e2e-company-onboarding-${Date.now()}@example.test`;

    // Both lookups are stubbed so the flow never depends on the public geo API
    // or on another account's company being present in the reset database.
    cy.intercept("GET", "https://api-adresse.data.gouv.fr/search/*", {
      features: [],
    }).as("addressSearch");
    cy.intercept("GET", "/api/companies/lookup*", {
      name: COMPANY.name,
      siren: COMPANY.siren,
      legalForm: COMPANY.legalForm,
      address: COMPANY.address,
      managerName: COMPANY.managerName,
    }).as("companyLookup");

    // 1. Register with only the Company module enabled.
    cy.visit("/register");
    fillRegistration(email, PASSWORD, { onlyCompany: true });
    cy.contains(
      "Un e-mail de confirmation vient de vous être envoyé. Ouvrez le lien reçu pour activer votre compte.",
    ).should("be.visible");

    findConfirmationMessage(email).then((message) => {
      cy.visit(`/confirm-email?token=${confirmationToken(message)}`);
      cy.contains("Adresse confirmée").should("be.visible");
    });

    cy.visit("/login");
    signIn(email, PASSWORD);

    // 2. The company-only account opens the company track, never the agency one.
    cy.location("pathname").should("eq", "/welcome");
    cy.get('[data-cy="company-onboarding-steps"]').should("be.visible");
    cy.get('[data-cy^="company-step-"]').should("have.length", 5);
    cy.get('[data-cy="company-step-identity"]').should(
      "have.attr",
      "aria-current",
      "step",
    );
    cy.get('[data-cy="onboarding-track-selector"]').should("not.exist");
    cy.get('[data-cy="input-onboarding-first-name"]').should("not.exist");
    cy.contains(
      "Quelques étapes pour préparer votre société, son bail et ses postes de frais.",
    ).should("be.visible");

    // Step 1: identity, with the stubbed SIREN lookup prefilling the company.
    cy.get('[data-cy="company-identity-form"]').should("be.visible");
    cy.get('[data-cy="input-company-onboarding-siren"]').type(COMPANY.siren);
    cy.get('[data-cy="btn-company-siren-lookup"]').click();
    cy.wait("@companyLookup").its("response.statusCode").should("eq", 200);
    cy.contains(`Société trouvée : ${COMPANY.name}`).should("be.visible");
    cy.get('[data-cy="input-company-onboarding-name"]').should(
      "have.value",
      COMPANY.name,
    );
    cy.get('[data-cy="input-company-onboarding-legal-form"]').should(
      "have.value",
      COMPANY.legalForm,
    );
    cy.get('[data-cy="input-company-onboarding-manager"]').should(
      "have.value",
      COMPANY.managerName,
    );
    cy.get('[data-cy="input-company-onboarding-address"]')
      .clear()
      .type(COMPANY.address);
    cy.get('[data-cy="input-company-onboarding-siret"]').type(COMPANY.siret);
    cy.get('[data-cy="input-company-onboarding-issue-place"]').type(
      COMPANY.issuePlace,
    );
    cy.get('[data-cy="btn-company-next"]').click();

    // Step 2: lease, surfaces, rent, charges and the natural-person landlord.
    cy.get('[data-cy="company-lease-form"]').should("be.visible");
    cy.get('[data-cy="company-step-lease"]').should(
      "have.attr",
      "aria-current",
      "step",
    );
    cy.get('[data-cy="input-company-onboarding-property-address"]').type(
      COMPANY_LEASE.propertyAddress,
    );
    cy.get('[data-cy="input-company-onboarding-total-area"]').type(
      COMPANY_LEASE.totalArea,
    );
    cy.get('[data-cy="input-company-onboarding-business-area"]').type(
      COMPANY_LEASE.businessArea,
    );
    cy.contains("40 %").should("be.visible");
    cy.get('[data-cy="input-company-onboarding-rent"]').type(
      COMPANY_LEASE.rent,
    );
    cy.get('[data-cy="input-company-onboarding-charges"]').type(
      COMPANY_LEASE.charges,
    );
    cy.get('[data-cy="input-company-onboarding-landlord-name"]').type(
      `${LANDLORD.firstName} ${LANDLORD.lastName}`,
    );
    cy.get('[data-cy="input-company-onboarding-landlord-phone"]').type(
      LANDLORD.phone,
    );
    cy.get('[data-cy="input-company-onboarding-landlord-address"]').type(
      COMPANY_LEASE.landlordAddress,
    );
    cy.get('[data-cy="btn-company-next"]').click();

    // Step 3: expense categories. A reload mid-wizard must resume this step.
    cy.get('[data-cy="company-expenses-form"]').should("be.visible");
    cy.get('[data-cy="company-step-expenses"]').should(
      "have.attr",
      "aria-current",
      "step",
    );
    cy.reload();
    cy.get('[data-cy="company-step-expenses"]', { timeout: 20_000 }).should(
      "have.attr",
      "aria-current",
      "step",
    );
    cy.get('[data-cy="company-expenses-form"]').should("be.visible");

    cy.get('[data-cy="input-company-expense-loyer"]').should("be.checked");
    cy.get('[data-cy="input-company-expense-telephone"]').uncheck();
    cy.get('[data-cy="input-company-expense-prorata-electricite"]')
      .clear()
      .type("50");
    cy.get('[data-cy="select-company-expense-periodicity-gaz"]').select(
      "BIMONTHLY",
    );
    cy.get('[data-cy="btn-company-next"]').click();

    // Step 4: the manager row is prefilled from the identity manager name.
    cy.get('[data-cy="company-employees-form"]').should("be.visible");
    cy.get('[data-cy="company-step-employees"]').should(
      "have.attr",
      "aria-current",
      "step",
    );
    cy.get('[data-cy="input-company-employee-first-0"]').should(
      "have.value",
      MANAGER.firstName,
    );
    cy.get('[data-cy="input-company-employee-last-0"]').should(
      "have.value",
      MANAGER.lastName,
    );
    cy.get('[data-cy="select-company-employee-title-0"]').should(
      "have.value",
      "CEO",
    );
    cy.get('[data-cy="input-company-employee-address-0"]').type(
      "1 rue du Gérant, 75001 Paris",
    );
    cy.get('[data-cy="input-company-employee-issue-place-0"]').type("Paris");

    cy.get('[data-cy="btn-add-company-employee"]').click();
    cy.get('[data-cy="input-company-employee-first-1"]').type(
      COMPANY_EMPLOYEE.firstName,
    );
    cy.get('[data-cy="input-company-employee-last-1"]').type(
      COMPANY_EMPLOYEE.lastName,
    );
    cy.get('[data-cy="input-company-employee-email-1"]').type(
      COMPANY_EMPLOYEE.email,
    );
    cy.get('[data-cy="select-company-employee-title-1"]').select("CFO");
    cy.get('[data-cy="input-company-employee-issue-place-1"]').type("Paris");
    cy.get('[data-cy="btn-company-next"]').click();

    // Step 5: the summary restates every captured value.
    cy.get('[data-cy="company-summary"]').should("be.visible");
    cy.get('[data-cy="company-step-summary"]').should(
      "have.attr",
      "aria-current",
      "step",
    );
    cy.get('[data-cy="company-summary"]')
      .should("contain.text", COMPANY.name)
      .and("contain.text", COMPANY_LEASE.propertyAddress)
      .and("contain.text", `${LANDLORD.firstName} ${LANDLORD.lastName}`)
      .and("contain.text", "100 / 40 m²")
      .and("contain.text", "40 %")
      .and("contain.text", "50 %")
      .and("contain.text", "Alice MARTIN")
      .and("contain.text", "DAF");
    // `formatEUR` uses narrow no-break spaces: match it through `cy.contains`,
    // which normalizes whitespace, instead of an exact substring.
    cy.contains('[data-cy="company-summary"]', "1 200,00 €").should(
      "be.visible",
    );

    // 3. Footer skip routes to the company home, then /welcome resumes at the summary.
    cy.get('[data-cy="btn-skip-onboarding"]').should("be.visible").click();
    cy.location("pathname").should("eq", "/generate/expense-statement");
    cy.visit("/welcome");
    cy.get('[data-cy="company-summary"]', { timeout: 20_000 }).should(
      "be.visible",
    );
    cy.get('[data-cy="company-step-summary"]').should(
      "have.attr",
      "aria-current",
      "step",
    );

    // 4. Finalize: landlord, company, lease, expenses and employees are created.
    cy.get('[data-cy="btn-finalize-company-onboarding"]').click();
    cy.location("pathname", { timeout: 30_000 }).should(
      "eq",
      "/generate/expense-statement",
    );
    cy.get('[data-cy="company-expense-statement"]', { timeout: 20_000 })
      .should("be.visible")
      .and("contain.text", COMPANY.name);
    cy.get('[data-cy="lease-expense-statement"]')
      .should("be.visible")
      .and("contain.text", `${LANDLORD.firstName} ${LANDLORD.lastName}`);

    cy.request<{ id: number; name: string; leaseId?: number | null }[]>(
      "/api/companies",
    ).then(({ body }) => {
      expect(body, "companies of the fresh account").to.have.length(1);
      const created = body[0];
      expect(created.name).to.eq(COMPANY.name);
      expect(created.leaseId, "lease linked to the company").to.be.a("number");
      cy.request<{ firstName: string; title: string }[]>(
        `/api/companies/${created.id}/employees`,
      ).then(({ body: employees }) => {
        expect(
          employees.map(
            (employee) => `${employee.firstName} ${employee.title}`,
          ),
        ).to.deep.eq(["Jean CEO", "Alice CFO"]);
      });
    });
  });
});
