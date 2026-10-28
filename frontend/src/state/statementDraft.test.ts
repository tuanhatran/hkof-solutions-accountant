import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { StatementDto } from "@/api/types";
import type { DraftLine } from "@/lib/lines";
import {
  createStatementDraftStore,
  draftScopeKey,
  useStatementDirty,
  useStatementDraft,
  useStatementLines,
} from "./statementDraft";

const LINE: DraftLine = {
  key: "line-1",
  itemCode: "gaz",
  amountInclVat: "80.00",
  proRataPct: "100",
  receiptId: 3,
  receiptName: "facture.pdf",
  amountSource: "MANUAL",
  aiDetectedAmount: null,
  aiConfidence: null,
  detectedSupplier: null,
};

const MONTH = "2026-01";
const KEY = draftScopeKey(null, MONTH);

function resetDraft() {
  useStatementDraft.setState({
    month: MONTH,
    companyId: null,
    linesByMonth: {},
    templatesByMonth: {},
    completeByMonth: {},
    primedReceiptByMonth: {},
    dirtyByMonth: {},
  });
}

beforeEach(resetDraft);

describe("useStatementDraft", () => {
  it("changes the active month", () => {
    useStatementDraft.getState().changeMonth("2026-03");

    expect(useStatementDraft.getState().month).toBe("2026-03");
  });

  it("adds a line to the active month and marks it dirty", () => {
    useStatementDraft.getState().addLine(LINE);

    const state = useStatementDraft.getState();
    expect(state.linesByMonth[KEY]).toEqual([LINE]);
    expect(state.dirtyByMonth[KEY]).toBe(true);
  });

  it("updates an existing line and ignores unknown keys", () => {
    useStatementDraft.getState().addLine(LINE);
    useStatementDraft
      .getState()
      .updateLine("line-1", { amountInclVat: "90.00" });
    useStatementDraft
      .getState()
      .updateLine("missing", { amountInclVat: "1.00" });

    const lines = useStatementDraft.getState().linesByMonth[KEY] ?? [];
    expect(lines).toHaveLength(1);
    expect(lines[0]?.amountInclVat).toBe("90.00");
  });

  it("removes a line", () => {
    useStatementDraft.getState().addLine(LINE);
    useStatementDraft.getState().addLine({ ...LINE, key: "line-2" });

    useStatementDraft.getState().removeLine("line-1");

    expect(useStatementDraft.getState().linesByMonth[KEY]).toHaveLength(1);
    expect(useStatementDraft.getState().linesByMonth[KEY]?.[0]?.key).toBe(
      "line-2",
    );
  });

  it("replaces every line of the month", () => {
    useStatementDraft.getState().addLine(LINE);
    useStatementDraft.getState().replaceLines([]);

    expect(useStatementDraft.getState().linesByMonth[KEY]).toEqual([]);
    expect(useStatementDraft.getState().dirtyByMonth[KEY]).toBe(true);
  });

  it("stores the template and the complete flag per month", () => {
    useStatementDraft.getState().setTemplate(5);
    useStatementDraft.getState().setComplete(false);

    expect(useStatementDraft.getState().templatesByMonth[KEY]).toBe(5);
    expect(useStatementDraft.getState().completeByMonth[KEY]).toBe(false);
  });

  it("records the primed receipt and clears the dirty flag on generation", () => {
    useStatementDraft.getState().markReceiptPrimed(8);
    useStatementDraft.getState().addLine(LINE);
    useStatementDraft.getState().markGenerated();

    const state = useStatementDraft.getState();
    expect(state.primedReceiptByMonth[KEY]).toBe(8);
    expect(state.dirtyByMonth[KEY]).toBe(false);
  });

  it("loads a generated statement into the draft", () => {
    const statement: StatementDto = {
      month: "2026-04",
      templateId: 6,
      lines: [
        {
          itemCode: "gaz",
          amountInclVat: "80.00",
          proRataPct: "35.71",
          receiptId: 3,
          receiptName: "facture.pdf",
          amountSource: "AI",
          aiDetectedAmount: "80.00",
          aiConfidence: "haute",
        },
      ],
    };

    useStatementDraft.getState().loadFromStatement(statement, 12);

    const state = useStatementDraft.getState();
    const april = draftScopeKey(null, "2026-04");
    expect(state.month).toBe("2026-04");
    expect(state.linesByMonth[april]).toHaveLength(1);
    expect(state.linesByMonth[april]?.[0]).toMatchObject({
      itemCode: "gaz",
      amountInclVat: "80.00",
      proRataPct: "35.71",
      amountSource: "AI",
    });
    expect(state.templatesByMonth[april]).toBe(6);
    expect(state.primedReceiptByMonth[april]).toBe(12);
    expect(state.dirtyByMonth[april]).toBe(false);
  });

  it("falls back to the active month and empty lines", () => {
    useStatementDraft.getState().loadFromStatement({}, null);

    const state = useStatementDraft.getState();
    expect(state.month).toBe(MONTH);
    expect(state.linesByMonth[KEY]).toEqual([]);
    expect(state.templatesByMonth[KEY]).toBeNull();
  });

  it("keeps the lines of two companies apart for the same month", () => {
    const draft = useStatementDraft.getState();
    draft.selectCompany(1);
    draft.addLine(LINE);

    draft.selectCompany(2);
    expect(
      useStatementDraft.getState().linesByMonth[draftScopeKey(2, MONTH)],
    ).toBeUndefined();
    useStatementDraft.getState().addLine({ ...LINE, key: "company-2" });

    draft.selectCompany(1);
    expect(
      useStatementDraft.getState().linesByMonth[draftScopeKey(1, MONTH)],
    ).toEqual([LINE]);

    draft.selectCompany(2);
    expect(
      useStatementDraft
        .getState()
        .linesByMonth[draftScopeKey(2, MONTH)]?.map((line) => line.key),
    ).toEqual(["company-2"]);
  });

  it("loads a statement into the scope of its company", () => {
    useStatementDraft
      .getState()
      .loadFromStatement({ month: "2026-04", companyId: 2 }, null);

    const state = useStatementDraft.getState();
    expect(state.companyId).toBe(2);
    expect(state.linesByMonth[draftScopeKey(2, "2026-04")]).toEqual([]);
  });

  it("exposes the current lines and dirty flag through selectors", () => {
    const { result } = renderHook(() => ({
      lines: useStatementLines(),
      dirty: useStatementDirty(),
    }));

    expect(result.current.lines).toEqual([]);
    expect(result.current.dirty).toBe(false);

    act(() => {
      useStatementDraft.getState().addLine(LINE);
    });

    expect(result.current.lines).toEqual([LINE]);
    expect(result.current.dirty).toBe(true);
  });
});

describe("createStatementDraftStore", () => {
  it("starts on the given month and company with empty per-month maps", () => {
    const store = createStatementDraftStore("2026-05", 7);

    const state = store.getState();
    expect(state.month).toBe("2026-05");
    expect(state.companyId).toBe(7);
    expect(state.linesByMonth).toEqual({});
    expect(state.templatesByMonth).toEqual({});
    expect(state.completeByMonth).toEqual({});
    expect(state.primedReceiptByMonth).toEqual({});
    expect(state.dirtyByMonth).toEqual({});
  });

  it("supports the same actions as the global store", () => {
    const store = createStatementDraftStore(MONTH, 1);
    const scoped = draftScopeKey(1, MONTH);

    store.getState().addLine(LINE);
    store.getState().updateLine("line-1", { amountInclVat: "90.00" });
    store.getState().setTemplate(5);
    store.getState().setComplete(false);
    store.getState().markReceiptPrimed(8);
    store.getState().markGenerated();

    const state = store.getState();
    expect(state.linesByMonth[scoped]?.[0]?.amountInclVat).toBe("90.00");
    expect(state.dirtyByMonth[scoped]).toBe(false);
    expect(state.templatesByMonth[scoped]).toBe(5);
    expect(state.completeByMonth[scoped]).toBe(false);
    expect(state.primedReceiptByMonth[scoped]).toBe(8);

    store.getState().removeLine("line-1");
    expect(store.getState().linesByMonth[scoped]).toEqual([]);
  });

  it("stays isolated from the global persisted draft", () => {
    const store = createStatementDraftStore(MONTH, 1);

    store.getState().addLine(LINE);

    expect(useStatementDraft.getState().linesByMonth[KEY]).toBeUndefined();
    useStatementDraft.getState().addLine({ ...LINE, key: "global" });
    expect(store.getState().linesByMonth[draftScopeKey(1, MONTH)]).toHaveLength(
      1,
    );
    expect(
      store.getState().linesByMonth[draftScopeKey(1, MONTH)]?.[0]?.key,
    ).toBe("line-1");
  });

  it("does not persist to the sessionStorage draft key", () => {
    sessionStorage.removeItem("homeofficeexpenses.statement-draft");
    const store = createStatementDraftStore(MONTH, 1);

    store.getState().addLine(LINE);

    expect(
      sessionStorage.getItem("homeofficeexpenses.statement-draft"),
    ).toBeNull();
  });

  it("drives component re-renders through useStore selectors", () => {
    const store = createStatementDraftStore(MONTH, 1);
    const { result } = renderHook(() =>
      store(
        (state) =>
          state.linesByMonth[draftScopeKey(state.companyId, state.month)],
      ),
    );

    expect(result.current).toBeUndefined();
    act(() => {
      store.getState().addLine(LINE);
    });
    expect(result.current).toEqual([LINE]);
  });
});
