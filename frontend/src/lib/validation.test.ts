import { describe, expect, it } from "vitest";
import i18n from "@/i18n";
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

  it("translates the expense messages at parse time", async () => {
    await i18n.changeLanguage("en");

    const english = expenseSchema.safeParse({
      itemCode: "",
      amountInclVat: "0",
      proRataPct: "101",
    });
    expect(english.success).toBe(false);
    if (english.success) {
      return;
    }
    expect(english.error.issues.map((issue) => issue.message)).toEqual([
      "Select an expense type.",
      "Enter an amount greater than 0 (e.g. 80.50).",
      "Pro rata must be between 0 and 100 (2 decimals max).",
    ]);
    expect(
      llmSchema.shape.url.safeParse("ftp://serveur").error?.issues[0]?.message,
    ).toBe("Invalid URL: http:// or https:// expected.");

    await i18n.changeLanguage("fr");
    expect(
      expenseSchema.safeParse({ ...VALID_EXPENSE, itemCode: "" }).error
        ?.issues[0]?.message,
    ).toBe("Sélectionnez un type de frais.");
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

  it("keeps the French messages for an invalid receipt", () => {
    const result = rentReceiptSchema.safeParse({
      ...VALID,
      month: "",
      landlordId: "",
      tenantKey: "",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.error.issues.map((issue) => issue.message)).toEqual([
      "Choisissez un mois valide.",
      "Sélectionnez un bailleur.",
      "Sélectionnez un locataire.",
    ]);
  });

  it("translates only the rent receipt messages at parse time", async () => {
    await i18n.changeLanguage("en");

    const result = rentReceiptSchema.safeParse({
      ...VALID,
      month: "",
      periodEnd: "2026-09-30",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.error.issues.map((issue) => issue.message)).toEqual([
      "Choose a valid month.",
      "The period end must be after the start.",
    ]);
    expect(
      companySchema.safeParse({ ...VALID_COMPANY, name: " " }).error?.issues[0]
        ?.message,
    ).toBe("The company name is required.");
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

  it("translates the company messages at parse time", async () => {
    await i18n.changeLanguage("en");

    const english = companySchema.safeParse({
      ...VALID_COMPANY,
      name: " ",
      siren: "12345",
    });
    expect(english.success).toBe(false);
    if (english.success) {
      return;
    }
    expect(english.error.issues.map((issue) => issue.message)).toEqual([
      "The company name is required.",
      "The SIREN must have 9 digits.",
    ]);

    await i18n.changeLanguage("fr");
    expect(
      companySchema.safeParse({ ...VALID_COMPANY, name: " " }).error?.issues[0]
        ?.message,
    ).toBe("Le nom de la société est obligatoire.");
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

  it("translates the employee messages at parse time", async () => {
    await i18n.changeLanguage("en");

    const english = employeeSchema.safeParse({
      firstName: " ",
      lastName: "",
      address: "",
      email: "camille",
      title: "DIRECTOR",
    });
    expect(english.success).toBe(false);
    if (english.success) {
      return;
    }
    expect(english.error.issues.map((issue) => issue.message)).toEqual([
      "The employee's first name is required.",
      "The employee's last name is required.",
      "The employee's email address is invalid.",
      "The employee's title is required.",
    ]);

    await i18n.changeLanguage("fr");
    expect(
      employeeSchema.safeParse({ ...VALID, firstName: " " }).error?.issues[0]
        ?.message,
    ).toBe("Le prénom du salarié est obligatoire.");
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

  it("translates the expense item messages at parse time", async () => {
    await i18n.changeLanguage("en");

    const english = expenseItemSchema.safeParse({
      ...VALID,
      code: "gaz ville",
      label: " ",
      proRataPct: "120",
    });
    expect(english.success).toBe(false);
    if (english.success) {
      return;
    }
    expect(english.error.issues.map((issue) => issue.message)).toEqual([
      "Invalid code: letters, digits, hyphens and underscores only.",
      "The label is required.",
      "Pro rata must be between 0 and 100.",
    ]);
    expect(
      expenseItemSchema.safeParse({ ...VALID, sortOrder: 1.5 }).error?.issues[0]
        ?.message,
    ).toBe("Invalid order.");
    expect(
      expenseItemSchema.safeParse({ ...VALID, sortOrder: -1 }).error?.issues[0]
        ?.message,
    ).toBe("The order must be positive.");

    await i18n.changeLanguage("fr");
    expect(
      expenseItemSchema.safeParse({ ...VALID, label: " " }).error?.issues[0]
        ?.message,
    ).toBe("Le libellé est obligatoire.");
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
        issuePlace: "Lyon",
      }).success,
    ).toBe(true);
    expect(
      personSchema.safeParse({
        name: "Mme Locataire",
        address: "",
        issuePlace: "",
      }).success,
    ).toBe(true);
  });

  it("translates the person message at parse time", async () => {
    await i18n.changeLanguage("en");
    expect(
      personSchema.safeParse({ name: " ", address: "" }).error?.issues[0]
        ?.message,
    ).toBe("The person's name is required.");

    await i18n.changeLanguage("fr");
    expect(
      personSchema.safeParse({ name: " ", address: "" }).error?.issues[0]
        ?.message,
    ).toBe("Le nom de la personne est obligatoire.");
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

describe("leaseSchema language", () => {
  const COMPANY_LEASE = {
    companyLease: true,
    landlordId: "1",
    tenantId: "",
    companyId: "3",
    propertyAddress: "12 rue de la République, 75000 Paris",
    rentExclCharges: "1300,00",
    charges: "0,00",
    totalArea: "70",
    businessArea: "25",
  };

  it("translates every lease message at parse time", async () => {
    await i18n.changeLanguage("en");

    const missing = leaseSchema.safeParse({
      ...COMPANY_LEASE,
      landlordId: "",
      companyId: "",
      propertyAddress: "",
      rentExclCharges: "",
      charges: "",
      totalArea: "",
      businessArea: "",
    });
    expect(missing.success).toBe(false);
    if (missing.success) {
      return;
    }
    expect(missing.error.issues.map((issue) => issue.message)).toEqual([
      "Select a landlord.",
      "The property address is required.",
      "Invalid rent excluding charges.",
      "Invalid charges provision.",
      "Select the tenant company.",
      "The total area is required for a company lease.",
      "The business area is required for a company lease.",
    ]);

    const noTenant = leaseSchema.safeParse({
      ...COMPANY_LEASE,
      companyLease: false,
      tenantId: "",
    });
    expect(noTenant.error?.issues[0]?.message).toBe("Select a tenant.");

    const identical = leaseSchema.safeParse({
      ...COMPANY_LEASE,
      companyLease: false,
      tenantId: "1",
    });
    expect(identical.error?.issues[0]?.message).toBe(
      "The landlord and the tenant must be two different people.",
    );

    const invalidTotalArea = leaseSchema.safeParse({
      ...COMPANY_LEASE,
      totalArea: "abc",
    });
    expect(
      invalidTotalArea.error?.issues.find(
        (issue) => issue.path[0] === "totalArea",
      )?.message,
    ).toBe("Invalid total area.");

    const invalidBusinessArea = leaseSchema.safeParse({
      ...COMPANY_LEASE,
      totalArea: "70",
      businessArea: "abc",
    });
    expect(
      invalidBusinessArea.error?.issues.find(
        (issue) => issue.path[0] === "businessArea",
      )?.message,
    ).toBe("Invalid business area.");

    const tooLarge = leaseSchema.safeParse({
      ...COMPANY_LEASE,
      totalArea: "70",
      businessArea: "80",
    });
    expect(
      tooLarge.error?.issues.find((issue) => issue.path[0] === "businessArea")
        ?.message,
    ).toBe("The business area cannot exceed the total area.");

    await i18n.changeLanguage("fr");
    expect(
      leaseSchema.safeParse({ ...COMPANY_LEASE, landlordId: "" }).error
        ?.issues[0]?.message,
    ).toBe("Sélectionnez un bailleur.");
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

  it("translates every llm message at parse time", async () => {
    await i18n.changeLanguage("en");

    const english = llmSchema.safeParse({
      ...VALID,
      url: "ftp://serveur",
      model: " ",
      timeoutSeconds: 2,
      temperature: "3",
      numCtx: 1,
      maxPages: 0,
      extractionPrompt: "court",
    });
    expect(english.success).toBe(false);
    if (english.success) {
      return;
    }
    expect(english.error.issues.map((issue) => issue.message)).toEqual([
      "Invalid URL: http:// or https:// expected.",
      "The model name is required.",
      "The delay must be at least 5 seconds.",
      "Temperature expected between 0 and 2.",
      "The context must be at least 1,024.",
      "At least one page.",
      "The extraction prompt is too short.",
    ]);
    expect(
      llmSchema.shape.timeoutSeconds.safeParse(2.5).error?.issues[0]?.message,
    ).toBe("Invalid delay.");
    expect(
      llmSchema.shape.timeoutSeconds.safeParse(601).error?.issues[0]?.message,
    ).toBe("The delay cannot exceed 600 seconds.");
    expect(
      llmSchema.shape.numCtx.safeParse(1024.5).error?.issues[0]?.message,
    ).toBe("Invalid context.");
    expect(
      llmSchema.shape.numCtx.safeParse(131_073).error?.issues[0]?.message,
    ).toBe("The context cannot exceed 131,072.");
    expect(
      llmSchema.shape.maxPages.safeParse(1.5).error?.issues[0]?.message,
    ).toBe("Invalid page count.");
    expect(
      llmSchema.shape.maxPages.safeParse(21).error?.issues[0]?.message,
    ).toBe("20 pages maximum.");

    await i18n.changeLanguage("fr");
    expect(
      llmSchema.safeParse({ ...VALID, url: "ftp://serveur" }).error?.issues[0]
        ?.message,
    ).toBe("URL invalide : http:// ou https:// attendu.");
    expect(
      llmSchema.safeParse({ ...VALID, extractionPrompt: "court" }).error
        ?.issues[0]?.message,
    ).toBe("Le prompt d'extraction est trop court.");
  });
});
