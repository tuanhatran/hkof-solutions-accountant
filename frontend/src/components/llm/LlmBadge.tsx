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
  PRET: { text: "IA prête", className: "badge-accent", dot: "bg-accent" },
  PRET_DISTANT: {
    text: "IA distante",
    className: "badge-warning",
    dot: "bg-warning",
  },
  MODELE_ABSENT: {
    text: "Modèle absent",
    className: "badge-warning",
    dot: "bg-warning",
  },
  INJOIGNABLE: {
    text: "IA injoignable",
    className: "badge-danger",
    dot: "bg-danger",
  },
  DESACTIVE: {
    text: "IA désactivée",
    className: "badge-neutral",
    dot: "bg-ink-soft/60",
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
        dark
          ? "border-white/15 bg-white/10 text-white/90"
          : (configuration?.className ?? "badge-neutral"),
      )}
      data-cy="badge-llm-status"
      title={message}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isError ? "bg-danger" : (configuration?.dot ?? "bg-ink-soft/60"),
          !isPending && !isError && status !== "DESACTIVE" && "animate-pulse",
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
      className="rounded-full"
      aria-label={`${text}. Ouvrir la configuration de l'IA.`}
    >
      {content}
    </Link>
  );
}
