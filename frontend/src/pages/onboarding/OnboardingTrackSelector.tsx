import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export type OnboardingTrack = "agency" | "company";

interface TrackSelectorProps {
  track: OnboardingTrack;
  onChange: (track: OnboardingTrack) => void;
}

/** Chooses between the LMNP agency wizard and the company wizard. */
export function OnboardingTrackSelector({
  track,
  onChange,
}: TrackSelectorProps) {
  const { t } = useTranslation();
  const options: { value: OnboardingTrack; labelKey: string }[] = [
    { value: "agency", labelKey: "onboarding.tracks.agency" },
    { value: "company", labelKey: "onboarding.tracks.company" },
  ];

  return (
    <div
      className="onboarding-tracks"
      role="group"
      aria-label={t("onboarding.tracks.aria")}
      data-cy="onboarding-track-selector"
    >
      {options.map((option) => (
        <Button
          key={option.value}
          variant="ghost"
          className={cn(
            "onboarding-track",
            track === option.value && "onboarding-track-active",
          )}
          aria-pressed={track === option.value}
          data-cy={`btn-onboarding-track-${option.value}`}
          onClick={() => onChange(option.value)}
        >
          {t(option.labelKey)}
        </Button>
      ))}
    </div>
  );
}
