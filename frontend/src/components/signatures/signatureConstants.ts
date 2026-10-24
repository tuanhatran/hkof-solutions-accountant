import type { Accept } from "react-dropzone";
import type { SignatureType } from "@/api/types";

/** Signature types accepted by the upload form; legacy gérant signatures stay readable. */
export const SIGNATURE_UPLOAD_TYPES: ReadonlyArray<{
  value: SignatureType;
  label: string;
}> = [
  { value: "LANDLORD", label: "Bailleur" },
  { value: "EMPLOYEE", label: "Salarié" },
];

export function signatureTypeLabel(type: SignatureType | undefined): string {
  if (type === "LANDLORD") {
    return "Bailleur";
  }
  if (type === "ENTREPRISE_CEO") {
    return "Gérant d'entreprise";
  }
  if (type === "EMPLOYEE") {
    return "Salarié";
  }
  return "Signature";
}

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
