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
    itemCode: z.string().min(1, "Sélectionnez un type de frais."),
    amountInclVat: z
      .string()
      .refine(
        (value) => isValidAmount(value, true),
        "Saisissez un montant supérieur à 0 (ex. 80,50).",
      ),
    proRataPct: z
      .string()
      .refine(
        (value) => parsePercentage(value) !== null,
        "Prorata attendu entre 0 et 100 (2 décimales max).",
      ),
    monthlyAmountOverride: z
      .string()
      .refine(
        (value) => value === "" || isValidAmount(value, false),
        "Le montant du mois doit être un montant positif.",
      ),
  });

export type ExpenseFormValues = z.infer<typeof expenseSchema>;

export const rentReceiptSchema = z
  .object({
    month: z.string().refine(isValidMonth, "Choisissez un mois valide."),
    periodStart: z.string().refine(isValidDate, "Date de début invalide."),
    periodEnd: z.string().refine(isValidDate, "Date de fin invalide."),
    rentExclCharges: z
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
    paymentDate: optionalDate,
    issueDate: optionalDate,
  })
  .refine((values) => values.periodEnd >= values.periodStart, {
    path: ["periodEnd"],
    message: "La fin de période doit être postérieure au début.",
  });

export type RentReceiptFormValues = z.infer<typeof rentReceiptSchema>;

export const settingsSchema = z
  .object({
    companyName: z
      .string()
      .trim()
      .min(1, "La raison sociale est obligatoire."),
    legalForm: z
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
    companyAddress: z
      .string()
      .trim()
      .min(1, "L'adresse de la société est obligatoire."),
    managerName: z.string().trim().min(1, "Le gérant est obligatoire."),
    homeAddress: z
      .string()
      .trim()
      .min(1, "L'adresse du logement est obligatoire."),
    totalArea: z
      .string()
      .refine(
        (value) => isValidAmount(value, true),
        "Surface totale invalide.",
      ),
    businessArea: z
      .string()
      .refine(
        (value) => isValidAmount(value, true),
        "Surface professionnelle invalide.",
      ),
    landlordName: z
      .string()
      .trim()
      .min(1, "Le nom du bailleur est obligatoire."),
    landlordAddress: z
      .string()
      .trim()
      .min(1, "L'adresse du bailleur est obligatoire."),
    tenantName: z
      .string()
      .trim()
      .min(1, "Le nom du locataire est obligatoire."),
    tenantAddress: z
      .string()
      .trim()
      .min(1, "L'adresse du locataire est obligatoire."),
    rentExclCharges: z
      .string()
      .refine(
        (value) => isValidAmount(value, true),
        "Loyer hors charges invalide.",
      ),
    chargesAdvance: z
      .string()
      .refine(
        (value) => isValidAmount(value, false),
        "Provision pour charges invalide.",
      ),
    issuePlace: z
      .string()
      .trim()
      .min(1, "Le lieu d'émission est obligatoire."),
  })
  .refine(
    (values) => {
      const businessArea = parseAmount(values.businessArea);
      const totalArea = parseAmount(values.totalArea);
      if (businessArea === null || totalArea === null) {
        return false;
      }
      return Number(businessArea) <= Number(totalArea);
    },
    {
      path: ["businessArea"],
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
  label: z.string().trim().min(1, "Le libellé est obligatoire."),
  supplier: z.string(),
  proRataPct: z
    .string()
    .refine(
      (value) => parsePercentage(value) !== null,
      "Prorata attendu entre 0 et 100.",
    ),
  periodicity: z.enum(["MONTHLY", "BIMONTHLY", "ANNUAL"]),
  sortOrder: z.number().int("Ordre invalide.").min(0, "L'ordre doit être positif."),
  active: z.boolean(),
  multipleLinesAllowed: z.boolean(),
});

export type ExpenseItemFormValues = z.infer<typeof expenseItemSchema>;

export const llmSchema = z.object({
  active: z.boolean(),
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
  model: z.string().trim().min(1, "Le nom du modèle est obligatoire."),
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
  maxPages: z
    .number()
    .int("Nombre de pages invalide.")
    .min(1, "Au moins une page.")
    .max(20, "20 pages maximum."),
  ocrActive: z.boolean(),
  extractionPrompt: z
    .string()
    .trim()
    .min(20, "Le prompt d'extraction est trop court."),
  apiKey: z.string(),
  deleteApiKey: z.boolean(),
});

export type LlmFormValues = z.infer<typeof llmSchema>;
