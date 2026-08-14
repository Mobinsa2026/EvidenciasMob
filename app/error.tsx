'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center py-16 text-center animate-fade-up">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <AlertTriangle className="size-7" aria-hidden />
      </div>

      <h1 className="mt-5 text-xl font-bold text-ink">Algo salió mal</h1>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
        No pudimos cargar esta sección. Revisa tu conexión e inténtalo de nuevo.
      </p>

      <button
        type="button"
        onClick={reset}
        className="mt-6 flex h-12 items-center rounded-btn bg-brand px-5 font-semibold text-white shadow-raised transition-colors duration-200 hover:bg-brand-2"
      >
        Reintentar
      </button>
    </div>
  );
}
