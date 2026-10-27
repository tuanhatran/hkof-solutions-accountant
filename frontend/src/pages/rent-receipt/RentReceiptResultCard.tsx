import "./RentReceiptResultCard.css";
import { Download, ExternalLink, FileCheck2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/api/endpoints";
import { Button } from "@/components/ui/Button";
import { formatEUR, formatMonth } from "@/lib/format";
import type { RentReceiptController } from "./useRentReceiptPage";

/** Success card shown after a rent receipt has been generated. */
export function RentReceiptResultCard({ c }: { c: RentReceiptController }) {
  const { t } = useTranslation();
  const result = c.result;
  if (!result) {
    return null;
  }
  return (
    <div className="card animation-fade overflow-hidden border-accent/25">
      <div className="rent-receipt-result-card-head">
        <span className="rent-receipt-result-card-icon">
          <FileCheck2 size={19} aria-hidden="true" />
        </span>
        <div className="rent-receipt-result-card-body">
          <p className="rent-receipt-result-card-title">
            {t("rentReceipt.result.title")}
          </p>
          <p className="rent-receipt-result-card-meta">
            {t("rentReceipt.result.meta", {
              month: formatMonth(result.month),
              version: result.version ?? 1,
              total: formatEUR(result.total),
            })}
          </p>
          <p className="rent-receipt-result-card-note">
            {t("rentReceipt.result.recorded", {
              name:
                result.templateName ?? t("rentReceipt.result.builtInTemplate"),
              version: result.templateVersion ?? 1,
            })}
          </p>
        </div>
      </div>
      <div className="rent-receipt-result-card-actions">
        <Button
          variant="primary"
          small
          icon={<Download size={14} />}
          onClick={() => void c.downloadRentReceipt(result)}
          data-cy="btn-telecharger-quittance"
        >
          {t("rentReceipt.result.download")}
        </Button>
        {result.id ? (
          <a
            href={api.rentReceipts.pdfUrl(result.id)}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-small"
          >
            <ExternalLink size={14} aria-hidden="true" />
            {t("rentReceipt.result.open")}
          </a>
        ) : null}
        <Button variant="ghost" small onClick={c.goToStatement}>
          {t("rentReceipt.result.goToStatement")}
        </Button>
      </div>
    </div>
  );
}
