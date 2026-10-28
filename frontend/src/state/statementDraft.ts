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
const PERSIST_VERSION = 3;

export interface StatementDraftState {
  month: string;
  companyId: number | null;
  linesByMonth: Record<string, DraftLine[]>;
  templatesByMonth: Record<string, number | null>;
  completeByMonth: Record<string, boolean>;
  primedReceiptByMonth: Record<string, number | null>;
  dirtyByMonth: Record<string, boolean>;
  changeMonth: (month: string) => void;
  selectCompany: (companyId: number | null) => void;
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
    companyId?: number,
  ) => void;
}

export type StatementDraftStore = UseBoundStore<StoreApi<StatementDraftState>>;

/**
 * Storage key of one company and month pair. A draft belongs to exactly one
 * company: switching company never reads or submits another company's lines.
 */
export function draftScopeKey(companyId: number | null, month: string): string {
  return `${companyId ?? "none"}:${month}`;
}

const createDraftState: StateCreator<StatementDraftState> = (set, get) => {
  const scopeKey = () => draftScopeKey(get().companyId, get().month);

  return {
    month: currentMonth(),
    companyId: null,
    linesByMonth: {},
    templatesByMonth: {},
    completeByMonth: {},
    primedReceiptByMonth: {},
    dirtyByMonth: {},

    changeMonth: (month) => set({ month }),

    selectCompany: (companyId) => set({ companyId }),

    addLine: (line) => {
      const scope = scopeKey();
      const { linesByMonth } = get();
      set({
        linesByMonth: {
          ...linesByMonth,
          [scope]: [...(linesByMonth[scope] ?? EMPTY_LINES), line],
        },
        dirtyByMonth: { ...get().dirtyByMonth, [scope]: true },
      });
    },

    updateLine: (key, values) => {
      const scope = scopeKey();
      const { linesByMonth, dirtyByMonth } = get();
      const lines = linesByMonth[scope] ?? EMPTY_LINES;
      set({
        linesByMonth: {
          ...linesByMonth,
          [scope]: lines.map((line) =>
            line.key === key ? { ...line, ...values } : line,
          ),
        },
        dirtyByMonth: { ...dirtyByMonth, [scope]: true },
      });
    },

    removeLine: (key) => {
      const scope = scopeKey();
      const { linesByMonth, dirtyByMonth } = get();
      set({
        linesByMonth: {
          ...linesByMonth,
          [scope]: (linesByMonth[scope] ?? EMPTY_LINES).filter(
            (line) => line.key !== key,
          ),
        },
        dirtyByMonth: { ...dirtyByMonth, [scope]: true },
      });
    },

    replaceLines: (lines) => {
      const scope = scopeKey();
      const { linesByMonth, dirtyByMonth } = get();
      set({
        linesByMonth: { ...linesByMonth, [scope]: lines },
        dirtyByMonth: { ...dirtyByMonth, [scope]: true },
      });
    },

    setTemplate: (templateId) => {
      const scope = scopeKey();
      const { templatesByMonth } = get();
      set({ templatesByMonth: { ...templatesByMonth, [scope]: templateId } });
    },

    setComplete: (complete) => {
      const scope = scopeKey();
      const { completeByMonth } = get();
      set({ completeByMonth: { ...completeByMonth, [scope]: complete } });
    },

    markReceiptPrimed: (rentReceiptId) => {
      const scope = scopeKey();
      const { primedReceiptByMonth } = get();
      set({
        primedReceiptByMonth: {
          ...primedReceiptByMonth,
          [scope]: rentReceiptId,
        },
      });
    },

    markGenerated: () => {
      const scope = scopeKey();
      const { dirtyByMonth } = get();
      set({ dirtyByMonth: { ...dirtyByMonth, [scope]: false } });
    },

    loadFromStatement: (statement, activeRentReceiptId, explicitCompanyId) => {
      // A statement always writes into the company that will reopen it: its own
      // company, then the lease company resolved by History, then the current.
      const companyId =
        typeof statement.companyId === "number"
          ? statement.companyId
          : (explicitCompanyId ?? get().companyId);
      const month = statement.month ?? get().month;
      const scope = draftScopeKey(companyId, month);
      const lines = (statement.lines ?? []).map(fromLineDto);
      set({
        companyId,
        month,
        linesByMonth: { ...get().linesByMonth, [scope]: lines },
        templatesByMonth: {
          ...get().templatesByMonth,
          [scope]: statement.templateId ?? null,
        },
        primedReceiptByMonth: {
          ...get().primedReceiptByMonth,
          [scope]: activeRentReceiptId,
        },
        dirtyByMonth: { ...get().dirtyByMonth, [scope]: false },
      });
    },
  };
};

/**
 * Non-persisted draft store starting on a given month and company. Used by
 * scoped editors (for example the company lease statement modal) that must
 * never read or write the global sessionStorage draft of /generer/note-frais.
 */
export function createStatementDraftStore(
  month: string,
  companyId: number | null = null,
) {
  return create<StatementDraftState>()((set, get, api) => ({
    ...createDraftState(set, get, api),
    month,
    companyId,
  }));
}

/** Zustand persist migration drops the old month-only draft shape. */
function migratedDraft(): Record<string, unknown> {
  return {
    month: currentMonth(),
    companyId: null,
    linesByMonth: {},
    templatesByMonth: {},
    completeByMonth: {},
    primedReceiptByMonth: {},
    dirtyByMonth: {},
  };
}

export const useStatementDraft = create<StatementDraftState>()(
  persist(createDraftState, {
    name: "homeofficeexpenses.statement-draft",
    version: PERSIST_VERSION,
    storage: createJSONStorage(() => sessionStorage),
    partialize: (state) => ({
      month: state.month,
      companyId: state.companyId,
      linesByMonth: state.linesByMonth,
      templatesByMonth: state.templatesByMonth,
      completeByMonth: state.completeByMonth,
      primedReceiptByMonth: state.primedReceiptByMonth,
      dirtyByMonth: state.dirtyByMonth,
    }),
    migrate: (persisted, version) =>
      version < PERSIST_VERSION
        ? (migratedDraft() as unknown as StatementDraftState)
        : (persisted as StatementDraftState),
  }),
);

export function useStatementLines(): DraftLine[] {
  const scope = useStatementDraft((state) =>
    draftScopeKey(state.companyId, state.month),
  );
  return useStatementDraft((state) => state.linesByMonth[scope]) ?? EMPTY_LINES;
}

export function useStatementDirty(): boolean {
  const scope = useStatementDraft((state) =>
    draftScopeKey(state.companyId, state.month),
  );
  return useStatementDraft((state) => state.dirtyByMonth[scope]) ?? false;
}
