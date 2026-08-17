import type { Metadata } from 'next';
import { EmployeeManager } from '@/components/EmployeeManager';
import { SetupNotice } from '@/components/SetupNotice';
import { requireUser } from '@/lib/auth';
import { getEmployees } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Empleados' };

export default async function EmployeesPage() {
  try {
    // Los asistentes ven la lista, pero solo el jefe la modifica.
    const [user, employees] = await Promise.all([requireUser(), getEmployees()]);
    return (
      <EmployeeManager initialEmployees={employees} esJefe={user.role === 'jefe'} />
    );
  } catch (error) {
    return <SetupNotice message={error instanceof Error ? error.message : undefined} />;
  }
}
