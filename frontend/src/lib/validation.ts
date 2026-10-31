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

function adminLlmMessage(key: string): string {
  return i18n.t(`adminLlm.validation.${key}`);
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

/** Free additional charge of a rent receipt: label plus a strictly positive amount. */
export const additionalChargeSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, {
      error: () => rentReceiptMessage("additionalChargeLabel"),
    })
    .max(120, {
      error: () => rentReceiptMessage("additionalChargeLabelTooLong"),
    }),
  amount: z.string().refine((value) => isValidAmount(value, true), {
    error: () => rentReceiptMessage("additionalChargeAmount"),
  }),
});

export type AdditionalChargeFormValues = z.infer<typeof additionalChargeSchema>;

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
    additionalCharges: z
      .array(additionalChargeSchema)
      .max(20, { error: () => rentReceiptMessage("additionalChargeLimit") })
      .optional(),
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
  siret: z.string().optional(),
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
  issuePlace: z.string(),
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
  phone: z.string().optional(),
  addressNote: z.string().optional(),
  issuePlace: z.string(),
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
    .refine(
      (value) => {
        try {
          const url = new URL(value);
          return url.protocol === "http:" || url.protocol === "https:";
        } catch {
          return false;
        }
      },
      { error: () => adminLlmMessage("url") },
    ),
  model: z
    .string()
    .trim()
    .min(1, {
      error: () => adminLlmMessage("model"),
    }),
  timeoutSeconds: z
    .number()
    .int({ error: () => adminLlmMessage("timeoutInteger") })
    .min(5, { error: () => adminLlmMessage("timeoutMin") })
    .max(600, { error: () => adminLlmMessage("timeoutMax") }),
  temperature: z.string().refine(
    (value) => {
      const numberValue = Number(value.replace(",", "."));
      return (
        Number.isFinite(numberValue) && numberValue >= 0 && numberValue <= 2
      );
    },
    { error: () => adminLlmMessage("temperature") },
  ),
  numCtx: z
    .number()
    .int({ error: () => adminLlmMessage("numCtxInteger") })
    .min(1024, { error: () => adminLlmMessage("numCtxMin") })
    .max(131_072, { error: () => adminLlmMessage("numCtxMax") }),
  maxPages: z
    .number()
    .int({ error: () => adminLlmMessage("maxPagesInteger") })
    .min(1, { error: () => adminLlmMessage("maxPagesMin") })
    .max(20, { error: () => adminLlmMessage("maxPagesMax") }),
  ocrActive: z.boolean(),
  extractionPrompt: z
    .string()
    .trim()
    .min(20, {
      error: () => adminLlmMessage("promptTooShort"),
    }),
  apiKey: z.string(),
  deleteApiKey: z.boolean(),
});

export type LlmFormValues = z.infer<typeof llmSchema>;

function authMessage(key: string): string {
  return i18n.t(`auth.validation.${key}`);
}

const authEmail = z
  .string()
  .trim()
  .min(1, { error: () => authMessage("emailRequired") })
  .email({ error: () => authMessage("emailInvalid") });

export const loginSchema = z.object({
  email: authEmail,
  password: z.string().min(1, { error: () => authMessage("passwordRequired") }),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: authEmail,
    password: z
      .string()
      .refine((value) => value.trim() !== "", {
        error: () => authMessage("passwordRequired"),
      })
      .max(100, { error: () => authMessage("passwordTooLong") }),
    confirmPassword: z
      .string()
      .min(1, { error: () => authMessage("confirmRequired") }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    error: () => authMessage("confirmMismatch"),
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { error: () => authMessage("currentPasswordRequired") }),
    newPassword: z
      .string()
      .refine((value) => value.trim() !== "", {
        error: () => authMessage("passwordRequired"),
      })
      .max(100, { error: () => authMessage("passwordTooLong") }),
    confirmPassword: z
      .string()
      .min(1, { error: () => authMessage("confirmRequired") }),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    error: () => authMessage("confirmMismatch"),
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
