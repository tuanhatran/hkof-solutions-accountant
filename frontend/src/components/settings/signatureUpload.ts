import type { Accept } from "react-dropzone";

export const SIGNATURE_FORMATS: Accept = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
};

export const MAX_SIGNATURE_SIZE = 2 * 1024 * 1024;

/** Client-side guard: the backend re-validates magic bytes and size. */
export function signatureImageError(candidate: File): string | null {
  if (candidate.type !== "image/png" && candidate.type !== "image/jpeg") {
    return "Format non accepté. Formats : PNG, JPEG.";
  }
  if (candidate.size > MAX_SIGNATURE_SIZE) {
    return "Fichier trop volumineux (2 Mo maximum).";
  }
  return null;
}
