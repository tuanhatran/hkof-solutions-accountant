import { AlertTriangle, ExternalLink } from "lucide-react";
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
  return (
    <div className="rounded-xl border border-line bg-paper/50 p-4">
      {c.rentReceipt.isPending ? (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <Spinner size={16} /> Recherche de la quittance du mois…
        </p>
      ) : c.rentReceipt.data ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">
              Quittance de {formatMonth(c.month)} (v
              {c.rentReceipt.data.version ?? 1}) :{" "}
              <span className="number">
                {formatEUR(c.rentReceipt.data.total)}
              </span>
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              Montant pré-rempli et verrouillé. La quittance sera annexée
              automatiquement.
            </p>
          </div>
          {c.rentReceipt.data.id ? (
            <a
              href={api.rentReceipts.pdfUrl(c.rentReceipt.data.id)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-small"
            >
              <ExternalLink size={13} aria-hidden="true" />
              Voir le PDF
            </a>
          ) : null}
        </div>
      ) : (
        <div
          className="flex flex-wrap items-center justify-between gap-3"
          data-cy="alerte-quittance-manquante"
          role="alert"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle
              size={17}
              className="mt-0.5 text-warning"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-ink">
                Aucune quittance pour ce mois
              </p>
              <p className="mt-0.5 text-xs text-ink-soft">
                Générez la quittance : le montant du loyer sera repris et
                verrouillé.
              </p>
            </div>
          </div>
          <Button variant="secondary" small onClick={c.goToRentReceipt}>
            Générer la quittance
          </Button>
        </div>
      )}
    </div>
  );
}
