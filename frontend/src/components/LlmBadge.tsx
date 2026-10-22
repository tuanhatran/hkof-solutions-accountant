import { Link } from "react-router-dom";
import { useLlmStatus } from "@/api/queries";
import type { LlmStatus } from "@/api/types";
import { cn } from "@/lib/cn";

interface StatusLabel {
  texte: string;
  classe: string;
  point: string;
}

const STATUSES: Record<LlmStatus, StatusLabel> = {
  PRET: { texte: "IA prête", classe: "badge-accent", point: "bg-accent" },
  PRET_DISTANT: {
    texte: "IA distante",
    classe: "badge-avertissement",
    point: "bg-warning",
  },
  MODELE_ABSENT: {
    texte: "Modèle absent",
    classe: "badge-avertissement",
    point: "bg-warning",
  },
  INJOIGNABLE: {
    texte: "IA injoignable",
    classe: "badge-danger",
    point: "bg-danger",
  },
  DESACTIVE: {
    texte: "IA désactivée",
    classe: "badge-neutre",
    point: "bg-ink-soft/60",
  },
};

interface LlmBadgeProps {
  sombre?: boolean;
  avecLien?: boolean;
}

export function LlmBadge({
  sombre: dark = false,
  avecLien: withLink = true,
}: LlmBadgeProps) {
  const { data, isPending, isError } = useLlmStatus();

  const status = data?.status as LlmStatus | undefined;
  const configuration = status ? STATUSES[status] : null;
  const text = isPending
    ? "IA…"
    : isError
      ? "IA indisponible"
      : (configuration?.texte ?? "IA inconnue");
  const message = data?.message ?? "État de l’analyse IA indisponible.";

  const content = (
    <span
      className={cn(
        "badge",
        dark
          ? "border-white/15 bg-white/10 text-white/90"
          : (configuration?.classe ?? "badge-neutre"),
      )}
      data-cy="badge-llm-status"
      title={message}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isError ? "bg-danger" : (configuration?.point ?? "bg-ink-soft/60"),
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
