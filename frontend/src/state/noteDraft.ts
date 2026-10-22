import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { NoteDto } from '@/api/types';
import { moisCourant } from '@/lib/dates';
import { depuisLigneDto, type LigneBrouillon } from '@/lib/lignes';

const LIGNES_VIDES: LigneBrouillon[] = [];

interface NoteDraftState {
  mois: string;
  lignesParMois: Record<string, LigneBrouillon[]>;
  templatesParMois: Record<string, number | null>;
  completsParMois: Record<string, boolean>;
  quittanceAmorcee: Record<string, number | null>;
  dirtyParMois: Record<string, boolean>;
  changerMois: (mois: string) => void;
  ajouterLigne: (ligne: LigneBrouillon) => void;
  modifierLigne: (cle: string, valeurs: Partial<LigneBrouillon>) => void;
  supprimerLigne: (cle: string) => void;
  remplacerLignes: (lignes: LigneBrouillon[]) => void;
  definirTemplate: (templateId: number | null) => void;
  definirComplet: (complet: boolean) => void;
  marquerQuittanceAmorcee: (quittanceId: number | null) => void;
  marquerGenere: () => void;
  chargerDepuisNote: (note: NoteDto, quittanceActiveId: number | null) => void;
}

export const useNoteDraft = create<NoteDraftState>()(
  persist(
    (set, get) => ({
      mois: moisCourant(),
      lignesParMois: {},
      templatesParMois: {},
      completsParMois: {},
      quittanceAmorcee: {},
      dirtyParMois: {},

      changerMois: (mois) => set({ mois }),

      ajouterLigne: (ligne) => {
        const { mois, lignesParMois } = get();
        set({
          lignesParMois: { ...lignesParMois, [mois]: [...(lignesParMois[mois] ?? LIGNES_VIDES), ligne] },
          dirtyParMois: { ...get().dirtyParMois, [mois]: true },
        });
      },

      modifierLigne: (cle, valeurs) => {
        const { mois, lignesParMois, dirtyParMois } = get();
        const lignes = lignesParMois[mois] ?? LIGNES_VIDES;
        set({
          lignesParMois: {
            ...lignesParMois,
            [mois]: lignes.map((ligne) => (ligne.cle === cle ? { ...ligne, ...valeurs } : ligne)),
          },
          dirtyParMois: { ...dirtyParMois, [mois]: true },
        });
      },

      supprimerLigne: (cle) => {
        const { mois, lignesParMois, dirtyParMois } = get();
        set({
          lignesParMois: {
            ...lignesParMois,
            [mois]: (lignesParMois[mois] ?? LIGNES_VIDES).filter((ligne) => ligne.cle !== cle),
          },
          dirtyParMois: { ...dirtyParMois, [mois]: true },
        });
      },

      remplacerLignes: (lignes) => {
        const { mois, lignesParMois, dirtyParMois } = get();
        set({
          lignesParMois: { ...lignesParMois, [mois]: lignes },
          dirtyParMois: { ...dirtyParMois, [mois]: true },
        });
      },

      definirTemplate: (templateId) => {
        const { mois, templatesParMois } = get();
        set({ templatesParMois: { ...templatesParMois, [mois]: templateId } });
      },

      definirComplet: (complet) => {
        const { mois, completsParMois } = get();
        set({ completsParMois: { ...completsParMois, [mois]: complet } });
      },

      marquerQuittanceAmorcee: (quittanceId) => {
        const { mois, quittanceAmorcee } = get();
        set({ quittanceAmorcee: { ...quittanceAmorcee, [mois]: quittanceId } });
      },

      marquerGenere: () => {
        const { mois, dirtyParMois } = get();
        set({ dirtyParMois: { ...dirtyParMois, [mois]: false } });
      },

      chargerDepuisNote: (note, quittanceActiveId) => {
        const mois = note.mois ?? get().mois;
        const lignes = (note.lignes ?? []).map(depuisLigneDto);
        set({
          mois,
          lignesParMois: { ...get().lignesParMois, [mois]: lignes },
          templatesParMois: {
            ...get().templatesParMois,
            [mois]: note.templateId ?? null,
          },
          quittanceAmorcee: { ...get().quittanceAmorcee, [mois]: quittanceActiveId },
          dirtyParMois: { ...get().dirtyParMois, [mois]: false },
        });
      },
    }),
    {
      name: 'fraisocc.note-draft',
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

export function useLignesNote(): LigneBrouillon[] {
  const mois = useNoteDraft((state) => state.mois);
  return useNoteDraft((state) => state.lignesParMois[mois]) ?? LIGNES_VIDES;
}

export function useNoteDirty(): boolean {
  const mois = useNoteDraft((state) => state.mois);
  return useNoteDraft((state) => state.dirtyParMois[mois]) ?? false;
}
