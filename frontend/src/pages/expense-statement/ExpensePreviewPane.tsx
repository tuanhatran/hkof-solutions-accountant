import "./ExpensePreviewPane.css";
import { useTranslation } from "react-i18next";
import { PdfViewer } from "@/components/pdf/PdfViewer";
import { cn } from "@/lib/cn";
import type { ExpenseStatementController } from "./useExpenseStatementPage";

/** Preview pane: backend-rendered PDF with template and annex options. */
export function ExpensePreviewPane({
  controller: c,
  panel,
}: {
  controller: ExpenseStatementController;
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
        "expense-preview-pane",
        c.mobile && c.mobilePanel !== "preview" && "hidden",
      )}
    >
      <PdfViewer
        url={c.previewRequest && c.signatureAvailable ? c.preview.url : null}
        loading={c.preview.loading}
        error={
          c.requests.error
            ? t("expenseStatement.preview.invalidLines")
            : c.orderedLines.length === 0
              ? t("expenseStatement.preview.noLine")
              : !c.signatureAvailable
                ? t("expenseStatement.preview.noSignature")
                : c.preview.error
        }
        updatedAt={c.preview.updatedAt}
        onDownload={c.preview.download}
        actions={
          <>
            <select
              aria-label={t("expenseStatement.preview.templateAria")}
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
                <option value="">
                  {t("expenseStatement.preview.builtInTemplate")}
                </option>
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
              {t("expenseStatement.preview.withAttachments")}
            </label>
          </>
        }
      />
      <p className="expense-preview-pane-note">
        {t("expenseStatement.preview.note")}
      </p>
    </div>
  );
}
