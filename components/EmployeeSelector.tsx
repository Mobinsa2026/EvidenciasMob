'use client';

import { useState } from 'react';
import { Check, Loader2, Plus, UserRound, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Employee } from '@/lib/types';
import { useToast } from './ui/Toast';
import { Button } from './ui/Button';

interface EmployeeSelectorProps {
  employees: Employee[];
  value: string;
  error?: string;
  onChange: (id: string) => void;
  onCreated: (employee: Employee) => void;
}

export function EmployeeSelector({
  employees,
  value,
  error,
  onChange,
  onCreated,
}: EmployeeSelectorProps) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function createEmployee() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error('Ingresa el nombre del empleado.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data?.error ?? 'No se pudo agregar el empleado.');
        return;
      }

      onCreated(data.employee as Employee);
      onChange(data.employee.id);
      setName('');
      setAdding(false);
      toast.success('Empleado agregado');
    } catch {
      toast.error('Sin conexión. Revisa tu red e inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink">
        Entregado por <span className="text-accent">*</span>
      </p>

      {employees.length === 0 && !adding && (
        <p className="mb-3 rounded-btn border border-line bg-canvas px-4 py-3 text-[13px] text-muted">
          Aún no hay empleados registrados. Agrega el primero para continuar.
        </p>
      )}

      <div className="space-y-2" role="radiogroup" aria-label="Entregado por">
        {employees.map((employee) => {
          const selected = value === employee.id;
          return (
            <button
              key={employee.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(employee.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-btn border px-4 py-3 text-left',
                'transition-all duration-200 ease-out active:scale-[0.99]',
                selected
                  ? 'border-brand bg-brand-soft shadow-card'
                  : 'border-line bg-surface hover:border-brand-ring hover:bg-canvas',
              )}
            >
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors duration-200',
                  selected ? 'bg-brand text-white' : 'bg-brand-soft text-brand',
                )}
              >
                {initials(employee.name)}
              </span>

              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-[15px] font-medium',
                  selected ? 'text-brand' : 'text-ink',
                )}
              >
                {employee.name}
              </span>

              {selected && <Check className="size-5 shrink-0 text-brand" aria-hidden />}
            </button>
          );
        })}
      </div>

      {adding ? (
        <div className="mt-3 rounded-btn border border-brand-ring bg-brand-soft/50 p-3 animate-fade-up">
          <label htmlFor="new-employee" className="mb-2 block text-[13px] font-semibold text-brand">
            Nombre del nuevo empleado
          </label>
          <div className="flex gap-2">
            <input
              id="new-employee"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void createEmployee();
                }
              }}
              maxLength={120}
              placeholder="Ej. Ana Torres"
              className="h-11 min-w-0 flex-1 rounded-btn border border-line bg-surface px-3.5 text-[15px] outline-none transition-colors duration-200 focus:border-brand"
            />
            <Button onClick={() => void createEmployee()} disabled={saving} className="px-3.5">
              {saving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Check className="size-4" aria-hidden />
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setAdding(false);
                setName('');
              }}
              aria-label="Cancelar"
              className="px-3"
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-btn border border-dashed border-brand-ring bg-surface py-3 text-sm font-semibold text-brand transition-colors duration-200 hover:bg-brand-soft"
        >
          <Plus className="size-4" aria-hidden />
          Agregar empleado
        </button>
      )}

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-danger animate-fade-up">
          <UserRound className="size-3.5" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}
