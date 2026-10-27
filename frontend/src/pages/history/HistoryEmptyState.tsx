import "./HistoryEmptyState.css";
import { Archive } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  return (
    <EmptyState
      title={t("history.empty.title")}
      description={t("history.empty.description")}
      icon={<Archive size={22} aria-hidden="true" />}
      action={
        <div className="history-empty-state-actions">
          <Button variant="primary" onClick={onCreateRentReceipt}>
            {t("history.empty.createRentReceipt")}
          </Button>
          <Button variant="secondary" onClick={onCreateStatement}>
            {t("history.empty.createStatement")}
          </Button>
        </div>
      }
    />
  );
}
