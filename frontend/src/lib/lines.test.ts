import { describe, expect, it } from 'vitest';
import type { ExpenseItemDto } from '@/api/types';
import {
  buildRentLine,
  fromLineDto,
  typeAlreadyAdded,
  missingTypes,
  toLineRequest,
  type DraftLine,
} from './lines';

function line(partial: Partial<DraftLine> = {}): DraftLine {
  return {
    cle: 'ligne-1',
    posteCode: 'gaz',
    montantTtc: '120,00',
    prorataPct: '35,71',
    periodeDebut: '2026-09-01',
    periodeFin: '2026-10-31',
    montantMoisSurcharge: '',
    justificatifId: 12,
    justificatifNom: 'facture.pdf',
    sourceMontant: 'MANUAL',
    montantDetecteIa: null,
    confianceIa: null,
    fournisseurDetecte: null,
    ...partial,
  };
}

describe('toLineRequest', () => {
  it('normalizes amounts and keeps metadata', () => {
    const request = toLineRequest(line({ sourceMontant: 'AI', montantDetecteIa: '120.00', confianceIa: 'haute' }));
    expect(request).toMatchObject({
      itemCode: 'gaz',
      amountInclVat: '120.00',
      proRataPct: '35.71',
      periodStart: '2026-09-01',
      periodEnd: '2026-10-31',
      receiptId: 12,
      amountSource: 'AI',
      aiDetectedAmount: '120.00',
      aiConfidence: 'haute',
    });
  });

  it('omits unfilled optional fields', () => {
    const request = toLineRequest(
      line({ periodeDebut: '', periodeFin: '', justificatifId: null, montantMoisSurcharge: '' }),
    );
    expect(request.periodStart).toBeUndefined();
    expect(request.periodEnd).toBeUndefined();
    expect(request.receiptId).toBeUndefined();
    expect(request.monthlyAmountOverride).toBeUndefined();
  });

  it('adds the month override when provided', () => {
    const request = toLineRequest(line({ montantMoisSurcharge: '60,98' }));
    expect(request.monthlyAmountOverride).toBe('60.98');
  });

  it('rejects invalid amounts, pro-rata values and periods', () => {
    expect(() => toLineRequest(line({ montantTtc: '0' }))).not.toThrow();
    expect(() => toLineRequest(line({ montantTtc: 'abc' }))).toThrow('Le montant TTC est invalide.');
    expect(() => toLineRequest(line({ prorataPct: '150' }))).toThrow('Le prorata est invalide.');
    expect(() => toLineRequest(line({ periodeDebut: '2026-02-30' }))).toThrow('La période facturée est invalide.');
  });
});

describe('expense type rules', () => {
  const expenseItems: ExpenseItemDto[] = [
    { code: 'gaz', label: 'Gaz', multipleLinesAllowed: false },
    { code: 'telephone', label: 'Téléphone', multipleLinesAllowed: true },
  ];

  it('detects an already present type', () => {
    expect(typeAlreadyAdded([line()], 'gaz')).toBe(true);
    expect(typeAlreadyAdded([line()], 'fibre')).toBe(false);
  });

  it('lists only missing non-multi-line types', () => {
    expect(missingTypes(expenseItems, [line()])).toEqual([]);
    expect(missingTypes(expenseItems, [])).toEqual(['gaz']);
  });
});

describe('rent draft', () => {
  it('creates a line without receipt and with a pro-rata', () => {
    const rent = buildRentLine('950,00', '100');
    expect(rent.posteCode).toBe('loyer');
    expect(rent.montantTtc).toBe('950,00');
    expect(rent.prorataPct).toBe('100');
    expect(rent.justificatifId).toBeNull();
    expect(rent.cle).not.toHaveLength(0);
  });

  it('reloads a line from a DTO', () => {
    const reloaded = fromLineDto({
      itemCode: 'gaz',
      amountInclVat: '120.00',
      proRataPct: '35.71',
      periodStart: '2026-09-01',
      periodEnd: '2026-10-31',
      receiptId: 4,
      receiptName: 'facture.pdf',
      amountSource: 'AI',
      aiDetectedAmount: '120.00',
      aiConfidence: 'haute',
    });
    expect(reloaded.posteCode).toBe('gaz');
    expect(reloaded.justificatifNom).toBe('facture.pdf');
    expect(reloaded.sourceMontant).toBe('AI');
    expect(reloaded.cle).not.toHaveLength(0);
  });
});
