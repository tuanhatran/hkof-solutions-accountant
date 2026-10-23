import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Minus,
  Plus,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/States";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

interface PdfViewerProps {
  url: string | null;
  loading?: boolean;
  error?: string | null;
  updatedAt?: Date | null;
  onDownload?: () => void;
  actions?: ReactNode;
  dataCy?: string;
  className?: string;
}

export function PdfViewer({
  url,
  loading = false,
  error: errorText = null,
  updatedAt = null,
  onDownload,
  actions,
  dataCy = "apercu-pdf",
  className,
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfZoneRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
    setPageCount(0);
    setPdfError(null);
  }, [url]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const availableWidth = entries[0]?.contentRect.width;
      if (availableWidth) {
        setWidth(Math.max(260, Math.floor(availableWidth - 40)));
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const changeZoom = (delta: number) => {
    setZoom((value) =>
      Math.min(1.75, Math.max(0.7, Number((value + delta).toFixed(2)))),
    );
  };

  const goToPage = (pageNumber: number) => {
    setPage(Math.min(pageCount, Math.max(1, pageNumber)));
    pdfZoneRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const errorMessage = errorText ?? pdfError;

  return (
    <section
      className={cn(
        "card flex min-h-[420px] flex-col overflow-hidden",
        className,
      )}
      data-cy={dataCy}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-accent">
            <FileText size={16} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold leading-tight text-ink">
              Aperçu du document
            </h2>
            <p className="text-[11px] text-ink-soft">
              Filigrane « APERÇU » — rien n’est enregistré.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {url ? (
            <span
              className="text-[11px] text-ink-soft"
              data-cy="apercu-maj"
              aria-live="polite"
            >
              {updatedAt
                ? `Mis à jour à ${formatDateTime(updatedAt.toISOString())}`
                : "—"}
            </span>
          ) : null}
        </div>
      </div>

      {errorMessage ? (
        <div
          className="border-b border-warning/20 bg-warning-soft px-4 py-2 text-xs font-medium text-warning"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}

      <div ref={containerRef} className="relative flex-1">
        <div
          ref={pdfZoneRef}
          className="max-h-[68vh] min-h-[360px] overflow-auto bg-paper-deep/45 p-5"
        >
          {url ? (
            <div className="flex justify-center">
              <Document
                file={url}
                onLoadSuccess={({ numPages }: { numPages: number }) => {
                  setPageCount(numPages);
                  setPdfError(null);
                }}
                onLoadError={() =>
                  setPdfError("Impossible d'afficher l'aperçu PDF.")
                }
                loading={
                  <div className="flex items-center gap-2 px-8 py-16 text-sm text-ink-soft">
                    <Spinner /> Chargement du PDF…
                  </div>
                }
              >
                <Page
                  pageNumber={page}
                  width={Math.round(width * zoom)}
                  className="overflow-hidden rounded-sm shadow-[0_18px_50px_-20px_rgba(33,48,43,0.55)]"
                  loading={
                    <div
                      className="flex items-center justify-center bg-white"
                      style={{
                        width: Math.round(width * zoom),
                        height: Math.round(1.414 * width * zoom),
                      }}
                    >
                      <Spinner size={24} />
                    </div>
                  }
                />
              </Document>
            </div>
          ) : (
            <div className="flex min-h-[340px] flex-col items-center justify-center gap-3 text-center">
              {loading ? (
                <>
                  <Spinner size={26} />
                  <p className="text-sm text-ink-soft">
                    Préparation de l’aperçu…
                  </p>
                </>
              ) : (
                <>
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-surface text-ink-soft/70">
                    <FileText size={22} aria-hidden="true" />
                  </span>
                  <p className="max-w-xs text-sm text-ink-soft">
                    L’aperçu apparaîtra ici dès que les informations seront
                    complètes.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {loading && url ? (
          <div className="glass-surface absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Spinner size={26} />
            <p className="text-sm font-medium text-ink">
              Mise à jour de l’aperçu…
            </p>
            <p className="text-xs text-ink-soft">
              L’ancienne version reste affichée.
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="rounded-lg border border-line p-1.5 text-ink-soft transition hover:bg-paper hover:text-ink disabled:opacity-35"
            onClick={() => goToPage(page - 1)}
            disabled={!url || page <= 1}
            aria-label="Page précédente"
          >
            <ChevronLeft size={16} />
          </button>
          <span
            className="min-w-[86px] text-center text-xs font-medium text-ink-soft"
            aria-live="polite"
          >
            Page {pageCount ? page : 0} / {pageCount || "—"}
          </span>
          <button
            type="button"
            className="rounded-lg border border-line p-1.5 text-ink-soft transition hover:bg-paper hover:text-ink disabled:opacity-35"
            onClick={() => goToPage(page + 1)}
            disabled={!url || page >= pageCount}
            aria-label="Page suivante"
          >
            <ChevronRight size={16} />
          </button>
          <span className="mx-2 h-4 w-px bg-line" aria-hidden="true" />
          <button
            type="button"
            className="rounded-lg border border-line p-1.5 text-ink-soft transition hover:bg-paper hover:text-ink disabled:opacity-35"
            onClick={() => changeZoom(-0.15)}
            disabled={!url || zoom <= 0.7}
            aria-label="Réduire le zoom"
          >
            <Minus size={15} />
          </button>
          <span className="min-w-[42px] text-center text-xs font-medium text-ink-soft">
            {Math.round(zoom * 100)} %
          </span>
          <button
            type="button"
            className="rounded-lg border border-line p-1.5 text-ink-soft transition hover:bg-paper hover:text-ink disabled:opacity-35"
            onClick={() => changeZoom(0.15)}
            disabled={!url || zoom >= 1.75}
            aria-label="Agrandir le zoom"
          >
            <Plus size={15} />
          </button>
        </div>
        {onDownload ? (
          <Button
            variant="secondary"
            small
            icon={<Download size={14} />}
            onClick={onDownload}
            disabled={!url}
            data-cy="btn-telecharger-apercu"
          >
            Télécharger l’aperçu
          </Button>
        ) : null}
      </div>
    </section>
  );
}
