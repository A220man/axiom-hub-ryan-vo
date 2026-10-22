/* Toast Hook */

import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (message: string, type: Toast['type']) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    // Auto-remove after 5 seconds
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 5000);
  },

  removeToast: (id: string) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));