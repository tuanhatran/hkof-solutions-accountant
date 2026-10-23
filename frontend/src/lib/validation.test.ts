import { describe, expect, it } from "vitest";
import {
  expenseSchema,
  llmSchema,
  settingsSchema,
  expenseItemSchema,
  rentReceiptSchema,
  landlordSchema,
  tenantSchema,
  leaseSchema,
} from "./validation";

const VALID_EXPENSE = {
  itemCode: "gaz",
  amountInclVat: "120,00",
  proRataPct: "35,71",
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

  it("no longer accepts an invoice period on an expense line", () => {
    expect(Object.keys(expenseSchema.shape)).toEqual([
      "itemCode",
      "amountInclVat",
      "proRataPct",
    ]);
  });
});

describe("rentReceiptSchema", () => {
  const VALID = {
    month: "2026-10",
    landlordId: "1",
    tenantId: "2",
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

  it("requires a selected landlord and tenant", () => {
    expect(
      rentReceiptSchema.safeParse({ ...VALID, landlordId: "" }).success,
    ).toBe(false);
    expect(
      rentReceiptSchema.safeParse({ ...VALID, tenantId: "" }).success,
    ).toBe(false);
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

  it("no longer carries the landlord, tenant and rent fields", () => {
    expect(Object.keys(settingsSchema.shape)).not.toEqual(
      expect.arrayContaining([
        "landlordName",
        "landlordAddress",
        "tenantName",
        "tenantAddress",
        "rentExclCharges",
        "chargesAdvance",
      ]),
    );
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

describe("directory schemas", () => {
  it("requires a landlord and a tenant name", () => {
    expect(landlordSchema.safeParse({ name: " ", address: "" }).success).toBe(
      false,
    );
    expect(tenantSchema.safeParse({ name: "", address: "" }).success).toBe(
      false,
    );
    expect(
      landlordSchema.safeParse({
        name: "M. Bailleur",
        address: "1 avenue du Parc",
      }).success,
    ).toBe(true);
    expect(
      tenantSchema.safeParse({ name: "Mme Locataire", address: "" }).success,
    ).toBe(true);
  });

  it("requires a pair, a property address and valid lease amounts", () => {
    const valid = {
      landlordId: "1",
      tenantId: "2",
      propertyAddress: "12 rue de la République, 75000 Paris",
      rentExclCharges: "1300,00",
      charges: "0,00",
    };
    expect(leaseSchema.safeParse(valid).success).toBe(true);
    expect(leaseSchema.safeParse({ ...valid, landlordId: "" }).success).toBe(
      false,
    );
    expect(leaseSchema.safeParse({ ...valid, tenantId: "" }).success).toBe(
      false,
    );
    expect(
      leaseSchema.safeParse({ ...valid, propertyAddress: " " }).success,
    ).toBe(false);
    expect(leaseSchema.safeParse({ ...valid, rentExclCharges: "" }).success).toBe(
      false,
    );
    expect(leaseSchema.safeParse({ ...valid, charges: "-1" }).success).toBe(
      false,
    );
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
