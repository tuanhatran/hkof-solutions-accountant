import {
  MOIS,
  attendreValeur,
  teledechargerEtLirePdf,
} from '../support/helpers';

describe('Quittance', () => {
  it('génère une quittance à partir du mois, télécharge le PDF puis crée une nouvelle version', () => {
    cy.visit('/generer/quittance');
    attendreValeur('#quittance-loyer', '900.00');

    cy.choisirMois(MOIS);
    attendreValeur('#quittance-debut', '2026-01-01');
    attendreValeur('#quittance-fin', '2026-01-31');

    cy.get('[data-cy="btn-generer-quittance"]').should('not.be.disabled').click();
    cy.contains('Quittance générée', { timeout: 25_000 }).should('be.visible');

    teledechargerEtLirePdf(
      '[data-cy="btn-telecharger-quittance"]',
      'quittance_2026-01.pdf',
      (texte) => {
        expect(texte).to.contain('QUITTANCE DE LOYER');
        expect(texte).to.contain('Janvier 2026');
        expect(texte).to.contain('01/01/2026');
        expect(texte).to.contain('31/01/2026');
        expect(texte).to.contain('950,00 €');
      },
    );

    cy.contains('version 1', { timeout: 20_000 }).should('be.visible');
    cy.get('[data-cy="btn-generer-quittance"]').should('not.be.disabled').click();

    cy.get('[data-cy="dialogue-regeneration-quittance"]').should('be.visible');
    cy.get('[data-cy="dialogue-confirmer"]').click();
    cy.contains('version 2', { timeout: 25_000 }).should('be.visible');

    cy.get('[data-cy="tab-historique"]').click();
    const groupe = '[data-cy="historique-mois-2026-01"]';
    cy.get(groupe, { timeout: 20_000 }).should('contain.text', 'Quittance v2');
    cy.get(groupe).contains('Toutes les versions (2)').click();
    cy.get(groupe).contains('v2 · active').should('be.visible');
    cy.get(groupe).contains('v1 · archivée').should('be.visible');
  });
});
