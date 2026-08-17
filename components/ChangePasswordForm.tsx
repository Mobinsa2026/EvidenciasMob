'use client';

import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { FieldShell } from './ui/Field';
import { useToast } from './ui/Toast';

const INPUT =
  'h-13 w-full rounded-btn border border-line bg-surface px-4 text-[15px] outline-none ' +
  'transition-colors duration-200 focus:border-brand focus:ring-4 focus:ring-brand-ring/50';

export function ChangePasswordForm() {
  const toast = useToast();

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  async function enviar(event: React.FormEvent) {
    event.preventDefault();
    if (enviando) return;

    if (nueva !== repetir) {
      setErrors({ repetir: 'Las contraseñas no coinciden.' });
      return;
    }

    setEnviando(true);
    setErrors({});

    try {
      const response = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ actual, nueva }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setErrors(data?.fields ?? {});
        toast.error(data?.error ?? 'No se pudo cambiar la contraseña.');
        return;
      }

      toast.success('Contraseña actualizada');
      setActual('');
      setNueva('');
      setRepetir('');
    } catch {
      toast.error('Sin conexión. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-bold text-ink">Cambiar contraseña</h2>
      <p className="mt-1 text-xs text-muted">
        Usa al menos 8 caracteres. Cámbiala en cuanto entres por primera vez.
      </p>

      <form onSubmit={enviar} className="mt-4 space-y-4">
        <FieldShell label="Contraseña actual" required error={errors.actual} htmlFor="actual">
          <input
            id="actual"
            type="password"
            autoComplete="current-password"
            value={actual}
            onChange={(event) => setActual(event.target.value)}
            className={INPUT}
          />
        </FieldShell>

        <FieldShell label="Nueva contraseña" required error={errors.nueva} htmlFor="nueva">
          <input
            id="nueva"
            type="password"
            autoComplete="new-password"
            value={nueva}
            onChange={(event) => setNueva(event.target.value)}
            className={INPUT}
          />
        </FieldShell>

        <FieldShell label="Repite la nueva" required error={errors.repetir} htmlFor="repetir">
          <input
            id="repetir"
            type="password"
            autoComplete="new-password"
            value={repetir}
            onChange={(event) => setRepetir(event.target.value)}
            className={INPUT}
          />
        </FieldShell>

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={enviando}
          disabled={!actual || !nueva || !repetir}
        >
          {!enviando && <KeyRound className="size-[18px]" aria-hidden />}
          {enviando ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </form>
    </Card>
  );
}
