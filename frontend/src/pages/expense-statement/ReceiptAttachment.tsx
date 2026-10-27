import "./ReceiptAttachment.css";
import { useTranslation } from "react-i18next";
import { FileDropzone, SelectedFile } from "@/components/forms/FileDropzone";
import { Spinner } from "@/components/ui/States";
import type { ExpenseStatementController } from "./useExpenseStatementPage";

/** Receipt upload block of the entry form. */
export function ReceiptAttachment({
  controller: c,
}: {
  controller: ExpenseStatementController;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="receipt-attachment-header">
        <span className="field-label">
          {t("expenseStatement.receipt.label")}{" "}
          <span className="receipt-attachment-required">*</span>
        </span>
        <span className="receipt-attachment-limit">
          {t("expenseStatement.receipt.limit")}
        </span>
      </div>
      {c.uploading ? (
        <div className="receipt-attachment-uploading">
          <Spinner size={18} />
          {t("expenseStatement.receipt.uploading")}
        </div>
      ) : c.receipt ? (
        <SelectedFile
          name={c.receipt.name}
          size={c.receipt.size}
          mimeType={c.receipt.mimeType}
          onRemove={c.removeFile}
        />
      ) : (
        <FileDropzone
          onFile={(file) => void c.upload(file)}
          dataCy="dropzone-fichier"
          disabled={c.expenseItemsQuery.isPending}
        />
      )}
      {c.fileError ? (
        <p className="error-text" role="alert">
          {c.fileError}
        </p>
      ) : null}
    </div>
  );
}
