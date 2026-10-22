import { FileText, Image as ImageIcon, Table2, UploadCloud, X } from 'lucide-react';
import { useState } from 'react';
import { useDropzone, type Accept, type FileRejection } from 'react-dropzone';
import { cn } from '@/lib/cn';
import { formatOctets } from '@/lib/format';

const TAILLE_MAX = 10 * 1024 * 1024;

export const FORMATS_JUSTIFICATIF: Accept = {
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
  onFichier: (fichier: File) => void;
  disabled?: boolean;
  dataCy: string;
  erreurExterne?: string | null;
  texte?: string;
  accept?: Accept;
  tailleMax?: number;
  descriptionFormats?: string;
  ariaLabel?: string;
}

function messageRejet(
  rejet: FileRejection,
  tailleMax: number,
  descriptionFormats: string,
): string {
  const code = rejet.errors[0]?.code;
  if (code === 'file-too-large') {
    return `Fichier trop volumineux (${Math.round(tailleMax / (1024 * 1024))} Mo maximum).`;
  }
  if (code === 'too-many-files') {
    return 'Un seul fichier à la fois.';
  }
  return `Format non accepté. Formats : ${descriptionFormats}.`;
}

export function FileDropzone({
  onFichier,
  disabled = false,
  dataCy,
  erreurExterne,
  texte = 'Glissez votre justificatif ici',
  accept = FORMATS_JUSTIFICATIF,
  tailleMax = TAILLE_MAX,
  descriptionFormats = 'PDF, DOCX, XLSX, XLS, CSV, TXT, JPG, PNG',
  ariaLabel = 'Choisir un fichier justificatif',
}: FileDropzoneProps) {
  const [erreur, setErreur] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    maxSize: tailleMax,
    multiple: false,
    disabled,
    onDropAccepted: (fichiers) => {
      setErreur(null);
      if (fichiers[0]) {
        onFichier(fichiers[0]);
      }
    },
    onDropRejected: (rejets) => {
      const premier = rejets[0];
      setErreur(premier ? messageRejet(premier, tailleMax, descriptionFormats) : 'Fichier refusé.');
    },
  });

  const message = erreurExterne ?? erreur;

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
        <p className="mt-3 text-sm font-semibold text-ink">{texte}</p>
        <p className="mt-1 text-xs text-ink-soft">ou cliquez pour parcourir vos fichiers</p>
        <p className="mt-3 text-[11px] text-ink-soft/80">
          {descriptionFormats} — {Math.round(tailleMax / (1024 * 1024))} Mo max.
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

interface FichierSelectionneProps {
  nom: string;
  taille?: number | null;
  typeMime?: string | null;
  enCours?: boolean;
  onRetirer?: () => void;
}

export function FichierSelectionne({ nom, taille, typeMime, enCours, onRetirer }: FichierSelectionneProps) {
  const Icone = typeMime?.startsWith('image/')
    ? ImageIcon
    : typeMime?.includes('sheet') || typeMime?.includes('csv')
      ? Table2
      : FileText;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-paper/50 p-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface text-accent">
        <Icone size={18} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink" title={nom}>
          {nom}
        </p>
        <p className="text-xs text-ink-soft">{taille ? formatOctets(taille) : 'Justificatif joint'}</p>
      </div>
      {onRetirer ? (
        <button
          type="button"
          onClick={onRetirer}
          disabled={enCours}
          className="rounded-lg p-2 text-ink-soft transition hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Retirer ${nom}`}
          data-cy="btn-retirer-fichier"
        >
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}

export const FORMATS_TEMPLATE: Accept = {
  'text/html': ['.html', '.htm'],
};
