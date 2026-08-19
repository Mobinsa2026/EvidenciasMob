import { NextRequest } from 'next/server';
import { jsonOk, tooManyRequests } from '@/lib/api';
import { limitRead } from '@/lib/rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * Señal de vida del proyecto.
 *
 * Los proyectos del plan gratuito de Supabase se pausan tras siete días sin
 * peticiones, y despausarlos es manual. Un ping diario desde GitHub Actions
 * mantiene la base despierta durante vacaciones o puentes largos.
 *
 * Es público —no puede autenticarse un cron— pero no revela nada: solo dice si
 * la base responde. Pasa por el límite de peticiones como cualquier otra ruta.
 */

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const limit = limitRead(request);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  // Consulta mínima: toca la base sin traer datos.
  const { error } = await getSupabaseAdmin()
    .from('employees')
    .select('id', { count: 'exact', head: true });

  return jsonOk({ ok: !error, at: new Date().toISOString() }, error ? 503 : 200);
}
