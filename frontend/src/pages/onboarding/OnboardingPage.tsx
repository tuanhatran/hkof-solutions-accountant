import "./OnboardingPage.css";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthState, useModuleAccess } from "@/api/queries";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { OnboardingAgencyWizard } from "./OnboardingAgencyWizard";
import { OnboardingCompanyWizard } from "./OnboardingCompanyWizard";
import {
  OnboardingTrackSelector,
  type OnboardingTrack,
} from "./OnboardingTrackSelector";

/**
 * `/welcome`: a company-only account opens the company wizard, an LMNP-only
 * account the agency wizard and an account with both modules chooses its track.
 */
export function OnboardingPage() {
  const { t } = useTranslation();
  const { user } = useAuthState();
  const access = useModuleAccess();
  const [selectedTrack, setSelectedTrack] = useState<OnboardingTrack>("agency");

  const forcedTrack: OnboardingTrack | null = access.companyEnabled
    ? access.lmnpEnabled
      ? null
      : "company"
    : "agency";
  const track = forcedTrack ?? selectedTrack;

  return (
    <div className="onboarding-page">
      <main className="onboarding-shell">
        <header className="onboarding-header">
          <div className="onboarding-header-top">
            <p className="eyebrow">{t("onboarding.eyebrow")}</p>
            <div className="onboarding-header-actions">
              <LanguageSelector />
            </div>
          </div>
          <h1 className="onboarding-title">{t("onboarding.title")}</h1>
          <p className="onboarding-description">
            {t(
              track === "company"
                ? "onboarding.company.description"
                : "onboarding.description",
            )}
          </p>
          <p className="onboarding-session">
            {t("onboarding.connectedAs", { email: user?.email ?? "" })}
          </p>
        </header>

        {access.companyEnabled && access.lmnpEnabled ? (
          <OnboardingTrackSelector track={track} onChange={setSelectedTrack} />
        ) : null}

        {track === "company" ? (
          <OnboardingCompanyWizard />
        ) : (
          <OnboardingAgencyWizard />
        )}
      </main>
    </div>
  );
}
