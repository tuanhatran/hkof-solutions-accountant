import "./ExpenseEntryCard.css";
import { Pencil, Plus } from "lucide-react";
import { AnalysisPanel } from "@/components/llm/AnalysisPanel";
import { Button } from "@/components/ui/Button";
import type { ExpenseStatementController } from "./useExpenseStatementPage";
import { ExpenseAmountFields } from "./ExpenseAmountFields";
import { ExpenseTypeAndProRata } from "./ExpenseTypeAndProRata";
import { ReceiptAttachment } from "./ReceiptAttachment";
import { RentReceiptNotice } from "./RentReceiptNotice";

/** Entry card of the expense statement page ("Nouveau frais"). */
export function ExpenseEntryCard({
  controller: c,
}: {
  controller: ExpenseStatementController;
}) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <p className="eyebrow">
            {c.lineBeingEdited ? "Modification" : "Ajouter un frais"}
          </p>
          <h2 className="expense-entry-card-title">
            {c.lineBeingEdited ? "Modifier le frais" : "Nouveau frais"}
          </h2>
        </div>
        <div className="expense-entry-card-month">
          <div className="expense-entry-card-month-grid">
            <label htmlFor="note-mois" className="sr-only">
              Mois concerné
            </label>
            <input
              id="note-mois"
              type="month"
              className="field mt-0 w-auto py-1.5 text-xs"
              data-cy="select-mois"
              value={c.month}
              onChange={(event) => c.changeMonth(event.target.value)}
            />
          </div>
        </div>
      </div>

      <form
        ref={c.formCardRef}
        onSubmit={c.handleSubmit(c.saveExpense)}
        noValidate
      >
        <div className="card-body expense-entry-card-body">
          <ExpenseTypeAndProRata controller={c} />

          {c.isRent ? (
            <RentReceiptNotice controller={c} />
          ) : (
            <ReceiptAttachment controller={c} />
          )}

          {!c.isRent ? (
            <AnalysisPanel
              state={c.analysisPhase}
              hasFile={c.receipt !== null || c.uploading}
              onCancel={c.cancelAnalysis}
            />
          ) : null}

          <ExpenseAmountFields controller={c} />
        </div>

        <div className="expense-entry-card-footer">
          <div className="expense-entry-card-actions">
            <Button
              type="submit"
              variant="primary"
              icon={
                c.lineBeingEdited ? <Pencil size={15} /> : <Plus size={16} />
              }
              disabled={
                !c.isValid ||
                c.uploading ||
                (!c.isRent && !c.receipt) ||
                (c.isRent && !c.availableRent) ||
                c.amountConfirmationPending
              }
              data-cy="btn-ajouter-frais"
            >
              {c.lineBeingEdited
                ? "Enregistrer la modification"
                : "Ajouter ce frais"}
            </Button>
            {c.lineBeingEdited ? (
              <Button variant="ghost" small onClick={c.cancelEdit}>
                Annuler la modification
              </Button>
            ) : null}
          </div>
          <p className="expense-entry-card-hint">
            Le formulaire se réinitialise après chaque ajout.
          </p>
        </div>
      </form>
    </div>
  );
}
