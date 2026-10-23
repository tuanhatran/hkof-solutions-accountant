import { ShieldAlert } from "lucide-react";

/** Warning shown when the configured Ollama URL is not local. */
export function LlmRemoteWarning() {
  return (
    <div
      className="mb-6 flex items-start gap-3 rounded-2xl border border-warning/25 bg-warning-soft/70 px-4 py-3"
      role="alert"
      data-cy="alerte-llm-distante"
    >
      <ShieldAlert
        size={18}
        className="mt-0.5 shrink-0 text-warning"
        aria-hidden="true"
      />
      <div className="text-xs leading-relaxed text-warning">
        <p className="font-semibold">
          Les justificatifs seront envoyés à un serveur distant.
        </p>
        <p className="mt-0.5">
          L’URL configurée n’est ni <code className="font-mono">localhost</code>
          , ni <code className="font-mono">host.docker.internal</code>, ni une
          IP privée. N’utilisez cette option que si vous acceptez ce transfert.
        </p>
      </div>
    </div>
  );
}
