import "./RentReceiptForm.css";
import { LoaderCircle, ReceiptText, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { RentReceiptController } from "./useRentReceiptPage";
import { RentReceiptAmountFields } from "./RentReceiptAmountFields";
import { RentReceiptPartyFields } from "./RentReceiptPartyFields";
import { RentReceiptSignatureField } from "./RentReceiptSignatureField";

/** Main "Paramètres de la quittance" form card. */
export function RentReceiptForm({ c }: { c: RentReceiptController }) {
  return (
    <form onSubmit={c.handleSubmit(c.submit)} noValidate>
      <div className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Étape 1</p>
            <h2 className="rent-receipt-form-title">
              Paramètres de la quittance
            </h2>
          </div>
          <span className="badge badge-neutral">
            <Sparkles size={11} aria-hidden="true" />
            Calcul backend
          </span>
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
              Générer la quittance
            </Button>
            <Button
              variant="ghost"
              small
              icon={<RotateCcw size={13} />}
              onClick={c.resumeLease}
              disabled={!c.selectedLease || c.generationInProgress}
            >
              Reprendre le bail
            </Button>
          </div>
          {c.activePairReceipt ? (
            <p className="rent-receipt-form-note">
              Dernière version : v{c.activeVersion} → v
              {(c.activeVersion ?? 0) + 1} à la génération.
            </p>
          ) : (
            <p className="rent-receipt-form-note">
              {c.generationInProgress ? (
                <span className="rent-receipt-form-progress">
                  <LoaderCircle size={12} className="animate-spin" /> Génération
                  en cours…
                </span>
              ) : (
                "Le PDF définitif est enregistré dans l’historique."
              )}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
