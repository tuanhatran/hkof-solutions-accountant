import { FileCheck2 } from "lucide-react";
import { Link } from "react-router-dom";
import { errorMessage } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { Spinner } from "@/components/ui/States";
import { signatureTypeLabel } from "@/components/signatures/signatureConstants";
import { formatEUR } from "@/lib/format";
import type { ExpenseStatementController } from "./useExpenseStatementPage";

/** Totals, signature picker and generation action of the lines card. */
export function ExpenseGenerationFooter({
  controller: c,
}: {
  controller: ExpenseStatementController;
}) {
  return (
    <div className="space-y-3 border-t border-line px-5 py-4 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Total retenu</p>
          <p className="mt-1 flex items-baseline gap-2 font-display text-[30px] leading-none text-accent-strong">
            <span className="number" data-cy="total-retenu">
              {formatEUR(c.displayedTotal)}
            </span>
            {c.calculationInProgress ? <Spinner size={15} /> : null}
          </p>
          {c.calculation?.totalInWords ? (
            <p className="mt-1.5 text-xs text-ink-soft">
              Soit {c.calculation.totalInWords}.
            </p>
          ) : null}
        </div>
        <div className="text-right text-[11px] leading-relaxed text-ink-soft">
          <p>
            Base de prorata :{" "}
            <span className="font-medium text-ink">
              {c.calculation?.proRataBaseDetail ??
                c.settings.data?.proRataBaseDetail ??
                "—"}
            </span>
          </p>
          {c.calculation?.proRataBase ? (
            <p>
              Quote-part de référence :{" "}
              <span className="number">
                {formatEUR(c.calculation.proRataBase)}
              </span>
            </p>
          ) : null}
          <p>Calcul backend · recalcul automatique (300 ms).</p>
        </div>
      </div>

      {c.calculationError ? (
        <p className="error-text" role="alert">
          Calcul indisponible : {c.calculationError}
        </p>
      ) : null}
      {c.requests.error && !c.calculationError ? (
        <p className="error-text" role="alert">
          {c.requests.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup
          id="note-signature"
          label="Signature"
          help="Image apposée au bas de la note de frais générée."
          badge={<span className="badge badge-neutral">PNG / JPEG</span>}
        >
          <select
            id="note-signature"
            className="field"
            data-cy="select-signature"
            value={c.selectedSignatureId ?? ""}
            onChange={(event) =>
              c.setChosenSignatureId(
                event.target.value ? Number(event.target.value) : null,
              )
            }
            disabled={c.signatures.isPending || c.signatureList.length === 0}
          >
            {c.signatureList.length === 0 ? (
              <option value="">Aucune signature</option>
            ) : null}
            {c.signatureList.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name} — {signatureTypeLabel(candidate.type)}
              </option>
            ))}
          </select>
        </FieldGroup>
        {c.signatures.isError ? (
          <p
            className="self-end rounded-xl border border-danger/20 bg-danger-soft/60 p-3 text-xs text-danger"
            role="alert"
            aria-live="polite"
            data-cy="alerte-signatures-erreur"
          >
            Les signatures n’ont pas pu être chargées :{" "}
            {errorMessage(c.signatures.error)}
          </p>
        ) : !c.signatureAvailable && !c.signatures.isPending ? (
          <p
            className="self-end rounded-xl border border-danger/20 bg-danger-soft/60 p-3 text-xs text-danger"
            role="alert"
            data-cy="alerte-signature-manquante"
          >
            Aucune signature trouvée. Configurez une signature dans la page{" "}
            <Link to="/configuration" className="link">
              Paramètres
            </Link>
            .
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="primary"
          icon={<FileCheck2 size={16} />}
          loading={c.generationInProgress}
          disabled={
            c.orderedLines.length === 0 ||
            !c.calculationUpToDate ||
            !c.signatureAvailable
          }
          onClick={c.requestGeneration}
          data-cy="btn-generer-note"
        >
          Générer la note de frais
        </Button>
        <p className="max-w-[300px] text-[11px] leading-snug text-ink-soft">
          {c.orderedLines.length === 0
            ? "Ajoutez au moins un frais pour générer la note."
            : !c.signatureAvailable
              ? "Configurez une signature pour générer la note."
              : !c.calculationUpToDate
                ? "En attente du calcul backend à jour…"
                : c.activeStatement.data
                  ? `Une version ${c.activeVersion} existe : la version ${(c.activeVersion ?? 0) + 1} sera créée.`
                  : "Le PDF définitif sera enregistré dans l’historique."}
        </p>
      </div>
    </div>
  );
}
