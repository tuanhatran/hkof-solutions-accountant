import { create } from "zustand";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastsState {
  toasts: Toast[];
  add: (message: string, type?: ToastType) => void;
  remove: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastsState>((set, get) => ({
  toasts: [],
  add: (message, type = "success") => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, type, message }] });
    window.setTimeout(() => get().remove(id), 5_000);
  },
  remove: (id) =>
    set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}));

export const toast = {
  success: (message: string) => useToasts.getState().add(message, "success"),
  error: (message: string) => useToasts.getState().add(message, "error"),
  info: (message: string) => useToasts.getState().add(message, "info"),
};
