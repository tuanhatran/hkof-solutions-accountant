import "./FormModal.css";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

interface FormModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  formDataCy: string;
  submitDataCy: string;
  children: ReactNode;
  pending?: boolean;
  error?: string | null;
  formClassName?: string;
  wide?: boolean;
}

/** Accessible modal wrapping a creation/update form with an Annuler/Valider footer. */
export function FormModal({
  open,
  title,
  onClose,
  onSubmit,
  formDataCy,
  submitDataCy,
  children,
  pending = false,
  error = null,
  formClassName,
  wide = false,
}: FormModalProps) {
  const { t } = useTranslation();
  const titleId = `${formDataCy}-titre`;
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="form-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panel}
        tabIndex={-1}
        className={cn(
          "animation-fade form-modal-panel",
          wide && "form-modal-panel-wide",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-cy={`dialog-${formDataCy}`}
      >
        <div className="form-modal-header">
          <h2 id={titleId} className="form-modal-title">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="form-modal-close"
            aria-label={t("common.close")}
          >
            <X size={18} />
          </button>
        </div>
        <form
          className={cn("form-modal-form", formClassName)}
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
          aria-labelledby={titleId}
          noValidate
          data-cy={formDataCy}
        >
          {error ? (
            <p className="form-modal-error" role="alert">
              {error}
            </p>
          ) : null}
          {children}
          <div className="form-modal-actions">
            <Button
              variant="secondary"
              small
              onClick={onClose}
              disabled={pending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              small
              type="submit"
              loading={pending}
              data-cy={submitDataCy}
            >
              {t("common.validate")}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
