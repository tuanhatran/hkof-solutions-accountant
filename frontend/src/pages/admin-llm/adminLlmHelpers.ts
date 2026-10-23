import type { LlmConfigDto, LlmConfigRequest, LlmStatus } from "@/api/types";
import type { LlmFormValues } from "@/lib/validation";

export const STATUSES: Record<
  LlmStatus,
  { text: string; className: string; dot: string; description: string }
> = {
  PRET: {
    text: "Connecté",
    className: "badge-accent",
    dot: "bg-accent",
    description: "Le serveur Ollama et le modèle configuré sont disponibles.",
  },
  PRET_DISTANT: {
    text: "Connecté — serveur distant",
    className: "badge-warning",
    dot: "bg-warning",
    description:
      "Ollama répond, mais l’URL n’est pas locale : les documents quittent cette machine.",
  },
  MODELE_ABSENT: {
    text: "Modèle absent",
    className: "badge-warning",
    dot: "bg-warning",
    description: "Ollama répond mais le modèle sélectionné n’est pas installé.",
  },
  INJOIGNABLE: {
    text: "Injoignable",
    className: "badge-danger",
    dot: "bg-danger",
    description:
      "Le serveur Ollama ne répond pas. La saisie manuelle reste disponible.",
  },
  DESACTIVE: {
    text: "Désactivé",
    className: "badge-neutral",
    dot: "bg-ink-soft/60",
    description:
      "L’analyse IA est désactivée. Toute l’application reste utilisable manuellement.",
  },
};

export function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function isValidUrl(url: string): boolean {
  try {
    const analysis = new URL(url);
    return analysis.protocol === "http:" || analysis.protocol === "https:";
  } catch {
    return false;
  }
}

export function isLocalUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (
      [
        "localhost",
        "127.0.0.1",
        "::1",
        "[::1]",
        "0.0.0.0",
        "host.docker.internal",
        "ollama",
      ].includes(host)
    ) {
      return true;
    }
    if (
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host)
    ) {
      return true;
    }
    return /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  } catch {
    return false;
  }
}

export function valuesFromConfig(
  config: LlmConfigDto | undefined,
): LlmFormValues {
  return {
    active: config?.active ?? false,
    url: config?.url ?? "http://host.docker.internal:11434",
    model: config?.model ?? "",
    timeoutSeconds: config?.timeoutSeconds ?? 120,
    temperature: config?.temperature ?? "0",
    numCtx: config?.numCtx ?? 8192,
    maxPages: config?.maxPages ?? 5,
    ocrActive: config?.ocrActive ?? false,
    extractionPrompt: config?.extractionPrompt ?? "",
    apiKey: "",
    deleteApiKey: false,
  };
}

export function requestBodyFromValues(values: LlmFormValues): LlmConfigRequest {
  const requestBody: LlmConfigRequest = {
    active: values.active,
    supplier: "OLLAMA",
    url: normalizeUrl(values.url),
    model: values.model.trim(),
    timeoutSeconds: values.timeoutSeconds,
    temperature: values.temperature.trim().replace(",", "."),
    numCtx: values.numCtx,
    maxPages: values.maxPages,
    ocrActive: values.ocrActive,
    extractionPrompt: values.extractionPrompt.trim(),
  };
  if (values.apiKey.trim()) {
    requestBody.apiKey = values.apiKey.trim();
  } else if (values.deleteApiKey) {
    requestBody.apiKey = "";
  }
  return requestBody;
}
