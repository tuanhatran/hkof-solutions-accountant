import "./ActiveRentReceiptBanner.css";
import { ExternalLink, FileCheck2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/api/endpoints";
import type { RentReceiptController } from "./useRentReceiptPage";

/** Banner of the receipt already active for the selected pair and month. */
export function ActiveRentReceiptBanner({ c }: { c: RentReceiptController }) {
  const { t } = useTranslation();
  const activePairReceipt = c.activePairReceipt;
  if (!activePairReceipt || !c.selectedLease || c.result) {
    return null;
  }
  return (
    <div className="card active-rent-receipt-banner border-accent/20 bg-accent-soft/45">
      <div className="active-rent-receipt-banner-main">
        <span className="active-rent-receipt-banner-icon">
          <FileCheck2 size={17} aria-hidden="true" />
        </span>
        <div>
          <p className="active-rent-receipt-banner-title">
            {t("rentReceipt.banner.title")}
          </p>
          <p className="active-rent-receipt-banner-text">
            {t("rentReceipt.banner.text", {
              total: c.displayedTotal,
              version: c.activeVersion,
              next: (c.activeVersion ?? 0) + 1,
            })}
          </p>
        </div>
      </div>
      {activePairReceipt.id ? (
        <a
          href={api.rentReceipts.pdfUrl(activePairReceipt.id)}
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondary btn-small"
        >
          <ExternalLink size={13} aria-hidden="true" />
          {t("rentReceipt.banner.openPdf")}
        </a>
      ) : null}
    </div>
  );
}
