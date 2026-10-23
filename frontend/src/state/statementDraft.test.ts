import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { StatementDto } from "@/api/types";
import type { DraftLine } from "@/lib/lines";
import {
  useStatementDraft,
  useStatementDirty,
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

function resetDraft() {
  useStatementDraft.setState({
    month: MONTH,
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
    expect(state.linesByMonth[MONTH]).toEqual([LINE]);
    expect(state.dirtyByMonth[MONTH]).toBe(true);
  });

  it("updates an existing line and ignores unknown keys", () => {
    useStatementDraft.getState().addLine(LINE);
    useStatementDraft.getState().updateLine("line-1", { amountInclVat: "90.00" });
    useStatementDraft.getState().updateLine("missing", { amountInclVat: "1.00" });

    const lines = useStatementDraft.getState().linesByMonth[MONTH] ?? [];
    expect(lines).toHaveLength(1);
    expect(lines[0]?.amountInclVat).toBe("90.00");
  });

  it("removes a line", () => {
    useStatementDraft.getState().addLine(LINE);
    useStatementDraft.getState().addLine({ ...LINE, key: "line-2" });

    useStatementDraft.getState().removeLine("line-1");

    expect(useStatementDraft.getState().linesByMonth[MONTH]).toHaveLength(1);
    expect(useStatementDraft.getState().linesByMonth[MONTH]?.[0]?.key).toBe(
      "line-2",
    );
  });

  it("replaces every line of the month", () => {
    useStatementDraft.getState().addLine(LINE);
    useStatementDraft.getState().replaceLines([]);

    expect(useStatementDraft.getState().linesByMonth[MONTH]).toEqual([]);
    expect(useStatementDraft.getState().dirtyByMonth[MONTH]).toBe(true);
  });

  it("stores the template and the complete flag per month", () => {
    useStatementDraft.getState().setTemplate(5);
    useStatementDraft.getState().setComplete(false);

    expect(useStatementDraft.getState().templatesByMonth[MONTH]).toBe(5);
    expect(useStatementDraft.getState().completeByMonth[MONTH]).toBe(false);
  });

  it("records the primed receipt and clears the dirty flag on generation", () => {
    useStatementDraft.getState().markReceiptPrimed(8);
    useStatementDraft.getState().addLine(LINE);
    useStatementDraft.getState().markGenerated();

    const state = useStatementDraft.getState();
    expect(state.primedReceiptByMonth[MONTH]).toBe(8);
    expect(state.dirtyByMonth[MONTH]).toBe(false);
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
    expect(state.month).toBe("2026-04");
    expect(state.linesByMonth["2026-04"]).toHaveLength(1);
    expect(state.linesByMonth["2026-04"]?.[0]).toMatchObject({
      itemCode: "gaz",
      amountInclVat: "80.00",
      proRataPct: "35.71",
      amountSource: "AI",
    });
    expect(state.templatesByMonth["2026-04"]).toBe(6);
    expect(state.primedReceiptByMonth["2026-04"]).toBe(12);
    expect(state.dirtyByMonth["2026-04"]).toBe(false);
  });

  it("falls back to the active month and empty lines", () => {
    useStatementDraft.getState().loadFromStatement({}, null);

    const state = useStatementDraft.getState();
    expect(state.month).toBe(MONTH);
    expect(state.linesByMonth[MONTH]).toEqual([]);
    expect(state.templatesByMonth[MONTH]).toBeNull();
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
