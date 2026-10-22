import { ChevronLeft, ChevronRight, Download, FileText, Minus, Plus } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Bouton } from './Bouton';
import { Spinner } from './Etats';
import { cn } from '@/lib/cn';
import { formatDateHeure } from '@/lib/format';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

interface PdfViewerProps {
  url: string | null;
  chargement?: boolean;
  erreur?: string | null;
  misAJour?: Date | null;
  onTelecharger?: () => void;
  actions?: ReactNode;
  dataCy?: string;
  className?: string;
}

export function PdfViewer({
  url,
  chargement = false,
  erreur = null,
  misAJour = null,
  onTelecharger,
  actions,
  dataCy = 'apercu-pdf',
  className,
}: PdfViewerProps) {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const zonePdfRef = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState(560);
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(1);
  const [nombrePages, setNombrePages] = useState(0);
  const [erreurPdf, setErreurPdf] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
    setNombrePages(0);
    setErreurPdf(null);
  }, [url]);

  useEffect(() => {
    const element = conteneurRef.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observateur = new ResizeObserver((entrees) => {
      const largeurDisponible = entrees[0]?.contentRect.width;
      if (largeurDisponible) {
        setLargeur(Math.max(260, Math.floor(largeurDisponible - 40)));
      }
    });
    observateur.observe(element);
    return () => observateur.disconnect();
  }, []);

  const changerZoom = (delta: number) => {
    setZoom((valeur) => Math.min(1.75, Math.max(0.7, Number((valeur + delta).toFixed(2)))));
  };

  const allerPage = (numero: number) => {
    setPage(Math.min(nombrePages, Math.max(1, numero)));
    zonePdfRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const messageErreur = erreur ?? erreurPdf;

  return (
    <section className={cn('carte flex min-h-[420px] flex-col overflow-hidden', className)} data-cy={dataCy}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-accent">
            <FileText size={16} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold leading-tight text-ink">Aperçu du document</h2>
            <p className="text-[11px] text-ink-soft">Filigrane « APERÇU » — rien n’est enregistré.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {url ? (
            <span className="text-[11px] text-ink-soft" data-cy="apercu-maj" aria-live="polite">
              {misAJour ? `Mis à jour à ${formatDateHeure(misAJour.toISOString())}` : '—'}
            </span>
          ) : null}
        </div>
      </div>

      {messageErreur ? (
        <div className="border-b border-warning/20 bg-warning-soft px-4 py-2 text-xs font-medium text-warning" role="alert">
          {messageErreur}
        </div>
      ) : null}

      <div ref={conteneurRef} className="relative flex-1">
        <div ref={zonePdfRef} className="max-h-[68vh] min-h-[360px] overflow-auto bg-paper-deep/45 p-5">
          {url ? (
            <div className="flex justify-center">
              <Document
                file={url}
                onLoadSuccess={({ numPages }: { numPages: number }) => {
                  setNombrePages(numPages);
                  setErreurPdf(null);
                }}
                onLoadError={() => setErreurPdf("Impossible d'afficher l'aperçu PDF.")}
                loading={
                  <div className="flex items-center gap-2 px-8 py-16 text-sm text-ink-soft">
                    <Spinner /> Chargement du PDF…
                  </div>
                }
              >
                <Page
                  pageNumber={page}
                  width={Math.round(largeur * zoom)}
                  className="overflow-hidden rounded-sm shadow-[0_18px_50px_-20px_rgba(33,48,43,0.55)]"
                  loading={
                    <div className="flex items-center justify-center bg-white" style={{ width: Math.round(largeur * zoom), height: Math.round(1.414 * largeur * zoom) }}>
                      <Spinner taille={24} />
                    </div>
                  }
                />
              </Document>
            </div>
          ) : (
            <div className="flex min-h-[340px] flex-col items-center justify-center gap-3 text-center">
              {chargement ? (
                <>
                  <Spinner taille={26} />
                  <p className="text-sm text-ink-soft">Préparation de l’aperçu…</p>
                </>
              ) : (
                <>
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-surface text-ink-soft/70">
                    <FileText size={22} aria-hidden="true" />
                  </span>
                  <p className="max-w-xs text-sm text-ink-soft">
                    L’aperçu apparaîtra ici dès que les informations seront complètes.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {chargement && url ? (
          <div className="surface-verre absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Spinner taille={26} />
            <p className="text-sm font-medium text-ink">Mise à jour de l’aperçu…</p>
            <p className="text-xs text-ink-soft">L’ancienne version reste affichée.</p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="rounded-lg border border-line p-1.5 text-ink-soft transition hover:bg-paper hover:text-ink disabled:opacity-35"
            onClick={() => allerPage(page - 1)}
            disabled={!url || page <= 1}
            aria-label="Page précédente"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[86px] text-center text-xs font-medium text-ink-soft" aria-live="polite">
            Page {nombrePages ? page : 0} / {nombrePages || '—'}
          </span>
          <button
            type="button"
            className="rounded-lg border border-line p-1.5 text-ink-soft transition hover:bg-paper hover:text-ink disabled:opacity-35"
            onClick={() => allerPage(page + 1)}
            disabled={!url || page >= nombrePages}
            aria-label="Page suivante"
          >
            <ChevronRight size={16} />
          </button>
          <span className="mx-2 h-4 w-px bg-line" aria-hidden="true" />
          <button
            type="button"
            className="rounded-lg border border-line p-1.5 text-ink-soft transition hover:bg-paper hover:text-ink disabled:opacity-35"
            onClick={() => changerZoom(-0.15)}
            disabled={!url || zoom <= 0.7}
            aria-label="Réduire le zoom"
          >
            <Minus size={15} />
          </button>
          <span className="min-w-[42px] text-center text-xs font-medium text-ink-soft">{Math.round(zoom * 100)} %</span>
          <button
            type="button"
            className="rounded-lg border border-line p-1.5 text-ink-soft transition hover:bg-paper hover:text-ink disabled:opacity-35"
            onClick={() => changerZoom(0.15)}
            disabled={!url || zoom >= 1.75}
            aria-label="Agrandir le zoom"
          >
            <Plus size={15} />
          </button>
        </div>
        {onTelecharger ? (
          <Bouton
            variante="secondaire"
            petit
            icone={<Download size={14} />}
            onClick={onTelecharger}
            disabled={!url}
            data-cy="btn-telecharger-apercu"
          >
            Télécharger l’aperçu
          </Bouton>
        ) : null}
      </div>
    </section>
  );
}
