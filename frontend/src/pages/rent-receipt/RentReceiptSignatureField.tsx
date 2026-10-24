import "./RentReceiptSignatureField.css";
import { Link } from "react-router-dom";
import { errorMessage } from "@/api/client";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { signatureTypeLabel } from "@/components/signatures/signatureConstants";
import type { RentReceiptController } from "./useRentReceiptPage";

/** Signature picker plus its three possible alerts. */
export function RentReceiptSignatureField({ c }: { c: RentReceiptController }) {
  return (
    <>
      <div className="rent-receipt-signature-field-grid">
        <FieldGroup
          id="quittance-signature"
          label="Signature"
          help="Image apposée au bas du PDF généré."
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
                {candidate.name} — {signatureTypeLabel(candidate.type)}
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
      ) : (c.signatures.data ?? []).length === 0 && !c.signatures.isPending ? (
        <p
          className="rent-receipt-signature-field-alert"
          role="alert"
          data-cy="alerte-signature-manquante"
        >
          Aucune signature trouvée. Configurez une signature dans la page{" "}
          <Link to="/configuration" className="link">
            Paramètres
          </Link>
          .
        </p>
      ) : c.landlordWithoutSignature ? (
        <p
          className="rent-receipt-signature-field-alert"
          role="alert"
          data-cy="alerte-signature-bailleur"
        >
          Aucune signature pour ce bailleur. Ajoutez une signature liée à ce
          bailleur dans la page{" "}
          <Link to="/configuration" className="link">
            Paramètres
          </Link>
          .
        </p>
      ) : null}
    </>
  );
}
