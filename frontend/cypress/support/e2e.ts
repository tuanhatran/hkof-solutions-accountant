/// <reference types="cypress" />

declare global {
  // Cypress extends its global namespace; ES module syntax cannot do this.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      resetState(): Chainable<void>;
      chooseMonth(month: string): Chainable<void>;
      waitForPreview(): Chainable<void>;
    }
  }
}

function setFieldValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

Cypress.Commands.add("resetState", () => {
  cy.request({ method: "POST", url: "/api/e2e/reset" })
    .its("status")
    .should("eq", 204);
});

Cypress.Commands.add("chooseMonth", (month: string) => {
  cy.get('[data-cy="select-mois"]')
    .filter(":visible")
    .first()
    .then(($input) => {
      const input = $input[0] as HTMLInputElement;
      input.focus();
      setFieldValue(input, month);
      input.blur();
    });
});

Cypress.Commands.add("waitForPreview", () => {
  cy.get('[data-cy="apercu-maj"]', { timeout: 20_000 }).should(
    "contain.text",
    "Mis à jour",
  );
});

beforeEach(() => {
  cy.clearAllSessionStorage();
  cy.clearAllLocalStorage();
  cy.resetState();
  cy.task("clearDownloads");
});

export {};
