import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";

/** Skip control shared by the action footer of every onboarding step. */
export function OnboardingSkipButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();

  return (
    <Button
      className="onboarding-skip"
      variant="ghost"
      small
      type="button"
      data-cy="btn-skip-onboarding"
      onClick={onClick}
    >
      {t("onboarding.skipToDashboard")}
    </Button>
  );
}
