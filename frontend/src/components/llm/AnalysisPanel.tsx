import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import type { ExtractionDto } from "@/api/types";
import { AiBadge } from "@/components/ui/AiBadge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/States";
import { isAnalysisRunning, type AnalysisState } from "@/hooks/useAnalysis";
import { cn } from "@/lib/cn";
import { confidenceLabel, confidenceValid } from "./analysisConfidence";

export function AnalysisPanel({
  state: phase,
  hasFile,
  onCancel,
}: {
  state: AnalysisState;
  hasFile: boolean;
  onCancel: () => void;
}) {
  const inProgress = isAnalysisRunning(phase);
  const result: ExtractionDto | null =
    phase.status === "done" ? (phase.analysis.result ?? null) : null;
  const duration =
    phase.status === "done" && phase.analysis.durationMs
      ? `${(phase.analysis.durationMs / 1000).toFixed(1)} s`
      : null;

  return (
    <div
      data-cy="analyse-statut"
      aria-live="polite"
      className={cn(
        "rounded-xl border px-3.5 py-3 text-xs",
        phase.status === "failed"
          ? "border-warning/25 bg-warning-soft/40 text-warning"
          : phase.status === "done"
            ? "border-copper/20 bg-copper-soft/50 text-ink"
            : inProgress
              ? "border-accent/20 bg-accent-soft/45 text-ink"
              : "border-line bg-paper/50 text-ink-soft",
      )}
    >
      {inProgress ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-medium">
            <Spinner size={14} />
            {phase.status === "starting"
              ? "Préparation de l’analyse…"
              : "Analyse IA en cours — le modèle local peut prendre quelques secondes."}
          </span>
          <Button
            variant="ghost"
            small
            onClick={onCancel}
            data-cy="btn-annuler-analyse"
          >
            <X size={13} aria-hidden="true" />
            Annuler l’analyse
          </Button>
        </div>
      ) : phase.status === "done" ? (
        <div className="space-y-2">
          <p className="flex items-center gap-2 font-semibold text-ink">
            <CheckCircle2
              size={14}
              className="text-copper"
              aria-hidden="true"
            />
            Analyse terminée{duration ? ` en ${duration}` : ""} — les champs ont
            été pré-remplis et le montant détecté remplace la valeur saisie.
          </p>
          {result ? (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-soft">
              <AiBadge sourceExtract={result.sourceExcerpt} />
              {result.supplier ? (
                <span>Fournisseur détecté : {result.supplier}</span>
              ) : null}
              {confidenceLabel(confidenceValid(result.confidence)) ? (
                <span
                  className={cn(
                    confidenceValid(result.confidence) === "basse" &&
                      "font-semibold text-warning",
                  )}
                >
                  {confidenceLabel(confidenceValid(result.confidence))}
                </span>
              ) : null}
            </div>
          ) : (
            <p className="text-[11px]">
              Aucune information exploitable n’a été extraite. Complétez le
              frais manuellement.
            </p>
          )}
          {result?.sourceExcerpt ? (
            <p className="border-l-2 border-copper/30 pl-2 text-[11px] italic text-ink-soft">
              « {result.sourceExcerpt} »
            </p>
          ) : null}
          <p className="text-[11px] text-ink-soft">
            Les propositions de l’IA restent modifiables. Vérifiez-les avant
            d’ajouter le frais.
          </p>
        </div>
      ) : phase.status === "failed" ? (
        <p className="flex items-start gap-2">
          <AlertTriangle
            size={14}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <span>
            {phase.message} L’analyse est facultative : vous pouvez saisir le
            montant et le prorata manuellement.
          </span>
        </p>
      ) : phase.status === "cancelled" ? (
        <p>{phase.message} La saisie manuelle reste disponible.</p>
      ) : (
        <p>
          {hasFile
            ? "Analyse non lancée. Vous pouvez saisir le frais manuellement."
            : "Déposez un justificatif : l’analyse IA démarrera automatiquement. Elle reste facultative."}
        </p>
      )}
    </div>
  );
}
