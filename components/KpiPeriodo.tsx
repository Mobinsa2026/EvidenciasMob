'use client';

import Link from 'next/link';
import { cn } from '@/lib/cn';

const OPCIONES = [
  { dias: 7, label: '7 días' },
  { dias: 30, label: '30 días' },
  { dias: 90, label: '90 días' },
];

export function KpiPeriodo({ periodo }: { periodo: number }) {
  return (
    <div className="flex gap-2">
      {OPCIONES.map((opcion) => (
        <Link
          key={opcion.dias}
          href={`/kpi?dias=${opcion.dias}`}
          className={cn(
            'flex h-10 items-center rounded-full border px-4 text-[13px] font-semibold',
            'transition-colors duration-200',
            periodo === opcion.dias
              ? 'border-brand bg-brand text-white'
              : 'border-line bg-surface text-muted hover:border-brand-ring hover:text-brand',
          )}
        >
          {opcion.label}
        </Link>
      ))}
    </div>
  );
}
