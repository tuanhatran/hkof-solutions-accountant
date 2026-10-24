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
}: {
  signature: SignatureDto;
  onDelete: (signature: SignatureDto) => void;
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
        <p className="signature-card-meta">
          {signature.type === "LANDLORD" ? (
            <>
              Bailleur : <span>{signature.landlordName ?? "Non liée"}</span>
            </>
          ) : (
            "Signature du gérant"
          )}
        </p>
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
