import { Pencil, Save, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import { formatEUR } from "@/lib/format";
import type { AdditionalChargeFormValues } from "@/lib/validation";
import type { RentReceiptController } from "./useRentReceiptPage";

interface AdditionalChargeRowProps {
  c: RentReceiptController;
  /** Position among the saved rows, null for the row being added. */
  index: number | null;
  charge?: AdditionalChargeFormValues;
}

/** One additional charge: editable inputs while edited, plain text once saved. */
export function RentReceiptAdditionalChargeRow({
  c,
  index,
  charge,
}: AdditionalChargeRowProps) {
  const { t } = useTranslation();
  const editing = c.editingAdditionalCharge;
  const fieldId = index === null ? "nouvelle" : String(index);

  if (editing !== null && editing.index === index) {
    return (
      <li className="rent-receipt-amount-fields-charge">
        <FieldGroup
          id={`quittance-charge-libelle-${fieldId}`}
          label={t("rentReceipt.fields.additionalChargeLabel")}
          error={editing.errors.label}
        >
          <input
            id={`quittance-charge-libelle-${fieldId}`}
            className={cn("field", editing.errors.label && "field-error")}
            aria-invalid={Boolean(editing.errors.label)}
            data-cy="input-charge-supplementaire-libelle"
            value={editing.label}
            onChange={(event) =>
              c.changeEditingAdditionalCharge({ label: event.target.value })
            }
          />
        </FieldGroup>
        <FieldGroup
          id={`quittance-charge-montant-${fieldId}`}
          label={t("rentReceipt.fields.additionalChargeAmount")}
          error={editing.errors.amount}
        >
          <div className="rent-receipt-amount-fields-amount">
            <input
              id={`quittance-charge-montant-${fieldId}`}
              inputMode="decimal"
              className={cn(
                "field pr-9",
                editing.errors.amount && "field-error",
              )}
              aria-invalid={Boolean(editing.errors.amount)}
              data-cy="input-charge-supplementaire-montant"
              value={editing.amount}
              onChange={(event) =>
                c.changeEditingAdditionalCharge({ amount: event.target.value })
              }
            />
            <span className="rent-receipt-amount-fields-unit">€</span>
          </div>
        </FieldGroup>
        <div className="rent-receipt-amount-fields-charge-actions">
          <Button
            variant="primary"
            icon={<Save size={14} />}
            aria-label={t("rentReceipt.fields.saveAdditionalCharge")}
            data-cy="btn-enregistrer-charge-supplementaire"
            onClick={c.saveAdditionalCharge}
          />
          <Button
            variant="ghost"
            small
            onClick={c.cancelAdditionalCharge}
            data-cy="btn-annuler-charge-supplementaire"
          >
            {t("rentReceipt.fields.cancelAdditionalCharge")}
          </Button>
        </div>
      </li>
    );
  }

  if (!charge || index === null) {
    return null;
  }

  return (
    <li className="rent-receipt-amount-fields-charge rent-receipt-amount-fields-charge-readonly">
      <p
        className="rent-receipt-amount-fields-charge-text"
        data-cy={`charge-supplementaire-${index}`}
      >
        <span className="rent-receipt-amount-fields-charge-label">
          {charge.label}
        </span>
        <span className="rent-receipt-amount-fields-charge-amount number">
          {formatEUR(charge.amount)}
        </span>
      </p>
      <div className="rent-receipt-amount-fields-charge-actions">
        <Button
          variant="ghost"
          small
          icon={<Pencil size={14} />}
          aria-label={t("rentReceipt.fields.editAdditionalCharge", {
            index: index + 1,
          })}
          data-cy={`btn-modifier-charge-supplementaire-${index}`}
          onClick={() => c.startEditAdditionalCharge(index)}
        />
        <Button
          variant="ghost"
          small
          icon={<Trash2 size={14} />}
          aria-label={t("rentReceipt.fields.removeAdditionalCharge", {
            index: index + 1,
          })}
          data-cy={`btn-retirer-charge-supplementaire-${index}`}
          onClick={() => c.removeAdditionalCharge(index)}
        />
      </div>
    </li>
  );
}
