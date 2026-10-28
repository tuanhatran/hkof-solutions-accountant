import "./Dialog.css";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Dialog chrome shared by views that live inside one window: a portaled
 * overlay, the header close button, Escape and backdrop close, a Tab focus trap
 * and the focus restore to the opener. The content stays owned by the caller,
 * so a single dialog can swap between a list and an inline form without
 * stacking a second window. Escape is ignored while another dialog is stacked
 * above this one.
 */
export function Dialog({
  open = true,
  title,
  onClose,
  dataCy,
  wide = false,
  children,
}: {
  open?: boolean;
  title: string;
  onClose: () => void;
  dataCy: string;
  wide?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = `${dataCy}-titre`;

  // Runs before the focus effect so the opener is still the active element.
  useEffect(() => {
    if (!open) {
      return;
    }
    const active = document.activeElement;
    opener.current =
      active instanceof HTMLElement && active !== document.body ? active : null;
    return () => {
      const target = opener.current;
      opener.current = null;
      if (target?.isConnected) {
        target.focus();
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    panel.current?.focus();
    const isTopmost = () => {
      const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"]');
      return dialogs[dialogs.length - 1] === panel.current;
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isTopmost()) {
          onClose();
        }
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const focusable =
        panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (!focusable || focusable.length === 0) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      const inside =
        current !== null && (panel.current?.contains(current) ?? false);
      if (event.shiftKey) {
        if (!inside || current === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!inside || current === last) {
        event.preventDefault();
        first.focus();
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
      className="dialog-overlay"
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
          "animation-fade dialog-panel",
          wide && "dialog-panel-wide",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-cy={dataCy}
      >
        <div className="dialog-header">
          <h2 id={titleId} className="dialog-title">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="dialog-close"
            aria-label={t("common.close")}
          >
            <X size={18} />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
