import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SignatureDto } from "@/api/types";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { FormModal } from "@/components/ui/FormModal";

interface SignatureRenameModalProps {
  open: boolean;
  signature: SignatureDto | null;
  onClose: () => void;
  onSubmit: (name: string) => void;
  pending?: boolean;
  error?: string | null;
}

/** Rename modal of one owned signature; the studio owns the request. */
export function SignatureRenameModal({
  open,
  signature,
  onClose,
  onSubmit,
  pending = false,
  error = null,
}: SignatureRenameModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(signature?.name ?? "");
      setNameError(null);
    }
  }, [open, signature]);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t("settings.signatures.nameRequired"));
      return;
    }
    setNameError(null);
    onSubmit(trimmed);
  }

  return (
    <FormModal
      open={open}
      title={t("settings.signatures.renameTitle")}
      onClose={onClose}
      onSubmit={submit}
      formDataCy="signature-rename-form"
      submitDataCy="btn-rename-signature"
      pending={pending}
      error={nameError ?? error}
    >
      <FieldGroup
        id="signature-rename-name"
        label={t("settings.signatures.nameLabel")}
        help={t("settings.signatures.nameHelp")}
      >
        <input
          id="signature-rename-name"
          className={nameError ? "field field-error" : "field"}
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={255}
          data-cy="input-signature-rename-name"
        />
      </FieldGroup>
    </FormModal>
  );
}
