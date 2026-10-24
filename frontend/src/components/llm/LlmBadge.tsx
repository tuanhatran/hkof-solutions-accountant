import "./LlmBadge.css";
import { Link } from "react-router-dom";
import { useLlmStatus } from "@/api/queries";
import type { LlmStatus } from "@/api/types";
import { cn } from "@/lib/cn";

interface StatusLabel {
  text: string;
  className: string;
  dot: string;
}

const STATUSES: Record<LlmStatus, StatusLabel> = {
  PRET: {
    text: "IA prête",
    className: "badge-accent",
    dot: "llm-badge-dot-accent",
  },
  PRET_DISTANT: {
    text: "IA distante",
    className: "badge-warning",
    dot: "llm-badge-dot-warning",
  },
  MODELE_ABSENT: {
    text: "Modèle absent",
    className: "badge-warning",
    dot: "llm-badge-dot-warning",
  },
  INJOIGNABLE: {
    text: "IA injoignable",
    className: "badge-danger",
    dot: "llm-badge-dot-danger",
  },
  DESACTIVE: {
    text: "IA désactivée",
    className: "badge-neutral",
    dot: "llm-badge-dot-neutral",
  },
};

interface LlmBadgeProps {
  dark?: boolean;
  withLink?: boolean;
}

export function LlmBadge({ dark = false, withLink = true }: LlmBadgeProps) {
  const { data, isPending, isError } = useLlmStatus();

  const status = data?.status as LlmStatus | undefined;
  const configuration = status ? STATUSES[status] : null;
  const text = isPending
    ? "IA…"
    : isError
      ? "IA indisponible"
      : (configuration?.text ?? "IA inconnue");
  const message = data?.message ?? "État de l’analyse IA indisponible.";

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
      aria-label={`${text}. Ouvrir la configuration de l'IA.`}
    >
      {content}
    </Link>
  );
}
