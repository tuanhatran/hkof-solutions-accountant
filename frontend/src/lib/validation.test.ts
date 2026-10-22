import { describe, expect, it } from "vitest";
import {
  expenseSchema,
  llmSchema,
  settingsSchema,
  expenseItemSchema,
  rentReceiptSchema,
} from "./validation";

const VALID_EXPENSE = {
  itemCode: "gaz",
  amountInclVat: "120,00",
  proRataPct: "35,71",
  periodStart: "2026-09-01",
  periodEnd: "2026-10-31",
  monthlyAmountOverride: "",
};

const VALID_SETTINGS = {
  companyName: "HKOF",
  legalForm: "EURL",
  siren: "123 456 789",
  companyAddress: "1 rue de la Paix, 75002 Paris",
  managerName: "Camille Martin",
  homeAddress: "12 rue des Lilas, 75011 Paris",
  totalArea: "70,00",
  businessArea: "25,00",
  landlordName: "Propriétaire",
  landlordAddress: "1 avenue du Parc, 75011 Paris",
  tenantName: "Locataire",
  tenantAddress: "12 rue des Lilas, 75011 Paris",
  rentExclCharges: "900,00",
  chargesAdvance: "50,00",
  issuePlace: "Paris",
};

describe("expenseSchema", () => {
  it("accepts a complete entry", () => {
    expect(expenseSchema.safeParse(VALID_EXPENSE).success).toBe(true);
  });

  it("rejects a zero amount or an out-of-range pro-rata", () => {
    expect(
      expenseSchema.safeParse({ ...VALID_EXPENSE, amountInclVat: "0" }).success,
    ).toBe(false);
    expect(
      expenseSchema.safeParse({ ...VALID_EXPENSE, proRataPct: "101" }).success,
    ).toBe(false);
    expect(
      expenseSchema.safeParse({ ...VALID_EXPENSE, proRataPct: "35,711" })
        .success,
    ).toBe(false);
  });

  it("requires a complete and ordered period", () => {
    expect(
      expenseSchema.safeParse({ ...VALID_EXPENSE, periodEnd: "" }).success,
    ).toBe(false);
    expect(
      expenseSchema.safeParse({
        ...VALID_EXPENSE,
        periodStart: "2026-10-31",
        periodEnd: "2026-10-01",
      }).success,
    ).toBe(false);
  });
});

describe("rentReceiptSchema", () => {
  const VALID = {
    month: "2026-10",
    periodStart: "2026-10-01",
    periodEnd: "2026-10-31",
    rentExclCharges: "900,00",
    charges: "50,00",
    paymentDate: "",
    issueDate: "",
  };

  it("accepts the month period and empty optional dates", () => {
    expect(rentReceiptSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects a reversed period and an invalid month", () => {
    expect(
      rentReceiptSchema.safeParse({ ...VALID, periodEnd: "2026-09-30" })
        .success,
    ).toBe(false);
    expect(
      rentReceiptSchema.safeParse({ ...VALID, month: "2026-13" }).success,
    ).toBe(false);
  });
});

describe("settingsSchema", () => {
  it("accepts a complete configuration", () => {
    expect(settingsSchema.safeParse(VALID_SETTINGS).success).toBe(true);
  });

  it("rejects a professional area larger than the total area", () => {
    const result = settingsSchema.safeParse({
      ...VALID_SETTINGS,
      businessArea: "80",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path[0] === "businessArea"),
      ).toBe(true);
    }
  });

  it("rejects a malformed SIREN", () => {
    expect(
      settingsSchema.safeParse({ ...VALID_SETTINGS, siren: "12345" }).success,
    ).toBe(false);
  });
});

describe("expenseItemSchema", () => {
  const VALID = {
    code: "gaz",
    label: "Gaz",
    supplier: "EDF",
    proRataPct: "35,71",
    periodicity: "MONTHLY" as const,
    sortOrder: 1,
    active: true,
    multipleLinesAllowed: false,
  };

  it("accepts a simple code", () => {
    expect(expenseItemSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects a code with spaces or special characters", () => {
    expect(
      expenseItemSchema.safeParse({ ...VALID, code: "gaz ville" }).success,
    ).toBe(false);
    expect(
      expenseItemSchema.safeParse({ ...VALID, code: "gaz/ville" }).success,
    ).toBe(false);
  });
});

describe("llmSchema", () => {
  const VALID = {
    active: true,
    url: "http://host.docker.internal:11434",
    model: "qwen2.5:7b",
    timeoutSeconds: 120,
    temperature: "0",
    numCtx: 8192,
    maxPages: 5,
    ocrActive: false,
    extractionPrompt:
      "Tu extrais uniquement le montant TTC du document fourni.",
    apiKey: "",
    deleteApiKey: false,
  };

  it("accepts a local configuration without key", () => {
    expect(llmSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects a non-http(s) URL and an out-of-range temperature", () => {
    expect(
      llmSchema.safeParse({ ...VALID, url: "ftp://serveur" }).success,
    ).toBe(false);
    expect(llmSchema.safeParse({ ...VALID, temperature: "2,1" }).success).toBe(
      false,
    );
    expect(llmSchema.safeParse({ ...VALID, timeoutSeconds: 2 }).success).toBe(
      false,
    );
  });
});
