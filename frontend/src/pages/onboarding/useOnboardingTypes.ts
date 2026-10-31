import type { AgencyDto, PersonDto } from "@/api/types";

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
