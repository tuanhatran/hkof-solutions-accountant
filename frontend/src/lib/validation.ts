import { z } from "zod";
import { isValidDate, isValidMonth } from "./dates";
import { parseAmount, parsePercentage } from "./format";

function isValidAmount(value: string, strictlyPositive: boolean): boolean {
  const normalized = parseAmount(value);
  if (normalized === null) {
    return false;
  }
  return strictlyPositive ? Number(normalized) > 0 : Number(normalized) >= 0;
}

const optionalDate = z
  .string()
  .refine(
    (value) => value === "" || isValidDate(value),
    "Date invalide (JJ/MM/AAAA).",
  );

export const expenseSchema = z
  .object({
    posteCode: z.string().min(1, "Sélectionnez un type de frais."),
    montantTtc: z
      .string()
      .refine(
        (value) => isValidAmount(value, true),
        "Saisissez un montant supérieur à 0 (ex. 80,50).",
      ),
    prorataPct: z
      .string()
      .refine(
        (value) => parsePercentage(value) !== null,
        "Prorata attendu entre 0 et 100 (2 décimales max).",
      ),
    periodeDebut: optionalDate,
    periodeFin: optionalDate,
    montantMoisSurcharge: z
      .string()
      .refine(
        (value) => value === "" || isValidAmount(value, false),
        "Le montant du mois doit être un montant positif.",
      ),
  })
  .superRefine((values, context) => {
    const filledStart = values.periodeDebut !== "";
    const filledEnd = values.periodeFin !== "";
    if (filledStart !== filledEnd) {
      context.addIssue({
        code: "custom",
        path: [filledStart ? "periodeFin" : "periodeDebut"],
        message: "Renseignez les deux dates de la période, ou aucune.",
      });
    }
    if (filledStart && filledEnd && values.periodeDebut > values.periodeFin) {
      context.addIssue({
        code: "custom",
        path: ["periodeFin"],
        message: "La fin de période doit être postérieure au début.",
      });
    }
  });

export type ExpenseFormValues = z.infer<typeof expenseSchema>;

export const rentReceiptSchema = z
  .object({
    mois: z.string().refine(isValidMonth, "Choisissez un mois valide."),
    periodeDebut: z.string().refine(isValidDate, "Date de début invalide."),
    periodeFin: z.string().refine(isValidDate, "Date de fin invalide."),
    loyerHc: z
      .string()
      .refine(
        (value) => isValidAmount(value, false),
        "Loyer hors charges invalide.",
      ),
    charges: z
      .string()
      .refine(
        (value) => isValidAmount(value, false),
        "Provision pour charges invalide.",
      ),
    datePaiement: optionalDate,
    dateEmission: optionalDate,
  })
  .refine((values) => values.periodeFin >= values.periodeDebut, {
    path: ["periodeFin"],
    message: "La fin de période doit être postérieure au début.",
  });

export type RentReceiptFormValues = z.infer<typeof rentReceiptSchema>;

export const settingsSchema = z
  .object({
    raisonSociale: z
      .string()
      .trim()
      .min(1, "La raison sociale est obligatoire."),
    formeJuridique: z
      .string()
      .trim()
      .min(1, "La forme juridique est obligatoire."),
    siren: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || /^\d{3}\s?\d{3}\s?\d{3}$/.test(value),
        "Le SIREN doit comporter 9 chiffres.",
      ),
    societeAdresse: z
      .string()
      .trim()
      .min(1, "L'adresse de la société est obligatoire."),
    gerant: z.string().trim().min(1, "Le gérant est obligatoire."),
    logementAdresse: z
      .string()
      .trim()
      .min(1, "L'adresse du logement est obligatoire."),
    surfaceTotale: z
      .string()
      .refine(
        (value) => isValidAmount(value, true),
        "Surface totale invalide.",
      ),
    surfacePro: z
      .string()
      .refine(
        (value) => isValidAmount(value, true),
        "Surface professionnelle invalide.",
      ),
    bailleurNom: z
      .string()
      .trim()
      .min(1, "Le nom du bailleur est obligatoire."),
    bailleurAdresse: z
      .string()
      .trim()
      .min(1, "L'adresse du bailleur est obligatoire."),
    locataireNom: z
      .string()
      .trim()
      .min(1, "Le nom du locataire est obligatoire."),
    locataireAdresse: z
      .string()
      .trim()
      .min(1, "L'adresse du locataire est obligatoire."),
    loyerHc: z
      .string()
      .refine(
        (value) => isValidAmount(value, true),
        "Loyer hors charges invalide.",
      ),
    provisionCharges: z
      .string()
      .refine(
        (value) => isValidAmount(value, false),
        "Provision pour charges invalide.",
      ),
    lieuEmission: z
      .string()
      .trim()
      .min(1, "Le lieu d'émission est obligatoire."),
  })
  .refine(
    (values) => {
      const proSurface = parseAmount(values.surfacePro);
      const totalSurface = parseAmount(values.surfaceTotale);
      if (proSurface === null || totalSurface === null) {
        return false;
      }
      return Number(proSurface) <= Number(totalSurface);
    },
    {
      path: ["surfacePro"],
      message:
        "La surface professionnelle ne peut pas dépasser la surface totale.",
    },
  );

export type SettingsFormValues = z.infer<typeof settingsSchema>;

export const expenseItemSchema = z.object({
  code: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^[a-zA-Z0-9_-]+$/.test(value),
      "Code invalide : lettres, chiffres, tirets et underscores uniquement.",
    ),
  libelle: z.string().trim().min(1, "Le libellé est obligatoire."),
  fournisseur: z.string(),
  prorataPct: z
    .string()
    .refine(
      (value) => parsePercentage(value) !== null,
      "Prorata attendu entre 0 et 100.",
    ),
  periodicite: z.enum(["MONTHLY", "BIMONTHLY", "ANNUAL"]),
  ordre: z.number().int("Ordre invalide.").min(0, "L'ordre doit être positif."),
  actif: z.boolean(),
  plusieursLignesAutorisees: z.boolean(),
});

export type ExpenseItemFormValues = z.infer<typeof expenseItemSchema>;

export const llmSchema = z.object({
  actif: z.boolean(),
  url: z
    .string()
    .trim()
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }, "URL invalide : http:// ou https:// attendu."),
  modele: z.string().trim().min(1, "Le nom du modèle est obligatoire."),
  timeoutSeconds: z
    .number()
    .int("Délai invalide.")
    .min(5, "Le délai doit être au moins de 5 secondes.")
    .max(600, "Le délai ne peut pas dépasser 600 secondes."),
  temperature: z.string().refine((value) => {
    const numberValue = Number(value.replace(",", "."));
    return Number.isFinite(numberValue) && numberValue >= 0 && numberValue <= 2;
  }, "Température attendue entre 0 et 2."),
  numCtx: z
    .number()
    .int("Contexte invalide.")
    .min(1024, "Le contexte doit être au moins de 1 024.")
    .max(131_072, "Le contexte ne peut pas dépasser 131 072."),
  pagesMax: z
    .number()
    .int("Nombre de pages invalide.")
    .min(1, "Au moins une page.")
    .max(20, "20 pages maximum."),
  ocrActif: z.boolean(),
  promptExtraction: z
    .string()
    .trim()
    .min(20, "Le prompt d'extraction est trop court."),
  cleApi: z.string(),
  supprimerCle: z.boolean(),
});

export type LlmFormValues = z.infer<typeof llmSchema>;
