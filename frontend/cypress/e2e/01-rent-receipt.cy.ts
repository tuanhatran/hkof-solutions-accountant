import {
  MONTHS,
  SEED_RENT,
  SEED_TOTAL,
  waitForValue,
  downloadAndReadPdf,
} from "../support/helpers";

describe("Rent receipt", () => {
  it("generates a receipt from the month, downloads the PDF, then creates a new version", () => {
    cy.visit("/generer/quittance");
    waitForValue("#quittance-loyer", SEED_RENT);

    cy.chooseMonth(MONTHS);
    waitForValue("#quittance-debut", "2026-01-01");
    waitForValue("#quittance-fin", "2026-01-31");

    cy.get('[data-cy="btn-generer-quittance"]')
      .should("not.be.disabled")
      .click();
    cy.contains("Quittance générée", { timeout: 25_000 }).should("be.visible");

    downloadAndReadPdf(
      '[data-cy="btn-telecharger-quittance"]',
      "quittance_2026-01.pdf",
      (text) => {
        expect(text).to.contain("QUITTANCE DE LOYER");
        expect(text).to.contain("Janvier 2026");
        expect(text).to.contain("01/01/2026");
        expect(text).to.contain("31/01/2026");
        expect(text).to.contain(SEED_TOTAL);
      },
    );

    cy.contains("version 1", { timeout: 20_000 }).should("be.visible");
    cy.get('[data-cy="btn-generer-quittance"]')
      .should("not.be.disabled")
      .click();

    cy.get('[data-cy="dialogue-regeneration-quittance"]').should("be.visible");
    cy.get('[data-cy="dialogue-confirmer"]').click();
    cy.contains("version 2", { timeout: 25_000 }).should("be.visible");

    cy.get('[data-cy="tab-historique"]').click();
    const group = '[data-cy="historique-mois-2026-01"]';
    cy.get(group, { timeout: 20_000 }).should("contain.text", "Quittance v2");
    cy.get(group).contains("Toutes les versions (2)").click();
    cy.get(group).contains("v2 · active").should("be.visible");
    cy.get(group).contains("v1 · archivée").should("be.visible");
  });
});
