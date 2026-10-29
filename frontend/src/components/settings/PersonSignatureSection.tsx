import "./PersonSignatureSection.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      toast.success(
        t("settings.signatures.added", { name: created.name ?? name }),
      );
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
      toast.success(t("settings.signatures.deleted"));
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

  const list = signatures.data ?? [];

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

      {signatures.isError ? (
        <ErrorState
          message={errorMessage(signatures.error)}
          onRetry={() => void signatures.refetch()}
        />
      ) : signatures.isPending ? (
        <LoadingState message={t("settings.signatures.loading")} />
      ) : list.length === 0 ? (
        <p
          className="person-signature-section-empty"
          data-cy="no-person-signature"
        >
          {t("settings.signatures.empty")}
        </p>
      ) : (
        <ul className="person-signature-section-list">
          {list.map((signature) => (
            <li
              key={signature.id}
              className="person-signature-section-item"
              data-cy={`person-signature-${signature.id}`}
            >
              {signature.id !== undefined ? (
                <img
                  src={api.signatures.imageUrl(signature.id)}
                  alt={t("settings.signatures.imageAlt", {
                    name: signature.name ?? "",
                  })}
                  className="person-signature-section-image"
                />
              ) : null}
              <div className="person-signature-section-item-body">
                <p className="person-signature-section-item-name">
                  {signature.name ?? t("settings.signatures.fallbackName")}
                </p>
                <p className="person-signature-section-item-meta">
                  {t("settings.signatures.addedOn", {
                    date: formatDate(signature.createdAt),
                  })}
                </p>
              </div>
              <Button
                variant="ghost"
                small
                type="button"
                icon={<Trash2 size={13} />}
                className="text-danger hover:bg-danger-soft"
                onClick={() => setToDelete(signature)}
                aria-label={t("settings.signatures.removeAria", {
                  name:
                    signature.name ??
                    t("settings.signatures.removeFallbackName"),
                })}
                data-cy={`btn-delete-person-signature-${signature.id}`}
              >
                {t("settings.signatures.remove")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <p className="person-signature-section-add-hint">
        <Plus size={12} aria-hidden="true" />
        {t("settings.signatures.keepSeveral")}
      </p>

      <ConfirmDialog
        open={toDelete !== null}
        title={t("settings.signatures.deleteDialog.title")}
        message={
          toDelete
            ? t("settings.signatures.deleteDialog.message", {
                name:
                  toDelete.name ??
                  t("settings.signatures.deleteDialog.fallbackName"),
              })
            : ""
        }
        confirmLabel={t("settings.signatures.deleteDialog.confirm")}
        variant="danger"
        onConfirm={() => {
          if (toDelete) {
            remove.mutate(toDelete);
          }
        }}
        onCancel={() => setToDelete(null)}
        dataCy="dialog-delete-person-signature"
      />
    </div>
  );
}
