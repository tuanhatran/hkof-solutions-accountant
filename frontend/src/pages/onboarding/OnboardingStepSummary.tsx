import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatEUR, parseAmount } from "@/lib/format";
import { fullName, type OnboardingDraft } from "./useOnboardingState";

interface SummaryStepProps {
  draft: OnboardingDraft;
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onFinalize: () => void;
}

function amountLabel(value?: string): string {
  const normalized = parseAmount(value ?? "");
  return normalized === null ? "—" : formatEUR(normalized);
}

function SummaryItem({ label, value }: { label: string; value?: string }) {
  if (!value || value.trim() === "") {
    return null;
  }
  return (
    <>
      <dt className="onboarding-summary-term">{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

/** Step 4: read-only recap of every value before final persistence. */
export function OnboardingStepSummary({
  draft,
  pending,
  error,
  onBack,
  onFinalize,
}: SummaryStepProps) {
  const { t } = useTranslation();
  const { profile, properties, lease, tenants } = draft;
  const leaseTypeLabel =
    lease.leaseType === "colocation"
      ? t("onboarding.summary.colocation")
      : t("onboarding.summary.privateIndividual");

  const selectedProperty =
    properties.find((p) => p.id === lease.propertyId) ?? properties[0];

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
          {properties.map((prop, idx) => (
            <div
              key={prop.id}
              className={cn(
                "space-y-1",
                idx > 0 && "mt-3 pt-3 border-t border-line/60",
              )}
            >
              <h4 className="text-xs font-semibold text-ink-soft">
                {t("onboarding.summary.propertyItem", { index: idx + 1 })}
              </h4>
              <dl className="onboarding-summary-list">
                <SummaryItem
                  label={t("onboarding.summary.address")}
                  value={prop.propertyAddress}
                />
                <SummaryItem
                  label={t("onboarding.summary.landlord")}
                  value={fullName(
                    prop.landlordFirstName,
                    prop.landlordLastName,
                  )}
                />
                <SummaryItem
                  label={t("onboarding.summary.phone")}
                  value={prop.landlordPhone}
                />
                <SummaryItem
                  label={t("onboarding.summary.email")}
                  value={prop.landlordEmail}
                />
                <SummaryItem
                  label={t("onboarding.summary.addressNote")}
                  value={prop.landlordAddressNote}
                />
              </dl>
            </div>
          ))}
        </div>

        <div className="onboarding-summary-group">
          <h3 className="onboarding-summary-title">
            {t("onboarding.summary.lease")}
          </h3>
          <dl className="onboarding-summary-list">
            <SummaryItem
              label={t("onboarding.summary.address")}
              value={selectedProperty?.propertyAddress}
            />
            <SummaryItem
              label={t("onboarding.summary.leaseType")}
              value={leaseTypeLabel}
            />
            {lease.leaseType === "colocation" ? (
              <>
                <SummaryItem
                  label={t("onboarding.summary.totalRent")}
                  value={amountLabel(lease.rentExclCharges)}
                />
                <SummaryItem
                  label={t("onboarding.summary.totalCharges")}
                  value={amountLabel(lease.charges)}
                />
                {tenants.map((tenant, index) => (
                  <SummaryItem
                    key={`tenant-${index}`}
                    label={t("onboarding.summary.tenant", { index: index + 1 })}
                    value={fullName(tenant.firstName, tenant.lastName)}
                  />
                ))}
              </>
            ) : (
              tenants.map((tenant, index) => (
                <div
                  key={`tenant-${index}`}
                  className="sm:col-span-2 grid sm:grid-cols-2 gap-1 pt-2 border-t border-line/40 first:border-0 first:pt-0"
                >
                  <SummaryItem
                    label={t("onboarding.summary.tenant", { index: index + 1 })}
                    value={fullName(tenant.firstName, tenant.lastName)}
                  />
                  <div className="sm:col-span-2 text-xs text-ink-soft">
                    {t("onboarding.summary.rent")} :{" "}
                    {amountLabel(tenant.rentExclCharges)} ·{" "}
                    {t("onboarding.summary.charges")} :{" "}
                    {amountLabel(tenant.charges)}
                  </div>
                </div>
              ))
            )}
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
