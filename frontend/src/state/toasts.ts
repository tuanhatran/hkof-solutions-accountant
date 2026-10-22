import { create } from 'zustand';

export type ToastType = 'succes' | 'erreur' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastsState {
  toasts: Toast[];
  ajouter: (message: string, type?: ToastType) => void;
  retirer: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastsState>((set, get) => ({
  toasts: [],
  ajouter: (message, type = 'succes') => {
    const id = nextId++;
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
