import "./ExpensePreviewPane.css";
import { PdfViewer } from "@/components/pdf/PdfViewer";
import { cn } from "@/lib/cn";
import type { ExpenseStatementController } from "./useExpenseStatementPage";

/** Preview pane: backend-rendered PDF with template and annex options. */
export function ExpensePreviewPane({
  controller: c,
}: {
  controller: ExpenseStatementController;
}) {
  return (
    <div
      data-cy="volet-apercu"
      className={cn(
        "expense-preview-pane",
        c.mobile && c.mobilePanel !== "preview" && "hidden",
      )}
    >
      <PdfViewer
        url={c.previewRequest && c.signatureAvailable ? c.preview.url : null}
        loading={c.preview.loading}
        error={
          c.requests.error
            ? "Corrigez les lignes en rouge pour actualiser l’aperçu."
            : c.orderedLines.length === 0
              ? "Ajoutez un frais pour voir l’aperçu de la note."
              : !c.signatureAvailable
                ? "Configurez une signature pour afficher l’aperçu."
                : c.preview.error
        }
        updatedAt={c.preview.updatedAt}
        onDownload={c.preview.download}
        actions={
          <>
            <select
              aria-label="Template de la note de frais"
              className="expense-preview-pane-select"
              value={c.selectedTemplate ?? ""}
              onChange={(event) =>
                c.draft.setTemplate(
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              disabled={c.models.length === 0}
              data-cy="select-template"
            >
              {c.models.length === 0 ? (
                <option value="">Modèle intégré</option>
              ) : null}
              {c.models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} — v{model.version}
                </option>
              ))}
            </select>
            <label className="expense-preview-pane-option">
              <input
                type="checkbox"
                className="expense-preview-pane-checkbox"
                checked={c.complete}
                onChange={(event) => c.draft.setComplete(event.target.checked)}
                data-cy="toggle-apercu-complet"
              />
              Avec annexes
            </label>
          </>
        }
      />
      <p className="expense-preview-pane-note">
        L’aperçu est rendu par le backend à partir des mêmes lignes que le total
        affiché. Il porte un filigrane et n’est jamais enregistré.
      </p>
    </div>
  );
}
