import type { Accept } from "react-dropzone";
import type { SignatureType } from "@/api/types";

export const SIGNATURE_TYPES: ReadonlyArray<{
  value: SignatureType;
  label: string;
}> = [
  { value: "LANDLORD", label: "Bailleur" },
  { value: "ENTREPRISE_CEO", label: "Gérant d'entreprise" },
];

export function signatureTypeLabel(type: SignatureType | undefined): string {
  return (
    SIGNATURE_TYPES.find((candidate) => candidate.value === type)?.label ??
    "Signature"
  );
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
