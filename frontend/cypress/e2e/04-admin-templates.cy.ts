import {
  MONTHS,
  SEED_RENT,
  SEED_TOTAL,
  addExpense,
  addRent,
  waitForSelectedFile,
  waitForAmount,
  waitForValue,
  configureLlm,
  createRentReceipt,
  disableLlm,
  downloadAndReadPdf,
  normalLease,
} from "../support/helpers";

describe("AI admin and templates", () => {
  it("loads mock models and passes the connection test", () => {
    cy.visit("/admin");

    cy.get('[data-cy="select-llm-model"]', { timeout: 25_000 }).should(
      "be.visible",
    );
    cy.get(
      '[data-cy="select-llm-model"] option[value="mock-extract:latest"]',
    ).should("exist");
    cy.get(
      '[data-cy="select-llm-model"] option[value="mock-vision:latest"]',
    ).should("exist");
    cy.get('[data-cy="select-llm-model"]').select("mock-extract:latest");
    cy.get('[data-cy="alert-remote-llm"]').should("not.exist");

    cy.get('[data-cy="btn-test-llm"]').click();
    cy.get('[data-cy="llm-test-result"]', { timeout: 30_000 }).should(
      "contain.text",
      "Connexion réussie",
    );
    cy.get('[data-cy="admin-llm-status-badge"]', { timeout: 20_000 }).should(
      "contain.text",
      "Connecté",
    );
  });

  it("shows a warning as soon as the LLM URL is no longer local", () => {
    cy.visit("/admin");
    cy.get('[data-cy="input-llm-url"]', { timeout: 20_000 }).should(
      "be.visible",
    );

    cy.get('[data-cy="alert-remote-llm"]').should("not.exist");
    cy.get('[data-cy="input-llm-url"]')
      .clear()
      .type("http://ollama-distant.invalid:11434");
    cy.get('[data-cy="alert-remote-llm"]').should("be.visible");
    cy.get('[data-cy="alert-remote-llm"]').should(
      "contain.text",
      "Les justificatifs seront envoyés à un serveur distant.",
    );
  });

  it("stays usable in manual mode when Ollama is unreachable", () => {
    configureLlm({ url: "http://127.0.0.1:11499" });
    createRentReceipt();
    cy.visit("/admin");
    cy.get('[data-cy="llm-status-badge"]', { timeout: 30_000 })
      .first()
      .should("contain.text", "IA injoignable");
    cy.get('[data-cy="llm-status"]').should("contain.text", "Injoignable");

    cy.visit("/generate/expense-statement");
    cy.chooseMonth(MONTHS);
    cy.get('[data-cy="select-expense-type"]').should("not.be.disabled");
    addRent();
    addExpense({
      itemCode: "gaz",
      fixture: "facture-gaz.txt",
      amountInclVat: "120.00",
    });
    waitForAmount('[data-cy="retained-total"]', "992,85");
  });

  it("stays usable in manual mode when AI is disabled", () => {
    disableLlm();
    createRentReceipt();
    cy.visit("/generate/expense-statement");
    cy.chooseMonth(MONTHS);

    cy.get('[data-cy="llm-status-badge"]', { timeout: 20_000 })
      .first()
      .should("contain.text", "IA désactivée");
    cy.get('[data-cy="select-expense-type"]').should("not.be.disabled");
    addRent();

    cy.get('[data-cy="dropzone-file"]').selectFile(
      "cypress/fixtures/facture-gaz.txt",
      {
        force: true,
      },
    );
    cy.get('[data-cy="analysis-status"]', { timeout: 25_000 }).should(
      "contain.text",
      "désactivée",
    );
    waitForSelectedFile("facture-gaz.txt");

    // The form is reset after addRent(), so the type must be selected again.
    cy.get('[data-cy="select-expense-type"]').select("gaz");
    cy.get('[data-cy="input-amount-incl-vat"]').clear().type("120.00");
    cy.get('[data-cy="btn-add-expense"]').should("not.be.disabled").click();
    waitForAmount('[data-cy="retained-total"]', "992,85");
  });

  it("imports, previews, activates a template then reverts to the built-in model", () => {
    cy.visit("/templates");
    cy.get('[data-cy="dropzone-rent-receipt-template"]', {
      timeout: 20_000,
    }).should("exist");

    cy.get('[data-cy="input-template-name"]')
      .first()
      .clear()
      .type("Quittance E2E");
    cy.get('[data-cy="dropzone-rent-receipt-template"]').selectFile(
      "cypress/fixtures/template-quittance-valide.html",
      { force: true },
    );
    cy.get('[data-cy="btn-upload-template"]').first().click();

    cy.get('[data-cy="template-validation-report"]', { timeout: 20_000 })
      .first()
      .should("contain.text", "Structure valide");
    cy.get('[data-cy="template-validation-report"]')
      .first()
      .should("contain.text", "Variables reconnues");

    cy.contains("button", "Aperçu de la version v2").click();
    cy.get('[data-cy="template-preview"]', { timeout: 20_000 }).should(
      "be.visible",
    );
    cy.get('[data-cy="template-preview"]')
      .find('button[aria-label="Fermer l’aperçu"]')
      .click();
    cy.get('[data-cy="template-preview"]').should("not.exist");

    cy.get('[data-cy="btn-activate-template"]', { timeout: 20_000 })
      .first()
      .click();
    cy.contains("li", "Quittance E2E", { timeout: 20_000 }).should(
      "contain.text",
      "active",
    );
    cy.get('[data-cy="btn-default-template"]')
      .first()
      .should("not.be.disabled");

    cy.intercept("POST", "/api/rent-receipts/preview").as("preview");
    cy.visit("/generate/rent-receipt");
    normalLease().then((lease) => {
      cy.get('[data-cy="select-landlord"]').select(String(lease.landlordId));
      cy.get('[data-cy="select-tenant"]').select(`person:${lease.tenantId}`);
    });
    waitForValue("#quittance-loyer", SEED_RENT);
    cy.wait("@preview", { timeout: 30_000 });
    cy.waitForPreview();
    cy.get('[data-cy="select-template"] option:selected', {
      timeout: 20_000,
    }).should("contain.text", "Quittance E2E");

    downloadAndReadPdf(
      '[data-cy="btn-download-preview"]',
      "quittance_apercu.pdf",
      (text) => {
        expect(text).to.contain("QUITTANCE TEST E2E");
        expect(text).to.contain("APERÇU");
      },
    );

    cy.chooseMonth(MONTHS);
    cy.get('[data-cy="btn-generate-rent-receipt"]')
      .should("not.be.disabled")
      .click();
    cy.contains("Quittance générée", { timeout: 25_000 }).should("be.visible");

    downloadAndReadPdf(
      '[data-cy="btn-download-rent-receipt"]',
      "quittance_2026-01.pdf",
      (text) => {
        expect(text).to.contain("QUITTANCE TEST E2E");
        expect(text).to.contain("Janvier 2026");
        expect(text).to.contain(SEED_TOTAL);
        expect(text).not.to.contain("APERÇU");
      },
    );

    cy.visit("/templates");
    cy.get('[data-cy="input-template-name"]', { timeout: 20_000 })
      .first()
      .clear()
      .type("Quittance invalide");
    cy.get('[data-cy="dropzone-rent-receipt-template"]').selectFile(
      "cypress/fixtures/template-quittance-invalide.html",
      { force: true },
    );
    cy.get('[data-cy="btn-upload-template"]').first().click();
    cy.contains("Variables inconnues : variable_inconnue", {
      timeout: 20_000,
    }).should("be.visible");

    cy.get('[data-cy="btn-default-template"]').first().click();
    cy.get('[data-cy="dialog-default-template"]').should("be.visible");
    cy.get('[data-cy="dialog-confirm"]').click();
    cy.contains("li", "Quittance — modèle intégré", { timeout: 20_000 }).should(
      "contain.text",
      "active",
    );
    cy.get('[data-cy="btn-default-template"]').first().should("be.disabled");
  });
});
