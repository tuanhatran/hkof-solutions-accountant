import "./LlmBadge.css";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLlmStatus } from "@/api/queries";
import type { LlmStatus } from "@/api/types";
import { cn } from "@/lib/cn";

interface StatusLabel {
  key: string;
  className: string;
  dot: string;
}

const STATUSES: Record<LlmStatus, StatusLabel> = {
  PRET: {
    key: "expenseStatement.llm.ready",
    className: "badge-accent",
    dot: "llm-badge-dot-accent",
  },
  PRET_DISTANT: {
    key: "expenseStatement.llm.remote",
    className: "badge-warning",
    dot: "llm-badge-dot-warning",
  },
  MODELE_ABSENT: {
    key: "expenseStatement.llm.missingModel",
    className: "badge-warning",
    dot: "llm-badge-dot-warning",
  },
  INJOIGNABLE: {
    key: "expenseStatement.llm.unreachable",
    className: "badge-danger",
    dot: "llm-badge-dot-danger",
  },
  DESACTIVE: {
    key: "expenseStatement.llm.disabled",
    className: "badge-neutral",
    dot: "llm-badge-dot-neutral",
  },
};

interface LlmBadgeProps {
  dark?: boolean;
  withLink?: boolean;
}

export function LlmBadge({ dark = false, withLink = true }: LlmBadgeProps) {
  const { t } = useTranslation();
  const { data, isPending, isError } = useLlmStatus();

  const status = data?.status as LlmStatus | undefined;
  const configuration = status ? STATUSES[status] : null;
  const text = isPending
    ? t("expenseStatement.llm.loading")
    : isError
      ? t("expenseStatement.llm.unavailable")
      : configuration
        ? t(configuration.key)
        : t("expenseStatement.llm.unknown");
  const message = data?.message ?? t("expenseStatement.llm.messageFallback");

  const content = (
    <span
      className={cn(
        "badge",
        dark ? "llm-badge-dark" : (configuration?.className ?? "badge-neutral"),
      )}
      data-cy="badge-llm-status"
      title={message}
    >
      <span
        className={cn(
          "llm-badge-dot",
          isError
            ? "llm-badge-dot-danger"
            : (configuration?.dot ?? "llm-badge-dot-neutral"),
          !isPending &&
            !isError &&
            status !== "DESACTIVE" &&
            "llm-badge-dot-pulse",
        )}
        aria-hidden="true"
      />
      {text}
    </span>
  );

  if (!withLink) {
    return content;
  }

  return (
    <Link
      to="/admin"
      className="llm-badge-link"
      aria-label={t("expenseStatement.llm.configurationLink", { text })}
    >
      {content}
    </Link>
  );
}
