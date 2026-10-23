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
        "min-w-0",
        c.mobile && c.mobilePanel !== "preview" && "hidden",
        "lg:sticky lg:top-6 lg:self-start",
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
              className="rounded-lg border border-line bg-white px-2 py-1.5 text-[11px] font-medium text-ink-soft"
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
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-1.5 text-[11px] font-medium text-ink-soft">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-[#1d5b49]"
                checked={c.complete}
                onChange={(event) => c.draft.setComplete(event.target.checked)}
                data-cy="toggle-apercu-complet"
              />
              Avec annexes
            </label>
          </>
        }
      />
      <p className="mt-2 px-1 text-[11px] leading-relaxed text-ink-soft">
        L’aperçu est rendu par le backend à partir des mêmes lignes que le total
        affiché. Il porte un filigrane et n’est jamais enregistré.
      </p>
    </div>
  );
}
