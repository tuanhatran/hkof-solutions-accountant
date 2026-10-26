import "./RentReceiptMonthPanel.css";
import { api } from "@/api/endpoints";
import { formatDateTime, formatEUR } from "@/lib/format";
import { PdfActionLink, OpenPdfLink, VersionBadge } from "./HistoryActions";
import {
  latestReceipt,
  pairLabel,
  sortRentReceiptsDesc,
  type AddressGroup,
} from "./historyHelpers";

/** Receipt content of one address: latest version, actions and history. */
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
  const rentReceiptHistory = sortRentReceiptsDesc(address.rentReceipts);
  if (!rentReceipt) {
    return null;
  }

  return (
    <div className="rent-receipt-month-panel">
      <div className="rent-receipt-month-panel-header">
        <div className="rent-receipt-month-panel-meta-block">
          <p
            className="rent-receipt-month-panel-meta"
            data-cy={`quittance-active-${month}${suffix}`}
          >
            {pairLabel(rentReceipt)}
          </p>
          <p className="rent-receipt-month-panel-meta">
            Version {rentReceipt.version ?? 1} ·{" "}
            {formatDateTime(rentReceipt.createdAt)}
          </p>
        </div>
        <p className="number rent-receipt-month-panel-total">
          {formatEUR(rentReceipt.total)}
        </p>
      </div>

      <div className="rent-receipt-month-panel-actions">
        {rentReceipt.id ? (
          <>
            <PdfActionLink
              href={api.rentReceipts.pdfUrl(rentReceipt.id)}
              label="Télécharger le PDF"
              dataCy={`btn-telecharger-quittance-${month}${suffix}`}
            />
            <OpenPdfLink href={api.rentReceipts.pdfUrl(rentReceipt.id)} />
          </>
        ) : null}
      </div>

      {address.rentReceipts.length > 1 ? (
        <details
          className="rent-receipt-month-panel-history"
          data-cy={`quittances-mois-${month}${suffix}`}
        >
          <summary className="rent-receipt-month-panel-summary">
            Toutes les quittances du mois ({address.rentReceipts.length})
          </summary>
          <ul className="rent-receipt-month-panel-history-list">
            {rentReceiptHistory.map((version) => (
              <li
                key={version.id}
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
                    label="PDF"
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
