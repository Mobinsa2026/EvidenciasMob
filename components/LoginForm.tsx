'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, LogIn, PackageCheck, User } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './ui/Button';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const destino = params.get('destino') || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setErrors({});
    setGeneral('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setErrors(data?.fields ?? {});
        setGeneral(data?.error ?? 'No se pudo iniciar sesión.');
        setPassword('');
        return;
      }

      router.replace(destino);
      router.refresh();
    } catch {
      setGeneral('Sin conexión. Revisa tu red e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm animate-fade-up">
      <div className="mb-8 flex flex-col items-center text-center">
        <span className="mb-4 flex size-16 items-center justify-center rounded-2xl gradient-brand text-white shadow-raised">
          <PackageCheck className="size-8" aria-hidden />
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand">Evidencias</h1>
        <p className="mt-1 text-sm text-muted">Control de Entregas</p>
      </div>

      <form
        onSubmit={submit}
        className="space-y-5 rounded-card border border-line bg-surface p-6 shadow-card"
      >
        <div>
          <label htmlFor="username" className="mb-2 block text-sm font-semibold text-ink">
            Usuario
          </label>
          <div className="relative">
            <User
              className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              id="username"
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Ej. rosendo"
              disabled={loading}
              className={cn(
                'h-13 w-full rounded-btn border bg-surface pl-11 pr-4 text-[15px] text-ink outline-none',
                'transition-colors duration-200 placeholder:text-muted/70',
                'focus:border-brand focus:ring-4 focus:ring-brand-ring/50',
                errors.username ? 'border-danger' : 'border-line',
              )}
            />
          </div>
          {errors.username && <FieldError>{errors.username}</FieldError>}
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-semibold text-ink">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={visible ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Tu contraseña"
              disabled={loading}
              className={cn(
                'h-13 w-full rounded-btn border bg-surface pl-4 pr-12 text-[15px] text-ink outline-none',
                'transition-colors duration-200 placeholder:text-muted/70',
                'focus:border-brand focus:ring-4 focus:ring-brand-ring/50',
                errors.password ? 'border-danger' : 'border-line',
              )}
            />
            <button
              type="button"
              onClick={() => setVisible((current) => !current)}
              aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-canvas hover:text-ink"
            >
              {visible ? (
                <EyeOff className="size-[18px]" aria-hidden />
              ) : (
                <Eye className="size-[18px]" aria-hidden />
              )}
            </button>
          </div>
          {errors.password && <FieldError>{errors.password}</FieldError>}
        </div>

        {general && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-btn border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger animate-fade-up"
          >
            <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />
            {general}
          </p>
        )}

        <Button type="submit" size="lg" fullWidth loading={loading}>
          {!loading && <LogIn className="size-[18px]" aria-hidden />}
          {loading ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs leading-relaxed text-muted">
        Si olvidaste tu contraseña, pídele a Rosendo que te la restablezca.
      </p>
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-danger animate-fade-up">
      <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
      {children}
    </p>
  );
}
