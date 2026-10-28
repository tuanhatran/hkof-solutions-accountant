import {
  SEED_RENT_INPUT,
  SEED_TOTAL,
  personByName,
  seededLease,
  selectAddressForLease,
  waitForText,
  waitForValue,
} from "../support/helpers";

const SEEDED_LANDLORD = "Nom du bailleur";

describe("Settings", () => {
  it("redirects /configuration to Entreprise and keeps the company after reload", () => {
    cy.visit("/configuration");
    cy.location("pathname").should("eq", "/configuration/entreprise");

    waitForText('[data-cy="info-societe"]', "HKOF");

    // Prorata is read-only on the Baux & Frais tab, shown once a lease row is
    // expanded with "Afficher les frais" (the tab arrives collapsed).
    cy.get('[data-cy="onglet-entreprise-bail-frais"]').click();
    cy.get('button[data-cy^="btn-afficher-frais-bail-societe-"]', {
      timeout: 20_000,
    })
      .first()
      .click();

    // Identity edits go through the modal.
    cy.get('[data-cy="onglet-entreprise-identification"]').click();
    cy.get('[data-cy="btn-modifier-societe"]').click();
    waitForValue('[data-cy="input-raison-sociale"]', "HKOF");
    cy.get('[data-cy="input-raison-sociale"]').clear().type("HKOF E2E");
    cy.get('[data-cy="btn-enregistrer-configuration-bas"]').click();
    cy.contains("Société enregistrée.", { timeout: 15_000 }).should(
      "be.visible",
    );
    cy.get('[data-cy="dialogue-formulaire-societe"]').should("not.exist");

    cy.reload();
    waitForText('[data-cy="info-societe"]', "HKOF E2E");
  });

  it("edits the seeded lease amounts in the LMNP Baux et adresses tab", () => {
    cy.visit("/configuration/lmnp");
    cy.get('[data-cy="onglet-baux"]').should(
      "have.attr",
      "aria-selected",
      "true",
    );

    seededLease().then((lease) => {
      selectAddressForLease(lease);
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
    seededLease().then((lease) => {
      selectAddressForLease(lease);
      waitForText(`[data-cy="total-bail-${lease.id}"]`, "1 350,00 €");
      cy.get(`[data-cy="btn-modifier-bail-${lease.id}"]`).click();
      waitForValue('[data-cy="input-bail-charges"]', "50,00");
      waitForText('[data-cy="total-quittance-config"]', "1 350,00 €");
    });
  });

  it("adds, edits then removes a natural person in the Personnes tab", () => {
    cy.visit("/configuration/lmnp");
    cy.get('[data-cy="onglet-personnes"]').click();

    cy.get('[data-cy="btn-ajouter-personne"]').click();
    cy.get('[data-cy="formulaire-personne"]').should("be.visible");
    cy.get('[data-cy="input-personne-nom"]').type("Personne E2E");
    cy.get('[data-cy="input-personne-adresse"]').type(
      "2 rue du Test, 75001 Paris",
    );
    // Distinct from the company modal's `input-lieu-emission`.
    cy.get('[data-cy="input-lieu-emission"]').should("not.exist");
    cy.get('[data-cy="input-personne-emission"]').type("Lyon");
    cy.get('[data-cy="btn-enregistrer-personne"]').click();

    cy.contains("Personne « Personne E2E » ajoutée.", {
      timeout: 15_000,
    }).should("be.visible");
    // The modal stays open in saved mode so signatures can be added.
    cy.get('[data-cy="personne-enregistree"]').should("be.visible");

    personByName("Personne E2E").then((person) => {
      expect(person.issuePlace, "issue place persisted").to.eq("Lyon");
      cy.get(
        '[data-cy="dialogue-formulaire-personne"] button[aria-label="Fermer"]',
      ).click();
      cy.get('[data-cy="formulaire-personne"]').should("not.exist");
      cy.get(`[data-cy="personne-${person.id}"]`)
        .should("contain.text", "Personne E2E")
        .and("contain.text", "2 rue du Test, 75001 Paris");

      cy.get(`[data-cy="btn-modifier-personne-${person.id}"]`).click();
      waitForValue('[data-cy="input-personne-emission"]', "Lyon");
      cy.get('[data-cy="input-personne-emission"]').clear().type("Marseille");
      cy.get('[data-cy="input-personne-nom"]')
        .clear()
        .type("Personne E2E modifiée");
      cy.get('[data-cy="btn-enregistrer-personne"]').click();
      cy.contains("Personne « Personne E2E modifiée » mise à jour.", {
        timeout: 15_000,
      }).should("be.visible");
      personByName("Personne E2E modifiée")
        .its("issuePlace")
        .should("eq", "Marseille");

      cy.get(
        '[data-cy="dialogue-formulaire-personne"] button[aria-label="Fermer"]',
      ).click();
      cy.get(`[data-cy="personne-${person.id}"]`).should(
        "contain.text",
        "Personne E2E modifiée",
      );

      cy.get(`[data-cy="btn-supprimer-personne-${person.id}"]`).click();
      cy.get('[data-cy="dialogue-supprimer-personne"]').should("be.visible");
      cy.get('[data-cy="dialogue-confirmer"]').click();

      cy.contains("Personne supprimée.", { timeout: 15_000 }).should(
        "be.visible",
      );
      cy.get(`[data-cy="personne-${person.id}"]`).should("not.exist");
    });
  });

  it("adds, edits then removes an expense type", () => {
    cy.visit("/configuration/entreprise");

    // Wait for the companies query and the effect that selects the first
    // company: it resets the active tab to "identification" when selectedId
    // resolves, so clicking the tab before that would be undone.
    cy.get('[data-cy="info-societe"]', { timeout: 20_000 }).should(
      "be.visible",
    );

    cy.get('[data-cy="onglet-entreprise-bail-frais"]').click();
    // The tab arrives collapsed: expand the first lease to reach its postes.
    cy.get('button[data-cy^="btn-afficher-frais-bail-societe-"]', {
      timeout: 20_000,
    })
      .first()
      .click();
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

  it("adds a signature to the seeded natural person from her form", () => {
    cy.visit("/configuration/lmnp");
    cy.get('[data-cy="onglet-personnes"]').click();

    personByName(SEEDED_LANDLORD).then((landlord) => {
      cy.get(`[data-cy="btn-modifier-personne-${landlord.id}"]`).click();
      cy.get('[data-cy="formulaire-personne"]').should("be.visible");

      cy.get('[data-cy="input-signature-personne-nom"]').type(
        "Signature E2E bailleur",
      );
      cy.get('[data-cy="input-signature-image"]').selectFile(
        "cypress/fixtures/signature-e2e.png",
        { force: true },
      );
      cy.get('[data-cy="btn-ajouter-signature-personne"]').click();

      cy.contains("Signature « Signature E2E bailleur » ajoutée.", {
        timeout: 15_000,
      }).should("be.visible");
      cy.contains(
        '[data-cy^="signature-personne-"]',
        "Signature E2E bailleur",
        {
          timeout: 15_000,
        },
      )
        .should("be.visible")
        .and("contain.text", "Ajoutée le");
    });
  });
});
