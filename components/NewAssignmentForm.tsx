'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ClipboardList, FileText, Receipt, Send, Timer, User } from 'lucide-react';
import { cn } from '@/lib/cn';
import { buildTitle } from '@/lib/validation';
import { TIME_PRESETS, type DocumentType } from '@/lib/types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { FieldShell } from './ui/Field';
import { useToast } from './ui/Toast';
import { plazoLegible } from './tiempo';

interface Persona {
  id: string;
  name: string;
  role: string;
}

export function NewAssignmentForm({ personas }: { personas: Persona[] }) {
  const router = useRouter();
  const toast = useToast();

  const [documentType, setDocumentType] = useState<DocumentType>('orden_trabajo');
  const [documentNumber, setDocumentNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [title, setTitle] = useState('');
  const [tituloEditado, setTituloEditado] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [minutos, setMinutos] = useState(120);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  const tituloAuto = buildTitle(documentType, documentNumber, clientName);
  const tituloFinal = tituloEditado ? title : tituloAuto;

  async function enviar(event: React.FormEvent) {
    event.preventDefault();
    if (enviando) return;

    setEnviando(true);
    setErrors({});

    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          document_type: documentType,
          document_number: documentNumber,
          client_name: clientName,
          address,
          title: tituloFinal,
          instructions,
          assigned_to: assignedTo,
          time_limit_minutes: minutos,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setErrors(data?.fields ?? {});
        toast.error(data?.error ?? 'No se pudo crear la tarea.');
        return;
      }

      toast.success('Entrega asignada');
      router.push('/tareas');
      router.refresh();
    } catch {
      toast.error('Sin conexión. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-5 animate-fade-up">
      <Card>
        <SectionTitle numero={1} titulo="Documento" descripcion="Qué se va a entregar." />

        <div className="mt-4 grid grid-cols-2 gap-3">
          {(
            [
              { value: 'orden_trabajo', label: 'Orden de Trabajo', icon: FileText },
              { value: 'factura', label: 'Factura', icon: Receipt },
            ] as const
          ).map((opcion) => {
            const activo = documentType === opcion.value;
            const Icon = opcion.icon;

            return (
              <button
                key={opcion.value}
                type="button"
                onClick={() => setDocumentType(opcion.value)}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 rounded-btn border px-3 py-4',
                  'text-sm font-semibold transition-colors duration-200',
                  activo
                    ? 'border-brand bg-brand text-white'
                    : 'border-line bg-surface text-muted hover:border-brand-ring',
                )}
              >
                <Icon className="size-5" aria-hidden />
                {opcion.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 space-y-4">
          <FieldShell
            label="Número de orden / factura"
            required
            error={errors.document_number}
            htmlFor="document_number"
          >
            <input
              id="document_number"
              value={documentNumber}
              onChange={(event) => setDocumentNumber(event.target.value)}
              placeholder={documentType === 'orden_trabajo' ? 'Ej. OT-001245' : 'Ej. FAC-004215'}
              className="h-13 w-full rounded-btn border border-line bg-surface px-4 text-[15px] outline-none transition-colors duration-200 focus:border-brand focus:ring-4 focus:ring-brand-ring/50"
            />
          </FieldShell>

          <FieldShell label="Cliente" required error={errors.client_name} htmlFor="client_name">
            <input
              id="client_name"
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              placeholder="Nombre del cliente o empresa"
              className="h-13 w-full rounded-btn border border-line bg-surface px-4 text-[15px] outline-none transition-colors duration-200 focus:border-brand focus:ring-4 focus:ring-brand-ring/50"
            />
          </FieldShell>

          <FieldShell label="Dirección" hint="Opcional" htmlFor="address">
            <input
              id="address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Dónde se entrega"
              className="h-13 w-full rounded-btn border border-line bg-surface px-4 text-[15px] outline-none transition-colors duration-200 focus:border-brand focus:ring-4 focus:ring-brand-ring/50"
            />
          </FieldShell>
        </div>
      </Card>

      <Card>
        <SectionTitle numero={2} titulo="Responsable" descripcion="Quién hace la entrega." />

        {personas.length === 0 ? (
          <p className="mt-4 rounded-btn bg-canvas px-4 py-3 text-sm text-muted">
            No hay personas activas para asignar.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {personas.map((persona) => {
              const activo = assignedTo === persona.id;

              return (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => setAssignedTo(persona.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-btn border px-4 py-3 text-left',
                    'transition-colors duration-200',
                    activo
                      ? 'border-brand bg-brand-soft'
                      : 'border-line bg-surface hover:border-brand-ring',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      activo ? 'bg-brand text-white' : 'bg-canvas text-muted',
                    )}
                  >
                    {persona.name
                      .split(' ')
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join('')}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block truncate text-sm font-semibold',
                        activo ? 'text-brand' : 'text-ink',
                      )}
                    >
                      {persona.name}
                    </span>
                    <span className="block text-xs text-muted">
                      {persona.role === 'jefe' ? 'Jefe' : 'Asistente'}
                    </span>
                  </span>

                  {activo && <Check className="size-5 shrink-0 text-brand" aria-hidden />}
                </button>
              );
            })}
          </div>
        )}

        {errors.assigned_to && (
          <p className="mt-2 text-xs font-medium text-danger">{errors.assigned_to}</p>
        )}
      </Card>

      <Card>
        <SectionTitle
          numero={3}
          titulo="Plazo"
          descripcion="Cuánto tiempo tiene desde que inicia."
        />

        <div className="mt-4 flex flex-wrap gap-2">
          {TIME_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setMinutos(preset)}
              className={cn(
                'h-11 rounded-btn border px-4 text-sm font-semibold transition-colors duration-200',
                minutos === preset
                  ? 'border-brand bg-brand text-white'
                  : 'border-line bg-surface text-muted hover:border-brand-ring hover:text-brand',
              )}
            >
              {plazoLegible(preset)}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <FieldShell
            label="O escribe los minutos"
            error={errors.time_limit_minutes}
            htmlFor="minutos"
          >
            <div className="relative">
              <Timer
                className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                id="minutos"
                type="number"
                inputMode="numeric"
                min={5}
                max={2880}
                value={minutos}
                onChange={(event) => setMinutos(Number(event.target.value))}
                className="h-13 w-full rounded-btn border border-line bg-surface pl-11 pr-4 text-[15px] outline-none transition-colors duration-200 focus:border-brand focus:ring-4 focus:ring-brand-ring/50"
              />
            </div>
          </FieldShell>
          <p className="mt-2 text-xs text-muted">
            El cronómetro arranca cuando la persona toca <strong>Iniciar entrega</strong>, no
            ahora.
          </p>
        </div>
      </Card>

      <Card>
        <SectionTitle numero={4} titulo="Detalle" descripcion="Título e instrucciones." />

        <div className="mt-4 space-y-4">
          <FieldShell
            label="Título de la tarea"
            required
            error={errors.title}
            hint="Se genera solo"
            htmlFor="title"
          >
            <input
              id="title"
              value={tituloFinal}
              onChange={(event) => {
                setTituloEditado(true);
                setTitle(event.target.value);
              }}
              placeholder="Ej. Entrega OT-001245 · Empresa ABC"
              className="h-13 w-full rounded-btn border border-line bg-surface px-4 text-[15px] outline-none transition-colors duration-200 focus:border-brand focus:ring-4 focus:ring-brand-ring/50"
            />
          </FieldShell>

          <FieldShell label="Instrucciones" hint="Opcional" htmlFor="instructions">
            <textarea
              id="instructions"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value.slice(0, 600))}
              rows={4}
              placeholder="Indicaciones para quien entrega: contacto, horario, referencias…"
              className="w-full resize-none rounded-btn border border-line bg-surface p-4 text-[15px] outline-none transition-colors duration-200 focus:border-brand focus:ring-4 focus:ring-brand-ring/50"
            />
            <p className="mt-1.5 text-right text-xs text-muted">{instructions.length} / 600</p>
          </FieldShell>
        </div>
      </Card>

      <Button type="submit" size="lg" fullWidth loading={enviando}>
        {!enviando && <Send className="size-[18px]" aria-hidden />}
        {enviando ? 'Asignando…' : 'Asignar entrega'}
      </Button>
    </form>
  );
}

function SectionTitle({
  numero,
  titulo,
  descripcion,
}: {
  numero: number;
  titulo: string;
  descripcion: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
        {numero}
      </span>
      <div>
        <h2 className="text-sm font-bold text-ink">{titulo}</h2>
        <p className="text-xs text-muted">{descripcion}</p>
      </div>
    </div>
  );
}
