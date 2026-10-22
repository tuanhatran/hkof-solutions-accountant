import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Bouton } from './Bouton';
import { cn } from '@/lib/cn';

interface DialogueConfirmationProps {
  ouvert: boolean;
  titre: string;
  message?: ReactNode;
  libelleConfirmer?: string;
  libelleAnnuler?: string;
  variante?: 'primaire' | 'danger';
  onConfirmer: () => void;
  onAnnuler: () => void;
  dataCy?: string;
}

export function DialogueConfirmation({
  ouvert,
  titre,
  message,
  libelleConfirmer = 'Confirmer',
  libelleAnnuler = 'Annuler',
  variante = 'primaire',
  onConfirmer,
  onAnnuler,
  dataCy = 'dialogue-confirmation',
}: DialogueConfirmationProps) {
  const boutonAnnuler = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!ouvert) {
      return;
    }
    boutonAnnuler.current?.focus();
    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.key === 'Escape') {
        onAnnuler();
      }
    };
    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
  }, [ouvert, onAnnuler]);

  if (!ouvert) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 p-4 backdrop-blur-[2px] sm:items-center"
      onMouseDown={(evenement) => {
        if (evenement.target === evenement.currentTarget) {
          onAnnuler();
        }
      }}
    >
      <div
        className="animation-fondu w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-flottante sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${dataCy}-titre`}
        data-cy={dataCy}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full',
              variante === 'danger' ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning',
            )}
            aria-hidden="true"
          >
            <AlertTriangle size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={`${dataCy}-titre`} className="text-xl text-ink">
              {titre}
            </h2>
            {message ? <div className="mt-2 text-sm leading-relaxed text-ink-soft">{message}</div> : null}
          </div>
          <button
            type="button"
            onClick={onAnnuler}
            className="rounded-lg p-1.5 text-ink-soft transition hover:bg-paper-deep hover:text-ink"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Bouton ref={boutonAnnuler} variante="secondaire" onClick={onAnnuler}>
            {libelleAnnuler}
          </Bouton>
          <Bouton
            variante={variante === 'danger' ? 'danger' : 'primaire'}
            onClick={onConfirmer}
            data-cy="dialogue-confirmer"
          >
            {libelleConfirmer}
          </Bouton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
