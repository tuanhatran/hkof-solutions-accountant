import "./AmountConfirmButton.css";
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
    <div className="amount-confirm-button-root">
      <button
        type="button"
        data-cy="btn-confirmer-montant"
        aria-label={
          confirmed ? "Montant confirmé" : "Confirmer le montant détecté par IA"
        }
        aria-pressed={confirmed}
        className={cn(
          "amount-confirm-button",
          confirmed
            ? "amount-confirm-button-confirmed"
            : "amount-confirm-button-idle",
        )}
        onClick={onConfirm}
      >
        <Check size={16} aria-hidden="true" />
      </button>
      <p
        aria-live="polite"
        className={cn(
          "amount-confirm-button-text",
          confirmed
            ? "amount-confirm-button-text-confirmed"
            : "amount-confirm-button-text-idle",
        )}
      >
        {confirmed
          ? "Montant confirmé."
          : "Montant détecté par IA — confirmez-le pour ajouter le frais."}
      </p>
    </div>
  );
}
