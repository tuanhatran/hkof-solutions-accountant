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
        <div className="flex flex-wrap justify-center gap-2">
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
