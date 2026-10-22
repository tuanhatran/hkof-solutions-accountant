import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useToasts, type ToastType } from "@/state/toasts";
import { cn } from "@/lib/cn";

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  succes: CheckCircle2,
  erreur: AlertTriangle,
  info: Info,
};

const CLASS_NAMES: Record<ToastType, string> = {
  succes: "border-accent/20 bg-accent-soft text-accent",
  erreur: "border-danger/20 bg-danger-soft text-danger",
  info: "border-line bg-surface text-ink",
};

export function ToastHost() {
  const toasts = useToasts((state) => state.toasts);
  const remove = useToasts((state) => state.retirer);

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,380px)] flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((element) => {
        const IconComponent = ICONS[element.type];
        return (
          <div
            key={element.id}
            className={cn(
              "animation-toast pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-flottante",
              CLASS_NAMES[element.type],
            )}
            role={element.type === "erreur" ? "alert" : "status"}
            data-cy={`toast-${element.type}`}
          >
            <IconComponent
              size={18}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
              {element.message}
            </p>
            <button
              type="button"
              onClick={() => remove(element.id)}
              className="rounded p-0.5 opacity-60 transition hover:opacity-100"
              aria-label="Fermer la notification"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
