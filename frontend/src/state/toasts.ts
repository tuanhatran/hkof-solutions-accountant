import { create } from 'zustand';

export type TypeToast = 'succes' | 'erreur' | 'info';

export interface Toast {
  id: number;
  type: TypeToast;
  message: string;
}

interface ToastsState {
  toasts: Toast[];
  ajouter: (message: string, type?: TypeToast) => void;
  retirer: (id: number) => void;
}

let prochainId = 1;

export const useToasts = create<ToastsState>((set, get) => ({
  toasts: [],
  ajouter: (message, type = 'succes') => {
    const id = prochainId++;
    set({ toasts: [...get().toasts, { id, type, message }] });
    window.setTimeout(() => get().retirer(id), 5_000);
  },
  retirer: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}));

export const toast = {
  succes: (message: string) => useToasts.getState().ajouter(message, 'succes'),
  erreur: (message: string) => useToasts.getState().ajouter(message, 'erreur'),
  info: (message: string) => useToasts.getState().ajouter(message, 'info'),
};
