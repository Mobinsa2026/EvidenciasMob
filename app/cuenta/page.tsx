import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, HardDrive, ShieldCheck, User } from 'lucide-react';
import { ChangePasswordForm } from '@/components/ChangePasswordForm';
import { Card } from '@/components/ui/Card';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Mi cuenta' };
export const dynamic = 'force-dynamic';

export default async function CuentaPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-lg space-y-5 animate-fade-up">
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-base font-bold text-brand">
            {user.name
              .split(' ')
              .slice(0, 2)
              .map((p) => p[0])
              .join('')}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-ink">{user.name}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
              {user.role === 'jefe' ? (
                <>
                  <ShieldCheck className="size-4 text-brand" aria-hidden />
                  Jefe
                </>
              ) : (
                <>
                  <User className="size-4" aria-hidden />
                  Asistente
                </>
              )}
              · @{user.username}
            </p>
          </div>
        </div>
      </Card>

      {user.role === 'jefe' && (
        <Link
          href="/almacenamiento"
          className="flex items-center gap-3 rounded-card border border-line bg-surface p-5 shadow-card transition-colors duration-200 hover:bg-canvas"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <HardDrive className="size-5" aria-hidden />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">Almacenamiento y respaldos</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              Cuánto espacio queda y descarga del respaldo mensual.
            </p>
          </div>

          <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
        </Link>
      )}

      <ChangePasswordForm />
    </div>
  );
}
