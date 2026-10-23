import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { TemplatesCard } from "./TemplatesCard";
import { TYPES } from "./templateTypes";

/** Templates settings page: one card per document type. */
export function TemplatesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Réglages"
        title="Templates"
        description="Personnalisez les documents générés sans toucher au calcul : le backend fournit les montants déjà formatés, votre modèle HTML ne fait que les mettre en page."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        {TYPES.map((configuration) => (
          <TemplatesCard
            key={configuration.type}
            configuration={configuration}
          />
        ))}
      </div>
      <div className="mt-6 flex items-start gap-2 rounded-2xl border border-warning/20 bg-warning-soft/50 px-4 py-3 text-xs leading-relaxed text-warning">
        <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          Les templates ne peuvent exécuter aucun code : Mustache sans logique,
          HTML assaini, images en data URI uniquement, aucune ressource
          distante. Un fichier refusé affiche les erreurs de validation sans
          être enregistré.
        </p>
      </div>
    </>
  );
}
