import {
  MONTHS,
  addExpense,
  addRent,
  waitForAmount,
  createRentReceipt,
  disableLlm,
  downloadAndReadPdf,
} from '../support/helpers';

const LINES = [
  { itemCode: 'gaz', fixture: 'facture-gaz.txt', amountInclVat: '120.00' },
  { itemCode: 'electricite', fixture: 'facture-electricite.txt', amountInclVat: '88.20' },
  { itemCode: 'assurance', fixture: 'facture-assurance.txt', amountInclVat: '210.00' },
  { itemCode: 'telephone', fixture: 'facture-telephone.txt', amountInclVat: '29.99' },
  { itemCode: 'fibre', fixture: 'facture-fibre.txt', amountInclVat: '39.99' },
];

describe('Expense statement — finalization', () => {
  it('generates a statement with the six types, attachments and history, then version 2', () => {
    disableLlm();
    createRentReceipt();
    cy.visit('/generer/note-frais');
    cy.chooseMonth(MONTHS);
    cy.get('[data-cy="select-type-frais"]').should('not.be.disabled');

    addRent();
    for (const line of LINES) {
      addExpense(line);
    }

    cy.get('[data-cy="select-type-frais"] option[value="gaz"]')
      .should('be.disabled')
      .and('contain.text', 'déjà ajouté');
    cy.get('[data-cy="liste-frais"] tbody tr').should('have.length', 6);
    waitForAmount('[data-cy="total-retenu"]', '1 124,33');

    cy.get('[data-cy="btn-generer-note"]').should('not.be.disabled').click();
    cy.contains('Note de frais générée', { timeout: 35_000 }).should('be.visible');

    downloadAndReadPdf(
      '[data-cy="btn-telecharger-note"]',
      'note_frais_2026-01.pdf',
      (text) => {
        expect(text).to.contain("NOTE DE FRAIS D'OCCUPATION");
        expect(text).to.contain('TOTAL RETENU');
        expect(text).to.contain('1 124,33 €');
        expect(text).not.to.contain('APERÇU');
        expect(text).not.to.contain('QUITTANCE DE LOYER');
        expect(text).not.to.contain('facture-gaz.txt');
      },
    );

    downloadAndReadPdf(
      '[data-cy="btn-telecharger-note-complete"]',
      'note_frais_2026-01_complet.pdf',
      (text) => {
        expect(text).to.contain("NOTE DE FRAIS D'OCCUPATION");
        expect(text).to.contain('QUITTANCE DE LOYER');
        expect(text).to.contain('facture-gaz.txt');
        expect(text).to.contain('1 124,33 €');
        expect(text).not.to.contain('APERÇU');
      },
    );

    cy.get('[data-cy="tab-historique"]').click();
    const group = '[data-cy="historique-mois-2026-01"]';
    cy.get(group, { timeout: 20_000 }).should('contain.text', 'Note v1');
    cy.get(group).should('contain.text', 'Note de frais — modèle intégré v1');

    cy.get('[data-cy="tab-note-frais"]').click();
    cy.contains('note version 1 déjà active', { timeout: 20_000 }).should('be.visible');
    cy.get('[data-cy="btn-generer-note"]').should('not.be.disabled').click();
    cy.get('[data-cy="dialogue-regeneration-note"]').should('be.visible');
    cy.get('[data-cy="dialogue-confirmer"]').click();
    cy.contains('version 2', { timeout: 35_000 }).should('be.visible');

    cy.get('[data-cy="tab-historique"]').click();
    cy.get(group, { timeout: 20_000 }).should('contain.text', 'Note v2');
    cy.get(group).contains('Toutes les versions (2)').click();
    cy.get(group).contains('v2 · active').should('be.visible');
    cy.get(group).contains('v1 · archivée').should('be.visible');
  });
});
