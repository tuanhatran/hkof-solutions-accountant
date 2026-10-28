import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./endpoints";

function jsonResponse(payload: unknown = {}): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => payload,
    text: async () => JSON.stringify(payload),
    blob: async () => new Blob([JSON.stringify(payload)]),
    clone: () => ({
      text: async () => JSON.stringify(payload),
    }),
  } as unknown as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(jsonResponse());
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function lastCall(): [string, RequestInit | undefined] {
  const call = fetchMock.mock.calls.at(-1);
  if (!call) {
    throw new Error("fetch was not called");
  }
  return [call[0] as string, call[1] as RequestInit | undefined];
}

async function callJson<T>(operation: () => Promise<T>): Promise<T> {
  return operation();
}

describe("company and directory endpoints", () => {
  it("manages companies", async () => {
    await callJson(() => api.companies.list());
    expect(lastCall()[0]).toBe("/api/companies");

    await callJson(() => api.companies.get(2));
    expect(lastCall()[0]).toBe("/api/companies/2");

    await callJson(() => api.companies.create({ name: "HKOF" }));
    const [path, init] = lastCall();
    expect(path).toBe("/api/companies");
    expect(init).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "HKOF" }),
    });

    await callJson(() => api.companies.update(2, { name: "Autre" }));
    expect(lastCall()[0]).toBe("/api/companies/2");
    expect(lastCall()[1]).toMatchObject({ method: "PUT" });

    await api.companies.delete(2);
    expect(lastCall()[1]).toMatchObject({ method: "DELETE" });
  });

  it("manages the employees of a company", async () => {
    await api.employees.list(2);
    expect(lastCall()[0]).toBe("/api/companies/2/employees");

    const employee = {
      companyId: 2,
      firstName: "Camille",
      lastName: "Martin",
      title: "CEO" as const,
    };
    await api.employees.create(2, employee);
    expect(lastCall()[0]).toBe("/api/companies/2/employees");
    expect(lastCall()[1]).toMatchObject({ method: "POST" });

    await api.employees.update(5, employee);
    expect(lastCall()[0]).toBe("/api/employees/5");
    expect(lastCall()[1]).toMatchObject({ method: "PUT" });

    await api.employees.delete(5);
    expect(lastCall()[1]).toMatchObject({ method: "DELETE" });
  });

  it("manages persons", async () => {
    await api.persons.list();
    expect(lastCall()[0]).toBe("/api/persons");

    await api.persons.create({ name: "M. Bailleur" });
    expect(lastCall()[1]).toMatchObject({ method: "POST" });

    await api.persons.update(3, { name: "Autre" });
    expect(lastCall()[0]).toBe("/api/persons/3");
    expect(lastCall()[1]).toMatchObject({ method: "PUT" });

    await api.persons.remove(3);
    expect(lastCall()[0]).toBe("/api/persons/3");
    expect(lastCall()[1]).toMatchObject({ method: "DELETE" });
  });

  it("manages leases", async () => {
    await api.leases.list();
    expect(lastCall()[0]).toBe("/api/leases");

    const lease = { landlordId: 1, tenantId: 2 };
    await api.leases.create(lease);
    expect(lastCall()[1]).toMatchObject({ method: "POST" });

    await api.leases.update(10, lease);
    expect(lastCall()[0]).toBe("/api/leases/10");

    await api.leases.delete(10);
    expect(lastCall()[1]).toMatchObject({ method: "DELETE" });
  });

  it("manages expense items scoped to a company and their all flag", async () => {
    await api.expenseItems.list(3);
    expect(lastCall()[0]).toBe("/api/expense-items?companyId=3&all=false");

    await api.expenseItems.list(3, true);
    expect(lastCall()[0]).toBe("/api/expense-items?companyId=3&all=true");

    await api.expenseItems.list(3, false, 7);
    expect(lastCall()[0]).toBe(
      "/api/expense-items?companyId=3&leaseId=7&all=false",
    );

    await api.expenseItems.list(3, false, null);
    expect(lastCall()[0]).toBe("/api/expense-items?companyId=3&all=false");

    await api.expenseItems.create({ companyId: 3, code: "gaz", label: "Gaz" });
    expect(lastCall()[1]).toMatchObject({ method: "POST" });

    await api.expenseItems.update(4, { companyId: 3, label: "Électricité" });
    expect(lastCall()[0]).toBe("/api/expense-items/4");

    await api.expenseItems.delete(4);
    expect(lastCall()[1]).toMatchObject({ method: "DELETE" });
  });
});

describe("rent receipt endpoints", () => {
  it("lists, creates and previews rent receipts", async () => {
    await api.rentReceipts.list();
    expect(lastCall()[0]).toBe("/api/rent-receipts");

    await api.rentReceipts.list(3, "2026-01");
    expect(lastCall()[0]).toBe("/api/rent-receipts?companyId=3&month=2026-01");

    const body = {
      companyId: 3,
      month: "2026-01",
      landlordId: 1,
      tenantId: 2,
    };
    await api.rentReceipts.create(body);
    expect(lastCall()[0]).toBe("/api/rent-receipts");
    expect(lastCall()[1]).toMatchObject({ method: "POST" });
    expect(lastCall()[1]?.body).toBe(JSON.stringify(body));

    const signal = new AbortController().signal;
    await api.rentReceipts.preview(body, signal);
    expect(lastCall()[0]).toBe("/api/rent-receipts/preview");
    expect(lastCall()[1]).toMatchObject({ method: "POST", signal });
  });

  it("builds the active query with optional company and pair parameters", async () => {
    fetchMock.mockResolvedValue(jsonResponse(null));
    await expect(api.rentReceipts.active("2026-01")).resolves.toBeNull();
    expect(lastCall()[0]).toBe("/api/rent-receipts/active?month=2026-01");

    fetchMock.mockResolvedValue(jsonResponse({ id: 7 }));
    await expect(api.rentReceipts.active("2026-01", 3, 1, 2)).resolves.toEqual({
      id: 7,
    });
    expect(lastCall()[0]).toBe(
      "/api/rent-receipts/active?month=2026-01&companyId=3&landlordId=1&tenantId=2",
    );
  });

  it("downloads the PDF and exposes its URL", async () => {
    await api.rentReceipts.pdf(9);
    expect(lastCall()[0]).toBe("/api/rent-receipts/9/pdf");
    expect(api.rentReceipts.pdfUrl(9)).toBe("/api/rent-receipts/9/pdf");
  });
});

describe("expense statement endpoints", () => {
  it("lists, drafts and finds the active statement", async () => {
    await api.expenseStatements.list(3);
    expect(lastCall()[0]).toBe("/api/expense-statements?companyId=3");

    await api.expenseStatements.list(3, "2026-02");
    expect(lastCall()[0]).toBe(
      "/api/expense-statements?companyId=3&month=2026-02",
    );

    await api.expenseStatements.list(3, undefined, 7);
    expect(lastCall()[0]).toBe("/api/expense-statements?companyId=3&leaseId=7");

    fetchMock.mockResolvedValue(jsonResponse(null));
    await expect(
      api.expenseStatements.active(3, "2026-02"),
    ).resolves.toBeNull();
    expect(lastCall()[0]).toBe(
      "/api/expense-statements/active?companyId=3&month=2026-02",
    );

    await api.expenseStatements.draft(3, "2026-02");
    expect(lastCall()[0]).toBe(
      "/api/expense-statements/draft?companyId=3&month=2026-02",
    );
    expect(lastCall()[1]).toMatchObject({ method: "POST" });
  });

  it("calculates, previews and creates a statement", async () => {
    const calculation = { companyId: 3, month: "2026-02", lines: [] };
    await api.expenseStatements.calculate(calculation);
    expect(lastCall()[0]).toBe("/api/expense-statements/calculation");
    expect(lastCall()[1]).toMatchObject({ method: "POST" });

    const signal = new AbortController().signal;
    await api.expenseStatements.preview(calculation, signal);
    expect(lastCall()[0]).toBe("/api/expense-statements/preview");
    expect(lastCall()[1]).toMatchObject({ method: "POST", signal });

    await api.expenseStatements.create(calculation);
    expect(lastCall()[0]).toBe("/api/expense-statements");
  });

  it("downloads the PDF or the ZIP and exposes their URLs", async () => {
    await api.expenseStatements.pdf(12, true);
    expect(lastCall()[0]).toBe("/api/expense-statements/12/pdf?complete=true");

    await api.expenseStatements.zip(12);
    expect(lastCall()[0]).toBe("/api/expense-statements/12/zip");

    expect(api.expenseStatements.pdfUrl(12, false)).toBe(
      "/api/expense-statements/12/pdf?complete=false",
    );
    expect(api.expenseStatements.zipUrl(12)).toBe(
      "/api/expense-statements/12/zip",
    );
  });
});

describe("document draft endpoints", () => {
  it("saves and reads a rent receipt draft by scope", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 4, month: "2026-01" }));

    const saved = await api.drafts.saveRentReceipt({
      month: "2026-01",
      landlordId: 1,
      tenantId: 2,
      rentExclCharges: "1300.00",
    });
    expect(saved.id).toBe(4);
    const [path, init] = lastCall();
    expect(path).toBe("/api/drafts/rent-receipts");
    expect(init).toMatchObject({
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month: "2026-01",
        landlordId: 1,
        tenantId: 2,
        rentExclCharges: "1300.00",
      }),
    });

    await callJson(() => api.drafts.getRentReceipt("2026-01", 1, 2, null));
    expect(lastCall()[0]).toBe(
      "/api/drafts/rent-receipts?month=2026-01&landlordId=1&tenantId=2",
    );
  });

  it("returns null for an empty rent receipt draft and a company tenant scope", async () => {
    fetchMock.mockResolvedValueOnce({
      ...jsonResponse(),
      status: 204,
    } as unknown as Response);

    const saved = await api.drafts.getRentReceipt("2026-01", 1, null, 3);
    expect(saved).toBeNull();
    expect(lastCall()[0]).toBe(
      "/api/drafts/rent-receipts?month=2026-01&landlordId=1&tenantCompanyId=3",
    );
  });

  it("saves, reads and deletes an expense statement draft", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 9, lines: [] }));

    const saved = await api.drafts.saveStatement({
      companyId: 1,
      month: "2026-01",
      complete: true,
      lines: [
        {
          itemCode: "gaz",
          amountInclVat: "80.00",
          proRataPct: "100",
          amountSource: "MANUAL",
        },
      ],
    });
    expect(saved.id).toBe(9);
    const [savePath, saveInit] = lastCall();
    expect(savePath).toBe("/api/drafts/expense-statements");
    expect(saveInit).toMatchObject({ method: "PUT" });

    await callJson(() => api.drafts.getStatement(1, "2026-01"));
    expect(lastCall()[0]).toBe(
      "/api/drafts/expense-statements?companyId=1&month=2026-01",
    );

    await callJson(() => api.drafts.delete(9));
    const [deletePath, deleteInit] = lastCall();
    expect(deletePath).toBe("/api/drafts/9");
    expect(deleteInit).toMatchObject({ method: "DELETE" });
  });
});

describe("signature, receipt and analysis endpoints", () => {
  it("lists signatures and posts a multipart form", async () => {
    await api.signatures.list();
    expect(lastCall()[0]).toBe("/api/signatures");

    await api.signatures.list(4);
    expect(lastCall()[0]).toBe("/api/signatures?personId=4");

    const file = new File(["png"], "signature.png", { type: "image/png" });
    await api.signatures.create(4, "Bailleur", file);
    const [path, init] = lastCall();
    expect(path).toBe("/api/signatures");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
    const payload = init?.body as FormData;
    expect(payload.get("personId")).toBe("4");
    expect(payload.get("name")).toBe("Bailleur");
    expect(payload.get("file")).toBeInstanceOf(File);

    await api.signatures.remove(5);
    expect(lastCall()[1]).toMatchObject({ method: "DELETE" });
    expect(api.signatures.imageUrl(5)).toBe("/api/signatures/5/image");
  });

  it("uploads and deletes a receipt", async () => {
    const file = new File(["pdf"], "facture.pdf", { type: "application/pdf" });
    await api.receipts.upload(file);
    const payload = lastCall()[1]?.body as FormData;
    expect(payload.get("file")).toBeInstanceOf(File);

    await api.receipts.delete(8);
    expect(lastCall()[0]).toBe("/api/receipts/8");
    expect(api.receipts.fileUrl(8)).toBe("/api/receipts/8/file");
  });

  it("starts, reads and cancels an analysis", async () => {
    await api.analyses.start(8);
    expect(lastCall()[0]).toBe("/api/receipts/8/analysis");
    expect(lastCall()[1]).toMatchObject({ method: "POST" });

    const signal = new AbortController().signal;
    await api.analyses.get(2, signal);
    expect(lastCall()[0]).toBe("/api/analyses/2");
    expect(lastCall()[1]).toMatchObject({ signal });

    await api.analyses.cancel(2);
    expect(lastCall()[1]).toMatchObject({ method: "DELETE" });
  });
});

describe("LLM endpoints", () => {
  it("reads, updates and tests the Ollama configuration", async () => {
    await api.llm.get();
    expect(lastCall()[0]).toBe("/api/admin/llm");

    await api.llm.update({ url: "http://localhost:11434" });
    expect(lastCall()[1]).toMatchObject({ method: "PUT" });
    expect(lastCall()[1]?.headers).toEqual({
      "Content-Type": "application/json",
    });

    await api.llm.models();
    expect(lastCall()[0]).toBe("/api/admin/llm/models");

    await api.llm.test();
    expect(lastCall()[1]).toMatchObject({ method: "POST" });

    await api.llm.status();
    expect(lastCall()[0]).toBe("/api/admin/llm/status");

    await api.llm.defaultPrompt();
    expect(lastCall()[0]).toBe("/api/admin/llm/default-prompt");
  });
});

describe("template endpoints", () => {
  it("lists templates and variables for a type", async () => {
    await api.templates.list("RENT_RECEIPT");
    expect(lastCall()[0]).toBe("/api/templates?type=RENT_RECEIPT");

    await api.templates.variables("EXPENSE_STATEMENT");
    expect(lastCall()[0]).toBe(
      "/api/templates/variables?type=EXPENSE_STATEMENT",
    );
  });

  it("uploads, activates, previews and deletes a template", async () => {
    const file = new File(["html"], "modele.html", { type: "text/html" });
    await api.templates.upload("RENT_RECEIPT", "Modele", file);
    const payload = lastCall()[1]?.body as FormData;
    expect(payload.get("type")).toBe("RENT_RECEIPT");
    expect(payload.get("name")).toBe("Modele");

    await api.templates.activate(6);
    expect(lastCall()[0]).toBe("/api/templates/6/activate");
    expect(lastCall()[1]).toMatchObject({ method: "POST" });

    await api.templates.preview(6);
    expect(lastCall()[0]).toBe("/api/templates/6/preview");

    await api.templates.file(6);
    expect(lastCall()[0]).toBe("/api/templates/6/file");

    await api.templates.delete(6);
    expect(lastCall()[1]).toMatchObject({ method: "DELETE" });
  });

  it("downloads and restores the built-in template", async () => {
    await api.templates.getDefault("EXPENSE_STATEMENT");
    expect(lastCall()[0]).toBe("/api/templates/default/EXPENSE_STATEMENT");

    await api.templates.resetDefault("EXPENSE_STATEMENT");
    expect(lastCall()[1]).toMatchObject({ method: "POST" });
  });
});
