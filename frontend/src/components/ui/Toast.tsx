/* Toast Component */

import React from 'react';
import { useToastStore } from '../../hooks/useToast';
import { X } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${toast.type}`}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 text-sm">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/70 hover:text-white p-1"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Helper functions for easy toast usage
export const toast = {
  success: (message: string) => useToastStore.getState().addToast(message, 'success'),
  error: (message: string) => useToastStore.getState().addToast(message, 'error'),
  warning: (message: string) => useToastStore.getState().addToast(message, 'warning'),
  info: (message: string) => useToastStore.getState().addToast(message, 'info'),
};