import { Download, ExternalLink, FileCheck2 } from "lucide-react";
import { api } from "@/api/endpoints";
import { Button } from "@/components/ui/Button";
import { formatEUR, formatMonth } from "@/lib/format";
import type { RentReceiptController } from "./useRentReceiptPage";

/** Success card shown after a rent receipt has been generated. */
export function RentReceiptResultCard({ c }: { c: RentReceiptController }) {
  const result = c.result;
  if (!result) {
    return null;
  }
  return (
    <div className="card animation-fade overflow-hidden border-accent/25">
      <div className="flex items-start gap-3 bg-accent-soft/60 px-5 py-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white">
          <FileCheck2 size={19} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-accent">Quittance générée</p>
          <p className="mt-0.5 text-sm text-ink">
            {formatMonth(result.month)} · version {result.version ?? 1} ·{" "}
            {formatEUR(result.total)}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            Enregistrée dans l’historique avec le template «{" "}
            {result.templateName ?? "modèle intégré"} » v
            {result.templateVersion ?? 1}.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 px-5 py-4">
        <Button
          variant="primary"
          small
          icon={<Download size={14} />}
          onClick={() => void c.downloadRentReceipt(result)}
          data-cy="btn-telecharger-quittance"
        >
          Télécharger le PDF
        </Button>
        {result.id ? (
          <a
            href={api.rentReceipts.pdfUrl(result.id)}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-small"
          >
            <ExternalLink size={14} aria-hidden="true" />
            Ouvrir
          </a>
        ) : null}
        <Button variant="ghost" small onClick={c.goToStatement}>
          Aller à la note de frais de ce mois
        </Button>
      </div>
    </div>
  );
}
