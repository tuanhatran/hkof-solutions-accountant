import "./RentReceiptMonthPanel.css";
import { FilePlus2, FileText } from "lucide-react";
import { api } from "@/api/endpoints";
import type { RentReceiptDto } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { formatDateTime, formatEUR } from "@/lib/format";
import { PdfActionLink, OpenPdfLink, VersionBadge } from "./HistoryActions";
import {
  pairLabel,
  sortRentReceiptsDesc,
  type MonthGroup,
} from "./historyHelpers";

/** Rent receipt column of a month: latest version, actions and full history. */
export function RentReceiptMonthPanel({
  group,
  rentReceipt,
  onCreate,
}: {
  group: MonthGroup;
  rentReceipt: RentReceiptDto | null;
  onCreate: (month: string) => void;
}) {
  const rentReceiptHistory = sortRentReceiptsDesc(group.rentReceipts);

  return (
    <div className="rent-receipt-month-panel">
      <div className="rent-receipt-month-panel-header">
        <div className="rent-receipt-month-panel-heading">
          <span className="rent-receipt-month-panel-icon">
            <FileText size={17} aria-hidden="true" />
          </span>
          <div>
            <h3 className="rent-receipt-month-panel-title">
              Quittance de loyer
            </h3>
            {rentReceipt ? (
              <>
                <p className="rent-receipt-month-panel-meta">
                  Version {rentReceipt.version ?? 1} ·{" "}
                  {formatDateTime(rentReceipt.createdAt)}
                </p>
                <p
                  className="rent-receipt-month-panel-meta"
                  data-cy={`quittance-active-${group.month}`}
                >
                  {pairLabel(rentReceipt)}
                </p>
              </>
            ) : (
              <p className="rent-receipt-month-panel-meta">
                Aucune version pour ce mois.
              </p>
            )}
          </div>
        </div>
        {rentReceipt ? (
          <p className="number rent-receipt-month-panel-total">
            {formatEUR(rentReceipt.total)}
          </p>
        ) : null}
      </div>

      {rentReceipt ? (
        <div className="rent-receipt-month-panel-actions">
          {rentReceipt.id ? (
            <>
              <PdfActionLink
                href={api.rentReceipts.pdfUrl(rentReceipt.id)}
                label="Télécharger le PDF"
                dataCy={`btn-telecharger-quittance-${group.month}`}
              />
              <OpenPdfLink href={api.rentReceipts.pdfUrl(rentReceipt.id)} />
            </>
          ) : null}
        </div>
      ) : (
        <Button
          variant="secondary"
          small
          icon={<FilePlus2 size={13} />}
          className="mt-4"
          onClick={() => onCreate(group.month)}
        >
          Générer la quittance
        </Button>
      )}

      {group.rentReceipts.length > 1 ? (
        <details
          className="rent-receipt-month-panel-history"
          data-cy={`quittances-mois-${group.month}`}
        >
          <summary className="rent-receipt-month-panel-summary">
            Toutes les quittances du mois ({group.rentReceipts.length})
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
