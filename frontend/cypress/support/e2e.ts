/// <reference types="cypress" />

declare global {
  // Cypress extends its global namespace; ES module syntax cannot do this.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      resetState(): Chainable<void>;
      login(): Chainable<void>;
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

const E2E_EMAIL = "e2e@homeofficeexpenses.local";
const E2E_PASSWORD = "e2e-password";

/** Opens a reusable session for the seeded e2e account, after the reset restored it. */
Cypress.Commands.add("login", () => {
  cy.session(
    "e2e-user",
    () => {
      cy.request({
        method: "POST",
        url: "/api/auth/login",
        body: { email: E2E_EMAIL, password: E2E_PASSWORD },
      })
        .its("status")
        .should("eq", 200);
      cy.getCookie("JSESSIONID").should("exist");
    },
    { cacheAcrossSpecs: false },
  );
});

Cypress.Commands.add("chooseMonth", (month: string) => {
  cy.get('[data-cy="select-month"]')
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
  cy.get('[data-cy="preview-updated"]', { timeout: 20_000 }).should(
    "contain.text",
    "Mis à jour",
  );
});

const LANGUAGE_STORAGE_KEY = "homeofficeexpenses.lang";

Cypress.Commands.overwrite("visit", (originalVisit, url, options = {}) =>
  originalVisit(url, {
    ...options,
    onBeforeLoad(window) {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "fr");
      options.onBeforeLoad?.(window);
    },
  }),
);

const CSRF_COOKIE = "XSRF-TOKEN";
const CSRF_HEADER = "X-XSRF-TOKEN";
const SAFE_REQUEST_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Accepts the string, method/url/body and options forms of `cy.request`. */
function requestOptions(args: unknown[]): Partial<Cypress.RequestOptions> {
  const [first, second, third] = args;
  if (typeof first === "string" && second === undefined) {
    return { url: first };
  }
  if (typeof first === "string") {
    return {
      method: first as Cypress.HttpMethod,
      url: String(second),
      ...(third === undefined ? {} : { body: third as Cypress.RequestBody }),
    };
  }
  if (first && typeof first === "object") {
    return { ...(first as Partial<Cypress.RequestOptions>) };
  }
  throw new Error("Unsupported cy.request signature");
}

/** Mirrors the XSRF-TOKEN cookie into X-XSRF-TOKEN for every mutating API call. */
Cypress.Commands.overwrite("request", (originalFn, ...args: unknown[]) => {
  const options = requestOptions(args);
  const method = String(options.method ?? "GET").toUpperCase();
  if (SAFE_REQUEST_METHODS.has(method)) {
    return originalFn(options);
  }
  return cy.getCookie(CSRF_COOKIE).then((cookie) => {
    if (!cookie?.value) {
      return originalFn(options);
    }
    const headers = {
      ...(options.headers as Record<string, string> | undefined),
      [CSRF_HEADER]: decodeURIComponent(cookie.value),
    };
    return originalFn({ ...options, headers });
  });
});

const AUTH_SPEC = "06-auth.cy.ts";

beforeEach(() => {
  cy.clearAllSessionStorage();
  cy.clearAllLocalStorage();
  cy.resetState();
  cy.task("clearDownloads");
  if (Cypress.spec.name !== AUTH_SPEC) {
    cy.login();
  }
});

export {};
