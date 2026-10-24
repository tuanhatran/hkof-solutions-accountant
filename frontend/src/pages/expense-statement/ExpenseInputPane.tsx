import "./ExpenseInputPane.css";
import { cn } from "@/lib/cn";
import type { ExpenseStatementController } from "./useExpenseStatementPage";
import { ExpenseEntryCard } from "./ExpenseEntryCard";
import { ExpenseLinesCard } from "./ExpenseLinesCard";
import { ExpenseResultCard } from "./ExpenseResultCard";

/** Input pane: entry form, draft lines and last generated result. */
export function ExpenseInputPane({
  controller: c,
}: {
  controller: ExpenseStatementController;
}) {
  return (
    <div
      data-cy="volet-saisie"
      className={cn(
        "expense-input-pane",
        c.mobile && c.mobilePanel !== "input" && "hidden",
      )}
    >
      <ExpenseEntryCard controller={c} />
      <ExpenseLinesCard controller={c} />
      <ExpenseResultCard controller={c} />
    </div>
  );
}
