'use client';

import { FileText, ScrollText } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { DocumentType } from '@/lib/types';

const OPTIONS = [
  { value: 'orden_trabajo', label: 'Orden de Trabajo', icon: ScrollText },
  { value: 'factura', label: 'Factura', icon: FileText },
] as const satisfies ReadonlyArray<{ value: DocumentType; label: string; icon: unknown }>;

interface DocumentSelectorProps {
  value: DocumentType;
  onChange: (value: DocumentType) => void;
}

export function DocumentSelector({ value, onChange }: DocumentSelectorProps) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink">
        Tipo de documento <span className="text-accent">*</span>
      </p>

      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Tipo de documento">
        {OPTIONS.map(({ value: option, label, icon: Icon }) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option)}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-btn border px-3 py-4',
                'text-center text-[13px] font-semibold leading-tight',
                'transition-all duration-200 ease-out active:scale-[0.98]',
                selected
                  ? 'border-brand bg-brand text-white shadow-raised'
                  : 'border-line bg-surface text-muted hover:border-brand-ring hover:bg-brand-soft hover:text-brand',
              )}
            >
              <Icon className="size-6" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
