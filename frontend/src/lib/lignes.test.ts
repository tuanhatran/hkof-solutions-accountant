import { describe, expect, it } from 'vitest';
import type { PosteDto } from '@/api/types';
import {
  construireLigneLoyer,
  depuisLigneDto,
  typeDejaAjoute,
  typesManquants,
  versLigneRequest,
  type LigneBrouillon,
} from './lignes';

function ligne(partiel: Partial<LigneBrouillon> = {}): LigneBrouillon {
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
    sourceMontant: 'MANUEL',
    montantDetecteIa: null,
    confianceIa: null,
    fournisseurDetecte: null,
    ...partiel,
  };
}

describe('versLigneRequest', () => {
  it('normalise les montants et conserve les métadonnées', () => {
    const requete = versLigneRequest(ligne({ sourceMontant: 'IA', montantDetecteIa: '120.00', confianceIa: 'haute' }));
    expect(requete).toMatchObject({
      posteCode: 'gaz',
      montantTtc: '120.00',
      prorataPct: '35.71',
      periodeDebut: '2026-09-01',
      periodeFin: '2026-10-31',
      justificatifId: 12,
      sourceMontant: 'IA',
      montantDetecteIa: '120.00',
      confianceIa: 'haute',
    });
  });

  it('omet les champs facultatifs non renseignés', () => {
    const requete = versLigneRequest(
      ligne({ periodeDebut: '', periodeFin: '', justificatifId: null, montantMoisSurcharge: '' }),
    );
    expect(requete.periodeDebut).toBeUndefined();
    expect(requete.periodeFin).toBeUndefined();
    expect(requete.justificatifId).toBeUndefined();
    expect(requete.montantMoisSurcharge).toBeUndefined();
  });

  it('ajoute la surcharge du mois quand elle est fournie', () => {
    const requete = versLigneRequest(ligne({ montantMoisSurcharge: '60,98' }));
    expect(requete.montantMoisSurcharge).toBe('60.98');
  });

  it('refuse les montants, proratas et périodes invalides', () => {
    expect(() => versLigneRequest(ligne({ montantTtc: '0' }))).not.toThrow();
    expect(() => versLigneRequest(ligne({ montantTtc: 'abc' }))).toThrow('Le montant TTC est invalide.');
    expect(() => versLigneRequest(ligne({ prorataPct: '150' }))).toThrow('Le prorata est invalide.');
    expect(() => versLigneRequest(ligne({ periodeDebut: '2026-02-30' }))).toThrow('La période facturée est invalide.');
  });
});

describe('règles de types', () => {
  const postes: PosteDto[] = [
    { code: 'gaz', libelle: 'Gaz', plusieursLignesAutorisees: false },
    { code: 'telephone', libelle: 'Téléphone', plusieursLignesAutorisees: true },
  ];

  it('détecte un type déjà présent', () => {
    expect(typeDejaAjoute([ligne()], 'gaz')).toBe(true);
    expect(typeDejaAjoute([ligne()], 'fibre')).toBe(false);
  });

  it('liste uniquement les types manquants non multi-lignes', () => {
    expect(typesManquants(postes, [ligne()])).toEqual([]);
    expect(typesManquants(postes, [])).toEqual(['gaz']);
  });
});

describe('brouillon de loyer', () => {
  it('crée une ligne sans justificatif et avec un prorata', () => {
    const loyer = construireLigneLoyer('950,00', '100');
    expect(loyer.posteCode).toBe('loyer');
    expect(loyer.montantTtc).toBe('950,00');
    expect(loyer.prorataPct).toBe('100');
    expect(loyer.justificatifId).toBeNull();
    expect(loyer.cle).not.toHaveLength(0);
  });

  it('recharge une ligne depuis un DTO', () => {
    const rechargee = depuisLigneDto({
      posteCode: 'gaz',
      montantTtc: '120.00',
      prorataPct: '35.71',
      periodeDebut: '2026-09-01',
      periodeFin: '2026-10-31',
      justificatifId: 4,
      justificatifNom: 'facture.pdf',
      sourceMontant: 'IA',
      montantDetecteIa: '120.00',
      confianceIa: 'haute',
    });
    expect(rechargee.posteCode).toBe('gaz');
    expect(rechargee.justificatifNom).toBe('facture.pdf');
    expect(rechargee.sourceMontant).toBe('IA');
    expect(rechargee.cle).not.toHaveLength(0);
  });
});
