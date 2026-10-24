import "./ExpenseTypeAndProRata.css";
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
  return (
    <div className="expense-type-and-pro-rata-grid">
      <FieldGroup
        id="frais-type"
        label="Type de frais"
        error={c.errors.itemCode?.message}
        badge={c.ai.type ? <AiBadge label="Type suggéré par IA" /> : undefined}
        help={
          c.ai.supplier
            ? `Fournisseur détecté : ${c.ai.supplier}`
            : "Les libellés proviennent de votre configuration."
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
          <option value="">Sélectionner…</option>
          {c.expenseItems.map((expenseItem) => (
            <option
              key={expenseItem.code}
              value={expenseItem.code}
              disabled={c.optionDisabled(expenseItem)}
            >
              {expenseItem.label ?? expenseItem.code}
              {expenseItem.supplier ? ` (${expenseItem.supplier})` : ""}
              {c.optionDisabled(expenseItem) ? " — déjà ajouté" : ""}
            </option>
          ))}
        </select>
      </FieldGroup>

      <FieldGroup
        id="frais-prorata"
        label="Prorata (%)"
        error={c.errors.proRataPct?.message}
        help="Champ libre : 35,71 ou 35,71 %."
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
