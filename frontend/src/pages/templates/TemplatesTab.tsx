import "./TemplatesTab.css";
import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TemplatesCard } from "./TemplatesCard";
import type { ConfigurationType } from "./templateTypes";

/**
 * Templates tab of a settings page: the card of one document type plus
 * the sandbox warning.
 */
export function TemplatesTab({
  configuration,
  embedded = false,
}: {
  configuration: ConfigurationType;
  embedded?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="templates-tab">
      <TemplatesCard configuration={configuration} embedded={embedded} />
      <div className="templates-tab-warning">
        <ShieldCheck
          size={16}
          className="templates-tab-warning-icon"
          aria-hidden="true"
        />
        <p>{t("templates.tab.warning")}</p>
      </div>
    </div>
  );
}
