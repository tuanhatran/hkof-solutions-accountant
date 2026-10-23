import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { api } from "./endpoints";
import {
  queryKeys,
  useActiveRentReceipt,
  useActiveStatement,
  useExpenseItems,
  useLandlords,
  useLeases,
  useLlmConfig,
  useLlmModels,
  useLlmStatus,
  useRentReceipts,
  useSettings,
  useSignatures,
  useStatements,
  useTemplates,
  useTemplateVariables,
  useTenants,
} from "./queries";

vi.mock("./endpoints", () => ({
  api: {
    settings: { get: vi.fn() },
    landlords: { list: vi.fn() },
    tenants: { list: vi.fn() },
    leases: { list: vi.fn() },
    expenseItems: { list: vi.fn() },
    templates: { list: vi.fn(), variables: vi.fn() },
    signatures: { list: vi.fn() },
    llm: { get: vi.fn(), status: vi.fn(), models: vi.fn() },
    rentReceipts: { active: vi.fn(), list: vi.fn() },
    expenseStatements: { active: vi.fn(), list: vi.fn() },
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("query hooks", () => {
  it("loads the settings and the rent directories", async () => {
    vi.mocked(api.settings.get).mockResolvedValue({ companyName: "HKOF" });
    vi.mocked(api.landlords.list).mockResolvedValue([]);
    vi.mocked(api.tenants.list).mockResolvedValue([]);
    vi.mocked(api.leases.list).mockResolvedValue([]);

    const settings = renderHook(() => useSettings(), { wrapper });
    const landlords = renderHook(() => useLandlords(), { wrapper });
    const tenants = renderHook(() => useTenants(), { wrapper });
    const leases = renderHook(() => useLeases(), { wrapper });

    await waitFor(() =>
      expect(settings.result.current.data).toEqual({
        companyName: "HKOF",
      }),
    );
    await waitFor(() =>
      expect([
        landlords.result.current.isSuccess,
        tenants.result.current.isSuccess,
        leases.result.current.isSuccess,
      ]).toEqual([true, true, true]),
    );
  });

  it("loads expense items for both list scopes", async () => {
    vi.mocked(api.expenseItems.list).mockResolvedValue([]);

    const active = renderHook(() => useExpenseItems(), { wrapper });
    const all = renderHook(() => useExpenseItems(true), { wrapper });

    await waitFor(() => expect(active.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(all.result.current.isSuccess).toBe(true));
    expect(api.expenseItems.list).toHaveBeenCalledWith(false);
    expect(api.expenseItems.list).toHaveBeenCalledWith(true);
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

    const signatures = renderHook(() => useSignatures(), { wrapper });
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

    const receipt = renderHook(() => useActiveRentReceipt("2026-10"), {
      wrapper,
    });
    const statement = renderHook(() => useActiveStatement("2026-10"), {
      wrapper,
    });

    await waitFor(() =>
      expect([
        receipt.result.current.isSuccess,
        statement.result.current.isSuccess,
      ]).toEqual([true, true]),
    );
    expect(api.rentReceipts.active).toHaveBeenCalledWith("2026-10", null, null);
    expect(api.expenseStatements.active).toHaveBeenCalledWith("2026-10");
  });

  it("skips the active documents for an invalid month", async () => {
    const receipt = renderHook(() => useActiveRentReceipt("invalide", 3, 4), {
      wrapper,
    });
    const statement = renderHook(() => useActiveStatement("10-2026"), {
      wrapper,
    });

    await waitFor(() =>
      expect(receipt.result.current.fetchStatus).toBe("idle"),
    );
    expect(statement.result.current.fetchStatus).toBe("idle");
    expect(api.rentReceipts.active).not.toHaveBeenCalled();
    expect(api.expenseStatements.active).not.toHaveBeenCalled();
  });

  it("loads the document history with and without a month", async () => {
    vi.mocked(api.rentReceipts.list).mockResolvedValue([]);
    vi.mocked(api.expenseStatements.list).mockResolvedValue([]);

    const receipts = renderHook(() => useRentReceipts("2026-10"), { wrapper });
    const allReceipts = renderHook(() => useRentReceipts(), { wrapper });
    const statements = renderHook(() => useStatements("2026-10"), { wrapper });
    const allStatements = renderHook(() => useStatements(), { wrapper });

    await waitFor(() =>
      expect([
        receipts.result.current.isSuccess,
        allReceipts.result.current.isSuccess,
        statements.result.current.isSuccess,
        allStatements.result.current.isSuccess,
      ]).toEqual([true, true, true, true]),
    );
    expect(api.rentReceipts.list).toHaveBeenCalledWith("2026-10");
    expect(api.rentReceipts.list).toHaveBeenCalledWith(undefined);
    expect(api.expenseStatements.list).toHaveBeenCalledWith("2026-10");
    expect(api.expenseStatements.list).toHaveBeenCalledWith(undefined);
  });
});

describe("expense item query invalidation", () => {
  it("invalidates every expense item list, whatever the all flag", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.expenseItems(true), []);
    queryClient.setQueryData(queryKeys.expenseItems(false), []);
    queryClient.setQueryData(queryKeys.settings, {});

    void queryClient.invalidateQueries({ queryKey: queryKeys.expenseItemsAll });

    expect(
      queryClient.getQueryState(queryKeys.expenseItems(true))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.expenseItems(false))?.isInvalidated,
    ).toBe(true);
    expect(queryClient.getQueryState(queryKeys.settings)?.isInvalidated).toBe(
      false,
    );
  });
});

describe("rent configuration query invalidation", () => {
  it("keeps the landlord, tenant and lease directories independent", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.landlords, []);
    queryClient.setQueryData(queryKeys.tenants, []);
    queryClient.setQueryData(queryKeys.leases, []);
    queryClient.setQueryData(queryKeys.settings, {});

    void queryClient.invalidateQueries({ queryKey: queryKeys.leases });

    expect(queryClient.getQueryState(queryKeys.leases)?.isInvalidated).toBe(
      true,
    );
    expect(queryClient.getQueryState(queryKeys.landlords)?.isInvalidated).toBe(
      false,
    );
    expect(queryClient.getQueryState(queryKeys.tenants)?.isInvalidated).toBe(
      false,
    );
    expect(queryClient.getQueryState(queryKeys.settings)?.isInvalidated).toBe(
      false,
    );
  });
});

describe("generated document query invalidation", () => {
  const month = "2026-01";

  it("invalidates the active statement through the statements prefix", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.statementActive(month), null);
    queryClient.setQueryData(queryKeys.rentReceiptActive(month), null);
    queryClient.setQueryData(queryKeys.settings, {});

    void queryClient.invalidateQueries({ queryKey: queryKeys.statementsAll });
    expect(
      queryClient.getQueryState(queryKeys.statementActive(month))
        ?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.rentReceiptActive(month))
        ?.isInvalidated,
    ).toBe(false);
    expect(queryClient.getQueryState(queryKeys.settings)?.isInvalidated).toBe(
      false,
    );
  });

  it("invalidates the active rent receipt through the rent receipts prefix", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.rentReceiptActive(month), null);
    queryClient.setQueryData(queryKeys.statementActive(month), null);
    queryClient.setQueryData(queryKeys.rentReceipts(month), []);

    void queryClient.invalidateQueries({ queryKey: queryKeys.rentReceiptsAll });

    expect(
      queryClient.getQueryState(queryKeys.rentReceiptActive(month))
        ?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.rentReceipts(month))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.statementActive(month))
        ?.isInvalidated,
    ).toBe(false);
  });

  it("keeps the active rent receipt pair-scoped and invalidates every pair", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.rentReceiptActive(month, 1, 2), null);
    queryClient.setQueryData(queryKeys.rentReceiptActive(month, 3, 4), null);

    expect(queryKeys.rentReceiptActive(month, 1, 2)).not.toEqual(
      queryKeys.rentReceiptActive(month, 3, 4),
    );

    void queryClient.invalidateQueries({ queryKey: queryKeys.rentReceiptsAll });

    expect(
      queryClient.getQueryState(queryKeys.rentReceiptActive(month, 1, 2))
        ?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.rentReceiptActive(month, 3, 4))
        ?.isInvalidated,
    ).toBe(true);
  });
});
