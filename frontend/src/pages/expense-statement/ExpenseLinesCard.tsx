import "./ExpenseLinesCard.css";
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
          <h2 className="expense-lines-card-title">Frais ajoutés</h2>
        </div>
        <div className="expense-lines-card-badges">
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
          <div className="expense-lines-card-empty">
            <span className="expense-lines-card-empty-icon">
              <FileText size={20} aria-hidden="true" />
            </span>
            <p className="expense-lines-card-empty-title">
              Aucun frais pour {formatMonth(c.month)}
            </p>
            <p className="expense-lines-card-empty-text">
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
