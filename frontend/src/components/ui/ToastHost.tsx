import "./ToastHost.css";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToasts, type ToastType } from "@/state/toasts";
import { cn } from "@/lib/cn";

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const CLASS_NAMES: Record<ToastType, string> = {
  success: "toast-host-item-success",
  error: "toast-host-item-error",
  info: "toast-host-item-info",
};

export function ToastHost() {
  const { t } = useTranslation();
  const toasts = useToasts((state) => state.toasts);
  const remove = useToasts((state) => state.remove);

  return (
    <div className="toast-host" aria-live="polite" aria-atomic="false">
      {toasts.map((element) => {
        const IconComponent = ICONS[element.type];
        return (
          <div
            key={element.id}
            className={cn(
              "animation-toast toast-host-item",
              CLASS_NAMES[element.type],
            )}
            role={element.type === "error" ? "alert" : "status"}
            data-cy={`toast-${element.type}`}
          >
            <IconComponent
              size={18}
              className="toast-host-icon"
              aria-hidden="true"
            />
            <p className="toast-host-message">{element.message}</p>
            <button
              type="button"
              onClick={() => remove(element.id)}
              className="toast-host-close"
              aria-label={t("common.closeNotification")}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
