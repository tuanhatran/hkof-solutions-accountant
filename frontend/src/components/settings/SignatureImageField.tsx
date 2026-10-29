import "./SignatureImageField.css";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FileDropzone } from "@/components/forms/FileDropzone";
import { formatBytes } from "@/lib/format";
import { MAX_SIGNATURE_SIZE, SIGNATURE_FORMATS } from "./signatureUpload";

interface SignatureImageFieldProps {
  file: File | null;
  previewUrl: string | null;
  fileErrorText: string | null;
  pending: boolean;
  onFile: (file: File) => void;
  onRemove: () => void;
}

/** Dropzone and local preview of a signature image. */
export function SignatureImageField({
  file,
  previewUrl,
  fileErrorText,
  pending,
  onFile,
  onRemove,
}: SignatureImageFieldProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className="signature-image-field-dropzone">
        <FileDropzone
          onFile={onFile}
          disabled={pending}
          dataCy="input-signature-image"
          externalError={fileErrorText}
          text={t("settings.signatures.dropzone.text")}
          accept={SIGNATURE_FORMATS}
          maxSize={MAX_SIGNATURE_SIZE}
          formatsDescription={t("settings.signatures.dropzone.formats")}
          ariaLabel={t("settings.signatures.dropzone.ariaLabel")}
        />
      </div>

      {file ? (
        <div className="signature-image-field-preview">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={t("settings.signatures.previewAlt", { name: file.name })}
              className="signature-image-field-preview-image"
              data-cy="signature-preview"
            />
          ) : null}
          <div className="signature-image-field-preview-body">
            <p className="signature-image-field-preview-name" title={file.name}>
              {file.name}
            </p>
            <p className="signature-image-field-preview-size">
              {formatBytes(file.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            disabled={pending}
            className="signature-image-field-remove"
            aria-label={t("settings.signatures.removeImageAria")}
            data-cy="btn-remove-signature-image"
          >
            <X size={16} />
          </button>
        </div>
      ) : null}
    </>
  );
}
