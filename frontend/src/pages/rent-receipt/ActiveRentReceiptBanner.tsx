import { ExternalLink, FileCheck2 } from "lucide-react";
import { api } from "@/api/endpoints";
import type { RentReceiptController } from "./useRentReceiptPage";

/** Banner of the receipt already active for the selected pair and month. */
export function ActiveRentReceiptBanner({
  c,
}: {
  c: RentReceiptController;
}) {
  const activePairReceipt = c.activePairReceipt;
  if (!activePairReceipt || !c.selectedLease || c.result) {
    return null;
  }
  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 border-accent/20 bg-accent-soft/45 p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-accent">
          <FileCheck2 size={17} aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">
            Quittance déjà active pour ce bailleur et ce locataire
          </p>
          <p className="text-xs text-ink-soft">
            Total {c.displayedTotal}, version {c.activeVersion}. Générer à
            nouveau crée une nouvelle quittance active (version{" "}
            {(c.activeVersion ?? 0) + 1}).
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
          Ouvrir le PDF
        </a>
      ) : null}
    </div>
  );
}
