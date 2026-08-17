import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { NewAssignmentForm } from '@/components/NewAssignmentForm';
import { requireUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const metadata: Metadata = { title: 'Asignar entrega' };
export const dynamic = 'force-dynamic';

export default async function NuevaTareaPage() {
  const user = await requireUser();
  if (user.role !== 'jefe') redirect('/tareas');

  const { data } = await getSupabaseAdmin()
    .from('app_users')
    .select('id, name, role')
    .eq('active', true)
    .order('name');

  const personas = (data ?? []) as Array<{ id: string; name: string; role: string }>;

  return (
    <div className="mx-auto max-w-2xl">
      <NewAssignmentForm personas={personas} />
    </div>
  );
}
