import "./LlmRemoteWarning.css";
import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Warning shown when the configured Ollama URL is not local. */
export function LlmRemoteWarning() {
  const { t } = useTranslation();

  return (
    <div
      className="llm-remote-warning"
      role="alert"
      data-cy="alerte-llm-distante"
    >
      <ShieldAlert
        size={18}
        className="llm-remote-warning-icon"
        aria-hidden="true"
      />
      <div className="llm-remote-warning-body">
        <p className="llm-remote-warning-title">{t("adminLlm.remote.title")}</p>
        <p className="llm-remote-warning-text">
          {t("adminLlm.remote.textBefore")}
          <code className="llm-remote-warning-code">
            {t("adminLlm.remote.localhost")}
          </code>
          {t("adminLlm.remote.textMiddle")}
          <code className="llm-remote-warning-code">
            {t("adminLlm.remote.dockerHost")}
          </code>
          {t("adminLlm.remote.textAfter")}
        </p>
      </div>
    </div>
  );
}
