import "./FileDropzone.css";
import {
  FileText,
  Image as ImageIcon,
  Table2,
  UploadCloud,
  X,
} from "lucide-react";
import { useState } from "react";
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
): string {
  const code = rejection.errors[0]?.code;
  if (code === "file-too-large") {
    return `Fichier trop volumineux (${Math.round(maxSize / (1024 * 1024))} Mo maximum).`;
  }
  if (code === "too-many-files") {
    return "Un seul fichier à la fois.";
  }
  return `Format non accepté. Formats : ${formatsDescription}.`;
}

export function FileDropzone({
  onFile,
  disabled = false,
  dataCy,
  externalError,
  text = "Glissez votre justificatif ici",
  accept = RECEIPT_FORMATS,
  maxSize = MAX_SIZE,
  formatsDescription = "PDF, DOCX, XLSX, XLS, CSV, TXT, JPG, PNG",
  ariaLabel = "Choisir un fichier justificatif",
}: FileDropzoneProps) {
  const [errorText, setErrorText] = useState<string | null>(null);

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
          ? rejectionMessage(first, maxSize, formatsDescription)
          : "Fichier refusé.",
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
          aria-label={ariaLabel}
        />
        <span className="file-dropzone-icon">
          <UploadCloud size={20} aria-hidden="true" />
        </span>
        <p className="file-dropzone-title">{text}</p>
        <p className="file-dropzone-hint">
          ou cliquez pour parcourir vos fichiers
        </p>
        <p className="file-dropzone-meta">
          {formatsDescription} — {Math.round(maxSize / (1024 * 1024))} Mo max.
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
          {size ? formatBytes(size) : "Justificatif joint"}
        </p>
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={inProgress}
          className="file-dropzone-remove"
          aria-label={`Retirer ${name}`}
          data-cy="btn-retirer-fichier"
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
