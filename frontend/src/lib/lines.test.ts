import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExpenseItemDto } from "@/api/types";
import {
  buildRentLine,
  fromLineDto,
  newKey,
  orderLinesByExpenseItem,
  receiptName,
  typeAlreadyAdded,
  missingTypes,
  toLineRequest,
  type DraftLine,
} from "./lines";

function line(partial: Partial<DraftLine> = {}): DraftLine {
  return {
    key: "ligne-1",
    itemCode: "gaz",
    amountInclVat: "120,00",
    proRataPct: "35,71",
    receiptId: 12,
    receiptName: "facture.pdf",
    amountSource: "MANUAL",
    aiDetectedAmount: null,
    aiConfidence: null,
    detectedSupplier: null,
    ...partial,
  };
}

describe("toLineRequest", () => {
  it("normalizes amounts and keeps metadata", () => {
    const request = toLineRequest(
      line({
        amountSource: "AI",
        aiDetectedAmount: "120.00",
        aiConfidence: "haute",
      }),
    );
    expect(request).toMatchObject({
      itemCode: "gaz",
      amountInclVat: "120.00",
      proRataPct: "35.71",
      receiptId: 12,
      amountSource: "AI",
      aiDetectedAmount: "120.00",
      aiConfidence: "haute",
    });
  });

  it("never sends an invoice period", () => {
    const request = toLineRequest(line());
    expect(request).not.toHaveProperty("periodStart");
    expect(request).not.toHaveProperty("periodEnd");
  });

  it("omits unfilled optional fields", () => {
    const request = toLineRequest(line({ receiptId: null }));
    expect(request.receiptId).toBeUndefined();
  });

  it("rejects invalid amounts and pro-rata values", () => {
    expect(() => toLineRequest(line({ amountInclVat: "0" }))).not.toThrow();
    expect(() => toLineRequest(line({ amountInclVat: "abc" }))).toThrow(
      "Le montant TTC est invalide.",
    );
    expect(() => toLineRequest(line({ proRataPct: "150" }))).toThrow(
      "Le prorata est invalide.",
    );
  });
});

describe("expense type rules", () => {
  const expenseItems: ExpenseItemDto[] = [
    { code: "gaz", label: "Gaz", multipleLinesAllowed: false },
    { code: "telephone", label: "Téléphone", multipleLinesAllowed: true },
  ];

  it("detects an already present type", () => {
    expect(typeAlreadyAdded([line()], "gaz")).toBe(true);
    expect(typeAlreadyAdded([line()], "fibre")).toBe(false);
  });

  it("lists only missing non-multi-line types", () => {
    expect(missingTypes(expenseItems, [line()])).toEqual([]);
    expect(missingTypes(expenseItems, [])).toEqual(["gaz"]);
  });

  it("labels missing types with the code when no label is configured", () => {
    expect(
      missingTypes(
        [
          { code: "gaz", multipleLinesAllowed: false },
          { code: "eau", label: "Eau", multipleLinesAllowed: false },
          { label: "Sans code", multipleLinesAllowed: false },
        ],
        [],
      ),
    ).toEqual(["gaz", "eau"]);
  });
});

describe("orderLinesByExpenseItem", () => {
  const expenseItems: ExpenseItemDto[] = [
    { code: "loyer", label: "Quittance de loyer", sortOrder: 10 },
    { code: "gaz", label: "Gaz", sortOrder: 20 },
    { code: "electricite", label: "Électricité", sortOrder: 30 },
    {
      code: "telephone",
      label: "Téléphone",
      sortOrder: 40,
      multipleLinesAllowed: true,
    },
  ];

  it("sorts lines by the configured sortOrder", () => {
    const ordered = orderLinesByExpenseItem(
      [
        line({ key: "elec", itemCode: "electricite" }),
        line({ key: "gaz", itemCode: "gaz" }),
      ],
      expenseItems,
    );
    expect(ordered.map((entry) => entry.key)).toEqual(["gaz", "elec"]);
  });

  it("keeps the current relative order for equal sortOrder", () => {
    const ordered = orderLinesByExpenseItem(
      [
        line({ key: "gaz-1", itemCode: "gaz" }),
        line({ key: "gaz-2", itemCode: "gaz" }),
        line({ key: "loyer", itemCode: "loyer" }),
      ],
      [
        { code: "loyer", label: "Quittance de loyer", sortOrder: 10 },
        { code: "gaz", label: "Gaz", sortOrder: 20 },
      ],
    );
    expect(ordered.map((entry) => entry.key)).toEqual([
      "loyer",
      "gaz-1",
      "gaz-2",
    ]);
  });

  it("preserves the add order of a repeated multi-line item", () => {
    const ordered = orderLinesByExpenseItem(
      [
        line({ key: "tel-2", itemCode: "telephone" }),
        line({ key: "gaz", itemCode: "gaz" }),
        line({ key: "tel-1", itemCode: "telephone" }),
      ],
      expenseItems,
    );
    expect(ordered.map((entry) => entry.key)).toEqual([
      "gaz",
      "tel-2",
      "tel-1",
    ]);
  });

  it("sorts unknown item codes last and keeps their relative order", () => {
    const ordered = orderLinesByExpenseItem(
      [
        line({ key: "unknown-1", itemCode: "inconnu" }),
        line({ key: "loyer", itemCode: "loyer" }),
      ],
      expenseItems,
    );
    expect(ordered.map((entry) => entry.key)).toEqual(["loyer", "unknown-1"]);
  });

  it("does not mutate the input list", () => {
    const input = [
      line({ key: "gaz", itemCode: "gaz" }),
      line({ key: "loyer", itemCode: "loyer" }),
    ];
    orderLinesByExpenseItem(input, expenseItems);
    expect(input.map((entry) => entry.key)).toEqual(["gaz", "loyer"]);
  });
});

describe("rent draft", () => {
  it("creates a line without receipt and with a pro-rata", () => {
    const rent = buildRentLine("950,00", "100");
    expect(rent.itemCode).toBe("loyer");
    expect(rent.amountInclVat).toBe("950,00");
    expect(rent.proRataPct).toBe("100");
    expect(rent.receiptId).toBeNull();
    expect(rent.key).not.toHaveLength(0);
  });

  it("reloads a line from a DTO", () => {
    const reloaded = fromLineDto({
      itemCode: "gaz",
      amountInclVat: "120.00",
      proRataPct: "35.71",
      receiptId: 4,
      receiptName: "facture.pdf",
      amountSource: "AI",
      aiDetectedAmount: "120.00",
      aiConfidence: "haute",
    });
    expect(reloaded.itemCode).toBe("gaz");
    expect(reloaded.receiptName).toBe("facture.pdf");
    expect(reloaded.amountSource).toBe("AI");
    expect(reloaded.key).not.toHaveLength(0);
  });

  it("reloads an incomplete DTO with the neutral defaults", () => {
    const reloaded = fromLineDto({});

    expect(reloaded).toMatchObject({
      itemCode: "",
      amountInclVat: "",
      proRataPct: "100",
      receiptId: null,
      receiptName: null,
      amountSource: "MANUAL",
      aiDetectedAmount: null,
      aiConfidence: null,
      detectedSupplier: null,
    });
  });

  it("falls back on a random key when crypto.randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", undefined);

    expect(newKey()).toMatch(/^line-\d+-[a-z0-9]+$/);
  });

  it("reads the receipt file name, or null without a receipt", () => {
    expect(receiptName({ fileName: "facture.pdf" })).toBe("facture.pdf");
    expect(receiptName(null)).toBeNull();
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
