import "./HistoryEmptyState.css";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";

/** Empty history card with the two generation shortcuts. */
export function HistoryEmptyState({
  onCreateRentReceipt,
  onCreateStatement,
}: {
  onCreateRentReceipt: () => void;
  onCreateStatement: () => void;
}) {
  return (
    <EmptyState
      title="Aucun document pour le moment"
      description="Générez une quittance ou une note de frais : elle apparaîtra ici, avec toutes ses versions."
      icon={<Archive size={22} aria-hidden="true" />}
      action={
        <div className="history-empty-state-actions">
          <Button variant="primary" onClick={onCreateRentReceipt}>
            Générer une quittance
          </Button>
          <Button variant="secondary" onClick={onCreateStatement}>
            Générer une note de frais
          </Button>
        </div>
      }
    />
  );
}
