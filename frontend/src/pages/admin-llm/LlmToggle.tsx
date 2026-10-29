import "./LlmToggle.css";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";

/** Accessible on/off switch used to enable the IA analysis. */
export function LlmToggle({
  enabled: active,
  onChange,
}: {
  enabled: boolean;
  onChange: () => void;
}) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={t("adminLlm.connection.toggleAria")}
      onClick={onChange}
      data-cy="switch-active-llm"
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
