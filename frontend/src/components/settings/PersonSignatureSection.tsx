import "./PersonSignatureSection.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { toast } from "@/state/toasts";
import { SignatureImageField } from "./SignatureImageField";
import { SignatureStudio } from "./SignatureStudio";
import { signatureImageError } from "./signatureUpload";

/** Signature upload form and studio attached to one natural person or employee. */
export function PersonSignatureSection({ personId }: { personId: number }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
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
      toast.success(
        t("settings.signatures.added", { name: created.name ?? name }),
      );
      setName("");
      setFile(null);
      setRequestError(null);
    },
    onError: (error) => setRequestError(errorMessage(error)),
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
      setNameError(t("settings.signatures.nameRequired"));
      return;
    }
    setNameError(null);
    if (!file) {
      setFileError(t("settings.signatures.fileRequired"));
      return;
    }
    setFileError(null);
    create.mutate({ name: trimmed, file });
  }

  return (
    <div className="person-signature-section">
      <div className="person-signature-section-header">
        <p className="person-signature-section-title">
          {t("settings.signatures.title")}
        </p>
        <p className="person-signature-section-hint">
          {t("settings.signatures.hint")}
        </p>
      </div>

      <div className="person-signature-section-grid">
        <FieldGroup
          id="person-signature-name"
          label={t("settings.signatures.nameLabel")}
          error={nameError ?? undefined}
          help={t("settings.signatures.nameHelp")}
        >
          <input
            id="person-signature-name"
            className={nameError ? "field field-error" : "field"}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={255}
            placeholder={t("settings.signatures.namePlaceholder")}
            data-cy="input-person-signature-name"
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
          data-cy="btn-add-person-signature"
        >
          {t("settings.signatures.add")}
        </Button>
      </div>

      <SignatureStudio personId={personId} />

      <p className="person-signature-section-add-hint">
        <Plus size={12} aria-hidden="true" />
        {t("settings.signatures.keepSeveral")}
      </p>
    </div>
  );
}
