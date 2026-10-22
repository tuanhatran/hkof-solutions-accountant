import { AlertTriangle, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";
import { cn } from "@/lib/cn";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
  dataCy?: string;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "primary",
  onConfirm,
  onCancel,
  dataCy = "dialogue-confirmation",
}: ConfirmDialogProps) {
  const cancelButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    cancelButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 p-4 backdrop-blur-[2px] sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        className="animation-fade w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-floating sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${dataCy}-titre`}
        data-cy={dataCy}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full",
              variant === "danger"
                ? "bg-danger-soft text-danger"
                : "bg-warning-soft text-warning",
            )}
            aria-hidden="true"
          >
            <AlertTriangle size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={`${dataCy}-titre`} className="text-xl text-ink">
              {title}
            </h2>
            {message ? (
              <div className="mt-2 text-sm leading-relaxed text-ink-soft">
                {message}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-ink-soft transition hover:bg-paper-deep hover:text-ink"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button ref={cancelButton} variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            data-cy="dialogue-confirmer"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
