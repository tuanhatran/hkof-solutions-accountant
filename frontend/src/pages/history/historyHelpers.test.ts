import { describe, expect, it } from "vitest";
import type { RentReceiptDto } from "@/api/types";
import {
  current,
  latestReceipt,
  pairLabel,
  sortRentReceiptsDesc,
} from "./historyHelpers";

const RENT_A: RentReceiptDto = {
  id: 1,
  month: "2026-01",
  status: "ACTIVE",
  createdAt: "2026-01-01T10:00:00Z",
  landlordName: "Bailleur",
  tenantName: "Locataire",
};

const RENT_B: RentReceiptDto = {
  id: 2,
  month: "2026-01",
  status: "ARCHIVED",
  createdAt: "2026-01-02T10:00:00Z",
};

describe("historyHelpers", () => {
  it("returns the active document, else the first, else null", () => {
    expect(current([{ status: "ARCHIVED" }, { status: "ACTIVE" }])).toEqual({
      status: "ACTIVE",
    });
    expect(current([{ status: "ARCHIVED" }, { status: "ARCHIVED" }])).toEqual({
      status: "ARCHIVED",
    });
    expect(current([])).toBeNull();
  });

  it("sorts rent receipts by descending creation date then id", () => {
    expect(
      sortRentReceiptsDesc([RENT_A, RENT_B]).map((item) => item.id),
    ).toEqual([2, 1]);
    expect(
      sortRentReceiptsDesc([
        { ...RENT_A, id: 3, createdAt: undefined },
        { ...RENT_A, id: 4, createdAt: undefined },
      ]).map((item) => item.id),
    ).toEqual([4, 3]);
  });

  it("returns the latest receipt and handles an empty list", () => {
    expect(latestReceipt([RENT_A, RENT_B])?.id).toBe(2);
    expect(latestReceipt([])).toBeNull();
  });

  it("labels a pair with fallbacks for unknown people", () => {
    expect(pairLabel(RENT_A)).toBe("Bailleur → Locataire");
    expect(
      pairLabel({ ...RENT_B, landlordName: undefined, tenantName: undefined }),
    ).toBe("Bailleur inconnu → Locataire inconnu");
  });
});
