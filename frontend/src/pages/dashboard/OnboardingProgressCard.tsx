import "./OnboardingProgressCard.css";
import { ArrowRight, CheckCircle2, Compass } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAuthState } from "@/api/queries";
import { cn } from "@/lib/cn";
import { loadOnboardingDraft } from "@/pages/onboarding/useOnboardingPersistence";
import { ONBOARDING_STEP_KEYS } from "@/pages/onboarding/useOnboardingState";

export function OnboardingProgressCard() {
  const { t } = useTranslation();
  const { user } = useAuthState();
  const savedState = loadOnboardingDraft(user?.email);
  const currentStep = savedState?.step ?? 0;

  return (
    <section
      className="onboarding-progress-card"
      data-cy="onboarding-progress-card"
      data-testid="onboarding-progress-card"
      aria-label={t("dashboard.onboardingProgress.title")}
    >
      <div className="onboarding-progress-header">
        <div className="onboarding-progress-info">
          <div className="onboarding-progress-icon" aria-hidden="true">
            <Compass size={22} />
          </div>
          <div>
            <h2 className="onboarding-progress-title">
              {t("dashboard.onboardingProgress.title")}
            </h2>
            <p className="onboarding-progress-description">
              {t("dashboard.onboardingProgress.description")}
            </p>
          </div>
        </div>
        <Link
          to="/welcome"
          className="onboarding-progress-resume-btn"
          data-cy="btn-resume-onboarding"
          data-testid="btn-resume-onboarding"
        >
          <span>{t("dashboard.onboardingProgress.resume")}</span>
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>

      <div className="onboarding-progress-steps">
        {ONBOARDING_STEP_KEYS.map((key, index) => {
          const isDone = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div
              key={key}
              className={cn(
                "onboarding-progress-step",
                isCurrent && "onboarding-progress-step-active",
              )}
            >
              <div className="onboarding-progress-step-name">
                <span
                  className={cn(
                    "onboarding-progress-step-index",
                    isDone
                      ? "text-emerald-600 dark:text-emerald-400"
                      : isCurrent
                        ? "text-accent"
                        : "text-ink-soft",
                  )}
                  aria-hidden="true"
                >
                  {isDone ? <CheckCircle2 size={14} /> : index + 1}
                </span>
                <span>{t(`onboarding.steps.${key}`)}</span>
              </div>
              <span
                className={cn(
                  "onboarding-progress-badge",
                  isDone && "onboarding-progress-badge-done",
                  isCurrent && "onboarding-progress-badge-current",
                  !isDone && !isCurrent && "onboarding-progress-badge-pending",
                )}
              >
                {isDone
                  ? t("dashboard.onboardingProgress.completed")
                  : isCurrent
                    ? t("dashboard.onboardingProgress.current")
                    : t("dashboard.onboardingProgress.pending")}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
