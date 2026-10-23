import { Check, Download, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { TemplatesCardController } from "./useTemplatesCard";

/** Version history with preview, download, activation and logical deletion. */
export function TemplateVersionsList({ c }: { c: TemplatesCardController }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-ink">Versions</h3>
        <span className="text-xs text-ink-soft">
          {c.versions.length} version{c.versions.length > 1 ? "s" : ""}
        </span>
      </div>
      <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
        {c.versions.map((template) => {
          const isTemplateActive = Boolean(template.active);
          const deletionBlocked = isTemplateActive || Boolean(template.builtIn);
          return (
            <li
              key={template.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-ink">
                  <span className="truncate">{template.name}</span>
                  <span
                    className={cn(
                      "badge",
                      isTemplateActive ? "badge-accent" : "badge-neutral",
                    )}
                  >
                    v{template.version}
                  </span>
                  {template.builtIn ? (
                    <span className="badge badge-neutral">intégré</span>
                  ) : null}
                  {isTemplateActive ? (
                    <span className="text-[10px] font-bold uppercase text-accent">
                      active
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-soft">
                  {template.format ?? "HTML"} ·{" "}
                  {formatDateTime(template.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  variant="ghost"
                  small
                  icon={<Eye size={13} />}
                  loading={c.previewInProgress === template.id}
                  onClick={() => void c.openPreview(template)}
                >
                  Aperçu
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
                  Télécharger
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
                    Activer
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
                        ? "Le modèle intégré ne peut pas être supprimé."
                        : "Le modèle actif ne peut pas être supprimé."
                      : undefined
                  }
                  onClick={() => c.setToDelete(template)}
                >
                  Supprimer
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      {c.previousVersions.length === 0 ? (
        <p className="mt-2 text-xs text-ink-soft">
          Aucune version précédente archivée.
        </p>
      ) : null}
    </div>
  );
}
