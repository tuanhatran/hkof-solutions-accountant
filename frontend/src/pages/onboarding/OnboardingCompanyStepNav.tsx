import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { COMPANY_ONBOARDING_STEP_KEYS } from "./useCompanyOnboardingState";

interface CompanyStepNavProps {
  currentStep: number;
}

/** Horizontal numbered steps bar of the five-step company wizard. */
export function OnboardingCompanyStepNav({ currentStep }: CompanyStepNavProps) {
  const { t } = useTranslation();

  return (
    <ol
      className="onboarding-steps"
      aria-label={t("onboarding.company.stepsAria")}
      data-cy="company-onboarding-steps"
    >
      {COMPANY_ONBOARDING_STEP_KEYS.map((key, index) => (
        <li
          key={key}
          className={cn(
            "onboarding-step",
            index === currentStep && "onboarding-step-active",
          )}
          aria-current={index === currentStep ? "step" : undefined}
          aria-label={t("onboarding.stepLabel", {
            current: index + 1,
            total: COMPANY_ONBOARDING_STEP_KEYS.length,
            label: t(`onboarding.company.steps.${key}`),
          })}
          data-cy={`company-step-${key}`}
        >
          <span className="onboarding-step-index" aria-hidden="true">
            {index + 1}
          </span>
          {t(`onboarding.company.steps.${key}`)}
        </li>
      ))}
    </ol>
  );
}
