import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { parsePercentage } from "@/lib/format";
import { PERIODICITIES } from "@/pages/settings/settingsValues";
import {
  companyOnboardingMessage,
  type CompanyExpenseValues,
} from "./useCompanyOnboardingState";

interface ExpensesStepProps {
  values: CompanyExpenseValues[];
  pending: boolean;
  error: string | null;
  onBack: (values: CompanyExpenseValues[]) => void;
  onNext: (values: CompanyExpenseValues[]) => void;
  skipAction: ReactNode;
}

/** Company step 3: standard expense categories, rate and periodicity. */
export function OnboardingCompanyStepExpenses({
  values,
  pending,
  error,
  onBack,
  onNext,
  skipAction,
}: ExpensesStepProps) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<CompanyExpenseValues[]>(values);
  const [proRataErrors, setProRataErrors] = useState<Record<string, string>>(
    {},
  );

  function patch(code: string, changes: Partial<CompanyExpenseValues>) {
    setRows((current) =>
      current.map((row) => (row.code === code ? { ...row, ...changes } : row)),
    );
  }

  function submit() {
    const errors: Record<string, string> = {};
    for (const row of rows) {
      if (row.selected && parsePercentage(row.proRataPct) === null) {
        errors[row.code] = companyOnboardingMessage("proRata");
      }
    }
    setProRataErrors(errors);
    if (Object.keys(errors).length === 0) {
      onNext(rows);
    }
  }

  return (
    <section
      className="onboarding-card"
      aria-labelledby="company-expenses-title"
    >
      <h2 className="onboarding-section-title" id="company-expenses-title">
        {t("onboarding.company.expenses.title")}
      </h2>
      <p className="onboarding-section-description">
        {t("onboarding.company.expenses.description")}
      </p>

      <div
        className="company-onboarding-options"
        data-cy="company-expenses-form"
      >
        {rows.map((row) => (
          <div key={row.code} className="company-onboarding-option">
            <label className="onboarding-checkbox">
              <input
                type="checkbox"
                checked={row.selected}
                onChange={(event) =>
                  patch(row.code, { selected: event.target.checked })
                }
                data-cy={`input-company-expense-${row.code}`}
              />
              <span>
                {t(`onboarding.company.expenses.categories.${row.code}`)}
              </span>
            </label>
            {row.selected ? (
              <div className="company-onboarding-option-fields">
                <label
                  className="field-label"
                  htmlFor={`company-expense-prorata-${row.code}`}
                >
                  {t("onboarding.company.expenses.proRata")}
                </label>
                <input
                  id={`company-expense-prorata-${row.code}`}
                  className={cn(
                    "field company-onboarding-prorata",
                    proRataErrors[row.code] && "field-error",
                  )}
                  inputMode="decimal"
                  value={row.proRataPct}
                  onChange={(event) =>
                    patch(row.code, { proRataPct: event.target.value })
                  }
                  data-cy={`input-company-expense-prorata-${row.code}`}
                />
                <select
                  className="field"
                  aria-label={t("onboarding.company.expenses.periodicity", {
                    label: t(
                      `onboarding.company.expenses.categories.${row.code}`,
                    ),
                  })}
                  value={row.periodicity}
                  onChange={(event) =>
                    patch(row.code, { periodicity: event.target.value })
                  }
                  data-cy={`select-company-expense-periodicity-${row.code}`}
                >
                  {PERIODICITIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {proRataErrors[row.code] ? (
              <p className="error-text" role="alert">
                {proRataErrors[row.code]}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}

      <div className="onboarding-actions">
        {skipAction}
        <Button
          variant="ghost"
          data-cy="btn-company-back"
          onClick={() => onBack(rows)}
        >
          {t("onboarding.navigation.back")}
        </Button>
        <Button
          variant="primary"
          loading={pending}
          data-cy="btn-company-next"
          onClick={submit}
        >
          {t("onboarding.navigation.next")}
        </Button>
      </div>
    </section>
  );
}
