import { z } from "zod";
import i18n from "@/i18n";
import { isValidDate, isValidMonth } from "./dates";
import { parseAmount, parsePercentage } from "./format";

function rentReceiptMessage(key: string): string {
  return i18n.t(`rentReceipt.validation.${key}`);
}

function isValidAmount(value: string, strictlyPositive: boolean): boolean {
  const normalized = parseAmount(value);
  if (normalized === null) {
    return false;
  }
  return strictlyPositive ? Number(normalized) > 0 : Number(normalized) >= 0;
}

const optionalDate = z
  .string()
  .refine((value) => value === "" || isValidDate(value), {
    error: () => rentReceiptMessage("date"),
  });

export const expenseSchema = z.object({
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
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;

/** Encoded tenant of a rent receipt: `person:<id>` or `company:<id>`. */
export const TENANT_KEY_PATTERN = /^(person|company):[1-9]\d*$/;

export interface TenantKeyParts {
  tenantId: number | null;
  tenantCompanyId: number | null;
}

export function parseTenantKey(key: string): TenantKeyParts {
  const [kind, rawId] = key.split(":");
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return { tenantId: null, tenantCompanyId: null };
  }
  return kind === "company"
    ? { tenantId: null, tenantCompanyId: id }
    : { tenantId: id, tenantCompanyId: null };
}

export function tenantKeyFromLease(lease: {
  companyLease?: boolean;
  companyId?: number | null;
  tenantId?: number | null;
}): string {
  if (lease.companyLease && lease.companyId) {
    return `company:${lease.companyId}`;
  }
  if (lease.tenantId) {
    return `person:${lease.tenantId}`;
  }
  return "";
}

export const rentReceiptSchema = z
  .object({
    month: z.string().refine(isValidMonth, {
      error: () => rentReceiptMessage("month"),
    }),
    landlordId: z.string().min(1, {
      error: () => rentReceiptMessage("landlord"),
    }),
    tenantKey: z.string().regex(TENANT_KEY_PATTERN, {
      error: () => rentReceiptMessage("tenant"),
    }),
    periodStart: z.string().refine(isValidDate, {
      error: () => rentReceiptMessage("periodStart"),
    }),
    periodEnd: z.string().refine(isValidDate, {
      error: () => rentReceiptMessage("periodEnd"),
    }),
    rentExclCharges: z.string().refine((value) => isValidAmount(value, false), {
      error: () => rentReceiptMessage("rentExclCharges"),
    }),
    charges: z.string().refine((value) => isValidAmount(value, false), {
      error: () => rentReceiptMessage("charges"),
    }),
    paymentDate: optionalDate,
    issueDate: optionalDate,
  })
  .refine((values) => values.periodEnd >= values.periodStart, {
    path: ["periodEnd"],
    error: () => rentReceiptMessage("periodOrder"),
  });

export type RentReceiptFormValues = z.infer<typeof rentReceiptSchema>;

const optionalSurface = (message: string) =>
  z
    .string()
    .refine(
      (value) => value.trim() === "" || isValidAmount(value, false),
      message,
    );

export const companySchema = z.object({
  name: z.string().trim().min(1, "Le nom de la société est obligatoire."),
  legalForm: z.string(),
  siren: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\d{3}\s?\d{3}\s?\d{3}$/.test(value),
      "Le SIREN doit comporter 9 chiffres.",
    ),
  address: z.string(),
  managerName: z.string(),
  leaseId: z.string(),
  issuePlace: z.string(),
});

export type CompanyFormValues = z.infer<typeof companySchema>;

export const employeeSchema = z.object({
  firstName: z.string().trim().min(1, "Le prénom du salarié est obligatoire."),
  lastName: z.string().trim().min(1, "Le nom du salarié est obligatoire."),
  address: z.string(),
  email: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
      "L'adresse électronique du salarié est invalide.",
    ),
  title: z.enum(["CEO", "CFO", "ACCOUNTANT", "EMPLOYEE"], {
    error: "L'intitulé du salarié est obligatoire.",
  }),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;

export const personSchema = z.object({
  name: z.string().trim().min(1, "Le nom de la personne est obligatoire."),
  address: z.string(),
});

export type PersonFormValues = z.infer<typeof personSchema>;

export const leaseSchema = z
  .object({
    companyLease: z.boolean(),
    landlordId: z.string().min(1, "Sélectionnez un bailleur."),
    tenantId: z.string(),
    companyId: z.string(),
    propertyAddress: z
      .string()
      .trim()
      .min(1, "L'adresse du bien est obligatoire."),
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
    totalArea: optionalSurface("Surface totale invalide."),
    businessArea: optionalSurface("Surface professionnelle invalide."),
  })
  .refine((values) => !values.companyLease || values.companyId !== "", {
    path: ["companyId"],
    message: "Sélectionnez la société locataire.",
  })
  .refine((values) => values.companyLease || values.tenantId !== "", {
    path: ["tenantId"],
    message: "Sélectionnez un locataire.",
  })
  .refine(
    (values) =>
      values.companyLease ||
      values.tenantId === "" ||
      values.tenantId !== values.landlordId,
    {
      path: ["tenantId"],
      message:
        "Le bailleur et le locataire doivent être deux personnes distinctes.",
    },
  )
  .refine((values) => !values.companyLease || values.totalArea.trim() !== "", {
    path: ["totalArea"],
    message: "La surface totale est obligatoire pour un bail société.",
  })
  .refine(
    (values) => !values.companyLease || values.businessArea.trim() !== "",
    {
      path: ["businessArea"],
      message:
        "La surface professionnelle est obligatoire pour un bail société.",
    },
  )
  .refine(
    (values) => {
      if (values.totalArea.trim() === "" || values.businessArea.trim() === "") {
        return true;
      }
      const totalArea = parseAmount(values.totalArea);
      const businessArea = parseAmount(values.businessArea);
      if (totalArea === null || businessArea === null) {
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

export type LeaseFormValues = z.infer<typeof leaseSchema>;

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
  sortOrder: z
    .number()
    .int("Ordre invalide.")
    .min(0, "L'ordre doit être positif."),
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
