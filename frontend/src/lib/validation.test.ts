import { describe, expect, it } from 'vitest';
import {
  fraisSchema,
  llmSchema,
  parametresSchema,
  posteSchema,
  quittanceSchema,
} from './validation';

const FRAIS_VALIDE = {
  posteCode: 'gaz',
  montantTtc: '120,00',
  prorataPct: '35,71',
  periodeDebut: '2026-09-01',
  periodeFin: '2026-10-31',
  montantMoisSurcharge: '',
};

const PARAMETRES_VALIDES = {
  raisonSociale: 'HKOF',
  formeJuridique: 'EURL',
  siren: '123 456 789',
  societeAdresse: '1 rue de la Paix, 75002 Paris',
  gerant: 'Camille Martin',
  logementAdresse: '12 rue des Lilas, 75011 Paris',
  surfaceTotale: '70,00',
  surfacePro: '25,00',
  bailleurNom: 'Propriétaire',
  bailleurAdresse: '1 avenue du Parc, 75011 Paris',
  locataireNom: 'Locataire',
  locataireAdresse: '12 rue des Lilas, 75011 Paris',
  loyerHc: '900,00',
  provisionCharges: '50,00',
  lieuEmission: 'Paris',
};

describe('fraisSchema', () => {
  it('accepte une saisie complète', () => {
    expect(fraisSchema.safeParse(FRAIS_VALIDE).success).toBe(true);
  });

  it('refuse un montant nul ou un prorata hors bornes', () => {
    expect(fraisSchema.safeParse({ ...FRAIS_VALIDE, montantTtc: '0' }).success).toBe(false);
    expect(fraisSchema.safeParse({ ...FRAIS_VALIDE, prorataPct: '101' }).success).toBe(false);
    expect(fraisSchema.safeParse({ ...FRAIS_VALIDE, prorataPct: '35,711' }).success).toBe(false);
  });

  it('exige une période complète et ordonnée', () => {
    expect(fraisSchema.safeParse({ ...FRAIS_VALIDE, periodeFin: '' }).success).toBe(false);
    expect(
      fraisSchema.safeParse({ ...FRAIS_VALIDE, periodeDebut: '2026-10-31', periodeFin: '2026-10-01' }).success,
    ).toBe(false);
  });
});

describe('quittanceSchema', () => {
  const VALIDE = {
    mois: '2026-10',
    periodeDebut: '2026-10-01',
    periodeFin: '2026-10-31',
    loyerHc: '900,00',
    charges: '50,00',
    datePaiement: '',
    dateEmission: '',
  };

  it('accepte la période du mois et des dates optionnelles vides', () => {
    expect(quittanceSchema.safeParse(VALIDE).success).toBe(true);
  });

  it('refuse une période inversée et un mois invalide', () => {
    expect(quittanceSchema.safeParse({ ...VALIDE, periodeFin: '2026-09-30' }).success).toBe(false);
    expect(quittanceSchema.safeParse({ ...VALIDE, mois: '2026-13' }).success).toBe(false);
  });
});

describe('parametresSchema', () => {
  it('accepte une configuration complète', () => {
    expect(parametresSchema.safeParse(PARAMETRES_VALIDES).success).toBe(true);
  });

  it('refuse une surface professionnelle supérieure à la surface totale', () => {
    const resultat = parametresSchema.safeParse({ ...PARAMETRES_VALIDES, surfacePro: '80' });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(resultat.error.issues.some((issue) => issue.path[0] === 'surfacePro')).toBe(true);
    }
  });

  it('refuse un SIREN mal formé', () => {
    expect(parametresSchema.safeParse({ ...PARAMETRES_VALIDES, siren: '12345' }).success).toBe(false);
  });
});

describe('posteSchema', () => {
  const VALIDE = {
    code: 'gaz',
    libelle: 'Gaz',
    fournisseur: 'EDF',
    prorataPct: '35,71',
    periodicite: 'MENSUELLE' as const,
    ordre: 1,
    actif: true,
    plusieursLignesAutorisees: false,
  };

  it('accepte un code simple', () => {
    expect(posteSchema.safeParse(VALIDE).success).toBe(true);
  });

  it('refuse un code avec espaces ou caractères spéciaux', () => {
    expect(posteSchema.safeParse({ ...VALIDE, code: 'gaz ville' }).success).toBe(false);
    expect(posteSchema.safeParse({ ...VALIDE, code: 'gaz/ville' }).success).toBe(false);
  });
});

describe('llmSchema', () => {
  const VALIDE = {
    actif: true,
    url: 'http://host.docker.internal:11434',
    modele: 'qwen2.5:7b',
    timeoutSeconds: 120,
    temperature: '0',
    numCtx: 8192,
    pagesMax: 5,
    ocrActif: false,
    promptExtraction: 'Tu extrais uniquement le montant TTC du document fourni.',
    cleApi: '',
    supprimerCle: false,
  };

  it('accepte une configuration locale sans clé', () => {
    expect(llmSchema.safeParse(VALIDE).success).toBe(true);
  });

  it('refuse une URL non http(s) et une température hors bornes', () => {
    expect(llmSchema.safeParse({ ...VALIDE, url: 'ftp://serveur' }).success).toBe(false);
    expect(llmSchema.safeParse({ ...VALIDE, temperature: '2,1' }).success).toBe(false);
    expect(llmSchema.safeParse({ ...VALIDE, timeoutSeconds: 2 }).success).toBe(false);
  });
});
