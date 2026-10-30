import "./RentReceiptNotice.css";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ExternalLink, Pencil } from "lucide-react";
import { api } from "@/api/endpoints";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/States";
import { formatEUR, formatMonth } from "@/lib/format";
import type { ExpenseStatementController } from "./useExpenseStatementPage";

/** Rent block shown when the "loyer" expense item is selected. */
export function RentReceiptNotice({
  controller: c,
}: {
  controller: ExpenseStatementController;
}) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const canChoose = c.rentReceiptCandidates.length > 1;
  return (
    <div className="rent-receipt-notice">
      {c.rentReceipt.isPending ? (
        <p className="rent-receipt-notice-pending">
          <Spinner size={16} /> {t("expenseStatement.notice.pending")}
        </p>
      ) : c.rentReceipt.data ? (
        <>
          <div className="rent-receipt-notice-row">
            <div>
              <p className="rent-receipt-notice-title">
                {t("expenseStatement.notice.title", {
                  month: formatMonth(c.month),
                  version: c.rentReceipt.data.version ?? 1,
                })}{" "}
                <span>{formatEUR(c.rentReceipt.data.total)}</span>
              </p>
              <p className="rent-receipt-notice-hint">
                {t("expenseStatement.notice.hint")}
              </p>
            </div>
            <div className="rent-receipt-notice-actions">
              {canChoose ? (
                <Button
                  variant="secondary"
                  small
                  icon={<Pencil size={13} aria-hidden="true" />}
                  aria-expanded={pickerOpen}
                  aria-controls="quittance-choix"
                  onClick={() => setPickerOpen((open) => !open)}
                  data-cy="btn-edit-rent-receipt"
                >
                  {t("expenseStatement.notice.modify")}
                </Button>
              ) : null}
              {c.rentReceipt.data.id ? (
                <a
                  href={api.rentReceipts.pdfUrl(c.rentReceipt.data.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-small"
                >
                  <ExternalLink size={13} aria-hidden="true" />
                  {t("expenseStatement.notice.openPdf")}
                </a>
              ) : null}
            </div>
          </div>
          {canChoose && pickerOpen ? (
            <label className="rent-receipt-notice-picker">
              <span className="rent-receipt-notice-picker-label">
                {t("expenseStatement.notice.chooseReceipt")}
              </span>
              <select
                id="quittance-choix"
                className="field"
                value={c.selectedRentReceiptId ?? ""}
                onChange={(event) =>
                  c.selectRentReceipt(Number(event.target.value))
                }
                data-cy="select-rent-receipt"
              >
                {c.rentReceiptCandidates.map((receipt) => (
                  <option key={receipt.id} value={receipt.id}>
                    {t("expenseStatement.notice.receiptOption", {
                      version: receipt.version ?? 1,
                      tenant: receipt.tenantName ?? "—",
                      landlord: receipt.landlordName ?? "—",
                      total: formatEUR(receipt.total),
                    })}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </>
      ) : (
        <div
          className="rent-receipt-notice-row"
          data-cy="alert-missing-rent-receipt"
          role="alert"
        >
          <div className="rent-receipt-notice-alert">
            <AlertTriangle
              size={17}
              className="rent-receipt-notice-alert-icon"
              aria-hidden="true"
            />
            <div>
              <p className="rent-receipt-notice-title">
                {t("expenseStatement.notice.missingTitle")}
              </p>
              <p className="rent-receipt-notice-alert-text">
                {t("expenseStatement.notice.missingText")}
              </p>
            </div>
          </div>
          <Button variant="secondary" small onClick={c.goToRentReceipt}>
            {t("expenseStatement.notice.generate")}
          </Button>
        </div>
      )}
    </div>
  );
}
