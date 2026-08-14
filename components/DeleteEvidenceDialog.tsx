'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Lock, Trash2, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './ui/Button';
import { Portal } from './ui/Portal';
import { useToast } from './ui/Toast';

interface DeleteEvidenceDialogProps {
  id: string;
  folio: string;
}

/**
 * Borrado protegido por contraseña. La contraseña nunca se compara en el
 * navegador: se envía al backend, que responde sí o no.
 */
export function DeleteEvidenceDialog({ id, folio }: DeleteEvidenceDialogProps) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !deleting) close();
    }

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 120);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      clearTimeout(focusTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, deleting]);

  function close() {
    setOpen(false);
    setPassword('');
    setVisible(false);
    setError('');
  }

  async function confirmDelete() {
    if (deleting) return;

    if (!password) {
      setError('Ingresa la contraseña para eliminar.');
      return;
    }

    setDeleting(true);
    setError('');

    try {
      const response = await fetch(`/api/deliveries/${id}`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error ?? 'No se pudo eliminar la evidencia.');
        setPassword('');
        inputRef.current?.focus();
        return;
      }

      toast.success(`Evidencia ${folio} eliminada`);
      close();
      router.replace('/historial');
      router.refresh();
    } catch {
      setError('Sin conexión. Revisa tu red e inténtalo de nuevo.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-btn border border-danger/30 bg-surface text-sm font-semibold text-danger transition-colors duration-200 hover:bg-danger-soft"
      >
        <Trash2 className="size-4" aria-hidden />
        Eliminar evidencia
      </button>

      {open && (
        <Portal>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="fixed inset-0 z-[90] flex items-end justify-center overflow-y-auto bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => !deleting && close()}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-md rounded-t-2xl border border-line bg-surface shadow-float animate-fade-up sm:rounded-card"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <div className="flex items-start gap-3 border-b border-line px-5 py-4">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
                  <TriangleAlert className="size-[18px]" aria-hidden />
                </span>

                <div className="min-w-0 flex-1">
                  <h2 id="delete-title" className="text-[15px] font-bold text-ink">
                    Eliminar evidencia
                  </h2>
                  <p className="mt-0.5 break-all font-mono text-xs text-muted">{folio}</p>
                </div>

                <button
                  type="button"
                  onClick={close}
                  disabled={deleting}
                  aria-label="Cancelar"
                  className="-mr-1 flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-canvas hover:text-ink disabled:opacity-50"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>

              <div className="space-y-4 px-5 py-5">
                <p className="text-sm leading-relaxed text-muted">
                  Esta acción es{' '}
                  <strong className="font-semibold text-ink">permanente</strong>. Se
                  borrarán el registro, las fotografías y la firma. No se puede deshacer.
                </p>

                <div>
                  <label
                    htmlFor="delete-password"
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
                      id="delete-password"
                      type={visible ? 'text' : 'password'}
                      value={password}
                      autoComplete="off"
                      disabled={deleting}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setError('');
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void confirmDelete();
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

                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    Solo el responsable autorizado puede eliminar evidencias.
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
                  <Button
                    variant="secondary"
                    size="lg"
                    fullWidth
                    disabled={deleting}
                    onClick={close}
                  >
                    Cancelar
                  </Button>

                  <Button
                    variant="danger"
                    size="lg"
                    fullWidth
                    loading={deleting}
                    onClick={() => void confirmDelete()}
                  >
                    {!deleting && <Trash2 className="size-[18px]" aria-hidden />}
                    {deleting ? 'Eliminando…' : 'Eliminar'}
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
