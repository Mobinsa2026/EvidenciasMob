'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast debe usarse dentro de <ToastProvider>.');
  return context;
}

const STYLES: Record<ToastKind, { wrap: string; icon: ReactNode }> = {
  success: {
    wrap: 'border-success/30 bg-success-soft text-[#14664a]',
    icon: <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />,
  },
  error: {
    wrap: 'border-danger/30 bg-danger-soft text-[#8f100d]',
    icon: <AlertTriangle className="size-4 shrink-0 text-danger" aria-hidden />,
  },
  info: {
    wrap: 'border-brand-ring bg-brand-soft text-brand',
    icon: <Info className="size-4 shrink-0 text-brand" aria-hidden />,
  },
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId++;
      setItems((current) => [...current.slice(-2), { id, kind, message }]);
      setTimeout(() => dismiss(id), 3200);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex flex-col items-center gap-2 px-4"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-btn border px-3.5 py-3',
              'text-sm font-medium shadow-float backdrop-blur-sm animate-toast-in',
              STYLES[item.kind].wrap,
            )}
          >
            {STYLES[item.kind].icon}
            <span className="min-w-0 flex-1">{item.message}</span>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Cerrar notificación"
              className="shrink-0 opacity-50 transition-opacity hover:opacity-100"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
