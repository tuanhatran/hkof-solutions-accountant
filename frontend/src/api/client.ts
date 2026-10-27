import i18n from "@/i18n";

export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  code?: string;
  params?: Record<string, string>;
}

export class ApiError extends Error {
  readonly status: number | null;
  readonly problem: ProblemDetail | null;
  readonly code: string | null;
  readonly params: Record<string, string> | null;

  constructor(
    message: string,
    status: number | null = null,
    problem: ProblemDetail | null = null,
    code: string | null = problem?.code ?? null,
    params: Record<string, string> | null = problem?.params ?? null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
    this.code = code;
    this.params = params && Object.keys(params).length > 0 ? params : null;
  }
}

interface ParsedFailure {
  message: string;
  problem: ProblemDetail | null;
  code: string | null;
  params: Record<string, string> | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeParams(value: unknown): Record<string, string> | null {
  if (!isRecord(value)) {
    return null;
  }
  const entries = Object.entries(value).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

/** Reads the error response once and derives the message, problem, code and params. */
async function parseFailure(response: Response): Promise<ParsedFailure> {
  const fallback = `Erreur ${response.status} : la requête a échoué.`;
  const httpFailure: ParsedFailure = {
    message: fallback,
    problem: null,
    code: "HTTP_ERROR",
    params: { status: String(response.status) },
  };
  let text: string;
  try {
    text = await response.text();
  } catch {
    return httpFailure;
  }
  if (!text) {
    return httpFailure;
  }
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("json")) {
    return { message: text, problem: null, code: null, params: null };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return httpFailure;
  }
  if (!isRecord(parsed)) {
    return {
      message: `Erreur ${response.status}.`,
      problem: null,
      code: null,
      params: null,
    };
  }
  const problem = parsed as ProblemDetail;
  return {
    message: problem.detail || problem.title || `Erreur ${response.status}.`,
    problem,
    code: typeof problem.code === "string" ? problem.code : null,
    params: sanitizeParams(problem.params),
  };
}

export async function request<T>(
  filePath: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(filePath, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ApiError(
      "Le serveur est injoignable. Vérifiez que l'application HomeOfficeExpenses est démarrée.",
      null,
      null,
      "NETWORK_ERROR",
    );
  }
  if (!response.ok) {
    const failure = await parseFailure(response);
    throw new ApiError(
      failure.message,
      response.status,
      failure.problem,
      failure.code,
      failure.params,
    );
  }
  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }
  const type = response.headers.get("content-type") ?? "";
  if (type.includes("json")) {
    return (await response.json()) as T;
  }
  return (await response.text()) as T;
}

export interface ResponseBlob {
  blob: Blob;
  fileName: string | null;
}

function nameFromDisposition(disposition: string | null): string | null {
  if (!disposition) {
    return null;
  }
  const starred = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (starred) {
    try {
      return decodeURIComponent(starred[1]);
    } catch {
      return starred[1];
    }
  }
  const simple = /filename="?([^";]+)"?/i.exec(disposition);
  return simple ? simple[1] : null;
}

export async function blobRequest(
  filePath: string,
  init?: RequestInit,
): Promise<ResponseBlob> {
  let response: Response;
  try {
    response = await fetch(filePath, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ApiError(
      "Le serveur est injoignable. Vérifiez que l'application HomeOfficeExpenses est démarrée.",
      null,
      null,
      "NETWORK_ERROR",
    );
  }
  if (!response.ok) {
    const failure = await parseFailure(response);
    throw new ApiError(
      failure.message,
      response.status,
      failure.problem,
      failure.code,
      failure.params,
    );
  }
  return {
    blob: await response.blob(),
    fileName: nameFromDisposition(response.headers.get("content-disposition")),
  };
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code) {
      const key = `api.errors.${error.code}`;
      if (i18n.exists(key)) {
        return i18n.t(key, error.params ?? {});
      }
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return i18n.t("api.errors.UNEXPECTED_ERROR");
}

export function isCancellation(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
