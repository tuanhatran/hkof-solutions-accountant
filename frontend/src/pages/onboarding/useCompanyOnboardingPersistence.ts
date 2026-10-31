import { useCallback } from "react";
import type {
  CompanyCreatedIds,
  CompanyOnboardingDraft,
} from "./useCompanyOnboardingState";

export interface PersistedCompanyOnboardingState {
  step: number;
  draft: CompanyOnboardingDraft;
  created: CompanyCreatedIds;
}

export const COMPANY_ONBOARDING_STORAGE_PREFIX =
  "homeofficeexpenses.company_onboarding.";

export function getCompanyOnboardingStorageKey(userId: string): string {
  return `${COMPANY_ONBOARDING_STORAGE_PREFIX}${userId}`;
}

/** Company draft of one account, kept apart from the LMNP onboarding draft. */
export function loadCompanyOnboardingDraft(
  userId?: string | null,
): PersistedCompanyOnboardingState | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(
      getCompanyOnboardingStorageKey(userId),
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedCompanyOnboardingState;
    if (typeof parsed?.step === "number" && parsed?.draft && parsed?.created) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveCompanyOnboardingDraft(
  userId: string | null | undefined,
  state: PersistedCompanyOnboardingState,
): void {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      getCompanyOnboardingStorageKey(userId),
      JSON.stringify(state),
    );
  } catch {
    // ignore quota errors
  }
}

export function clearCompanyOnboardingDraft(userId?: string | null): void {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getCompanyOnboardingStorageKey(userId));
  } catch {
    // ignore
  }
}

export function useCompanyOnboardingPersistence(userId?: string | null) {
  const load = useCallback(() => loadCompanyOnboardingDraft(userId), [userId]);
  const save = useCallback(
    (state: PersistedCompanyOnboardingState) =>
      saveCompanyOnboardingDraft(userId, state),
    [userId],
  );
  const clear = useCallback(
    () => clearCompanyOnboardingDraft(userId),
    [userId],
  );

  return { load, save, clear };
}
