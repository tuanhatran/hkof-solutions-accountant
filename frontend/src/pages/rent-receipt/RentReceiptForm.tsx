import "./RentReceiptForm.css";
import { LoaderCircle, ReceiptText, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import type { RentReceiptController } from "./useRentReceiptPage";
import { RentReceiptAmountFields } from "./RentReceiptAmountFields";
import { RentReceiptPartyFields } from "./RentReceiptPartyFields";
import { RentReceiptSignatureField } from "./RentReceiptSignatureField";

/** Main "Paramètres de la quittance" form card. */
export function RentReceiptForm({ c }: { c: RentReceiptController }) {
  const { t } = useTranslation();
  return (
    <form onSubmit={c.handleSubmit(c.submit)} noValidate>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="rent-receipt-form-title">
              {t("rentReceipt.form.title")}
            </h2>
          </div>
        </div>

        <div className="card-body rent-receipt-form-body">
          <RentReceiptPartyFields c={c} />
          <RentReceiptSignatureField c={c} />
          <RentReceiptAmountFields c={c} />
        </div>

        <div className="rent-receipt-form-footer">
          <div className="rent-receipt-form-actions">
            <Button
              type="submit"
              variant="primary"
              loading={c.generationInProgress}
              icon={<ReceiptText size={16} />}
              disabled={
                !c.isValid ||
                !c.selectedLease ||
                c.activeRentReceipt.isPending ||
                c.templates.isPending ||
                c.leases.isPending ||
                !c.signatureAvailable
              }
              data-cy="btn-generer-quittance"
            >
              {t("rentReceipt.form.generate")}
            </Button>
            <Button
              variant="ghost"
              small
              icon={<RotateCcw size={13} />}
              onClick={c.resumeLease}
              disabled={!c.selectedLease || c.generationInProgress}
            >
              {t("rentReceipt.form.resumeLease")}
            </Button>
          </div>
          {c.activePairReceipt ? (
            <p className="rent-receipt-form-note">
              {t("rentReceipt.form.latestVersion", {
                version: c.activeVersion,
                next: (c.activeVersion ?? 0) + 1,
              })}
            </p>
          ) : (
            <p className="rent-receipt-form-note">
              {c.generationInProgress ? (
                <span className="rent-receipt-form-progress">
                  <LoaderCircle size={12} className="animate-spin" />{" "}
                  {t("rentReceipt.form.generating")}
                </span>
              ) : (
                t("rentReceipt.form.definitivePdf")
              )}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
