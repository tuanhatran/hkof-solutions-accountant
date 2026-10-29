import "./AmountConfirmButton.css";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";

interface AmountConfirmButtonProps {
  confirmed: boolean;
  onConfirm: () => void;
}

export function AmountConfirmButton({
  confirmed,
  onConfirm,
}: AmountConfirmButtonProps) {
  const { t } = useTranslation();

  return (
    <div className="amount-confirm-button-root">
      <button
        type="button"
        data-cy="btn-confirm-amount"
        aria-label={
          confirmed
            ? t("common.amount.confirmedAria")
            : t("common.amount.confirmAria")
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
        {confirmed ? t("common.amount.confirmedText") : t("common.amount.hint")}
      </p>
    </div>
  );
}
