import type { Metadata } from 'next';
import { DeliveryForm } from '@/components/DeliveryForm';
import { SetupNotice } from '@/components/SetupNotice';
import { getEmployees } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Nueva evidencia' };

export default async function RegisterPage() {
  try {
    const employees = await getEmployees(true);
    return <DeliveryForm initialEmployees={employees} />;
  } catch (error) {
    return <SetupNotice message={error instanceof Error ? error.message : undefined} />;
  }
}
