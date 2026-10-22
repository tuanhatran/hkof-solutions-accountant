import { z } from 'zod';
import { estDateValide, estMoisValide } from './dates';
import { parseMontant, parsePourcentage } from './format';

function montantValide(valeur: string, strictementPositif: boolean): boolean {
  const normalise = parseMontant(valeur);
  if (normalise === null) {
    return false;
  }
  return strictementPositif ? Number(normalise) > 0 : Number(normalise) >= 0;
}

const dateOptionnelle = z
  .string()
  .refine((valeur) => valeur === '' || estDateValide(valeur), 'Date invalide (JJ/MM/AAAA).');

export const fraisSchema = z
  .object({
    posteCode: z.string().min(1, 'Sélectionnez un type de frais.'),
    montantTtc: z
      .string()
      .refine((valeur) => montantValide(valeur, true), 'Saisissez un montant supérieur à 0 (ex. 80,50).'),
    prorataPct: z
      .string()
      .refine((valeur) => parsePourcentage(valeur) !== null, 'Prorata attendu entre 0 et 100 (2 décimales max).'),
    periodeDebut: dateOptionnelle,
    periodeFin: dateOptionnelle,
    montantMoisSurcharge: z
      .string()
      .refine(
        (valeur) => valeur === '' || montantValide(valeur, false),
        'Le montant du mois doit être un montant positif.',
      ),
  })
  .superRefine((valeurs, contexte) => {
    const debutRenseigne = valeurs.periodeDebut !== '';
    const finRenseignee = valeurs.periodeFin !== '';
    if (debutRenseigne !== finRenseignee) {
      contexte.addIssue({
        code: 'custom',
        path: [debutRenseigne ? 'periodeFin' : 'periodeDebut'],
        message: 'Renseignez les deux dates de la période, ou aucune.',
      });
    }
    if (debutRenseigne && finRenseignee && valeurs.periodeDebut > valeurs.periodeFin) {
      contexte.addIssue({
        code: 'custom',
        path: ['periodeFin'],
        message: 'La fin de période doit être postérieure au début.',
      });
    }
  });

export type FraisFormValues = z.infer<typeof fraisSchema>;

export const quittanceSchema = z
  .object({
    mois: z.string().refine(estMoisValide, 'Choisissez un mois valide.'),
    periodeDebut: z.string().refine(estDateValide, 'Date de début invalide.'),
    periodeFin: z.string().refine(estDateValide, 'Date de fin invalide.'),
    loyerHc: z.string().refine((valeur) => montantValide(valeur, false), 'Loyer hors charges invalide.'),
    charges: z.string().refine((valeur) => montantValide(valeur, false), 'Provision pour charges invalide.'),
    datePaiement: dateOptionnelle,
    dateEmission: dateOptionnelle,
  })
  .refine((valeurs) => valeurs.periodeFin >= valeurs.periodeDebut, {
    path: ['periodeFin'],
    message: 'La fin de période doit être postérieure au début.',
  });

export type QuittanceFormValues = z.infer<typeof quittanceSchema>;

export const parametresSchema = z
  .object({
    raisonSociale: z.string().trim().min(1, 'La raison sociale est obligatoire.'),
    formeJuridique: z.string().trim().min(1, 'La forme juridique est obligatoire.'),
    siren: z
      .string()
      .trim()
      .refine(
        (valeur) => valeur === '' || /^\d{3}\s?\d{3}\s?\d{3}$/.test(valeur),
        'Le SIREN doit comporter 9 chiffres.',
      ),
    societeAdresse: z.string().trim().min(1, "L'adresse de la société est obligatoire."),
    gerant: z.string().trim().min(1, 'Le gérant est obligatoire.'),
    logementAdresse: z.string().trim().min(1, "L'adresse du logement est obligatoire."),
    surfaceTotale: z.string().refine((valeur) => montantValide(valeur, true), 'Surface totale invalide.'),
    surfacePro: z.string().refine((valeur) => montantValide(valeur, true), 'Surface professionnelle invalide.'),
    bailleurNom: z.string().trim().min(1, 'Le nom du bailleur est obligatoire.'),
    bailleurAdresse: z.string().trim().min(1, "L'adresse du bailleur est obligatoire."),
    locataireNom: z.string().trim().min(1, 'Le nom du locataire est obligatoire.'),
    locataireAdresse: z.string().trim().min(1, "L'adresse du locataire est obligatoire."),
    loyerHc: z.string().refine((valeur) => montantValide(valeur, true), 'Loyer hors charges invalide.'),
    provisionCharges: z
      .string()
      .refine((valeur) => montantValide(valeur, false), 'Provision pour charges invalide.'),
    lieuEmission: z.string().trim().min(1, "Le lieu d'émission est obligatoire."),
  })
  .refine(
    (valeurs) => {
      const surfacePro = parseMontant(valeurs.surfacePro);
      const surfaceTotale = parseMontant(valeurs.surfaceTotale);
      if (surfacePro === null || surfaceTotale === null) {
        return false;
      }
      return Number(surfacePro) <= Number(surfaceTotale);
    },
    {
      path: ['surfacePro'],
      message: 'La surface professionnelle ne peut pas dépasser la surface totale.',
    },
  );

export type ParametresFormValues = z.infer<typeof parametresSchema>;

export const posteSchema = z.object({
  code: z
    .string()
    .trim()
    .refine(
      (valeur) => valeur === '' || /^[a-zA-Z0-9_-]+$/.test(valeur),
      'Code invalide : lettres, chiffres, tirets et underscores uniquement.',
    ),
  libelle: z.string().trim().min(1, 'Le libellé est obligatoire.'),
  fournisseur: z.string(),
  prorataPct: z
    .string()
    .refine((valeur) => parsePourcentage(valeur) !== null, 'Prorata attendu entre 0 et 100.'),
  periodicite: z.enum(['MENSUELLE', 'BIMESTRIELLE', 'TRIMESTRIELLE', 'ANNUELLE']),
  ordre: z.number().int('Ordre invalide.').min(0, "L'ordre doit être positif."),
  actif: z.boolean(),
  plusieursLignesAutorisees: z.boolean(),
});

export type PosteFormValues = z.infer<typeof posteSchema>;

export const llmSchema = z.object({
  actif: z.boolean(),
  url: z
    .string()
    .trim()
    .refine((valeur) => {
      try {
        const url = new URL(valeur);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    }, 'URL invalide : http:// ou https:// attendu.'),
  modele: z.string().trim().min(1, 'Le nom du modèle est obligatoire.'),
  timeoutSeconds: z
    .number()
    .int('Délai invalide.')
    .min(5, 'Le délai doit être au moins de 5 secondes.')
    .max(600, 'Le délai ne peut pas dépasser 600 secondes.'),
  temperature: z
    .string()
    .refine((valeur) => {
      const nombre = Number(valeur.replace(',', '.'));
      return Number.isFinite(nombre) && nombre >= 0 && nombre <= 2;
    }, 'Température attendue entre 0 et 2.'),
  numCtx: z
    .number()
    .int('Contexte invalide.')
    .min(1024, 'Le contexte doit être au moins de 1 024.')
    .max(131_072, 'Le contexte ne peut pas dépasser 131 072.'),
  pagesMax: z
    .number()
    .int('Nombre de pages invalide.')
    .min(1, 'Au moins une page.')
    .max(20, '20 pages maximum.'),
  ocrActif: z.boolean(),
  promptExtraction: z.string().trim().min(20, "Le prompt d'extraction est trop court."),
  cleApi: z.string(),
  supprimerCle: z.boolean(),
});

export type LlmFormValues = z.infer<typeof llmSchema>;
