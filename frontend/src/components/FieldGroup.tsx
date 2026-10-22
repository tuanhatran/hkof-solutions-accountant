import type { ReactNode } from "react";

interface FieldGroupProps {
  id: string;
  label: string;
  erreur?: string;
  aide?: string;
  badge?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function FieldGroup({
  id,
  label,
  erreur: errorText,
  aide: help,
  badge,
  className,
  children,
}: FieldGroupProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="label-champ">
          {label}
        </label>
        {badge}
      </div>
      {children}
      {help && !errorText ? (
        <p className="aide" id={`${id}-aide`}>
          {help}
        </p>
      ) : null}
      {errorText ? (
        <p className="erreur-champ" id={`${id}-erreur`} role="alert">
          {errorText}
        </p>
      ) : null}
    </div>
  );
}
