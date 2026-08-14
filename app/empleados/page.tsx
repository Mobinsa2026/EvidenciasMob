import type { Metadata } from 'next';
import { EmployeeManager } from '@/components/EmployeeManager';
import { SetupNotice } from '@/components/SetupNotice';
import { getEmployees } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Empleados' };

export default async function EmployeesPage() {
  try {
    const employees = await getEmployees();
    return <EmployeeManager initialEmployees={employees} />;
  } catch (error) {
    return <SetupNotice message={error instanceof Error ? error.message : undefined} />;
  }
}
