import { AlertTriangle, FileText } from "lucide-react";
import { formatMonth } from "@/lib/format";
import type { ExpenseStatementController } from "./useExpenseStatementPage";
import { ExpenseGenerationFooter } from "./ExpenseGenerationFooter";
import { ExpenseLinesTable } from "./ExpenseLinesTable";

/** Draft lines card: header badges, table or empty state, then totals. */
export function ExpenseLinesCard({
  controller: c,
}: {
  controller: ExpenseStatementController;
}) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Liste</p>
          <h2 className="mt-1 text-[22px] text-ink">Frais ajoutés</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {c.omittedTypes.length > 0 ? (
            <span
              className="badge badge-warning"
              title={`Il manque : ${c.omittedTypes.join(", ")}`}
            >
              <AlertTriangle size={11} aria-hidden="true" />
              Il manque : {c.omittedTypes.join(", ")}
            </span>
          ) : null}
          <span className="badge badge-neutral">
            {c.orderedLines.length} ligne{c.orderedLines.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div data-cy="liste-frais">
        {c.orderedLines.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-paper-deep/70 text-ink-soft">
              <FileText size={20} aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-semibold text-ink">
              Aucun frais pour {formatMonth(c.month)}
            </p>
            <p className="mt-1 max-w-sm text-xs text-ink-soft">
              Sélectionnez un type de frais ci-dessus, déposez un justificatif
              et ajoutez la ligne.
            </p>
          </div>
        ) : (
          <ExpenseLinesTable controller={c} />
        )}
      </div>

      <ExpenseGenerationFooter controller={c} />
    </div>
  );
}
