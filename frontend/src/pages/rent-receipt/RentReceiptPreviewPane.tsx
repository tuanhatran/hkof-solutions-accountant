import "./RentReceiptPreviewPane.css";
import { useTranslation } from "react-i18next";
import { PdfViewer } from "@/components/pdf/PdfViewer";
import { cn } from "@/lib/cn";
import type { RentReceiptController } from "./useRentReceiptPage";

/** Preview pane with the template selector. */
export function RentReceiptPreviewPane({
  c,
  panel,
}: {
  c: RentReceiptController;
  panel?: { id: string; labelledBy: string };
}) {
  const { t } = useTranslation();
  return (
    <div
      data-cy="volet-apercu"
      id={panel?.id}
      role={c.mobile && panel ? "tabpanel" : undefined}
      aria-labelledby={c.mobile && panel ? panel.labelledBy : undefined}
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
            ? t("rentReceipt.preview.incomplete")
            : !c.selectedLease
              ? t("rentReceipt.preview.missingLease")
              : !c.signatureAvailable
                ? t("rentReceipt.preview.missingSignature")
                : c.preview.error
        }
        updatedAt={c.preview.updatedAt}
        onDownload={c.preview.download}
        actions={
          <select
            aria-label={t("rentReceipt.preview.templateAria")}
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
              <option value="">
                {t("rentReceipt.preview.builtInTemplate")}
              </option>
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
        {t("rentReceipt.preview.note")}
      </p>
    </div>
  );
}
