import "./OnboardingPage.css";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { completeOnboardingSession, useAuthState } from "@/api/queries";
import type { CompanyDto, CompanyRequest, PersonRequest } from "@/api/types";
import { OnboardingStepLease } from "./OnboardingStepLease";
import { OnboardingStepNav } from "./OnboardingStepNav";
import { OnboardingStepProfile } from "./OnboardingStepProfile";
import { OnboardingStepProperty } from "./OnboardingStepProperty";
import { OnboardingStepSummary } from "./OnboardingStepSummary";
import {
  amountOf,
  fullName,
  sirenOf,
  siretOf,
  useOnboardingState,
  type LeaseValues,
  type ProfileValues,
  type PropertyValues,
} from "./useOnboardingState";

function personRequest(values: ProfileValues): PersonRequest {
  return {
    name: fullName(values.firstName, values.lastName),
    address: values.address.trim() || null,
    phone: values.phone.trim() || null,
    addressNote: values.addressNote.trim() || null,
    issuePlace: null,
  };
}

function companyRequest(
  values: ProfileValues,
  existing: CompanyDto | null,
): CompanyRequest {
  return {
    name: values.agencyName.trim(),
    legalForm: values.legalForm.trim(),
    siren: sirenOf(values.sirenSiret),
    siret: siretOf(values.sirenSiret),
    address: values.agencyAddress.trim(),
    managerName: "",
    leaseId: existing?.leaseId ?? null,
    issuePlace: "",
  };
}

/** `/bienvenue`: 3 form steps plus a summary, then the onboarding completion. */
export function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthState();
  const {
    step,
    draft,
    next,
    back,
    updateProfile,
    updateProperty,
    updateLease,
    cachedTenantId,
    cacheTenantId,
    cachedLandlordId,
    cacheLandlordId,
  } = useOnboardingState();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ensureAgency(values: ProfileValues): Promise<CompanyDto> {
    const existing =
      draft.company ?? (await api.companies.list()).at(0) ?? null;
    const requestBody = companyRequest(values, existing);
    return existing?.id !== undefined
      ? api.companies.update(existing.id, requestBody)
      : api.companies.create(requestBody);
  }

  async function saveProfile(values: ProfileValues, advance: boolean) {
    setPending(true);
    setError(null);
    try {
      const company = await ensureAgency(values);
      const person =
        draft.person?.id !== undefined
          ? await api.persons.update(draft.person.id, personRequest(values))
          : await api.persons.create(personRequest(values));
      updateProfile(values, person, company);
      if (advance) next();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  const saveProperty = (v: PropertyValues) => {
    updateProperty(v);
    next();
  };
  const saveLease = (v: LeaseValues) => {
    updateLease(v);
    next();
  };

  async function createPerson(
    name: string,
    phone: string | null = null,
    addressNote: string | null = null,
  ) {
    const created = await api.persons.create({
      name,
      phone,
      addressNote,
      address: null,
      issuePlace: null,
    });
    if (created.id === undefined)
      throw new Error(t("onboarding.errors.tenant"));
    return created.id;
  }

  async function ensureLandlords(): Promise<Map<string, number>> {
    const ids = new Map<string, number>();
    for (const property of draft.properties) {
      const cached = cachedLandlordId(property.id);
      if (cached !== undefined) {
        ids.set(property.id, cached);
        continue;
      }
      const landlordName = fullName(
        property.landlordFirstName,
        property.landlordLastName,
      );
      const id = await createPerson(
        landlordName,
        property.landlordPhone.trim() || null,
        property.landlordAddressNote.trim() || null,
      );
      cacheLandlordId(property.id, id);
      ids.set(property.id, id);
    }
    return ids;
  }

  async function ensureTenants(): Promise<number[]> {
    const ids: number[] = [];
    for (const [index, tenant] of draft.lease.tenants.entries()) {
      const name = fullName(tenant.firstName, tenant.lastName);
      const cacheKey = `${index}:${name.toLowerCase()}`;
      const cached = cachedTenantId(cacheKey);
      if (cached !== undefined) {
        ids.push(cached);
        continue;
      }
      const id = await createPerson(name);
      cacheTenantId(cacheKey, id);
      ids.push(id);
    }
    return ids;
  }

  async function finalize() {
    setPending(true);
    setError(null);
    try {
      if (draft.person?.id === undefined) {
        setError(t("onboarding.errors.profileMissing"));
        return;
      }

      const landlordIds = await ensureLandlords();
      const selectedProperty =
        draft.properties.find((p) => p.id === draft.lease.propertyId) ??
        draft.properties[0];
      const landlordId =
        landlordIds.get(selectedProperty.id) ?? draft.person.id;
      const propertyAddress = selectedProperty.propertyAddress.trim();
      const tenantIds = await ensureTenants();

      const createLease = (
        tId: number,
        tIds: number[],
        r?: string,
        c?: string,
      ) =>
        api.leases.create({
          companyLease: false,
          landlordId,
          tenantId: tId,
          tenantIds: tIds,
          propertyAddress,
          rentExclCharges: amountOf(r),
          charges: amountOf(c),
        });

      if (draft.lease.leaseType === "individual") {
        for (const [index, tenant] of draft.lease.tenants.entries()) {
          await createLease(
            tenantIds[index],
            [tenantIds[index]],
            tenant.rentExclCharges,
            tenant.charges,
          );
        }
      } else {
        await createLease(
          tenantIds[0],
          tenantIds,
          draft.lease.rentExclCharges,
          draft.lease.charges,
        );
      }

      await completeOnboardingSession();
      navigate("/generer/quittance", { replace: true });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="onboarding-page">
      <main className="onboarding-shell">
        <header className="onboarding-header">
          <p className="eyebrow">{t("onboarding.eyebrow")}</p>
          <h1 className="onboarding-title">{t("onboarding.title")}</h1>
          <p className="onboarding-description">
            {t("onboarding.description")}
          </p>
          <p className="onboarding-session">
            {t("onboarding.connectedAs", { email: user?.email ?? "" })}
          </p>
        </header>

        <OnboardingStepNav currentStep={step} />

        {step === 0 ? (
          <OnboardingStepProfile
            values={draft.profile}
            person={draft.person}
            pending={pending}
            error={error}
            onSave={(values, advance) => void saveProfile(values, advance)}
          />
        ) : null}
        {step === 1 ? (
          <OnboardingStepProperty
            values={draft.properties}
            pending={pending}
            error={error}
            onBack={(values) => {
              updateProperty(values);
              back();
            }}
            onNext={saveProperty}
          />
        ) : null}
        {step === 2 ? (
          <OnboardingStepLease
            properties={draft.properties}
            values={draft.lease}
            pending={pending}
            error={error}
            onBack={(values) => {
              updateLease(values);
              back();
            }}
            onNext={saveLease}
          />
        ) : null}
        {step === 3 ? (
          <OnboardingStepSummary
            draft={draft}
            pending={pending}
            error={error}
            onBack={back}
            onFinalize={() => void finalize()}
          />
        ) : null}
      </main>
    </div>
  );
}
