import "./ExpenseAmountFields.css";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { AiBadge } from "@/components/ui/AiBadge";
import { AmountConfirmButton } from "@/components/ui/AmountConfirmButton";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import type { ExpenseStatementController } from "./useExpenseStatementPage";

/** Amount input, retained estimate and AI confirmation of the entry form. */
export function ExpenseAmountFields({
  controller: c,
}: {
  controller: ExpenseStatementController;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="expense-amount-fields-grid">
        <FieldGroup
          id="frais-montant"
          label={t("expenseStatement.fields.amountInclVat")}
          error={c.errors.amountInclVat?.message}
          badge={
            c.ai.amount ? (
              <AiBadge sourceExtract={c.ai.sourceExtract} />
            ) : undefined
          }
        >
          <div className="expense-amount-fields-amount">
            <input
              id="frais-montant"
              inputMode="decimal"
              className={cn(
                "field pr-9",
                c.errors.amountInclVat && "field-error",
                c.lowConfidenceError && c.ai.amount && "field-warning",
              )}
              data-cy="input-montant-ttc"
              aria-invalid={Boolean(c.errors.amountInclVat)}
              aria-readonly={c.isRent && c.availableRent}
              readOnly={c.isRent && c.availableRent}
              {...c.register("amountInclVat", {
                onChange: () => c.markAmountEdited(),
              })}
            />
            <span className="expense-amount-fields-unit">€</span>
          </div>
        </FieldGroup>

        <div className="expense-amount-fields-estimate">
          <p className="eyebrow text-accent">
            {t("expenseStatement.fields.retainedEstimate")}
          </p>
          <p className="expense-amount-fields-estimate-value number">
            {c.displayedRetainedAmount}
          </p>
          <p className="expense-amount-fields-estimate-note">
            {t("expenseStatement.fields.retainedNote")}
          </p>
        </div>
      </div>

      {c.ai.amount ? (
        <AmountConfirmButton
          confirmed={c.ai.amountConfirmed}
          onConfirm={c.confirmAmount}
        />
      ) : null}

      {c.lowConfidenceError ? (
        <p className="expense-amount-fields-warning">
          <AlertTriangle
            size={14}
            className="expense-amount-fields-warning-icon"
            aria-hidden="true"
          />
          {t("expenseStatement.fields.lowConfidence")}
        </p>
      ) : null}
    </>
  );
}
