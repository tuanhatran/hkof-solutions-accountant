import { describe, expect, it } from "vitest";
import type { ExpenseItemDto } from "@/api/types";
import {
  buildRentLine,
  fromLineDto,
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
    periodStart: "2026-09-01",
    periodEnd: "2026-10-31",
    monthlyAmountOverride: "",
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
      periodStart: "2026-09-01",
      periodEnd: "2026-10-31",
      receiptId: 12,
      amountSource: "AI",
      aiDetectedAmount: "120.00",
      aiConfidence: "haute",
    });
  });

  it("omits unfilled optional fields", () => {
    const request = toLineRequest(
      line({
        periodStart: "",
        periodEnd: "",
        receiptId: null,
        monthlyAmountOverride: "",
      }),
    );
    expect(request.periodStart).toBeUndefined();
    expect(request.periodEnd).toBeUndefined();
    expect(request.receiptId).toBeUndefined();
    expect(request.monthlyAmountOverride).toBeUndefined();
  });

  it("adds the month override when provided", () => {
    const request = toLineRequest(line({ monthlyAmountOverride: "60,98" }));
    expect(request.monthlyAmountOverride).toBe("60.98");
  });

  it("rejects invalid amounts, pro-rata values and periods", () => {
    expect(() => toLineRequest(line({ amountInclVat: "0" }))).not.toThrow();
    expect(() => toLineRequest(line({ amountInclVat: "abc" }))).toThrow(
      "Le montant TTC est invalide.",
    );
    expect(() => toLineRequest(line({ proRataPct: "150" }))).toThrow(
      "Le prorata est invalide.",
    );
    expect(() => toLineRequest(line({ periodStart: "2026-02-30" }))).toThrow(
      "La période facturée est invalide.",
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
      periodStart: "2026-09-01",
      periodEnd: "2026-10-31",
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
});
