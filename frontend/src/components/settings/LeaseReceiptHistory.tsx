import "./LeaseReceiptHistory.css";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import type { LeaseDto, RentReceiptDto } from "@/api/types";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { formatDateTime, formatEUR, formatMonth } from "@/lib/format";
import { matchesLease } from "@/lib/leaseReceipts";
import { PdfActionLink, VersionBadge } from "@/pages/history/HistoryActions";
import { sortRentReceiptsDesc } from "@/pages/history/historyHelpers";

interface MonthVersions {
  month: string;
  versions: RentReceiptDto[];
}

/** Months descending; inside a month, versions from the newest to the oldest. */
function groupByMonth(receipts: RentReceiptDto[]): MonthVersions[] {
  const months = new Map<string, RentReceiptDto[]>();
  for (const receipt of receipts) {
    const month = receipt.month ?? "";
    const versions = months.get(month);
    if (versions) {
      versions.push(receipt);
    } else {
      months.set(month, [receipt]);
    }
  }
  return [...months.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([month, versions]) => ({
      month,
      versions: sortRentReceiptsDesc(versions),
    }));
}

/**
 * Full-width subsection of one lease row: its generated rent receipts grouped
 * by month. Every month stays collapsed until the user expands it; totals are
 * the backend values, displayed as-is and never summed client-side.
 */
export function LeaseReceiptHistory({
  lease,
  receipts,
  isPending,
  isError,
  error,
  onRetry,
}: {
  lease: LeaseDto;
  receipts: RentReceiptDto[] | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      className="lease-receipt-history"
      data-cy={`lease-receipt-history-${lease.id}`}
    >
      <hr className="my-2 border-t border-[var(--color-accent)]/20" />
      <p className="lease-receipt-history-title">
        {t("settings.history.receipts.title")}
      </p>
      {isError ? (
        <ErrorState message={errorMessage(error)} onRetry={onRetry} />
      ) : isPending ? (
        <LoadingState message={t("settings.history.receipts.loading")} />
      ) : (
        <MonthList lease={lease} receipts={receipts ?? []} />
      )}
    </div>
  );
}

function MonthList({
  lease,
  receipts,
}: {
  lease: LeaseDto;
  receipts: RentReceiptDto[];
}) {
  const { t } = useTranslation();
  const groups = groupByMonth(
    receipts.filter((item) => matchesLease(item, lease)),
  );
  if (groups.length === 0) {
    return (
      <p
        className="lease-receipt-history-empty"
        data-cy={`lease-receipt-history-empty-${lease.id}`}
      >
        {t("settings.history.receipts.empty")}
      </p>
    );
  }
  return (
    <div className="lease-receipt-history-months">
      {groups.map((group) => (
        <details
          key={group.month}
          className="lease-receipt-history-month"
          data-cy={`lease-receipt-history-month-${lease.id}-${group.month}`}
        >
          <summary className="lease-receipt-history-summary">
            <span>{formatMonth(group.month)}</span>
            <span className="badge badge-neutral lease-receipt-history-count">
              {t("settings.history.receipts.count", {
                count: group.versions.length,
              })}
            </span>
          </summary>
          <ul className="lease-receipt-history-list">
            {group.versions.map((version) => (
              <li key={version.id} className="lease-receipt-history-item">
                <span className="lease-receipt-history-meta">
                  <VersionBadge
                    version={version.version ?? 1}
                    active={version.status === "ACTIVE"}
                  />
                  <span className="lease-receipt-history-date">
                    {formatDateTime(version.createdAt)}
                  </span>
                  <span className="lease-receipt-history-total">
                    {formatEUR(version.total)}
                  </span>
                </span>
                {version.id ? (
                  <PdfActionLink
                    href={api.rentReceipts.pdfUrl(version.id)}
                    label={t("history.actions.downloadPdf")}
                    dataCy={`download-lease-rent-receipt-${version.id}`}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
