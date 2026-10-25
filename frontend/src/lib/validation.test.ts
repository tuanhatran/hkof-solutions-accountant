import { describe, expect, it } from "vitest";
import {
  expenseSchema,
  llmSchema,
  companySchema,
  employeeSchema,
  expenseItemSchema,
  rentReceiptSchema,
  personSchema,
  parseTenantKey,
  tenantKeyFromLease,
  leaseSchema,
} from "./validation";

const VALID_EXPENSE = {
  itemCode: "gaz",
  amountInclVat: "120,00",
  proRataPct: "35,71",
};

const VALID_COMPANY = {
  name: "HKOF",
  legalForm: "EURL",
  siren: "123 456 789",
  address: "1 rue de la Paix, 75002 Paris",
  managerName: "Camille Martin",
  leaseId: "5",
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
    tenantKey: "person:2",
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
      rentReceiptSchema.safeParse({ ...VALID, tenantKey: "" }).success,
    ).toBe(false);
    expect(
      rentReceiptSchema.safeParse({ ...VALID, tenantKey: "societe:2" }).success,
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

describe("companySchema", () => {
  it("accepts a complete company", () => {
    expect(companySchema.safeParse(VALID_COMPANY).success).toBe(true);
  });

  it("accepts a name-only company with empty optional fields", () => {
    expect(
      companySchema.safeParse({
        ...VALID_COMPANY,
        legalForm: "",
        siren: "",
        address: "",
        managerName: "",
        leaseId: "",
        issuePlace: "",
      }).success,
    ).toBe(true);
  });

  it("requires the company name", () => {
    expect(
      companySchema.safeParse({ ...VALID_COMPANY, name: "  " }).success,
    ).toBe(false);
  });

  it("accepts a company without a lease", () => {
    expect(
      companySchema.safeParse({ ...VALID_COMPANY, leaseId: "" }).success,
    ).toBe(true);
  });

  it("rejects a malformed SIREN", () => {
    expect(
      companySchema.safeParse({ ...VALID_COMPANY, siren: "12345" }).success,
    ).toBe(false);
  });
});

describe("employeeSchema", () => {
  const VALID = {
    firstName: "Camille",
    lastName: "Martin",
    address: "",
    email: "camille@example.fr",
    title: "CEO" as const,
  };

  it("accepts a complete employee and an empty email", () => {
    expect(employeeSchema.safeParse(VALID).success).toBe(true);
    expect(employeeSchema.safeParse({ ...VALID, email: "" }).success).toBe(
      true,
    );
  });

  it("requires the first and last names", () => {
    expect(employeeSchema.safeParse({ ...VALID, firstName: "" }).success).toBe(
      false,
    );
    expect(employeeSchema.safeParse({ ...VALID, lastName: "  " }).success).toBe(
      false,
    );
  });

  it("rejects an invalid email and an unknown title", () => {
    expect(
      employeeSchema.safeParse({ ...VALID, email: "camille" }).success,
    ).toBe(false);
    expect(
      employeeSchema.safeParse({ ...VALID, title: "DIRECTOR" }).success,
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
  it("requires a person name", () => {
    expect(personSchema.safeParse({ name: " ", address: "" }).success).toBe(
      false,
    );
    expect(
      personSchema.safeParse({ name: "", address: "1 avenue du Parc" }).success,
    ).toBe(false);
    expect(
      personSchema.safeParse({
        name: "M. Bailleur",
        address: "1 avenue du Parc",
      }).success,
    ).toBe(true);
    expect(
      personSchema.safeParse({ name: "Mme Locataire", address: "" }).success,
    ).toBe(true);
  });

  it("parses a tenant key into exactly one party", () => {
    expect(parseTenantKey("person:2")).toEqual({
      tenantId: 2,
      tenantCompanyId: null,
    });
    expect(parseTenantKey("company:3")).toEqual({
      tenantId: null,
      tenantCompanyId: 3,
    });
    expect(parseTenantKey("invalide")).toEqual({
      tenantId: null,
      tenantCompanyId: null,
    });
    expect(tenantKeyFromLease({ tenantId: 2 })).toBe("person:2");
    expect(tenantKeyFromLease({ companyLease: true, companyId: 3 })).toBe(
      "company:3",
    );
    expect(tenantKeyFromLease({})).toBe("");
  });

  it("requires a pair, a property address and valid lease amounts", () => {
    const valid = {
      companyLease: false,
      landlordId: "1",
      tenantId: "2",
      companyId: "",
      propertyAddress: "12 rue de la République, 75000 Paris",
      rentExclCharges: "1300,00",
      charges: "0,00",
      totalArea: "",
      businessArea: "",
    };
    expect(leaseSchema.safeParse(valid).success).toBe(true);
    expect(leaseSchema.safeParse({ ...valid, landlordId: "" }).success).toBe(
      false,
    );
    expect(leaseSchema.safeParse({ ...valid, tenantId: "" }).success).toBe(
      false,
    );
    expect(leaseSchema.safeParse({ ...valid, tenantId: "1" }).success).toBe(
      false,
    );
    expect(
      leaseSchema.safeParse({ ...valid, propertyAddress: " " }).success,
    ).toBe(false);
    expect(
      leaseSchema.safeParse({ ...valid, rentExclCharges: "" }).success,
    ).toBe(false);
    expect(leaseSchema.safeParse({ ...valid, charges: "-1" }).success).toBe(
      false,
    );
  });

  it("requires a company tenant and validates the surfaces of a company lease", () => {
    const valid = {
      companyLease: true,
      landlordId: "1",
      tenantId: "",
      companyId: "3",
      propertyAddress: "12 rue de la République, 75000 Paris",
      rentExclCharges: "1300,00",
      charges: "0,00",
      totalArea: "",
      businessArea: "",
    };
    expect(leaseSchema.safeParse({ ...valid, companyId: "" }).success).toBe(
      false,
    );
    expect(leaseSchema.safeParse({ ...valid, totalArea: "70" }).success).toBe(
      false,
    );
    expect(
      leaseSchema.safeParse({ ...valid, totalArea: "70", businessArea: "80" })
        .success,
    ).toBe(false);
    expect(
      leaseSchema.safeParse({ ...valid, totalArea: "70", businessArea: "25" })
        .success,
    ).toBe(true);
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
