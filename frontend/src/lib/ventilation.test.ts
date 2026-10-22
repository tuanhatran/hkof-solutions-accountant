import { describe, expect, it } from 'vitest';
import { estimerVentilation } from './ventilation';

function espacesNormaux(valeur: string): string {
  return valeur.replace(/[\u00a0\u202f]/g, ' ');
}

describe('estimerVentilation', () => {
  it('ventile un frais bimestriel sur le mois courant', () => {
    const estimation = estimerVentilation('120,00', '35,71', '2026-09-01', '2026-10-31', '2026-10');
    expect(estimation).not.toBeNull();
    expect(estimation?.joursTotal).toBe(61);
    expect(estimation?.joursMois).toBe(31);
    expect(espacesNormaux(estimation?.montantMois ?? '')).toBe('60,98 €');
    expect(espacesNormaux(estimation?.montantRetenu ?? '')).toBe('21,78 €');
  });

  it('retourne le montant entier pour une période contenue dans le mois', () => {
    const estimation = estimerVentilation('42,00', '35,71', '2026-10-01', '2026-10-31', '2026-10');
    expect(estimation?.joursMois).toBe(31);
    expect(espacesNormaux(estimation?.montantMois ?? '')).toBe('42,00 €');
  });

  it('retourne null si la période ne chevauche pas le mois', () => {
    const estimation = estimerVentilation('120,00', '35,71', '2026-08-01', '2026-09-30', '2026-10');
    expect(estimation?.joursMois).toBe(0);
    expect(espacesNormaux(estimation?.montantMois ?? '')).toBe('0,00 €');
  });

  it('refuse les données incomplètes ou invalides', () => {
    expect(estimerVentilation('120,00', '35,71', '', '', '2026-10')).toBeNull();
    expect(estimerVentilation('abc', '35,71', '2026-09-01', '2026-10-31', '2026-10')).toBeNull();
    expect(estimerVentilation('120,00', '35,71', '2026-10-31', '2026-10-01', '2026-10')).toBeNull();
  });
});
