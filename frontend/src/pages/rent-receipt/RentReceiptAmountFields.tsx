import "./RentReceiptAmountFields.css";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { RentReceiptController } from "./useRentReceiptPage";

/** Period, amounts, dates and the estimated-total block. */
export function RentReceiptAmountFields({ c }: { c: RentReceiptController }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="rent-receipt-amount-fields-grid">
        <FieldGroup
          id="quittance-debut"
          label={t("rentReceipt.fields.periodStart")}
          error={c.errors.periodStart?.message}
          help={
            c.values.periodStart ? formatDate(c.values.periodStart) : undefined
          }
        >
          <input
            id="quittance-debut"
            type="date"
            className={cn("field", c.errors.periodStart && "field-error")}
            aria-invalid={Boolean(c.errors.periodStart)}
            {...c.register("periodStart", {
              onChange: (event) =>
                c.draft.update({ periodStart: event.target.value }),
            })}
          />
        </FieldGroup>
        <FieldGroup
          id="quittance-fin"
          label={t("rentReceipt.fields.periodEnd")}
          error={c.errors.periodEnd?.message}
          help={c.values.periodEnd ? formatDate(c.values.periodEnd) : undefined}
        >
          <input
            id="quittance-fin"
            type="date"
            className={cn("field", c.errors.periodEnd && "field-error")}
            aria-invalid={Boolean(c.errors.periodEnd)}
            {...c.register("periodEnd", {
              onChange: (event) =>
                c.draft.update({ periodEnd: event.target.value }),
            })}
          />
        </FieldGroup>
      </div>

      <div className="rent-receipt-amount-fields-grid">
        <FieldGroup
          id="quittance-loyer"
          label={t("rentReceipt.fields.rentExclCharges")}
          error={c.errors.rentExclCharges?.message}
          help={t("rentReceipt.fields.rentExclChargesHelp")}
        >
          <div className="rent-receipt-amount-fields-amount">
            <input
              id="quittance-loyer"
              inputMode="decimal"
              className={cn(
                "field pr-9",
                c.errors.rentExclCharges && "field-error",
              )}
              aria-invalid={Boolean(c.errors.rentExclCharges)}
              {...c.register("rentExclCharges", {
                onChange: (event) =>
                  c.draft.update({ rentExclCharges: event.target.value }),
              })}
            />
            <span className="rent-receipt-amount-fields-unit">€</span>
          </div>
        </FieldGroup>
        <FieldGroup
          id="quittance-charges"
          label={t("rentReceipt.fields.charges")}
          error={c.errors.charges?.message}
        >
          <div className="rent-receipt-amount-fields-amount">
            <input
              id="quittance-charges"
              inputMode="decimal"
              className={cn("field pr-9", c.errors.charges && "field-error")}
              aria-invalid={Boolean(c.errors.charges)}
              {...c.register("charges", {
                onChange: (event) =>
                  c.draft.update({ charges: event.target.value }),
              })}
            />
            <span className="rent-receipt-amount-fields-unit">€</span>
          </div>
        </FieldGroup>
      </div>

      <div className="rent-receipt-amount-fields-charges">
        {(c.values.additionalCharges ?? []).length > 0 ? (
          <p className="rent-receipt-amount-fields-charges-title">
            {t("rentReceipt.fields.additionalCharges")}
          </p>
        ) : null}
        <ul className="rent-receipt-amount-fields-charges-list">
          {(c.values.additionalCharges ?? []).map((_charge, index) => {
            const fieldErrors = c.errors.additionalCharges?.[index];
            return (
              <li
                key={index}
                className="rent-receipt-amount-fields-charge"
                data-cy={`charge-supplementaire-${index}`}
              >
                <FieldGroup
                  id={`quittance-charge-libelle-${index}`}
                  label={t("rentReceipt.fields.additionalChargeLabel", {
                    index: index + 1,
                  })}
                  error={fieldErrors?.label?.message}
                >
                  <input
                    id={`quittance-charge-libelle-${index}`}
                    className={cn("field", fieldErrors?.label && "field-error")}
                    aria-invalid={Boolean(fieldErrors?.label)}
                    data-cy={`input-charge-supplementaire-libelle-${index}`}
                    {...c.register(`additionalCharges.${index}.label`)}
                  />
                </FieldGroup>
                <FieldGroup
                  id={`quittance-charge-montant-${index}`}
                  label={t("rentReceipt.fields.additionalChargeAmount", {
                    index: index + 1,
                  })}
                  error={fieldErrors?.amount?.message}
                >
                  <div className="rent-receipt-amount-fields-amount">
                    <input
                      id={`quittance-charge-montant-${index}`}
                      inputMode="decimal"
                      className={cn(
                        "field pr-9",
                        fieldErrors?.amount && "field-error",
                      )}
                      aria-invalid={Boolean(fieldErrors?.amount)}
                      data-cy={`input-charge-supplementaire-montant-${index}`}
                      {...c.register(`additionalCharges.${index}.amount`)}
                    />
                    <span className="rent-receipt-amount-fields-unit">€</span>
                  </div>
                </FieldGroup>
                <Button
                  variant="ghost"
                  small
                  icon={<Trash2 size={14} />}
                  aria-label={t("rentReceipt.fields.removeAdditionalCharge", {
                    index: index + 1,
                  })}
                  onClick={() => c.removeAdditionalCharge(index)}
                  data-cy={`btn-retirer-charge-supplementaire-${index}`}
                >
                  {t("rentReceipt.fields.removeAdditionalChargeShort")}
                </Button>
              </li>
            );
          })}
        </ul>
        <div className="rent-receipt-amount-fields-charges-actions">
          <Button
            variant="secondary"
            small
            icon={<Plus size={14} />}
            onClick={c.addAdditionalCharge}
            data-cy="btn-ajouter-charge-supplementaire"
          >
            {t("rentReceipt.fields.addAdditionalCharge")}
          </Button>
        </div>
      </div>

      <div className="rent-receipt-amount-fields-total">
        <div>
          <p className="eyebrow text-accent">
            {t("rentReceipt.fields.estimatedTotal")}
          </p>
          <p className="rent-receipt-amount-fields-total-value number">
            {c.estimatedTotal}
          </p>
        </div>
        <p className="rent-receipt-amount-fields-total-note">
          {t("rentReceipt.fields.estimatedTotalNote")}
        </p>
      </div>

      <div className="rent-receipt-amount-fields-grid">
        <FieldGroup
          id="quittance-paiement"
          label={t("rentReceipt.fields.paymentDate")}
          error={c.errors.paymentDate?.message}
          help={
            c.values.paymentDate ? formatDate(c.values.paymentDate) : undefined
          }
        >
          <input
            id="quittance-paiement"
            type="date"
            className={cn("field", c.errors.paymentDate && "field-error")}
            {...c.register("paymentDate", {
              onChange: (event) =>
                c.draft.update({ paymentDate: event.target.value }),
            })}
          />
        </FieldGroup>
        <FieldGroup
          id="quittance-emission"
          label={t("rentReceipt.fields.issueDate")}
          error={c.errors.issueDate?.message}
          help={c.values.issueDate ? formatDate(c.values.issueDate) : undefined}
        >
          <input
            id="quittance-emission"
            type="date"
            className={cn("field", c.errors.issueDate && "field-error")}
            {...c.register("issueDate", {
              onChange: (event) =>
                c.draft.update({ issueDate: event.target.value }),
            })}
          />
        </FieldGroup>
      </div>

      <p className="hint">
        {t("rentReceipt.fields.leaseSourceHint")}{" "}
        <button
          type="button"
          className="link"
          onClick={() => c.navigate("/configuration")}
        >
          {t("rentReceipt.fields.configurationLink")}
        </button>
        .
      </p>
    </>
  );
}
