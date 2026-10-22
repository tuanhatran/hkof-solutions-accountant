/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      reinitialiser(): Chainable<void>;
      choisirMois(mois: string): Chainable<void>;
      attendreApercu(): Chainable<void>;
    }
  }
}

function definirValeur(input: HTMLInputElement, valeur: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, valeur);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

Cypress.Commands.add('reinitialiser', () => {
  cy.request({ method: 'POST', url: '/api/e2e/reset' }).its('status').should('eq', 204);
});

Cypress.Commands.add('choisirMois', (mois: string) => {
  cy.get('[data-cy="select-mois"]')
    .filter(':visible')
    .first()
    .then(($input) => {
      const input = $input[0] as HTMLInputElement;
      input.focus();
      definirValeur(input, mois);
      input.blur();
    });
});

Cypress.Commands.add('attendreApercu', () => {
  cy.get('[data-cy="apercu-maj"]', { timeout: 20_000 }).should('contain.text', 'Mis à jour');
});

beforeEach(() => {
  cy.clearAllSessionStorage();
  cy.clearAllLocalStorage();
  cy.reinitialiser();
  cy.task('nettoyerTelechargements');
});

export {};
