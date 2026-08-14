'use client';

import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { DeliveryStatus } from '@/lib/types';

const OPTIONS = [
  {
    value: 'completa',
    label: 'Entrega completa',
    description: 'Se entregó todo lo solicitado.',
    icon: CheckCircle2,
    selected: 'border-success bg-success-soft',
    iconOn: 'bg-success text-white',
    iconOff: 'bg-success-soft text-success',
    text: 'text-[#14664a]',
  },
  {
    value: 'parcial',
    label: 'Entrega parcial',
    description: 'Se entregó solo una parte.',
    icon: AlertTriangle,
    selected: 'border-warn bg-warn-soft',
    iconOn: 'bg-warn text-white',
    iconOff: 'bg-warn-soft text-warn',
    text: 'text-[#8a5a05]',
  },
  {
    value: 'no_entregada',
    label: 'No se pudo entregar',
    description: 'La entrega no se concretó.',
    icon: XCircle,
    selected: 'border-danger bg-danger-soft',
    iconOn: 'bg-danger text-white',
    iconOff: 'bg-danger-soft text-danger',
    text: 'text-[#8f100d]',
  },
] as const satisfies ReadonlyArray<{ value: DeliveryStatus; [key: string]: unknown }>;

interface StatusSelectorProps {
  value: DeliveryStatus;
  onChange: (value: DeliveryStatus) => void;
}

export function StatusSelector({ value, onChange }: StatusSelectorProps) {
  return (
    <div className="space-y-3" role="radiogroup" aria-label="Estado de la entrega">
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex w-full items-center gap-3.5 rounded-btn border px-4 py-3.5 text-left',
              'transition-all duration-200 ease-out active:scale-[0.99]',
              selected
                ? `${option.selected} shadow-card`
                : 'border-line bg-surface hover:border-brand-ring hover:bg-canvas',
            )}
          >
            <span
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-200',
                selected ? option.iconOn : option.iconOff,
              )}
            >
              <Icon className="size-5" aria-hidden />
            </span>

            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  'block text-[15px] font-semibold leading-tight',
                  selected ? option.text : 'text-ink',
                )}
              >
                {option.label}
              </span>
              <span className="mt-0.5 block text-xs text-muted">{option.description}</span>
            </span>

            <span
              className={cn(
                'size-5 shrink-0 rounded-full border-2 transition-colors duration-200',
                selected ? 'border-current bg-current' : 'border-line',
                selected && option.text,
              )}
              aria-hidden
            >
              {selected && (
                <span className="flex size-full items-center justify-center">
                  <span className="size-1.5 rounded-full bg-white" />
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
