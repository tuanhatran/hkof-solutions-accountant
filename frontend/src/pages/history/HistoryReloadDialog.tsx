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
  return (
    <ConfirmDialog
      open={statement !== null}
      title="Rouvrir cette note ?"
      message={
        statement ? (
          <>
            Les lignes de la version {statement.version ?? 1} de{" "}
            {formatMonth(statement.month)} remplaceront le brouillon de ce mois
            dans l’onglet Note de frais. Les brouillons des autres mois sont
            conservés.
          </>
        ) : null
      }
      confirmLabel="Charger les lignes"
      onConfirm={onConfirm}
      onCancel={onCancel}
      dataCy="dialogue-rouvrir-note"
    />
  );
}
