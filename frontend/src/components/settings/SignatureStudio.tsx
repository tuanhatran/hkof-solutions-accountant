import "./SignatureStudio.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, PenLine, Trash2, Type } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, useSignatures } from "@/api/queries";
import type { SignatureDto } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { formatDate } from "@/lib/format";
import { toast } from "@/state/toasts";
import { SignatureFontGenerator } from "./SignatureFontGenerator";
import { SignaturePadModal } from "./SignaturePadModal";
import { SignatureRenameModal } from "./SignatureRenameModal";

/** Signature studio: list, free-hand drawing, cursive generation and rename. */
export function SignatureStudio({ personId }: { personId: number }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const signatures = useSignatures(personId);
  const [padOpen, setPadOpen] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const [toRename, setToRename] = useState<SignatureDto | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<SignatureDto | null>(null);

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
      setPadOpen(false);
      setFontOpen(false);
      toast.success(
        t("settings.signatures.added", { name: created.name ?? "" }),
      );
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const rename = useMutation({
    mutationFn: (input: { id: number; name: string }) =>
      api.signatures.rename(input.id, input.name),
    onSuccess: () => {
      invalidate();
      setToRename(null);
      setRenameError(null);
      toast.success(t("settings.signatures.renamed"));
    },
    onError: (error) => setRenameError(errorMessage(error)),
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

  const list = signatures.data ?? [];

  function displayName(signature: SignatureDto) {
    return signature.name ?? t("settings.signatures.fallbackName");
  }

  return (
    <div className="signature-studio">
      <div className="signature-studio-tools">
        <Button
          variant="secondary"
          small
          type="button"
          icon={<PenLine size={14} />}
          onClick={() => setPadOpen(true)}
          data-cy="btn-draw-signature"
        >
          {t("settings.signatures.draw")}
        </Button>
        <Button
          variant="secondary"
          small
          type="button"
          icon={<Type size={14} />}
          onClick={() => setFontOpen(true)}
          data-cy="btn-generate-signature"
        >
          {t("settings.signatures.generate")}
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
        <p className="signature-studio-empty" data-cy="no-person-signature">
          {t("settings.signatures.empty")}
        </p>
      ) : (
        <ul className="signature-studio-list">
          {list.map((signature) => (
            <li
              key={signature.id}
              className="signature-studio-item"
              data-cy={`person-signature-${signature.id}`}
            >
              {signature.id !== undefined ? (
                <img
                  src={api.signatures.imageUrl(signature.id)}
                  alt={t("settings.signatures.imageAlt", {
                    name: displayName(signature),
                  })}
                  className="signature-studio-image"
                />
              ) : null}
              <div className="signature-studio-item-body">
                <p className="signature-studio-item-name">
                  {displayName(signature)}
                </p>
                <p className="signature-studio-item-meta">
                  {t("settings.signatures.addedOn", {
                    date: formatDate(signature.createdAt),
                  })}
                </p>
              </div>
              <div className="signature-studio-item-actions">
                <Button
                  variant="ghost"
                  small
                  type="button"
                  icon={<Pencil size={13} />}
                  onClick={() => {
                    setRenameError(null);
                    setToRename(signature);
                  }}
                  aria-label={t("settings.signatures.renameAria", {
                    name: displayName(signature),
                  })}
                  data-cy={`btn-rename-person-signature-${signature.id}`}
                >
                  {t("settings.signatures.rename")}
                </Button>
                <Button
                  variant="ghost"
                  small
                  type="button"
                  icon={<Trash2 size={13} />}
                  className="text-danger hover:bg-danger-soft"
                  onClick={() => setToDelete(signature)}
                  aria-label={t("settings.signatures.removeAria", {
                    name: displayName(signature),
                  })}
                  data-cy={`btn-delete-person-signature-${signature.id}`}
                >
                  {t("settings.signatures.remove")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <SignaturePadModal
        open={padOpen}
        onClose={() => setPadOpen(false)}
        onSubmit={(file) =>
          create.mutate({ name: t("settings.signatures.drawnName"), file })
        }
        pending={create.isPending}
      />
      <SignatureFontGenerator
        open={fontOpen}
        onClose={() => setFontOpen(false)}
        onSubmit={(file, text) => create.mutate({ name: text, file })}
        pending={create.isPending}
      />
      <SignatureRenameModal
        open={toRename !== null}
        signature={toRename}
        onClose={() => {
          setToRename(null);
          setRenameError(null);
        }}
        onSubmit={(name) => {
          if (toRename?.id !== undefined) {
            rename.mutate({ id: toRename.id, name });
          }
        }}
        pending={rename.isPending}
        error={renameError}
      />

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
