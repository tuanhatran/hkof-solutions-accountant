import { Sparkles } from "lucide-react";

interface AiBadgeProps {
  sourceExtract?: string | null;
  label?: string;
}

export function AiBadge({
  sourceExtract,
  label = "Détecté par IA",
}: AiBadgeProps) {
  return (
    <span
      className="badge badge-ai"
      data-cy="badge-ia-detecte"
      title={
        sourceExtract ? `Extrait du document : « ${sourceExtract} »` : undefined
      }
    >
      <Sparkles size={11} aria-hidden="true" />
      {label}
    </span>
  );
}
