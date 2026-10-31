import { useCallback } from "react";
import type { OnboardingDraft } from "./useOnboardingState";

export interface PersistedOnboardingState {
  step: number;
  draft: OnboardingDraft;
}

export const ONBOARDING_STORAGE_PREFIX = "homeofficeexpenses.onboarding.";
export const ONBOARDING_SKIPPED_STORAGE_KEY =
  "homeofficeexpenses.onboarding_skipped";

export function getOnboardingStorageKey(userId: string): string {
  return `${ONBOARDING_STORAGE_PREFIX}${userId}`;
}

export function loadOnboardingDraft(
  userId?: string | null,
): PersistedOnboardingState | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getOnboardingStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedOnboardingState;
    if (typeof parsed?.step === "number" && parsed?.draft) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveOnboardingDraft(
  userId: string | null | undefined,
  state: PersistedOnboardingState,
): void {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      getOnboardingStorageKey(userId),
      JSON.stringify(state),
    );
  } catch {
    // ignore quota errors
  }
}

export function clearOnboardingDraft(userId?: string | null): void {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getOnboardingStorageKey(userId));
  } catch {
    // ignore
  }
}

export function isOnboardingSkipped(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.sessionStorage.getItem(ONBOARDING_SKIPPED_STORAGE_KEY) === "true"
    );
  } catch {
    return false;
  }
}

export function setOnboardingSkipped(skipped = true): void {
  if (typeof window === "undefined") return;
  try {
    if (skipped) {
      window.sessionStorage.setItem(ONBOARDING_SKIPPED_STORAGE_KEY, "true");
    } else {
      window.sessionStorage.removeItem(ONBOARDING_SKIPPED_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function useOnboardingPersistence(userId?: string | null) {
  const load = useCallback(() => loadOnboardingDraft(userId), [userId]);
  const save = useCallback(
    (step: number, draft: OnboardingDraft) =>
      saveOnboardingDraft(userId, { step, draft }),
    [userId],
  );
  const clear = useCallback(() => clearOnboardingDraft(userId), [userId]);

  return { load, save, clear };
}
