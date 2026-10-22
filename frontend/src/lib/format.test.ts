import { describe, expect, it } from 'vitest';
import {
  formatEUR,
  formatMonth,
  estimatedRetainedAmount,
  parseAmount,
  parsePercentage,
} from './format';

function normalizeSpaces(value: string): string {
  return value.replace(/[\u00a0\u202f]/g, ' ');
}

describe('parseAmount', () => {
  it('accepts French and English number formats', () => {
    expect(parseAmount('1 234,56')).toBe('1234.56');
    expect(parseAmount('80,5')).toBe('80.50');
    expect(parseAmount('80.50')).toBe('80.50');
    expect(parseAmount('0')).toBe('0.00');
  });

  it('rejects negative, empty or over two-decimal amounts', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('-12,00')).toBeNull();
    expect(parseAmount('12,345')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });
});

describe('parsePercentage', () => {
  it('strips the symbol and spaces and converts the comma', () => {
    expect(parsePercentage('35,71 %')).toBe('35.71');
    expect(parsePercentage('50%')).toBe('50');
    expect(parsePercentage('100,00')).toBe('100');
    expect(parsePercentage('0')).toBe('0');
  });

  it('clamps the pro-rata between 0 and 100', () => {
    expect(parsePercentage('100,01')).toBeNull();
    expect(parsePercentage('101')).toBeNull();
    expect(parsePercentage('-1')).toBeNull();
    expect(parsePercentage('12,345')).toBeNull();
  });
});

describe('French formatting', () => {
  it('formats amounts in euros with two decimals', () => {
    expect(normalizeSpaces(formatEUR('1234.5'))).toBe('1 234,50 €');
    expect(normalizeSpaces(formatEUR(0))).toBe('0,00 €');
    expect(formatEUR(null)).toBe('—');
  });

  it('formats months in French', () => {
    expect(formatMonth('2026-10')).toBe('Octobre 2026');
    expect(formatMonth('2026-01')).toBe('Janvier 2026');
    expect(formatMonth('invalide')).toBe('—');
  });
});

describe('estimatedRetainedAmount', () => {
  it('applies cent rounding without authoritative floating point', () => {
    expect(normalizeSpaces(estimatedRetainedAmount('120,00', '35,71'))).toBe('42,85 €');
    expect(normalizeSpaces(estimatedRetainedAmount('950,00', '100'))).toBe('950,00 €');
    expect(estimatedRetainedAmount('', '35,71')).toBe('—');
  });
});
