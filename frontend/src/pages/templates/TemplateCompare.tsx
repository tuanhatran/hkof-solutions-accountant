import "./TemplateCompare.css";
import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { TemplateDto } from "@/api/types";
import { PdfViewer } from "@/components/pdf/PdfViewer";
import { Spinner } from "@/components/ui/States";
import { formatDate } from "@/lib/format";
import type { TemplateComparison } from "./useTemplatesCard";

function ComparisonPanel({
  template,
  url,
  dataCy,
}: {
  template: TemplateDto;
  url: string;
  dataCy: string;
}) {
  const { t } = useTranslation();
  return (
    <section className="template-compare-panel">
      <header className="template-compare-panel-head">
        <h3 className="template-compare-panel-name">{template.name}</h3>
        <span className="badge badge-neutral">v{template.version}</span>
        {template.active ? (
          <span className="badge badge-accent">
            {t("templates.badges.active")}
          </span>
        ) : null}
        {template.builtIn ? (
          <span className="badge badge-neutral">
            {t("templates.badges.builtIn")}
          </span>
        ) : null}
        <span className="template-compare-panel-date">
          {formatDate(template.createdAt)}
        </span>
      </header>
      <PdfViewer url={url} dataCy={dataCy} className="min-h-0" />
    </section>
  );
}

/** Read-only side-by-side comparison of two template versions. */
export function TemplateCompare({
  compare,
  loading,
  onClose,
}: {
  compare: TemplateComparison | null;
  loading: boolean;
  onClose: () => void;
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
      className="template-compare-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="animation-fade template-compare"
        role="dialog"
        aria-modal="true"
        aria-labelledby="comparaison-modeles-titre"
        data-cy="comparaison-modeles"
      >
        <div className="template-compare-bar">
          <div className="template-compare-heading">
            <h2
              id="comparaison-modeles-titre"
              className="template-compare-title"
            >
              {t("templates.compare.title")}
            </h2>
            <p className="template-compare-subtitle">
              {t("templates.compare.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="template-compare-close"
            aria-label={t("templates.compare.closeAria")}
          >
            <X size={18} />
          </button>
        </div>
        {loading || !compare ? (
          <p className="template-compare-loading" role="status">
            <Spinner />
            {t("templates.compare.loading")}
          </p>
        ) : (
          <div className="template-compare-panels">
            <ComparisonPanel
              template={compare.left.template}
              url={compare.left.url}
              dataCy="comparaison-modele-gauche"
            />
            <ComparisonPanel
              template={compare.right.template}
              url={compare.right.url}
              dataCy="comparaison-modele-droite"
            />
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
