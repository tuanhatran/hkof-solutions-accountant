export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
}

export class ApiError extends Error {
  readonly status: number | null;
  readonly problem: ProblemDetail | null;

  constructor(
    message: string,
    status: number | null = null,
    problem: ProblemDetail | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
  }
}

async function messageFromResponse(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (!text) {
      return `Erreur ${response.status} : la requête a échoué.`;
    }
    const type = response.headers.get("content-type") ?? "";
    if (type.includes("json")) {
      const requestBody = JSON.parse(text) as ProblemDetail;
      return (
        requestBody.detail || requestBody.title || `Erreur ${response.status}.`
      );
    }
    return text;
  } catch {
    return `Erreur ${response.status} : la requête a échoué.`;
  }
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
    );
  }
  if (!response.ok) {
    const message = await messageFromResponse(response);
    let problem: ProblemDetail | null = null;
    try {
      const text = await response.clone().text();
      problem = text ? (JSON.parse(text) as ProblemDetail) : null;
    } catch {
      problem = null;
    }
    throw new ApiError(message, response.status, problem);
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
    );
  }
  if (!response.ok) {
    throw new ApiError(await messageFromResponse(response), response.status);
  }
  return {
    blob: await response.blob(),
    fileName: nameFromDisposition(
      response.headers.get("content-disposition"),
    ),
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
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Une erreur inattendue est survenue.";
}

export function isCancellation(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
