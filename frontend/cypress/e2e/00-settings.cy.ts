import {
  SEED_PRORATA,
  SEED_RENT_INPUT,
  SEED_TOTAL,
  seededLease,
  waitForText,
  waitForValue,
} from "../support/helpers";

describe("Settings", () => {
  it("saves the company tab and keeps it after reload", () => {
    cy.visit("/configuration");

    waitForValue('[data-cy="input-raison-sociale"]', "HKOF");
    waitForText('[data-cy="prorata-indicatif"]', SEED_PRORATA);

    cy.get('[data-cy="input-raison-sociale"]').clear().type("HKOF E2E");
    cy.get('[data-cy="btn-enregistrer-configuration-bas"]').click();
    cy.contains("Toutes les valeurs sont à jour.", { timeout: 15_000 }).should(
      "be.visible",
    );

    cy.reload();
    waitForValue('[data-cy="input-raison-sociale"]', "HKOF E2E");
  });

  it("edits the seeded lease amounts in the Quittances tab", () => {
    cy.visit("/configuration");
    cy.get('[data-cy="onglet-quittances"]').click();

    seededLease().then((lease) => {
      const row = `bail-${lease.id}`;
      waitForText(`[data-cy="total-bail-${lease.id}"]`, SEED_TOTAL);

      cy.get(`[data-cy="btn-modifier-bail-${lease.id}"]`).click();
      waitForValue('[data-cy="input-bail-loyer"]', SEED_RENT_INPUT);
      cy.get('[data-cy="input-bail-charges"]').clear().type("100,00");
      waitForText('[data-cy="total-quittance-config"]', "1 400,00 €");

      cy.get('[data-cy="input-bail-charges"]').clear().type("50,00");
      cy.get('[data-cy="btn-enregistrer-bail"]').click();
      waitForText(`[data-cy="${row}"]`, "1 350,00 €");
    });

    cy.reload();
    cy.get('[data-cy="onglet-quittances"]').click();
    seededLease().then((lease) => {
      waitForText(`[data-cy="total-bail-${lease.id}"]`, "1 350,00 €");
      cy.get(`[data-cy="btn-modifier-bail-${lease.id}"]`).click();
      waitForValue('[data-cy="input-bail-charges"]', "50,00");
      waitForText('[data-cy="total-quittance-config"]', "1 350,00 €");
    });
  });

  it("adds, edits then removes a landlord", () => {
    cy.visit("/configuration");
    cy.get('[data-cy="onglet-quittances"]').click();

    cy.get('[data-cy="btn-ajouter-bailleur"]').click();
    cy.get('[data-cy="input-bailleur-nom"]').type("Bailleur E2E");
    cy.get('[data-cy="input-bailleur-adresse"]').type(
      "2 rue du Test, 75001 Paris",
    );
    cy.get('[data-cy="btn-enregistrer-bailleur"]').click();
    cy.contains('[data-cy^="bailleur-"]', "Bailleur E2E", {
      timeout: 15_000,
    }).should("be.visible");

    cy.contains('[data-cy^="bailleur-"]', "Bailleur E2E").within(() => {
      cy.get('[data-cy^="btn-modifier-bailleur-"]').click();
    });
    cy.get('[data-cy="input-bailleur-nom"]')
      .clear()
      .type("Bailleur E2E modifié");
    cy.get('[data-cy="btn-enregistrer-bailleur"]').click();
    cy.contains('[data-cy^="bailleur-"]', "Bailleur E2E modifié", {
      timeout: 15_000,
    }).should("be.visible");

    cy.contains('[data-cy^="bailleur-"]', "Bailleur E2E modifié").within(() => {
      cy.get('[data-cy^="btn-supprimer-bailleur-"]').click();
    });
    cy.get('[data-cy="dialogue-supprimer-bailleur"]').should("be.visible");
    cy.get('[data-cy="dialogue-confirmer"]').click();
    cy.contains('[data-cy^="bailleur-"]', "Bailleur E2E modifié", {
      timeout: 15_000,
    }).should("not.exist");
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
