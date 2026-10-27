import "./ValidationReport.css";
import { Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ValidationReportDto } from "@/api/types";
import { cn } from "@/lib/cn";

function BadgeStructure({ valid }: { valid: boolean }) {
  const { t } = useTranslation();
  return (
    <span className={cn("badge", valid ? "badge-accent" : "badge-danger")}>
      {valid ? (
        <Check size={12} aria-hidden="true" />
      ) : (
        <X size={12} aria-hidden="true" />
      )}
      {valid
        ? t("templates.report.structureValid")
        : t("templates.report.structureInvalid")}
    </span>
  );
}

function VariableList({
  title,
  variables,
  tone,
}: {
  title: string;
  variables: string[];
  tone: "accent" | "danger" | "warning";
}) {
  if (variables.length === 0) {
    return null;
  }
  return (
    <div>
      <p className="validation-report-variable-title">{title}</p>
      <div className="validation-report-variables">
        {variables.map((variable) => (
          <code
            key={variable}
            className={cn(
              "validation-report-variable",
              tone === "danger"
                ? "validation-report-variable-danger"
                : tone === "warning"
                  ? "validation-report-variable-warning"
                  : "validation-report-variable-accent",
            )}
          >
            {variable}
          </code>
        ))}
      </div>
    </div>
  );
}

/** Server-side validation report of an imported template. */
export function ValidationReport({ report }: { report: ValidationReportDto }) {
  const { t } = useTranslation();
  const recognizedVariables = report.recognizedVariables ?? [];
  const unknownVariables = report.unknownVariables ?? [];
  const missingVariables = report.missingVariables ?? [];
  const errorList = report.errors ?? [];

  return (
    <div className="validation-report" data-cy="rapport-validation-template">
      <div className="validation-report-header">
        <p className="validation-report-title">{t("templates.report.title")}</p>
        <BadgeStructure valid={Boolean(report.structureValid)} />
      </div>
      <VariableList
        title={t("templates.report.recognized", {
          count: recognizedVariables.length,
        })}
        variables={recognizedVariables}
        tone="accent"
      />
      <VariableList
        title={t("templates.report.unknown", {
          count: unknownVariables.length,
        })}
        variables={unknownVariables}
        tone="danger"
      />
      <VariableList
        title={t("templates.report.missing", {
          count: missingVariables.length,
        })}
        variables={missingVariables}
        tone="warning"
      />
      {errorList.length > 0 ? (
        <div className="validation-report-errors">
          <p className="validation-report-errors-title">
            {t("templates.report.errors")}
          </p>
          <ul className="validation-report-errors-list">
            {errorList.map((errorText) => (
              <li key={errorText}>{errorText}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {missingVariables.length > 0 && errorList.length === 0 ? (
        <p className="validation-report-warning">
          {t("templates.report.warning")}
        </p>
      ) : null}
    </div>
  );
}
