import "./ExpenseEntryCard.css";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <p className="eyebrow">
            {c.lineBeingEdited
              ? t("expenseStatement.entry.eyebrowEdit")
              : t("expenseStatement.entry.eyebrowAdd")}
          </p>
          <h2 className="expense-entry-card-title">
            {c.lineBeingEdited
              ? t("expenseStatement.entry.titleEdit")
              : t("expenseStatement.entry.titleAdd")}
          </h2>
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
                ? t("expenseStatement.entry.submitEdit")
                : t("expenseStatement.entry.submitAdd")}
            </Button>
            {c.lineBeingEdited ? (
              <Button variant="ghost" small onClick={c.cancelEdit}>
                {t("expenseStatement.entry.cancelEdit")}
              </Button>
            ) : null}
          </div>
          <p className="expense-entry-card-hint">
            {t("expenseStatement.entry.hint")}
          </p>
        </div>
      </form>
    </div>
  );
}
