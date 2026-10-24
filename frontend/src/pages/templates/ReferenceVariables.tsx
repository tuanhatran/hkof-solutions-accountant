import "./ReferenceVariables.css";
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
    <details className="group reference-variables">
      <summary className="reference-variables-summary">
        <span className="reference-variables-heading">
          <FileCode2
            size={16}
            className="reference-variables-icon"
            aria-hidden="true"
          />
          Référence des variables
          <span className="badge badge-neutral">
            {variables.data?.length ?? "—"}
          </span>
        </span>
        <span className="reference-variables-more">Afficher</span>
        <span className="reference-variables-less">Masquer</span>
      </summary>

      {variables.isPending ? (
        <p className="reference-variables-message">Chargement des variables…</p>
      ) : variables.isError ? (
        <p className="reference-variables-error">
          {errorMessage(variables.error)}
        </p>
      ) : (
        <div className="reference-variables-body">
          <p className="reference-variables-intro">
            Les montants sont déjà formatés en français par le backend : le
            template ne calcule rien. Les expressions non échappées, scripts,
            iframes, ressources distantes et expressions Thymeleaf/JSP sont
            refusés.
          </p>
          {type === "EXPENSE_STATEMENT" ? (
            <div className="reference-variables-loop">
              <p className="reference-variables-loop-title">Boucle des frais</p>
              <pre className="reference-variables-loop-code">
                {`{{#lignes}}
  {{poste}} — {{fournisseur}} — {{montant_retenu}}
{{/lignes}}`}
              </pre>
              <p className="reference-variables-loop-note">
                Dans la boucle{" "}
                <code className="reference-variables-code">
                  {"{{#lignes}}"}
                </code>
                , les variables internes s’écrivent{" "}
                <code className="reference-variables-code">{"{{poste}}"}</code>,{" "}
                <code className="reference-variables-code">
                  {"{{fournisseur}}"}
                </code>
                ,{" "}
                <code className="reference-variables-code">
                  {"{{periode}}"}
                </code>
                ,{" "}
                <code className="reference-variables-code">
                  {"{{montant_ttc}}"}
                </code>
                ,{" "}
                <code className="reference-variables-code">
                  {"{{prorata}}"}
                </code>{" "}
                et{" "}
                <code className="reference-variables-code">
                  {"{{montant_retenu}}"}
                </code>
                .
              </p>
            </div>
          ) : null}
          <div className="reference-variables-table-wrapper">
            <table className="expense-table">
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>Description</th>
                  <th>Exemple</th>
                  <th className="reference-variables-copy-column">Copier</th>
                </tr>
              </thead>
              <tbody>
                {(variables.data ?? []).map((variable) => {
                  const name = variable.name ?? "";
                  return (
                    <tr key={name}>
                      <td>
                        <code className="reference-variables-name">
                          {`{{${name}}}`}
                        </code>
                        {variable.required ? (
                          <span className="reference-variables-required">
                            requis
                          </span>
                        ) : null}
                      </td>
                      <td className="reference-variables-description">
                        {variable.description}
                      </td>
                      <td className="reference-variables-example">
                        {variable.example || "—"}
                      </td>
                      <td className="reference-variables-copy-cell">
                        <button
                          type="button"
                          onClick={() => void copyTemplate(name)}
                          className="reference-variables-copy"
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
