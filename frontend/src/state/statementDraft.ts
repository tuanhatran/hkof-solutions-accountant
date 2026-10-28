import {
  create,
  type StateCreator,
  type StoreApi,
  type UseBoundStore,
} from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StatementDraftDto } from "@/api/endpoints";
import type { StatementDto } from "@/api/types";
import { currentMonth } from "@/lib/dates";
import { fromLineDto, newKey, type DraftLine } from "@/lib/lines";

const EMPTY_LINES: DraftLine[] = [];
const PERSIST_VERSION = 4;

export interface StatementDraftState {
  month: string;
  companyId: number | null;
  linesByMonth: Record<string, DraftLine[]>;
  templatesByMonth: Record<string, number | null>;
  completeByMonth: Record<string, boolean>;
  primedReceiptByMonth: Record<string, number | null>;
  dirtyByMonth: Record<string, boolean>;
  /** Lines captured at init/load/save/generation, per company and month scope. */
  baselineByMonth: Record<string, DraftLine[]>;
  draftIdByMonth: Record<string, number | null>;
  savedAtByMonth: Record<string, string | null>;
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
  /** Hydrates the current scope from a server draft without marking it dirty. */
  loadFromServerDraft: (draft: StatementDraftDto) => void;
  /** Records a successful save: the current lines become the new baseline. */
  markSaved: (draft: StatementDraftDto) => void;
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

function lineSignature(line: DraftLine): string {
  return [
    line.itemCode,
    line.amountInclVat,
    line.proRataPct,
    line.receiptId ?? "",
    line.amountSource,
    line.aiDetectedAmount ?? "",
    line.aiConfidence ?? "",
  ].join("|");
}

/** Content comparison ignoring the client-only line key. */
export function sameLines(left: DraftLine[], right: DraftLine[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every(
    (line, index) => lineSignature(line) === lineSignature(right[index]!),
  );
}

/** Converts a saved draft line back into an editable draft line. */
export function draftLineFromSaved(
  line: NonNullable<StatementDraftDto["lines"]>[number],
): DraftLine {
  return {
    key: newKey(),
    itemCode: line.itemCode ?? "",
    amountInclVat: line.amountInclVat ?? "",
    proRataPct: line.proRataPct ?? "100",
    receiptId: line.receiptId ?? null,
    receiptName: null,
    amountSource: (line.amountSource as DraftLine["amountSource"]) ?? "MANUAL",
    aiDetectedAmount: line.aiDetectedAmount ?? null,
    aiConfidence: (line.aiConfidence as DraftLine["aiConfidence"]) ?? null,
    detectedSupplier: null,
  };
}

const createDraftState: StateCreator<StatementDraftState> = (set, get) => {
  const scopeKey = () => draftScopeKey(get().companyId, get().month);

  const dirtyFor = (
    scope: string,
    lines: DraftLine[],
    state: StatementDraftState,
  ): boolean => !sameLines(lines, state.baselineByMonth[scope] ?? EMPTY_LINES);

  return {
    month: currentMonth(),
    companyId: null,
    linesByMonth: {},
    templatesByMonth: {},
    completeByMonth: {},
    primedReceiptByMonth: {},
    dirtyByMonth: {},
    baselineByMonth: {},
    draftIdByMonth: {},
    savedAtByMonth: {},

    changeMonth: (month) => set({ month }),

    selectCompany: (companyId) => set({ companyId }),

    addLine: (line) => {
      const scope = scopeKey();
      const state = get();
      const lines = [...(state.linesByMonth[scope] ?? EMPTY_LINES), line];
      set({
        linesByMonth: { ...state.linesByMonth, [scope]: lines },
        dirtyByMonth: {
          ...state.dirtyByMonth,
          [scope]: dirtyFor(scope, lines, state),
        },
      });
    },

    updateLine: (key, values) => {
      const scope = scopeKey();
      const state = get();
      const lines = (state.linesByMonth[scope] ?? EMPTY_LINES).map((line) =>
        line.key === key ? { ...line, ...values } : line,
      );
      set({
        linesByMonth: { ...state.linesByMonth, [scope]: lines },
        dirtyByMonth: {
          ...state.dirtyByMonth,
          [scope]: dirtyFor(scope, lines, state),
        },
      });
    },

    removeLine: (key) => {
      const scope = scopeKey();
      const state = get();
      const lines = (state.linesByMonth[scope] ?? EMPTY_LINES).filter(
        (line) => line.key !== key,
      );
      set({
        linesByMonth: { ...state.linesByMonth, [scope]: lines },
        dirtyByMonth: {
          ...state.dirtyByMonth,
          [scope]: dirtyFor(scope, lines, state),
        },
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
      const state = get();
      set({
        dirtyByMonth: { ...state.dirtyByMonth, [scope]: false },
        baselineByMonth: {
          ...state.baselineByMonth,
          [scope]: state.linesByMonth[scope] ?? EMPTY_LINES,
        },
        draftIdByMonth: { ...state.draftIdByMonth, [scope]: null },
        savedAtByMonth: { ...state.savedAtByMonth, [scope]: null },
      });
    },

    loadFromServerDraft: (draft) => {
      const companyId = draft.companyId ?? get().companyId;
      const month = draft.month ?? get().month;
      const scope = draftScopeKey(companyId, month);
      const lines = (draft.lines ?? []).map(draftLineFromSaved);
      const state = get();
      set({
        companyId,
        month,
        linesByMonth: { ...state.linesByMonth, [scope]: lines },
        templatesByMonth: {
          ...state.templatesByMonth,
          [scope]: draft.templateId ?? null,
        },
        completeByMonth: {
          ...state.completeByMonth,
          [scope]: draft.complete ?? true,
        },
        baselineByMonth: { ...state.baselineByMonth, [scope]: lines },
        dirtyByMonth: { ...state.dirtyByMonth, [scope]: false },
        draftIdByMonth: {
          ...state.draftIdByMonth,
          [scope]: draft.id ?? null,
        },
        savedAtByMonth: {
          ...state.savedAtByMonth,
          [scope]: draft.savedAt ?? null,
        },
      });
    },

    markSaved: (draft) => {
      const companyId = draft.companyId ?? get().companyId;
      const month = draft.month ?? get().month;
      const scope = draftScopeKey(companyId, month);
      const state = get();
      set({
        companyId,
        month,
        baselineByMonth: {
          ...state.baselineByMonth,
          [scope]: state.linesByMonth[scope] ?? EMPTY_LINES,
        },
        dirtyByMonth: { ...state.dirtyByMonth, [scope]: false },
        draftIdByMonth: {
          ...state.draftIdByMonth,
          [scope]: draft.id ?? null,
        },
        savedAtByMonth: {
          ...state.savedAtByMonth,
          [scope]: draft.savedAt ?? null,
        },
      });
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
      const state = get();
      set({
        companyId,
        month,
        linesByMonth: { ...state.linesByMonth, [scope]: lines },
        templatesByMonth: {
          ...state.templatesByMonth,
          [scope]: statement.templateId ?? null,
        },
        primedReceiptByMonth: {
          ...state.primedReceiptByMonth,
          [scope]: activeRentReceiptId,
        },
        baselineByMonth: { ...state.baselineByMonth, [scope]: lines },
        dirtyByMonth: { ...state.dirtyByMonth, [scope]: false },
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
    baselineByMonth: {},
    draftIdByMonth: {},
    savedAtByMonth: {},
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
      baselineByMonth: state.baselineByMonth,
    }),
    // The dirty flag is derived from the persisted baseline on restore, so a
    // stale flag never blocks navigation after a reload.
    merge: (persisted, current) => {
      const merged = {
        ...current,
        ...(persisted as Partial<StatementDraftState>),
      };
      const dirtyByMonth: Record<string, boolean> = {};
      for (const [scope, lines] of Object.entries(merged.linesByMonth ?? {})) {
        dirtyByMonth[scope] = !sameLines(
          lines ?? EMPTY_LINES,
          merged.baselineByMonth?.[scope] ?? EMPTY_LINES,
        );
      }
      return { ...merged, dirtyByMonth };
    },
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
