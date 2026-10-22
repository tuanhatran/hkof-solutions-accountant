import { AlertCircle, Inbox, LoaderCircle, RefreshCcw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";
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
      className={cn("animate-spin text-accent", className)}
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
    <div
      className="card flex items-center gap-3 p-6 text-sm text-ink-soft"
      role="status"
    >
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
      className="card flex flex-col items-start gap-3 border-danger/25 bg-danger-soft/40 p-6"
      role="alert"
    >
      <div className="flex items-center gap-2 font-semibold text-danger">
        <AlertCircle size={18} aria-hidden="true" />
        Impossible de charger les données
      </div>
      <p className="text-sm text-ink-soft">{message}</p>
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
    <div className="card flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-paper-deep/70 text-ink-soft">
        {icon ?? <Inbox size={22} aria-hidden="true" />}
      </span>
      <h3 className="mt-4 text-lg text-ink">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-ink-soft">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
