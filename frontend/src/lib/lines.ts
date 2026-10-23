import type {
  AiConfidence,
  ReceiptDto,
  LineDto,
  LineRequest,
  ExpenseItemDto,
  AmountSource,
} from "@/api/types";
import { parseAmount, parsePercentage } from "./format";

export interface DraftLine {
  key: string;
  itemCode: string;
  amountInclVat: string;
  proRataPct: string;
  receiptId: number | null;
  receiptName: string | null;
  amountSource: AmountSource;
  aiDetectedAmount: string | null;
  aiConfidence: AiConfidence | null;
  detectedSupplier: string | null;
}

export function newKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function fromLineDto(line: LineDto): DraftLine {
  return {
    key: newKey(),
    itemCode: line.itemCode ?? "",
    amountInclVat: line.amountInclVat ?? "",
    proRataPct: line.proRataPct ?? "100",
    receiptId: line.receiptId ?? null,
    receiptName: line.receiptName ?? null,
    amountSource: (line.amountSource as AmountSource) ?? "MANUAL",
    aiDetectedAmount: line.aiDetectedAmount ?? null,
    aiConfidence: (line.aiConfidence as AiConfidence) ?? null,
    detectedSupplier: null,
  };
}

export function toLineRequest(line: DraftLine): LineRequest {
  const amountInclVat = parseAmount(line.amountInclVat);
  const proRataPct = parsePercentage(line.proRataPct);
  if (amountInclVat === null) {
    throw new Error("Le montant TTC est invalide.");
  }
  if (proRataPct === null) {
    throw new Error("Le prorata est invalide.");
  }
  const request: LineRequest = {
    itemCode: line.itemCode,
    amountInclVat,
    proRataPct,
  };
  if (line.receiptId !== null) {
    request.receiptId = line.receiptId;
  }
  request.amountSource = line.amountSource;
  if (line.aiDetectedAmount) {
    request.aiDetectedAmount = line.aiDetectedAmount;
  }
  if (line.aiConfidence) {
    request.aiConfidence = line.aiConfidence;
  }
  return request;
}

export function linesToRequests(lines: DraftLine[]): LineRequest[] {
  return lines.map(toLineRequest);
}

/**
 * Orders draft lines by the configured expense item order (`sortOrder`), matching
 * the backend-authoritative rule so `calculation.lines[index]` still matches the
 * rendered row. The sort is stable: equal `sortOrder` values and repeated lines of
 * the same item keep their current (add) order. A line whose item code is unknown
 * has no configured position and is sorted last, keeping its relative order.
 */
export function orderLinesByExpenseItem(
  lines: DraftLine[],
  expenseItems: ExpenseItemDto[],
): DraftLine[] {
  const sortOrderByCode = new Map<string, number>();
  for (const expenseItem of expenseItems) {
    if (expenseItem.code) {
      sortOrderByCode.set(expenseItem.code, expenseItem.sortOrder ?? 0);
    }
  }
  const rank = (line: DraftLine): number =>
    sortOrderByCode.get(line.itemCode) ?? Number.POSITIVE_INFINITY;
  return [...lines].sort((left, right) => {
    const leftRank = rank(left);
    const rightRank = rank(right);
    if (leftRank === rightRank) {
      return 0;
    }
    return leftRank < rightRank ? -1 : 1;
  });
}

export function typeAlreadyAdded(
  lines: DraftLine[],
  expenseItemCode: string,
): boolean {
  return lines.some((line) => line.itemCode === expenseItemCode);
}

export function missingTypes(
  expenseItems: ExpenseItemDto[],
  lines: DraftLine[],
): string[] {
  const codes = new Set(lines.map((line) => line.itemCode));
  return expenseItems
    .filter(
      (expenseItem) =>
        expenseItem.code &&
        !expenseItem.multipleLinesAllowed &&
        !codes.has(expenseItem.code),
    )
    .map(
      (expenseItem) =>
        expenseItem.label?.toLowerCase() ?? expenseItem.code ?? "",
    )
    .filter(Boolean);
}

export function buildRentLine(amount: string, proRataPct: string): DraftLine {
  return {
    key: newKey(),
    itemCode: "loyer",
    amountInclVat: amount,
    proRataPct,
    receiptId: null,
    receiptName: null,
    amountSource: "MANUAL",
    aiDetectedAmount: null,
    aiConfidence: null,
    detectedSupplier: null,
  };
}

export function receiptName(receipt: ReceiptDto | null): string | null {
  return receipt?.fileName ?? null;
}
