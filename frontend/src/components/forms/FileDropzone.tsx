import "./FileDropzone.css";
import {
  FileText,
  Image as ImageIcon,
  Table2,
  UploadCloud,
  X,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDropzone, type Accept, type FileRejection } from "react-dropzone";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";

const MAX_SIZE = 10 * 1024 * 1024;

export const RECEIPT_FORMATS: Accept = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
  "application/vnd.ms-excel": [".xls"],
  "text/csv": [".csv"],
  "text/plain": [".txt"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

interface FileDropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
  dataCy: string;
  externalError?: string | null;
  text?: string;
  accept?: Accept;
  maxSize?: number;
  formatsDescription?: string;
  ariaLabel?: string;
}

function rejectionMessage(
  rejection: FileRejection,
  maxSize: number,
  formatsDescription: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const code = rejection.errors[0]?.code;
  if (code === "file-too-large") {
    return t("expenseStatement.dropzone.tooLarge", {
      max: Math.round(maxSize / (1024 * 1024)),
    });
  }
  if (code === "too-many-files") {
    return t("expenseStatement.dropzone.tooMany");
  }
  return t("expenseStatement.dropzone.unsupported", {
    formats: formatsDescription,
  });
}

export function FileDropzone({
  onFile,
  disabled = false,
  dataCy,
  externalError,
  text,
  accept = RECEIPT_FORMATS,
  maxSize = MAX_SIZE,
  formatsDescription,
  ariaLabel,
}: FileDropzoneProps) {
  const { t } = useTranslation();
  const [errorText, setErrorText] = useState<string | null>(null);
  const resolvedText = text ?? t("expenseStatement.dropzone.text");
  const resolvedFormats =
    formatsDescription ?? t("expenseStatement.dropzone.formats");
  const resolvedAriaLabel =
    ariaLabel ?? t("expenseStatement.dropzone.ariaLabel");

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    maxSize,
    multiple: false,
    disabled,
    onDropAccepted: (files) => {
      setErrorText(null);
      if (files[0]) {
        onFile(files[0]);
      }
    },
    onDropRejected: (rejections) => {
      const first = rejections[0];
      setErrorText(
        first
          ? rejectionMessage(first, maxSize, resolvedFormats, t)
          : t("expenseStatement.dropzone.rejected"),
      );
    },
  });

  const message = externalError ?? errorText;

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          "group file-dropzone-zone",
          isDragActive
            ? "file-dropzone-zone-active"
            : "file-dropzone-zone-idle",
          disabled && "file-dropzone-zone-disabled",
          message && "file-dropzone-zone-error",
        )}
        aria-disabled={disabled}
      >
        <input
          {...getInputProps()}
          data-cy={dataCy}
          className="sr-only"
          aria-label={resolvedAriaLabel}
        />
        <span className="file-dropzone-icon">
          <UploadCloud size={20} aria-hidden="true" />
        </span>
        <p className="file-dropzone-title">{resolvedText}</p>
        <p className="file-dropzone-hint">
          {t("expenseStatement.dropzone.hint")}
        </p>
        <p className="file-dropzone-meta">
          {t("expenseStatement.dropzone.meta", {
            formats: resolvedFormats,
            max: Math.round(maxSize / (1024 * 1024)),
          })}
        </p>
      </div>
      {message ? (
        <p className="error-text" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}

interface SelectedFileProps {
  name: string;
  size?: number | null;
  mimeType?: string | null;
  inProgress?: boolean;
  onRemove?: () => void;
}

export function SelectedFile({
  name,
  size,
  mimeType,
  inProgress,
  onRemove,
}: SelectedFileProps) {
  const { t } = useTranslation();
  const IconComponent = mimeType?.startsWith("image/")
    ? ImageIcon
    : mimeType?.includes("sheet") || mimeType?.includes("csv")
      ? Table2
      : FileText;

  return (
    <div className="file-dropzone-selected">
      <span className="file-dropzone-selected-icon">
        <IconComponent size={18} aria-hidden="true" />
      </span>
      <div className="file-dropzone-selected-body">
        <p className="file-dropzone-selected-name" title={name}>
          {name}
        </p>
        <p className="file-dropzone-selected-meta">
          {size ? formatBytes(size) : t("expenseStatement.dropzone.attached")}
        </p>
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={inProgress}
          className="file-dropzone-remove"
          aria-label={t("expenseStatement.dropzone.remove", { name })}
          data-cy="btn-remove-file"
        >
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}

export const TEMPLATE_FORMATS: Accept = {
  "text/html": [".html", ".htm"],
};
