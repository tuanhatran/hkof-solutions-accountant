export const MONTHS = "2026-01";
export const FEBRUARY = "2026-02";
export const MONTH_LABELS = "Janvier 2026";

// Seed values returned by DataInitializer.initSettings()/initRentConfiguration():
// lease rent 1300.00, charges 0.00, areas 70/25 (35,71 %). The E2E reset replays
// that initializer, so specs must match it.
export const SEED_RENT = "1300.00";
export const SEED_RENT_INPUT = "1300,00";
export const SEED_CHARGES = "0.00";
export const SEED_TOTAL = "1 300,00 €";
export const SEED_PRORATA = "35,71 %";

export function normalize(text: string | null | undefined): string {
  return (text ?? "").replace(/[\s\u00a0\u202f]+/g, " ").trim();
}

interface WaitOptions {
  timeout?: number;
}

export function waitForText(
  selector: string,
  expected: string | RegExp,
  options: WaitOptions = {},
): void {
  cy.get(selector, { timeout: options.timeout ?? 20_000 }).should(
    ($element) => {
      const text = normalize($element.text());
      if (expected instanceof RegExp) {
        expect(text, selector).to.match(expected);
      } else {
        expect(text, selector).to.contain(expected);
      }
    },
  );
}

export function waitForAmount(selector: string, amount: string): void {
  waitForText(selector, `${amount} €`);
}

export function waitForValue(selector: string, value: string): void {
  cy.get(selector).should("have.value", value);
}

export function typeValue(selector: string, value: string): void {
  cy.get(selector).then(($element) => {
    const input = $element[0] as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function endOfMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
}

export interface LeaseSummary {
  id?: number;
  addressId?: number;
  companyId?: number | null;
  landlordId?: number;
  tenantId?: number | null;
  tenantCompanyId?: number | null;
  companyLease?: boolean;
  propertyAddress?: string;
}

export interface PersonSummary {
  id: number;
  name?: string;
  address?: string | null;
  issuePlace?: string | null;
  signatureCount?: number;
}

/** Selects the address of a lease in the « Baux et adresses » dropdown. */
export function selectAddressForLease(lease: LeaseSummary): void {
  if (lease.addressId === undefined) {
    throw new Error("seeded lease has no addressId");
  }
  cy.get('[data-cy="select-adresse-quittances"]').select(
    String(lease.addressId),
  );
}

/** Reads the seeded active lease; the E2E reset recreates the lease directory. */
export function seededLease(): Cypress.Chainable<LeaseSummary> {
  return cy.request<LeaseSummary[]>("/api/leases").then(({ body }) => {
    expect(body, "seeded leases").to.have.length.greaterThan(0);
    return body[0];
  });
}

/**
 * Reads the seeded normal lease (two natural persons). The E2E reset seeds a
 * company lease next to it, so receipt specs must select the normal pair.
 */
export function normalLease(): Cypress.Chainable<LeaseSummary> {
  return cy.request<LeaseSummary[]>("/api/leases").then(({ body }) => {
    const lease = body.find(
      (candidate) =>
        candidate.companyLease !== true &&
        candidate.tenantId !== undefined &&
        candidate.tenantId !== null,
    );
    if (!lease) {
      throw new Error("seeded normal lease missing");
    }
    return lease;
  });
}

/** Reads a natural person by name through the `/api/persons` directory. */
export function personByName(name: string): Cypress.Chainable<PersonSummary> {
  return cy.request<PersonSummary[]>("/api/persons").then(({ body }) => {
    const person = body.find((candidate) => candidate.name === name);
    if (!person) {
      throw new Error(`natural person not found: ${name}`);
    }
    return person;
  });
}

/**
 * Creates the 950.00 receipt of the lease the company expense page uses: the
 * company lease resolved from `CompanyDto.leaseId`, never another lease.
 */
export function createRentReceipt(month: string = MONTHS): void {
  cy.request<Array<{ id: number; leaseId?: number | null }>>(
    "/api/companies",
  ).then(({ body: companies }) => {
    const company = companies[0];
    if (company?.id === undefined) {
      throw new Error("seeded company missing");
    }
    if (company.leaseId === undefined || company.leaseId === null) {
      throw new Error("seeded company has no lease");
    }
    cy.request<LeaseSummary[]>("/api/leases").then(({ body: leases }) => {
      const lease = leases.find(
        (candidate) => candidate.id === company.leaseId,
      );
      if (!lease || lease.landlordId === undefined) {
        throw new Error("seeded company lease missing");
      }
      const companyLease = lease.companyLease === true;
      cy.request({
        method: "POST",
        url: "/api/rent-receipts",
        body: {
          month,
          companyId: company.id,
          landlordId: lease.landlordId,
          tenantId: companyLease ? null : (lease.tenantId ?? null),
          tenantCompanyId: companyLease ? (lease.companyId ?? null) : null,
          periodStart: `${month}-01`,
          periodEnd: endOfMonth(month),
          rentExclCharges: "900.00",
          charges: "50.00",
        },
      })
        .its("status")
        .should("eq", 201);
    });
  });
}

export interface LlmConfig {
  active: boolean;
  supplier: string;
  url: string;
  model: string;
  timeoutSeconds: number;
  temperature: string;
  numCtx: number;
  maxPages: number;
  ocrActive: boolean;
  extractionPrompt: string;
}

export function configureLlm(changes: Partial<LlmConfig>): void {
  cy.request<LlmConfig>("/api/admin/llm").then(({ body }) => {
    const requestBody: LlmConfig = {
      active: body.active,
      supplier: body.supplier,
      url: body.url,
      model: body.model,
      timeoutSeconds: body.timeoutSeconds,
      temperature: body.temperature,
      numCtx: body.numCtx,
      maxPages: body.maxPages,
      ocrActive: body.ocrActive,
      extractionPrompt: body.extractionPrompt,
      ...changes,
    };
    cy.request({ method: "PUT", url: "/api/admin/llm", body: requestBody })
      .its("status")
      .should("eq", 200);
  });
}

export function disableLlm(): void {
  configureLlm({ active: false });
}

export function uploadReceipt(fixture: string): void {
  cy.get('[data-cy="dropzone-fichier"]').selectFile(
    `cypress/fixtures/${fixture}`,
    {
      force: true,
    },
  );
}

export function waitForSelectedFile(name: string): void {
  cy.contains(name, { timeout: 25_000 }).should("be.visible");
}

export interface ManualExpense {
  itemCode: string;
  fixture?: string;
  amountInclVat: string;
  proRataPct?: string;
}

export function addExpense(expense: ManualExpense): void {
  cy.get('[data-cy="select-type-frais"]').select(expense.itemCode);
  if (expense.fixture) {
    uploadReceipt(expense.fixture);
    waitForSelectedFile(expense.fixture);
  }
  cy.get('[data-cy="input-montant-ttc"]').clear().type(expense.amountInclVat);
  if (expense.proRataPct) {
    cy.get('[data-cy="input-prorata"]').clear().type(expense.proRataPct);
  }
  cy.get('[data-cy="btn-ajouter-frais"]').should("not.be.disabled").click();
  cy.get(`[data-cy="ligne-frais-${expense.itemCode}"]`).should("exist");
}

export function addRent(): void {
  cy.get('[data-cy="select-type-frais"]').select("loyer");
  waitForValue('[data-cy="input-montant-ttc"]', "950.00");
  cy.get('[data-cy="dropzone-fichier"]').should("not.exist");
  cy.get('[data-cy="btn-ajouter-frais"]').should("not.be.disabled").click();
  cy.get('[data-cy="ligne-frais-loyer"]').should("exist");
}

export function downloadAndReadPdf(
  trigger: string,
  fileName: string,
  verify: (text: string) => void,
): void {
  cy.task("clearDownloads");
  cy.get(trigger).click();
  cy.task<string>("waitForDownload", fileName)
    .then((filePath) => cy.task<string>("readPdf", filePath))
    .then((text) => verify(normalize(text)));
}

export function downloadAndReadZip(
  trigger: string,
  fileName: string,
  verify: (entries: Record<string, string>) => void,
): void {
  cy.task("clearDownloads");
  cy.get(trigger).click();
  cy.task<string>("waitForDownload", fileName)
    .then((filePath) =>
      cy.task<Record<string, string>>("readZipText", filePath),
    )
    .then((entries) => {
      const normalized: Record<string, string> = {};
      for (const [name, text] of Object.entries(entries)) {
        normalized[name] = normalize(text);
      }
      verify(normalized);
    });
}

export function waitForAnalysisText(
  text: string | RegExp,
  timeout = 35_000,
): void {
  cy.get('[data-cy="analysis-status"]', { timeout }).should(($element) => {
    expect(normalize($element.text())).to.match(
      text instanceof RegExp
        ? text
        : new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  });
}
