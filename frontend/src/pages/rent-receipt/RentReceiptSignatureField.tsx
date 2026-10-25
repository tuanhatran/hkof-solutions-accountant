import "./RentReceiptSignatureField.css";
import { Link } from "react-router-dom";
import { errorMessage } from "@/api/client";
import { FieldGroup } from "@/components/ui/FieldGroup";
import type { RentReceiptController } from "./useRentReceiptPage";

/** Signature picker of the selected landlord plus its alerts. */
export function RentReceiptSignatureField({ c }: { c: RentReceiptController }) {
  return (
    <>
      <div className="rent-receipt-signature-field-grid">
        <FieldGroup
          id="quittance-signature"
          label="Signature"
          help="Signatures du bailleur sélectionné, apposées au bas du PDF."
          badge={<span className="badge badge-neutral">PNG / JPEG</span>}
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
              <option value="">Aucune signature</option>
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
          Les signatures n’ont pas pu être chargées :{" "}
          {errorMessage(c.signatures.error)}
        </p>
      ) : c.landlordWithoutSignature ? (
        <p
          className="rent-receipt-signature-field-alert"
          role="alert"
          data-cy="alerte-signature-bailleur"
        >
          Aucune signature pour ce bailleur. Ajoutez-en une dans sa fiche, page{" "}
          <Link to="/configuration/lmnp" className="link">
            LMNP · Personnes
          </Link>
          .
        </p>
      ) : null}
    </>
  );
}
