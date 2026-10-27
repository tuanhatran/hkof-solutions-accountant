import "./CompanyLeaseStatementHistory.css";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import type { LeaseDto, StatementDto } from "@/api/types";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { formatDateTime, formatEUR, formatMonth } from "@/lib/format";
import { PdfActionLink, VersionBadge } from "@/pages/history/HistoryActions";

interface MonthVersions {
  month: string;
  versions: StatementDto[];
}

/** Versions descending, then ids descending for equal versions. */
function sortStatementsDesc(statements: StatementDto[]): StatementDto[] {
  return [...statements].sort((left, right) => {
    const byVersion = (right.version ?? 1) - (left.version ?? 1);
    return byVersion !== 0 ? byVersion : (right.id ?? 0) - (left.id ?? 0);
  });
}

/** Months descending; inside a month, versions from the newest to the oldest. */
function groupByMonth(statements: StatementDto[]): MonthVersions[] {
  const months = new Map<string, StatementDto[]>();
  for (const statement of statements) {
    const month = statement.month ?? "";
    const versions = months.get(month);
    if (versions) {
      versions.push(statement);
    } else {
      months.set(month, [statement]);
    }
  }
  return [...months.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([month, versions]) => ({
      month,
      versions: sortStatementsDesc(versions),
    }));
}

/**
 * Full-width subsection of one company lease row: its generated expense
 * statements grouped by month. Only the statements strictly attached to this
 * lease are kept (`leaseId === lease.id`); legacy statements without a lease
 * never appear here. Totals are the backend values, displayed as-is and never
 * summed client-side.
 */
export function CompanyLeaseStatementHistory({
  lease,
  statements,
  isPending,
  isError,
  error,
  onRetry,
}: {
  lease: LeaseDto;
  statements: StatementDto[] | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      className="company-lease-statement-history"
      data-cy={`notes-frais-bail-${lease.id}`}
    >
      <p className="company-lease-statement-history-title">
        {t("settings.history.statements.title")}
      </p>
      {isError ? (
        <ErrorState message={errorMessage(error)} onRetry={onRetry} />
      ) : isPending ? (
        <LoadingState message={t("settings.history.statements.loading")} />
      ) : (
        <MonthList lease={lease} statements={statements ?? []} />
      )}
    </div>
  );
}

function MonthList({
  lease,
  statements,
}: {
  lease: LeaseDto;
  statements: StatementDto[];
}) {
  const { t } = useTranslation();
  const groups = groupByMonth(
    statements.filter((statement) => statement.leaseId === lease.id),
  );
  if (groups.length === 0) {
    return (
      <p
        className="company-lease-statement-history-empty"
        data-cy={`notes-frais-bail-vide-${lease.id}`}
      >
        {t("settings.history.statements.empty")}
      </p>
    );
  }
  return (
    <div className="company-lease-statement-history-months">
      {groups.map((group) => (
        <details
          key={group.month}
          className="company-lease-statement-history-month"
          data-cy={`notes-frais-bail-mois-${lease.id}-${group.month}`}
        >
          <summary className="company-lease-statement-history-summary">
            <span>{formatMonth(group.month)}</span>
            <span className="badge badge-neutral company-lease-statement-history-count">
              {t("settings.history.statements.count", {
                count: group.versions.length,
              })}
            </span>
          </summary>
          <ul className="company-lease-statement-history-list">
            {group.versions.map((version) => (
              <li
                key={version.id}
                className="company-lease-statement-history-item"
              >
                <span className="company-lease-statement-history-meta">
                  <VersionBadge
                    version={version.version ?? 1}
                    active={version.status === "ACTIVE"}
                  />
                  <span className="company-lease-statement-history-date">
                    {formatDateTime(version.createdAt)}
                  </span>
                  <span className="number company-lease-statement-history-total">
                    {formatEUR(version.total)}
                  </span>
                </span>
                {version.id ? (
                  <span className="company-lease-statement-history-actions">
                    <PdfActionLink
                      href={api.expenseStatements.pdfUrl(version.id, false)}
                      label={t("history.actions.downloadPdf")}
                      dataCy={`telecharger-note-frais-bail-${version.id}`}
                    />
                    <PdfActionLink
                      href={api.expenseStatements.zipUrl(version.id)}
                      label={t("history.actions.downloadComplete")}
                      dataCy={`telecharger-note-frais-complete-bail-${version.id}`}
                    />
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
