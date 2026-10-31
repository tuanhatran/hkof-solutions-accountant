import { useCallback, useRef, useState } from "react";
import i18n from "@/i18n";
import type { AgencyDto, PersonDto } from "@/api/types";
import { parseAmount } from "@/lib/format";

/** French message of the onboarding validation namespace. */
export function onboardingMessage(key: string): string {
  return i18n.t(`onboarding.validation.${key}`);
}

export const PHONE_PATTERN =
  /^(?:(?:\+33|0)[1-9](?:[ .-]?\d{2}){4}|\+[1-9]\d{0,3}[\s.-]?\d{4,14}|\d{8,15})$/;

/** SIREN with 9 digits or SIRET with 14: 10 to 13 digits are rejected. */
export const IDENTIFIER_PATTERN = /^(?:\d{9}|\d{14})$/;

/** Validates French phone or international phone (8 to 15 digits). */
export function isValidPhone(value: string): boolean {
  const cleaned = value.replace(/[\s.-]/g, "");
  const hasValidChars = /^\+?\d+$/.test(cleaned);
  const digits = cleaned.replace(/\D/g, "");
  if (!hasValidChars || digits.length < 8 || digits.length > 15) {
    return false;
  }
  return PHONE_PATTERN.test(value);
}

/** Validates optional SIREN (9 digits) or SIRET (14 digits). Empty is valid. */
export function isValidSirenSiret(value: string): boolean {
  const cleaned = value.replace(/[ .]/g, "");
  return cleaned.length === 0 || IDENTIFIER_PATTERN.test(cleaned);
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
  phoneCountryCode?: string;
  address: string;
  addressNote: string;
  isPersonalAgency: boolean;
  agencyName: string;
  legalForm: string;
  sirenSiret: string;
  agencyAddress: string;
}

export interface PropertyItemValues {
  id: string;
  propertyAddress: string;
  landlordFirstName: string;
  landlordLastName: string;
  landlordPhoneCountryCode?: string;
  landlordPhone: string;
  landlordEmail: string;
  landlordAddressNote: string;
}

export interface PropertyValues {
  properties: PropertyItemValues[];
}

export interface TenantValues {
  firstName: string;
  lastName: string;
  rentExclCharges: string;
  charges: string;
}

export interface LeaseValues {
  propertyId: string;
  leaseType: LeaseType;
  rentExclCharges: string;
  charges: string;
  tenants: TenantValues[];
}

export interface OnboardingDraft {
  profile: ProfileValues;
  properties: PropertyItemValues[];
  property: PropertyItemValues;
  lease: LeaseValues;
  leaseType: LeaseType;
  tenants: TenantValues[];
  person: PersonDto | null;
  agency: AgencyDto | null;
}

export const EMPTY_PROFILE: ProfileValues = {
  firstName: "",
  lastName: "",
  phone: "",
  phoneCountryCode: "+33",
  address: "",
  addressNote: "",
  isPersonalAgency: false,
  agencyName: "",
  legalForm: "",
  sirenSiret: "",
  agencyAddress: "",
};

export function createEmptyProperty(id = "prop-1"): PropertyItemValues {
  return {
    id,
    propertyAddress: "",
    landlordFirstName: "",
    landlordLastName: "",
    landlordPhoneCountryCode: "+33",
    landlordPhone: "",
    landlordEmail: "",
    landlordAddressNote: "",
  };
}

export const EMPTY_PROPERTY_ITEM: PropertyItemValues = createEmptyProperty();
export const EMPTY_PROPERTY: PropertyValues = {
  properties: [EMPTY_PROPERTY_ITEM],
};
export const EMPTY_TENANT: TenantValues = {
  firstName: "",
  lastName: "",
  rentExclCharges: "",
  charges: "",
};
export const EMPTY_LEASE: LeaseValues = {
  propertyId: "prop-1",
  leaseType: "individual",
  rentExclCharges: "",
  charges: "",
  tenants: [{ ...EMPTY_TENANT }],
};

export const EMPTY_DRAFT: OnboardingDraft = {
  profile: EMPTY_PROFILE,
  properties: [EMPTY_PROPERTY_ITEM],
  property: EMPTY_PROPERTY_ITEM,
  lease: EMPTY_LEASE,
  leaseType: "individual",
  tenants: [{ ...EMPTY_TENANT }],
  person: null,
  agency: null,
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
export function amountOf(value: string | undefined): string {
  return parseAmount(value ?? "") ?? "0.00";
}

/** Validates rent > 0. */
export function isValidRent(value?: string): boolean {
  const parsed = parseAmount(value ?? "");
  return parsed !== null && Number(parsed) > 0;
}

/** Validates optional charges >= 0. */
export function isValidCharges(value?: string): boolean {
  return !value?.trim() || parseAmount(value) !== null;
}

/**
 * Immutable wizard draft plus its current step. Person, company, landlord and tenant ids
 * are cached so a retried finalize never creates duplicate rows.
 */
export function useOnboardingState() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>(EMPTY_DRAFT);
  const tenantIds = useRef(new Map<string, number>());
  const landlordIds = useRef(new Map<string, number>());

  const next = useCallback(() => {
    setStep((current) =>
      Math.min(current + 1, ONBOARDING_STEP_KEYS.length - 1),
    );
  }, []);

  const back = useCallback(() => {
    setStep((current) => Math.max(current - 1, 0));
  }, []);

  const updateProfile = useCallback(
    (profile: ProfileValues, person: PersonDto, agency: AgencyDto) => {
      setDraft((current) => ({ ...current, profile, person, agency }));
    },
    [],
  );

  const updateProperties = useCallback((properties: PropertyItemValues[]) => {
    setDraft((current) => ({
      ...current,
      properties,
      property: properties[0] ?? current.property,
      lease: {
        ...current.lease,
        propertyId: properties.some((p) => p.id === current.lease.propertyId)
          ? current.lease.propertyId
          : (properties[0]?.id ?? ""),
      },
    }));
  }, []);

  const updateProperty = useCallback(
    (propertyData: PropertyValues | PropertyItemValues[]) => {
      updateProperties(
        Array.isArray(propertyData) ? propertyData : propertyData.properties,
      );
    },
    [updateProperties],
  );

  const updateLease = useCallback(
    (
      leaseValues: LeaseValues | LeaseType,
      optionalTenants?: TenantValues[],
    ) => {
      setDraft((current) => {
        if (typeof leaseValues === "string") {
          const tenants = optionalTenants ?? [];
          return {
            ...current,
            leaseType: leaseValues,
            tenants,
            lease: { ...current.lease, leaseType: leaseValues, tenants },
          };
        }
        return {
          ...current,
          lease: leaseValues,
          leaseType: leaseValues.leaseType,
          tenants: leaseValues.tenants,
        };
      });
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

  const cachedLandlordId = useCallback(
    (key: string) => landlordIds.current.get(key),
    [],
  );

  const cacheLandlordId = useCallback((key: string, id: number) => {
    landlordIds.current.set(key, id);
  }, []);

  return {
    step,
    draft,
    next,
    back,
    updateProfile,
    updateProperty,
    updateProperties,
    updateLease,
    cachedTenantId,
    cacheTenantId,
    cachedLandlordId,
    cacheLandlordId,
  };
}
