import type { Metadata } from 'next';
import { ShieldCheck, User } from 'lucide-react';
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

      <ChangePasswordForm />
    </div>
  );
}
