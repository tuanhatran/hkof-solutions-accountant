import {
  MONTHS,
  addExpense,
  addRent,
  waitForAmount,
  createRentReceipt,
  disableLlm,
  downloadAndReadPdf,
  downloadAndReadZip,
} from "../support/helpers";

const LINES = [
  { itemCode: "gaz", fixture: "facture-gaz.txt", amountInclVat: "120.00" },
  {
    itemCode: "electricite",
    fixture: "facture-electricite.txt",
    amountInclVat: "88.20",
  },
  {
    itemCode: "assurance",
    fixture: "facture-assurance.txt",
    amountInclVat: "210.00",
  },
  {
    itemCode: "telephone",
    fixture: "facture-telephone.txt",
    amountInclVat: "29.99",
  },
  { itemCode: "fibre", fixture: "facture-fibre.txt", amountInclVat: "39.99" },
];

describe("Expense statement — finalization", () => {
  it("generates a statement with the six types, attachments and history, then version 2", () => {
    disableLlm();
    createRentReceipt();
    cy.visit("/generer/note-frais");
    cy.chooseMonth(MONTHS);
    cy.get('[data-cy="select-expense-type"]').should("not.be.disabled");

    addRent();
    for (const line of LINES) {
      addExpense(line);
    }

    cy.get('[data-cy="select-expense-type"] option[value="gaz"]')
      .should("be.disabled")
      .and("contain.text", "déjà ajouté");
    cy.get('[data-cy="expense-list"] tbody tr').should("have.length", 6);
    waitForAmount('[data-cy="retained-total"]', "1 124,33");

    cy.get('[data-cy="btn-generate-statement"]')
      .should("not.be.disabled")
      .click();
    cy.contains("Note de frais générée", { timeout: 35_000 }).should(
      "be.visible",
    );

    downloadAndReadPdf(
      '[data-cy="btn-download-statement"]',
      "note_frais_2026-01.pdf",
      (text) => {
        expect(text).to.contain("NOTE DE FRAIS D'OCCUPATION");
        expect(text).to.contain("TOTAL RETENU");
        expect(text).to.contain("1 124,33 €");
        expect(text).not.to.contain("APERÇU");
        expect(text).not.to.contain("QUITTANCE DE LOYER");
        expect(text).not.to.contain("facture-gaz.txt");
      },
    );

    downloadAndReadZip(
      '[data-cy="btn-download-full-statement"]',
      "note_frais_2026-01_complet.zip",
      (entries) => {
        const names = Object.keys(entries);
        expect(names).to.include("note_frais_2026-01.pdf");
        expect(names).to.include("quittance_2026-01.pdf");
        expect(names).to.include("justificatifs/01_facture-gaz.txt");
        expect(
          names.filter((name) => name.startsWith("justificatifs/")),
        ).to.have.length(5);

        const note = entries["note_frais_2026-01.pdf"];
        expect(note).to.contain("NOTE DE FRAIS D'OCCUPATION");
        expect(note).to.contain("1 124,33 €");
        expect(note).not.to.contain("APERÇU");
        expect(note).not.to.contain("QUITTANCE DE LOYER");
        expect(entries["quittance_2026-01.pdf"]).to.contain(
          "QUITTANCE DE LOYER",
        );
        expect(entries["justificatifs/01_facture-gaz.txt"]).to.contain(
          "Facture de gaz naturel",
        );
      },
    );

    cy.get('[data-cy="tab-history"]').click();

    cy.visit("/generer/note-frais");
    cy.contains("note version 1 déjà active", { timeout: 20_000 }).should(
      "be.visible",
    );
    cy.get('[data-cy="btn-generate-statement"]')
      .should("not.be.disabled")
      .click();
    cy.get('[data-cy="dialog-statement-regeneration"]').should("be.visible");
    cy.get('[data-cy="dialog-confirm"]').click();
    cy.contains("version 2", { timeout: 35_000 }).should("be.visible");

    cy.get('[data-cy="tab-history"]').click();
  });
});
