import { describe, expect, it } from 'vitest';
import {
  expenseSchema,
  llmSchema,
  settingsSchema,
  expenseItemSchema,
  rentReceiptSchema,
} from './validation';

const VALID_EXPENSE = {
  posteCode: 'gaz',
  montantTtc: '120,00',
  prorataPct: '35,71',
  periodeDebut: '2026-09-01',
  periodeFin: '2026-10-31',
  montantMoisSurcharge: '',
};

const VALID_SETTINGS = {
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

describe('expenseSchema', () => {
  it('accepts a complete entry', () => {
    expect(expenseSchema.safeParse(VALID_EXPENSE).success).toBe(true);
  });

  it('rejects a zero amount or an out-of-range pro-rata', () => {
    expect(expenseSchema.safeParse({ ...VALID_EXPENSE, montantTtc: '0' }).success).toBe(false);
    expect(expenseSchema.safeParse({ ...VALID_EXPENSE, prorataPct: '101' }).success).toBe(false);
    expect(expenseSchema.safeParse({ ...VALID_EXPENSE, prorataPct: '35,711' }).success).toBe(false);
  });

  it('requires a complete and ordered period', () => {
    expect(expenseSchema.safeParse({ ...VALID_EXPENSE, periodeFin: '' }).success).toBe(false);
    expect(
      expenseSchema.safeParse({ ...VALID_EXPENSE, periodeDebut: '2026-10-31', periodeFin: '2026-10-01' }).success,
    ).toBe(false);
  });
});

describe('rentReceiptSchema', () => {
  const VALID = {
    mois: '2026-10',
    periodeDebut: '2026-10-01',
    periodeFin: '2026-10-31',
    loyerHc: '900,00',
    charges: '50,00',
    datePaiement: '',
    dateEmission: '',
  };

  it('accepts the month period and empty optional dates', () => {
    expect(rentReceiptSchema.safeParse(VALID).success).toBe(true);
  });

  it('rejects a reversed period and an invalid month', () => {
    expect(rentReceiptSchema.safeParse({ ...VALID, periodeFin: '2026-09-30' }).success).toBe(false);
    expect(rentReceiptSchema.safeParse({ ...VALID, mois: '2026-13' }).success).toBe(false);
  });
});

describe('settingsSchema', () => {
  it('accepts a complete configuration', () => {
    expect(settingsSchema.safeParse(VALID_SETTINGS).success).toBe(true);
  });

  it('rejects a professional area larger than the total area', () => {
    const result = settingsSchema.safeParse({ ...VALID_SETTINGS, surfacePro: '80' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'surfacePro')).toBe(true);
    }
  });

  it('rejects a malformed SIREN', () => {
    expect(settingsSchema.safeParse({ ...VALID_SETTINGS, siren: '12345' }).success).toBe(false);
  });
});

describe('expenseItemSchema', () => {
  const VALID = {
    code: 'gaz',
    libelle: 'Gaz',
    fournisseur: 'EDF',
    prorataPct: '35,71',
    periodicite: 'MENSUELLE' as const,
    ordre: 1,
    actif: true,
    plusieursLignesAutorisees: false,
  };

  it('accepts a simple code', () => {
    expect(expenseItemSchema.safeParse(VALID).success).toBe(true);
  });

  it('rejects a code with spaces or special characters', () => {
    expect(expenseItemSchema.safeParse({ ...VALID, code: 'gaz ville' }).success).toBe(false);
    expect(expenseItemSchema.safeParse({ ...VALID, code: 'gaz/ville' }).success).toBe(false);
  });
});

describe('llmSchema', () => {
  const VALID = {
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

  it('accepts a local configuration without key', () => {
    expect(llmSchema.safeParse(VALID).success).toBe(true);
  });

  it('rejects a non-http(s) URL and an out-of-range temperature', () => {
    expect(llmSchema.safeParse({ ...VALID, url: 'ftp://serveur' }).success).toBe(false);
    expect(llmSchema.safeParse({ ...VALID, temperature: '2,1' }).success).toBe(false);
    expect(llmSchema.safeParse({ ...VALID, timeoutSeconds: 2 }).success).toBe(false);
  });
});
