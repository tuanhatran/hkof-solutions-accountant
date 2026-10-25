import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { LeaseDto } from "@/api/types";
import { todayDate, currentMonth, periodOfMonth } from "@/lib/dates";
import { tenantKeyFromLease } from "@/lib/validation";

interface RentReceiptDraftState {
  month: string;
  periodStart: string;
  periodEnd: string;
  rentExclCharges: string;
  charges: string;
  paymentDate: string;
  issueDate: string;
  templateId: number | null;
  landlordId: number | null;
  /** Encoded tenant: `person:<id>` or `company:<id>`. */
  tenantKey: string | null;
  initialized: boolean;
  dirty: boolean;
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
  markGenerated: () => void;
}

const initialMonth = currentMonth();
const initialPeriod = periodOfMonth(initialMonth);
const today = todayDate();

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

      changeMonth: (month) => {
        if (month === get().month) {
          return;
        }
        const period = periodOfMonth(month);
        set({
          month,
          periodStart: period.start,
          periodEnd: period.end,
          dirty: true,
        });
      },

      update: (values) => set({ ...values, dirty: true }),

      setTemplate: (templateId) => set({ templateId, dirty: true }),

      selectPair: (landlordId, tenantKey, lease) => {
        if (!lease) {
          set({ landlordId, tenantKey, initialized: true, dirty: true });
          return;
        }
        set({
          landlordId,
          tenantKey,
          rentExclCharges: lease.rentExclCharges ?? "",
          charges: lease.charges ?? "",
          initialized: true,
          dirty: true,
        });
      },

      initializeFromLease: (lease) =>
        set({
          landlordId: lease.landlordId ?? null,
          tenantKey: tenantKeyFromLease(lease) || null,
          rentExclCharges: lease.rentExclCharges ?? "",
          charges: lease.charges ?? "",
          initialized: true,
          dirty: false,
        }),

      resumeFromLease: (lease) =>
        set({
          landlordId: lease.landlordId ?? null,
          tenantKey: tenantKeyFromLease(lease) || null,
          rentExclCharges: lease.rentExclCharges ?? "",
          charges: lease.charges ?? "",
          dirty: true,
        }),

      markGenerated: () => set({ dirty: false }),
    }),
    {
      name: "homeofficeexpenses.receipt-draft",
      version: 4,
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
        dirty: state.dirty,
      }),
    },
  ),
);
