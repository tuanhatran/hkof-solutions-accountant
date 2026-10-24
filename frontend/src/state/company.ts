import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CompanyDto } from "@/api/types";

/** Local persistence key of the active company. */
export const COMPANY_STORAGE_KEY = "homeofficeexpenses.company";

interface CompanyState {
  activeCompanyId: number | null;
  setActiveCompany: (id: number | null) => void;
}

/**
 * Active company selection. The backend never guesses the current company: every
 * company-scoped request carries this id.
 */
export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      activeCompanyId: null,
      setActiveCompany: (id) => set({ activeCompanyId: id }),
    }),
    {
      name: COMPANY_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ activeCompanyId: state.activeCompanyId }),
    },
  ),
);

/**
 * Resolves the company to select from the persisted id and the fetched list: the stored
 * company when it still exists, the first non-deleted company otherwise, null when the
 * directory is empty.
 */
export function resolveActiveCompanyId(
  storedId: number | null | undefined,
  companies: CompanyDto[] | undefined,
): number | null {
  const ids = (companies ?? [])
    .map((company) => company.id)
    .filter((id): id is number => typeof id === "number");
  if (ids.length === 0) {
    return null;
  }
  if (storedId !== null && storedId !== undefined && ids.includes(storedId)) {
    return storedId;
  }
  return ids[0] ?? null;
}
