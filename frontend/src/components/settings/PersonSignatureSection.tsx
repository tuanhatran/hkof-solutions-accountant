import "./PersonSignatureSection.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, useSignatures } from "@/api/queries";
import type { SignatureDto } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { formatDate } from "@/lib/format";
import { toast } from "@/state/toasts";
import { SignatureImageField } from "./SignatureImageField";
import { signatureImageError } from "./signatureUpload";

/** Signature list and upload form attached to one natural person or employee. */
export function PersonSignatureSection({ personId }: { personId: number }) {
  const queryClient = useQueryClient();
  const signatures = useSignatures(personId);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<SignatureDto | null>(null);
  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.signaturesAll });
    void queryClient.invalidateQueries({ queryKey: queryKeys.persons });
    void queryClient.invalidateQueries({ queryKey: queryKeys.employeesAll });
  }

  const create = useMutation({
    mutationFn: (input: { name: string; file: File }) =>
      api.signatures.create(personId, input.name, input.file),
    onSuccess: (created) => {
      invalidate();
      toast.success(`Signature « ${created.name ?? name} » ajoutée.`);
      setName("");
      setFile(null);
      setRequestError(null);
    },
    onError: (error) => setRequestError(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (signature: SignatureDto) =>
      api.signatures.remove(signature.id as number),
    onSuccess: () => {
      invalidate();
      setToDelete(null);
      toast.success("Signature supprimée.");
    },
    onError: (error) => {
      setToDelete(null);
      toast.error(errorMessage(error));
    },
  });

  function selectFile(candidate: File) {
    const rejected = signatureImageError(candidate);
    if (rejected) {
      setFileError(rejected);
      setFile(null);
      return;
    }
    setFileError(null);
    setFile(candidate);
  }

  function add() {
    setRequestError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Le nom de la signature est obligatoire.");
      return;
    }
    setNameError(null);
    if (!file) {
      setFileError("Sélectionnez une image PNG ou JPEG.");
      return;
    }
    setFileError(null);
    create.mutate({ name: trimmed, file });
  }

  const list = signatures.data ?? [];

  return (
    <div className="person-signature-section">
      <div className="person-signature-section-header">
        <p className="person-signature-section-title">Signatures</p>
        <p className="person-signature-section-hint">
          Images PNG ou JPEG, 2 Mo maximum. Suppression logique uniquement.
        </p>
      </div>

      <div className="person-signature-section-grid">
        <FieldGroup
          id="signature-personne-nom"
          label="Nom de la signature"
          error={nameError ?? undefined}
          help="Affiché dans la liste déroulante des documents."
        >
          <input
            id="signature-personne-nom"
            className={nameError ? "field field-error" : "field"}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={255}
            placeholder="Signature du bailleur"
            data-cy="input-signature-personne-nom"
          />
        </FieldGroup>
      </div>

      <SignatureImageField
        file={file}
        previewUrl={previewUrl}
        fileErrorText={fileError}
        pending={create.isPending}
        onFile={selectFile}
        onRemove={() => {
          setFile(null);
          setFileError(null);
        }}
      />

      {requestError ? (
        <p className="person-signature-section-error" role="alert">
          {requestError}
        </p>
      ) : null}

      <div className="person-signature-section-actions">
        <Button
          variant="primary"
          small
          type="button"
          icon={<Check size={14} />}
          loading={create.isPending}
          onClick={add}
          data-cy="btn-ajouter-signature-personne"
        >
          Ajouter la signature
        </Button>
      </div>

      {signatures.isError ? (
        <ErrorState
          message={errorMessage(signatures.error)}
          onRetry={() => void signatures.refetch()}
        />
      ) : signatures.isPending ? (
        <LoadingState message="Chargement des signatures…" />
      ) : list.length === 0 ? (
        <p
          className="person-signature-section-empty"
          data-cy="aucune-signature-personne"
        >
          Aucune signature enregistrée. Ajoutez une image pour signer les
          documents de cette personne.
        </p>
      ) : (
        <ul className="person-signature-section-list">
          {list.map((signature) => (
            <li
              key={signature.id}
              className="person-signature-section-item"
              data-cy={`signature-personne-${signature.id}`}
            >
              {signature.id !== undefined ? (
                <img
                  src={api.signatures.imageUrl(signature.id)}
                  alt={`Signature ${signature.name ?? ""}`}
                  className="person-signature-section-image"
                />
              ) : null}
              <div className="person-signature-section-item-body">
                <p className="person-signature-section-item-name">
                  {signature.name ?? "Signature"}
                </p>
                <p className="person-signature-section-item-meta">
                  Ajoutée le {formatDate(signature.createdAt)}
                </p>
              </div>
              <Button
                variant="ghost"
                small
                type="button"
                icon={<Trash2 size={13} />}
                className="text-danger hover:bg-danger-soft"
                onClick={() => setToDelete(signature)}
                aria-label={`Supprimer ${signature.name ?? "la signature"}`}
                data-cy={`btn-supprimer-signature-personne-${signature.id}`}
              >
                Retirer
              </Button>
            </li>
          ))}
        </ul>
      )}

      <p className="person-signature-section-add-hint">
        <Plus size={12} aria-hidden="true" />
        Une personne peut conserver plusieurs signatures.
      </p>

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cette signature ?"
        message={
          toDelete
            ? `« ${toDelete.name ?? "Cette signature"} » ne sera plus proposée dans les documents. Les documents existants restent inchangés.`
            : ""
        }
        confirmLabel="Supprimer la signature"
        variant="danger"
        onConfirm={() => {
          if (toDelete) {
            remove.mutate(toDelete);
          }
        }}
        onCancel={() => setToDelete(null)}
        dataCy="dialogue-supprimer-signature-personne"
      />
    </div>
  );
}
