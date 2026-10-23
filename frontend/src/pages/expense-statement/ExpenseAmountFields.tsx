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
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup
          id="frais-montant"
          label="Montant TTC"
          error={c.errors.amountInclVat?.message}
          badge={
            c.ai.amount ? (
              <AiBadge sourceExtract={c.ai.sourceExtract} />
            ) : undefined
          }
        >
          <div className="relative">
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
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-soft">
              €
            </span>
          </div>
        </FieldGroup>

        <div className="flex flex-col justify-end rounded-xl border border-accent/15 bg-accent-soft/45 px-4 py-3">
          <p className="eyebrow text-accent">Montant retenu estimé</p>
          <p className="mt-1 font-display text-[24px] leading-none text-accent-strong number">
            {c.displayedRetainedAmount}
          </p>
          <p className="mt-1.5 text-[11px] leading-snug text-ink-soft">
            Estimation d’affichage : le backend recalcule chaque ligne avec
            arrondi au centime.
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
        <p className="flex items-start gap-2 rounded-lg bg-warning-soft/50 px-3 py-2 text-xs text-warning">
          <AlertTriangle
            size={14}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          Confiance faible : vérifiez le montant avant d’ajouter le frais.
        </p>
      ) : null}
    </>
  );
}
