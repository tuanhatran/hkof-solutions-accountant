import { Check, Clipboard, FileCode2 } from "lucide-react";
import { useEffect, useState } from "react";
import { errorMessage } from "@/api/client";
import { useTemplateVariables } from "@/api/queries";
import type { TemplateType } from "@/api/types";
import { toast } from "@/state/toasts";

/** Collapsible list of Mustache variables available for a template type. */
export function ReferenceVariables({ type }: { type: TemplateType }) {
  const variables = useTemplateVariables(type);
  const [copy, setCopy] = useState<string | null>(null);

  useEffect(() => {
    if (!copy) {
      return;
    }
    const timer = window.setTimeout(() => setCopy(null), 1_800);
    return () => window.clearTimeout(timer);
  }, [copy]);

  async function copyTemplate(name: string) {
    try {
      await navigator.clipboard.writeText(`{{${name}}}`);
      setCopy(name);
      toast.success(`{{${name}}} copié dans le presse-papiers.`);
    } catch {
      toast.error(
        "Impossible de copier dans le presse-papiers. Sélectionnez la variable manuellement.",
      );
    }
  }

  return (
    <details className="group border-t border-line px-5 py-4 sm:px-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-ink">
        <span className="flex items-center gap-2">
          <FileCode2 size={16} className="text-accent" aria-hidden="true" />
          Référence des variables
          <span className="badge badge-neutral">
            {variables.data?.length ?? "—"}
          </span>
        </span>
        <span className="text-xs font-medium text-ink-soft group-open:hidden">
          Afficher
        </span>
        <span className="hidden text-xs font-medium text-ink-soft group-open:inline">
          Masquer
        </span>
      </summary>

      {variables.isPending ? (
        <p className="mt-3 text-xs text-ink-soft">Chargement des variables…</p>
      ) : variables.isError ? (
        <p className="mt-3 text-xs text-danger">
          {errorMessage(variables.error)}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-xs leading-relaxed text-ink-soft">
            Les montants sont déjà formatés en français par le backend : le
            template ne calcule rien. Les expressions non échappées, scripts,
            iframes, ressources distantes et expressions Thymeleaf/JSP sont
            refusés.
          </p>
          {type === "EXPENSE_STATEMENT" ? (
            <div className="rounded-xl border border-line bg-paper/50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft">
                Boucle des frais
              </p>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-accent-strong p-3 font-mono text-[11.5px] leading-relaxed text-white/90">
                {`{{#lignes}}
  {{poste}} — {{fournisseur}} — {{montant_retenu}}
{{/lignes}}`}
              </pre>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                Dans la boucle{" "}
                <code className="font-mono">{"{{#lignes}}"}</code>, les
                variables internes s’écrivent{" "}
                <code className="font-mono">{"{{poste}}"}</code>,{" "}
                <code className="font-mono">{"{{fournisseur}}"}</code>,{" "}
                <code className="font-mono">{"{{periode}}"}</code>,{" "}
                <code className="font-mono">{"{{montant_ttc}}"}</code>,{" "}
                <code className="font-mono">{"{{prorata}}"}</code> et{" "}
                <code className="font-mono">{"{{montant_retenu}}"}</code>.
              </p>
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="expense-table">
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>Description</th>
                  <th>Exemple</th>
                  <th className="w-16 text-right">Copier</th>
                </tr>
              </thead>
              <tbody>
                {(variables.data ?? []).map((variable) => {
                  const name = variable.name ?? "";
                  return (
                    <tr key={name}>
                      <td>
                        <code className="rounded bg-paper-deep/60 px-1.5 py-0.5 font-mono text-[11.5px] text-ink">
                          {`{{${name}}}`}
                        </code>
                        {variable.required ? (
                          <span className="ml-1.5 text-[10px] font-bold uppercase text-copper">
                            requis
                          </span>
                        ) : null}
                      </td>
                      <td className="text-xs text-ink-soft">
                        {variable.description}
                      </td>
                      <td className="text-xs text-ink-soft/80">
                        {variable.example || "—"}
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => void copyTemplate(name)}
                          className="rounded-lg p-1.5 text-ink-soft transition hover:bg-accent-soft hover:text-accent"
                          aria-label={`Copier la variable ${name}`}
                          title="Copier"
                        >
                          {copy === name ? (
                            <Check size={15} />
                          ) : (
                            <Clipboard size={15} />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </details>
  );
}
