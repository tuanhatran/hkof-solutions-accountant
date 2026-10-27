import "./RentReceiptMonthPanel.css";
import { useTranslation } from "react-i18next";
import { api } from "@/api/endpoints";
import type { RentReceiptDto } from "@/api/types";
import { formatDateTime, formatEUR } from "@/lib/format";
import { PdfActionLink, VersionBadge } from "./HistoryActions";
import {
  latestReceipt,
  pairLabel,
  sortRentReceiptsDesc,
  type AddressGroup,
} from "./historyHelpers";

interface ReceiptCouple {
  key: string;
  receipts: RentReceiptDto[];
}

/** Stable identity of the landlord–tenant couple of a receipt. */
function coupleKey(receipt: RentReceiptDto): string {
  const landlord =
    receipt.landlordId !== undefined && receipt.landlordId !== null
      ? `b${receipt.landlordId}`
      : `b-${receipt.landlordName ?? ""}`;
  const tenant =
    receipt.tenantId !== undefined && receipt.tenantId !== null
      ? `l${receipt.tenantId}`
      : receipt.tenantCompanyId !== undefined &&
          receipt.tenantCompanyId !== null
        ? `s${receipt.tenantCompanyId}`
        : `l-${receipt.tenantName ?? ""}`;
  return `${landlord}-${tenant}`;
}

/** Receipts grouped by couple, couples A→Z and receipts newest first. */
function groupReceiptsByCouple(receipts: RentReceiptDto[]): ReceiptCouple[] {
  const couples = new Map<string, ReceiptCouple>();
  for (const receipt of receipts) {
    const key = coupleKey(receipt);
    const couple = couples.get(key) ?? { key, receipts: [] };
    couple.receipts.push(receipt);
    couples.set(key, couple);
  }
  for (const couple of couples.values()) {
    couple.receipts = sortRentReceiptsDesc(couple.receipts);
  }
  return [...couples.values()].sort((left, right) => {
    const byLabel = pairLabel(left.receipts[0]).localeCompare(
      pairLabel(right.receipts[0]),
      "fr",
      { sensitivity: "base" },
    );
    return byLabel !== 0 ? byLabel : left.key.localeCompare(right.key);
  });
}

function RentReceiptHistoryItem({ version }: { version: RentReceiptDto }) {
  const { t } = useTranslation();

  return (
    <li
      className="rent-receipt-month-panel-history-item"
      data-cy={`historique-quittance-${version.id}`}
    >
      <span className="rent-receipt-month-panel-history-meta">
        <VersionBadge
          version={version.version ?? 1}
          active={version.status === "ACTIVE"}
        />
        <span className="text-ink">{pairLabel(version)}</span>
        <span className="text-ink-soft">
          {formatDateTime(version.createdAt)}
        </span>
        <span className="number rent-receipt-month-panel-history-amount">
          {formatEUR(version.total)}
        </span>
      </span>
      {version.id ? (
        <PdfActionLink
          href={api.rentReceipts.pdfUrl(version.id)}
          label={t("history.actions.pdf")}
        />
      ) : null}
    </li>
  );
}

/** Receipt content of one address, grouped by landlord–tenant couple. */
export function RentReceiptMonthPanel({
  month,
  address,
  suffix,
}: {
  month: string;
  address: AddressGroup;
  suffix: string;
}) {
  const rentReceipt = latestReceipt(address.rentReceipts);
  if (!rentReceipt) {
    return null;
  }
  const couples = groupReceiptsByCouple(address.rentReceipts);
  const collapsedCount = couples.filter(
    (couple) => couple.receipts.length > 1,
  ).length;

  return (
    <div className="rent-receipt-month-panel">
      {couples.map((couple) =>
        couple.receipts.length > 1 ? (
          <details
            key={couple.key}
            className="rent-receipt-month-panel-history"
            data-cy={
              collapsedCount === 1
                ? `quittances-mois-${month}${suffix}`
                : `quittances-mois-${month}${suffix}-${couple.key}`
            }
          >
            <summary className="rent-receipt-month-panel-summary">
              {pairLabel(couple.receipts[0])} ({couple.receipts.length})
            </summary>
            <ul className="rent-receipt-month-panel-history-list">
              {couple.receipts.map((version) => (
                <RentReceiptHistoryItem key={version.id} version={version} />
              ))}
            </ul>
          </details>
        ) : (
          <ul
            key={couple.key}
            className="rent-receipt-month-panel-history-list"
          >
            <RentReceiptHistoryItem version={couple.receipts[0]} />
          </ul>
        ),
      )}
    </div>
  );
}
