import { useTranslation } from "react-i18next";
import { api } from "@/api/endpoints";
import type { StatementDto } from "@/api/types";
import { formatDate, formatEUR } from "@/lib/format";
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
  const { t } = useTranslation();
  const statement = current(address.statements);
  if (!statement) {
    return null;
  }

  return (
    <div className="statement-month-panel-history">
      <ul className="statement-month-panel-history-list">
        {address.statements.map((version) => (
          <li
            key={version.id}
            className="history-versions-grid history-versions-grid-note statement-month-panel-history-item"
          >
            <span className="justify-self-start">
              <VersionBadge
                version={version.version ?? 1}
                active={version.status === "ACTIVE"}
              />
            </span>
            <span className="history-versions-number statement-month-panel-history-date">
              {formatDate(version.createdAt)}
            </span>
            <span className="history-versions-number statement-month-panel-history-amount font-medium text-ink">
              {formatEUR(version.total)}
            </span>
            <span className="statement-month-panel-history-actions">
              {version.id ? (
                <>
                  <PdfActionLink
                    href={api.expenseStatements.pdfUrl(version.id, false)}
                    label={t("history.actions.pdf")}
                  />
                  <PdfActionLink
                    href={api.expenseStatements.pdfUrl(version.id, true)}
                    label={t("history.actions.complete")}
                  />
                </>
              ) : null}
              <button
                type="button"
                className="statement-month-panel-history-load"
                onClick={() => onReload(version)}
              >
                {t("history.actions.load")}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
