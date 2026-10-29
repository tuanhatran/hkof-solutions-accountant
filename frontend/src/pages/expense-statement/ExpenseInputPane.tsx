import "./ExpenseInputPane.css";
import { cn } from "@/lib/cn";
import type { ExpenseStatementController } from "./useExpenseStatementPage";
import { ExpenseEntryCard } from "./ExpenseEntryCard";
import { ExpenseLinesCard } from "./ExpenseLinesCard";
import { ExpenseResultCard } from "./ExpenseResultCard";

/** Input pane: entry form, draft lines and last generated result. */
export function ExpenseInputPane({
  controller: c,
  panel,
}: {
  controller: ExpenseStatementController;
  panel?: { id: string; labelledBy: string };
}) {
  return (
    <div
      data-cy="entry-pane"
      id={panel?.id}
      role={c.mobile && panel ? "tabpanel" : undefined}
      aria-labelledby={c.mobile && panel ? panel.labelledBy : undefined}
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
