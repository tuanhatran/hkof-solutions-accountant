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
  it("redirects /settings to Entreprise and keeps the company after reload", () => {
    cy.visit("/settings");
    cy.location("pathname").should("eq", "/settings/company");

    waitForText('[data-cy="company-information"]', "HKOF");

    // Prorata is read-only on the Baux & Frais tab; its lease grid is visible
    // right away, without any expansion step.
    cy.get('[data-cy="tab-company-lease-expenses"]').click();
    cy.get('[data-cy^="company-lease-"]', { timeout: 20_000 }).should("exist");

    // Identity edits go through the modal.
    cy.get('[data-cy="tab-company-identification"]').click();
    cy.get('[data-cy="btn-edit-company"]').click();
    waitForValue('[data-cy="input-legal-name"]', "HKOF");
    cy.get('[data-cy="input-legal-name"]').clear().type("HKOF E2E");
    cy.get('[data-cy="btn-save-basic-configuration"]').click();
    cy.contains("Société enregistrée.", { timeout: 15_000 }).should(
      "be.visible",
    );
    cy.get('[data-cy="dialog-company-form"]').should("not.exist");

    cy.reload();
    waitForText('[data-cy="company-information"]', "HKOF E2E");
  });

  it("sorts the company leases from the headers and filters from the section header", () => {
    cy.visit("/settings/company");
    cy.get('[data-cy="company-information"]', { timeout: 20_000 }).should(
      "be.visible",
    );
    cy.get('[data-cy="tab-company-lease-expenses"]').click();
    cy.get('[data-cy^="company-lease-"]', { timeout: 20_000 }).should("exist");

    // No list toolbar and no company-level expenses action on this tab.
    cy.get('[data-cy="sort-company-leases"]').should("not.exist");
    cy.get('[data-cy="sort-direction-company-leases"]').should("not.exist");
    cy.get('[data-cy="btn-company-general-expenses"]').should("not.exist");

    // The grid exposes real table semantics, not bare `aria-sort` divs.
    cy.get(".company-lease-tab-table").should("have.attr", "role", "table");
    cy.get('[data-cy="company-leases-headers"]').should(
      "have.attr",
      "role",
      "row",
    );
    cy.get('[data-cy="company-leases-headers"] [role="columnheader"]').should(
      "have.length",
      5,
    );
    cy.get('[data-cy^="company-lease-"]')
      .first()
      .should("have.attr", "role", "row")
      .find('[role="cell"]')
      .should("have.length", 5);

    // Address is the default ascending sort; the active column toggles.
    cy.get('[data-cy="sort-company-leases-address"]')
      .parent()
      .should("have.attr", "aria-sort", "ascending");
    cy.get('[data-cy="sort-company-leases-rent"]')
      .parent()
      .should("have.attr", "aria-sort", "none");
    cy.get('[data-cy="sort-company-leases-rent"]').click();
    cy.get('[data-cy="sort-company-leases-rent"]')
      .parent()
      .should("have.attr", "aria-sort", "ascending");
    cy.get('[data-cy="sort-company-leases-address"]')
      .parent()
      .should("have.attr", "aria-sort", "none");
    cy.get('[data-cy="sort-company-leases-rent"]').click();
    cy.get('[data-cy="sort-company-leases-rent"]')
      .parent()
      .should("have.attr", "aria-sort", "descending");

    // The filter and its live count stay in the section header.
    cy.get('[data-cy="filter-count-company-leases"]').should(
      "contain.text",
      "1 sur 1",
    );
    cy.get('[data-cy="filter-company-leases"]').type("introuvable");
    cy.get('[data-cy="filter-count-company-leases"]').should(
      "contain.text",
      "0 sur 1",
    );
    cy.get('[data-cy="no-results-company-leases"]').should("be.visible");
    cy.get('[data-cy="filter-clear-company-leases"]').click();
    cy.get('[data-cy="filter-count-company-leases"]').should(
      "contain.text",
      "1 sur 1",
    );
  });

  it("keeps the lease sort reachable on mobile", () => {
    cy.viewport(390, 844);
    cy.visit("/settings/company");
    cy.get('[data-cy="company-information"]', { timeout: 20_000 }).should(
      "be.visible",
    );
    cy.get('[data-cy="tab-company-lease-expenses"]').click();

    cy.get('[data-cy="sort-company-leases-compact"]', { timeout: 20_000 })
      .should("be.visible")
      .select("charges");
    cy.get('[data-cy="sort-company-leases-compact-direction"]')
      .should("have.attr", "aria-label", "Tri croissant")
      .click();
    cy.get('[data-cy="sort-company-leases-compact-direction"]').should(
      "have.attr",
      "aria-label",
      "Tri décroissant",
    );
    cy.get('[data-cy="sort-company-leases-compact"]').should(
      "have.value",
      "charges",
    );
  });

  it("edits the seeded lease amounts in the LMNP Baux et adresses tab", () => {
    cy.visit("/settings/agency");
    cy.get('[data-cy="tab-leases"]').should(
      "have.attr",
      "aria-selected",
      "true",
    );

    seededLease().then((lease) => {
      selectAddressForLease(lease);
      const row = `lease-${lease.id}`;
      waitForText(`[data-cy="lease-total-${lease.id}"]`, SEED_TOTAL);

      cy.get(`[data-cy="btn-edit-lease-${lease.id}"]`).click();
      waitForValue('[data-cy="input-lease-rent"]', SEED_RENT_INPUT);
      cy.get('[data-cy="input-lease-charges"]').clear().type("100,00");
      waitForText('[data-cy="rent-receipt-config-total"]', "1 400,00 €");

      cy.get('[data-cy="input-lease-charges"]').clear().type("50,00");
      cy.get('[data-cy="btn-save-lease"]').click();
      waitForText(`[data-cy="${row}"]`, "1 350,00 €");
    });

    cy.reload();
    seededLease().then((lease) => {
      selectAddressForLease(lease);
      waitForText(`[data-cy="lease-total-${lease.id}"]`, "1 350,00 €");
      cy.get(`[data-cy="btn-edit-lease-${lease.id}"]`).click();
      waitForValue('[data-cy="input-lease-charges"]', "50,00");
      waitForText('[data-cy="rent-receipt-config-total"]', "1 350,00 €");
    });
  });

  it("adds, edits then removes a natural person in the Personnes tab", () => {
    cy.visit("/settings/agency");
    cy.get('[data-cy="tab-persons"]').click();

    cy.get('[data-cy="btn-add-person"]').click();
    cy.get('[data-cy="person-form"]').should("be.visible");
    cy.get('[data-cy="input-person-name"]').type("Personne E2E");
    cy.get('[data-cy="input-person-address"]').type(
      "2 rue du Test, 75001 Paris",
    );
    // Distinct from the company modal's `input-issue-place`.
    cy.get('[data-cy="input-issue-place"]').should("not.exist");
    cy.get('[data-cy="input-person-issue-place"]').type("Lyon");
    cy.get('[data-cy="btn-save-person"]').click();

    cy.contains("Personne « Personne E2E » ajoutée.", {
      timeout: 15_000,
    }).should("be.visible");
    // The modal stays open in saved mode so signatures can be added.
    cy.get('[data-cy="person-saved"]').should("be.visible");

    personByName("Personne E2E").then((person) => {
      expect(person.issuePlace, "issue place persisted").to.eq("Lyon");
      cy.get(
        '[data-cy="dialog-person-form"] button[aria-label="Fermer"]',
      ).click();
      cy.get('[data-cy="person-form"]').should("not.exist");
      cy.get(`[data-cy="person-${person.id}"]`)
        .should("contain.text", "Personne E2E")
        .and("contain.text", "2 rue du Test, 75001 Paris");

      cy.get(`[data-cy="btn-edit-person-${person.id}"]`).click();
      waitForValue('[data-cy="input-person-issue-place"]', "Lyon");
      cy.get('[data-cy="input-person-issue-place"]').clear().type("Marseille");
      cy.get('[data-cy="input-person-name"]')
        .clear()
        .type("Personne E2E modifiée");
      cy.get('[data-cy="btn-save-person"]').click();
      cy.contains("Personne « Personne E2E modifiée » mise à jour.", {
        timeout: 15_000,
      }).should("be.visible");
      personByName("Personne E2E modifiée")
        .its("issuePlace")
        .should("eq", "Marseille");

      cy.get(
        '[data-cy="dialog-person-form"] button[aria-label="Fermer"]',
      ).click();
      cy.get(`[data-cy="person-${person.id}"]`).should(
        "contain.text",
        "Personne E2E modifiée",
      );

      cy.get(`[data-cy="btn-delete-person-${person.id}"]`).click();
      cy.get('[data-cy="dialog-delete-person"]').should("be.visible");
      cy.get('[data-cy="dialog-confirm"]').click();

      cy.contains("Personne supprimée.", { timeout: 15_000 }).should(
        "be.visible",
      );
      cy.get(`[data-cy="person-${person.id}"]`).should("not.exist");
    });
  });

  it("adds, edits then removes an expense type", () => {
    cy.visit("/settings/company");

    // Wait for the companies query and the effect that selects the first
    // company: it resets the active tab to "identification" when selectedId
    // resolves, so clicking the tab before that would be undone.
    cy.get('[data-cy="company-information"]', { timeout: 20_000 }).should(
      "be.visible",
    );

    cy.get('[data-cy="tab-company-lease-expenses"]').click();
    // "Modifier les frais" opens the lease expenses dialog; the item form swaps
    // inside that same window, never as a stacked dialog.
    cy.get('[data-cy^="btn-edit-company-lease-expenses-"]', {
      timeout: 20_000,
    })
      .first()
      .click();
    cy.get('[data-cy="dialog-company-lease-expenses"]').should("be.visible");
    cy.get('[role="dialog"]').should("have.length", 1);
    cy.get('[data-cy="btn-add-item"]').click();
    cy.get('[data-cy="item-form"]').should("be.visible");
    cy.get('[data-cy="dialog-item-form"]').should("not.exist");
    cy.get('[role="dialog"]').should("have.length", 1);
    cy.get("#item-code").type("internet-pro");
    cy.get('[data-cy="input-item-label"]').type("Internet pro");
    cy.get('[data-cy="input-item-supplier"]').type("Free");
    cy.get('[data-cy="input-item-prorata"]').clear().type("50");
    cy.get('[data-cy="btn-save-item"]').click();

    cy.get('[data-cy="item-form"]').should("not.exist");
    cy.contains("td", "Internet pro", { timeout: 15_000 }).should("be.visible");
    cy.contains("td", "50 %").should("be.visible");

    cy.get('[data-cy="btn-edit-item-internet_pro"]').click();
    cy.get('[data-cy="item-form"]').should("be.visible");
    cy.get('[data-cy="input-item-label"]').clear().type("Internet pro fibre");
    cy.get('[data-cy="input-item-prorata"]').clear().type("60");
    cy.get('[data-cy="btn-save-item"]').click();

    cy.contains("td", "Internet pro fibre", { timeout: 15_000 }).should(
      "be.visible",
    );
    cy.contains("td", "60 %").should("be.visible");

    cy.get('[data-cy="btn-delete-item-internet_pro"]').click();
    cy.get('[data-cy="dialog-delete-item"]').should("be.visible");
    cy.get('[data-cy="dialog-confirm"]').click();

    cy.contains("td", "Internet pro fibre", { timeout: 15_000 }).should(
      "not.exist",
    );

    cy.get(
      '[data-cy="dialog-company-lease-expenses"] button[aria-label="Fermer"]',
    ).click();
    cy.get('[data-cy="dialog-company-lease-expenses"]').should("not.exist");
  });

  it("adds a signature to the seeded natural person from her form", () => {
    cy.visit("/settings/agency");
    cy.get('[data-cy="tab-persons"]').click();

    personByName(SEEDED_LANDLORD).then((landlord) => {
      cy.get(`[data-cy="btn-edit-person-${landlord.id}"]`).click();
      cy.get('[data-cy="person-form"]').should("be.visible");

      cy.get('[data-cy="input-person-signature-name"]').type(
        "Signature E2E bailleur",
      );
      cy.get('[data-cy="input-signature-image"]').selectFile(
        "cypress/fixtures/signature-e2e.png",
        { force: true },
      );
      cy.get('[data-cy="btn-add-person-signature"]').click();

      cy.contains("Signature « Signature E2E bailleur » ajoutée.", {
        timeout: 15_000,
      }).should("be.visible");
      cy.contains('[data-cy^="person-signature-"]', "Signature E2E bailleur", {
        timeout: 15_000,
      })
        .should("be.visible")
        .and("contain.text", "Ajoutée le");
    });
  });
});
