import "./RentReceiptSignatureField.css";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { errorMessage } from "@/api/client";
import { FieldGroup } from "@/components/ui/FieldGroup";
import type { RentReceiptController } from "./useRentReceiptPage";

/** Signature picker of the selected landlord plus its alerts. */
export function RentReceiptSignatureField({ c }: { c: RentReceiptController }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="rent-receipt-signature-field-grid">
        <FieldGroup
          id="quittance-signature"
          label={t("rentReceipt.fields.signature")}
          help={t("rentReceipt.fields.signatureHelp")}
          badge={
            <span className="badge badge-neutral">
              {t("rentReceipt.fields.signatureBadge")}
            </span>
          }
        >
          <select
            id="quittance-signature"
            className="field"
            data-cy="select-signature"
            value={c.selectedSignatureId ?? ""}
            onChange={(event) =>
              c.setChosenSignatureId(
                event.target.value ? Number(event.target.value) : null,
              )
            }
            disabled={
              c.signatures.isPending || c.availableSignatures.length === 0
            }
          >
            {c.availableSignatures.length === 0 ? (
              <option value="">{t("rentReceipt.fields.noSignature")}</option>
            ) : null}
            {c.availableSignatures.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
        </FieldGroup>
      </div>

      {c.signatures.isError ? (
        <p
          className="rent-receipt-signature-field-alert"
          role="alert"
          aria-live="polite"
          data-cy="alerte-signatures-erreur"
        >
          {t("rentReceipt.fields.signaturesError", {
            message: errorMessage(c.signatures.error),
          })}
        </p>
      ) : c.landlordWithoutSignature ? (
        <p
          className="rent-receipt-signature-field-alert"
          role="alert"
          data-cy="alerte-signature-bailleur"
        >
          {t("rentReceipt.fields.missingLandlordSignatureBefore")}{" "}
          <Link to="/configuration/lmnp" className="link">
            {t("rentReceipt.fields.lmnpPersonsLink")}
          </Link>
          {t("rentReceipt.fields.missingLandlordSignatureAfter")}
        </p>
      ) : null}
    </>
  );
}
