import "./TemplateActiveModel.css";
import { Download, Eye, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";
import type { TemplatesCardController } from "./useTemplatesCard";

/** Active model summary with preview/download/restore actions. */
export function TemplateActiveModel({ c }: { c: TemplatesCardController }) {
  const active = c.active;
  return (
    <div className="template-active-model">
      <div className="template-active-model-header">
        <div className="template-active-model-main">
          <p className="template-active-model-eyebrow">Modèle actif</p>
          {active ? (
            <>
              <p className="template-active-model-name-row">
                {active.name}
                <span className="badge badge-accent">v{active.version}</span>
                {active.builtIn ? (
                  <span className="badge badge-neutral">intégré</span>
                ) : null}
              </p>
              <p className="template-active-model-meta">
                {active.format ?? "HTML"} · importé le{" "}
                {formatDateTime(active.createdAt)}
              </p>
            </>
          ) : (
            <p className="template-active-model-empty">Aucun modèle actif.</p>
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
              data-cy="btn-apercu-template-actif"
            >
              Aperçu
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
              Télécharger
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            small
            icon={<RotateCcw size={14} />}
            onClick={() => c.setResetDialogOpen(true)}
          >
            Restaurer le modèle intégré
          </Button>
        )}
      </div>
    </div>
  );
}
