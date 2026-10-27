import { z } from "zod";
import i18n from "@/i18n";
import { isValidDate, isValidMonth } from "./dates";
import { parseAmount, parsePercentage } from "./format";

function rentReceiptMessage(key: string): string {
  return i18n.t(`rentReceipt.validation.${key}`);
}

function expenseMessage(key: string): string {
  return i18n.t(`expenseStatement.validation.${key}`);
}

function companyMessage(key: string): string {
  return i18n.t(`settings.company.validation.${key}`);
}

function leaseMessage(key: string): string {
  return i18n.t(`settings.lease.validation.${key}`);
}

function employeeMessage(key: string): string {
  return i18n.t(`settings.employees.validation.${key}`);
}

function expenseItemMessage(key: string): string {
  return i18n.t(`settings.expenses.validation.${key}`);
}

function personMessage(key: string): string {
  return i18n.t(`settings.people.validation.${key}`);
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
  itemCode: z.string().min(1, {
    error: () => expenseMessage("itemCode"),
  }),
  amountInclVat: z.string().refine((value) => isValidAmount(value, true), {
    error: () => expenseMessage("amount"),
  }),
  proRataPct: z.string().refine((value) => parsePercentage(value) !== null, {
    error: () => expenseMessage("proRata"),
  }),
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

const optionalSurface = (key: string) =>
  z
    .string()
    .refine((value) => value.trim() === "" || isValidAmount(value, false), {
      error: () => leaseMessage(key),
    });

export const companySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, {
      error: () => companyMessage("name"),
    }),
  legalForm: z.string(),
  siren: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{3}\s?\d{3}\s?\d{3}$/.test(value), {
      error: () => companyMessage("siren"),
    }),
  address: z.string(),
  managerName: z.string(),
  leaseId: z.string(),
  issuePlace: z.string(),
});

export type CompanyFormValues = z.infer<typeof companySchema>;

export const employeeSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, {
      error: () => employeeMessage("firstName"),
    }),
  lastName: z
    .string()
    .trim()
    .min(1, {
      error: () => employeeMessage("lastName"),
    }),
  address: z.string(),
  email: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
      { error: () => employeeMessage("email") },
    ),
  title: z.enum(["CEO", "CFO", "ACCOUNTANT", "EMPLOYEE"], {
    error: () => employeeMessage("title"),
  }),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;

export const personSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, {
      error: () => personMessage("name"),
    }),
  address: z.string(),
});

export type PersonFormValues = z.infer<typeof personSchema>;

export const leaseSchema = z
  .object({
    companyLease: z.boolean(),
    landlordId: z.string().min(1, {
      error: () => leaseMessage("landlord"),
    }),
    tenantId: z.string(),
    companyId: z.string(),
    propertyAddress: z
      .string()
      .trim()
      .min(1, {
        error: () => leaseMessage("propertyAddress"),
      }),
    rentExclCharges: z.string().refine((value) => isValidAmount(value, false), {
      error: () => leaseMessage("rentExclCharges"),
    }),
    charges: z.string().refine((value) => isValidAmount(value, false), {
      error: () => leaseMessage("charges"),
    }),
    totalArea: optionalSurface("totalAreaInvalid"),
    businessArea: optionalSurface("businessAreaInvalid"),
  })
  .refine((values) => !values.companyLease || values.companyId !== "", {
    path: ["companyId"],
    error: () => leaseMessage("companyTenant"),
  })
  .refine((values) => values.companyLease || values.tenantId !== "", {
    path: ["tenantId"],
    error: () => leaseMessage("tenant"),
  })
  .refine(
    (values) =>
      values.companyLease ||
      values.tenantId === "" ||
      values.tenantId !== values.landlordId,
    {
      path: ["tenantId"],
      error: () => leaseMessage("partiesIdentical"),
    },
  )
  .refine((values) => !values.companyLease || values.totalArea.trim() !== "", {
    path: ["totalArea"],
    error: () => leaseMessage("totalAreaRequired"),
  })
  .refine(
    (values) => !values.companyLease || values.businessArea.trim() !== "",
    {
      path: ["businessArea"],
      error: () => leaseMessage("businessAreaRequired"),
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
      error: () => leaseMessage("businessAreaTooLarge"),
    },
  );

export type LeaseFormValues = z.infer<typeof leaseSchema>;

export const expenseItemSchema = z.object({
  code: z
    .string()
    .trim()
    .refine((value) => value === "" || /^[a-zA-Z0-9_-]+$/.test(value), {
      error: () => expenseItemMessage("code"),
    }),
  label: z
    .string()
    .trim()
    .min(1, {
      error: () => expenseItemMessage("label"),
    }),
  supplier: z.string(),
  proRataPct: z.string().refine((value) => parsePercentage(value) !== null, {
    error: () => expenseItemMessage("proRata"),
  }),
  periodicity: z.enum(["MONTHLY", "BIMONTHLY", "ANNUAL"]),
  sortOrder: z
    .number()
    .int({ error: () => expenseItemMessage("sortOrderInteger") })
    .min(0, { error: () => expenseItemMessage("sortOrderMin") }),
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
