import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

interface AmountConfirmButtonProps {
  confirmed: boolean;
  onConfirm: () => void;
}

export function AmountConfirmButton({
  confirmed,
  onConfirm,
}: AmountConfirmButtonProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <button
        type="button"
        data-cy="btn-confirmer-montant"
        aria-label={
          confirmed
            ? "Montant confirmé"
            : "Confirmer le montant détecté par IA"
        }
        aria-pressed={confirmed}
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition",
          confirmed
            ? "cursor-default border-line bg-paper-deep/70 text-ink-soft"
            : "border-accent/40 bg-accent-soft text-accent-strong hover:border-accent hover:bg-accent-soft/70",
        )}
        onClick={onConfirm}
      >
        <Check size={16} aria-hidden="true" />
      </button>
      <p
        aria-live="polite"
        className={cn(
          "text-[11px] leading-snug",
          confirmed ? "text-ink-soft" : "font-medium text-accent-strong",
        )}
      >
        {confirmed
          ? "Montant confirmé."
          : "Montant détecté par IA — confirmez-le pour ajouter le frais."}
      </p>
    </div>
  );
}
