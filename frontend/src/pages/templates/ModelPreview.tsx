import "./ModelPreview.css";
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
      className="model-preview-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="animation-fade model-preview"
        role="dialog"
        aria-modal="true"
        aria-labelledby="apercu-template-titre"
        data-cy="apercu-template"
      >
        <div className="model-preview-bar">
          <div className="model-preview-heading">
            <h2 id="apercu-template-titre" className="model-preview-title">
              Aperçu — {template.name} · v{template.version}
            </h2>
            <p className="model-preview-subtitle">
              Données d’exemple · filigrane « APERÇU » · rien n’est persisté.
            </p>
          </div>
          <div className="model-preview-actions">
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
              className="model-preview-close"
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
