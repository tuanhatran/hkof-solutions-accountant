import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { AUTH_UNAUTHORIZED_EVENT, ApiError } from "./client";
import { api } from "./endpoints";
import type { CurrentUserDto, ModuleFlagsRequest, UserRole } from "./endpoints";
import type { TemplateType } from "./types";

export const queryKeys = {
  agency: ["agency"] as const,
  companiesAll: ["companies"] as const,
  companies: ["companies"] as const,
  company: (id: number) => ["companies", id] as const,
  employeesAll: ["employees"] as const,
  employees: (companyId: number) => ["employees", companyId] as const,
  persons: ["persons"] as const,
  landlords: ["landlords"] as const,
  tenants: ["tenants"] as const,
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
  adminUsers: ["admin", "users"] as const,
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
  receivedRentReceiptsAll: ["receivedRentReceipts"] as const,
  receivedRentReceipts: (companyId: number | null, month?: string) =>
    ["receivedRentReceipts", companyId ?? "all", month ?? "all"] as const,
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

export function useAgency(enabled = true) {
  return useQuery({
    queryKey: queryKeys.agency,
    queryFn: () => api.agency.get(),
    enabled,
    staleTime: 30_000,
  });
}

export function useCompanies(enabled = true) {
  return useQuery({
    queryKey: queryKeys.companies,
    queryFn: () => api.companies.list(),
    enabled,
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

/** Landlords of the LMNP settings, the only source of the lease landlord select. */
export function useLandlords(enabled = true) {
  return useQuery({
    queryKey: queryKeys.landlords,
    queryFn: () => api.landlords.list(),
    enabled,
    staleTime: 30_000,
  });
}

/** Tenants of the LMNP settings, the only source of the lease tenant select. */
export function useTenants(enabled = true) {
  return useQuery({
    queryKey: queryKeys.tenants,
    queryFn: () => api.tenants.list(),
    enabled,
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

export function useLeases(enabled = true) {
  return useQuery({
    queryKey: queryKeys.leases,
    queryFn: () => api.leases.list(),
    enabled,
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
 * Disabled with the LMNP module, whose API answers 403 MODULE_LMNP_DISABLED.
 */
export function useAllRentReceipts(enabled = true) {
  return useQuery({
    queryKey: queryKeys.rentReceiptsAll,
    queryFn: () => api.rentReceipts.list(),
    enabled,
    staleTime: 10_000,
  });
}

/**
 * Every rent receipt issued by another account for one of the current account's
 * companies. The received route deliberately ignores the LMNP module gate, so a
 * company-only owner keeps this query enabled.
 */
export function useReceivedRentReceipts(enabled = true) {
  return useQuery({
    queryKey: queryKeys.receivedRentReceiptsAll,
    queryFn: () => api.rentReceipts.received(),
    enabled,
    staleTime: 10_000,
  });
}

/** Received receipts of one owned company and month, for the statement draft. */
export function useCompanyReceivedRentReceipts(
  companyId: number | null,
  month: string,
) {
  return useQuery({
    queryKey: queryKeys.receivedRentReceipts(companyId, month),
    queryFn: () => api.rentReceipts.received(companyId, month),
    enabled: companyId !== null && /^\d{4}-\d{2}$/.test(month),
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

export interface AuthState {
  user: CurrentUserDto | null;
  loading: boolean;
}

/** Modules and role derived from the current account. */
export interface ModuleAccess {
  companyEnabled: boolean;
  lmnpEnabled: boolean;
  isAdmin: boolean;
  /** Home page of the account; the neutral page when no module is enabled. */
  homePath:
    | "/dashboard"
    | "/generate/rent-receipt"
    | "/generate/expense-statement"
    | "/no-module";
}

/**
 * Missing flags keep both modules visible: only an explicit `false` from
 * `/api/auth/me` hides a module, so an older session never loses its pages.
 * With both modules off an administrator cut every generator: send the
 * account to a neutral page instead of a guarded route that would redirect
 * to itself.
 */
export function moduleAccessOf(user: CurrentUserDto | null): ModuleAccess {
  const companyEnabled = user?.companyEnabled !== false;
  const lmnpEnabled = user?.lmnpEnabled !== false;

  return {
    companyEnabled,
    lmnpEnabled,
    isAdmin: user?.role === "ADMIN",
    homePath: lmnpEnabled
      ? "/dashboard"
      : companyEnabled
        ? "/generate/expense-statement"
        : "/no-module",
  };
}

let authState: AuthState = { user: null, loading: true };
const authListeners = new Set<() => void>();
let unauthorizedListenerAttached = false;

function emitAuthChange(): void {
  for (const listener of authListeners) {
    listener();
  }
}

/** Replaces the signed-in account; null clears the session locally. */
export function setAuthUser(user: CurrentUserDto | null): void {
  authState = { user, loading: false };
  emitAuthChange();
}

function attachUnauthorizedListener(): void {
  if (unauthorizedListenerAttached || typeof window === "undefined") {
    return;
  }
  unauthorizedListenerAttached = true;
  window.addEventListener(AUTH_UNAUTHORIZED_EVENT, () => setAuthUser(null));
}

function subscribeAuth(listener: () => void): () => void {
  attachUnauthorizedListener();
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
}

/** Session state shared by the shell, the router guard and the auth pages. */
export function useAuthState(): AuthState {
  return useSyncExternalStore(subscribeAuth, () => authState);
}

/** Module visibility of the signed-in account, shared by nav, guards and lists. */
export function useModuleAccess(): ModuleAccess {
  return moduleAccessOf(useAuthState().user);
}

/** Local accounts listed by the administration page. */
export function useAdminUsers() {
  return useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: () => api.adminUsers.list(),
    staleTime: 10_000,
  });
}

export function useUpdateUserModules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, flags }: { id: number; flags: ModuleFlagsRequest }) =>
      api.adminUsers.updateModules(id, flags),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers }),
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, role }: { id: number; role: UserRole }) =>
      api.adminUsers.updateRole(id, { role }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers }),
  });
}

/** Loads the current account once at application start. */
export async function refreshAuth(): Promise<void> {
  try {
    const user = await api.auth.me();
    setAuthUser(user);
  } catch (error) {
    if (error instanceof ApiError) {
      setAuthUser(null);
      return;
    }
    setAuthUser(null);
  }
}

export async function loginSession(
  email: string,
  password: string,
): Promise<CurrentUserDto> {
  const user = await api.auth.login({ email, password });
  setAuthUser(user);
  return user;
}

/**
 * Marks the onboarding as complete, then refreshes the shared session from
 * `/api/auth/me` so the router guard stops redirecting to the welcome wizard.
 */
export async function completeOnboardingSession(): Promise<void> {
  await api.auth.completeOnboarding();
  await refreshAuth();
}

export async function logoutSession(): Promise<void> {
  try {
    await api.auth.logout();
  } finally {
    setAuthUser(null);
  }
}
