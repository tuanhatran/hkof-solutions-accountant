import { useTranslation } from "react-i18next";
import type { StatementDto } from "@/api/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatMonth } from "@/lib/format";

/** Confirmation shown before replacing the statement draft with a version. */
export function HistoryReloadDialog({
  statement,
  onConfirm,
  onCancel,
}: {
  statement: StatementDto | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  return (
    <ConfirmDialog
      open={statement !== null}
      title={t("history.reloadDialog.title")}
      message={
        statement
          ? t("history.reloadDialog.message", {
              version: statement.version ?? 1,
              month: formatMonth(statement.month),
            })
          : null
      }
      confirmLabel={t("history.reloadDialog.confirm")}
      onConfirm={onConfirm}
      onCancel={onCancel}
      dataCy="dialog-reopen-statement"
    />
  );
}
