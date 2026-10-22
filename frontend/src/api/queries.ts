import { useQuery } from '@tanstack/react-query';
import { api } from './endpoints';
import type { TypeTemplate } from './types';

export const cles = {
  parametres: ['parametres'] as const,
  postes: (tous: boolean) => ['postes', tous] as const,
  templates: (type: TypeTemplate) => ['templates', type] as const,
  variables: (type: TypeTemplate) => ['templates', type, 'variables'] as const,
  llmConfig: ['llm', 'config'] as const,
  llmStatut: ['llm', 'statut'] as const,
  llmModeles: ['llm', 'modeles'] as const,
  quittanceActive: (mois: string) => ['quittances', 'active', mois] as const,
  noteActive: (mois: string) => ['notes', 'active', mois] as const,
  quittances: (mois?: string) => ['quittances', mois ?? 'toutes'] as const,
  notes: (mois?: string) => ['notes', mois ?? 'toutes'] as const,
};

export function useParametres() {
  return useQuery({
    queryKey: cles.parametres,
    queryFn: () => api.parametres.obtenir(),
    staleTime: 30_000,
  });
}

export function usePostes(tous = false) {
  return useQuery({
    queryKey: cles.postes(tous),
    queryFn: () => api.postes.lister(tous),
    staleTime: 30_000,
  });
}

export function useTemplates(type: TypeTemplate) {
  return useQuery({
    queryKey: cles.templates(type),
    queryFn: () => api.templates.lister(type),
    staleTime: 15_000,
  });
}

export function useVariablesTemplate(type: TypeTemplate) {
  return useQuery({
    queryKey: cles.variables(type),
    queryFn: () => api.templates.variables(type),
    staleTime: 5 * 60_000,
  });
}

export function useLlmConfig() {
  return useQuery({
    queryKey: cles.llmConfig,
    queryFn: () => api.llm.obtenir(),
    retry: false,
  });
}

export function useLlmStatus() {
  return useQuery({
    queryKey: cles.llmStatut,
    queryFn: () => api.llm.statut(),
    refetchInterval: 45_000,
    retry: false,
  });
}

export function useLlmModeles(url: string | null) {
  return useQuery({
    queryKey: [...cles.llmModeles, url ?? ''],
    queryFn: () => api.llm.modeles(),
    enabled: Boolean(url),
    retry: false,
    staleTime: 60_000,
  });
}

export function useQuittanceActive(mois: string) {
  return useQuery({
    queryKey: cles.quittanceActive(mois),
    queryFn: () => api.quittances.active(mois),
    enabled: /^\d{4}-\d{2}$/.test(mois),
    staleTime: 10_000,
  });
}

export function useNoteActive(mois: string) {
  return useQuery({
    queryKey: cles.noteActive(mois),
    queryFn: () => api.notes.active(mois),
    enabled: /^\d{4}-\d{2}$/.test(mois),
    staleTime: 10_000,
  });
}

export function useQuittances(mois?: string) {
  return useQuery({
    queryKey: cles.quittances(mois),
    queryFn: () => api.quittances.lister(mois),
    staleTime: 10_000,
  });
}

export function useNotes(mois?: string) {
  return useQuery({
    queryKey: cles.notes(mois),
    queryFn: () => api.notes.lister(mois),
    staleTime: 10_000,
  });
}
