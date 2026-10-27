import "./ExpenseTypeAndProRata.css";
import { useTranslation } from "react-i18next";
import { AiBadge } from "@/components/ui/AiBadge";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import type { ExpenseStatementController } from "./useExpenseStatementPage";

/** Expense type + pro-rata fields of the entry form. */
export function ExpenseTypeAndProRata({
  controller: c,
}: {
  controller: ExpenseStatementController;
}) {
  const { t } = useTranslation();
  return (
    <div className="expense-type-and-pro-rata-grid">
      <FieldGroup
        id="frais-type"
        label={t("expenseStatement.fields.type")}
        error={c.errors.itemCode?.message}
        badge={
          c.ai.type ? (
            <AiBadge label={t("expenseStatement.fields.typeSuggestedAi")} />
          ) : undefined
        }
        help={
          c.ai.supplier
            ? t("expenseStatement.fields.supplierDetected", {
                supplier: c.ai.supplier,
              })
            : t("expenseStatement.fields.typeHelp")
        }
      >
        <select
          id="frais-type"
          ref={c.typeRef}
          className={cn("field", c.errors.itemCode && "field-error")}
          data-cy="select-type-frais"
          value={c.values.itemCode}
          onChange={(event) => c.changeType(event.target.value)}
          aria-invalid={Boolean(c.errors.itemCode)}
          disabled={c.expenseItemsQuery.isPending}
        >
          <option value="">
            {t("expenseStatement.fields.selectPlaceholder")}
          </option>
          {c.expenseItems.map((expenseItem) => (
            <option
              key={expenseItem.code}
              value={expenseItem.code}
              disabled={c.optionDisabled(expenseItem)}
            >
              {expenseItem.label ?? expenseItem.code}
              {expenseItem.supplier ? ` (${expenseItem.supplier})` : ""}
              {c.optionDisabled(expenseItem)
                ? t("expenseStatement.fields.alreadyAdded")
                : ""}
            </option>
          ))}
        </select>
      </FieldGroup>

      <FieldGroup
        id="frais-prorata"
        label={t("expenseStatement.fields.proRata")}
        error={c.errors.proRataPct?.message}
        help={t("expenseStatement.fields.proRataHelp")}
      >
        <div className="expense-type-and-pro-rata-prorata">
          <input
            id="frais-prorata"
            inputMode="decimal"
            className={cn("field pr-9", c.errors.proRataPct && "field-error")}
            data-cy="input-prorata"
            aria-invalid={Boolean(c.errors.proRataPct)}
            {...c.register("proRataPct")}
          />
          <span className="expense-type-and-pro-rata-unit">%</span>
        </div>
      </FieldGroup>
    </div>
  );
}
