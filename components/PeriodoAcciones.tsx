'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Archive,
  Check,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  TriangleAlert,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './ui/Button';
import { Portal } from './ui/Portal';
import { useToast } from './ui/Toast';

interface PeriodoAccionesProps {
  periodo: string;
  etiqueta: string;
  entregas: number;
  bytes: string;
  respaldadoEn: string | null;
  archivado: boolean;
}

/**
 * Descargar el respaldo de un mes y, con él ya descargado, liberar su espacio.
 *
 * El orden importa y por eso está impuesto en la interfaz: el botón de liberar
 * no existe hasta que hay respaldo. El backend lo vuelve a verificar, porque
 * una interfaz no es un control de seguridad.
 */
export function PeriodoAcciones({
  periodo,
  etiqueta,
  entregas,
  bytes,
  respaldadoEn,
  archivado,
}: PeriodoAccionesProps) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [descargando, setDescargando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const [liberando, setLiberando] = useState(false);

  useEffect(() => {
    if (!abierto) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !liberando) cerrar();
    }

    document.addEventListener('keydown', onKeyDown);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => inputRef.current?.focus(), 120);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, liberando]);

  function cerrar() {
    setAbierto(false);
    setPassword('');
    setVisible(false);
    setError('');
  }

  async function descargar() {
    if (descargando) return;
    setDescargando(true);

    try {
      const response = await fetch(`/api/respaldo?periodo=${periodo}`);

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? 'No se pudo generar el respaldo.');
        return;
      }

      // El ZIP llega como stream; se materializa en un blob para entregarlo al
      // navegador como descarga.
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `respaldo-${periodo}.zip`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      toast.success(`Respaldo de ${etiqueta} descargado`);
      router.refresh();
    } catch {
      toast.error('Sin conexión. Revisa tu red e inténtalo de nuevo.');
    } finally {
      setDescargando(false);
    }
  }

  async function liberar() {
    if (liberando) return;

    if (!password) {
      setError('Ingresa la contraseña para liberar el espacio.');
      return;
    }

    setLiberando(true);
    setError('');

    try {
      const response = await fetch('/api/almacenamiento/archivar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ periodo, password }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error ?? 'No se pudo liberar el espacio.');
        setPassword('');
        inputRef.current?.focus();
        return;
      }

      toast.success(`Espacio de ${etiqueta} liberado`);
      cerrar();
      router.refresh();
    } catch {
      setError('Sin conexión. Revisa tu red e inténtalo de nuevo.');
    } finally {
      setLiberando(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void descargar()}
          disabled={descargando || entregas === 0}
          className="flex h-9 items-center gap-1.5 rounded-btn border border-brand bg-surface px-3 text-xs font-semibold text-brand transition-colors duration-200 hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {descargando ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Download className="size-3.5" aria-hidden />
          )}
          {descargando ? 'Preparando…' : 'Respaldo'}
        </button>

        {archivado ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <Archive className="size-3.5" aria-hidden />
            Archivado
          </span>
        ) : respaldadoEn ? (
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="flex h-9 items-center gap-1.5 rounded-btn border border-line bg-surface px-3 text-xs font-semibold text-ink transition-colors duration-200 hover:bg-canvas"
          >
            <Archive className="size-3.5" aria-hidden />
            Liberar {bytes}
          </button>
        ) : (
          <span className="text-xs text-muted">Descarga el respaldo para poder liberar</span>
        )}
      </div>

      {abierto && (
        <Portal>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="liberar-title"
            className="fixed inset-0 z-[90] flex items-end justify-center overflow-y-auto bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => !liberando && cerrar()}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-md rounded-t-2xl border border-line bg-surface shadow-float animate-fade-up sm:rounded-card"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <div className="flex items-start gap-3 border-b border-line px-5 py-4">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-warn-soft text-warn">
                  <TriangleAlert className="size-[18px]" aria-hidden />
                </span>

                <div className="min-w-0 flex-1">
                  <h2 id="liberar-title" className="text-[15px] font-bold text-ink">
                    Liberar {bytes}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted">
                    {etiqueta} · {entregas} entrega{entregas === 1 ? '' : 's'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={cerrar}
                  disabled={liberando}
                  aria-label="Cancelar"
                  className="-mr-1 flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-canvas hover:text-ink disabled:opacity-50"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>

              <div className="space-y-4 px-5 py-5">
                <div className="flex items-start gap-2.5 rounded-btn bg-success-soft px-3.5 py-3">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  <p className="text-xs leading-relaxed text-ink">
                    Respaldo descargado el {respaldadoEn}. Guárdalo en OneDrive antes de
                    continuar: es la única copia de estas fotografías.
                  </p>
                </div>

                <p className="text-sm leading-relaxed text-muted">
                  Se borrarán de Supabase las fotografías y firmas de{' '}
                  <strong className="font-semibold text-ink">{etiqueta}</strong>. Las{' '}
                  {entregas} entrega{entregas === 1 ? '' : 's'} seguirá
                  {entregas === 1 ? '' : 'n'} en el historial con folio, cliente, fecha y
                  responsable — solo las imágenes se van al respaldo.
                </p>

                <div>
                  <label
                    htmlFor="liberar-password"
                    className="mb-2 block text-sm font-semibold text-ink"
                  >
                    Contraseña de autorización
                  </label>

                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted"
                      aria-hidden
                    />
                    <input
                      ref={inputRef}
                      id="liberar-password"
                      type={visible ? 'text' : 'password'}
                      value={password}
                      autoComplete="off"
                      disabled={liberando}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setError('');
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void liberar();
                        }
                      }}
                      placeholder="Contraseña"
                      className={cn(
                        'h-13 w-full rounded-btn border bg-surface pl-11 pr-11 text-[15px] text-ink outline-none',
                        'transition-colors duration-200 placeholder:text-muted/70',
                        'focus:border-brand focus:ring-4 focus:ring-brand-ring/50',
                        error
                          ? 'border-danger focus:border-danger focus:ring-danger/15'
                          : 'border-line',
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setVisible((current) => !current)}
                      aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-canvas hover:text-ink"
                    >
                      {visible ? (
                        <EyeOff className="size-4" aria-hidden />
                      ) : (
                        <Eye className="size-4" aria-hidden />
                      )}
                    </button>
                  </div>

                  {error && (
                    <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-danger animate-fade-up">
                      <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
                      {error}
                    </p>
                  )}
                </div>

                <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
                  <Button
                    variant="secondary"
                    size="lg"
                    fullWidth
                    disabled={liberando}
                    onClick={cerrar}
                  >
                    Cancelar
                  </Button>

                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={liberando}
                    onClick={() => void liberar()}
                  >
                    {!liberando && <Archive className="size-[18px]" aria-hidden />}
                    {liberando ? 'Liberando…' : `Liberar ${bytes}`}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
