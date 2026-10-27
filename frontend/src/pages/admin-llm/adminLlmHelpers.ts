import type { LlmConfigDto, LlmConfigRequest, LlmStatus } from "@/api/types";
import i18n from "@/i18n";
import type { LlmFormValues } from "@/lib/validation";

interface LlmStatusInfo {
  readonly text: string;
  readonly description: string;
  className: string;
  dot: string;
}

/**
 * Status copy resolves through `i18n` getters so a language switch relabels the
 * card without reloading; the badge classes stay constant.
 */
export const STATUSES: Record<LlmStatus, LlmStatusInfo> = {
  PRET: {
    get text() {
      return i18n.t("adminLlm.status.ready");
    },
    get description() {
      return i18n.t("adminLlm.status.readyDescription");
    },
    className: "badge-accent",
    dot: "bg-accent",
  },
  PRET_DISTANT: {
    get text() {
      return i18n.t("adminLlm.status.remote");
    },
    get description() {
      return i18n.t("adminLlm.status.remoteDescription");
    },
    className: "badge-warning",
    dot: "bg-warning",
  },
  MODELE_ABSENT: {
    get text() {
      return i18n.t("adminLlm.status.missingModel");
    },
    get description() {
      return i18n.t("adminLlm.status.missingModelDescription");
    },
    className: "badge-warning",
    dot: "bg-warning",
  },
  INJOIGNABLE: {
    get text() {
      return i18n.t("adminLlm.status.unreachableStatus");
    },
    get description() {
      return i18n.t("adminLlm.status.unreachableDescription");
    },
    className: "badge-danger",
    dot: "bg-danger",
  },
  DESACTIVE: {
    get text() {
      return i18n.t("adminLlm.status.disabled");
    },
    get description() {
      return i18n.t("adminLlm.status.disabledDescription");
    },
    className: "badge-neutral",
    dot: "bg-ink-soft/60",
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
