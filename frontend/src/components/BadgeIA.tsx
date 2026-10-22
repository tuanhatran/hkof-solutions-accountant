import { Sparkles } from 'lucide-react';

interface BadgeIAProps {
  extraitSource?: string | null;
  libelle?: string;
}

export function BadgeIA({ extraitSource, libelle = 'Détecté par IA' }: BadgeIAProps) {
  return (
    <span
      className="badge badge-ia"
      data-cy="badge-ia-detecte"
      title={extraitSource ? `Extrait du document : « ${extraitSource} »` : undefined}
    >
      <Sparkles size={11} aria-hidden="true" />
      {libelle}
    </span>
  );
}
