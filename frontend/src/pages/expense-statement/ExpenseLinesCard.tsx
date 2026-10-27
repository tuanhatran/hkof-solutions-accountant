import "./ExpenseLinesCard.css";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <p className="eyebrow">{t("expenseStatement.lines.eyebrow")}</p>
          <h2 className="expense-lines-card-title">
            {t("expenseStatement.lines.title")}
          </h2>
        </div>
        <div className="expense-lines-card-badges">
          {c.omittedTypes.length > 0 ? (
            <span
              className="badge badge-warning"
              title={t("expenseStatement.lines.missing", {
                types: c.omittedTypes.join(", "),
              })}
            >
              <AlertTriangle size={11} aria-hidden="true" />
              {t("expenseStatement.lines.missing", {
                types: c.omittedTypes.join(", "),
              })}
            </span>
          ) : null}
          <span className="badge badge-neutral">
            {t("expenseStatement.lines.count", {
              count: c.orderedLines.length,
            })}
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
              {t("expenseStatement.lines.emptyTitle", {
                month: formatMonth(c.month),
              })}
            </p>
            <p className="expense-lines-card-empty-text">
              {t("expenseStatement.lines.emptyText")}
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
