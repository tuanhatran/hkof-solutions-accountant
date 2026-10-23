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
    <li
      className="flex items-center gap-3 rounded-xl border border-line bg-paper/40 p-3"
      data-cy={`signature-${signature.id}`}
    >
      {signature.id !== undefined ? (
        <img
          src={api.signatures.imageUrl(signature.id)}
          alt={`Signature ${signature.name ?? ""}`}
          className="h-14 w-24 shrink-0 rounded-lg border border-line bg-white object-contain p-1"
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-semibold text-ink"
          title={signature.name ?? ""}
        >
          {signature.name ?? "Signature"}
        </p>
        <span className="badge badge-neutral mt-1">
          {signatureTypeLabel(signature.type)}
        </span>
        <p className="mt-1 text-[11px] text-ink-soft">
          {signature.type === "LANDLORD" ? (
            <>
              Bailleur : <span>{signature.landlordName ?? "Non liée"}</span>
            </>
          ) : (
            "Signature du gérant"
          )}
        </p>
        <p className="mt-1 text-[11px] text-ink-soft">
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
