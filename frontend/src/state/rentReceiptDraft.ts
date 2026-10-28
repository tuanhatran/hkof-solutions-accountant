import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { RentReceiptDraftDto } from "@/api/endpoints";
import type { LeaseDto } from "@/api/types";
import { todayDate, currentMonth, periodOfMonth } from "@/lib/dates";
import { tenantKeyFromLease } from "@/lib/validation";

/** Editable values compared to the baseline captured at init/select/load/save. */
interface DraftSnapshot {
  month: string;
  periodStart: string;
  periodEnd: string;
  rentExclCharges: string;
  charges: string;
  paymentDate: string;
  issueDate: string;
  templateId: number | null;
  landlordId: number | null;
  tenantKey: string | null;
}

interface RentReceiptDraftState extends DraftSnapshot {
  initialized: boolean;
  dirty: boolean;
  baseline: DraftSnapshot | null;
  draftId: number | null;
  savedAt: string | null;
  changeMonth: (month: string) => void;
  update: (
    values: Partial<
      Pick<
        RentReceiptDraftState,
        | "periodStart"
        | "periodEnd"
        | "rentExclCharges"
        | "charges"
        | "paymentDate"
        | "issueDate"
      >
    >,
  ) => void;
  setTemplate: (templateId: number | null) => void;
  selectPair: (
    landlordId: number | null,
    tenantKey: string | null,
    lease: LeaseDto | null,
  ) => void;
  initializeFromLease: (lease: LeaseDto) => void;
  resumeFromLease: (lease: LeaseDto) => void;
  /** Hydrates the form from a server draft without marking it dirty. */
  loadFromDraft: (draft: RentReceiptDraftDto) => void;
  /** Records a successful save: the current values become the new baseline. */
  markSaved: (draft: RentReceiptDraftDto) => void;
  markGenerated: () => void;
}

const initialMonth = currentMonth();
const initialPeriod = periodOfMonth(initialMonth);
const today = todayDate();

function snapshotOf(state: DraftSnapshot): DraftSnapshot {
  return {
    month: state.month,
    periodStart: state.periodStart,
    periodEnd: state.periodEnd,
    rentExclCharges: state.rentExclCharges,
    charges: state.charges,
    paymentDate: state.paymentDate,
    issueDate: state.issueDate,
    templateId: state.templateId,
    landlordId: state.landlordId,
    tenantKey: state.tenantKey,
  };
}

function changedFromBaseline(
  state: DraftSnapshot,
  baseline: DraftSnapshot | null,
): boolean {
  if (!baseline) {
    return true;
  }
  const current = snapshotOf(state);
  return (
    current.month !== baseline.month ||
    current.periodStart !== baseline.periodStart ||
    current.periodEnd !== baseline.periodEnd ||
    current.rentExclCharges !== baseline.rentExclCharges ||
    current.charges !== baseline.charges ||
    current.paymentDate !== baseline.paymentDate ||
    current.issueDate !== baseline.issueDate ||
    current.templateId !== baseline.templateId ||
    current.landlordId !== baseline.landlordId ||
    current.tenantKey !== baseline.tenantKey
  );
}

function tenantKeyOf(draft: RentReceiptDraftDto): string | null {
  if (draft.tenantId !== undefined && draft.tenantId !== null) {
    return `person:${draft.tenantId}`;
  }
  if (draft.tenantCompanyId !== undefined && draft.tenantCompanyId !== null) {
    return `company:${draft.tenantCompanyId}`;
  }
  return null;
}

export const useRentReceiptDraft = create<RentReceiptDraftState>()(
  persist(
    (set, get) => ({
      month: initialMonth,
      periodStart: initialPeriod.start,
      periodEnd: initialPeriod.end,
      rentExclCharges: "",
      charges: "",
      paymentDate: today,
      issueDate: today,
      templateId: null,
      landlordId: null,
      tenantKey: null,
      initialized: false,
      dirty: false,
      baseline: null,
      draftId: null,
      savedAt: null,

      changeMonth: (month) => {
        if (month === get().month) {
          return;
        }
        const period = periodOfMonth(month);
        set((state) => {
          const next = {
            ...state,
            month,
            periodStart: period.start,
            periodEnd: period.end,
          };
          return {
            month,
            periodStart: period.start,
            periodEnd: period.end,
            dirty: changedFromBaseline(next, state.baseline),
          };
        });
      },

      update: (values) =>
        set((state) => {
          const next = { ...state, ...values };
          return {
            ...values,
            dirty: changedFromBaseline(next, state.baseline),
          };
        }),

      setTemplate: (templateId) =>
        set((state) => {
          const next = { ...state, templateId };
          return {
            templateId,
            dirty: changedFromBaseline(next, state.baseline),
          };
        }),

      selectPair: (landlordId, tenantKey, lease) =>
        set((state) => {
          const next = {
            ...state,
            landlordId,
            tenantKey,
            rentExclCharges: lease
              ? (lease.rentExclCharges ?? "")
              : state.rentExclCharges,
            charges: lease ? (lease.charges ?? "") : state.charges,
            initialized: true,
          };
          return {
            landlordId: next.landlordId,
            tenantKey: next.tenantKey,
            rentExclCharges: next.rentExclCharges,
            charges: next.charges,
            initialized: true,
            baseline: snapshotOf(next),
            dirty: false,
          };
        }),

      initializeFromLease: (lease) =>
        set((state) => {
          const next = {
            ...state,
            landlordId: lease.landlordId ?? null,
            tenantKey: tenantKeyFromLease(lease) || null,
            rentExclCharges: lease.rentExclCharges ?? "",
            charges: lease.charges ?? "",
            initialized: true,
          };
          return {
            landlordId: next.landlordId,
            tenantKey: next.tenantKey,
            rentExclCharges: next.rentExclCharges,
            charges: next.charges,
            initialized: true,
            baseline: snapshotOf(next),
            dirty: false,
          };
        }),

      resumeFromLease: (lease) =>
        set((state) => ({
          landlordId: lease.landlordId ?? null,
          tenantKey: tenantKeyFromLease(lease) || null,
          rentExclCharges: lease.rentExclCharges ?? "",
          charges: lease.charges ?? "",
          dirty: true,
          baseline: state.baseline,
        })),

      loadFromDraft: (draft) =>
        set((state) => {
          const next: DraftSnapshot = {
            month: draft.month ?? state.month,
            periodStart: draft.periodStart ?? "",
            periodEnd: draft.periodEnd ?? "",
            rentExclCharges: draft.rentExclCharges ?? "",
            charges: draft.charges ?? "",
            paymentDate: draft.paymentDate ?? "",
            issueDate: draft.issueDate ?? "",
            templateId: draft.templateId ?? null,
            landlordId: draft.landlordId ?? null,
            tenantKey: tenantKeyOf(draft),
          };
          return {
            ...next,
            initialized: true,
            baseline: snapshotOf(next),
            dirty: false,
            draftId: draft.id ?? null,
            savedAt: draft.savedAt ?? null,
          };
        }),

      markSaved: (draft) =>
        set((state) => ({
          baseline: snapshotOf(state),
          dirty: false,
          draftId: draft.id ?? null,
          savedAt: draft.savedAt ?? null,
        })),

      markGenerated: () =>
        set((state) => ({
          baseline: snapshotOf(state),
          dirty: false,
          draftId: null,
          savedAt: null,
        })),
    }),
    {
      name: "homeofficeexpenses.receipt-draft",
      version: 5,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        month: state.month,
        periodStart: state.periodStart,
        periodEnd: state.periodEnd,
        rentExclCharges: state.rentExclCharges,
        charges: state.charges,
        paymentDate: state.paymentDate,
        issueDate: state.issueDate,
        templateId: state.templateId,
        landlordId: state.landlordId,
        tenantKey: state.tenantKey,
        initialized: state.initialized,
        baseline: state.baseline,
      }),
      // A dirty flag is never restored: it is derived from the persisted baseline
      // and the current values after every action.
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<RentReceiptDraftState>),
        dirty: false,
        draftId: null,
        savedAt: null,
      }),
      migrate: (persisted) =>
        ({
          ...(persisted as Partial<RentReceiptDraftState>),
          dirty: false,
          draftId: null,
          savedAt: null,
        }) as RentReceiptDraftState,
    },
  ),
);
