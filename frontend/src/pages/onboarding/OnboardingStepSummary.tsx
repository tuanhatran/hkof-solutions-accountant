import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { formatEUR, parseAmount } from "@/lib/format";
import {
  fullName,
  type OnboardingDraft,
  type TenantValues,
} from "./useOnboardingState";

interface SummaryStepProps {
  draft: OnboardingDraft;
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onFinalize: () => void;
}

function amountLabel(value: string): string {
  const normalized = parseAmount(value);
  return normalized === null ? "—" : formatEUR(normalized);
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  if (value.trim() === "") {
    return null;
  }
  return (
    <>
      <dt className="onboarding-summary-term">{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

/** Step 4: read-only recap of every value before the final persistence. */
export function OnboardingStepSummary({
  draft,
  pending,
  error,
  onBack,
  onFinalize,
}: SummaryStepProps) {
  const { t } = useTranslation();
  const { profile, property, tenants } = draft;
  const leaseTypeLabel =
    draft.leaseType === "colocation"
      ? t("onboarding.summary.colocation")
      : t("onboarding.summary.privateIndividual");

  function tenantLabel(tenant: TenantValues, index: number): string {
    return `${t("onboarding.summary.tenant", {
      index: index + 1,
    })} · ${fullName(tenant.firstName, tenant.lastName)}`;
  }

  return (
    <section
      className="onboarding-card"
      aria-labelledby="onboarding-summary-title"
    >
      <h2 className="onboarding-section-title" id="onboarding-summary-title">
        {t("onboarding.summary.title")}
      </h2>
      <p className="onboarding-section-description">
        {t("onboarding.summary.description")}
      </p>

      <div className="onboarding-summary">
        <div className="onboarding-summary-group">
          <h3 className="onboarding-summary-title">
            {t("onboarding.summary.profile")}
          </h3>
          <dl className="onboarding-summary-list">
            <SummaryItem
              label={t("onboarding.summary.name")}
              value={fullName(profile.firstName, profile.lastName)}
            />
            <SummaryItem
              label={t("onboarding.summary.phone")}
              value={profile.phone}
            />
            <SummaryItem
              label={t("onboarding.summary.address")}
              value={profile.address}
            />
            <SummaryItem
              label={t("onboarding.summary.addressNote")}
              value={profile.addressNote}
            />
          </dl>
        </div>

        <div className="onboarding-summary-group">
          <h3 className="onboarding-summary-title">
            {t("onboarding.summary.agency")}
          </h3>
          <dl className="onboarding-summary-list">
            <SummaryItem
              label={t("onboarding.summary.name")}
              value={profile.agencyName}
            />
            <SummaryItem
              label={t("onboarding.summary.legalForm")}
              value={profile.legalForm}
            />
            <SummaryItem
              label={t("onboarding.summary.identifier")}
              value={profile.sirenSiret}
            />
            <SummaryItem
              label={t("onboarding.summary.address")}
              value={profile.agencyAddress}
            />
          </dl>
        </div>

        <div className="onboarding-summary-group">
          <h3 className="onboarding-summary-title">
            {t("onboarding.summary.property")}
          </h3>
          <dl className="onboarding-summary-list">
            <SummaryItem
              label={t("onboarding.summary.address")}
              value={property.propertyAddress}
            />
            <SummaryItem
              label={t("onboarding.summary.rent")}
              value={amountLabel(property.rentExclCharges)}
            />
            <SummaryItem
              label={t("onboarding.summary.charges")}
              value={amountLabel(property.charges)}
            />
          </dl>
        </div>

        <div className="onboarding-summary-group">
          <h3 className="onboarding-summary-title">
            {t("onboarding.summary.lease")}
          </h3>
          <dl className="onboarding-summary-list">
            <SummaryItem
              label={t("onboarding.summary.leaseType")}
              value={leaseTypeLabel}
            />
            {tenants.map((tenant, index) => (
              <SummaryItem
                key={`tenant-${index}`}
                label={tenantLabel(tenant, index)}
                value={fullName(tenant.firstName, tenant.lastName)}
              />
            ))}
          </dl>
        </div>
      </div>

      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}

      <div className="onboarding-actions">
        <Button variant="secondary" onClick={onBack} disabled={pending}>
          {t("onboarding.navigation.back")}
        </Button>
        <Button
          variant="primary"
          onClick={onFinalize}
          loading={pending}
          data-cy="onboarding-finalize"
        >
          {t("onboarding.navigation.finish")}
        </Button>
      </div>
    </section>
  );
}
