import "./ExpenseResultCard.css";
import { useTranslation } from "react-i18next";
import { Download, ExternalLink, FileCheck2 } from "lucide-react";
import { api } from "@/api/endpoints";
import { Button } from "@/components/ui/Button";
import { formatDateTime, formatEUR, formatMonth } from "@/lib/format";
import type { ExpenseStatementController } from "./useExpenseStatementPage";

/** Success card shown once a statement version has been generated. */
export function ExpenseResultCard({
  controller: c,
}: {
  controller: ExpenseStatementController;
}) {
  const { t } = useTranslation();
  if (!c.result) {
    return null;
  }
  const result = c.result;
  return (
    <div className="card animation-fade overflow-hidden border-accent/25">
      <div className="expense-result-card-head">
        <span className="expense-result-card-icon">
          <FileCheck2 size={19} aria-hidden="true" />
        </span>
        <div className="expense-result-card-body">
          <p className="expense-result-card-title">
            {t("expenseStatement.result.title")}
          </p>
          <p className="expense-result-card-meta">
            {t("expenseStatement.result.meta", {
              month: formatMonth(result.month),
              version: result.version ?? 1,
              total: formatEUR(result.total),
            })}
          </p>
          <p className="expense-result-card-note">
            {t("expenseStatement.result.recorded", {
              name: result.templateName ?? c.currentTemplate,
              version: result.templateVersion ?? 1,
              date: formatDateTime(result.createdAt),
            })}
          </p>
        </div>
      </div>
      <div className="expense-result-card-actions">
        <Button
          variant="primary"
          small
          icon={<Download size={14} />}
          onClick={() => void c.downloadStatement(result, false)}
          data-cy="btn-telecharger-note"
        >
          {t("expenseStatement.result.download")}
        </Button>
        <Button
          variant="secondary"
          small
          icon={<Download size={14} />}
          onClick={() => void c.downloadStatement(result, true)}
          data-cy="btn-telecharger-note-complete"
        >
          {t("expenseStatement.result.downloadComplete")}
        </Button>
        {result.id ? (
          <a
            href={api.expenseStatements.pdfUrl(result.id, false)}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-small"
          >
            <ExternalLink size={14} aria-hidden="true" />
            {t("expenseStatement.result.open")}
          </a>
        ) : null}
      </div>
    </div>
  );
}
