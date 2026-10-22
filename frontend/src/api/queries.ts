import { useQuery } from "@tanstack/react-query";
import { api } from "./endpoints";
import type { TemplateType } from "./types";

export const queryKeys = {
  settings: ["settings"] as const,
  expenseItemsAll: ["expenseItems"] as const,
  expenseItems: (all: boolean) => ["expenseItems", all] as const,
  templates: (type: TemplateType) => ["templates", type] as const,
  variables: (type: TemplateType) => ["templates", type, "variables"] as const,
  llmConfig: ["llm", "config"] as const,
  llmStatus: ["llm", "status"] as const,
  llmModels: ["llm", "models"] as const,
  rentReceiptActive: (month: string) =>
    ["rentReceipts", "active", month] as const,
  statementActive: (month: string) => ["statements", "active", month] as const,
  rentReceiptsAll: ["rentReceipts"] as const,
  statementsAll: ["statements"] as const,
  rentReceipts: (month?: string) => ["rentReceipts", month ?? "all"] as const,
  statements: (month?: string) => ["statements", month ?? "all"] as const,
};

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => api.settings.get(),
    staleTime: 30_000,
  });
}

export function useExpenseItems(all = false) {
  return useQuery({
    queryKey: queryKeys.expenseItems(all),
    queryFn: () => api.expenseItems.list(all),
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

export function useActiveRentReceipt(month: string) {
  return useQuery({
    queryKey: queryKeys.rentReceiptActive(month),
    queryFn: () => api.rentReceipts.active(month),
    enabled: /^\d{4}-\d{2}$/.test(month),
    staleTime: 10_000,
  });
}

export function useActiveStatement(month: string) {
  return useQuery({
    queryKey: queryKeys.statementActive(month),
    queryFn: () => api.expenseStatements.active(month),
    enabled: /^\d{4}-\d{2}$/.test(month),
    staleTime: 10_000,
  });
}

export function useRentReceipts(month?: string) {
  return useQuery({
    queryKey: queryKeys.rentReceipts(month),
    queryFn: () => api.rentReceipts.list(month),
    staleTime: 10_000,
  });
}

export function useStatements(month?: string) {
  return useQuery({
    queryKey: queryKeys.statements(month),
    queryFn: () => api.expenseStatements.list(month),
    staleTime: 10_000,
  });
}
