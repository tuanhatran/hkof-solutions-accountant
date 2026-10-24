import "./SignatureForm.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, useLandlords } from "@/api/queries";
import type { SignatureType } from "@/api/types";
import { FileDropzone } from "@/components/forms/FileDropzone";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { formatBytes } from "@/lib/format";
import { toast } from "@/state/toasts";
import {
  MAX_SIGNATURE_SIZE,
  SIGNATURE_FORMATS,
  SIGNATURE_TYPES,
  signatureImageError,
} from "./signatureConstants";

/** Upload form creating a signature image. */
export function SignatureForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const landlords = useLandlords();
  const [type, setType] = useState<SignatureType>("LANDLORD");
  const [name, setName] = useState("");
  const [landlordId, setLandlordId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [landlordError, setLandlordError] = useState<string | null>(null);
  const [fileErrorText, setFileErrorText] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const landlordRows = landlords.data ?? [];

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

  const create = useMutation({
    mutationFn: (input: {
      type: SignatureType;
      name: string;
      file: File;
      landlordId: number | null;
    }) =>
      api.signatures.create(
        input.type,
        input.name,
        input.file,
        input.landlordId,
      ),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.signatures });
      toast.success(`Signature « ${created.name ?? name} » ajoutée.`);
      setType("LANDLORD");
      setName("");
      setLandlordId("");
      setFile(null);
      setNameError(null);
      setLandlordError(null);
      setFileErrorText(null);
      setRequestError(null);
      onClose();
    },
    onError: (error) => setRequestError(errorMessage(error)),
  });

  function selectFile(candidate: File) {
    const rejected = signatureImageError(candidate);
    if (rejected) {
      setFileErrorText(rejected);
      setFile(null);
      return;
    }
    setFileErrorText(null);
    setFile(candidate);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Le nom de la signature est obligatoire.");
      return;
    }
    setNameError(null);
    if (!file) {
      setFileErrorText("Sélectionnez une image PNG ou JPEG.");
      return;
    }
    setFileErrorText(null);
    if (type === "LANDLORD" && !landlordId) {
      setLandlordError("Le bailleur de la signature est obligatoire.");
      return;
    }
    setLandlordError(null);
    create.mutate({
      type,
      name: trimmedName,
      file,
      landlordId: type === "LANDLORD" ? Number(landlordId) : null,
    });
  }

  return (
    <form
      className="signature-form"
      onSubmit={submit}
      noValidate
      data-cy="formulaire-signature"
    >
      <h3 className="signature-form-title">Ajouter une signature</h3>

      <div className="signature-form-grid">
        <FieldGroup
          id="signature-type"
          label="Type de signature"
          help="Le bailleur signe les quittances, le gérant les notes de frais."
        >
          <select
            id="signature-type"
            className="field"
            value={type}
            onChange={(event) => {
              const next = SIGNATURE_TYPES.find(
                (candidate) => candidate.value === event.target.value,
              );
              if (next) {
                setType(next.value);
              }
            }}
            data-cy="select-type-signature"
          >
            {SIGNATURE_TYPES.map((candidate) => (
              <option key={candidate.value} value={candidate.value}>
                {candidate.label}
              </option>
            ))}
          </select>
        </FieldGroup>
        <FieldGroup
          id="signature-nom"
          label="Nom"
          error={nameError ?? undefined}
          help="Affiché dans la liste déroulante des documents."
        >
          <input
            id="signature-nom"
            className={nameError ? "field field-error" : "field"}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={255}
            placeholder="Signature du bailleur"
            data-cy="input-signature-nom"
          />
        </FieldGroup>
      </div>

      {type === "LANDLORD" ? (
        <div className="signature-form-landlord">
          <FieldGroup
            id="signature-bailleur"
            label="Bailleur de la signature"
            error={landlordError ?? undefined}
            help="La signature n’est proposée que pour les quittances de ce bailleur."
          >
            <select
              id="signature-bailleur"
              className={landlordError ? "field field-error" : "field"}
              value={landlordId}
              onChange={(event) => setLandlordId(event.target.value)}
              disabled={landlords.isPending}
              data-cy="select-bailleur-signature"
            >
              <option value="">Sélectionnez un bailleur</option>
              {landlordRows.map((landlord) => (
                <option key={landlord.id} value={landlord.id}>
                  {landlord.name}
                </option>
              ))}
            </select>
          </FieldGroup>
        </div>
      ) : null}

      <div className="signature-form-dropzone">
        <FileDropzone
          onFile={selectFile}
          disabled={create.isPending}
          dataCy="input-signature-image"
          externalError={fileErrorText}
          text="Déposez l’image de la signature"
          accept={SIGNATURE_FORMATS}
          maxSize={MAX_SIGNATURE_SIZE}
          formatsDescription="PNG, JPEG"
          ariaLabel="Choisir une image de signature"
        />
      </div>

      {file ? (
        <div className="signature-form-preview">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={`Aperçu de ${file.name}`}
              className="signature-form-preview-image"
              data-cy="apercu-signature"
            />
          ) : null}
          <div className="signature-form-preview-body">
            <p className="signature-form-preview-name" title={file.name}>
              {file.name}
            </p>
            <p className="signature-form-preview-size">
              {formatBytes(file.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setFileErrorText(null);
            }}
            disabled={create.isPending}
            className="signature-form-remove"
            aria-label="Retirer l’image de la signature"
            data-cy="btn-retirer-signature-image"
          >
            <X size={16} />
          </button>
        </div>
      ) : null}

      {requestError ? (
        <p className="signature-form-error" role="alert">
          {requestError}
        </p>
      ) : null}

      <div className="signature-form-actions">
        <Button
          variant="ghost"
          small
          onClick={onClose}
          disabled={create.isPending}
        >
          Annuler
        </Button>
        <Button
          variant="primary"
          small
          type="submit"
          loading={create.isPending}
          icon={<Check size={14} />}
          data-cy="btn-enregistrer-signature"
        >
          Ajouter la signature
        </Button>
      </div>
    </form>
  );
}
