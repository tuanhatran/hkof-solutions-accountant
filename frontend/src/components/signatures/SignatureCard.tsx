import "./SignatureCard.css";
import { Trash2 } from "lucide-react";
import { api } from "@/api/endpoints";
import type { SignatureDto } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/format";
import { signatureTypeLabel } from "./signatureConstants";

/** Listed signature with its metadata and delete action. */
export function SignatureCard({
  signature,
  onDelete,
  highlighted = false,
}: {
  signature: SignatureDto;
  onDelete: (signature: SignatureDto) => void;
  highlighted?: boolean;
}) {
  return (
    <li className="signature-card" data-cy={`signature-${signature.id}`}>
      {signature.id !== undefined ? (
        <img
          src={api.signatures.imageUrl(signature.id)}
          alt={`Signature ${signature.name ?? ""}`}
          className="signature-card-image"
        />
      ) : null}
      <div className="signature-card-body">
        <p className="signature-card-name" title={signature.name ?? ""}>
          {signature.name ?? "Signature"}
        </p>
        <span className="badge badge-neutral signature-card-badge">
          {signatureTypeLabel(signature.type)}
        </span>
        {highlighted ? (
          <span
            className="badge badge-accent signature-card-badge"
            data-cy="signature-par-defaut"
          >
            Signature par défaut des notes de frais
          </span>
        ) : null}
        <p className="signature-card-meta">
          {signature.type === "LANDLORD" ? (
            <>
              Bailleur : <span>{signature.landlordName ?? "Non liée"}</span>
            </>
          ) : (
            <>
              Salarié :{" "}
              <span>
                {signature.employeeName ??
                  (signature.type === "ENTREPRISE_CEO"
                    ? "Gérant d'entreprise"
                    : "Non lié")}
              </span>
            </>
          )}
        </p>
        {signature.type === "LANDLORD" ? null : (
          <p className="signature-card-meta">
            Société : <span>{signature.companyName ?? "Non liée"}</span>
          </p>
        )}
        <p className="signature-card-meta">
          Ajoutée le {formatDate(signature.createdAt)}
        </p>
      </div>
      <Button
        variant="ghost"
        small
        icon={<Trash2 size={13} />}
        className="text-danger hover:bg-danger-soft"
        onClick={() => onDelete(signature)}
        aria-label={`Supprimer ${signature.name ?? "la signature"}`}
        data-cy={`btn-supprimer-signature-${signature.id}`}
      >
        Retirer
      </Button>
    </li>
  );
}
