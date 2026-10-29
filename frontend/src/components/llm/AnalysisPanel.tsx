import "./AnalysisPanel.css";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const inProgress = isAnalysisRunning(phase);
  const result: ExtractionDto | null =
    phase.status === "done" ? (phase.analysis.result ?? null) : null;
  const duration =
    phase.status === "done" && phase.analysis.durationMs
      ? `${(phase.analysis.durationMs / 1000).toFixed(1)} s`
      : null;

  return (
    <div
      data-cy="analysis-status"
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
              ? t("expenseStatement.analysis.starting")
              : t("expenseStatement.analysis.running")}
          </span>
          <Button
            variant="ghost"
            small
            onClick={onCancel}
            data-cy="btn-cancel-analysis"
          >
            <X size={13} aria-hidden="true" />
            {t("expenseStatement.analysis.cancel")}
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
            {duration
              ? t("expenseStatement.analysis.doneWithDuration", { duration })
              : t("expenseStatement.analysis.done")}
          </p>
          {result ? (
            <div className="analysis-panel-meta">
              <AiBadge sourceExtract={result.sourceExcerpt} />
              {result.supplier ? (
                <span>
                  {t("expenseStatement.fields.supplierDetected", {
                    supplier: result.supplier,
                  })}
                </span>
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
              {t("expenseStatement.analysis.noResult")}
            </p>
          )}
          {result?.sourceExcerpt ? (
            <p className="analysis-panel-excerpt">
              {t("expenseStatement.analysis.excerpt", {
                excerpt: result.sourceExcerpt,
              })}
            </p>
          ) : null}
          <p className="analysis-panel-hint">
            {t("expenseStatement.analysis.hint")}
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
            {phase.message} {t("expenseStatement.analysis.failureSuffix")}
          </span>
        </p>
      ) : phase.status === "cancelled" ? (
        <p>
          {phase.message} {t("expenseStatement.analysis.cancelledSuffix")}
        </p>
      ) : (
        <p>
          {hasFile
            ? t("expenseStatement.analysis.idleWithFile")
            : t("expenseStatement.analysis.idleWithoutFile")}
        </p>
      )}
    </div>
  );
}
