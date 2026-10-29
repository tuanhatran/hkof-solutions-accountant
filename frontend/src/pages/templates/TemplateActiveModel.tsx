import "./TemplateActiveModel.css";
import { Download, Eye, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";
import type { TemplatesCardController } from "./useTemplatesCard";

/** Active model summary with preview/download/restore actions. */
export function TemplateActiveModel({ c }: { c: TemplatesCardController }) {
  const { t } = useTranslation();
  const active = c.active;
  return (
    <div className="template-active-model">
      <div className="template-active-model-header">
        <div className="template-active-model-main">
          <p className="template-active-model-eyebrow">
            {t("templates.active.eyebrow")}
          </p>
          {active ? (
            <>
              <p className="template-active-model-name-row">
                {active.name}
                <span className="badge badge-accent">v{active.version}</span>
                {active.builtIn ? (
                  <span className="badge badge-neutral">
                    {t("templates.badges.builtIn")}
                  </span>
                ) : null}
              </p>
              <p className="template-active-model-meta">
                {active.format ?? "HTML"} ·{" "}
                {t("templates.active.importedOn", {
                  date: formatDateTime(active.createdAt),
                })}
              </p>
            </>
          ) : (
            <p className="template-active-model-empty">
              {t("templates.active.empty")}
            </p>
          )}
        </div>
        {active ? (
          <div className="template-active-model-actions">
            <Button
              variant="secondary"
              small
              icon={<Eye size={14} />}
              loading={c.previewInProgress === active.id}
              onClick={() => void c.openPreview(active)}
              data-cy="btn-active-template-preview"
            >
              {t("templates.actions.preview")}
            </Button>
            <Button
              variant="secondary"
              small
              icon={<Download size={14} />}
              loading={
                c.download.isPending && c.download.variables?.id === active.id
              }
              onClick={() => c.download.mutate(active)}
            >
              {t("templates.actions.download")}
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            small
            icon={<RotateCcw size={14} />}
            onClick={() => c.setResetDialogOpen(true)}
          >
            {t("templates.actions.restoreBuiltIn")}
          </Button>
        )}
      </div>
    </div>
  );
}
