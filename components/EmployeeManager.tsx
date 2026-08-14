'use client';

import { useState } from 'react';
import { Loader2, Plus, UserRoundPlus, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Employee } from '@/lib/types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { useToast } from './ui/Toast';

export function EmployeeManager({ initialEmployees }: { initialEmployees: Employee[] }) {
  const toast = useToast();
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  async function addEmployee() {
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

      const created = data.employee as Employee;
      setEmployees((current) =>
        [...current.filter((item) => item.id !== created.id), created].sort((a, b) =>
          a.name.localeCompare(b.name, 'es'),
        ),
      );
      setName('');
      toast.success('Empleado agregado');
    } catch {
      toast.error('Sin conexión. Revisa tu red e inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(employee: Employee) {
    setUpdating(employee.id);
    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ active: !employee.active }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data?.error ?? 'No se pudo actualizar el empleado.');
        return;
      }

      setEmployees((current) =>
        current.map((item) => (item.id === employee.id ? (data.employee as Employee) : item)),
      );
      toast.success(employee.active ? 'Empleado marcado como inactivo' : 'Empleado activado');
    } catch {
      toast.error('Sin conexión. Revisa tu red e inténtalo de nuevo.');
    } finally {
      setUpdating(null);
    }
  }

  const active = employees.filter((employee) => employee.active);
  const inactive = employees.filter((employee) => !employee.active);

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand">Empleados</h1>
        <p className="mt-1.5 text-[15px] text-muted">
          Administra quién puede aparecer como responsable de una entrega.
        </p>
      </div>

      <Card className="p-5">
        <label htmlFor="employee-name" className="mb-2 block text-sm font-semibold text-ink">
          Agregar empleado
        </label>

        {/* `flex-1` va solo en fila: en columna su flex-basis anula la altura. */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="employee-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void addEmployee();
              }
            }}
            maxLength={120}
            placeholder="Ej. Ana Torres"
            className="h-13 w-full min-w-0 rounded-btn border border-line bg-surface px-4 text-[15px] outline-none transition-colors duration-200 focus:border-brand focus:ring-4 focus:ring-brand-ring/50 sm:flex-1"
          />

          <Button size="lg" loading={saving} onClick={() => void addEmployee()}>
            {!saving && <Plus className="size-5" aria-hidden />}
            Agregar
          </Button>
        </div>

        <p className="mt-2.5 text-xs leading-relaxed text-muted">
          Los empleados no se eliminan. Si alguien deja de trabajar, márcalo como inactivo
          para conservar el historial de sus entregas.
        </p>
      </Card>

      {employees.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" aria-hidden />}
          title="Aún no hay empleados"
          description="Agrega al primer empleado para poder registrar entregas."
        />
      ) : (
        <>
          <EmployeeGroup
            title="Activos"
            count={active.length}
            employees={active}
            updating={updating}
            onToggle={toggleActive}
          />

          {inactive.length > 0 && (
            <EmployeeGroup
              title="Inactivos"
              count={inactive.length}
              employees={inactive}
              updating={updating}
              onToggle={toggleActive}
            />
          )}
        </>
      )}
    </div>
  );
}

function EmployeeGroup({
  title,
  count,
  employees,
  updating,
  onToggle,
}: {
  title: string;
  count: number;
  employees: Employee[];
  updating: string | null;
  onToggle: (employee: Employee) => void;
}) {
  return (
    <section>
      <h2 className="mb-2.5 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
        <UserRoundPlus className="size-4" aria-hidden />
        {title}
        <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] tabular-nums">
          {count}
        </span>
      </h2>

      <Card className="divide-y divide-line overflow-hidden">
        {employees.map((employee) => (
          <div key={employee.id} className="flex items-center gap-3 px-5 py-3.5">
            <span
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                employee.active ? 'bg-brand-soft text-brand' : 'bg-canvas text-muted',
              )}
            >
              {employee.name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part.charAt(0).toUpperCase())
                .join('')}
            </span>

            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  'block truncate text-[15px] font-semibold',
                  employee.active ? 'text-ink' : 'text-muted',
                )}
              >
                {employee.name}
              </span>
              <span className="text-xs text-muted">
                {employee.active ? 'Activo' : 'Inactivo'}
              </span>
            </span>

            <button
              type="button"
              onClick={() => onToggle(employee)}
              disabled={updating === employee.id}
              className={cn(
                'flex h-11 shrink-0 items-center gap-1.5 rounded-btn border px-3.5 text-[13px] font-semibold transition-colors duration-200 disabled:opacity-60',
                employee.active
                  ? 'border-line text-muted hover:border-accent/40 hover:text-accent'
                  : 'border-brand text-brand hover:bg-brand-soft',
              )}
            >
              {updating === employee.id && (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              )}
              {employee.active ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        ))}
      </Card>
    </section>
  );
}
