import {
  create,
  type StateCreator,
  type StoreApi,
  type UseBoundStore,
} from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StatementDto } from "@/api/types";
import { currentMonth } from "@/lib/dates";
import { fromLineDto, type DraftLine } from "@/lib/lines";

const EMPTY_LINES: DraftLine[] = [];

export interface StatementDraftState {
  month: string;
  linesByMonth: Record<string, DraftLine[]>;
  templatesByMonth: Record<string, number | null>;
  completeByMonth: Record<string, boolean>;
  primedReceiptByMonth: Record<string, number | null>;
  dirtyByMonth: Record<string, boolean>;
  changeMonth: (month: string) => void;
  addLine: (line: DraftLine) => void;
  updateLine: (key: string, values: Partial<DraftLine>) => void;
  removeLine: (key: string) => void;
  replaceLines: (lines: DraftLine[]) => void;
  setTemplate: (templateId: number | null) => void;
  setComplete: (complete: boolean) => void;
  markReceiptPrimed: (rentReceiptId: number | null) => void;
  markGenerated: () => void;
  loadFromStatement: (
    statement: StatementDto,
    activeRentReceiptId: number | null,
  ) => void;
}

export type StatementDraftStore = UseBoundStore<StoreApi<StatementDraftState>>;

const createDraftState: StateCreator<StatementDraftState> = (set, get) => ({
  month: currentMonth(),
  linesByMonth: {},
  templatesByMonth: {},
  completeByMonth: {},
  primedReceiptByMonth: {},
  dirtyByMonth: {},

  changeMonth: (month) => set({ month }),

  addLine: (line) => {
    const { month, linesByMonth } = get();
    set({
      linesByMonth: {
        ...linesByMonth,
        [month]: [...(linesByMonth[month] ?? EMPTY_LINES), line],
      },
      dirtyByMonth: { ...get().dirtyByMonth, [month]: true },
    });
  },

  updateLine: (key, values) => {
    const { month, linesByMonth, dirtyByMonth } = get();
    const lines = linesByMonth[month] ?? EMPTY_LINES;
    set({
      linesByMonth: {
        ...linesByMonth,
        [month]: lines.map((line) =>
          line.key === key ? { ...line, ...values } : line,
        ),
      },
      dirtyByMonth: { ...dirtyByMonth, [month]: true },
    });
  },

  removeLine: (key) => {
    const { month, linesByMonth, dirtyByMonth } = get();
    set({
      linesByMonth: {
        ...linesByMonth,
        [month]: (linesByMonth[month] ?? EMPTY_LINES).filter(
          (line) => line.key !== key,
        ),
      },
      dirtyByMonth: { ...dirtyByMonth, [month]: true },
    });
  },

  replaceLines: (lines) => {
    const { month, linesByMonth, dirtyByMonth } = get();
    set({
      linesByMonth: { ...linesByMonth, [month]: lines },
      dirtyByMonth: { ...dirtyByMonth, [month]: true },
    });
  },

  setTemplate: (templateId) => {
    const { month, templatesByMonth } = get();
    set({ templatesByMonth: { ...templatesByMonth, [month]: templateId } });
  },

  setComplete: (complete) => {
    const { month, completeByMonth } = get();
    set({ completeByMonth: { ...completeByMonth, [month]: complete } });
  },

  markReceiptPrimed: (rentReceiptId) => {
    const { month, primedReceiptByMonth } = get();
    set({
      primedReceiptByMonth: {
        ...primedReceiptByMonth,
        [month]: rentReceiptId,
      },
    });
  },

  markGenerated: () => {
    const { month, dirtyByMonth } = get();
    set({ dirtyByMonth: { ...dirtyByMonth, [month]: false } });
  },

  loadFromStatement: (statement, activeRentReceiptId) => {
    const month = statement.month ?? get().month;
    const lines = (statement.lines ?? []).map(fromLineDto);
    set({
      month,
      linesByMonth: { ...get().linesByMonth, [month]: lines },
      templatesByMonth: {
        ...get().templatesByMonth,
        [month]: statement.templateId ?? null,
      },
      primedReceiptByMonth: {
        ...get().primedReceiptByMonth,
        [month]: activeRentReceiptId,
      },
      dirtyByMonth: { ...get().dirtyByMonth, [month]: false },
    });
  },
});

/**
 * Non-persisted draft store starting on a given month. Used by scoped editors
 * (for example the company lease statement modal) that must never read or
 * write the global sessionStorage draft of /generer/note-frais.
 */
export function createStatementDraftStore(month: string) {
  return create<StatementDraftState>()((set, get, api) => ({
    ...createDraftState(set, get, api),
    month,
  }));
}

export const useStatementDraft = create<StatementDraftState>()(
  persist(createDraftState, {
    name: "homeofficeexpenses.statement-draft",
    version: 2,
    storage: createJSONStorage(() => sessionStorage),
    partialize: (state) => ({
      month: state.month,
      linesByMonth: state.linesByMonth,
      templatesByMonth: state.templatesByMonth,
      completeByMonth: state.completeByMonth,
      primedReceiptByMonth: state.primedReceiptByMonth,
      dirtyByMonth: state.dirtyByMonth,
    }),
  }),
);

export function useStatementLines(): DraftLine[] {
  const month = useStatementDraft((state) => state.month);
  return useStatementDraft((state) => state.linesByMonth[month]) ?? EMPTY_LINES;
}

export function useStatementDirty(): boolean {
  const month = useStatementDraft((state) => state.month);
  return useStatementDraft((state) => state.dirtyByMonth[month]) ?? false;
}
