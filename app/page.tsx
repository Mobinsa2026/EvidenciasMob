import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowRight, CalendarDays, FileStack, Plus, Truck, Users } from 'lucide-react';
import { DeliveryRow } from '@/components/DeliveryCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SetupNotice } from '@/components/SetupNotice';
import { StatsCard } from '@/components/StatsCard';
import { Card } from '@/components/ui/Card';
import { Skeleton, StatsSkeleton } from '@/components/ui/Skeleton';
import { getRecentDeliveries, getStats } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div className="space-y-7 animate-fade-up">
      <Hero />

      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>

      <Suspense fallback={<RecentSkeleton />}>
        <RecentSection />
      </Suspense>
    </div>
  );
}

function Hero() {
  return (
    <section>
      <h1 className="text-[26px] font-bold leading-tight tracking-tight text-brand sm:text-3xl">
        Evidencias de Entrega
      </h1>
      <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted">
        Registra y consulta las evidencias de órdenes de trabajo y facturas entregadas.
      </p>

      <Link
        href="/registrar"
        className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-btn gradient-brand text-base font-semibold text-white shadow-raised transition-all duration-200 hover:brightness-110 active:scale-[0.985] sm:w-auto sm:px-7"
      >
        <Plus className="size-5" aria-hidden />
        Registrar nueva entrega
      </Link>
    </section>
  );
}

async function StatsSection() {
  try {
    const stats = await getStats();
    return (
      <section className="grid grid-cols-3 gap-3">
        <StatsCard icon={Truck} value={stats.today} label="Entregas hoy" />
        <StatsCard icon={CalendarDays} value={stats.this_week} label="Esta semana" />
        <StatsCard icon={FileStack} value={stats.total} label="Total de evidencias" />
      </section>
    );
  } catch (error) {
    return <SetupNotice message={error instanceof Error ? error.message : undefined} />;
  }
}

async function RecentSection() {
  let deliveries;
  try {
    deliveries = await getRecentDeliveries(5);
  } catch {
    return null;
  }

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-bold tracking-tight text-ink">Entregas recientes</h2>
        {deliveries.length > 0 && (
          <Link
            href="/historial"
            className="-my-2 inline-flex min-h-11 items-center gap-1 py-2 text-sm font-semibold text-brand transition-colors duration-200 hover:text-brand-2"
          >
            Ver historial
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>

      {deliveries.length === 0 ? (
        <EmptyState
          icon={<FileStack className="size-6" aria-hidden />}
          title="Aún no hay evidencias registradas"
          description="Las entregas que registres aparecerán aquí."
          action={
            <Link
              href="/registrar"
              className="inline-flex h-12 items-center gap-2 rounded-btn bg-brand px-5 font-semibold text-white shadow-raised transition-colors duration-200 hover:bg-brand-2"
            >
              <Plus className="size-5" aria-hidden />
              Registrar primera entrega
            </Link>
          }
        />
      ) : (
        <>
          <Card className="divide-y divide-line overflow-hidden">
            {deliveries.map((delivery) => (
              <DeliveryRow key={delivery.id} delivery={delivery} />
            ))}
          </Card>

          <Link
            href="/historial"
            className="mt-3 flex h-12 items-center justify-center rounded-btn border border-line bg-surface text-sm font-semibold text-brand transition-colors duration-200 hover:bg-brand-soft"
          >
            Ver historial completo
          </Link>
        </>
      )}

      <Link
        href="/empleados"
        className="mt-4 flex items-center gap-3 rounded-card border border-line bg-surface px-5 py-4 transition-colors duration-200 hover:bg-canvas"
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Users className="size-[18px]" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">Empleados</span>
          <span className="block text-xs text-muted">
            Administra quién puede realizar entregas.
          </span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden />
      </Link>
    </section>
  );
}

function RecentSkeleton() {
  return (
    <section>
      <Skeleton className="mb-3 h-6 w-44" />
      <Card className="divide-y divide-line overflow-hidden">
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="flex items-center gap-3.5 px-5 py-3.5">
            <Skeleton className="size-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
        ))}
      </Card>
    </section>
  );
}
