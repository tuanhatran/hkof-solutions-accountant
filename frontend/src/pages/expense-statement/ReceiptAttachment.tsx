import "./ReceiptAttachment.css";
import { FileDropzone, SelectedFile } from "@/components/forms/FileDropzone";
import { Spinner } from "@/components/ui/States";
import type { ExpenseStatementController } from "./useExpenseStatementPage";

/** Receipt upload block of the entry form. */
export function ReceiptAttachment({
  controller: c,
}: {
  controller: ExpenseStatementController;
}) {
  return (
    <div>
      <div className="receipt-attachment-header">
        <span className="field-label">
          Fichier justificatif{" "}
          <span className="receipt-attachment-required">*</span>
        </span>
        <span className="receipt-attachment-limit">10 Mo max.</span>
      </div>
      {c.uploading ? (
        <div className="receipt-attachment-uploading">
          <Spinner size={18} />
          Envoi et préparation de l’analyse…
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
