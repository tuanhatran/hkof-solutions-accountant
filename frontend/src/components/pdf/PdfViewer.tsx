import "./PdfViewer.css";
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
    <section className={cn("card pdf-viewer", className)} data-cy={dataCy}>
      <div className="pdf-viewer-header">
        <div className="pdf-viewer-title-group">
          <span className="pdf-viewer-icon">
            <FileText size={16} aria-hidden="true" />
          </span>
          <div>
            <h2 className="pdf-viewer-title">Aperçu du document</h2>
            <p className="pdf-viewer-subtitle">
              Filigrane « APERÇU » — rien n’est enregistré.
            </p>
          </div>
        </div>
        <div className="pdf-viewer-actions">
          {actions}
          {url ? (
            <span
              className="pdf-viewer-updated"
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
        <div className="pdf-viewer-error" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <div ref={containerRef} className="pdf-viewer-body">
        <div ref={pdfZoneRef} className="pdf-viewer-zone">
          {url ? (
            <div className="pdf-viewer-center">
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
                  <div className="pdf-viewer-document-loading">
                    <Spinner /> Chargement du PDF…
                  </div>
                }
              >
                <Page
                  pageNumber={page}
                  width={Math.round(width * zoom)}
                  className="pdf-viewer-page"
                  loading={
                    <div
                      className="pdf-viewer-page-loading"
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
            <div className="pdf-viewer-placeholder">
              {loading ? (
                <>
                  <Spinner size={26} />
                  <p className="pdf-viewer-loading-text">
                    Préparation de l’aperçu…
                  </p>
                </>
              ) : (
                <>
                  <span className="pdf-viewer-placeholder-icon">
                    <FileText size={22} aria-hidden="true" />
                  </span>
                  <p className="pdf-viewer-placeholder-text">
                    L’aperçu apparaîtra ici dès que les informations seront
                    complètes.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {loading && url ? (
          <div className="glass-surface pdf-viewer-overlay">
            <Spinner size={26} />
            <p className="pdf-viewer-overlay-title">Mise à jour de l’aperçu…</p>
            <p className="pdf-viewer-overlay-hint">
              L’ancienne version reste affichée.
            </p>
          </div>
        ) : null}
      </div>

      <div className="pdf-viewer-footer">
        <div className="pdf-viewer-toolbar">
          <button
            type="button"
            className="pdf-viewer-tool"
            onClick={() => goToPage(page - 1)}
            disabled={!url || page <= 1}
            aria-label="Page précédente"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="pdf-viewer-page-label" aria-live="polite">
            Page {pageCount ? page : 0} / {pageCount || "—"}
          </span>
          <button
            type="button"
            className="pdf-viewer-tool"
            onClick={() => goToPage(page + 1)}
            disabled={!url || page >= pageCount}
            aria-label="Page suivante"
          >
            <ChevronRight size={16} />
          </button>
          <span className="pdf-viewer-separator" aria-hidden="true" />
          <button
            type="button"
            className="pdf-viewer-tool"
            onClick={() => changeZoom(-0.15)}
            disabled={!url || zoom <= 0.7}
            aria-label="Réduire le zoom"
          >
            <Minus size={15} />
          </button>
          <span className="pdf-viewer-zoom-label">
            {Math.round(zoom * 100)} %
          </span>
          <button
            type="button"
            className="pdf-viewer-tool"
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
