import { useQuery } from "@tanstack/react-query";
import { api } from "./endpoints";
import type { TemplateType } from "./types";

export const queryKeys = {
  companiesAll: ["companies"] as const,
  companies: ["companies"] as const,
  company: (id: number) => ["companies", id] as const,
  employeesAll: ["employees"] as const,
  employees: (companyId: number) => ["employees", companyId] as const,
  landlords: ["landlords"] as const,
  tenants: ["tenants"] as const,
  leases: ["leases"] as const,
  expenseItemsAll: ["expenseItems"] as const,
  expenseItemsForCompany: (companyId: number) =>
    ["expenseItems", companyId] as const,
  expenseItems: (companyId: number, all: boolean) =>
    ["expenseItems", companyId, all] as const,
  templates: (type: TemplateType) => ["templates", type] as const,
  variables: (type: TemplateType) => ["templates", type, "variables"] as const,
  llmConfig: ["llm", "config"] as const,
  signaturesAll: ["signatures"] as const,
  signatures: (companyId?: number | null, employeeId?: number | null) =>
    ["signatures", companyId ?? "all", employeeId ?? "all"] as const,
  llmStatus: ["llm", "status"] as const,
  llmModels: ["llm", "models"] as const,
  rentReceiptActive: (
    month: string,
    companyId?: number | null,
    landlordId?: number | null,
    tenantId?: number | null,
  ) =>
    [
      "rentReceipts",
      "active",
      month,
      companyId ?? null,
      landlordId ?? null,
      tenantId ?? null,
    ] as const,
  statementActive: (companyId: number | null, month: string) =>
    ["statements", companyId ?? "all", "active", month] as const,
  rentReceiptsAll: ["rentReceipts"] as const,
  statementsAll: ["statements"] as const,
  rentReceipts: (companyId?: number | null, month?: string) =>
    ["rentReceipts", companyId ?? "all", month ?? "all"] as const,
  statements: (companyId: number | null, month?: string) =>
    ["statements", companyId ?? "all", month ?? "all"] as const,
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

export function useLandlords() {
  return useQuery({
    queryKey: queryKeys.landlords,
    queryFn: () => api.landlords.list(),
    staleTime: 30_000,
  });
}

export function useTenants() {
  return useQuery({
    queryKey: queryKeys.tenants,
    queryFn: () => api.tenants.list(),
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

export function useExpenseItems(companyId: number | null, all = false) {
  return useQuery({
    queryKey: queryKeys.expenseItems(companyId ?? 0, all),
    queryFn: () => api.expenseItems.list(companyId as number, all),
    enabled: companyId !== null,
    staleTime: 30_000,
  });
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

export function useSignatures(
  companyId: number | null = null,
  employeeId: number | null = null,
) {
  return useQuery({
    queryKey: queryKeys.signatures(companyId, employeeId),
    queryFn: () => api.signatures.list(companyId, employeeId),
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
) {
  return useQuery({
    queryKey: queryKeys.rentReceiptActive(
      month,
      companyId,
      landlordId,
      tenantId,
    ),
    queryFn: () =>
      api.rentReceipts.active(month, companyId, landlordId, tenantId),
    enabled: /^\d{4}-\d{2}$/.test(month),
    staleTime: 10_000,
  });
}

export function useActiveStatement(companyId: number | null, month: string) {
  return useQuery({
    queryKey: queryKeys.statementActive(companyId, month),
    queryFn: () => api.expenseStatements.active(companyId as number, month),
    enabled: companyId !== null && /^\d{4}-\d{2}$/.test(month),
    staleTime: 10_000,
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

export function useStatements(companyId: number | null, month?: string) {
  return useQuery({
    queryKey: queryKeys.statements(companyId, month),
    queryFn: () => api.expenseStatements.list(companyId as number, month),
    enabled: companyId !== null,
    staleTime: 10_000,
  });
}
