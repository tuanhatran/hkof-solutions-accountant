import "./LlmStatusCard.css";
import { Activity, CheckCircle2, CloudOff, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLlmStatus } from "@/api/queries";
import type { LlmStatus } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { STATUSES } from "./adminLlmHelpers";
import type { AdminLlmController } from "./useAdminLlmPage";

/** Live Ollama status card, refreshed independently from the form. */
export function LlmStatusCard({ c }: { c: AdminLlmController }) {
  const { t } = useTranslation();
  const status = useLlmStatus();
  const key = (status.data?.status as LlmStatus | undefined) ?? null;
  const info = key ? STATUSES[key] : null;

  return (
    <section className="card llm-status-card" data-cy="llm-status">
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
            <p className="eyebrow">{t("adminLlm.status.eyebrow")}</p>
            <div className="llm-status-card-title-row">
              <h2 className="llm-status-card-title">
                {t("adminLlm.status.title")}
              </h2>
              <span
                className={cn("badge", info?.className ?? "badge-neutral")}
                data-cy="admin-llm-status-badge"
              >
                <span
                  className={cn(
                    "llm-status-card-dot",
                    info?.dot ?? "bg-ink-soft/60",
                  )}
                  aria-hidden="true"
                />
                {status.isPending
                  ? t("adminLlm.status.verifying")
                  : status.isError
                    ? t("adminLlm.status.unavailable")
                    : (info?.text ?? t("adminLlm.status.unknown"))}
              </span>
            </div>
            <p className="llm-status-card-description">
              {status.data?.message ??
                info?.description ??
                t("adminLlm.status.querying")}
            </p>
          </div>
        </div>
        <div className="llm-status-card-actions">
          <span className="llm-status-card-reachability">
            {status.data?.reachable
              ? t("adminLlm.status.reachable")
              : status.data
                ? t("adminLlm.status.unreachable")
                : t("adminLlm.status.none")}
            {status.data?.active
              ? t("adminLlm.status.activeSuffix")
              : status.data
                ? t("adminLlm.status.inactiveSuffix")
                : ""}
          </span>
          <Button
            variant="secondary"
            small
            icon={<Activity size={14} />}
            loading={c.testInProgress}
            onClick={() => void c.runTest()}
            data-cy="btn-test-llm"
          >
            {t("adminLlm.connection.testConnection")}
          </Button>
          <Button
            variant="secondary"
            small
            icon={<RefreshCw size={14} />}
            loading={status.isFetching}
            onClick={() => void status.refetch()}
          >
            {t("adminLlm.status.refresh")}
          </Button>
        </div>
      </div>
    </section>
  );
}
