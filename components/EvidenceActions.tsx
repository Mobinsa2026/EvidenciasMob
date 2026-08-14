'use client';

import { Copy, Download } from 'lucide-react';
import { useToast } from './ui/Toast';

/** Acciones del comprobante: copiar folio y (próximamente) descargar PDF. */
export function EvidenceActions({ folio }: { folio: string }) {
  const toast = useToast();

  async function copyFolio() {
    try {
      await navigator.clipboard.writeText(folio);
      toast.success('Folio copiado');
    } catch {
      toast.error('No se pudo copiar el folio.');
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => void copyFolio()}
        className="flex h-12 items-center justify-center gap-2 rounded-btn border border-brand bg-surface text-sm font-semibold text-brand transition-colors duration-200 hover:bg-brand-soft"
      >
        <Copy className="size-4" aria-hidden />
        Copiar folio
      </button>

      <button
        type="button"
        disabled
        title="La descarga en PDF estará disponible próximamente."
        className="flex h-12 cursor-not-allowed items-center justify-center gap-2 rounded-btn border border-line bg-surface text-sm font-semibold text-muted opacity-70"
      >
        <Download className="size-4" aria-hidden />
        Descargar comprobante
        <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
          Pronto
        </span>
      </button>
    </div>
  );
}
