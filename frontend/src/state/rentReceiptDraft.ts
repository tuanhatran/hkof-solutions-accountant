import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { LeaseDto } from "@/api/types";
import { todayDate, currentMonth, periodOfMonth } from "@/lib/dates";

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
  tenantId: number | null;
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
    tenantId: number | null,
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
      tenantId: null,
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

      selectPair: (landlordId, tenantId, lease) => {
        if (!lease) {
          set({ landlordId, tenantId, initialized: true, dirty: true });
          return;
        }
        set({
          landlordId,
          tenantId,
          rentExclCharges: lease.rentExclCharges ?? "",
          charges: lease.charges ?? "",
          initialized: true,
          dirty: true,
        });
      },

      initializeFromLease: (lease) =>
        set({
          landlordId: lease.landlordId ?? null,
          tenantId: lease.tenantId ?? null,
          rentExclCharges: lease.rentExclCharges ?? "",
          charges: lease.charges ?? "",
          initialized: true,
          dirty: false,
        }),

      resumeFromLease: (lease) =>
        set({
          landlordId: lease.landlordId ?? null,
          tenantId: lease.tenantId ?? null,
          rentExclCharges: lease.rentExclCharges ?? "",
          charges: lease.charges ?? "",
          dirty: true,
        }),

      markGenerated: () => set({ dirty: false }),
    }),
    {
      name: "homeofficeexpenses.receipt-draft",
      version: 3,
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
        tenantId: state.tenantId,
        initialized: state.initialized,
        dirty: state.dirty,
      }),
    },
  ),
);
