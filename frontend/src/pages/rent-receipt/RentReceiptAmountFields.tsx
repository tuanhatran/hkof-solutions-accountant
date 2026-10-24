import "./RentReceiptAmountFields.css";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import type { RentReceiptController } from "./useRentReceiptPage";

/** Period, amounts, dates and the estimated-total block. */
export function RentReceiptAmountFields({ c }: { c: RentReceiptController }) {
  return (
    <>
      <div className="rent-receipt-amount-fields-grid">
        <FieldGroup
          id="quittance-debut"
          label="Début de période"
          error={c.errors.periodStart?.message}
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
          label="Fin de période"
          error={c.errors.periodEnd?.message}
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
          label="Loyer hors charges"
          error={c.errors.rentExclCharges?.message}
          help="Modifiable pour une régularisation ponctuelle."
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
          label="Provision pour charges"
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

      <div className="rent-receipt-amount-fields-total">
        <div>
          <p className="eyebrow text-accent">Total estimé</p>
          <p className="rent-receipt-amount-fields-total-value number">
            {c.estimatedTotal}
          </p>
        </div>
        <p className="rent-receipt-amount-fields-total-note">
          Affichage estimé. Le backend calcule le total du PDF avec arrondi au
          centime.
        </p>
      </div>

      <div className="rent-receipt-amount-fields-grid">
        <FieldGroup
          id="quittance-paiement"
          label="Date de paiement"
          error={c.errors.paymentDate?.message}
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
          label="Date d’émission"
          error={c.errors.issueDate?.message}
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
        Les coordonnées du bailleur, du locataire et du logement proviennent du
        bail sélectionné. Gérez les baux dans la{" "}
        <button
          type="button"
          className="link"
          onClick={() => c.navigate("/configuration")}
        >
          configuration
        </button>
        .
      </p>
    </>
  );
}
