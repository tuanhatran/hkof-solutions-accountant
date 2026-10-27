import { ScanText } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AiBadgeProps {
  sourceExtract?: string | null;
  label?: string;
}

export function AiBadge({ sourceExtract, label }: AiBadgeProps) {
  const { t } = useTranslation();

  return (
    <span
      className="badge badge-ai"
      data-cy="badge-ia-detecte"
      title={
        sourceExtract
          ? t("common.ai.source", { source: sourceExtract })
          : undefined
      }
    >
      <ScanText size={11} aria-hidden="true" />
      {label ?? t("common.ai.detected")}
    </span>
  );
}
