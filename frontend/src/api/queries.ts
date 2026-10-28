import { useQueries, useQuery } from "@tanstack/react-query";
import { api } from "./endpoints";
import type { TemplateType } from "./types";

export const queryKeys = {
  companiesAll: ["companies"] as const,
  companies: ["companies"] as const,
  company: (id: number) => ["companies", id] as const,
  employeesAll: ["employees"] as const,
  employees: (companyId: number) => ["employees", companyId] as const,
  persons: ["persons"] as const,
  addresses: ["addresses"] as const,
  leases: ["leases"] as const,
  expenseItemsAll: ["expenseItems"] as const,
  expenseItemsForCompany: (companyId: number) =>
    ["expenseItems", companyId] as const,
  expenseItems: (companyId: number, all: boolean, leaseId?: number | null) =>
    [
      "expenseItems",
      companyId,
      all,
      leaseId === null || leaseId === undefined ? "all-leases" : leaseId,
    ] as const,
  templates: (type: TemplateType) => ["templates", type] as const,
  variables: (type: TemplateType) => ["templates", type, "variables"] as const,
  llmConfig: ["llm", "config"] as const,
  signaturesAll: ["signatures"] as const,
  signatures: (personId: number) => ["signatures", personId] as const,
  llmStatus: ["llm", "status"] as const,
  llmModels: ["llm", "models"] as const,
  rentReceiptActive: (
    month: string,
    companyId?: number | null,
    landlordId?: number | null,
    tenantId?: number | null,
    tenantCompanyId?: number | null,
  ) =>
    [
      "rentReceipts",
      "active",
      month,
      companyId ?? null,
      landlordId ?? null,
      tenantId ?? null,
      tenantCompanyId ?? null,
    ] as const,
  statementActive: (
    companyId: number | null,
    month: string,
    leaseId: number | null = null,
  ) =>
    [
      "statements",
      companyId ?? "all",
      "active",
      month,
      leaseId ?? "all-leases",
    ] as const,
  rentReceiptsAll: ["rentReceipts"] as const,
  statementsAll: ["statements"] as const,
  rentReceipts: (companyId?: number | null, month?: string) =>
    ["rentReceipts", companyId ?? "all", month ?? "all"] as const,
  statements: (
    companyId: number | null,
    month?: string,
    leaseId?: number | null,
  ) =>
    [
      "statements",
      companyId ?? "all",
      month ?? "all",
      leaseId ?? "all-leases",
    ] as const,
  drafts: ["drafts"] as const,
  rentReceiptDraft: (
    month: string,
    landlordId: number | null,
    tenantId: number | null,
    tenantCompanyId: number | null,
  ) =>
    [
      "drafts",
      "rent-receipts",
      month,
      landlordId ?? null,
      tenantId ?? null,
      tenantCompanyId ?? null,
    ] as const,
  statementDraft: (
    companyId: number | null,
    month: string,
    leaseId: number | null = null,
  ) =>
    [
      "drafts",
      "expense-statements",
      companyId ?? null,
      month,
      leaseId ?? "all-leases",
    ] as const,
};

export function useCompanies() {
  return useQuery({
    queryKey: queryKeys.companies,
    queryFn: () => api.companies.list(),
    staleTime: 30_000,
  });
}

export function useEmployees(companyId: number | null) {
  return useQuery({
    queryKey: queryKeys.employees(companyId ?? 0),
    queryFn: () => api.employees.list(companyId as number),
    enabled: companyId !== null,
    staleTime: 30_000,
  });
}

export function usePersons() {
  return useQuery({
    queryKey: queryKeys.persons,
    queryFn: () => api.persons.list(),
    staleTime: 30_000,
  });
}

export function useAddresses() {
  return useQuery({
    queryKey: queryKeys.addresses,
    queryFn: () => api.addresses.list(),
    staleTime: 30_000,
  });
}

export function useLeases() {
  return useQuery({
    queryKey: queryKeys.leases,
    queryFn: () => api.leases.list(),
    staleTime: 30_000,
  });
}

export function useExpenseItems(
  companyId: number | null,
  all = false,
  leaseId: number | null = null,
) {
  return useQuery({
    queryKey: queryKeys.expenseItems(companyId ?? 0, all, leaseId),
    queryFn: () => api.expenseItems.list(companyId as number, all, leaseId),
    enabled: companyId !== null,
    staleTime: 30_000,
  });
}

/**
 * Presence of expense items for several leases, one cached query per lease.
 * It reuses `queryKeys.expenseItems` so the grid row and the scoped dialog
 * share the same cache entry. `undefined` means pending or failed, so only a
 * successful empty response tells the row that the lease has no item.
 */
export function useLeaseExpenseItemPresence(
  companyId: number,
  leaseIds: number[],
): ReadonlyMap<number, boolean | undefined> {
  const results = useQueries({
    queries: leaseIds.map((leaseId) => ({
      queryKey: queryKeys.expenseItems(companyId, true, leaseId),
      queryFn: () => api.expenseItems.list(companyId, true, leaseId),
      staleTime: 30_000,
    })),
  });
  const presence = new Map<number, boolean | undefined>();
  leaseIds.forEach((leaseId, index) => {
    const result = results[index];
    presence.set(
      leaseId,
      result?.isSuccess ? (result.data?.length ?? 0) > 0 : undefined,
    );
  });
  return presence;
}

export function useTemplates(type: TemplateType) {
  return useQuery({
    queryKey: queryKeys.templates(type),
    queryFn: () => api.templates.list(type),
    staleTime: 15_000,
  });
}

export function useTemplateVariables(type: TemplateType) {
  return useQuery({
    queryKey: queryKeys.variables(type),
    queryFn: () => api.templates.variables(type),
    staleTime: 5 * 60_000,
  });
}

export function useSignatures(personId: number | null = null) {
  return useQuery({
    queryKey: queryKeys.signatures(personId ?? 0),
    queryFn: () => api.signatures.list(personId as number),
    enabled: personId !== null,
    staleTime: 30_000,
  });
}

export function useLlmConfig() {
  return useQuery({
    queryKey: queryKeys.llmConfig,
    queryFn: () => api.llm.get(),
    retry: false,
  });
}

export function useLlmStatus() {
  return useQuery({
    queryKey: queryKeys.llmStatus,
    queryFn: () => api.llm.status(),
    refetchInterval: 45_000,
    retry: false,
  });
}

export function useLlmModels(url: string | null) {
  return useQuery({
    queryKey: [...queryKeys.llmModels, url ?? ""],
    queryFn: () => api.llm.models(),
    enabled: Boolean(url),
    retry: false,
    staleTime: 60_000,
  });
}

export function useActiveRentReceipt(
  month: string,
  companyId: number | null = null,
  landlordId: number | null = null,
  tenantId: number | null = null,
  tenantCompanyId: number | null = null,
) {
  return useQuery({
    queryKey: queryKeys.rentReceiptActive(
      month,
      companyId,
      landlordId,
      tenantId,
      tenantCompanyId,
    ),
    queryFn: () =>
      api.rentReceipts.active(
        month,
        companyId,
        landlordId,
        tenantId,
        tenantCompanyId,
      ),
    enabled: /^\d{4}-\d{2}$/.test(month),
    staleTime: 10_000,
  });
}

export function useActiveStatement(
  companyId: number | null,
  month: string,
  leaseId: number | null = null,
) {
  return useQuery({
    queryKey: queryKeys.statementActive(companyId, month, leaseId),
    queryFn: () =>
      api.expenseStatements.active(companyId as number, month, leaseId),
    enabled:
      companyId !== null && leaseId !== null && /^\d{4}-\d{2}$/.test(month),
    staleTime: 10_000,
  });
}

/**
 * Saved rent receipt draft for one month and exactly one tenant. Disabled until the
 * pair is complete, so the preview pane only shows a status for a real scope.
 */
export function useSavedRentReceiptDraft(
  month: string,
  landlordId: number | null,
  tenantId: number | null,
  tenantCompanyId: number | null,
) {
  const singleTenant = (tenantId === null) !== (tenantCompanyId === null);
  return useQuery({
    queryKey: queryKeys.rentReceiptDraft(
      month,
      landlordId,
      tenantId,
      tenantCompanyId,
    ),
    queryFn: () =>
      api.drafts.getRentReceipt(
        month,
        landlordId as number,
        tenantId,
        tenantCompanyId,
      ),
    enabled: /^\d{4}-\d{2}$/.test(month) && landlordId !== null && singleTenant,
    staleTime: 0,
  });
}

/** Saved expense statement draft for one company, month and lease. */
export function useSavedStatementDraft(
  companyId: number | null,
  month: string,
  leaseId: number | null = null,
) {
  return useQuery({
    queryKey: queryKeys.statementDraft(companyId, month, leaseId),
    queryFn: () => api.drafts.getStatement(companyId as number, month, leaseId),
    enabled:
      companyId !== null && leaseId !== null && /^\d{4}-\d{2}$/.test(month),
    staleTime: 0,
  });
}

export function useRentReceipts(companyId: number | null, month?: string) {
  return useQuery({
    queryKey: queryKeys.rentReceipts(companyId, month),
    queryFn: () => api.rentReceipts.list(companyId as number, month),
    enabled: companyId !== null,
    staleTime: 10_000,
  });
}

/**
 * Every rent receipt, all pairs and versions, under the shared
 * `rentReceiptsAll` prefix so the lease receipt modal refreshes it.
 */
export function useAllRentReceipts() {
  return useQuery({
    queryKey: queryKeys.rentReceiptsAll,
    queryFn: () => api.rentReceipts.list(),
    staleTime: 10_000,
  });
}

/** One statement query per company, merged for the all-company history. */
export function useAllStatements(companyIds: number[]) {
  const queries = useQueries({
    queries: companyIds.map((companyId) => ({
      queryKey: queryKeys.statements(companyId),
      queryFn: () => api.expenseStatements.list(companyId),
      staleTime: 10_000,
    })),
  });
  const failed = queries.find((query) => query.isError);

  return {
    data: queries.every((query) => query.isSuccess)
      ? queries.flatMap((query) => query.data ?? [])
      : undefined,
    isPending: queries.some((query) => query.isPending),
    isError: failed !== undefined,
    error: failed?.error ?? null,
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}

export function useStatements(
  companyId: number | null,
  month?: string,
  leaseId: number | null = null,
) {
  return useQuery({
    queryKey: queryKeys.statements(companyId, month, leaseId),
    queryFn: () =>
      api.expenseStatements.list(companyId as number, month, leaseId),
    enabled: companyId !== null,
    staleTime: 10_000,
  });
}
