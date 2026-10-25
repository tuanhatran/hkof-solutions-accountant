import "./TemplatesTab.css";
import { ShieldCheck } from "lucide-react";
import { TemplatesCard } from "./TemplatesCard";
import type { ConfigurationType } from "./templateTypes";

/**
 * Templates tab of a settings page: the card of one document type plus
 * the sandbox warning.
 */
export function TemplatesTab({
  configuration,
}: {
  configuration: ConfigurationType;
}) {
  return (
    <div className="templates-tab">
      <TemplatesCard configuration={configuration} />
      <div className="templates-tab-warning">
        <ShieldCheck
          size={16}
          className="templates-tab-warning-icon"
          aria-hidden="true"
        />
        <p>
          Les templates ne peuvent exécuter aucun code : Mustache sans logique,
          HTML assaini, images en data URI uniquement, aucune ressource
          distante. Un fichier refusé affiche les erreurs de validation sans
          être enregistré.
        </p>
      </div>
    </div>
  );
}
