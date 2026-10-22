import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { SettingsDto } from "@/api/types";
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
  initializeFromSettings: (settings: SettingsDto) => void;
  resumeFromSettings: (settings: SettingsDto) => void;
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

      initializeFromSettings: (settings) => {
        if (get().initialized) {
          return;
        }
        set({
          rentExclCharges: settings.rentExclCharges ?? "",
          charges: settings.chargesAdvance ?? "",
          initialized: true,
          dirty: false,
        });
      },

      resumeFromSettings: (settings) =>
        set({
          rentExclCharges: settings.rentExclCharges ?? "",
          charges: settings.chargesAdvance ?? "",
          dirty: true,
        }),

      markGenerated: () => set({ dirty: false }),
    }),
    {
      name: "homeofficeexpenses.receipt-draft",
      version: 2,
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
        initialized: state.initialized,
        dirty: state.dirty,
      }),
    },
  ),
);
