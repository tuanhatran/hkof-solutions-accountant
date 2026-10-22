import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ParametresDto } from '@/api/types';
import { dateAujourdhui, moisCourant, periodeDuMois } from '@/lib/dates';

interface QuittanceDraftState {
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
  changerMois: (mois: string) => void;
  modifier: (
    valeurs: Partial<
      Pick<
        QuittanceDraftState,
        'periodeDebut' | 'periodeFin' | 'loyerHc' | 'charges' | 'datePaiement' | 'dateEmission'
      >
    >,
  ) => void;
  definirTemplate: (templateId: number | null) => void;
  initialiserDepuisParametres: (parametres: ParametresDto) => void;
  reprendreDepuisParametres: (parametres: ParametresDto) => void;
  marquerGenere: () => void;
}

const moisInitial = moisCourant();
const periodeInitiale = periodeDuMois(moisInitial);
const aujourdHui = dateAujourdhui();

export const useQuittanceDraft = create<QuittanceDraftState>()(
  persist(
    (set, get) => ({
      mois: moisInitial,
      periodeDebut: periodeInitiale.debut,
      periodeFin: periodeInitiale.fin,
      loyerHc: '',
      charges: '',
      datePaiement: aujourdHui,
      dateEmission: aujourdHui,
      templateId: null,
      initialise: false,
      dirty: false,

      changerMois: (mois) => {
        if (mois === get().mois) {
          return;
        }
        const periode = periodeDuMois(mois);
        set({
          mois,
          periodeDebut: periode.debut,
          periodeFin: periode.fin,
          dirty: true,
        });
      },

      modifier: (valeurs) => set({ ...valeurs, dirty: true }),

      definirTemplate: (templateId) => set({ templateId, dirty: true }),

      initialiserDepuisParametres: (parametres) => {
        if (get().initialise) {
          return;
        }
        set({
          loyerHc: parametres.loyerHc ?? '',
          charges: parametres.provisionCharges ?? '',
          initialise: true,
          dirty: false,
        });
      },

      reprendreDepuisParametres: (parametres) =>
        set({
          loyerHc: parametres.loyerHc ?? '',
          charges: parametres.provisionCharges ?? '',
          dirty: true,
        }),

      marquerGenere: () => set({ dirty: false }),
    }),
    {
      name: 'homeofficeexpenses.quittance-draft',
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
