import type {
  AiConfidence,
  ReceiptDto,
  LineDto,
  LineRequest,
  ExpenseItemDto,
  SourceMontant,
} from '@/api/types';
import { isValidDate } from './dates';
import { parseAmount, parsePercentage } from './format';

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
  sourceMontant: SourceMontant;
  montantDetecteIa: string | null;
  confianceIa: AiConfidence | null;
  fournisseurDetecte: string | null;
}

export function newKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ligne-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function fromLineDto(line: LineDto): DraftLine {
  return {
    cle: newKey(),
    posteCode: line.posteCode ?? '',
    montantTtc: line.montantTtc ?? '',
    prorataPct: line.prorataPct ?? '100',
    periodeDebut: line.periodeDebut ?? '',
    periodeFin: line.periodeFin ?? '',
    montantMoisSurcharge: '',
    justificatifId: line.justificatifId ?? null,
    justificatifNom: line.justificatifNom ?? null,
    sourceMontant: (line.sourceMontant as SourceMontant) ?? 'MANUAL',
    montantDetecteIa: line.montantDetecteIa ?? null,
    confianceIa: (line.confianceIa as AiConfidence) ?? null,
    fournisseurDetecte: null,
  };
}

export function toLineRequest(line: DraftLine): LineRequest {
  const amountInclVat = parseAmount(line.montantTtc);
  const proRataPct = parsePercentage(line.prorataPct);
  if (amountInclVat === null) {
    throw new Error('Le montant TTC est invalide.');
  }
  if (proRataPct === null) {
    throw new Error('Le prorata est invalide.');
  }
  const request: LineRequest = {
    posteCode: line.posteCode,
    montantTtc: amountInclVat,
    prorataPct: proRataPct,
  };
  if (line.periodeDebut && line.periodeFin) {
    if (!isValidDate(line.periodeDebut) || !isValidDate(line.periodeFin)) {
      throw new Error('La période facturée est invalide.');
    }
    request.periodeDebut = line.periodeDebut;
    request.periodeFin = line.periodeFin;
  }
  if (line.montantMoisSurcharge.trim() !== '') {
    const override = parseAmount(line.montantMoisSurcharge);
    if (override === null) {
      throw new Error('Le montant du mois est invalide.');
    }
    request.montantMoisSurcharge = override;
  }
  if (line.justificatifId !== null) {
    request.justificatifId = line.justificatifId;
  }
  request.sourceMontant = line.sourceMontant;
  if (line.montantDetecteIa) {
    request.montantDetecteIa = line.montantDetecteIa;
  }
  if (line.confianceIa) {
    request.confianceIa = line.confianceIa;
  }
  return request;
}

export function linesToRequests(lines: DraftLine[]): LineRequest[] {
  return lines.map(toLineRequest);
}

export function typeAlreadyAdded(lines: DraftLine[], expenseItemCode: string): boolean {
  return lines.some((line) => line.posteCode === expenseItemCode);
}

export function missingTypes(expenseItems: ExpenseItemDto[], lines: DraftLine[]): string[] {
  const codes = new Set(lines.map((line) => line.posteCode));
  return expenseItems
    .filter((expenseItem) => expenseItem.code && !expenseItem.plusieursLignesAutorisees && !codes.has(expenseItem.code))
    .map((expenseItem) => expenseItem.libelle?.toLowerCase() ?? expenseItem.code ?? '')
    .filter(Boolean);
}

export function buildRentLine(amount: string, proRataPct: string): DraftLine {
  return {
    cle: newKey(),
    posteCode: 'loyer',
    montantTtc: amount,
    prorataPct: proRataPct,
    periodeDebut: '',
    periodeFin: '',
    montantMoisSurcharge: '',
    justificatifId: null,
    justificatifNom: null,
    sourceMontant: 'MANUAL',
    montantDetecteIa: null,
    confianceIa: null,
    fournisseurDetecte: null,
  };
}

export function receiptName(receipt: ReceiptDto | null): string | null {
  return receipt?.nomFichier ?? null;
}
