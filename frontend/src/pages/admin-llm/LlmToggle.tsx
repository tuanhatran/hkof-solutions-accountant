import { cn } from "@/lib/cn";

/** Accessible on/off switch used to enable the IA analysis. */
export function LlmToggle({
  enabled: active,
  onChange,
}: {
  enabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label="Activer l’analyse par IA"
      onClick={onChange}
      data-cy="switch-llm-actif"
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        active ? "bg-accent" : "bg-line-strong",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
          active ? "translate-x-[22px]" : "translate-x-0.5",
        )}
        aria-hidden="true"
      />
    </button>
  );
}
