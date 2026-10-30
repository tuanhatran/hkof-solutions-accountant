import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { StatementDto } from "./types";
import { api } from "./endpoints";
import {
  queryKeys,
  useActiveRentReceipt,
  useActiveStatement,
  useAllRentReceipts,
  useAllStatements,
  useCompanies,
  useCompanyReceivedRentReceipts,
  useEmployees,
  useExpenseItems,
  useLeases,
  useLeaseExpenseItemPresence,
  useLlmConfig,
  useLlmModels,
  useLlmStatus,
  usePersons,
  useReceivedRentReceipts,
  useRentReceipts,
  useSavedRentReceiptDraft,
  useSavedStatementDraft,
  useSignatures,
  useStatements,
  useTemplates,
  useTemplateVariables,
} from "./queries";

vi.mock("./endpoints", () => ({
  api: {
    companies: { list: vi.fn() },
    employees: { list: vi.fn() },
    persons: { list: vi.fn() },
    leases: { list: vi.fn() },
    expenseItems: { list: vi.fn() },
    templates: { list: vi.fn(), variables: vi.fn() },
    signatures: { list: vi.fn() },
    llm: { get: vi.fn(), status: vi.fn(), models: vi.fn() },
    rentReceipts: { active: vi.fn(), list: vi.fn(), received: vi.fn() },
    expenseStatements: { active: vi.fn(), list: vi.fn() },
    drafts: { getRentReceipt: vi.fn(), getStatement: vi.fn() },
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("query hooks", () => {
  it("loads the companies, employees and rent directories", async () => {
    vi.mocked(api.companies.list).mockResolvedValue([{ id: 1, name: "HKOF" }]);
    vi.mocked(api.employees.list).mockResolvedValue([]);
    vi.mocked(api.persons.list).mockResolvedValue([]);
    vi.mocked(api.leases.list).mockResolvedValue([]);

    const companies = renderHook(() => useCompanies(), { wrapper });
    const employees = renderHook(() => useEmployees(1), { wrapper });
    const persons = renderHook(() => usePersons(), { wrapper });
    const leases = renderHook(() => useLeases(), { wrapper });

    await waitFor(() =>
      expect(companies.result.current.data).toEqual([{ id: 1, name: "HKOF" }]),
    );
    await waitFor(() =>
      expect([
        employees.result.current.isSuccess,
        persons.result.current.isSuccess,
        leases.result.current.isSuccess,
      ]).toEqual([true, true, true]),
    );
    expect(api.employees.list).toHaveBeenCalledWith(1);
  });

  it("keeps the employees disabled without a company", async () => {
    const employees = renderHook(() => useEmployees(null), { wrapper });

    await waitFor(() =>
      expect(employees.result.current.fetchStatus).toBe("idle"),
    );
    expect(api.employees.list).not.toHaveBeenCalled();
  });

  it("loads expense items for both list scopes of a company", async () => {
    vi.mocked(api.expenseItems.list).mockResolvedValue([]);

    const active = renderHook(() => useExpenseItems(3), { wrapper });
    const all = renderHook(() => useExpenseItems(3, true), { wrapper });
    const leaseScoped = renderHook(() => useExpenseItems(3, true, 7), {
      wrapper,
    });
    const scoped = renderHook(() => useExpenseItems(null), { wrapper });

    await waitFor(() => expect(active.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(all.result.current.isSuccess).toBe(true));
    await waitFor(() =>
      expect(leaseScoped.result.current.isSuccess).toBe(true),
    );
    expect(api.expenseItems.list).toHaveBeenCalledWith(3, false, null);
    expect(api.expenseItems.list).toHaveBeenCalledWith(3, true, null);
    expect(api.expenseItems.list).toHaveBeenCalledWith(3, true, 7);
    expect(scoped.result.current.fetchStatus).toBe("idle");
  });

  it("reports the presence of expense items per lease from one shared cache", async () => {
    vi.mocked(api.expenseItems.list).mockClear();
    vi.mocked(api.expenseItems.list).mockImplementation(
      (_companyId, _all, leaseId) =>
        leaseId === 9
          ? Promise.reject(new Error("boom"))
          : Promise.resolve(leaseId === 7 ? [{ id: 1, label: "Gaz" }] : []),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const sharedWrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    const presence = renderHook(
      () => useLeaseExpenseItemPresence(3, [7, 8, 9]),
      { wrapper: sharedWrapper },
    );

    await waitFor(() => expect(presence.result.current.get(7)).toBe(true));
    expect(presence.result.current.get(8)).toBe(false);
    expect(presence.result.current.get(9)).toBeUndefined();
    expect(api.expenseItems.list).toHaveBeenCalledWith(3, true, 7);
    expect(api.expenseItems.list).toHaveBeenCalledWith(3, true, 8);
    expect(api.expenseItems.list).toHaveBeenCalledWith(3, true, 9);

    // The row and the dialog share the same cache entry, no second request.
    vi.mocked(api.expenseItems.list).mockClear();
    renderHook(() => useExpenseItems(3, true, 7), { wrapper: sharedWrapper });
    expect(api.expenseItems.list).not.toHaveBeenCalled();
  });

  it("loads templates and their variables for a type", async () => {
    vi.mocked(api.templates.list).mockResolvedValue([]);
    vi.mocked(api.templates.variables).mockResolvedValue([]);

    const templates = renderHook(() => useTemplates("RENT_RECEIPT"), {
      wrapper,
    });
    const variables = renderHook(
      () => useTemplateVariables("EXPENSE_STATEMENT"),
      { wrapper },
    );

    await waitFor(() => expect(templates.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(variables.result.current.isSuccess).toBe(true));
    expect(api.templates.list).toHaveBeenCalledWith("RENT_RECEIPT");
    expect(api.templates.variables).toHaveBeenCalledWith("EXPENSE_STATEMENT");
  });

  it("loads signatures and the LLM configuration, status and models", async () => {
    vi.mocked(api.signatures.list).mockResolvedValue([]);
    vi.mocked(api.llm.get).mockResolvedValue({ active: false });
    vi.mocked(api.llm.status).mockResolvedValue({
      status: "PRET",
      reachable: true,
      active: true,
      message: "",
    });
    vi.mocked(api.llm.models).mockResolvedValue([]);

    const signatures = renderHook(() => useSignatures(4), { wrapper });
    const config = renderHook(() => useLlmConfig(), { wrapper });
    const status = renderHook(() => useLlmStatus(), { wrapper });
    const models = renderHook(() => useLlmModels("http://ollama"), { wrapper });

    await waitFor(() =>
      expect([
        signatures.result.current.isSuccess,
        config.result.current.isSuccess,
        status.result.current.isSuccess,
        models.result.current.isSuccess,
      ]).toEqual([true, true, true, true]),
    );
    expect(api.signatures.list).toHaveBeenCalledWith(4);
    expect(api.llm.models).toHaveBeenCalledTimes(1);
  });

  it("keeps the LLM models disabled without a url", async () => {
    vi.mocked(api.llm.models).mockResolvedValue([]);

    const models = renderHook(() => useLlmModels(null), { wrapper });

    await waitFor(() => expect(models.result.current.fetchStatus).toBe("idle"));
    expect(api.llm.models).not.toHaveBeenCalled();
  });

  it("loads the active documents only for a valid month", async () => {
    vi.mocked(api.rentReceipts.active).mockResolvedValue(null);
    vi.mocked(api.expenseStatements.active).mockResolvedValue(null);

    const receipt = renderHook(() => useActiveRentReceipt("2026-10", 3), {
      wrapper,
    });
    const statement = renderHook(() => useActiveStatement(3, "2026-10", 5), {
      wrapper,
    });

    await waitFor(() =>
      expect([
        receipt.result.current.isSuccess,
        statement.result.current.isSuccess,
      ]).toEqual([true, true]),
    );
    expect(api.rentReceipts.active).toHaveBeenCalledWith(
      "2026-10",
      3,
      null,
      null,
      null,
    );
    expect(api.expenseStatements.active).toHaveBeenCalledWith(3, "2026-10", 5);
  });

  it("skips the active documents for an invalid month, no company or no lease", async () => {
    const receipt = renderHook(
      () => useActiveRentReceipt("invalide", 3, 4, 5),
      { wrapper },
    );
    const statement = renderHook(() => useActiveStatement(3, "10-2026", 5), {
      wrapper,
    });
    const companyless = renderHook(
      () => useActiveStatement(null, "2026-10", 5),
      { wrapper },
    );
    const leaseless = renderHook(() => useActiveStatement(3, "2026-10"), {
      wrapper,
    });

    await waitFor(() =>
      expect(receipt.result.current.fetchStatus).toBe("idle"),
    );
    expect(statement.result.current.fetchStatus).toBe("idle");
    expect(companyless.result.current.fetchStatus).toBe("idle");
    expect(leaseless.result.current.fetchStatus).toBe("idle");
    expect(api.rentReceipts.active).not.toHaveBeenCalled();
    expect(api.expenseStatements.active).not.toHaveBeenCalled();
  });

  it("loads the document history of a company and skips it without one", async () => {
    vi.mocked(api.rentReceipts.list).mockResolvedValue([]);
    vi.mocked(api.expenseStatements.list).mockResolvedValue([]);

    const receipts = renderHook(() => useRentReceipts(3, "2026-10"), {
      wrapper,
    });
    const allReceipts = renderHook(() => useRentReceipts(3), { wrapper });
    const noReceipts = renderHook(() => useRentReceipts(null), { wrapper });
    const statements = renderHook(() => useStatements(3, "2026-10"), {
      wrapper,
    });
    const allStatements = renderHook(() => useStatements(3), { wrapper });
    const leaseStatements = renderHook(() => useStatements(3, "2026-10", 7), {
      wrapper,
    });
    const companyless = renderHook(() => useStatements(null), { wrapper });

    await waitFor(() =>
      expect([
        receipts.result.current.isSuccess,
        allReceipts.result.current.isSuccess,
        statements.result.current.isSuccess,
        allStatements.result.current.isSuccess,
      ]).toEqual([true, true, true, true]),
    );
    await waitFor(() =>
      expect(leaseStatements.result.current.isSuccess).toBe(true),
    );
    expect(api.rentReceipts.list).toHaveBeenCalledWith(3, "2026-10");
    expect(api.rentReceipts.list).toHaveBeenCalledWith(3, undefined);
    expect(api.rentReceipts.list).toHaveBeenCalledTimes(2);
    expect(api.expenseStatements.list).toHaveBeenCalledWith(3, "2026-10", null);
    expect(api.expenseStatements.list).toHaveBeenCalledWith(3, undefined, null);
    expect(api.expenseStatements.list).toHaveBeenCalledWith(3, "2026-10", 7);
    expect(noReceipts.result.current.fetchStatus).toBe("idle");
    expect(companyless.result.current.fetchStatus).toBe("idle");
  });
  it("loads and merges every company's statements", async () => {
    vi.mocked(api.expenseStatements.list).mockClear();
    const first: StatementDto = { id: 1, companyId: 3, month: "2026-01" };
    const second: StatementDto = { id: 2, companyId: 4, month: "2026-01" };
    vi.mocked(api.expenseStatements.list).mockImplementation((companyId) =>
      Promise.resolve(companyId === 3 ? [first] : [second]),
    );

    const all = renderHook(() => useAllStatements([3, 4]), { wrapper });

    await waitFor(() => expect(all.result.current.isPending).toBe(false));
    expect(api.expenseStatements.list).toHaveBeenCalledWith(3);
    expect(api.expenseStatements.list).toHaveBeenCalledWith(4);
    expect(all.result.current.data).toEqual([first, second]);
    expect(all.result.current.isError).toBe(false);
    expect(all.result.current.error).toBeNull();
  });

  it("merges the statement failures and refetches every company", async () => {
    vi.mocked(api.expenseStatements.list).mockClear();
    vi.mocked(api.expenseStatements.list).mockImplementation((companyId) =>
      companyId === 4
        ? Promise.reject(new Error("Notes indisponibles"))
        : Promise.resolve([]),
    );

    const all = renderHook(() => useAllStatements([3, 4]), { wrapper });

    await waitFor(() => expect(all.result.current.isError).toBe(true));
    expect(all.result.current.error?.message).toBe("Notes indisponibles");
    await act(async () => {
      await all.result.current.refetch();
    });
    expect(api.expenseStatements.list).toHaveBeenCalledTimes(4);
  });

  it("skips the statement fan-out without a company", () => {
    vi.mocked(api.expenseStatements.list).mockClear();
    const all = renderHook(() => useAllStatements([]), { wrapper });

    expect(all.result.current.data).toEqual([]);
    expect(all.result.current.isPending).toBe(false);
    expect(api.expenseStatements.list).not.toHaveBeenCalled();
  });

  it("loads every rent receipt for the lease history under the shared prefix", async () => {
    vi.mocked(api.rentReceipts.list).mockResolvedValue([]);

    const all = renderHook(() => useAllRentReceipts(), { wrapper });

    await waitFor(() => expect(all.result.current.isSuccess).toBe(true));
    expect(api.rentReceipts.list).toHaveBeenCalledWith();

    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.rentReceiptsAll, []);
    void queryClient.invalidateQueries({ queryKey: queryKeys.rentReceiptsAll });
    expect(
      queryClient.getQueryState(queryKeys.rentReceiptsAll)?.isInvalidated,
    ).toBe(true);
  });

  it("loads the received rent receipts of the account companies and of one company month", async () => {
    vi.mocked(api.rentReceipts.received).mockResolvedValue([]);

    const all = renderHook(() => useReceivedRentReceipts(), { wrapper });
    await waitFor(() => expect(all.result.current.isSuccess).toBe(true));
    expect(api.rentReceipts.received).toHaveBeenCalledWith();

    const scoped = renderHook(
      () => useCompanyReceivedRentReceipts(3, "2026-10"),
      { wrapper },
    );
    await waitFor(() => expect(scoped.result.current.isSuccess).toBe(true));
    expect(api.rentReceipts.received).toHaveBeenCalledWith(3, "2026-10");

    vi.mocked(api.rentReceipts.received).mockClear();
    renderHook(() => useCompanyReceivedRentReceipts(null, "2026-10"), {
      wrapper,
    });
    renderHook(() => useCompanyReceivedRentReceipts(3, "invalid"), {
      wrapper,
    });
    expect(api.rentReceipts.received).not.toHaveBeenCalled();
  });

  it("loads the saved rent receipt draft only for one tenant scope", async () => {
    vi.mocked(api.drafts.getRentReceipt).mockResolvedValue({ id: 4 });

    const saved = renderHook(
      () => useSavedRentReceiptDraft("2026-01", 1, 2, null),
      { wrapper },
    );
    await waitFor(() => expect(saved.result.current.isSuccess).toBe(true));
    expect(api.drafts.getRentReceipt).toHaveBeenCalledWith(
      "2026-01",
      1,
      2,
      null,
    );
    expect(saved.result.current.data?.id).toBe(4);

    vi.mocked(api.drafts.getRentReceipt).mockClear();
    renderHook(() => useSavedRentReceiptDraft("2026-01", null, 2, null), {
      wrapper,
    });
    renderHook(() => useSavedRentReceiptDraft("2026-01", 1, null, null), {
      wrapper,
    });
    renderHook(() => useSavedRentReceiptDraft("2026-01", 1, 2, 3), {
      wrapper,
    });
    renderHook(() => useSavedRentReceiptDraft("2026-1", 1, 2, null), {
      wrapper,
    });
    expect(api.drafts.getRentReceipt).not.toHaveBeenCalled();
  });

  it("loads the saved statement draft only for a company, a valid month and a lease", async () => {
    vi.mocked(api.drafts.getStatement).mockResolvedValue({ id: 9, lines: [] });

    const saved = renderHook(() => useSavedStatementDraft(1, "2026-01", 5), {
      wrapper,
    });
    await waitFor(() => expect(saved.result.current.isSuccess).toBe(true));
    expect(api.drafts.getStatement).toHaveBeenCalledWith(1, "2026-01", 5);
    expect(saved.result.current.data?.id).toBe(9);

    vi.mocked(api.drafts.getStatement).mockClear();
    renderHook(() => useSavedStatementDraft(null, "2026-01", 5), { wrapper });
    renderHook(() => useSavedStatementDraft(1, "2026-1", 5), { wrapper });
    renderHook(() => useSavedStatementDraft(1, "2026-01"), { wrapper });
    expect(api.drafts.getStatement).not.toHaveBeenCalled();
  });
});

describe("company query invalidation", () => {
  it("invalidates every company key, including a single company", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.companies, []);
    queryClient.setQueryData(queryKeys.company(1), { id: 1 });
    queryClient.setQueryData(queryKeys.persons, []);

    void queryClient.invalidateQueries({ queryKey: queryKeys.companiesAll });

    expect(queryClient.getQueryState(queryKeys.companies)?.isInvalidated).toBe(
      true,
    );
    expect(queryClient.getQueryState(queryKeys.company(1))?.isInvalidated).toBe(
      true,
    );
    expect(queryClient.getQueryState(queryKeys.persons)?.isInvalidated).toBe(
      false,
    );
  });

  it("invalidates every signature scope", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.signatures(0), []);
    queryClient.setQueryData(queryKeys.signatures(3), []);

    void queryClient.invalidateQueries({ queryKey: queryKeys.signaturesAll });

    expect(
      queryClient.getQueryState(queryKeys.signatures(0))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.signatures(3))?.isInvalidated,
    ).toBe(true);
  });
});

describe("expense item query invalidation", () => {
  it("invalidates every expense item list, whatever the company, all flag and lease", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.expenseItems(1, true), []);
    queryClient.setQueryData(queryKeys.expenseItems(2, false), []);
    queryClient.setQueryData(queryKeys.expenseItems(1, true, 7), []);
    queryClient.setQueryData(queryKeys.companies, []);

    void queryClient.invalidateQueries({ queryKey: queryKeys.expenseItemsAll });

    expect(
      queryClient.getQueryState(queryKeys.expenseItems(1, true))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.expenseItems(1, true, 7))
        ?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.expenseItems(2, false))
        ?.isInvalidated,
    ).toBe(true);
    expect(queryClient.getQueryState(queryKeys.companies)?.isInvalidated).toBe(
      false,
    );
  });
});

describe("rent configuration query invalidation", () => {
  it("keeps the person and lease directories independent", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.persons, []);
    queryClient.setQueryData(queryKeys.leases, []);
    queryClient.setQueryData(queryKeys.companies, []);

    void queryClient.invalidateQueries({ queryKey: queryKeys.leases });

    expect(queryClient.getQueryState(queryKeys.leases)?.isInvalidated).toBe(
      true,
    );
    expect(queryClient.getQueryState(queryKeys.persons)?.isInvalidated).toBe(
      false,
    );
    expect(queryClient.getQueryState(queryKeys.companies)?.isInvalidated).toBe(
      false,
    );
  });
});

describe("generated document query invalidation", () => {
  const month = "2026-01";

  it("invalidates the active statement through the statements prefix", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.statementActive(3, month), null);
    queryClient.setQueryData(queryKeys.rentReceiptActive(month), null);
    queryClient.setQueryData(queryKeys.companies, []);

    void queryClient.invalidateQueries({ queryKey: queryKeys.statementsAll });
    expect(
      queryClient.getQueryState(queryKeys.statementActive(3, month))
        ?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.rentReceiptActive(month))
        ?.isInvalidated,
    ).toBe(false);
    expect(queryClient.getQueryState(queryKeys.companies)?.isInvalidated).toBe(
      false,
    );
  });

  it("invalidates the active rent receipt through the rent receipts prefix", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.rentReceiptActive(month), null);
    queryClient.setQueryData(queryKeys.statementActive(3, month), null);
    queryClient.setQueryData(queryKeys.rentReceipts(3, month), []);

    void queryClient.invalidateQueries({ queryKey: queryKeys.rentReceiptsAll });

    expect(
      queryClient.getQueryState(queryKeys.rentReceiptActive(month))
        ?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.rentReceipts(3, month))
        ?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.statementActive(3, month))
        ?.isInvalidated,
    ).toBe(false);
  });

  it("keeps the active rent receipt pair-scoped and invalidates every pair", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.rentReceiptActive(month, 3, 1, 2), null);
    queryClient.setQueryData(
      queryKeys.rentReceiptActive(month, 3, 1, null, 2),
      null,
    );

    expect(queryKeys.rentReceiptActive(month, 3, 1, 2)).not.toEqual(
      queryKeys.rentReceiptActive(month, 3, 1, null, 2),
    );

    void queryClient.invalidateQueries({ queryKey: queryKeys.rentReceiptsAll });

    expect(
      queryClient.getQueryState(queryKeys.rentReceiptActive(month, 3, 1, 2))
        ?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(
        queryKeys.rentReceiptActive(month, 3, 1, null, 2),
      )?.isInvalidated,
    ).toBe(true);
  });
});
