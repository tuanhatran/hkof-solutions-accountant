import { useQuery } from '@tanstack/react-query';
import { api } from './endpoints';
import type { TemplateType } from './types';

export const queryKeys = {
  parametres: ['parametres'] as const,
  postes: (all: boolean) => ['postes', all] as const,
  templates: (type: TemplateType) => ['templates', type] as const,
  variables: (type: TemplateType) => ['templates', type, 'variables'] as const,
  llmConfig: ['llm', 'config'] as const,
  llmStatut: ['llm', 'statut'] as const,
  llmModeles: ['llm', 'modeles'] as const,
  quittanceActive: (month: string) => ['quittances', 'active', month] as const,
  noteActive: (month: string) => ['notes', 'active', month] as const,
  quittances: (month?: string) => ['quittances', month ?? 'toutes'] as const,
  notes: (month?: string) => ['notes', month ?? 'toutes'] as const,
};

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.parametres,
    queryFn: () => api.parametres.obtenir(),
    staleTime: 30_000,
  });
}

export function useExpenseItems(all = false) {
  return useQuery({
    queryKey: queryKeys.postes(all),
    queryFn: () => api.postes.lister(all),
    staleTime: 30_000,
  });
}

export function useTemplates(type: TemplateType) {
  return useQuery({
    queryKey: queryKeys.templates(type),
    queryFn: () => api.templates.lister(type),
    staleTime: 15_000,
  });
}

export function useTemplateVariables(type: TemplateType) {
  return useQuery({
    queryKey: queryKeys.variables(type),
    queryFn: () => api.templates.variables(type),
    staleTime: 5 * 60_000,
  });
}

export function useLlmConfig() {
  return useQuery({
    queryKey: queryKeys.llmConfig,
    queryFn: () => api.llm.obtenir(),
    retry: false,
  });
}

export function useLlmStatus() {
  return useQuery({
    queryKey: queryKeys.llmStatut,
    queryFn: () => api.llm.statut(),
    refetchInterval: 45_000,
    retry: false,
  });
}

export function useLlmModeles(url: string | null) {
  return useQuery({
    queryKey: [...queryKeys.llmModeles, url ?? ''],
    queryFn: () => api.llm.modeles(),
    enabled: Boolean(url),
    retry: false,
    staleTime: 60_000,
  });
}

export function useActiveRentReceipt(month: string) {
  return useQuery({
    queryKey: queryKeys.quittanceActive(month),
    queryFn: () => api.quittances.active(month),
    enabled: /^\d{4}-\d{2}$/.test(month),
    staleTime: 10_000,
  });
}

export function useActiveStatement(month: string) {
  return useQuery({
    queryKey: queryKeys.noteActive(month),
    queryFn: () => api.notes.active(month),
    enabled: /^\d{4}-\d{2}$/.test(month),
    staleTime: 10_000,
  });
}

export function useRentReceipts(month?: string) {
  return useQuery({
    queryKey: queryKeys.quittances(month),
    queryFn: () => api.quittances.lister(month),
    staleTime: 10_000,
  });
}

export function useStatements(month?: string) {
  return useQuery({
    queryKey: queryKeys.notes(month),
    queryFn: () => api.notes.lister(month),
    staleTime: 10_000,
  });
}
