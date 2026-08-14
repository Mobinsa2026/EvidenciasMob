import { AlertTriangle } from 'lucide-react';

export function SetupNotice({ message }: { message?: string }) {
  return (
    <div className="rounded-card border border-warn/30 bg-warn-soft px-5 py-4 text-sm text-[#8a5a05] animate-fade-up">
      <p className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="size-4 shrink-0" aria-hidden />
        No se pudo conectar con la base de datos
      </p>
      <p className="mt-1.5 leading-relaxed">
        {message ??
          'Verifica las variables SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY y que el esquema SQL esté aplicado.'}
      </p>
    </div>
  );
}
