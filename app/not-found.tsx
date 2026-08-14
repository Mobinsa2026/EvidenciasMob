import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center py-16 text-center animate-fade-up">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <FileQuestion className="size-7" aria-hidden />
      </div>

      <h1 className="mt-5 text-xl font-bold text-ink">No encontramos esta página</h1>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted">
        Es posible que la evidencia haya sido eliminada o que el enlace sea incorrecto.
      </p>

      <Link
        href="/"
        className="mt-6 flex h-12 items-center rounded-btn bg-brand px-5 font-semibold text-white shadow-raised transition-colors duration-200 hover:bg-brand-2"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
