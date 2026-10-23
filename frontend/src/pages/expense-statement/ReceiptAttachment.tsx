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
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="field-label">
          Fichier justificatif <span className="text-danger">*</span>
        </span>
        <span className="text-[11px] text-ink-soft">10 Mo max.</span>
      </div>
      {c.uploading ? (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-paper/50 p-4 text-sm text-ink-soft">
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
