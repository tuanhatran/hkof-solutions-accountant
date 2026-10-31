import "./OnboardingPage.css";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { completeOnboardingSession, useAuthState } from "@/api/queries";
import type { CompanyDto, CompanyRequest, PersonRequest } from "@/api/types";
import { cn } from "@/lib/cn";
import { OnboardingStepLease } from "./OnboardingStepLease";
import { OnboardingStepProfile } from "./OnboardingStepProfile";
import { OnboardingStepProperty } from "./OnboardingStepProperty";
import { OnboardingStepSummary } from "./OnboardingStepSummary";
import {
  ONBOARDING_STEP_KEYS,
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
      if (advance) {
        next();
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  function saveProperty(values: PropertyValues) {
    updateProperty(values);
    next();
  }

  function saveLease(values: LeaseValues) {
    updateLease(values.leaseType, values.tenants);
    next();
  }

  async function finalize() {
    setPending(true);
    setError(null);
    try {
      const landlordId = draft.person?.id;
      if (landlordId === undefined) {
        setError(t("onboarding.errors.profileMissing"));
        return;
      }
      const tenantIds: number[] = [];
      for (const [index, tenant] of draft.tenants.entries()) {
        const name = fullName(tenant.firstName, tenant.lastName);
        const cacheKey = `${index}:${name.toLowerCase()}`;
        const cached = cachedTenantId(cacheKey);
        if (cached !== undefined) {
          tenantIds.push(cached);
          continue;
        }
        const created = await api.persons.create({
          name,
          address: null,
          phone: null,
          addressNote: null,
          issuePlace: null,
        });
        if (created.id === undefined) {
          throw new Error(t("onboarding.errors.tenant"));
        }
        cacheTenantId(cacheKey, created.id);
        tenantIds.push(created.id);
      }
      await api.leases.create({
        companyLease: false,
        landlordId,
        tenantIds,
        propertyAddress: draft.property.propertyAddress.trim(),
        rentExclCharges: amountOf(draft.property.rentExclCharges),
        charges: amountOf(draft.property.charges),
      });
      await completeOnboardingSession();
      navigate("/generer/quittance", { replace: true });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  const landlordName = fullName(
    draft.profile.firstName,
    draft.profile.lastName,
  );

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

        <ol className="onboarding-steps" aria-label={t("onboarding.stepsAria")}>
          {ONBOARDING_STEP_KEYS.map((key, index) => (
            <li
              key={key}
              className={cn(
                "onboarding-step",
                index === step && "onboarding-step-active",
              )}
              aria-current={index === step ? "step" : undefined}
              aria-label={t("onboarding.stepLabel", {
                current: index + 1,
                total: ONBOARDING_STEP_KEYS.length,
                label: t(`onboarding.steps.${key}`),
              })}
            >
              <span className="onboarding-step-index" aria-hidden="true">
                {index + 1}
              </span>
              {t(`onboarding.steps.${key}`)}
            </li>
          ))}
        </ol>

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
            values={draft.property}
            landlordName={landlordName}
            landlordEmail={user?.email ?? ""}
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
            values={{
              leaseType: draft.leaseType,
              tenants: draft.tenants,
            }}
            pending={pending}
            error={error}
            onBack={(values) => {
              updateLease(values.leaseType, values.tenants);
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
