'use client';

import { useEffect, type ReactNode } from 'react';
import { TriangleAlert, X } from 'lucide-react';
import { Button } from './Button';
import { Portal } from './Portal';

interface ConfirmDialogProps {
  title: string;
  subtitle?: string;
  confirmLabel: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  children: ReactNode;
}

/** Confirmación para acciones destructivas. Se monta en portal por el mismo
 *  motivo que el visor de fotos: un ancestro con transform rompería el fixed. */
export function ConfirmDialog({
  title,
  subtitle,
  confirmLabel,
  loading,
  onCancel,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !loading) onCancel();
    }

    document.addEventListener('keydown', onKeyDown);
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previo;
    };
  }, [loading, onCancel]);

  return (
    <Portal>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={() => !loading && onCancel()}
        className="fixed inset-0 z-[90] flex items-end justify-center overflow-y-auto bg-ink/50 backdrop-blur-sm sm:items-center sm:p-4"
      >
        <div
          onClick={(event) => event.stopPropagation()}
          className="w-full max-w-md rounded-t-2xl border border-line bg-surface shadow-float animate-fade-up sm:rounded-card"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-start gap-3 border-b border-line px-5 py-4">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
              <TriangleAlert className="size-[18px]" aria-hidden />
            </span>

            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-bold text-ink">{title}</h2>
              {subtitle && (
                <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p>
              )}
            </div>

            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              aria-label="Cancelar"
              className="-mr-1 flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-canvas hover:text-ink disabled:opacity-50"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div className="space-y-4 px-5 py-5">
            <p className="text-sm leading-relaxed text-muted">{children}</p>

            <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
              <Button variant="secondary" size="lg" fullWidth disabled={loading} onClick={onCancel}>
                Cancelar
              </Button>
              <Button variant="danger" size="lg" fullWidth loading={loading} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
