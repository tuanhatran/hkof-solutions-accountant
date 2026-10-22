import {
  SEED_PRORATA,
  SEED_TOTAL,
  waitForText,
  waitForValue,
} from "../support/helpers";

describe("Settings", () => {
  it("saves settings and keeps them after reload", () => {
    cy.visit("/configuration");

    waitForValue('[data-cy="input-raison-sociale"]', "HKOF");
    waitForText('[data-cy="prorata-indicatif"]', SEED_PRORATA);
    waitForText('[data-cy="total-quittance-config"]', SEED_TOTAL);

    cy.get('[data-cy="input-raison-sociale"]').clear().type("HKOF E2E");
    cy.get('[data-cy="input-provision-charges"]').clear().type("100,00");
    waitForText('[data-cy="total-quittance-config"]', "1 400,00 €");

    cy.get('[data-cy="input-provision-charges"]').clear().type("50,00");
    cy.get('[data-cy="btn-enregistrer-configuration-bas"]').click();
    cy.contains("Toutes les valeurs sont à jour.", { timeout: 15_000 }).should(
      "be.visible",
    );

    cy.reload();
    waitForValue('[data-cy="input-raison-sociale"]', "HKOF E2E");
    waitForValue('[data-cy="input-provision-charges"]', "50,00");
    waitForText('[data-cy="total-quittance-config"]', "1 350,00 €");
  });

  it("adds, edits then removes an expense type", () => {
    cy.visit("/configuration");

    cy.get('[data-cy="btn-ajouter-poste"]').click();
    cy.get('[data-cy="formulaire-poste"]').should("be.visible");
    cy.get("#poste-code").type("internet-pro");
    cy.get('[data-cy="input-poste-libelle"]').type("Internet pro");
    cy.get('[data-cy="input-poste-fournisseur"]').type("Free");
    cy.get('[data-cy="input-poste-prorata"]').clear().type("50");
    cy.get('[data-cy="btn-enregistrer-poste"]').click();

    cy.get('[data-cy="formulaire-poste"]').should("not.exist");
    cy.contains("td", "Internet pro", { timeout: 15_000 }).should("be.visible");
    cy.contains("td", "50 %").should("be.visible");

    cy.get('[data-cy="btn-modifier-poste-internet_pro"]').click();
    cy.get('[data-cy="input-poste-libelle"]')
      .clear()
      .type("Internet pro fibre");
    cy.get('[data-cy="input-poste-prorata"]').clear().type("60");
    cy.get('[data-cy="btn-enregistrer-poste"]').click();

    cy.contains("td", "Internet pro fibre", { timeout: 15_000 }).should(
      "be.visible",
    );
    cy.contains("td", "60 %").should("be.visible");

    cy.get('[data-cy="btn-supprimer-poste-internet_pro"]').click();
    cy.get('[data-cy="dialogue-supprimer-poste"]').should("be.visible");
    cy.get('[data-cy="dialogue-confirmer"]').click();

    cy.contains("td", "Internet pro fibre", { timeout: 15_000 }).should(
      "not.exist",
    );
  });
});
