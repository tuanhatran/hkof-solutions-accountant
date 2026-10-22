import { describe, expect, it } from 'vitest';
import { estimateAllocation } from './allocation';

function normalizeSpaces(value: string): string {
  return value.replace(/[\u00a0\u202f]/g, ' ');
}

describe('estimateAllocation', () => {
  it('allocates a bimonthly expense to the current month', () => {
    const estimate = estimateAllocation('120,00', '35,71', '2026-09-01', '2026-10-31', '2026-10');
    expect(estimate).not.toBeNull();
    expect(estimate?.joursTotal).toBe(61);
    expect(estimate?.joursMois).toBe(31);
    expect(normalizeSpaces(estimate?.montantMois ?? '')).toBe('60,98 €');
    expect(normalizeSpaces(estimate?.montantRetenu ?? '')).toBe('21,78 €');
  });

  it('returns the full amount for a period within the month', () => {
    const estimate = estimateAllocation('42,00', '35,71', '2026-10-01', '2026-10-31', '2026-10');
    expect(estimate?.joursMois).toBe(31);
    expect(normalizeSpaces(estimate?.montantMois ?? '')).toBe('42,00 €');
  });

  it('returns null when the period does not overlap the month', () => {
    const estimate = estimateAllocation('120,00', '35,71', '2026-08-01', '2026-09-30', '2026-10');
    expect(estimate?.joursMois).toBe(0);
    expect(normalizeSpaces(estimate?.montantMois ?? '')).toBe('0,00 €');
  });

  it('rejects incomplete or invalid data', () => {
    expect(estimateAllocation('120,00', '35,71', '', '', '2026-10')).toBeNull();
    expect(estimateAllocation('abc', '35,71', '2026-09-01', '2026-10-31', '2026-10')).toBeNull();
    expect(estimateAllocation('120,00', '35,71', '2026-10-31', '2026-10-01', '2026-10')).toBeNull();
  });
});
