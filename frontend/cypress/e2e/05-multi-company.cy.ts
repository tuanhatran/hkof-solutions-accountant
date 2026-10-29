import {
  MONTHS,
  addExpense,
  disableLlm,
  waitForAmount,
  waitForText,
} from "../support/helpers";

interface CompanySummary {
  id: number;
  name: string;
  leaseId?: number | null;
}

interface CompanyDetail extends CompanySummary {
  legalForm?: string;
  siren?: string;
  address?: string;
  managerName?: string;
  issuePlace?: string;
}

interface EmployeeSummary {
  id: number;
  companyId: number;
  firstName: string;
  lastName: string;
  title: string;
  signatureCount?: number;
}

interface LeaseSummary {
  id: number;
  landlordId: number;
  companyId?: number | null;
  companyLease?: boolean;
}

const SEEDED_COMPANY = "HKOF";
const ANNEXE_COMPANY = {
  name: "HKOF Annexe",
  siren: "123 456 789",
  address: "10 avenue des Tests, 75002 Paris",
  managerName: "Alice Martin",
  issuePlace: "Lyon",
  proRata: "25 %",
};
const ANNEXE_LEASE = {
  propertyAddress: "10 avenue des Tests, 75002 Paris",
  rent: "900",
  charges: "50",
  totalArea: "80",
  businessArea: "20",
};
const ANNEXE_SECOND_LANDLORD = "Bailleur annexe 2";
const ANNEXE_SECOND_LEASE = {
  propertyAddress: "20 rue Annexe Bis, 75003 Paris",
  rent: "800",
  charges: "40",
  totalArea: "100",
  businessArea: "25",
};
const ANNEXE_EMPLOYEE = {
  firstName: "Alice",
  lastName: "Martin",
  email: "alice.martin@example.fr",
};
const ANNEXE_LANDLORD = "Bailleur annexe";

/**
 * Opens the first lease expenses dialog of the selected company. Like the
 * grid, every lease is reachable without an expansion step.
 */
function openFirstLeaseExpenses(): void {
  cy.get('[data-cy^="btn-modifier-frais-company-lease-"]', { timeout: 20_000 })
    .first()
    .click();
  cy.get('[data-cy="dialogue-frais-bail-societe"]').should("be.visible");
}

/** Closes the lease expenses dialog through its header close button. */
function closeLeaseExpenses(): void {
  cy.get(
    '[data-cy="dialogue-frais-bail-societe"] button[aria-label="Fermer"]',
  ).click();
  cy.get('[data-cy="dialogue-frais-bail-societe"]').should("not.exist");
}

function companies(): Cypress.Chainable<CompanySummary[]> {
  return cy
    .request<CompanySummary[]>("/api/companies")
    .then(({ body }) => body);
}

function companyIds(): Cypress.Chainable<{
  seeded: CompanySummary;
  annexe: CompanySummary;
}> {
  return companies().then((list) => {
    const seeded = list.find((company) => company.name === SEEDED_COMPANY);
    const annexe = list.find((company) => company.name === ANNEXE_COMPANY.name);
    if (!seeded || !annexe) {
      throw new Error(
        "Both companies are required for the multi-company spec.",
      );
    }
    return { seeded, annexe };
  });
}

function employeeByName(
  companyId: number,
  firstName: string,
): Cypress.Chainable<EmployeeSummary> {
  return cy
    .request<EmployeeSummary[]>(`/api/companies/${companyId}/employees`)
    .then(({ body }) => {
      const employee = body.find(
        (candidate) => candidate.firstName === firstName,
      );
      if (!employee) {
        throw new Error(`Employee ${firstName} was not created.`);
      }
      return employee;
    });
}

/** Creates a natural person through the `/api/persons` directory. */
function createPerson(name: string): Cypress.Chainable<number> {
  return cy
    .request<{ id: number }>("POST", "/api/persons", {
      name,
      address: ANNEXE_COMPANY.address,
    })
    .then(({ body }) => body.id);
}

/** Creates the annexe lease through the LMNP page, with its company tenant. */
function createAnnexeLease(annexeCompanyId: number): Cypress.Chainable<number> {
  return createPerson(ANNEXE_LANDLORD).then((landlordId) => {
    cy.get('[data-cy="tab-lmnp"]').click();
    cy.get('[data-cy="btn-ajouter-bail"]').click();
    cy.get('[data-cy="formulaire-bail"]').should("be.visible");
    cy.get('[data-cy="select-bail-bailleur"]').select(String(landlordId));
    cy.get('[data-cy="input-company-lease-type"]').check();
    cy.get('[data-cy="select-bail-locataire-societe"]').select(
      String(annexeCompanyId),
    );
    cy.get('[data-cy="input-bail-adresse"]').type(ANNEXE_LEASE.propertyAddress);
    cy.get('[data-cy="input-bail-loyer"]').clear().type(ANNEXE_LEASE.rent);
    cy.get('[data-cy="input-bail-charges"]').clear().type(ANNEXE_LEASE.charges);
    cy.get('[data-cy="input-surface-totale"]').type(ANNEXE_LEASE.totalArea);
    cy.get('[data-cy="input-surface-pro"]').type(ANNEXE_LEASE.businessArea);
    cy.get('[data-cy="btn-enregistrer-bail"]').click();
    cy.contains("Bail ajouté.", { timeout: 20_000 }).should("be.visible");

    cy.request<{ id: number; label: string }[]>("/api/addresses").then(
      ({ body }) => {
        const address = body.find(
          (candidate) => candidate.label === ANNEXE_LEASE.propertyAddress,
        );
        if (!address) {
          throw new Error("Annexe address was not created.");
        }
        cy.get('[data-cy="select-adresse-quittances"]', {
          timeout: 20_000,
        }).should("have.value", String(address.id));
      },
    );

    return cy.request<LeaseSummary[]>("/api/leases").then(({ body }) => {
      const lease = body.find(
        (candidate) =>
          candidate.landlordId === landlordId &&
          candidate.companyLease === true &&
          candidate.companyId === annexeCompanyId,
      );
      if (!lease) {
        throw new Error("Annexe lease was not created.");
      }
      return lease.id;
    });
  });
}

/** Locates the annexe company's lease that is not the first one. */
function secondAnnexeLease(
  annexeCompanyId: number,
  firstLeaseId: number,
): Cypress.Chainable<number> {
  return cy.request<LeaseSummary[]>("/api/leases").then(({ body }) => {
    const lease = body.find(
      (candidate) =>
        candidate.companyId === annexeCompanyId &&
        candidate.id !== firstLeaseId,
    );
    if (!lease) {
      throw new Error("Second annexe lease was not created.");
    }
    return lease.id;
  });
}

/** First company lease of a company, used by the API statement. */
function companyLeaseId(companyId: number): Cypress.Chainable<number> {
  return cy.request<LeaseSummary[]>("/api/leases").then(({ body }) => {
    const lease = body.find(
      (candidate) =>
        candidate.companyId === companyId && candidate.companyLease === true,
    );
    if (!lease) {
      throw new Error("Company lease was not found.");
    }
    return lease.id;
  });
}

/** Links a company to a lease through the API; the Settings tab no longer does. */
function linkCompanyLease(companyId: number, leaseId: number): void {
  cy.request<CompanyDetail>(`/api/companies/${companyId}`).then(({ body }) => {
    cy.request({
      method: "PUT",
      url: `/api/companies/${companyId}`,
      body: {
        name: body.name,
        legalForm: body.legalForm,
        siren: body.siren,
        address: body.address,
        managerName: body.managerName,
        leaseId,
        issuePlace: body.issuePlace,
      },
    })
      .its("status")
      .should("eq", 200);
  });
}

/** Creates the second company and its lease through the UI; it is selected for configuration. */
function createAnnexeCompany(): void {
  cy.visit("/configuration");
  waitForText('[data-cy="company-information"]', SEEDED_COMPANY);

  cy.get('[data-cy="btn-nouvelle-societe"]').click();
  cy.get('[data-cy="dialogue-formulaire-societe"]').should("be.visible");
  cy.get('[data-cy="select-societe"]').should("be.visible");
  cy.get('[data-cy="input-raison-sociale"]').clear().type(ANNEXE_COMPANY.name);
  cy.get('[data-cy="input-siren"]').clear().type(ANNEXE_COMPANY.siren);
  cy.get('[data-cy="input-managerName"]')
    .clear()
    .type(ANNEXE_COMPANY.managerName);
  cy.get('[data-cy="input-societe-adresse"]')
    .clear()
    .type(ANNEXE_COMPANY.address);
  cy.get('[data-cy="input-lieu-emission"]')
    .clear()
    .type(ANNEXE_COMPANY.issuePlace);
  cy.get('[data-cy="btn-enregistrer-configuration-bas"]').click();

  cy.contains("Société créée.", { timeout: 20_000 }).should("be.visible");
  companyIds().then(({ annexe }) => {
    cy.get('[data-cy="select-societe"]').should(
      "have.value",
      String(annexe.id),
    );
    cy.get('[data-cy="select-societe"] option').should(($options) => {
      const labels = [...$options].map((option) =>
        (option.textContent ?? "").trim(),
      );
      expect(labels).to.include.members([SEEDED_COMPANY, ANNEXE_COMPANY.name]);
    });

    createAnnexeLease(annexe.id).then((leaseId) => {
      cy.get('[data-cy="tab-configuration"]').click();
      cy.get('[data-cy="select-societe"]').select(String(annexe.id));
      cy.get('[data-cy="onglet-entreprise-bail-frais"]').click();

      // The Baux & Frais tab is a five-column grid; the row is inert and
      // carries no active-lease state.
      cy.get(`[data-cy="company-lease-${leaseId}"]`, { timeout: 20_000 })
        .should("contain.text", ANNEXE_LEASE.propertyAddress)
        .and("not.contain.text", "Bail actif")
        .and("not.have.attr", "aria-expanded");
      cy.intercept("PUT", "/api/companies/*").as("updateCompany");
      cy.get(`[data-cy="company-lease-${leaseId}"]`).click();
      cy.get('[data-cy="dialogue-frais-bail-societe"]').should("not.exist");
      cy.get("@updateCompany.all").should("have.length", 0);

      // "Modifier les frais" opens the expenses dialog scoped to the lease,
      // still without persisting the lease on the company.
      cy.get(`[data-cy="btn-modifier-frais-company-lease-${leaseId}"]`).click();
      cy.get('[data-cy="dialogue-frais-bail-societe"]')
        .should("be.visible")
        .and("contain.text", ANNEXE_LEASE.propertyAddress);
      cy.get('[role="dialog"]').should("have.length", 1);
      cy.get("@updateCompany.all").should("have.length", 0);
      closeLeaseExpenses();

      // A second landlord so the company holds a second lease; reload so the
      // lease form knows the new person.
      createPerson(ANNEXE_SECOND_LANDLORD).then((landlordId) => {
        cy.reload();
        cy.get('[data-cy="tab-configuration"]').click();
        cy.get('[data-cy="select-societe"]').select(String(annexe.id));
        cy.get('[data-cy="onglet-entreprise-bail-frais"]').click();

        // "Ajouter un bail": the LMNP form opens with "Bail société" checked
        // and the company prefilled as tenant.
        cy.get('[data-cy="btn-ajouter-bail-societe"]', {
          timeout: 20_000,
        }).click();
        cy.get('[data-cy="formulaire-bail"]').should("be.visible");
        cy.get('[data-cy="input-company-lease-type"]').should("be.checked");
        cy.get('[data-cy="select-bail-locataire-societe"]').should(
          "have.value",
          String(annexe.id),
        );
        cy.get('[data-cy="select-bail-bailleur"]').select(String(landlordId));
        cy.get('[data-cy="input-bail-adresse"]').type(
          ANNEXE_SECOND_LEASE.propertyAddress,
        );
        cy.get('[data-cy="input-bail-loyer"]')
          .clear()
          .type(ANNEXE_SECOND_LEASE.rent);
        cy.get('[data-cy="input-bail-charges"]')
          .clear()
          .type(ANNEXE_SECOND_LEASE.charges);
        cy.get('[data-cy="input-surface-totale"]').type(
          ANNEXE_SECOND_LEASE.totalArea,
        );
        cy.get('[data-cy="input-surface-pro"]').type(
          ANNEXE_SECOND_LEASE.businessArea,
        );
        cy.get('[data-cy="btn-enregistrer-bail"]').click();
        cy.contains("Bail ajouté.", { timeout: 20_000 }).should("be.visible");
        cy.get('[data-cy="formulaire-bail"]').should("not.exist");

        secondAnnexeLease(annexe.id, leaseId).then((secondLeaseId) => {
          // Both leases render as grid rows, with no active-lease state.
          cy.get(`[data-cy="company-lease-${secondLeaseId}"]`, {
            timeout: 20_000,
          })
            .should("contain.text", ANNEXE_SECOND_LEASE.propertyAddress)
            .and("not.contain.text", "Bail actif")
            .and("not.have.attr", "aria-expanded");
          cy.get(`[data-cy="company-lease-${leaseId}"]`)
            .should("contain.text", ANNEXE_LEASE.propertyAddress)
            .and("not.contain.text", "Bail actif")
            .and("not.have.attr", "aria-expanded");

          // The grid follows the address sort by default: no active pinning.
          cy.get(".company-lease-tab-item")
            .first()
            .should("have.attr", "data-cy", `company-lease-${leaseId}`);

          // No list toolbar and no company-level expenses action remain.
          cy.get('[data-cy="tri-baux-societe"]').should("not.exist");
          cy.get('[data-cy="tri-direction-baux-societe"]').should("not.exist");
          cy.get('[data-cy="btn-frais-generaux-societe"]').should("not.exist");

          // Address is the default ascending sort; an inactive column starts
          // ascending, the active column toggles.
          cy.get('[data-cy="tri-adresse-baux-societe"]')
            .parent()
            .should("have.attr", "aria-sort", "ascending");
          cy.get('[data-cy="tri-loyer-baux-societe"]').click();
          cy.get('[data-cy="tri-loyer-baux-societe"]')
            .parent()
            .should("have.attr", "aria-sort", "ascending");
          cy.get(".company-lease-tab-item")
            .first()
            .should("have.attr", "data-cy", `company-lease-${secondLeaseId}`);
          cy.get('[data-cy="tri-loyer-baux-societe"]').click();
          cy.get('[data-cy="tri-loyer-baux-societe"]')
            .parent()
            .should("have.attr", "aria-sort", "descending");
          cy.get(".company-lease-tab-item")
            .first()
            .should("have.attr", "data-cy", `company-lease-${leaseId}`);
          cy.get('[data-cy="tri-adresse-baux-societe"]').click();

          // Both fresh leases have no expense item yet.
          cy.get(
            `[data-cy="btn-modifier-frais-company-lease-${leaseId}"]`,
          ).should("contain.text", "Ajouter des frais");
          cy.get(
            `[data-cy="btn-modifier-frais-company-lease-${secondLeaseId}"]`,
          ).should("contain.text", "Ajouter des frais");

          // "Modifier les frais" scopes the dialog to the clicked lease,
          // without writing the lease on the company.
          cy.intercept("PUT", "/api/companies/*").as("updateCompany");
          cy.get(
            `[data-cy="btn-modifier-frais-company-lease-${secondLeaseId}"]`,
          ).click();
          cy.get('[data-cy="dialogue-frais-bail-societe"]')
            .should("be.visible")
            .and("contain.text", ANNEXE_SECOND_LEASE.propertyAddress)
            .and("not.contain.text", ANNEXE_LEASE.propertyAddress);
          cy.get('[role="dialog"]').should("have.length", 1);
          cy.get("@updateCompany.all").should("have.length", 0);
          closeLeaseExpenses();

          // The row stays inert: a click never opens the dialog.
          cy.get(`[data-cy="company-lease-${secondLeaseId}"]`).click();
          cy.get('[data-cy="dialogue-frais-bail-societe"]').should("not.exist");
          cy.get("@updateCompany.all").should("have.length", 0);
        });
      });
    });
  });
}

/** Adds the annexe CEO and one signature from the same employee form. */
function createAnnexeEmployee(companyId: number): void {
  cy.get('[data-cy="tab-configuration"]').click();
  cy.get('[data-cy="select-societe"]').should("have.value", String(companyId));
  cy.get('[data-cy="onglet-entreprise-salaries"]').click();
  cy.get('[data-cy="aucun-salarie"]').should("be.visible");

  cy.get('[data-cy="btn-ajouter-salarie"]').click();
  cy.get('[data-cy="formulaire-salarie"]').should("be.visible");
  cy.get('[data-cy="input-salarie-prenom"]').type(ANNEXE_EMPLOYEE.firstName);
  cy.get('[data-cy="input-salarie-nom"]').type(ANNEXE_EMPLOYEE.lastName);
  cy.get('[data-cy="input-salarie-email"]').type(ANNEXE_EMPLOYEE.email);
  cy.get('[data-cy="select-salarie-titre"]').select("CEO");
  cy.get('[data-cy="btn-enregistrer-salarie"]').click();

  cy.contains("Salarié ajouté.", { timeout: 20_000 }).should("be.visible");
  employeeByName(companyId, ANNEXE_EMPLOYEE.firstName).then((employee) => {
    cy.get(`[data-cy="salarie-${employee.id}"]`)
      .should("contain.text", "Alice Martin")
      .and("contain.text", "PDG");

    // The employee form stays open after creation so signatures can be added.
    cy.get('[data-cy="input-signature-personne-nom"]').type(
      "Signature E2E Alice",
    );
    cy.get('[data-cy="input-signature-image"]').selectFile(
      "cypress/fixtures/signature-e2e.png",
      { force: true },
    );
    cy.get('[data-cy="btn-ajouter-signature-personne"]').click();

    cy.contains("Signature « Signature E2E Alice » ajoutée.", {
      timeout: 20_000,
    }).should("be.visible");
    cy.contains('[data-cy^="signature-personne-"]', "Signature E2E Alice", {
      timeout: 20_000,
    })
      .should("be.visible")
      .and("contain.text", "Ajoutée le");
    cy.get(`[data-cy="signatures-salarie-${employee.id}"]`).should(
      "contain.text",
      "1 signature",
    );
  });
}

function createAnnexeExpenseItem(companyId: number): void {
  // The employee modal stays open after creation for signatures; close it here.
  cy.contains("button", "Annuler").click();
  cy.get('[data-cy="dialogue-formulaire-salarie"]').should("not.exist");
  cy.get('[data-cy="tab-configuration"]').click();
  cy.get('[data-cy="select-societe"]').should("have.value", String(companyId));
  cy.get('[data-cy="onglet-entreprise-bail-frais"]').click();
  // Every lease row exposes its expenses through the scoped dialog.
  openFirstLeaseExpenses();
  cy.contains("Aucun poste configuré.", { timeout: 20_000 }).should(
    "be.visible",
  );

  cy.get('[data-cy="btn-ajouter-poste"]').click();
  cy.get('[data-cy="formulaire-poste"]').should("be.visible");
  cy.get('[data-cy="dialogue-formulaire-poste"]').should("not.exist");
  cy.get("#poste-code").type("gaz");
  cy.get('[data-cy="input-poste-libelle"]').type("Gaz annexe");
  cy.get('[data-cy="input-poste-fournisseur"]').type("EDF");
  cy.get('[data-cy="input-poste-prorata"]').clear().type("25");
  cy.get('[data-cy="btn-enregistrer-poste"]').click();
  cy.contains("td", "Gaz annexe", { timeout: 20_000 }).should("be.visible");
  closeLeaseExpenses();

  // The decorated lease now offers "Modifier les frais"; its itemless
  // sibling still offers "Ajouter des frais".
  cy.get('[data-cy^="btn-modifier-frais-company-lease-"]')
    .eq(0)
    .should("contain.text", "Modifier les frais");
  cy.get('[data-cy^="btn-modifier-frais-company-lease-"]')
    .eq(1)
    .should("contain.text", "Ajouter des frais");
}

function assertSettingsIsolation(
  seededCompanyId: number,
  annexeCompanyId: number,
): void {
  cy.get('[data-cy="select-societe"]').select(String(seededCompanyId));
  waitForText('[data-cy="company-information"]', SEEDED_COMPANY);
  cy.get('[data-cy="onglet-entreprise-bail-frais"]').click();
  openFirstLeaseExpenses();
  cy.contains("td", "Téléphone", { timeout: 20_000 }).should("be.visible");
  cy.contains("td", "Gaz annexe").should("not.exist");
  closeLeaseExpenses();

  cy.get('[data-cy="select-societe"]').select(String(annexeCompanyId));
  waitForText('[data-cy="company-information"]', ANNEXE_COMPANY.name);
  cy.get('[data-cy="onglet-entreprise-bail-frais"]').click();
  openFirstLeaseExpenses();
  cy.contains("td", "Gaz annexe", { timeout: 20_000 }).should("be.visible");
  cy.contains("td", "Téléphone").should("not.exist");
  closeLeaseExpenses();
}

function assertEmployeeIsolation(
  seededCompanyId: number,
  annexeCompanyId: number,
): void {
  cy.get('[data-cy="tab-configuration"]').click();
  cy.get('[data-cy="select-societe"]').select(String(seededCompanyId));
  cy.get('[data-cy="onglet-entreprise-salaries"]').click();
  cy.contains('[data-cy^="salarie-"]', "Gérant", { timeout: 20_000 }).should(
    "be.visible",
  );
  cy.contains('[data-cy^="salarie-"]', "Alice Martin").should("not.exist");

  cy.get('[data-cy="select-societe"]').select(String(annexeCompanyId));
  cy.get('[data-cy="onglet-entreprise-salaries"]').click();
  cy.contains('[data-cy^="salarie-"]', "Alice Martin", {
    timeout: 20_000,
  }).should("be.visible");
  cy.contains('[data-cy^="salarie-"]', "Gérant").should("not.exist");
}

describe("Multi-company and employees", () => {
  it("isolates companies, their employees, signatures and expense items", () => {
    createAnnexeCompany();

    companyIds().then(({ seeded, annexe }) => {
      createAnnexeEmployee(annexe.id);
      createAnnexeExpenseItem(annexe.id);
      assertSettingsIsolation(seeded.id, annexe.id);
      assertEmployeeIsolation(seeded.id, annexe.id);
    });
  });

  it("generates both companies' notes and lists them in History without a switch", () => {
    disableLlm();
    createAnnexeCompany();

    companyIds().then(({ seeded, annexe }) => {
      createAnnexeEmployee(annexe.id);
      createAnnexeExpenseItem(annexe.id);

      // Link HKOF to its company lease so the generated note carries an address.
      companyLeaseId(seeded.id).then((seededLeaseId) => {
        linkCompanyLease(seeded.id, seededLeaseId);
      });

      // Creating a company no longer activates it globally: the note page asks
      // for an explicit company in its header.
      cy.visit("/generer/note-frais");
      cy.get('[data-cy="select-societe-note-frais"]', { timeout: 20_000 })
        .should("be.visible")
        .select(String(seeded.id));
      cy.chooseMonth(MONTHS);
      cy.get('[data-cy="select-type-frais"]').should("not.be.disabled");
      cy.get('[data-cy="select-type-frais"] option[value="telephone"]').should(
        "exist",
      );
      addExpense({
        itemCode: "telephone",
        fixture: "facture-telephone.txt",
        amountInclVat: "100.00",
      });
      waitForAmount('[data-cy="total-retenu"]', "35,71");
      cy.get('[data-cy="btn-generer-note"]').should("not.be.disabled").click();
      cy.contains("Note de frais générée", { timeout: 35_000 }).should(
        "be.visible",
      );

      // The annexe statement goes through the API: its "gaz" poste exists at
      // 25 %, and the company must be named explicitly.
      companyLeaseId(annexe.id).then((leaseId) => {
        cy.request({
          method: "POST",
          url: "/api/expense-statements",
          body: {
            companyId: annexe.id,
            leaseId,
            month: MONTHS,
            lines: [
              { itemCode: "gaz", amountInclVat: "100.00", proRataPct: "25" },
            ],
          },
        })
          .its("status")
          .should("eq", 201);
      });

      cy.request(`/api/expense-statements?companyId=${annexe.id}`)
        .its("body")
        .should("have.length", 1);
      cy.request(`/api/expense-statements?companyId=${seeded.id}`)
        .its("body")
        .should("have.length", 1);

      // History fans out one statement query per company: both notes show up
      // with their own lease address, without any global company switch.
      cy.get('[data-cy="tab-historique"]').click();
      cy.get('[data-cy="historique-mois-2026-01"]', {
        timeout: 20_000,
      }).should("be.visible");
      cy.get('[data-cy^="historique-adresse-note-2026-01"]').should(
        "have.length",
        2,
      );
      cy.contains(
        '[data-cy^="historique-adresse-note-2026-01"]',
        "12 rue de la République, 75000 Paris",
      ).should("be.visible");
      cy.contains(
        '[data-cy^="historique-adresse-note-2026-01"]',
        ANNEXE_LEASE.propertyAddress,
      ).should("be.visible");

      // The topbar no longer carries a global company switch.
      cy.get('[data-cy="select-societe-active"]').should("not.exist");

      // Back on the note page the choice is explicit again: outside History's
      // navigation state, no company is restored by default.
      cy.visit("/generer/note-frais");
      cy.get('[data-cy="select-societe-note-frais"]', { timeout: 20_000 })
        .should("be.visible")
        .and("have.value", "");
    });
  });
});
