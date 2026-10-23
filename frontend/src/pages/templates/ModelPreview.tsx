import { Check, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { TemplateDto } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { PdfViewer } from "@/components/pdf/PdfViewer";

/** Full-screen preview modal for a template version. */
export function ModelPreview({
  template,
  url,
  onClose,
  onActivate,
  activationInProgress,
}: {
  template: TemplateDto;
  url: string;
  onClose: () => void;
  onActivate: () => void;
  activationInProgress: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-3 backdrop-blur-[3px] sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="animation-fade flex max-h-[94vh] w-full max-w-4xl flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="apercu-template-titre"
        data-cy="apercu-template"
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-accent-strong px-4 py-3 text-white">
          <div className="min-w-0">
            <h2
              id="apercu-template-titre"
              className="truncate text-lg text-white"
            >
              Aperçu — {template.name} · v{template.version}
            </h2>
            <p className="text-[11px] text-white/60">
              Données d’exemple · filigrane « APERÇU » · rien n’est persisté.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!template.active ? (
              <Button
                variant="secondary"
                small
                onClick={onActivate}
                loading={activationInProgress}
                icon={<Check size={14} />}
              >
                Activer ce modèle
              </Button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Fermer l’aperçu"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <PdfViewer
          url={url}
          dataCy="apercu-template-pdf"
          className="min-h-0 flex-1"
        />
      </div>
    </div>,
    document.body,
  );
}
