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
    <section className="card mb-6 overflow-hidden" data-cy="llm-statut">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "grid h-10 w-10 place-items-center rounded-xl",
              key === "PRET"
                ? "bg-accent-soft text-accent"
                : key === "DESACTIVE"
                  ? "bg-paper-deep text-ink-soft"
                  : "bg-warning-soft text-warning",
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
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-lg text-ink">Connexion Ollama</h2>
              <span
                className={cn("badge", info?.className ?? "badge-neutral")}
                data-cy="badge-llm-statut-admin"
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
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
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-ink-soft">
              {status.data?.message ??
                info?.description ??
                "Interrogation du serveur Ollama…"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] text-ink-soft sm:inline">
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
