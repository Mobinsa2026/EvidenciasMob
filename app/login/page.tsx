import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { LoginForm } from '@/components/LoginForm';

export const metadata: Metadata = {
  title: 'Iniciar sesión · Evidencias',
};

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  // Si ya hay sesión válida, no tiene caso mostrar el formulario.
  const user = await getSessionUser().catch(() => null);
  if (user) redirect('/');

  return (
    <main className="flex min-h-dvh flex-col justify-center px-5 py-10">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
