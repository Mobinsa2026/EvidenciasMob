import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DeliveryForm } from '@/components/DeliveryForm';
import { SetupNotice } from '@/components/SetupNotice';
import { getAssignment } from '@/lib/assignments';
import { requireUser } from '@/lib/auth';
import { getEmployees } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Nueva evidencia' };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ tarea?: string }>;
}) {
  try {
    const user = await requireUser();
    const { tarea } = await searchParams;

    // Cuando se llega desde una tarea, la evidencia la cierra: se precargan sus
    // datos y al guardar se detiene el cronómetro.
    const assignment = tarea ? await getAssignment(tarea) : null;

    if (tarea && (!assignment || assignment.assigned_to !== user.id)) {
      redirect('/tareas');
    }
    if (assignment && assignment.status === 'pendiente') {
      redirect(`/tareas/${assignment.id}`);
    }

    const employees = await getEmployees(true);

    return (
      <DeliveryForm
        initialEmployees={employees}
        currentEmployeeId={user.employee_id}
        assignment={
          assignment
            ? {
                id: assignment.id,
                folio: assignment.folio,
                document_type: assignment.document_type,
                document_number: assignment.document_number,
                client_name: assignment.client_name,
                title: assignment.title,
              }
            : null
        }
      />
    );
  } catch (error) {
    return <SetupNotice message={error instanceof Error ? error.message : undefined} />;
  }
}
