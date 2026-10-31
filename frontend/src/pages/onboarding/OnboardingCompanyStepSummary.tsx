import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { formatEUR, formatPercentage } from "@/lib/format";
import { employeeTitleLabel } from "@/pages/settings/settingsValues";
import { amountOf } from "./useOnboardingState";
import {
  proRataPreview,
  type CompanyOnboardingDraft,
} from "./useCompanyOnboardingState";

interface SummaryStepProps {
  draft: CompanyOnboardingDraft;
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onFinalize: () => void;
  skipAction: ReactNode;
}

/** Company step 5: review every captured value before the resumable finalize. */
export function OnboardingCompanyStepSummary({
  draft,
  pending,
  error,
  onBack,
  onFinalize,
  skipAction,
}: SummaryStepProps) {
  const { t } = useTranslation();
  const selectedExpenses = draft.expenses.filter((expense) => expense.selected);

  return (
    <section
      className="onboarding-card"
      aria-labelledby="company-summary-title"
    >
      <h2 className="onboarding-section-title" id="company-summary-title">
        {t("onboarding.company.summary.title")}
      </h2>
      <p className="onboarding-section-description">
        {t("onboarding.company.summary.description")}
      </p>

      <div className="onboarding-summary" data-cy="company-summary">
        <div className="onboarding-summary-group">
          <h3 className="onboarding-summary-title">
            {t("onboarding.company.summary.identity")}
          </h3>
          <dl className="onboarding-summary-list">
            <div>
              <dt className="onboarding-summary-term">
                {t("onboarding.company.identity.name")}
              </dt>
              <dd>{draft.identity.name}</dd>
            </div>
            <div>
              <dt className="onboarding-summary-term">
                {t("onboarding.company.identity.legalForm")}
              </dt>
              <dd>{draft.identity.legalForm || "—"}</dd>
            </div>
            <div>
              <dt className="onboarding-summary-term">
                {t("onboarding.company.summary.identifier")}
              </dt>
              <dd>
                {draft.identity.siren || "—"}
                {draft.identity.siret ? ` / ${draft.identity.siret}` : ""}
              </dd>
            </div>
            <div>
              <dt className="onboarding-summary-term">
                {t("onboarding.company.identity.address")}
              </dt>
              <dd>{draft.identity.address || "—"}</dd>
            </div>
            <div>
              <dt className="onboarding-summary-term">
                {t("onboarding.company.identity.managerName")}
              </dt>
              <dd>{draft.identity.managerName || "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="onboarding-summary-group">
          <h3 className="onboarding-summary-title">
            {t("onboarding.company.summary.lease")}
          </h3>
          <dl className="onboarding-summary-list">
            <div>
              <dt className="onboarding-summary-term">
                {t("onboarding.company.lease.propertyAddress")}
              </dt>
              <dd>{draft.lease.propertyAddress}</dd>
            </div>
            <div>
              <dt className="onboarding-summary-term">
                {t("onboarding.company.summary.areas")}
              </dt>
              <dd>
                {draft.lease.totalArea} / {draft.lease.businessArea} m²
              </dd>
            </div>
            <div>
              <dt className="onboarding-summary-term">
                {t("onboarding.company.lease.proRataLabel")}
              </dt>
              <dd>
                {proRataPreview(
                  draft.lease.totalArea,
                  draft.lease.businessArea,
                )}
              </dd>
            </div>
            <div>
              <dt className="onboarding-summary-term">
                {t("onboarding.company.lease.rent")}
              </dt>
              <dd>{formatEUR(amountOf(draft.lease.rentExclCharges))}</dd>
            </div>
            <div>
              <dt className="onboarding-summary-term">
                {t("onboarding.company.lease.charges")}
              </dt>
              <dd>{formatEUR(amountOf(draft.lease.charges))}</dd>
            </div>
            <div>
              <dt className="onboarding-summary-term">
                {t("onboarding.company.lease.landlordName")}
              </dt>
              <dd>{draft.lease.landlordName}</dd>
            </div>
          </dl>
        </div>

        <div className="onboarding-summary-group">
          <h3 className="onboarding-summary-title">
            {t("onboarding.company.summary.expenses")}
          </h3>
          <dl className="onboarding-summary-list">
            {selectedExpenses.map((expense) => (
              <div key={expense.code}>
                <dt className="onboarding-summary-term">
                  {t(`onboarding.company.expenses.categories.${expense.code}`)}
                </dt>
                <dd>{formatPercentage(expense.proRataPct)}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="onboarding-summary-group">
          <h3 className="onboarding-summary-title">
            {t("onboarding.company.summary.employees")}
          </h3>
          <dl className="onboarding-summary-list">
            {draft.employees.map((employee, index) => (
              <div key={index}>
                <dt className="onboarding-summary-term">
                  {`${employee.firstName} ${employee.lastName}`.trim()}
                </dt>
                <dd>{employeeTitleLabel(employee.title, t)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {error ? (
        <p className="error-text" role="alert" data-cy="company-finalize-error">
          {error}
        </p>
      ) : null}

      <div className="onboarding-actions">
        {skipAction}
        <Button
          variant="ghost"
          data-cy="btn-company-back"
          onClick={onBack}
          disabled={pending}
        >
          {t("onboarding.navigation.back")}
        </Button>
        <Button
          variant="primary"
          loading={pending}
          data-cy="btn-finalize-company-onboarding"
          onClick={onFinalize}
        >
          {t("onboarding.navigation.finish")}
        </Button>
      </div>
    </section>
  );
}
