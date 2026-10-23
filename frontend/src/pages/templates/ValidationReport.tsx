import { Check, X } from "lucide-react";
import type { ValidationReportDto } from "@/api/types";
import { cn } from "@/lib/cn";

function BadgeStructure({ valid }: { valid: boolean }) {
  return (
    <span className={cn("badge", valid ? "badge-accent" : "badge-danger")}>
      {valid ? (
        <Check size={12} aria-hidden="true" />
      ) : (
        <X size={12} aria-hidden="true" />
      )}
      {valid ? "Structure valide" : "Structure invalide"}
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
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft">
        {title}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {variables.map((variable) => (
          <code
            key={variable}
            className={cn(
              "rounded-md border px-1.5 py-0.5 font-mono text-[11px]",
              tone === "danger"
                ? "border-danger/25 bg-danger-soft text-danger"
                : tone === "warning"
                  ? "border-warning/25 bg-warning-soft text-warning"
                  : "border-accent/15 bg-accent-soft text-accent",
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
  const recognizedVariables = report.recognizedVariables ?? [];
  const unknownVariables = report.unknownVariables ?? [];
  const missingVariables = report.missingVariables ?? [];
  const errorList = report.errors ?? [];

  return (
    <div
      className="space-y-3 rounded-xl border border-line bg-paper/45 p-4"
      data-cy="rapport-validation-template"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">Rapport de validation</p>
        <BadgeStructure valid={Boolean(report.structureValid)} />
      </div>
      <VariableList
        title={`Variables reconnues (${recognizedVariables.length})`}
        variables={recognizedVariables}
        tone="accent"
      />
      <VariableList
        title={`Variables inconnues (${unknownVariables.length})`}
        variables={unknownVariables}
        tone="danger"
      />
      <VariableList
        title={`Obligatoires manquantes (${missingVariables.length})`}
        variables={missingVariables}
        tone="warning"
      />
      {errorList.length > 0 ? (
        <div className="rounded-lg border border-danger/20 bg-danger-soft/60 p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-danger">
            Erreurs
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-danger">
            {errorList.map((errorText) => (
              <li key={errorText}>{errorText}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {missingVariables.length > 0 && errorList.length === 0 ? (
        <p className="text-xs text-warning">
          Avertissement : le modèle sera accepté, mais les champs obligatoires
          absents apparaîtront vides dans le document.
        </p>
      ) : null}
    </div>
  );
}
