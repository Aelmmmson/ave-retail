import { create } from 'zustand';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: AlertType;
  title: string;
  message?: string;
}

interface AlertState {
  toasts: ToastItem[];
  showToast: (type: AlertType, title: string, message?: string, durationMs?: number) => void;
  removeToast: (id: string) => void;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  toasts: [],
  showToast: (type, title, message, durationMs = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newToast: ToastItem = { id, type, title, message };
    set({ toasts: [...get().toasts, newToast] });

    if (durationMs > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, durationMs);
    }
  },
  removeToast: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  }
}));
