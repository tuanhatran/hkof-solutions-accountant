import {
  MONTHS,
  addExpense,
  addRent,
  waitForSelectedFile,
  waitForAmount,
  waitForValue,
  createRentReceipt,
  uploadReceipt,
  disableLlm,
  normalize,
  downloadAndReadPdf,
} from "../support/helpers";

function verifyPreview(total: string): void {
  cy.get('[data-cy="retained-total"]')
    .invoke("text")
    .then((text) => {
      const displayedTotal = normalize(text);
      downloadAndReadPdf(
        '[data-cy="btn-download-preview"]',
        "note_frais_apercu.pdf",
        (pdf) => {
          expect(pdf).to.contain("APERÇU");
          expect(pdf).to.contain(displayedTotal);
          expect(pdf).to.contain(`${total} €`);
        },
      );
    });
}

describe("Expense statement — entry and preview", () => {
  it("keeps expenses added via the receipt after switching back", () => {
    disableLlm();
    createRentReceipt();
    cy.visit("/generer/note-frais");
    cy.chooseMonth(MONTHS);

    cy.get('[data-cy="select-expense-type"]').should("not.be.disabled");
    addRent();
    addExpense({
      itemCode: "gaz",
      fixture: "facture-gaz.txt",
      amountInclVat: "120.00",
    });
    waitForAmount('[data-cy="retained-total"]', "992,85");

    cy.visit("/generer/quittance");
    cy.visit("/generer/note-frais");

    cy.get('[data-cy="expense-line-loyer"]').should("exist");
    cy.get('[data-cy="expense-line-gaz"]').should("exist");
    waitForAmount('[data-cy="retained-total"]', "992,85");
  });

  it("blocks rent without a receipt then locks it to the active receipt", () => {
    disableLlm();
    cy.visit("/generer/note-frais");
    cy.chooseMonth(MONTHS);

    cy.get('[data-cy="select-expense-type"]')
      .should("not.be.disabled")
      .select("loyer");
    cy.get('[data-cy="alert-missing-rent-receipt"]').should("be.visible");
    cy.get('[data-cy="input-amount-incl-vat"]').should("have.value", "");
    cy.get('[data-cy="dropzone-file"]').should("not.exist");
    cy.get('[data-cy="btn-add-expense"]').should("be.disabled");

    createRentReceipt();
    cy.reload();

    cy.get('[data-cy="select-expense-type"]')
      .should("not.be.disabled")
      .select("loyer");
    waitForValue('[data-cy="input-amount-incl-vat"]', "950.00");
    cy.get('[data-cy="input-amount-incl-vat"]').should(
      "have.prop",
      "readOnly",
      true,
    );
    cy.get('[data-cy="dropzone-file"]').should("not.exist");
    cy.get('[data-cy="btn-add-expense"]').should("not.be.disabled").click();

    cy.get('[data-cy="expense-line-loyer"]').should("exist");
    waitForAmount('[data-cy="retained-total"]', "950,00");
  });

  it("accepts pro-rata 35,71 % and 35.71, rejects 120 and abc", () => {
    disableLlm();
    createRentReceipt();
    cy.visit("/generer/note-frais");
    cy.chooseMonth(MONTHS);
    cy.get('[data-cy="select-expense-type"]').should("not.be.disabled");

    addExpense({
      itemCode: "gaz",
      fixture: "facture-gaz.txt",
      amountInclVat: "130.00",
      proRataPct: "35,71 %",
    });
    waitForAmount('[data-cy="expense-line-gaz"]', "46,42");

    addExpense({
      itemCode: "electricite",
      fixture: "facture-electricite.txt",
      amountInclVat: "88.20",
      proRataPct: "35.71",
    });
    waitForAmount('[data-cy="expense-line-electricite"]', "31,50");

    cy.get('[data-cy="select-expense-type"]').select("fibre");
    uploadReceipt("facture-fibre.txt");
    waitForSelectedFile("facture-fibre.txt");
    cy.get('[data-cy="input-amount-incl-vat"]').clear().type("39.99");

    cy.get('[data-cy="input-prorata"]').clear().type("120");
    cy.contains("Prorata attendu entre 0 et 100 (2 décimales max).").should(
      "be.visible",
    );
    cy.get('[data-cy="btn-add-expense"]').should("be.disabled");

    cy.get('[data-cy="input-prorata"]').clear().type("abc");
    cy.contains("Prorata attendu entre 0 et 100 (2 décimales max).").should(
      "be.visible",
    );
    cy.get('[data-cy="btn-add-expense"]').should("be.disabled");
  });

  it("rejects a .exe file without creating an expense", () => {
    disableLlm();
    cy.visit("/generer/note-frais");
    cy.chooseMonth(MONTHS);
    cy.get('[data-cy="select-expense-type"]')
      .should("not.be.disabled")
      .select("gaz");

    cy.get('[data-cy="dropzone-file"]').selectFile(
      "cypress/fixtures/fichier-interdit.exe",
      {
        force: true,
      },
    );
    cy.contains("Format non accepté.", { timeout: 10_000 }).should(
      "be.visible",
    );
    cy.get('[data-cy="dropzone-file"]').should("exist");

    cy.get('[data-cy="input-amount-incl-vat"]').clear().type("120.00");
    cy.get('[data-cy="btn-add-expense"]').should("be.disabled");
    cy.get('[data-cy="expense-line-gaz"]').should("not.exist");
  });

  it("rejects a fake .docx whose content does not match", () => {
    disableLlm();
    cy.visit("/generer/note-frais");
    cy.chooseMonth(MONTHS);
    cy.get('[data-cy="select-expense-type"]')
      .should("not.be.disabled")
      .select("gaz");

    cy.get('[data-cy="dropzone-file"]').selectFile(
      "cypress/fixtures/facture-piegee.docx",
      {
        force: true,
      },
    );
    cy.contains("Le contenu du fichier ne correspond pas à son extension", {
      timeout: 20_000,
    }).should("be.visible");
    cy.get('[data-cy="dropzone-file"]').should("exist");

    cy.get('[data-cy="input-amount-incl-vat"]').clear().type("120.00");
    cy.get('[data-cy="btn-add-expense"]').should("be.disabled");
    cy.get('[data-cy="expense-line-gaz"]').should("not.exist");
  });

  it("rejects a file over 10 MB", () => {
    disableLlm();
    cy.visit("/generer/note-frais");
    cy.chooseMonth(MONTHS);
    cy.get('[data-cy="select-expense-type"]')
      .should("not.be.disabled")
      .select("gaz");

    cy.task<string>(
      "createLargeFile",
      "cypress/fixtures/fichier-geant.pdf",
    ).then((filePath) => {
      cy.get('[data-cy="dropzone-file"]').selectFile(filePath, {
        force: true,
      });
    });
    cy.contains("Fichier trop volumineux (10 Mo maximum).", {
      timeout: 15_000,
    }).should("be.visible");

    cy.get('[data-cy="input-amount-incl-vat"]').clear().type("120.00");
    cy.get('[data-cy="btn-add-expense"]').should("be.disabled");
    cy.get('[data-cy="expense-line-gaz"]').should("not.exist");
  });

  it("pre-fills fields with AI and allows correcting the amount", () => {
    createRentReceipt();
    cy.visit("/generer/note-frais");
    cy.chooseMonth(MONTHS);
    cy.get('[data-cy="select-expense-type"]').should("not.be.disabled");
    addRent();

    uploadReceipt("facture-gaz.txt");
    cy.get('[data-cy="analysis-status"]', { timeout: 35_000 }).should(
      "contain.text",
      "Analyse terminée",
    );
    waitForSelectedFile("facture-gaz.txt");

    waitForValue('[data-cy="select-expense-type"]', "gaz");
    waitForValue('[data-cy="input-amount-incl-vat"]', "120.00");
    waitForValue('[data-cy="input-prorata"]', "35.71");
    cy.get('[data-cy="input-period-start"]').should("not.exist");
    cy.get('[data-cy="input-period-end"]').should("not.exist");
    cy.contains("Fournisseur détecté : EDF").should("be.visible");
    cy.get('[data-cy="badge-ai-detected"]').should(($badges) => {
      expect($badges.length).to.be.at.least(2);
    });

    cy.get('[data-cy="btn-add-expense"]').should("be.disabled");
    cy.get('[data-cy="btn-confirm-amount"]')
      .should("be.visible")
      .should("have.attr", "aria-pressed", "false");
    cy.contains(
      "Montant détecté par IA — confirmez-le pour ajouter le frais.",
    ).should("be.visible");
    cy.get('[data-cy="btn-confirm-amount"]').click();
    cy.contains("Montant confirmé.").should("be.visible");
    cy.get('[data-cy="btn-add-expense"]').should("not.be.disabled");

    cy.get('[data-cy="input-amount-incl-vat"]').clear().type("125.50");
    cy.get('[data-cy="btn-add-expense"]').should("not.be.disabled").click();

    waitForAmount('[data-cy="expense-line-gaz"]', "44,82");
    waitForAmount('[data-cy="retained-total"]', "994,82");
  });

  it("pre-fills the amount when the model answers the euro sign", () => {
    createRentReceipt();
    cy.visit("/generer/note-frais");
    cy.chooseMonth(MONTHS);
    cy.get('[data-cy="select-expense-type"]').should("not.be.disabled");
    addRent();

    uploadReceipt("facture-fibre-74-6.txt");
    cy.get('[data-cy="analysis-status"]', { timeout: 35_000 }).should(
      "contain.text",
      "Analyse terminée",
    );
    waitForSelectedFile("facture-fibre-74-6.txt");

    waitForValue('[data-cy="input-amount-incl-vat"]', "74.60");
    cy.get('[data-cy="btn-confirm-amount"]').should("be.visible");
  });

  it("overwrites a typed amount with the AI proposal and requires confirmation", () => {
    createRentReceipt();
    cy.visit("/generer/note-frais");
    cy.chooseMonth(MONTHS);
    cy.get('[data-cy="select-expense-type"]').should("not.be.disabled");
    addRent();

    cy.get('[data-cy="select-expense-type"]').select("gaz");
    cy.get('[data-cy="input-amount-incl-vat"]').clear().type("999.99");

    uploadReceipt("facture-gaz.txt");
    cy.get('[data-cy="analysis-status"]', { timeout: 35_000 }).should(
      "contain.text",
      "Analyse terminée",
    );
    waitForSelectedFile("facture-gaz.txt");

    waitForValue('[data-cy="input-amount-incl-vat"]', "120.00");
    cy.get('[data-cy="btn-add-expense"]').should("be.disabled");
    cy.get('[data-cy="btn-confirm-amount"]').click();
    cy.get('[data-cy="btn-add-expense"]').should("not.be.disabled").click();

    waitForAmount('[data-cy="expense-line-gaz"]', "120,00");

    // Reopening a saved AI line never asks for the confirmation again.
    cy.get('[data-cy="btn-edit-gaz"]').click();
    cy.contains("Montant confirmé.").should("be.visible");
    cy.get('[data-cy="btn-add-expense"]').should("not.be.disabled");
  });

  it("stays usable when analysis fails", () => {
    createRentReceipt();
    cy.visit("/generer/note-frais");
    cy.chooseMonth(MONTHS);
    cy.get('[data-cy="select-expense-type"]').should("not.be.disabled");
    addRent();

    uploadReceipt("facture-illisible.txt");
    cy.get('[data-cy="analysis-status"]', { timeout: 40_000 }).should(
      "contain.text",
      "saisie manuelle",
    );
    waitForSelectedFile("facture-illisible.txt");

    cy.get('[data-cy="select-expense-type"]').select("electricite");
    cy.get('[data-cy="input-amount-incl-vat"]').clear().type("88.20");
    cy.get('[data-cy="btn-add-expense"]').should("not.be.disabled").click();

    waitForAmount('[data-cy="expense-line-electricite"]', "31,50");
    waitForAmount('[data-cy="retained-total"]', "981,50");
  });

  it("cancels a running analysis and allows manual entry", () => {
    createRentReceipt();
    cy.visit("/generer/note-frais");
    cy.chooseMonth(MONTHS);
    cy.get('[data-cy="select-expense-type"]').should("not.be.disabled");

    uploadReceipt("facture-lente.txt");
    cy.get('[data-cy="analysis-status"]', { timeout: 20_000 }).should(
      "contain.text",
      "Analyse IA en cours",
    );
    cy.get('[data-cy="btn-cancel-analysis"]').click();

    cy.get('[data-cy="analysis-status"]', { timeout: 20_000 }).should(
      "contain.text",
      "Analyse annulée.",
    );
    waitForSelectedFile("facture-lente.txt");

    cy.get('[data-cy="select-expense-type"]').select("telephone");
    cy.get('[data-cy="input-amount-incl-vat"]').clear().type("29.99");
    cy.get('[data-cy="btn-add-expense"]').should("not.be.disabled").click();

    waitForAmount('[data-cy="expense-line-telephone"]', "10,71");
  });

  it("updates the preview on each add and removal", () => {
    disableLlm();
    createRentReceipt();
    cy.intercept("POST", "/api/expense-statements/preview").as("preview");

    cy.visit("/generer/note-frais");
    cy.chooseMonth(MONTHS);
    cy.get('[data-cy="select-expense-type"]').should("not.be.disabled");

    addRent();
    cy.wait("@preview", { timeout: 30_000 });
    cy.waitForPreview();
    waitForAmount('[data-cy="retained-total"]', "950,00");
    verifyPreview("950,00");

    addExpense({
      itemCode: "gaz",
      fixture: "facture-gaz.txt",
      amountInclVat: "120.00",
    });
    cy.wait("@preview", { timeout: 30_000 });
    cy.waitForPreview();
    waitForAmount('[data-cy="retained-total"]', "992,85");
    verifyPreview("992,85");

    // Prorata stays read-only in the row: it is displayed, not editable inline.
    cy.get('[data-cy="expense-line-gaz"]').should("contain.text", "35,71 %");

    cy.get('[data-cy="btn-delete-gaz"]').click();
    cy.get('[data-cy="dialogue-suppression-frais"]').should("be.visible");
    cy.get('[data-cy="dialogue-confirmer"]').click();
    cy.get('[data-cy="expense-line-gaz"]').should("not.exist");
    cy.wait("@preview", { timeout: 30_000 });
    cy.waitForPreview();
    waitForAmount('[data-cy="retained-total"]', "950,00");
    verifyPreview("950,00");
  });

  afterEach(() => {
    cy.task("deleteFile", "cypress/fixtures/fichier-geant.pdf");
  });
});
