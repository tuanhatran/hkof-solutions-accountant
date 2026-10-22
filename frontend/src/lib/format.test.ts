import { describe, expect, it } from 'vitest';
import {
  formatEUR,
  formatMois,
  montantRetenuEstime,
  parseMontant,
  parsePourcentage,
} from './format';

function espacesNormaux(valeur: string): string {
  return valeur.replace(/[\u00a0\u202f]/g, ' ');
}

describe('parseMontant', () => {
  it('accepte les formats français et anglo-saxons', () => {
    expect(parseMontant('1 234,56')).toBe('1234.56');
    expect(parseMontant('80,5')).toBe('80.50');
    expect(parseMontant('80.50')).toBe('80.50');
    expect(parseMontant('0')).toBe('0.00');
  });

  it('refuse les montants négatifs, vides ou à plus de deux décimales', () => {
    expect(parseMontant('')).toBeNull();
    expect(parseMontant('-12,00')).toBeNull();
    expect(parseMontant('12,345')).toBeNull();
    expect(parseMontant('abc')).toBeNull();
  });
});

describe('parsePourcentage', () => {
  it('retire le symbole, les espaces et convertit la virgule', () => {
    expect(parsePourcentage('35,71 %')).toBe('35.71');
    expect(parsePourcentage('50%')).toBe('50');
    expect(parsePourcentage('100,00')).toBe('100');
    expect(parsePourcentage('0')).toBe('0');
  });

  it('borne le prorata entre 0 et 100', () => {
    expect(parsePourcentage('100,01')).toBeNull();
    expect(parsePourcentage('101')).toBeNull();
    expect(parsePourcentage('-1')).toBeNull();
    expect(parsePourcentage('12,345')).toBeNull();
  });
});

describe('formatage français', () => {
  it('formate les montants en euros avec deux décimales', () => {
    expect(espacesNormaux(formatEUR('1234.5'))).toBe('1 234,50 €');
    expect(espacesNormaux(formatEUR(0))).toBe('0,00 €');
    expect(formatEUR(null)).toBe('—');
  });

  it('formate les mois en français', () => {
    expect(formatMois('2026-10')).toBe('Octobre 2026');
    expect(formatMois('2026-01')).toBe('Janvier 2026');
    expect(formatMois('invalide')).toBe('—');
  });
});

describe('montantRetenuEstime', () => {
  it('applique l’arrondi au centime sans flottant autoritaire', () => {
    expect(espacesNormaux(montantRetenuEstime('120,00', '35,71'))).toBe('42,85 €');
    expect(espacesNormaux(montantRetenuEstime('950,00', '100'))).toBe('950,00 €');
    expect(montantRetenuEstime('', '35,71')).toBe('—');
  });
});
