'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Images,
  Pause,
  Play,
  Timer,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { compressImage } from '@/lib/image';
import type { AssignmentView } from '@/lib/types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';
import { cronometro, duracionCorta } from './tiempo';

type Accion = 'iniciar' | 'pausar' | 'reanudar';

export function AssignmentTimer({
  assignment,
  puedeOperar,
}: {
  assignment: AssignmentView;
  puedeOperar: boolean;
}) {
  const router = useRouter();
  const toast = useToast();

  const [activos, setActivos] = useState(assignment.segundos_activos);
  const [pidiendoFoto, setPidiendoFoto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const corriendo = assignment.status === 'en_progreso';
  const limite = assignment.time_limit_minutes * 60;
  const restante = limite - activos;
  const vencida = restante < 0;

  // El contador avanza en el navegador desde el valor que calculó el servidor.
  useEffect(() => {
    setActivos(assignment.segundos_activos);
    if (!corriendo) return;

    const timer = setInterval(() => setActivos((current) => current + 1), 1000);
    return () => clearInterval(timer);
  }, [assignment.segundos_activos, corriendo]);

  async function ejecutar(accion: Accion, foto?: Blob) {
    if (enviando) return;
    setEnviando(true);

    try {
      const form = new FormData();
      form.set('accion', accion);
      if (foto) form.set('foto', foto, 'evidencia.webp');

      const response = await fetch(`/api/assignments/${assignment.id}/eventos`, {
        method: 'POST',
        body: form,
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(data?.error ?? 'No se pudo actualizar la tarea.');
        return;
      }

      const mensajes: Record<Accion, string> = {
        iniciar: 'Cronómetro iniciado',
        pausar: 'Tarea pausada',
        reanudar: 'Cronómetro reanudado',
      };
      toast.success(mensajes[accion]);
      setPidiendoFoto(false);
      router.refresh();
    } catch {
      toast.error('Sin conexión. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  if (assignment.status === 'completada') {
    return (
      <Card className="border-success/30 bg-success-soft/40">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle2 className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">Entrega completada</p>
            <p className="mt-0.5 text-sm text-muted">
              Tomó {duracionCorta(assignment.segundos_activos)} de un plazo de{' '}
              {duracionCorta(limite)}.
            </p>
            <p className="mt-1 text-xs font-semibold text-success">
              {assignment.segundos_activos <= limite
                ? '✓ Dentro del plazo'
                : `Se pasó por ${duracionCorta(assignment.segundos_activos - limite)}`}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (assignment.status === 'cancelada') {
    return (
      <Card>
        <p className="text-sm font-semibold text-muted">Esta tarea fue cancelada.</p>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'text-center',
        vencida && corriendo && 'border-danger/40',
        assignment.status === 'pausada' && 'border-warn/40',
      )}
    >
      <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
        <Timer className="size-3.5" aria-hidden />
        {assignment.status === 'pendiente'
          ? 'Sin iniciar'
          : assignment.status === 'pausada'
            ? 'En pausa'
            : vencida
              ? 'Tiempo excedido'
              : 'Tiempo restante'}
      </p>

      <p
        className={cn(
          'mt-2 font-mono text-4xl font-extrabold tabular-nums tracking-tight sm:text-5xl',
          assignment.status === 'pendiente'
            ? 'text-ink'
            : vencida
              ? 'text-danger'
              : restante < 900
                ? 'text-warn'
                : 'text-brand',
        )}
      >
        {assignment.status === 'pendiente'
          ? cronometro(limite)
          : cronometro(Math.abs(restante))}
      </p>

      <p className="mt-1.5 text-xs text-muted">
        {assignment.status === 'pendiente'
          ? `Tienes ${duracionCorta(limite)} desde que inicies`
          : `Llevas ${duracionCorta(activos)} de ${duracionCorta(limite)}`}
      </p>

      {!puedeOperar ? (
        <p className="mt-5 rounded-btn bg-canvas px-4 py-3 text-xs text-muted">
          Solo {assignment.assigned_to_name} puede mover este cronómetro.
        </p>
      ) : pidiendoFoto ? (
        <CapturaFoto
          enviando={enviando}
          onCancelar={() => setPidiendoFoto(false)}
          onConfirmar={(foto) => ejecutar('pausar', foto)}
        />
      ) : (
        <div className="mt-5 space-y-2.5">
          {assignment.status === 'pendiente' && (
            <Button
              size="lg"
              fullWidth
              loading={enviando}
              onClick={() => ejecutar('iniciar')}
            >
              {!enviando && <Play className="size-[18px]" aria-hidden />}
              Iniciar entrega
            </Button>
          )}

          {assignment.status === 'en_progreso' && (
            <>
              <Link
                href={`/registrar?tarea=${assignment.id}`}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-btn gradient-brand text-[15px] font-bold text-white shadow-raised transition-transform duration-200 active:scale-[0.99]"
              >
                <CheckCircle2 className="size-5" aria-hidden />
                Completar con evidencia
              </Link>

              <Button
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => setPidiendoFoto(true)}
              >
                <Pause className="size-[18px]" aria-hidden />
                Pausar
              </Button>
            </>
          )}

          {assignment.status === 'pausada' && (
            <Button
              size="lg"
              fullWidth
              loading={enviando}
              onClick={() => ejecutar('reanudar')}
            >
              {!enviando && <Play className="size-[18px]" aria-hidden />}
              Reanudar
            </Button>
          )}

          {assignment.status === 'en_progreso' && (
            <p className="pt-1 text-xs leading-relaxed text-muted">
              El tiempo solo se detiene con fotografía. Sin evidencia el reloj sigue corriendo.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

/**
 * Captura obligatoria para pausar. Ofrece cámara y galería por separado para
 * que en el celular la cámara se abra de inmediato.
 */
function CapturaFoto({
  enviando,
  onCancelar,
  onConfirmar,
}: {
  enviando: boolean;
  onCancelar: () => void;
  onConfirmar: (foto: Blob) => void;
}) {
  const toast = useToast();
  const camaraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function elegir(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setProcesando(true);
    try {
      const comprimida = await compressImage(file);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(comprimida.previewUrl);
      setBlob(comprimida.blob);
    } catch {
      toast.error('No se pudo procesar la fotografía.');
    } finally {
      setProcesando(false);
    }
  }

  function limpiar() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setBlob(null);
  }

  return (
    <div className="mt-5 space-y-3 rounded-btn border border-warn/30 bg-warn-soft/40 p-4 text-left animate-fade-up">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
        <p className="text-xs leading-relaxed text-ink">
          Para pausar necesitas una fotografía de cómo quedó la entrega. Sin ella el tiempo
          sigue corriendo.
        </p>
      </div>

      <input
        ref={camaraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={elegir}
        className="hidden"
      />
      <input
        ref={galeriaRef}
        type="file"
        accept="image/*"
        onChange={elegir}
        className="hidden"
      />

      {preview ? (
        <div className="relative overflow-hidden rounded-btn border border-line bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Fotografía de la pausa" className="h-44 w-full object-cover" />
          <button
            type="button"
            onClick={limpiar}
            aria-label="Quitar fotografía"
            className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-ink/70 text-white backdrop-blur transition-colors duration-200 hover:bg-danger"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={procesando}
            onClick={() => camaraRef.current?.click()}
            className="flex h-12 items-center justify-center gap-2 rounded-btn gradient-brand text-sm font-bold text-white disabled:opacity-60"
          >
            <Camera className="size-[18px]" aria-hidden />
            Cámara
          </button>
          <button
            type="button"
            disabled={procesando}
            onClick={() => galeriaRef.current?.click()}
            className="flex h-12 items-center justify-center gap-2 rounded-btn border border-brand bg-surface text-sm font-bold text-brand disabled:opacity-60"
          >
            <Images className="size-[18px]" aria-hidden />
            Galería
          </button>
        </div>
      )}

      {procesando && <p className="text-xs text-muted">Procesando fotografía…</p>}

      <div className="flex gap-2">
        <Button variant="secondary" fullWidth disabled={enviando} onClick={onCancelar}>
          <X className="size-4" aria-hidden />
          Cancelar
        </Button>
        <Button
          fullWidth
          loading={enviando}
          disabled={!blob}
          onClick={() => blob && onConfirmar(blob)}
        >
          {!enviando && <Pause className="size-4" aria-hidden />}
          Pausar
        </Button>
      </div>
    </div>
  );
}
