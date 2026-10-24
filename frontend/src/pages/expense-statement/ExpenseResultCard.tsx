import "./ExpenseResultCard.css";
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
          <p className="expense-result-card-title">Note de frais générée</p>
          <p className="expense-result-card-meta">
            {formatMonth(result.month)} · version {result.version ?? 1} ·{" "}
            {formatEUR(result.total)}
          </p>
          <p className="expense-result-card-note">
            Enregistrée avec le template «{" "}
            {result.templateName ?? c.currentTemplate} » v
            {result.templateVersion ?? 1} le {formatDateTime(result.createdAt)}.
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
          Télécharger la note seule
        </Button>
        <Button
          variant="secondary"
          small
          icon={<Download size={14} />}
          onClick={() => void c.downloadStatement(result, true)}
          data-cy="btn-telecharger-note-complete"
        >
          Télécharger la note complète (ZIP)
        </Button>
        {result.id ? (
          <a
            href={api.expenseStatements.pdfUrl(result.id, false)}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-small"
          >
            <ExternalLink size={14} aria-hidden="true" />
            Ouvrir
          </a>
        ) : null}
      </div>
    </div>
  );
}
