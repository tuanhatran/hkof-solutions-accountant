import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { SettingsDto } from "@/api/types";
import { todayDate, currentMonth, periodOfMonth } from "@/lib/dates";

interface RentReceiptDraftState {
  mois: string;
  periodeDebut: string;
  periodeFin: string;
  loyerHc: string;
  charges: string;
  datePaiement: string;
  dateEmission: string;
  templateId: number | null;
  initialise: boolean;
  dirty: boolean;
  changerMois: (month: string) => void;
  modifier: (
    values: Partial<
      Pick<
        RentReceiptDraftState,
        | "periodeDebut"
        | "periodeFin"
        | "loyerHc"
        | "charges"
        | "datePaiement"
        | "dateEmission"
      >
    >,
  ) => void;
  definirTemplate: (templateId: number | null) => void;
  initialiserDepuisParametres: (settings: SettingsDto) => void;
  reprendreDepuisParametres: (settings: SettingsDto) => void;
  marquerGenere: () => void;
}

const initialMonth = currentMonth();
const initialPeriod = periodOfMonth(initialMonth);
const today = todayDate();

export const useRentReceiptDraft = create<RentReceiptDraftState>()(
  persist(
    (set, get) => ({
      mois: initialMonth,
      periodeDebut: initialPeriod.debut,
      periodeFin: initialPeriod.fin,
      loyerHc: "",
      charges: "",
      datePaiement: today,
      dateEmission: today,
      templateId: null,
      initialise: false,
      dirty: false,

      changerMois: (month) => {
        if (month === get().mois) {
          return;
        }
        const period = periodOfMonth(month);
        set({
          mois: month,
          periodeDebut: period.debut,
          periodeFin: period.fin,
          dirty: true,
        });
      },

      modifier: (values) => set({ ...values, dirty: true }),

      definirTemplate: (templateId) => set({ templateId, dirty: true }),

      initialiserDepuisParametres: (settings) => {
        if (get().initialise) {
          return;
        }
        set({
          loyerHc: settings.rentExclCharges ?? "",
          charges: settings.chargesAdvance ?? "",
          initialise: true,
          dirty: false,
        });
      },

      reprendreDepuisParametres: (settings) =>
        set({
          loyerHc: settings.rentExclCharges ?? "",
          charges: settings.chargesAdvance ?? "",
          dirty: true,
        }),

      marquerGenere: () => set({ dirty: false }),
    }),
    {
      name: "homeofficeexpenses.quittance-draft",
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        mois: state.mois,
        periodeDebut: state.periodeDebut,
        periodeFin: state.periodeFin,
        loyerHc: state.loyerHc,
        charges: state.charges,
        datePaiement: state.datePaiement,
        dateEmission: state.dateEmission,
        templateId: state.templateId,
        initialise: state.initialise,
        dirty: state.dirty,
      }),
    },
  ),
);
