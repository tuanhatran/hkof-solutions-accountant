import {
  MOIS,
  ajouterFrais,
  ajouterLoyer,
  attendreMontant,
  creerQuittance,
  desactiverLlm,
  teledechargerEtLirePdf,
} from '../support/helpers';

const LIGNES = [
  { type: 'gaz', fixture: 'facture-gaz.txt', montant: '120.00' },
  { type: 'electricite', fixture: 'facture-electricite.txt', montant: '88.20' },
  { type: 'assurance', fixture: 'facture-assurance.txt', montant: '210.00' },
  { type: 'telephone', fixture: 'facture-telephone.txt', montant: '29.99' },
  { type: 'fibre', fixture: 'facture-fibre.txt', montant: '39.99' },
];

describe('Note de frais — finalisation', () => {
  it('génère une note avec les six types, les annexes, l’historique puis une version 2', () => {
    desactiverLlm();
    creerQuittance();
    cy.visit('/generer/note-frais');
    cy.choisirMois(MOIS);
    cy.get('[data-cy="select-type-frais"]').should('not.be.disabled');

    ajouterLoyer();
    for (const ligne of LIGNES) {
      ajouterFrais(ligne);
    }

    cy.get('[data-cy="select-type-frais"] option[value="gaz"]')
      .should('be.disabled')
      .and('contain.text', 'déjà ajouté');
    cy.get('[data-cy="liste-frais"] tbody tr').should('have.length', 6);
    attendreMontant('[data-cy="total-retenu"]', '1 124,33');

    cy.get('[data-cy="btn-generer-note"]').should('not.be.disabled').click();
    cy.contains('Note de frais générée', { timeout: 35_000 }).should('be.visible');

    teledechargerEtLirePdf(
      '[data-cy="btn-telecharger-note"]',
      'note_frais_2026-01.pdf',
      (texte) => {
        expect(texte).to.contain("NOTE DE FRAIS D'OCCUPATION");
        expect(texte).to.contain('TOTAL RETENU');
        expect(texte).to.contain('1 124,33 €');
        expect(texte).not.to.contain('APERÇU');
        expect(texte).not.to.contain('QUITTANCE DE LOYER');
        expect(texte).not.to.contain('facture-gaz.txt');
      },
    );

    teledechargerEtLirePdf(
      '[data-cy="btn-telecharger-note-complete"]',
      'note_frais_2026-01_complet.pdf',
      (texte) => {
        expect(texte).to.contain("NOTE DE FRAIS D'OCCUPATION");
        expect(texte).to.contain('QUITTANCE DE LOYER');
        expect(texte).to.contain('facture-gaz.txt');
        expect(texte).to.contain('1 124,33 €');
        expect(texte).not.to.contain('APERÇU');
      },
    );

    cy.get('[data-cy="tab-historique"]').click();
    const groupe = '[data-cy="historique-mois-2026-01"]';
    cy.get(groupe, { timeout: 20_000 }).should('contain.text', 'Note v1');
    cy.get(groupe).should('contain.text', 'Note de frais — modèle intégré v1');

    cy.get('[data-cy="tab-note-frais"]').click();
    cy.contains('note version 1 déjà active', { timeout: 20_000 }).should('be.visible');
    cy.get('[data-cy="btn-generer-note"]').should('not.be.disabled').click();
    cy.get('[data-cy="dialogue-regeneration-note"]').should('be.visible');
    cy.get('[data-cy="dialogue-confirmer"]').click();
    cy.contains('version 2', { timeout: 35_000 }).should('be.visible');

    cy.get('[data-cy="tab-historique"]').click();
    cy.get(groupe, { timeout: 20_000 }).should('contain.text', 'Note v2');
    cy.get(groupe).contains('Toutes les versions (2)').click();
    cy.get(groupe).contains('v2 · active').should('be.visible');
    cy.get(groupe).contains('v1 · archivée').should('be.visible');
  });
});
