import "./ExpenseGenerationFooter.css";
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
    <div className="expense-generation-footer">
      <div className="expense-generation-footer-totals">
        <div>
          <p className="eyebrow">Total retenu</p>
          <p className="expense-generation-footer-total">
            <span className="number" data-cy="total-retenu">
              {formatEUR(c.displayedTotal)}
            </span>
            {c.calculationInProgress ? <Spinner size={15} /> : null}
          </p>
          {c.calculation?.totalInWords ? (
            <p className="expense-generation-footer-words">
              Soit {c.calculation.totalInWords}.
            </p>
          ) : null}
        </div>
        <div className="expense-generation-footer-basis">
          <p>
            Base de prorata :{" "}
            <span className="expense-generation-footer-basis-value">
              {c.calculation?.proRataBaseDetail ??
                c.activeCompany?.proRataBaseDetail ??
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

      <div className="expense-generation-footer-signature">
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
            className="expense-generation-footer-alert"
            role="alert"
            aria-live="polite"
            data-cy="alerte-signatures-erreur"
          >
            Les signatures n’ont pas pu être chargées :{" "}
            {errorMessage(c.signatures.error)}
          </p>
        ) : !c.signatureAvailable && !c.signatures.isPending ? (
          <p
            className="expense-generation-footer-alert"
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

      <div className="expense-generation-footer-actions">
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
        <p className="expense-generation-footer-hint">
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
