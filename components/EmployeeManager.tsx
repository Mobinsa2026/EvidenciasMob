'use client';

import { useState } from 'react';
import {
  Check,
  Pencil,
  Plus,
  Trash2,
  UserRoundCheck,
  UserRoundPlus,
  UserRoundX,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Employee } from '@/lib/types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { EmptyState } from './ui/EmptyState';
import { useToast } from './ui/Toast';

const INPUT =
  'h-13 w-full min-w-0 rounded-btn border border-line bg-surface px-4 text-[15px] outline-none ' +
  'transition-colors duration-200 focus:border-brand focus:ring-4 focus:ring-brand-ring/50';

export function EmployeeManager({
  initialEmployees,
  esJefe,
}: {
  initialEmployees: Employee[];
  esJefe: boolean;
}) {
  const toast = useToast();
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [porEliminar, setPorEliminar] = useState<Employee | null>(null);
  const [eliminando, setEliminando] = useState(false);

  function ordenar(lista: Employee[]) {
    return [...lista].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

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
        ordenar([...current.filter((item) => item.id !== created.id), created]),
      );
      setName('');
      toast.success('Empleado agregado');
    } catch {
      toast.error('Sin conexión. Revisa tu red e inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  async function guardarNombre(employee: Employee, nuevo: string) {
    const limpio = nuevo.trim();

    if (limpio.length < 2) {
      toast.error('El nombre debe tener al menos 2 caracteres.');
      return;
    }
    if (limpio === employee.name) {
      setEditando(null);
      return;
    }

    setUpdating(employee.id);
    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: limpio }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data?.error ?? 'No se pudo cambiar el nombre.');
        return;
      }

      setEmployees((current) =>
        ordenar(
          current.map((item) =>
            item.id === employee.id ? (data.employee as Employee) : item,
          ),
        ),
      );
      setEditando(null);
      toast.success('Nombre actualizado');
    } catch {
      toast.error('Sin conexión. Revisa tu red e inténtalo de nuevo.');
    } finally {
      setUpdating(null);
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

  async function eliminar(employee: Employee) {
    setEliminando(true);
    try {
      const response = await fetch(`/api/employees/${employee.id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        // 409 = tiene historial o cuenta: el backend explica por qué no se puede.
        toast.error(data?.error ?? 'No se pudo eliminar el empleado.');
        setPorEliminar(null);
        return;
      }

      setEmployees((current) => current.filter((item) => item.id !== employee.id));
      setPorEliminar(null);
      toast.success(`${employee.name} fue eliminado`);
    } catch {
      toast.error('Sin conexión. Revisa tu red e inténtalo de nuevo.');
    } finally {
      setEliminando(false);
    }
  }

  const active = employees.filter((employee) => employee.active);
  const inactive = employees.filter((employee) => !employee.active);

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand">Empleados</h1>
        <p className="mt-1.5 text-[15px] text-muted">
          {esJefe
            ? 'Administra quién puede aparecer como responsable de una entrega.'
            : 'Personas que pueden aparecer como responsables de una entrega.'}
        </p>
      </div>

      {esJefe && (
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
              className={cn(INPUT, 'sm:flex-1')}
            />

            <Button size="lg" loading={saving} onClick={() => void addEmployee()}>
              {!saving && <Plus className="size-5" aria-hidden />}
              Agregar
            </Button>
          </div>

          <p className="mt-2.5 text-xs leading-relaxed text-muted">
            Si alguien ya tiene entregas registradas solo puede desactivarse: eliminarlo
            dejaría esas evidencias sin responsable.
          </p>
        </Card>
      )}

      {employees.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" aria-hidden />}
          title="Aún no hay empleados"
          description={
            esJefe
              ? 'Agrega al primer empleado para poder registrar entregas.'
              : 'Pídele a Rosendo que dé de alta a los responsables.'
          }
        />
      ) : (
        <>
          <EmployeeGroup
            title="Activos"
            count={active.length}
            employees={active}
            esJefe={esJefe}
            updating={updating}
            editando={editando}
            onEditar={setEditando}
            onGuardar={guardarNombre}
            onToggle={toggleActive}
            onEliminar={setPorEliminar}
          />

          {inactive.length > 0 && (
            <EmployeeGroup
              title="Inactivos"
              count={inactive.length}
              employees={inactive}
              esJefe={esJefe}
              updating={updating}
              editando={editando}
              onEditar={setEditando}
              onGuardar={guardarNombre}
              onToggle={toggleActive}
              onEliminar={setPorEliminar}
            />
          )}
        </>
      )}

      {porEliminar && (
        <ConfirmDialog
          title="Eliminar empleado"
          subtitle={porEliminar.name}
          confirmLabel="Eliminar"
          loading={eliminando}
          onCancel={() => setPorEliminar(null)}
          onConfirm={() => eliminar(porEliminar)}
        >
          Se borrará de la lista de forma permanente. Si ya tiene entregas registradas la
          operación se cancelará y solo podrás desactivarlo.
        </ConfirmDialog>
      )}
    </div>
  );
}

interface GroupProps {
  title: string;
  count: number;
  employees: Employee[];
  esJefe: boolean;
  updating: string | null;
  editando: string | null;
  onEditar: (id: string | null) => void;
  onGuardar: (employee: Employee, nombre: string) => void;
  onToggle: (employee: Employee) => void;
  onEliminar: (employee: Employee) => void;
}

function EmployeeGroup({
  title,
  count,
  employees,
  esJefe,
  updating,
  editando,
  onEditar,
  onGuardar,
  onToggle,
  onEliminar,
}: GroupProps) {
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
          <EmployeeRow
            key={employee.id}
            employee={employee}
            esJefe={esJefe}
            ocupado={updating === employee.id}
            editando={editando === employee.id}
            onEditar={onEditar}
            onGuardar={onGuardar}
            onToggle={onToggle}
            onEliminar={onEliminar}
          />
        ))}
      </Card>
    </section>
  );
}

function EmployeeRow({
  employee,
  esJefe,
  ocupado,
  editando,
  onEditar,
  onGuardar,
  onToggle,
  onEliminar,
}: {
  employee: Employee;
  esJefe: boolean;
  ocupado: boolean;
  editando: boolean;
  onEditar: (id: string | null) => void;
  onGuardar: (employee: Employee, nombre: string) => void;
  onToggle: (employee: Employee) => void;
  onEliminar: (employee: Employee) => void;
}) {
  const [borrador, setBorrador] = useState(employee.name);

  if (editando) {
    return (
      <div className="flex flex-col gap-2.5 px-5 py-3.5 sm:flex-row sm:items-center">
        <input
          autoFocus
          value={borrador}
          maxLength={120}
          onChange={(event) => setBorrador(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onGuardar(employee, borrador);
            }
            if (event.key === 'Escape') {
              setBorrador(employee.name);
              onEditar(null);
            }
          }}
          className={cn(INPUT, 'sm:flex-1')}
        />

        <div className="flex gap-2">
          <button
            type="button"
            disabled={ocupado}
            onClick={() => onGuardar(employee, borrador)}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-btn bg-brand px-4 text-[13px] font-semibold text-white transition-colors duration-200 hover:bg-brand-2 disabled:opacity-60 sm:flex-none"
          >
            <Check className="size-4" aria-hidden />
            Guardar
          </button>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => {
              setBorrador(employee.name);
              onEditar(null);
            }}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-btn border border-line px-4 text-[13px] font-semibold text-muted transition-colors duration-200 hover:text-ink disabled:opacity-60 sm:flex-none"
          >
            <X className="size-4" aria-hidden />
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    // Debajo de 400px los botones bajan a su propio renglón: si no, el nombre
    // se recorta a dos o tres letras.
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 px-5 py-3.5">
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

      <span className="min-w-0 flex-1 basis-[calc(100%-3.25rem)] min-[400px]:basis-auto">
        <span
          className={cn(
            'block truncate text-[15px] font-semibold',
            employee.active ? 'text-ink' : 'text-muted',
          )}
        >
          {employee.name}
        </span>
        <span className="block text-xs text-muted">
          {employee.active ? 'Activo' : 'Inactivo'}
        </span>
      </span>

      {esJefe && (
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <IconButton
            label={`Editar ${employee.name}`}
            disabled={ocupado}
            onClick={() => onEditar(employee.id)}
          >
            <Pencil className="size-4" aria-hidden />
          </IconButton>

          {/* El texto solo cabe desde 480px; en móvil queda como icono. */}
          <button
            type="button"
            disabled={ocupado}
            onClick={() => onToggle(employee)}
            aria-label={
              employee.active ? `Desactivar a ${employee.name}` : `Activar a ${employee.name}`
            }
            title={employee.active ? 'Desactivar' : 'Activar'}
            className={cn(
              'flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-btn border',
              'size-11 text-[13px] font-semibold transition-colors duration-200',
              'disabled:opacity-60 min-[480px]:w-auto min-[480px]:px-3',
              employee.active
                ? 'border-line text-muted hover:border-warn/40 hover:text-warn'
                : 'border-brand text-brand hover:bg-brand-soft',
            )}
          >
            {employee.active ? (
              <UserRoundX className="size-4 shrink-0" aria-hidden />
            ) : (
              <UserRoundCheck className="size-4 shrink-0" aria-hidden />
            )}
            <span className="hidden min-[480px]:inline">
              {employee.active ? 'Desactivar' : 'Activar'}
            </span>
          </button>

          <IconButton
            label={`Eliminar ${employee.name}`}
            disabled={ocupado}
            danger
            onClick={() => onEliminar(employee)}
          >
            <Trash2 className="size-4" aria-hidden />
          </IconButton>
        </div>
      )}
    </div>
  );
}

function IconButton({
  label,
  danger,
  disabled,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-btn border border-transparent',
        'transition-colors duration-200 disabled:opacity-60',
        danger
          ? 'text-muted hover:border-danger/30 hover:bg-danger-soft hover:text-danger'
          : 'text-muted hover:border-brand-ring hover:bg-brand-soft hover:text-brand',
      )}
    >
      {children}
    </button>
  );
}
