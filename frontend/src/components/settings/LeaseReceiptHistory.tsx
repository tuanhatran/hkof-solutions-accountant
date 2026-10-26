import "./LeaseReceiptHistory.css";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import type { LeaseDto, RentReceiptDto } from "@/api/types";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { formatDateTime, formatEUR, formatMonth } from "@/lib/format";
import { PdfActionLink, VersionBadge } from "@/pages/history/HistoryActions";
import { sortRentReceiptsDesc } from "@/pages/history/historyHelpers";

interface MonthVersions {
  month: string;
  versions: RentReceiptDto[];
}

/**
 * A receipt has no leaseId: a natural lease owns the receipts of the same
 * landlord+tenant pair without a company tenant, a company lease owns the
 * receipts whose tenant company is its own company.
 */
function matchesLease(receipt: RentReceiptDto, lease: LeaseDto): boolean {
  if (receipt.landlordId !== lease.landlordId) {
    return false;
  }
  if (lease.companyLease) {
    return (
      lease.companyId !== undefined &&
      lease.companyId !== null &&
      receipt.tenantCompanyId === lease.companyId
    );
  }
  return (
    (receipt.tenantId ?? null) === (lease.tenantId ?? null) &&
    (receipt.tenantCompanyId ?? null) === null
  );
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
  return (
    <div
      className="lease-receipt-history"
      data-cy={`quittances-bail-${lease.id}`}
    >
      <p className="lease-receipt-history-title">Quittances générées</p>
      {isError ? (
        <ErrorState message={errorMessage(error)} onRetry={onRetry} />
      ) : isPending ? (
        <LoadingState message="Chargement des quittances…" />
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
  const groups = groupByMonth(
    receipts.filter((item) => matchesLease(item, lease)),
  );
  if (groups.length === 0) {
    return (
      <p
        className="lease-receipt-history-empty"
        data-cy={`quittances-bail-vide-${lease.id}`}
      >
        Aucune quittance générée pour ce bail.
      </p>
    );
  }
  return (
    <div className="lease-receipt-history-months">
      {groups.map((group) => (
        <details
          key={group.month}
          className="lease-receipt-history-month"
          data-cy={`quittances-bail-mois-${lease.id}-${group.month}`}
        >
          <summary className="lease-receipt-history-summary">
            <span>{formatMonth(group.month)}</span>
            <span className="badge badge-neutral lease-receipt-history-count">
              {group.versions.length}{" "}
              {group.versions.length > 1 ? "quittances" : "quittance"}
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
                  <span className="number lease-receipt-history-total">
                    {formatEUR(version.total)}
                  </span>
                </span>
                {version.id ? (
                  <PdfActionLink
                    href={api.rentReceipts.pdfUrl(version.id)}
                    label="Télécharger le PDF"
                    dataCy={`telecharger-quittance-bail-${version.id}`}
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
