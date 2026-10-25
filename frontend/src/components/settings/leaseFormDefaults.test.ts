import { describe, expect, it } from "vitest";
import type { LeaseDto } from "@/api/types";
import { buildLeaseDefaults } from "./leaseFormDefaults";

const LEASE: LeaseDto = {
  id: 5,
  companyLease: true,
  companyId: 2,
  landlordId: 1,
  propertyAddress: "12 rue des Lilas, 75011 Paris",
  rentExclCharges: "900.00",
  charges: "50.00",
  totalArea: "70.00",
  businessArea: "25.00",
};

describe("buildLeaseDefaults", () => {
  it("starts a plain lease when there is no item and no preset company", () => {
    const defaults = buildLeaseDefaults(null, null);

    expect(defaults.companyLease).toBe(false);
    expect(defaults.companyId).toBe("");
    expect(defaults.tenantId).toBe("");
    expect(defaults.propertyAddress).toBe("");
    expect(defaults.rentExclCharges).toBe("");
  });

  it("presets a company lease with the company prefilled as tenant", () => {
    const defaults = buildLeaseDefaults(null, 3);

    expect(defaults.companyLease).toBe(true);
    expect(defaults.companyId).toBe("3");
    expect(defaults.tenantId).toBe("");
  });

  it("keeps every field of an existing item untouched", () => {
    const defaults = buildLeaseDefaults(LEASE, 3);

    expect(defaults.companyLease).toBe(true);
    expect(defaults.companyId).toBe("2");
    expect(defaults.landlordId).toBe("1");
    expect(defaults.propertyAddress).toBe("12 rue des Lilas, 75011 Paris");
    expect(defaults.rentExclCharges).toBe("900,00");
    expect(defaults.charges).toBe("50,00");
    expect(defaults.totalArea).toBe("70,00");
    expect(defaults.businessArea).toBe("25,00");
  });
});
