'use client';

import { useState } from 'react';
import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Employee } from '@/lib/types';

export interface FiltersState {
  documentType: string;
  status: string;
  dateRange: string;
  employeeId: string;
  dateFrom: string;
  dateTo: string;
}

export const DEFAULT_FILTERS: FiltersState = {
  documentType: 'todos',
  status: 'todos',
  dateRange: 'todos',
  employeeId: 'todos',
  dateFrom: '',
  dateTo: '',
};

const DOCUMENT_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'orden_trabajo', label: 'Orden de Trabajo' },
  { value: 'factura', label: 'Factura' },
];

const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'completa', label: 'Completa' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'no_entregada', label: 'No entregada' },
];

const DATE_OPTIONS = [
  { value: 'todos', label: 'Todas' },
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mes' },
  { value: 'personalizada', label: 'Personalizada' },
];

interface DeliveryFiltersProps {
  value: FiltersState;
  employees: Employee[];
  onChange: (value: FiltersState) => void;
}

export function DeliveryFilters({ value, employees, onChange }: DeliveryFiltersProps) {
  const [open, setOpen] = useState(false);

  const activeCount = (['documentType', 'status', 'dateRange', 'employeeId'] as const).filter(
    (key) => value[key] !== 'todos',
  ).length;

  function set(patch: Partial<FiltersState>) {
    onChange({ ...value, ...patch });
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className={cn(
            'flex h-11 items-center gap-2 rounded-btn border px-4 text-sm font-semibold transition-colors duration-200',
            activeCount > 0 || open
              ? 'border-brand bg-brand-soft text-brand'
              : 'border-line bg-surface text-muted hover:text-brand',
          )}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Filtros
          {activeCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="flex h-11 items-center gap-1.5 rounded-btn px-3 text-sm font-semibold text-muted transition-colors duration-200 hover:text-accent"
          >
            <RotateCcw className="size-4" aria-hidden />
            Limpiar
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-4 rounded-card border border-line bg-surface p-4 shadow-card animate-fade-up">
          <ChipGroup
            label="Documento"
            options={DOCUMENT_OPTIONS}
            value={value.documentType}
            onChange={(documentType) => set({ documentType })}
          />

          <ChipGroup
            label="Estado"
            options={STATUS_OPTIONS}
            value={value.status}
            onChange={(status) => set({ status })}
          />

          <ChipGroup
            label="Fecha"
            options={DATE_OPTIONS}
            value={value.dateRange}
            onChange={(dateRange) =>
              set({
                dateRange,
                ...(dateRange === 'personalizada' ? {} : { dateFrom: '', dateTo: '' }),
              })
            }
          />

          {value.dateRange === 'personalizada' && (
            <div className="grid grid-cols-2 gap-3 animate-fade-up">
              <DateInput
                label="Desde"
                value={value.dateFrom}
                onChange={(dateFrom) => set({ dateFrom })}
              />
              <DateInput
                label="Hasta"
                value={value.dateTo}
                onChange={(dateTo) => set({ dateTo })}
              />
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Empleado
            </p>
            <select
              value={value.employeeId}
              onChange={(event) => set({ employeeId: event.target.value })}
              aria-label="Filtrar por empleado"
              className="h-11 w-full rounded-btn border border-line bg-surface px-3 text-[15px] text-ink outline-none transition-colors duration-200 focus:border-brand"
            >
              <option value="todos">Todos los empleados</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                  {employee.active ? '' : ' (inactivo)'}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

function ChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-all duration-200 active:scale-95',
                selected
                  ? 'border-brand bg-brand text-white'
                  : 'border-line bg-surface text-muted hover:border-brand-ring hover:text-brand',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-btn border border-line bg-surface px-3 text-[15px] text-ink outline-none transition-colors duration-200 focus:border-brand"
      />
    </label>
  );
}
