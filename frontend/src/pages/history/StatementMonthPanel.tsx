import { api } from "@/api/endpoints";
import type { StatementDto } from "@/api/types";
import { formatDateTime, formatEUR } from "@/lib/format";
import { PdfActionLink, VersionBadge } from "./HistoryActions";
import { current, type AddressGroup } from "./historyHelpers";
import "./StatementMonthPanel.css";

/** Statement content of one address: latest version, actions, history. */
export function StatementMonthPanel({
  address,
  onReload,
}: {
  month: string;
  address: AddressGroup;
  suffix: string;
  onReload: (statement: StatementDto) => void;
}) {
  const statement = current(address.statements);
  if (!statement) {
    return null;
  }

  return (
    <div className="statement-month-panel-history">
      <ul className="statement-month-panel-history-list">
        {address.statements.map((version) => (
          <li key={version.id} className="statement-month-panel-history-item">
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
    </div>
  );
}
