import { attendreMontant, attendreTexte, attendreValeur } from '../support/helpers';

describe('Configuration', () => {
  it('enregistre les paramètres et les conserve après rechargement', () => {
    cy.visit('/configuration');

    attendreValeur('[data-cy="input-raison-sociale"]', 'HKOF');
    attendreTexte('[data-cy="prorata-indicatif"]', '35,71 %');
    attendreMontant('[data-cy="total-quittance-config"]', '950,00');

    cy.get('[data-cy="input-raison-sociale"]').clear().type('HKOF E2E');
    cy.get('[data-cy="input-provision-charges"]').clear().type('100,00');
    attendreMontant('[data-cy="total-quittance-config"]', '1 000,00');

    cy.get('[data-cy="input-provision-charges"]').clear().type('50,00');
    cy.get('[data-cy="btn-enregistrer-configuration-bas"]').click();
    cy.contains('Toutes les valeurs sont à jour.', { timeout: 15_000 }).should('be.visible');

    cy.reload();
    attendreValeur('[data-cy="input-raison-sociale"]', 'HKOF E2E');
    attendreValeur('[data-cy="input-provision-charges"]', '50,00');
    attendreMontant('[data-cy="total-quittance-config"]', '950,00');
  });

  it('ajoute, modifie puis retire un type de frais', () => {
    cy.visit('/configuration');

    cy.get('[data-cy="btn-ajouter-poste"]').click();
    cy.get('[data-cy="formulaire-poste"]').should('be.visible');
    cy.get('#poste-code').type('internet-pro');
    cy.get('[data-cy="input-poste-libelle"]').type('Internet pro');
    cy.get('[data-cy="input-poste-fournisseur"]').type('Free');
    cy.get('[data-cy="input-poste-prorata"]').clear().type('50');
    cy.get('[data-cy="btn-enregistrer-poste"]').click();

    cy.get('[data-cy="formulaire-poste"]').should('not.exist');
    cy.contains('td', 'Internet pro', { timeout: 15_000 }).should('be.visible');
    cy.contains('td', '50 %').should('be.visible');

    cy.get('[data-cy="btn-modifier-poste-internet_pro"]').click();
    cy.get('[data-cy="input-poste-libelle"]').clear().type('Internet pro fibre');
    cy.get('[data-cy="input-poste-prorata"]').clear().type('60');
    cy.get('[data-cy="btn-enregistrer-poste"]').click();

    cy.contains('td', 'Internet pro fibre', { timeout: 15_000 }).should('be.visible');
    cy.contains('td', '60 %').should('be.visible');

    cy.get('[data-cy="btn-supprimer-poste-internet_pro"]').click();
    cy.get('[data-cy="dialogue-supprimer-poste"]').should('be.visible');
    cy.get('[data-cy="dialogue-confirmer"]').click();

    cy.contains('td', 'Internet pro fibre', { timeout: 15_000 }).should('not.exist');
  });
});
