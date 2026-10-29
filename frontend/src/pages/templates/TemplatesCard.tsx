import "./TemplatesCard.css";
import { Download, Info, RotateCcw, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { ModelPreview } from "./ModelPreview";
import { ReferenceVariables } from "./ReferenceVariables";
import { TemplateActiveModel } from "./TemplateActiveModel";
import { TemplateCompare } from "./TemplateCompare";
import { TemplateImportForm } from "./TemplateImportForm";
import { TemplateVersionsList } from "./TemplateVersionsList";
import type { ConfigurationType } from "./templateTypes";
import { useTemplatesCard } from "./useTemplatesCard";

/** One template-type card: active model, versions and import form. */
export function TemplatesCard({
  configuration,
  embedded = false,
}: {
  configuration: ConfigurationType;
  embedded?: boolean;
}) {
  const { t } = useTranslation();
  const c = useTemplatesCard(configuration);
  const { title, description, icon: IconComponent, type } = configuration;
  const preview = c.preview;

  return (
    <section className={embedded ? "templates-card" : "card templates-card"}>
      <div className="card-header">
        <div className="templates-card-heading">
          <span className="templates-card-icon">
            <IconComponent size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 className="templates-card-title">{title}</h2>
            <p className="templates-card-description">{description}</p>
          </div>
        </div>
        <span className="badge badge-neutral">
          <ShieldCheck size={12} aria-hidden="true" />
          HTML + CSS
        </span>
      </div>

      <div className="card-body templates-card-body">
        {c.templates.isError ? (
          <ErrorState
            message={errorMessage(c.templates.error)}
            onRetry={() => void c.templates.refetch()}
          />
        ) : c.templates.isPending ? (
          <LoadingState message={t("templates.card.loading")} />
        ) : (
          <>
            <TemplateActiveModel c={c} />

            <div className="templates-card-actions">
              <Button
                variant="secondary"
                small
                icon={<Download size={14} />}
                loading={c.downloadDefault.isPending}
                onClick={() => c.downloadDefault.mutate()}
              >
                {t("templates.card.downloadDefault")}
              </Button>
              <Button
                variant="secondary"
                small
                icon={<RotateCcw size={14} />}
                onClick={() => c.setResetDialogOpen(true)}
                disabled={Boolean(c.active?.builtIn)}
                title={
                  c.active?.builtIn
                    ? t("templates.card.resetDefaultBlocked")
                    : undefined
                }
                data-cy="btn-default-template"
              >
                {t("templates.card.resetDefault")}
              </Button>
            </div>

            <TemplateVersionsList c={c} />
            <TemplateImportForm c={c} />

            <div className="templates-card-note">
              <Info
                size={15}
                className="templates-card-note-icon"
                aria-hidden="true"
              />
              <p>{t("templates.card.note")}</p>
            </div>
          </>
        )}
      </div>

      <ReferenceVariables type={type} />

      <ConfirmDialog
        open={c.toDelete !== null}
        title={t("templates.card.deleteDialog.title")}
        message={
          c.toDelete
            ? t("templates.card.deleteDialog.message", {
                version: c.toDelete.version,
                name: c.toDelete.name,
              })
            : ""
        }
        confirmLabel={t("templates.actions.delete")}
        variant="danger"
        onConfirm={() => {
          if (c.toDelete) {
            c.remove.mutate(c.toDelete);
          }
        }}
        onCancel={() => c.setToDelete(null)}
        dataCy="dialog-delete-template"
      />

      <ConfirmDialog
        open={c.resetDialogOpen}
        title={t("templates.card.resetDialog.title")}
        message={
          c.builtInModel
            ? t("templates.card.resetDialog.message", {
                name: c.builtInModel.name,
                version: c.builtInModel.version,
              })
            : t("templates.card.resetDialog.messageFallback")
        }
        confirmLabel={t("templates.card.resetDialog.confirm")}
        onConfirm={() => c.resetMutation.mutate()}
        onCancel={() => c.setResetDialogOpen(false)}
        dataCy="dialog-default-template"
      />

      {preview ? (
        <ModelPreview
          template={preview.template}
          url={preview.url}
          onClose={() => c.setPreview(null)}
          onActivate={() => c.activate.mutate(preview.template)}
          activationInProgress={c.activate.isPending}
        />
      ) : null}

      {c.compare || c.compareInProgress ? (
        <TemplateCompare
          compare={c.compare}
          loading={c.compareInProgress}
          onClose={c.closeCompare}
        />
      ) : null}
    </section>
  );
}
