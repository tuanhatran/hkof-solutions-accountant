import type {
  AiConfidence,
  ReceiptDto,
  LineDto,
  LineRequest,
  ExpenseItemDto,
  AmountSource,
} from "@/api/types";
import { isValidDate } from "./dates";
import { parseAmount, parsePercentage } from "./format";

export interface DraftLine {
  cle: string;
  posteCode: string;
  montantTtc: string;
  prorataPct: string;
  periodeDebut: string;
  periodeFin: string;
  montantMoisSurcharge: string;
  justificatifId: number | null;
  justificatifNom: string | null;
  sourceMontant: AmountSource;
  montantDetecteIa: string | null;
  confianceIa: AiConfidence | null;
  fournisseurDetecte: string | null;
}

export function newKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `ligne-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function fromLineDto(line: LineDto): DraftLine {
  return {
    cle: newKey(),
    posteCode: line.itemCode ?? "",
    montantTtc: line.amountInclVat ?? "",
    prorataPct: line.proRataPct ?? "100",
    periodeDebut: line.periodStart ?? "",
    periodeFin: line.periodEnd ?? "",
    montantMoisSurcharge: "",
    justificatifId: line.receiptId ?? null,
    justificatifNom: line.receiptName ?? null,
    sourceMontant: (line.amountSource as AmountSource) ?? "MANUAL",
    montantDetecteIa: line.aiDetectedAmount ?? null,
    confianceIa: (line.aiConfidence as AiConfidence) ?? null,
    fournisseurDetecte: null,
  };
}

export function toLineRequest(line: DraftLine): LineRequest {
  const amountInclVat = parseAmount(line.montantTtc);
  const proRataPct = parsePercentage(line.prorataPct);
  if (amountInclVat === null) {
    throw new Error("Le montant TTC est invalide.");
  }
  if (proRataPct === null) {
    throw new Error("Le prorata est invalide.");
  }
  const request: LineRequest = {
    itemCode: line.posteCode,
    amountInclVat,
    proRataPct,
  };
  if (line.periodeDebut && line.periodeFin) {
    if (!isValidDate(line.periodeDebut) || !isValidDate(line.periodeFin)) {
      throw new Error("La période facturée est invalide.");
    }
    request.periodStart = line.periodeDebut;
    request.periodEnd = line.periodeFin;
  }
  if (line.montantMoisSurcharge.trim() !== "") {
    const override = parseAmount(line.montantMoisSurcharge);
    if (override === null) {
      throw new Error("Le montant du mois est invalide.");
    }
    request.monthlyAmountOverride = override;
  }
  if (line.justificatifId !== null) {
    request.receiptId = line.justificatifId;
  }
  request.amountSource = line.sourceMontant;
  if (line.montantDetecteIa) {
    request.aiDetectedAmount = line.montantDetecteIa;
  }
  if (line.confianceIa) {
    request.aiConfidence = line.confianceIa;
  }
  return request;
}

export function linesToRequests(lines: DraftLine[]): LineRequest[] {
  return lines.map(toLineRequest);
}

export function typeAlreadyAdded(
  lines: DraftLine[],
  expenseItemCode: string,
): boolean {
  return lines.some((line) => line.posteCode === expenseItemCode);
}

export function missingTypes(
  expenseItems: ExpenseItemDto[],
  lines: DraftLine[],
): string[] {
  const codes = new Set(lines.map((line) => line.posteCode));
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
    cle: newKey(),
    posteCode: "loyer",
    montantTtc: amount,
    prorataPct: proRataPct,
    periodeDebut: "",
    periodeFin: "",
    montantMoisSurcharge: "",
    justificatifId: null,
    justificatifNom: null,
    sourceMontant: "MANUAL",
    montantDetecteIa: null,
    confianceIa: null,
    fournisseurDetecte: null,
  };
}

export function receiptName(receipt: ReceiptDto | null): string | null {
  return receipt?.fileName ?? null;
}
