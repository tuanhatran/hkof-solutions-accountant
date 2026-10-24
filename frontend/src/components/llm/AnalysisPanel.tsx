import "./AnalysisPanel.css";
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
        "analysis-panel",
        phase.status === "failed"
          ? "analysis-panel-failed"
          : phase.status === "done"
            ? "analysis-panel-done"
            : inProgress
              ? "analysis-panel-running"
              : "analysis-panel-idle",
      )}
    >
      {inProgress ? (
        <div className="analysis-panel-progress">
          <span className="analysis-panel-progress-text">
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
        <div className="analysis-panel-result">
          <p className="analysis-panel-result-title">
            <CheckCircle2
              size={14}
              className="analysis-panel-result-icon"
              aria-hidden="true"
            />
            Analyse terminée{duration ? ` en ${duration}` : ""} — les champs ont
            été pré-remplis et le montant détecté remplace la valeur saisie.
          </p>
          {result ? (
            <div className="analysis-panel-meta">
              <AiBadge sourceExtract={result.sourceExcerpt} />
              {result.supplier ? (
                <span>Fournisseur détecté : {result.supplier}</span>
              ) : null}
              {confidenceLabel(confidenceValid(result.confidence)) ? (
                <span
                  className={cn(
                    confidenceValid(result.confidence) === "basse" &&
                      "analysis-panel-confidence-low",
                  )}
                >
                  {confidenceLabel(confidenceValid(result.confidence))}
                </span>
              ) : null}
            </div>
          ) : (
            <p className="analysis-panel-note">
              Aucune information exploitable n’a été extraite. Complétez le
              frais manuellement.
            </p>
          )}
          {result?.sourceExcerpt ? (
            <p className="analysis-panel-excerpt">« {result.sourceExcerpt} »</p>
          ) : null}
          <p className="analysis-panel-hint">
            Les propositions de l’IA restent modifiables. Vérifiez-les avant
            d’ajouter le frais.
          </p>
        </div>
      ) : phase.status === "failed" ? (
        <p className="analysis-panel-failure">
          <AlertTriangle
            size={14}
            className="analysis-panel-failure-icon"
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
