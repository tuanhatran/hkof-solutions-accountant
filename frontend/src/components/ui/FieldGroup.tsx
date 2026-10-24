import "./FieldGroup.css";
import type { ReactNode } from "react";

interface FieldGroupProps {
  id: string;
  label: string;
  error?: string;
  help?: string;
  badge?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function FieldGroup({
  id,
  label,
  error: errorText,
  help,
  badge,
  className,
  children,
}: FieldGroupProps) {
  return (
    <div className={className}>
      <div className="field-group-header">
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        {badge}
      </div>
      {children}
      {help && !errorText ? (
        <p className="hint" id={`${id}-hint`}>
          {help}
        </p>
      ) : null}
      {errorText ? (
        <p className="error-text" id={`${id}-error`} role="alert">
          {errorText}
        </p>
      ) : null}
    </div>
  );
}
