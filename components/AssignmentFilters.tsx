'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/cn';

const ESTADOS = [
  { value: 'abiertas', label: 'Abiertas' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'pausada', label: 'Pausadas' },
  { value: 'completada', label: 'Completadas' },
  { value: 'todas', label: 'Todas' },
];

export function AssignmentFilters({
  estado,
  persona,
  personas,
  mostrarPersonas,
}: {
  estado: string;
  persona: string;
  personas: Array<{ id: string; name: string }>;
  mostrarPersonas: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function actualizar(clave: string, valor: string) {
    const next = new URLSearchParams(params.toString());
    next.set(clave, valor);
    router.push(`/tareas?${next.toString()}`);
  }

  return (
    <div className="space-y-3">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {ESTADOS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => actualizar('estado', item.value)}
            className={cn(
              'h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-semibold',
              'transition-colors duration-200',
              estado === item.value
                ? 'border-brand bg-brand text-white'
                : 'border-line bg-surface text-muted hover:border-brand-ring hover:text-brand',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {mostrarPersonas && personas.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <FiltroPersona
            activo={persona === 'todos'}
            onClick={() => actualizar('persona', 'todos')}
          >
            Todos
          </FiltroPersona>

          {personas.map((item) => (
            <FiltroPersona
              key={item.id}
              activo={persona === item.id}
              onClick={() => actualizar('persona', item.id)}
            >
              {item.name}
            </FiltroPersona>
          ))}
        </div>
      )}
    </div>
  );
}

function FiltroPersona({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-semibold',
        'transition-colors duration-200',
        activo
          ? 'border-brand-ring bg-brand-soft text-brand'
          : 'border-line bg-surface text-muted hover:border-brand-ring hover:text-brand',
      )}
    >
      {children}
    </button>
  );
}
