import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StatementDto } from "@/api/types";
import { currentMonth } from "@/lib/dates";
import { fromLineDto, type DraftLine } from "@/lib/lines";

const EMPTY_LINES: DraftLine[] = [];

interface StatementDraftState {
  mois: string;
  lignesParMois: Record<string, DraftLine[]>;
  templatesParMois: Record<string, number | null>;
  completsParMois: Record<string, boolean>;
  quittanceAmorcee: Record<string, number | null>;
  dirtyParMois: Record<string, boolean>;
  changerMois: (month: string) => void;
  ajouterLigne: (line: DraftLine) => void;
  modifierLigne: (key: string, values: Partial<DraftLine>) => void;
  supprimerLigne: (key: string) => void;
  remplacerLignes: (lines: DraftLine[]) => void;
  definirTemplate: (templateId: number | null) => void;
  definirComplet: (complete: boolean) => void;
  marquerQuittanceAmorcee: (rentReceiptId: number | null) => void;
  marquerGenere: () => void;
  chargerDepuisNote: (
    statement: StatementDto,
    activeRentReceiptId: number | null,
  ) => void;
}

export const useStatementDraft = create<StatementDraftState>()(
  persist(
    (set, get) => ({
      mois: currentMonth(),
      lignesParMois: {},
      templatesParMois: {},
      completsParMois: {},
      quittanceAmorcee: {},
      dirtyParMois: {},

      changerMois: (month) => set({ mois: month }),

      ajouterLigne: (line) => {
        const { mois: month, lignesParMois: linesByMonth } = get();
        set({
          lignesParMois: {
            ...linesByMonth,
            [month]: [...(linesByMonth[month] ?? EMPTY_LINES), line],
          },
          dirtyParMois: { ...get().dirtyParMois, [month]: true },
        });
      },

      modifierLigne: (key, values) => {
        const {
          mois: month,
          lignesParMois: linesByMonth,
          dirtyParMois: dirtyByMonth,
        } = get();
        const lines = linesByMonth[month] ?? EMPTY_LINES;
        set({
          lignesParMois: {
            ...linesByMonth,
            [month]: lines.map((line) =>
              line.cle === key ? { ...line, ...values } : line,
            ),
          },
          dirtyParMois: { ...dirtyByMonth, [month]: true },
        });
      },

      supprimerLigne: (key) => {
        const {
          mois: month,
          lignesParMois: linesByMonth,
          dirtyParMois: dirtyByMonth,
        } = get();
        set({
          lignesParMois: {
            ...linesByMonth,
            [month]: (linesByMonth[month] ?? EMPTY_LINES).filter(
              (line) => line.cle !== key,
            ),
          },
          dirtyParMois: { ...dirtyByMonth, [month]: true },
        });
      },

      remplacerLignes: (lines) => {
        const {
          mois: month,
          lignesParMois: linesByMonth,
          dirtyParMois: dirtyByMonth,
        } = get();
        set({
          lignesParMois: { ...linesByMonth, [month]: lines },
          dirtyParMois: { ...dirtyByMonth, [month]: true },
        });
      },

      definirTemplate: (templateId) => {
        const { mois: month, templatesParMois: templatesByMonth } = get();
        set({ templatesParMois: { ...templatesByMonth, [month]: templateId } });
      },

      definirComplet: (complete) => {
        const { mois: month, completsParMois: completeByMonth } = get();
        set({ completsParMois: { ...completeByMonth, [month]: complete } });
      },

      marquerQuittanceAmorcee: (rentReceiptId) => {
        const { mois: month, quittanceAmorcee: rentReceiptPrimed } = get();
        set({
          quittanceAmorcee: { ...rentReceiptPrimed, [month]: rentReceiptId },
        });
      },

      marquerGenere: () => {
        const { mois: month, dirtyParMois: dirtyByMonth } = get();
        set({ dirtyParMois: { ...dirtyByMonth, [month]: false } });
      },

      chargerDepuisNote: (statement, activeRentReceiptId) => {
        const month = statement.month ?? get().mois;
        const lines = (statement.lines ?? []).map(fromLineDto);
        set({
          mois: month,
          lignesParMois: { ...get().lignesParMois, [month]: lines },
          templatesParMois: {
            ...get().templatesParMois,
            [month]: statement.templateId ?? null,
          },
          quittanceAmorcee: {
            ...get().quittanceAmorcee,
            [month]: activeRentReceiptId,
          },
          dirtyParMois: { ...get().dirtyParMois, [month]: false },
        });
      },
    }),
    {
      name: "homeofficeexpenses.note-draft",
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        mois: state.mois,
        lignesParMois: state.lignesParMois,
        templatesParMois: state.templatesParMois,
        completsParMois: state.completsParMois,
        quittanceAmorcee: state.quittanceAmorcee,
        dirtyParMois: state.dirtyParMois,
      }),
    },
  ),
);

export function useStatementLines(): DraftLine[] {
  const month = useStatementDraft((state) => state.mois);
  return (
    useStatementDraft((state) => state.lignesParMois[month]) ?? EMPTY_LINES
  );
}

export function useStatementDirty(): boolean {
  const month = useStatementDraft((state) => state.mois);
  return useStatementDraft((state) => state.dirtyParMois[month]) ?? false;
}
