import "./LlmStatusCard.css";
import { Activity, CheckCircle2, CloudOff, RefreshCw } from "lucide-react";
import { useLlmStatus } from "@/api/queries";
import type { LlmStatus } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { STATUSES } from "./adminLlmHelpers";

/** Live Ollama status card, refreshed independently from the form. */
export function LlmStatusCard() {
  const status = useLlmStatus();
  const key = (status.data?.status as LlmStatus | undefined) ?? null;
  const info = key ? STATUSES[key] : null;

  return (
    <section className="card llm-status-card" data-cy="llm-statut">
      <div className="llm-status-card-header">
        <div className="llm-status-card-main">
          <span
            className={cn(
              "llm-status-card-icon",
              key === "PRET"
                ? "llm-status-card-icon-ready"
                : key === "DESACTIVE"
                  ? "llm-status-card-icon-off"
                  : "llm-status-card-icon-warning",
            )}
          >
            {key === "PRET" ? (
              <CheckCircle2 size={19} aria-hidden="true" />
            ) : key === "INJOIGNABLE" ? (
              <CloudOff size={19} aria-hidden="true" />
            ) : (
              <Activity size={19} aria-hidden="true" />
            )}
          </span>
          <div>
            <p className="eyebrow">État de l’analyse IA</p>
            <div className="llm-status-card-title-row">
              <h2 className="llm-status-card-title">Connexion Ollama</h2>
              <span
                className={cn("badge", info?.className ?? "badge-neutral")}
                data-cy="badge-llm-statut-admin"
              >
                <span
                  className={cn(
                    "llm-status-card-dot",
                    info?.dot ?? "bg-ink-soft/60",
                  )}
                  aria-hidden="true"
                />
                {status.isPending
                  ? "Vérification…"
                  : status.isError
                    ? "Indisponible"
                    : (info?.text ?? "Inconnu")}
              </span>
            </div>
            <p className="llm-status-card-description">
              {status.data?.message ??
                info?.description ??
                "Interrogation du serveur Ollama…"}
            </p>
          </div>
        </div>
        <div className="llm-status-card-actions">
          <span className="llm-status-card-reachability">
            {status.data?.reachable
              ? "Serveur joignable"
              : status.data
                ? "Serveur non joignable"
                : "—"}
            {status.data?.active
              ? " · IA activée"
              : status.data
                ? " · IA désactivée"
                : ""}
          </span>
          <Button
            variant="secondary"
            small
            icon={<RefreshCw size={14} />}
            loading={status.isFetching}
            onClick={() => void status.refetch()}
          >
            Actualiser
          </Button>
        </div>
      </div>
    </section>
  );
}
