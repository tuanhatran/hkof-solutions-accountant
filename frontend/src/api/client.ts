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

  constructor(message: string, status: number | null = null, problem: ProblemDetail | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }
}

async function messageDepuisReponse(response: Response): Promise<string> {
  try {
    const texte = await response.text();
    if (!texte) {
      return `Erreur ${response.status} : la requête a échoué.`;
    }
    const type = response.headers.get('content-type') ?? '';
    if (type.includes('json')) {
      const corps = JSON.parse(texte) as ProblemDetail;
      return corps.detail || corps.title || `Erreur ${response.status}.`;
    }
    return texte;
  } catch {
    return `Erreur ${response.status} : la requête a échoué.`;
  }
}

export async function requete<T>(chemin: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(chemin, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError(
      "Le serveur est injoignable. Vérifiez que l'application HomeOfficeExpenses est démarrée.",
      null,
    );
  }
  if (!response.ok) {
    const message = await messageDepuisReponse(response);
    let problem: ProblemDetail | null = null;
    try {
      const texte = await response.clone().text();
      problem = texte ? (JSON.parse(texte) as ProblemDetail) : null;
    } catch {
      problem = null;
    }
    throw new ApiError(message, response.status, problem);
  }
  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }
  const type = response.headers.get('content-type') ?? '';
  if (type.includes('json')) {
    return (await response.json()) as T;
  }
  return (await response.text()) as T;
}

export interface ReponseBlob {
  blob: Blob;
  nomFichier: string | null;
}

function nomDepuisDisposition(disposition: string | null): string | null {
  if (!disposition) {
    return null;
  }
  const etoile = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (etoile) {
    try {
      return decodeURIComponent(etoile[1]);
    } catch {
      return etoile[1];
    }
  }
  const simple = /filename="?([^";]+)"?/i.exec(disposition);
  return simple ? simple[1] : null;
}

export async function requeteBlob(chemin: string, init?: RequestInit): Promise<ReponseBlob> {
  let response: Response;
  try {
    response = await fetch(chemin, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError(
      "Le serveur est injoignable. Vérifiez que l'application HomeOfficeExpenses est démarrée.",
      null,
    );
  }
  if (!response.ok) {
    throw new ApiError(await messageDepuisReponse(response), response.status);
  }
  return {
    blob: await response.blob(),
    nomFichier: nomDepuisDisposition(response.headers.get('content-disposition')),
  };
}

export function telechargerBlob(blob: Blob, nomFichier: string): void {
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function messageErreur(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Une erreur inattendue est survenue.';
}

export function estAnnulation(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
