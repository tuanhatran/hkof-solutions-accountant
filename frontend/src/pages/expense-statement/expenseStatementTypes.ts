import type { AiConfidence } from "@/api/types";
import type { ExpenseFormValues } from "@/lib/validation";

export interface AttachedFile {
  id: number;
  name: string;
  size: number | null;
  mimeType: string | null;
}

export interface AiState {
  type: boolean;
  amount: boolean;
  amountConfirmed: boolean;
  detectedAmount: string | null;
  supplier: string | null;
  sourceExtract: string | null;
  confidence: AiConfidence | null;
}

export const AI_EMPTY: AiState = {
  type: false,
  amount: false,
  amountConfirmed: false,
  detectedAmount: null,
  supplier: null,
  sourceExtract: null,
  confidence: null,
};

export const INITIAL_VALUES: ExpenseFormValues = {
  itemCode: "",
  amountInclVat: "",
  proRataPct: "100",
};
