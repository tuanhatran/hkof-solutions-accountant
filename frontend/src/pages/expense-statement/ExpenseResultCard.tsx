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
      <div className="flex items-start gap-3 bg-accent-soft/60 px-5 py-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white">
          <FileCheck2 size={19} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-accent">
            Note de frais générée
          </p>
          <p className="mt-0.5 text-sm text-ink">
            {formatMonth(result.month)} · version {result.version ?? 1} ·{" "}
            {formatEUR(result.total)}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            Enregistrée avec le template «{" "}
            {result.templateName ?? c.currentTemplate} » v
            {result.templateVersion ?? 1} le{" "}
            {formatDateTime(result.createdAt)}.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 px-5 py-4">
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
