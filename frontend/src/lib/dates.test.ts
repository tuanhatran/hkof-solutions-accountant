import { describe, expect, it } from 'vitest';
import {
  dateAujourdhui,
  dureeEnJours,
  estDateValide,
  estMoisValide,
  joursDansMois,
  moisCourant,
  moisDeDate,
  periodeDansLOrdre,
  periodeDuMois,
} from './dates';

describe('mois', () => {
  it('valide le format AAAA-MM', () => {
    expect(estMoisValide('2026-10')).toBe(true);
    expect(estMoisValide('2026-13')).toBe(false);
    expect(estMoisValide('2026-1')).toBe(false);
  });

  it('gère les mois de 28, 29, 30 et 31 jours', () => {
    expect(joursDansMois('2026-02')).toBe(28);
    expect(joursDansMois('2024-02')).toBe(29);
    expect(joursDansMois('2026-04')).toBe(30);
    expect(joursDansMois('2026-12')).toBe(31);
    expect(joursDansMois('2026-99')).toBe(0);
  });

  it('construit la période complète du mois, années bissextiles comprises', () => {
    expect(periodeDuMois('2026-10')).toEqual({ debut: '2026-10-01', fin: '2026-10-31' });
    expect(periodeDuMois('2024-02')).toEqual({ debut: '2024-02-01', fin: '2024-02-29' });
    expect(periodeDuMois('2026-02')).toEqual({ debut: '2026-02-01', fin: '2026-02-28' });
  });

  it('calcule le mois courant sans décalage de fuseau', () => {
    expect(moisCourant(new Date(2026, 9, 22))).toBe('2026-10');
    expect(dateAujourdhui(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(moisDeDate('2026-10-22')).toBe('2026-10');
  });
});

describe('dates', () => {
  it('rejette les dates inexistantes', () => {
    expect(estDateValide('2026-10-22')).toBe(true);
    expect(estDateValide('2026-02-29')).toBe(false);
    expect(estDateValide('2024-02-29')).toBe(true);
    expect(estDateValide('2026-13-01')).toBe(false);
    expect(estDateValide('22/10/2026')).toBe(false);
  });

  it('vérifie l’ordre de la période', () => {
    expect(periodeDansLOrdre('2026-10-01', '2026-10-31')).toBe(true);
    expect(periodeDansLOrdre('2026-10-31', '2026-10-01')).toBe(false);
  });

  it('compte les jours inclusivement', () => {
    expect(dureeEnJours('2026-10-01', '2026-10-31')).toBe(31);
    expect(dureeEnJours('2026-09-01', '2026-10-31')).toBe(61);
    expect(dureeEnJours('2026-10-31', '2026-10-01')).toBe(0);
  });
});
