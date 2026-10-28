import "./TemplateVersionsList.css";
import { Check, Download, Eye, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { TemplatesCardController } from "./useTemplatesCard";

/** Version history with preview, download, activation and logical deletion. */
export function TemplateVersionsList({ c }: { c: TemplatesCardController }) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="template-versions-list-header">
        <h3 className="template-versions-list-title">
          {t("templates.versions.title")}
        </h3>
        <span className="template-versions-list-count">
          {t("templates.versions.count", { count: c.versions.length })}
        </span>
      </div>
      <div
        className="template-versions-grid template-versions-header hidden xl:grid"
        data-cy="entetes-versions-modele"
      >
        <span className="template-versions-check" aria-hidden="true" />
        <span>{t("templates.versions.name")}</span>
        <span>{t("templates.versions.versionColumn")}</span>
        <span className="template-versions-number">
          {t("templates.versions.importedAt")}
        </span>
        <span>{t("templates.versions.actions")}</span>
      </div>
      {c.compareSelection.length > 0 ? (
        <div
          className="template-versions-selection"
          data-cy="barre-comparaison"
        >
          <span className="template-versions-selection-count">
            {t("templates.compare.selection", {
              count: c.compareSelection.length,
            })}
          </span>
          <div className="template-versions-selection-actions">
            <Button
              variant="primary"
              small
              loading={c.compareInProgress}
              disabled={c.compareSelection.length < 2 || c.compareInProgress}
              onClick={() => void c.openCompare()}
              data-cy="btn-comparer-versions"
            >
              {t("templates.compare.action")}
            </Button>
            <Button
              variant="ghost"
              small
              onClick={c.clearCompareSelection}
              data-cy="btn-annuler-comparaison"
            >
              {t("templates.compare.clear")}
            </Button>
          </div>
        </div>
      ) : null}
      <ul className="template-versions-list">
        {c.versions.map((template) => {
          const isTemplateActive = Boolean(template.active);
          const deletionBlocked = isTemplateActive || Boolean(template.builtIn);
          const isSelected =
            template.id !== undefined &&
            c.compareSelection.includes(template.id);
          return (
            <li
              key={template.id}
              className="template-versions-grid template-versions-row template-versions-list-item"
            >
              <span className="template-versions-check">
                <input
                  type="checkbox"
                  className="template-versions-checkbox"
                  aria-label={t("templates.compare.select", {
                    name: template.name,
                    version: template.version,
                  })}
                  data-cy={`comparer-modele-${template.id}`}
                  checked={isSelected}
                  disabled={!isSelected && c.compareSelection.length >= 2}
                  onChange={() => c.toggleCompareSelection(template)}
                />
              </span>
              <div className="template-versions-list-main">
                <p className="template-versions-list-name-row">
                  <span className="template-versions-list-name">
                    {template.name}
                  </span>
                  {template.builtIn ? (
                    <span className="badge badge-neutral">
                      {t("templates.badges.builtIn")}
                    </span>
                  ) : null}
                  {isTemplateActive ? (
                    <span className="template-versions-list-active">
                      {t("templates.badges.active")}
                    </span>
                  ) : null}
                </p>
                <p className="template-versions-list-meta">
                  {template.format ?? "HTML"}
                </p>
              </div>
              <span className="template-versions-list-version">
                <span
                  className={cn(
                    "badge",
                    isTemplateActive ? "badge-accent" : "badge-neutral",
                  )}
                >
                  v{template.version}
                </span>
              </span>
              <span className="number template-versions-number template-versions-list-date">
                {formatDate(template.createdAt)}
              </span>
              <div className="template-versions-list-actions">
                <Button
                  variant="ghost"
                  small
                  icon={<Eye size={13} />}
                  loading={c.previewInProgress === template.id}
                  onClick={() => void c.openPreview(template)}
                >
                  {t("templates.actions.preview")}
                </Button>
                <Button
                  variant="ghost"
                  small
                  icon={<Download size={13} />}
                  loading={
                    c.download.isPending &&
                    c.download.variables?.id === template.id
                  }
                  onClick={() => c.download.mutate(template)}
                >
                  {t("templates.actions.download")}
                </Button>
                {!isTemplateActive ? (
                  <Button
                    variant="ghost"
                    small
                    icon={<Check size={13} />}
                    loading={
                      c.activate.isPending &&
                      c.activate.variables?.id === template.id
                    }
                    onClick={() => c.activate.mutate(template)}
                    data-cy="btn-activer-template"
                  >
                    {t("templates.actions.activate")}
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  small
                  className={cn(
                    !deletionBlocked && "text-danger hover:bg-danger-soft",
                  )}
                  icon={<Trash2 size={13} />}
                  disabled={deletionBlocked}
                  title={
                    deletionBlocked
                      ? template.builtIn
                        ? t("templates.versions.deleteBuiltInTitle")
                        : t("templates.versions.deleteActiveTitle")
                      : undefined
                  }
                  onClick={() => c.setToDelete(template)}
                >
                  {t("templates.actions.delete")}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      {c.previousVersions.length === 0 ? (
        <p className="template-versions-list-empty">
          {t("templates.versions.empty")}
        </p>
      ) : null}
    </div>
  );
}
