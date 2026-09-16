'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

type PushToast = (message: string, kind?: ToastKind) => void;

const ToastContext = createContext<PushToast>(() => {});

export const useToast = () => useContext(ToastContext);

const ICONS: Record<ToastKind, { Icon: typeof Info; className: string }> = {
  success: { Icon: CheckCircle2, className: 'text-marker' },
  error: { Icon: AlertCircle, className: 'text-pen' },
  info: { Icon: Info, className: 'text-accent' },
};

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback<PushToast>(
    (message, kind = 'success') => {
      const id = nextId++;
      setToasts((list) => [...list.slice(-2), { id, kind, message }]);
      setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 3500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6"
      >
        {toasts.map(({ id, kind, message }) => {
          const { Icon, className } = ICONS[kind];
          return (
            <div
              key={id}
              role={kind === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-[12px] bg-ink px-4 py-3 text-[14px] font-bold text-sheet shadow-lift animate-in slide-up"
            >
              <Icon className={`h-4 w-4 flex-shrink-0 ${className}`} />
              <span className="leading-snug">{message}</span>
              <button
                type="button"
                onClick={() => dismiss(id)}
                aria-label="Meldung schließen"
                className="-mr-1 ml-1 rounded p-1 text-sheet/50 hover:text-sheet"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
