import "./ConfirmDialog.css";
import { AlertTriangle, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
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
  confirmLabel,
  cancelLabel,
  variant = "primary",
  onConfirm,
  onCancel,
  dataCy = "dialogue-confirmation",
}: ConfirmDialogProps) {
  const { t } = useTranslation();
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
      className="confirm-dialog-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        className="animation-fade confirm-dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${dataCy}-titre`}
        data-cy={dataCy}
      >
        <div className="confirm-dialog-header">
          <span
            className={cn(
              "confirm-dialog-icon",
              variant === "danger"
                ? "confirm-dialog-icon-danger"
                : "confirm-dialog-icon-warning",
            )}
            aria-hidden="true"
          >
            <AlertTriangle size={19} />
          </span>
          <div className="confirm-dialog-body">
            <h2 id={`${dataCy}-titre`} className="confirm-dialog-title">
              {title}
            </h2>
            {message ? (
              <div className="confirm-dialog-message">{message}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="confirm-dialog-close"
            aria-label={t("common.close")}
          >
            <X size={18} />
          </button>
        </div>
        <div className="confirm-dialog-actions">
          <Button ref={cancelButton} variant="secondary" onClick={onCancel}>
            {cancelLabel ?? t("common.cancel")}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            data-cy="dialogue-confirmer"
          >
            {confirmLabel ?? t("common.confirm")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
