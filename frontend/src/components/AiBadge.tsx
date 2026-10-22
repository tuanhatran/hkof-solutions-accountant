import { Sparkles } from 'lucide-react';

interface AiBadgeProps {
  extraitSource?: string | null;
  libelle?: string;
}

export function AiBadge({ extraitSource: sourceExtract, libelle: labelText = 'Détecté par IA' }: AiBadgeProps) {
  return (
    <span
      className="badge badge-ia"
      data-cy="badge-ia-detecte"
      title={sourceExtract ? `Extrait du document : « ${sourceExtract} »` : undefined}
    >
      <Sparkles size={11} aria-hidden="true" />
      {labelText}
    </span>
  );
}
