import type { ReactNode } from 'react';

interface GroupeChampProps {
  id: string;
  label: string;
  erreur?: string;
  aide?: string;
  badge?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function GroupeChamp({ id, label, erreur, aide, badge, className, children }: GroupeChampProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="label-champ">
          {label}
        </label>
        {badge}
      </div>
      {children}
      {aide && !erreur ? (
        <p className="aide" id={`${id}-aide`}>
          {aide}
        </p>
      ) : null}
      {erreur ? (
        <p className="erreur-champ" id={`${id}-erreur`} role="alert">
          {erreur}
        </p>
      ) : null}
    </div>
  );
}
