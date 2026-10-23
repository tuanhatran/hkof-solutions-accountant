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
            <h2 className="mt-1 text-[22px] text-ink">
              Paramètres de la quittance
            </h2>
          </div>
          <span className="badge badge-neutral">
            <Sparkles size={11} aria-hidden="true" />
            Calcul backend
          </span>
        </div>

        <div className="card-body space-y-5">
          <RentReceiptPartyFields c={c} />
          <RentReceiptSignatureField c={c} />
          <RentReceiptAmountFields c={c} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
          <div className="flex flex-wrap gap-2">
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
            <p className="text-[11px] text-ink-soft">
              Dernière version : v{c.activeVersion} → v
              {(c.activeVersion ?? 0) + 1} à la génération.
            </p>
          ) : (
            <p className="text-[11px] text-ink-soft">
              {c.generationInProgress ? (
                <span className="inline-flex items-center gap-1.5">
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
