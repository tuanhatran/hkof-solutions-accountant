import "./StatementMonthPanel.css";
import { FileCheck2, FilePlus2, PencilLine } from "lucide-react";
import { api } from "@/api/endpoints";
import type { StatementDto } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { formatDateTime, formatEUR } from "@/lib/format";
import { PdfActionLink, OpenPdfLink, VersionBadge } from "./HistoryActions";
import { current, type AddressGroup } from "./historyHelpers";

/** Expense statement column of one address: latest version, actions, history. */
export function StatementMonthPanel({
  month,
  address,
  suffix,
  onCreate,
  onReload,
}: {
  month: string;
  address: AddressGroup;
  suffix: string;
  onCreate: (month: string) => void;
  onReload: (statement: StatementDto) => void;
}) {
  const statement = current(address.statements);
  return (
    <div className="statement-month-panel">
      <div className="statement-month-panel-header">
        <div className="statement-month-panel-heading">
          <span className="statement-month-panel-icon">
            <FileCheck2 size={17} aria-hidden="true" />
          </span>
          <div>
            <h3 className="statement-month-panel-title">
              Note de frais d’occupation
            </h3>
            {statement ? (
              <p className="statement-month-panel-meta">
                Version {statement.version ?? 1} ·{" "}
                {formatDateTime(statement.createdAt)}
                {statement.templateName
                  ? ` · ${statement.templateName} v${statement.templateVersion ?? 1}`
                  : ""}
              </p>
            ) : (
              <p className="statement-month-panel-meta">
                Aucune version pour ce mois.
              </p>
            )}
          </div>
        </div>
        {statement ? (
          <p className="number statement-month-panel-total">
            {formatEUR(statement.total)}
          </p>
        ) : null}
      </div>

      {statement ? (
        <div className="statement-month-panel-actions">
          {statement.id ? (
            <>
              <PdfActionLink
                href={api.expenseStatements.pdfUrl(statement.id, false)}
                label="Note seule"
                dataCy={`btn-telecharger-note-${month}${suffix}`}
              />
              <PdfActionLink
                href={api.expenseStatements.zipUrl(statement.id)}
                label="Note complète (ZIP)"
                dataCy={`btn-telecharger-note-complete-${month}${suffix}`}
              />
              <OpenPdfLink
                href={api.expenseStatements.pdfUrl(statement.id, true)}
              />
            </>
          ) : null}
          <Button
            variant="ghost"
            small
            icon={<PencilLine size={13} />}
            onClick={() => onReload(statement)}
            data-cy={`btn-rouvrir-note-${month}${suffix}`}
          >
            Rouvrir et modifier
          </Button>
        </div>
      ) : (
        <Button
          variant="secondary"
          small
          icon={<FilePlus2 size={13} />}
          className="mt-4"
          onClick={() => onCreate(month)}
        >
          Générer la note
        </Button>
      )}

      {address.statements.length > 1 ? (
        <details className="statement-month-panel-history">
          <summary className="statement-month-panel-summary">
            Toutes les versions ({address.statements.length})
          </summary>
          <ul className="statement-month-panel-history-list">
            {address.statements.map((version) => (
              <li
                key={version.id}
                className="statement-month-panel-history-item"
              >
                <span className="statement-month-panel-history-meta">
                  <VersionBadge
                    version={version.version ?? 1}
                    active={version.status === "ACTIVE"}
                  />
                  <span className="text-ink-soft">
                    {formatDateTime(version.createdAt)}
                  </span>
                  <span className="number statement-month-panel-history-amount">
                    {formatEUR(version.total)}
                  </span>
                </span>
                <span className="statement-month-panel-history-actions">
                  {version.id ? (
                    <>
                      <PdfActionLink
                        href={api.expenseStatements.pdfUrl(version.id, false)}
                        label="PDF"
                      />
                      <PdfActionLink
                        href={api.expenseStatements.pdfUrl(version.id, true)}
                        label="Complète"
                      />
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="statement-month-panel-history-load"
                    onClick={() => onReload(version)}
                  >
                    Charger
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
