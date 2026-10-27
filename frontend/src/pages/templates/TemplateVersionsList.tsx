import "./TemplateVersionsList.css";
import { Check, Download, Eye, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
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
      <ul className="template-versions-list">
        {c.versions.map((template) => {
          const isTemplateActive = Boolean(template.active);
          const deletionBlocked = isTemplateActive || Boolean(template.builtIn);
          return (
            <li key={template.id} className="template-versions-list-item">
              <div className="template-versions-list-main">
                <p className="template-versions-list-name-row">
                  <span className="template-versions-list-name">
                    {template.name}
                  </span>
                  <span
                    className={cn(
                      "badge",
                      isTemplateActive ? "badge-accent" : "badge-neutral",
                    )}
                  >
                    v{template.version}
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
                  {template.format ?? "HTML"} ·{" "}
                  {formatDateTime(template.createdAt)}
                </p>
              </div>
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
