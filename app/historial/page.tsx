import type { Metadata } from 'next';
import { HistoryView } from '@/components/HistoryView';
import { getEmployees } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Historial de entregas' };

export default async function HistoryPage() {
  // Si Supabase no responde, la vista muestra su propio estado de error.
  const employees = await getEmployees().catch(() => []);
  return <HistoryView employees={employees} />;
}
