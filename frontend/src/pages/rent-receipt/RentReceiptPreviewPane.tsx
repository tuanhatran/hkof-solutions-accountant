import "./RentReceiptPreviewPane.css";
import { PdfViewer } from "@/components/pdf/PdfViewer";
import { cn } from "@/lib/cn";
import type { RentReceiptController } from "./useRentReceiptPage";

/** Preview pane with the template selector. */
export function RentReceiptPreviewPane({ c }: { c: RentReceiptController }) {
  return (
    <div
      data-cy="volet-apercu"
      className={cn(
        "rent-receipt-preview-pane",
        c.mobile && c.mobilePanel !== "apercu" && "hidden",
      )}
    >
      <PdfViewer
        url={c.preview.url}
        loading={c.preview.loading}
        error={
          !c.validation.success
            ? "Complétez les champs de la quittance pour actualiser l’aperçu."
            : !c.selectedLease
              ? "Sélectionnez un bailleur et un locataire liés par un bail actif."
              : !c.signatureAvailable
                ? "Configurez une signature pour afficher l’aperçu."
                : c.preview.error
        }
        updatedAt={c.preview.updatedAt}
        onDownload={c.preview.download}
        actions={
          <select
            aria-label="Template de la quittance"
            className="rent-receipt-preview-pane-select"
            value={c.selectedModel ?? ""}
            onChange={(event) =>
              c.draft.setTemplate(
                event.target.value ? Number(event.target.value) : null,
              )
            }
            disabled={c.models.length === 0}
            data-cy="select-template-apercu"
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
        }
      />
      <p className="rent-receipt-preview-pane-note">
        L’aperçu est rendu par le backend à partir du template actif. Il porte
        un filigrane et n’est jamais enregistré.
      </p>
    </div>
  );
}
