import type { AiConfidence, RentReceiptDto } from "@/api/types";
import type { ExpenseFormValues } from "@/lib/validation";
import type { StatementDraftStore } from "@/state/statementDraft";

/** Minimal query shape the controller needs for the month's rent receipt. */
export interface ExpenseStatementRentReceiptSource {
  data: RentReceiptDto | null | undefined;
  isPending: boolean;
}

/**
 * Optional scoping of the controller. Without options the page keeps a local
 * company selection: a single company is selected automatically, several
 * companies require an explicit choice. A scoped editor (the company lease
 * statement modal) injects its own locked company, lease, non-persisted draft,
 * rent receipt source and rent-receipt action. `initialCompanyId` restores the
 * company of a statement reopened from History.
 */
export interface ExpenseStatementPageOptions {
  companyId?: number;
  initialCompanyId?: number;
  leaseId?: number | null;
  draft?: StatementDraftStore;
  rentReceipt?: ExpenseStatementRentReceiptSource;
  onGoToRentReceipt?: () => void;
}

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
