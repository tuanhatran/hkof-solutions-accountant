import "./ModelPreview.css";
import { Check, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
        aria-labelledby="template-preview-title"
        data-cy="template-preview"
      >
        <div className="model-preview-bar">
          <div className="model-preview-heading">
            <h2 id="template-preview-title" className="model-preview-title">
              {t("templates.preview.title", {
                name: template.name,
                version: template.version,
              })}
            </h2>
            <p className="model-preview-subtitle">
              {t("templates.preview.subtitle")}
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
                {t("templates.preview.activate")}
              </Button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="model-preview-close"
              aria-label={t("templates.preview.closeAria")}
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <PdfViewer
          url={url}
          dataCy="template-pdf-preview"
          className="min-h-0 flex-1"
        />
      </div>
    </div>,
    document.body,
  );
}
