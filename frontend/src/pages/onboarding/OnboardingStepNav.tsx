import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { ONBOARDING_STEP_KEYS } from "./useOnboardingState";

interface StepNavProps {
  currentStep: number;
}

/** Horizontal numbered steps bar for the onboarding wizard. */
export function OnboardingStepNav({ currentStep }: StepNavProps) {
  const { t } = useTranslation();

  return (
    <ol className="onboarding-steps" aria-label={t("onboarding.stepsAria")}>
      {ONBOARDING_STEP_KEYS.map((key, index) => (
        <li
          key={key}
          className={cn(
            "onboarding-step",
            index === currentStep && "onboarding-step-active",
          )}
          aria-current={index === currentStep ? "step" : undefined}
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
  );
}
