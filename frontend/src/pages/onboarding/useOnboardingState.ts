import { useCallback, useRef, useState } from "react";
import i18n from "@/i18n";
import type { CompanyDto, PersonDto } from "@/api/types";
import { parseAmount } from "@/lib/format";

/** French message of the onboarding validation namespace. */
export function onboardingMessage(key: string): string {
  return i18n.t(`onboarding.validation.${key}`);
}

export const ONBOARDING_STEP_KEYS = [
  "profile",
  "property",
  "lease",
  "summary",
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEP_KEYS)[number];
export type LeaseType = "individual" | "colocation";

export interface ProfileValues {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  addressNote: string;
  agencyName: string;
  legalForm: string;
  sirenSiret: string;
  agencyAddress: string;
}

export interface PropertyValues {
  propertyAddress: string;
  rentExclCharges: string;
  charges: string;
}

export interface TenantValues {
  firstName: string;
  lastName: string;
}

export interface LeaseValues {
  leaseType: LeaseType;
  tenants: TenantValues[];
}

export interface OnboardingDraft {
  profile: ProfileValues;
  property: PropertyValues;
  leaseType: LeaseType;
  tenants: TenantValues[];
  person: PersonDto | null;
  company: CompanyDto | null;
}

export const EMPTY_PROFILE: ProfileValues = {
  firstName: "",
  lastName: "",
  phone: "",
  address: "",
  addressNote: "",
  agencyName: "",
  legalForm: "",
  sirenSiret: "",
  agencyAddress: "",
};

export const EMPTY_PROPERTY: PropertyValues = {
  propertyAddress: "",
  rentExclCharges: "",
  charges: "",
};

export const EMPTY_DRAFT: OnboardingDraft = {
  profile: EMPTY_PROFILE,
  property: EMPTY_PROPERTY,
  leaseType: "individual",
  tenants: [{ firstName: "", lastName: "" }],
  person: null,
  company: null,
};

/** "Prénom Nom", the single name column of a person. */
export function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

/** Nine-digit SIREN, taken from a SIREN or from the first digits of a SIRET. */
export function sirenOf(identifier: string): string {
  return identifier.replace(/\D/g, "").slice(0, 9);
}

/** Fourteen-digit SIRET, null when the identifier is a SIREN. */
export function siretOf(identifier: string): string | null {
  const digits = identifier.replace(/\D/g, "");
  return digits.length === 14 ? digits : null;
}

/** Two-decimal API amount; blank and invalid values become zero. */
export function amountOf(value: string): string {
  return parseAmount(value) ?? "0.00";
}

/**
 * Immutable wizard draft plus its current step. Person, company and tenant ids
 * are cached so a retried finalize never creates a duplicate row.
 */
export function useOnboardingState() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>(EMPTY_DRAFT);
  const tenantIds = useRef(new Map<string, number>());

  const next = useCallback(() => {
    setStep((current) =>
      Math.min(current + 1, ONBOARDING_STEP_KEYS.length - 1),
    );
  }, []);

  const back = useCallback(() => {
    setStep((current) => Math.max(current - 1, 0));
  }, []);

  const updateProfile = useCallback(
    (profile: ProfileValues, person: PersonDto, company: CompanyDto) => {
      setDraft((current) => ({ ...current, profile, person, company }));
    },
    [],
  );

  const updateProperty = useCallback((property: PropertyValues) => {
    setDraft((current) => ({ ...current, property }));
  }, []);

  const updateLease = useCallback(
    (leaseType: LeaseType, tenants: TenantValues[]) => {
      setDraft((current) => ({ ...current, leaseType, tenants }));
    },
    [],
  );

  const cachedTenantId = useCallback(
    (key: string) => tenantIds.current.get(key),
    [],
  );

  const cacheTenantId = useCallback((key: string, id: number) => {
    tenantIds.current.set(key, id);
  }, []);

  return {
    step,
    draft,
    next,
    back,
    updateProfile,
    updateProperty,
    updateLease,
    cachedTenantId,
    cacheTenantId,
  };
}
