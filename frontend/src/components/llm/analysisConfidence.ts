import type { AiConfidence } from "@/api/types";
import i18n from "@/i18n";

export function confidenceValid(
  value: string | null | undefined,
): AiConfidence | null {
  return value === "haute" || value === "moyenne" || value === "basse"
    ? value
    : null;
}

export function confidenceLabel(
  confidence: AiConfidence | null,
): string | null {
  if (
    confidence === "haute" ||
    confidence === "moyenne" ||
    confidence === "basse"
  ) {
    return i18n.t(`expenseStatement.confidence.${confidence}`);
  }
  return null;
}
