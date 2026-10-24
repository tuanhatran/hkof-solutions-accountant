import "./LlmRemoteWarning.css";
import { ShieldAlert } from "lucide-react";

/** Warning shown when the configured Ollama URL is not local. */
export function LlmRemoteWarning() {
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
        <p className="llm-remote-warning-title">
          Les justificatifs seront envoyés à un serveur distant.
        </p>
        <p className="llm-remote-warning-text">
          L’URL configurée n’est ni{" "}
          <code className="llm-remote-warning-code">localhost</code>, ni{" "}
          <code className="llm-remote-warning-code">host.docker.internal</code>,
          ni une IP privée. N’utilisez cette option que si vous acceptez ce
          transfert.
        </p>
      </div>
    </div>
  );
}
