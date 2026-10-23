import { Download, Eye, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";
import type { TemplatesCardController } from "./useTemplatesCard";

/** Active model summary with preview/download/restore actions. */
export function TemplateActiveModel({ c }: { c: TemplatesCardController }) {
  const active = c.active;
  return (
    <div className="rounded-xl border border-accent/15 bg-accent-soft/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-accent">
            Modèle actif
          </p>
          {active ? (
            <>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-base font-semibold text-ink">
                {active.name}
                <span className="badge badge-accent">v{active.version}</span>
                {active.builtIn ? (
                  <span className="badge badge-neutral">intégré</span>
                ) : null}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                {active.format ?? "HTML"} · importé le{" "}
                {formatDateTime(active.createdAt)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm font-semibold text-warning">
              Aucun modèle actif.
            </p>
          )}
        </div>
        {active ? (
          <div className="flex flex-wrap gap-2">
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
