import { api } from "@/api/endpoints";

/**
 * Creates the landlord of an onboarding property. The dedicated landlord route
 * replaces the generic person route, which now creates a landlord by default.
 */
export async function createOnboardingLandlord(
  name: string,
  phone: string | null,
  addressNote: string | null,
  errorMessage: string,
): Promise<number> {
  const created = await api.landlords.create({
    name,
    phone,
    addressNote,
    address: null,
    issuePlace: null,
  });
  if (created.id === undefined) throw new Error(errorMessage);
  return created.id;
}

/** Creates one onboarding tenant through the dedicated tenant route. */
export async function createOnboardingTenant(
  name: string,
  errorMessage: string,
): Promise<number> {
  const created = await api.tenants.create({
    name,
    phone: null,
    email: null,
    addressNote: null,
    address: null,
  });
  if (created.id === undefined) throw new Error(errorMessage);
  return created.id;
}
