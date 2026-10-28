import { beforeEach, describe, expect, it } from "vitest";
import type { LeaseDto, RentReceiptDto, StatementDto } from "@/api/types";
import i18n from "@/i18n";
import {
  current,
  groupHistoryByMonthAndAddress,
  latestReceipt,
  pairLabel,
  resolveLeaseForDocument,
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

  it("resolves the pair fallbacks in the current language at call time", async () => {
    await i18n.changeLanguage("en");

    expect(
      pairLabel({ ...RENT_B, landlordName: undefined, tenantName: undefined }),
    ).toBe("Unknown landlord → Unknown tenant");
    // Known names are data, never translated.
    expect(pairLabel(RENT_A)).toBe("Bailleur → Locataire");
  });
});

const LEASE_ALPHA: LeaseDto = {
  id: 5,
  addressId: 51,
  propertyAddress: "1 avenue Alpha",
  landlordId: 1,
  tenantId: 2,
  companyLease: false,
};

/** Same landlord+tenant pair as LEASE_ALPHA: only the lowest id may win. */
const LEASE_ALPHA_OTHER_ADDRESS: LeaseDto = {
  id: 7,
  addressId: 71,
  propertyAddress: "2 avenue Alpha bis",
  landlordId: 1,
  tenantId: 2,
  companyLease: false,
};

const LEASE_COMPANY: LeaseDto = {
  id: 9,
  addressId: 91,
  propertyAddress: "3 avenue Comptable",
  landlordId: 3,
  tenantId: null,
  companyId: 4,
  companyLease: true,
};

const RECEIPT_ALPHA: RentReceiptDto = {
  id: 101,
  month: "2026-01",
  landlordId: 1,
  tenantId: 2,
  tenantCompanyId: null,
  landlordName: "Bailleur",
  tenantName: "Locataire",
  status: "ACTIVE",
};

const RECEIPT_UNMATCHED: RentReceiptDto = {
  id: 102,
  month: "2026-01",
  landlordId: 99,
  tenantId: 99,
  tenantCompanyId: null,
};

const RECEIPT_FEBRUARY: RentReceiptDto = {
  id: 103,
  month: "2026-02",
  landlordId: 1,
  tenantId: 2,
  tenantCompanyId: null,
};

const STATEMENT_ALPHA: StatementDto = {
  id: 201,
  month: "2026-01",
  leaseId: 5,
  status: "ACTIVE",
};

const STATEMENT_COMPANY: StatementDto = {
  id: 202,
  month: "2026-01",
  leaseId: 9,
  status: "ACTIVE",
};

describe("resolveLeaseForDocument", () => {
  it("resolves a statement through its leaseId", () => {
    expect(
      resolveLeaseForDocument(STATEMENT_COMPANY, [LEASE_ALPHA, LEASE_COMPANY]),
    ).toBe(LEASE_COMPANY);
    expect(
      resolveLeaseForDocument({ ...STATEMENT_ALPHA, leaseId: 404 }, []),
    ).toBeNull();
  });

  it("resolves a receipt to the lowest-id lease of its landlord+tenant pair", () => {
    expect(
      resolveLeaseForDocument(RECEIPT_ALPHA, [
        LEASE_ALPHA_OTHER_ADDRESS,
        LEASE_ALPHA,
      ])?.id,
    ).toBe(5);
    expect(
      resolveLeaseForDocument(RECEIPT_UNMATCHED, [LEASE_ALPHA]),
    ).toBeNull();
  });

  it("resolves a company lease whatever its companyId", () => {
    const companyReceipt: RentReceiptDto = {
      id: 104,
      month: "2026-01",
      landlordId: 3,
      tenantId: null,
      tenantCompanyId: 4,
    };
    expect(resolveLeaseForDocument(companyReceipt, [LEASE_COMPANY])?.id).toBe(
      9,
    );
    // History is no longer filtered by an active company: a lease owned by
    // company 4 still matches a receipt whose tenant company is another one.
    expect(
      resolveLeaseForDocument(
        {
          ...RECEIPT_UNMATCHED,
          landlordId: 3,
          tenantId: null,
          tenantCompanyId: 4,
        },
        [LEASE_COMPANY],
      ),
    ).toBe(LEASE_COMPANY);
  });
});

describe("groupHistoryByMonthAndAddress", () => {
  // Grouped per test: the unknown-address label follows the active language.
  let months: ReturnType<typeof groupHistoryByMonthAndAddress>;

  beforeEach(() => {
    months = groupHistoryByMonthAndAddress(
      [RECEIPT_UNMATCHED, RECEIPT_FEBRUARY, RECEIPT_ALPHA],
      [STATEMENT_COMPANY, STATEMENT_ALPHA],
      [LEASE_ALPHA_OTHER_ADDRESS, LEASE_COMPANY, LEASE_ALPHA],
    );
  });

  it("keeps months newest first", () => {
    expect(months.map((group) => group.month)).toEqual(["2026-02", "2026-01"]);
  });

  it("sorts an address row A→Z and puts the unknown address last", () => {
    expect(months[1].addresses.map((address) => address.addressLabel)).toEqual([
      "1 avenue Alpha",
      "3 avenue Comptable",
      "Adresse inconnue",
    ]);
  });

  it("never mixes the documents of two addresses", () => {
    const [alpha, company, unknown] = months[1].addresses;
    expect(alpha.rentReceipts.map((receipt) => receipt.id)).toEqual([101]);
    expect(alpha.statements.map((statement) => statement.id)).toEqual([201]);
    expect(company.rentReceipts).toEqual([]);
    expect(company.statements.map((statement) => statement.id)).toEqual([202]);
    expect(unknown.rentReceipts.map((receipt) => receipt.id)).toEqual([102]);
    expect(unknown.statements).toEqual([]);
  });

  it("keeps every statement version of a month in its address row", () => {
    const versions = Array.from({ length: 5 }, (_, index) => ({
      ...STATEMENT_ALPHA,
      id: 300 + index,
      version: index + 1,
    }));

    const [january] = groupHistoryByMonthAndAddress([], versions, [
      LEASE_ALPHA,
    ]);

    expect(january.addresses).toHaveLength(1);
    expect(january.addresses[0].statements.map((item) => item.id)).toEqual([
      300, 301, 302, 303, 304,
    ]);
  });

  it("relabels the unknown address row when the language changes", async () => {
    await i18n.changeLanguage("en");
    const [january] = groupHistoryByMonthAndAddress(
      [RECEIPT_UNMATCHED],
      [],
      [LEASE_ALPHA],
    );

    expect(january.addresses[0].addressLabel).toBe("Unknown address");
  });

  it("keeps unmatched documents visible and ignores documents without a month", () => {
    const [february] = months;
    expect(february.addresses.map((address) => address.addressKey)).toEqual([
      "address-51",
    ]);
    const result = groupHistoryByMonthAndAddress(
      [{ ...RECEIPT_ALPHA, month: undefined }],
      [],
      [LEASE_ALPHA],
    );
    expect(result).toEqual([]);
  });
});
