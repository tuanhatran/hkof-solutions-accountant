import { describe, expect, it } from "vitest";
import type { LeaseDto, RentReceiptDto } from "@/api/types";
import { latestReceiptForMonth, matchesLease } from "./leaseReceipts";

const NATURAL_LEASE: LeaseDto = {
  id: 10,
  addressId: 4,
  landlordId: 1,
  tenantId: 2,
  landlordName: "M. Bailleur",
  tenantName: "Mme Locataire",
  propertyAddress: "12 rue de la République, 75000 Paris",
  rentExclCharges: "1300.00",
  charges: "50.00",
};

const COMPANY_LEASE: LeaseDto = {
  id: 11,
  addressId: 4,
  landlordId: 1,
  tenantId: null,
  companyId: 3,
  companyName: "HKOF",
  companyLease: true,
  landlordName: "M. Bailleur",
  tenantName: "HKOF",
  propertyAddress: "12 rue de la République, 75000 Paris",
  rentExclCharges: "1300.00",
  charges: "50.00",
};

function receipt(overrides: Partial<RentReceiptDto>): RentReceiptDto {
  return {
    id: 101,
    month: "2026-09",
    landlordId: 1,
    tenantId: 2,
    tenantCompanyId: null,
    total: "1350.00",
    version: 1,
    status: "ACTIVE",
    createdAt: "2026-09-30T10:00:00Z",
    ...overrides,
  };
}

describe("matchesLease", () => {
  it("matches a natural lease on the same pair without a company tenant", () => {
    expect(matchesLease(receipt({}), NATURAL_LEASE)).toBe(true);
    expect(matchesLease(receipt({ tenantId: 999 }), NATURAL_LEASE)).toBe(false);
    expect(matchesLease(receipt({ tenantCompanyId: 3 }), NATURAL_LEASE)).toBe(
      false,
    );
    expect(matchesLease(receipt({ landlordId: 8 }), NATURAL_LEASE)).toBe(false);
  });

  it("matches a company lease on its own tenant company", () => {
    expect(
      matchesLease(
        receipt({ tenantId: null, tenantCompanyId: 3 }),
        COMPANY_LEASE,
      ),
    ).toBe(true);
    expect(
      matchesLease(
        receipt({ tenantId: 2, tenantCompanyId: null }),
        COMPANY_LEASE,
      ),
    ).toBe(false);
    expect(
      matchesLease(
        receipt({ tenantId: null, tenantCompanyId: 7 }),
        COMPANY_LEASE,
      ),
    ).toBe(false);
  });

  it("matches nothing for a company lease without a company id", () => {
    const lease = { ...COMPANY_LEASE, companyId: null };
    expect(
      matchesLease(receipt({ tenantId: null, tenantCompanyId: null }), lease),
    ).toBe(false);
    expect(
      matchesLease(receipt({ tenantId: null, tenantCompanyId: 3 }), lease),
    ).toBe(false);
  });

  it("treats absent tenant identifiers as null", () => {
    expect(
      matchesLease(receipt({ tenantId: undefined }), {
        ...NATURAL_LEASE,
        tenantId: undefined,
      }),
    ).toBe(true);
  });
});

describe("latestReceiptForMonth", () => {
  it("returns the matching ACTIVE receipt of the month with the highest version", () => {
    const receipts = [
      receipt({ id: 1, version: 1 }),
      receipt({ id: 2, version: 3 }),
      receipt({ id: 3, version: 2 }),
    ];

    expect(latestReceiptForMonth(receipts, NATURAL_LEASE, "2026-09")?.id).toBe(
      2,
    );
  });

  it("breaks a version tie on the highest id", () => {
    const receipts = [
      receipt({ id: 5, version: 2 }),
      receipt({ id: 9, version: 2 }),
    ];

    expect(latestReceiptForMonth(receipts, NATURAL_LEASE, "2026-09")?.id).toBe(
      9,
    );
  });

  it("ignores other months, archived versions and other leases", () => {
    const receipts = [
      receipt({ id: 1, month: "2026-08" }),
      receipt({ id: 2, status: "ARCHIVED", version: 9 }),
      receipt({ id: 3, tenantId: 999 }),
      receipt({ id: 4, version: 1 }),
    ];

    expect(latestReceiptForMonth(receipts, NATURAL_LEASE, "2026-09")?.id).toBe(
      4,
    );
  });

  it("returns null without a matching receipt and tolerates an undefined list", () => {
    expect(latestReceiptForMonth([], NATURAL_LEASE, "2026-09")).toBeNull();
    expect(
      latestReceiptForMonth(undefined, NATURAL_LEASE, "2026-09"),
    ).toBeNull();
  });

  it("defaults a missing version to 1 and never picks another lease's receipt", () => {
    const receipts = [
      receipt({ id: 1, version: undefined }),
      receipt({ id: 2, version: 4, tenantId: null, tenantCompanyId: 7 }),
    ];

    expect(
      latestReceiptForMonth(receipts, COMPANY_LEASE, "2026-09"),
    ).toBeNull();
    expect(latestReceiptForMonth(receipts, NATURAL_LEASE, "2026-09")?.id).toBe(
      1,
    );
  });
});
