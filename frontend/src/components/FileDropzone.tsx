import { FileText, Image as ImageIcon, Table2, UploadCloud, X } from 'lucide-react';
import { useState } from 'react';
import { useDropzone, type Accept, type FileRejection } from 'react-dropzone';
import { cn } from '@/lib/cn';
import { formatBytes } from '@/lib/format';

const MAX_SIZE = 10 * 1024 * 1024;

export const RECEIPT_FORMATS: Accept = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'text/csv': ['.csv'],
  'text/plain': ['.txt'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};

interface FileDropzoneProps {
  onFichier: (file: File) => void;
  disabled?: boolean;
  dataCy: string;
  erreurExterne?: string | null;
  texte?: string;
  accept?: Accept;
  tailleMax?: number;
  descriptionFormats?: string;
  ariaLabel?: string;
}

function rejectionMessage(
  rejection: FileRejection,
  maxSize: number,
  formatsDescription: string,
): string {
  const code = rejection.errors[0]?.code;
  if (code === 'file-too-large') {
    return `Fichier trop volumineux (${Math.round(maxSize / (1024 * 1024))} Mo maximum).`;
  }
  if (code === 'too-many-files') {
    return 'Un seul fichier à la fois.';
  }
  return `Format non accepté. Formats : ${formatsDescription}.`;
}

export function FileDropzone({
  onFichier: onFile,
  disabled = false,
  dataCy,
  erreurExterne: externalError,
  texte: text = 'Glissez votre justificatif ici',
  accept = RECEIPT_FORMATS,
  tailleMax: maxSize = MAX_SIZE,
  descriptionFormats: formatsDescription = 'PDF, DOCX, XLSX, XLS, CSV, TXT, JPG, PNG',
  ariaLabel = 'Choisir un fichier justificatif',
}: FileDropzoneProps) {
  const [errorText, setErrorText] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    maxSize: maxSize,
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
      setErrorText(first ? rejectionMessage(first, maxSize, formatsDescription) : 'Fichier refusé.');
    },
  });

  const message = externalError ?? errorText;

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          'group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition',
          isDragActive
            ? 'border-accent bg-accent-soft/70'
            : 'border-line-forte/70 bg-paper/40 hover:border-accent/50 hover:bg-accent-soft/30',
          disabled && 'cursor-not-allowed opacity-60',
          message && 'border-danger/50 bg-danger-soft/30',
        )}
        aria-disabled={disabled}
      >
        <input {...getInputProps()} data-cy={dataCy} className="sr-only" aria-label={ariaLabel} />
        <span className="grid h-11 w-11 place-items-center rounded-full bg-surface text-accent shadow-sm transition group-hover:scale-105">
          <UploadCloud size={20} aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm font-semibold text-ink">{text}</p>
        <p className="mt-1 text-xs text-ink-soft">ou cliquez pour parcourir vos fichiers</p>
        <p className="mt-3 text-[11px] text-ink-soft/80">
          {formatsDescription} — {Math.round(maxSize / (1024 * 1024))} Mo max.
        </p>
      </div>
      {message ? (
        <p className="erreur-champ" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}

interface SelectedFileProps {
  nom: string;
  taille?: number | null;
  typeMime?: string | null;
  enCours?: boolean;
  onRetirer?: () => void;
}

export function SelectedFile({ nom: name, taille: size, typeMime: mimeType, enCours: inProgress, onRetirer: onRemove }: SelectedFileProps) {
  const IconComponent = mimeType?.startsWith('image/')
    ? ImageIcon
    : mimeType?.includes('sheet') || mimeType?.includes('csv')
      ? Table2
      : FileText;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-paper/50 p-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface text-accent">
        <IconComponent size={18} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink" title={name}>
          {name}
        </p>
        <p className="text-xs text-ink-soft">{size ? formatBytes(size) : 'Justificatif joint'}</p>
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={inProgress}
          className="rounded-lg p-2 text-ink-soft transition hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
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
  'text/html': ['.html', '.htm'],
};
