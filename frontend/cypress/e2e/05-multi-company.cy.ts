import {
  MONTHS,
  disableLlm,
  downloadAndReadPdf,
  uploadReceipt,
  waitForAmount,
  waitForSelectedFile,
  waitForText,
} from "../support/helpers";

interface CompanySummary {
  id: number;
  name: string;
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
const ANNEXE_EMPLOYEE = {
  firstName: "Alice",
  lastName: "Martin",
  email: "alice.martin@example.fr",
};
const ANNEXE_LANDLORD = "Bailleur annexe";
const SEEDED_PRO_RATA = "35,71 %";

/** The shell switcher is rendered twice (desktop sidebar and mobile header). */
function companySwitcher() {
  return cy.get('[data-cy="select-societe-active"]').filter(":visible");
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
    cy.get('[data-cy="input-bail-societe-type"]').check();
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

/** Creates the second company and its lease through the UI; it becomes active. */
function createAnnexeCompany(): void {
  cy.visit("/configuration");
  waitForText('[data-cy="info-societe"]', SEEDED_COMPANY);

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
    companySwitcher().should("have.value", String(annexe.id));
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
      cy.get('[data-cy="btn-modifier-bail-societe"]').click();
      cy.get(`[data-cy="select-bail-societe"] option[value="${leaseId}"]`, {
        timeout: 20_000,
      }).should("exist");
      cy.get('[data-cy="select-bail-societe"]').select(String(leaseId));
      waitForText('[data-cy="prorata-indicatif"]', ANNEXE_COMPANY.proRata);
      cy.get('[data-cy="btn-enregistrer-bail-societe"]').click();
      cy.contains("Société enregistrée.", { timeout: 20_000 }).should(
        "be.visible",
      );
      cy.get('[data-cy="dialogue-formulaire-bail-societe"]').should(
        "not.exist",
      );
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
  cy.contains("Aucun poste configuré.", { timeout: 20_000 }).should(
    "be.visible",
  );

  cy.get('[data-cy="btn-ajouter-poste"]').click();
  cy.get('[data-cy="formulaire-poste"]').should("be.visible");
  cy.get("#poste-code").type("gaz");
  cy.get('[data-cy="input-poste-libelle"]').type("Gaz annexe");
  cy.get('[data-cy="input-poste-fournisseur"]').type("EDF");
  cy.get('[data-cy="input-poste-prorata"]').clear().type("25");
  cy.get('[data-cy="btn-enregistrer-poste"]').click();
  cy.contains("td", "Gaz annexe", { timeout: 20_000 }).should("be.visible");
}

function assertSettingsIsolation(
  seededCompanyId: number,
  annexeCompanyId: number,
): void {
  cy.get('[data-cy="select-societe"]').select(String(seededCompanyId));
  waitForText('[data-cy="info-societe"]', SEEDED_COMPANY);
  cy.get('[data-cy="onglet-entreprise-bail-frais"]').click();
  waitForText('[data-cy="prorata-bail-societe"]', SEEDED_PRO_RATA);
  cy.contains("td", "Téléphone", { timeout: 20_000 }).should("be.visible");
  cy.contains("td", "Gaz annexe").should("not.exist");

  cy.get('[data-cy="select-societe"]').select(String(annexeCompanyId));
  waitForText('[data-cy="info-societe"]', ANNEXE_COMPANY.name);
  cy.get('[data-cy="onglet-entreprise-bail-frais"]').click();
  waitForText('[data-cy="prorata-bail-societe"]', ANNEXE_COMPANY.proRata);
  cy.contains("td", "Gaz annexe", { timeout: 20_000 }).should("be.visible");
  cy.contains("td", "Téléphone").should("not.exist");
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

  it("generates and exports a statement scoped to the active company", () => {
    disableLlm();
    createAnnexeCompany();

    companyIds().then(({ seeded, annexe }) => {
      createAnnexeEmployee(annexe.id);
      createAnnexeExpenseItem(annexe.id);

      cy.get('[data-cy="tab-note-frais"]').click();
      cy.chooseMonth(MONTHS);
      cy.get('[data-cy="select-type-frais"]').should("not.be.disabled");
      cy.get('[data-cy="select-type-frais"] option').then(($options) => {
        const values = [...$options].map(
          (option) => (option as HTMLOptionElement).value,
        );
        expect(values).to.include("gaz");
        expect(values).not.to.include("telephone");
      });

      cy.get('[data-cy="select-signature"] option:selected').should(
        "contain.text",
        "Signature E2E Alice",
      );

      cy.get('[data-cy="select-type-frais"]').select("gaz");
      uploadReceipt("facture-gaz.txt");
      waitForSelectedFile("facture-gaz.txt");
      cy.get('[data-cy="input-montant-ttc"]').clear().type("100.00");
      cy.get('[data-cy="input-prorata"]').should("have.value", "25.00");
      cy.get('[data-cy="btn-ajouter-frais"]').should("not.be.disabled").click();
      waitForAmount('[data-cy="total-retenu"]', "25,00");

      cy.get('[data-cy="btn-generer-note"]').should("not.be.disabled").click();
      cy.contains("Note de frais générée", { timeout: 35_000 }).should(
        "be.visible",
      );

      downloadAndReadPdf(
        '[data-cy="btn-telecharger-note"]',
        "note_frais_2026-01.pdf",
        (text) => {
          expect(text).to.contain("NOTE DE FRAIS D'OCCUPATION");
          expect(text).to.contain(ANNEXE_COMPANY.name);
          expect(text).to.contain(ANNEXE_COMPANY.address);
          expect(text).to.contain(ANNEXE_COMPANY.siren);
          expect(text).to.contain("Lyon");
          expect(text).to.contain(ANNEXE_COMPANY.managerName);
          expect(text).to.contain("25,00 €");
        },
      );

      cy.request(`/api/expense-statements?companyId=${annexe.id}`)
        .its("body")
        .should("have.length", 1);
      cy.request(`/api/expense-statements?companyId=${seeded.id}`)
        .its("body")
        .should("have.length", 0);

      cy.get('[data-cy="tab-historique"]').click();
      cy.get('[data-cy="historique-mois-2026-01"]', {
        timeout: 20_000,
      }).should("contain.text", "Note v1");

      companySwitcher().select(String(seeded.id));
      cy.contains("Aucun document pour le moment", {
        timeout: 20_000,
      }).should("be.visible");
      cy.get('[data-cy="historique-mois-2026-01"]').should("not.exist");

      companySwitcher().select(String(annexe.id));
      cy.get('[data-cy="historique-mois-2026-01"]', {
        timeout: 20_000,
      }).should("contain.text", "Note v1");
    });
  });
});
