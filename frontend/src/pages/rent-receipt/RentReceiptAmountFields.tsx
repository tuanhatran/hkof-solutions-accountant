import "./RentReceiptAmountFields.css";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { RentReceiptAdditionalChargeRow } from "./RentReceiptAdditionalChargeRow";
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
        {(c.values.additionalCharges ?? []).length > 0 ||
        c.editingAdditionalCharge !== null ? (
          <p className="rent-receipt-amount-fields-charges-title">
            {t("rentReceipt.fields.additionalCharges")}
          </p>
        ) : null}
        <ul className="rent-receipt-amount-fields-charges-list">
          {(c.values.additionalCharges ?? []).map((charge, index) => (
            <RentReceiptAdditionalChargeRow
              key={index}
              c={c}
              index={index}
              charge={charge}
            />
          ))}
          {c.editingAdditionalCharge?.index === null ? (
            <RentReceiptAdditionalChargeRow key="nouvelle" c={c} index={null} />
          ) : null}
        </ul>
        <div className="rent-receipt-amount-fields-charges-actions">
          <Button
            variant="secondary"
            small
            icon={<Plus size={14} />}
            onClick={c.startAddAdditionalCharge}
            disabled={!c.canAddAdditionalCharge}
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
