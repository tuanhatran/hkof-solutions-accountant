import { beforeEach, describe, expect, it } from "vitest";
import type { LeaseDto } from "@/api/types";
import { useRentReceiptDraft } from "./rentReceiptDraft";

const LEASE: LeaseDto = {
  id: 1,
  landlordId: 4,
  tenantId: 7,
  rentExclCharges: "1300.00",
  charges: "50.00",
};

function resetDraft() {
  useRentReceiptDraft.setState({
    month: "2026-01",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    rentExclCharges: "",
    charges: "",
    paymentDate: "2026-01-05",
    issueDate: "2026-01-05",
    templateId: null,
    landlordId: null,
    tenantKey: null,
    initialized: false,
    dirty: false,
    baseline: null,
    draftId: null,
    savedAt: null,
  });
}

beforeEach(resetDraft);

describe("useRentReceiptDraft", () => {
  it("changes the month and recomputes the period", () => {
    useRentReceiptDraft.getState().changeMonth("2026-02");

    const state = useRentReceiptDraft.getState();
    expect(state.month).toBe("2026-02");
    expect(state.periodStart).toBe("2026-02-01");
    expect(state.periodEnd).toBe("2026-02-28");
    expect(state.dirty).toBe(true);
  });

  it("ignores a change to the current month", () => {
    useRentReceiptDraft.getState().changeMonth("2026-01");

    const state = useRentReceiptDraft.getState();
    expect(state.periodStart).toBe("2026-01-01");
    expect(state.dirty).toBe(false);
  });

  it("updates values and marks the draft dirty", () => {
    useRentReceiptDraft.getState().update({
      periodStart: "2026-01-02",
      rentExclCharges: "1200,00",
    });

    const state = useRentReceiptDraft.getState();
    expect(state.periodStart).toBe("2026-01-02");
    expect(state.rentExclCharges).toBe("1200,00");
    expect(state.dirty).toBe(true);
  });

  it("stores the selected template and marks the draft dirty", () => {
    useRentReceiptDraft.getState().setTemplate(9);

    expect(useRentReceiptDraft.getState().templateId).toBe(9);
    expect(useRentReceiptDraft.getState().dirty).toBe(true);
  });

  it("selects a pair and copies the lease amounts without marking it dirty", () => {
    useRentReceiptDraft.getState().selectPair(4, "person:7", LEASE);

    const state = useRentReceiptDraft.getState();
    expect(state.landlordId).toBe(4);
    expect(state.tenantKey).toBe("person:7");
    expect(state.rentExclCharges).toBe("1300.00");
    expect(state.charges).toBe("50.00");
    expect(state.initialized).toBe(true);
    expect(state.dirty).toBe(false);
  });

  it("selects a pair without a lease and clears nothing else", () => {
    useRentReceiptDraft.setState({ rentExclCharges: "900.00" });

    useRentReceiptDraft.getState().selectPair(4, null, null);

    const state = useRentReceiptDraft.getState();
    expect(state.landlordId).toBe(4);
    expect(state.tenantKey).toBeNull();
    expect(state.rentExclCharges).toBe("900.00");
    expect(state.initialized).toBe(true);
    expect(state.dirty).toBe(false);
  });

  it("initializes from a lease without keeping the dirty flag", () => {
    useRentReceiptDraft.getState().initializeFromLease(LEASE);

    const state = useRentReceiptDraft.getState();
    expect(state.landlordId).toBe(4);
    expect(state.tenantKey).toBe("person:7");
    expect(state.rentExclCharges).toBe("1300.00");
    expect(state.charges).toBe("50.00");
    expect(state.initialized).toBe(true);
    expect(state.dirty).toBe(false);
  });

  it("falls back to empty values when the lease has no amount", () => {
    useRentReceiptDraft.getState().initializeFromLease({ id: 2 });

    const state = useRentReceiptDraft.getState();
    expect(state.landlordId).toBeNull();
    expect(state.tenantKey).toBeNull();
    expect(state.rentExclCharges).toBe("");
    expect(state.charges).toBe("");
  });

  it("resumes from a lease and marks the draft dirty", () => {
    useRentReceiptDraft.getState().resumeFromLease(LEASE);

    expect(useRentReceiptDraft.getState().dirty).toBe(true);
    expect(useRentReceiptDraft.getState().rentExclCharges).toBe("1300.00");
  });

  it("clears the dirty flag once the receipt is generated", () => {
    useRentReceiptDraft.setState({ dirty: true });
    useRentReceiptDraft.getState().markGenerated();

    const state = useRentReceiptDraft.getState();
    expect(state.dirty).toBe(false);
    expect(state.draftId).toBeNull();
    expect(state.savedAt).toBeNull();
  });

  it("keeps auto-prefill and default template out of the dirty state", () => {
    useRentReceiptDraft.getState().selectPair(4, "person:7", LEASE);

    const state = useRentReceiptDraft.getState();
    expect(state.dirty).toBe(false);
    expect(state.templateId).toBeNull();
  });

  it("hydrates a server draft without marking it dirty", () => {
    useRentReceiptDraft.getState().loadFromDraft({
      id: 21,
      month: "2026-03",
      landlordId: 4,
      tenantId: 7,
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
      rentExclCharges: "1250.00",
      charges: "45.00",
      paymentDate: "2026-03-05",
      issueDate: "2026-03-05",
      templateId: 9,
      savedAt: "2026-10-05T09:30:00Z",
    });

    const state = useRentReceiptDraft.getState();
    expect(state.month).toBe("2026-03");
    expect(state.tenantKey).toBe("person:7");
    expect(state.rentExclCharges).toBe("1250.00");
    expect(state.templateId).toBe(9);
    expect(state.draftId).toBe(21);
    expect(state.savedAt).toBe("2026-10-05T09:30:00Z");
    expect(state.dirty).toBe(false);
  });

  it("records a successful save and clears the dirty state", () => {
    useRentReceiptDraft.getState().selectPair(4, "person:7", LEASE);
    useRentReceiptDraft.getState().update({ rentExclCharges: "1250.00" });
    expect(useRentReceiptDraft.getState().dirty).toBe(true);

    useRentReceiptDraft.getState().markSaved({
      id: 22,
      month: "2026-01",
      landlordId: 4,
      tenantId: 7,
      savedAt: "2026-10-05T10:00:00Z",
    });

    const state = useRentReceiptDraft.getState();
    expect(state.dirty).toBe(false);
    expect(state.draftId).toBe(22);
    expect(state.savedAt).toBe("2026-10-05T10:00:00Z");
  });

  it("ignores a stale dirty flag restored from sessionStorage", async () => {
    sessionStorage.setItem(
      "homeofficeexpenses.receipt-draft",
      JSON.stringify({
        state: { month: "2026-01", rentExclCharges: "1300.00", dirty: true },
        version: 5,
      }),
    );

    await useRentReceiptDraft.persist.rehydrate();

    expect(useRentReceiptDraft.getState().month).toBe("2026-01");
    expect(useRentReceiptDraft.getState().dirty).toBe(false);
  });
});
