import "./TemplatesCard.css";
import { Download, Info, RotateCcw, ShieldCheck } from "lucide-react";
import { errorMessage } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { ModelPreview } from "./ModelPreview";
import { ReferenceVariables } from "./ReferenceVariables";
import { TemplateActiveModel } from "./TemplateActiveModel";
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
          <LoadingState message="Chargement des modèles…" />
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
                Télécharger le modèle par défaut intégré
              </Button>
              <Button
                variant="secondary"
                small
                icon={<RotateCcw size={14} />}
                onClick={() => c.setResetDialogOpen(true)}
                disabled={Boolean(c.active?.builtIn)}
                title={
                  c.active?.builtIn
                    ? "Le modèle intégré est déjà actif."
                    : undefined
                }
                data-cy="btn-modele-defaut"
              >
                Revenir au modèle par défaut
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
              <p>
                Un seul modèle actif par type. Les documents déjà générés
                conservent la référence de leur version. La suppression est
                logique : aucune version n’est réellement effacée.
              </p>
            </div>
          </>
        )}
      </div>

      <ReferenceVariables type={type} />

      <ConfirmDialog
        open={c.toDelete !== null}
        title="Supprimer cette version ?"
        message={
          c.toDelete
            ? `La version v${c.toDelete.version} de « ${c.toDelete.name} » ne sera plus proposée. Les documents qui l’utilisent restent inchangés.`
            : ""
        }
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={() => {
          if (c.toDelete) {
            c.remove.mutate(c.toDelete);
          }
        }}
        onCancel={() => c.setToDelete(null)}
        dataCy="dialogue-supprimer-template"
      />

      <ConfirmDialog
        open={c.resetDialogOpen}
        title="Revenir au modèle par défaut ?"
        message={
          c.builtInModel
            ? `Le modèle intégré « ${c.builtInModel.name} » (v${c.builtInModel.version}) redeviendra actif. Vos versions importées restent disponibles.`
            : "Le modèle intégré redeviendra actif. Vos versions importées restent disponibles."
        }
        confirmLabel="Restaurer le modèle"
        onConfirm={() => c.resetMutation.mutate()}
        onCancel={() => c.setResetDialogOpen(false)}
        dataCy="dialogue-modele-defaut"
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
    </section>
  );
}
