import "./LlmToggle.css";
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
      className={cn("llm-toggle", active ? "llm-toggle-on" : "llm-toggle-off")}
    >
      <span
        className={cn(
          "llm-toggle-knob",
          active ? "llm-toggle-knob-on" : "llm-toggle-knob-off",
        )}
        aria-hidden="true"
      />
    </button>
  );
}
