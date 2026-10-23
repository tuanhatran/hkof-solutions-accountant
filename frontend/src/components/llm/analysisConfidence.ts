import type { AiConfidence } from "@/api/types";

export function confidenceValid(
  value: string | null | undefined,
): AiConfidence | null {
  return value === "haute" || value === "moyenne" || value === "basse"
    ? value
    : null;
}

export function confidenceLabel(confidence: AiConfidence | null): string | null {
  if (confidence === "haute") {
    return "Confiance élevée";
  }
  if (confidence === "moyenne") {
    return "Confiance moyenne";
  }
  if (confidence === "basse") {
    return "Confiance faible — vérifiez les valeurs";
  }
  return null;
}
