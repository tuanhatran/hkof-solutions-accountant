import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { completeOnboardingSession, useAuthState } from "@/api/queries";
import { agencyRequest, personRequest } from "./onboardingRequests";
import {
  createOnboardingLandlord,
  createOnboardingTenant,
} from "./onboardingPeople";
import { OnboardingSkipButton } from "./OnboardingSkipButton";
import { OnboardingStepLease } from "./OnboardingStepLease";
import { OnboardingStepNav } from "./OnboardingStepNav";
import { OnboardingStepProfile } from "./OnboardingStepProfile";
import { OnboardingStepProperty } from "./OnboardingStepProperty";
import { OnboardingStepSummary } from "./OnboardingStepSummary";
import {
  setOnboardingSkipped,
  useOnboardingPersistence,
} from "./useOnboardingPersistence";
import {
  amountOf,
  fullName,
  useOnboardingState,
  type LeaseValues,
  type ProfileValues,
  type PropertyValues,
} from "./useOnboardingState";

/** LMNP agency track of the onboarding: profile, properties, lease, summary. */
export function OnboardingAgencyWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthState();
  const { load, save, clear } = useOnboardingPersistence(user?.email);
  const [initialSaved] = useState(() => load());
  const {
    step,
    draft,
    next,
    back,
    restoreState,
    updateProfile,
    updateProperty,
    updateLease,
    cachedTenantId,
    cacheTenantId,
    cachedLandlordId,
    cacheLandlordId,
  } = useOnboardingState(initialSaved ?? undefined);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialSaved && user?.email) {
      const persisted = load();
      if (persisted) restoreState(persisted.step, persisted.draft);
    }
  }, [initialSaved, user?.email, load, restoreState]);

  useEffect(() => {
    if (user?.email) save(step, draft);
  }, [step, draft, save, user?.email]);

  function handleSkip() {
    save(step, draft);
    setOnboardingSkipped(true);
    navigate("/dashboard");
  }

  const skipAction = <OnboardingSkipButton onClick={handleSkip} />;

  async function saveProfile(values: ProfileValues, advance: boolean) {
    setPending(true);
    setError(null);
    try {
      const agency = await api.agency.save(agencyRequest(values));
      const person =
        draft.person?.id !== undefined
          ? await api.persons.update(draft.person.id, personRequest(values))
          : await api.persons.create(personRequest(values));
      updateProfile(values, person, agency);
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
      const id = await createOnboardingLandlord(
        landlordName,
        property.landlordPhone.trim() || null,
        property.landlordAddressNote.trim() || null,
        t("onboarding.errors.tenant"),
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
      const id = await createOnboardingTenant(
        name,
        t("onboarding.errors.tenant"),
      );
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
      clear();
      setOnboardingSkipped(false);
      navigate("/dashboard", { replace: true });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <OnboardingStepNav currentStep={step} />

      {step === 0 ? (
        <OnboardingStepProfile
          values={draft.profile}
          person={draft.person}
          pending={pending}
          error={error}
          onSave={(values, advance) => void saveProfile(values, advance)}
          skipAction={skipAction}
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
          skipAction={skipAction}
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
          skipAction={skipAction}
        />
      ) : null}
      {step === 3 ? (
        <OnboardingStepSummary
          draft={draft}
          pending={pending}
          error={error}
          onBack={back}
          onFinalize={() => void finalize()}
          skipAction={skipAction}
        />
      ) : null}
    </>
  );
}
