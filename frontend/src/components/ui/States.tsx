import "./States.css";
import { AlertCircle, Inbox, LoaderCircle, RefreshCcw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function Spinner({
  size = 18,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <LoaderCircle
      size={size}
      className={cn("states-spinner", className)}
      aria-hidden="true"
    />
  );
}

export function LoadingState({
  message = "Chargement…",
}: {
  message?: string;
}) {
  return (
    <div className="card states-loading" role="status">
      <Spinner />
      {message}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="card states-error border-danger/25 bg-danger-soft/40"
      role="alert"
    >
      <div className="states-error-title">
        <AlertCircle size={18} aria-hidden="true" />
        Impossible de charger les données
      </div>
      <p className="states-error-message">{message}</p>
      {onRetry ? (
        <Button
          variant="secondary"
          small
          icon={<RefreshCcw size={14} />}
          onClick={onRetry}
        >
          Réessayer
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="card states-empty">
      <span className="states-empty-icon">
        {icon ?? <Inbox size={22} aria-hidden="true" />}
      </span>
      <h3 className="states-empty-title">{title}</h3>
      {description ? (
        <p className="states-empty-description">{description}</p>
      ) : null}
      {action ? <div className="states-empty-action">{action}</div> : null}
    </div>
  );
}
