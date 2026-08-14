import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-lg', className)} aria-hidden />;
}

export function DeliveryCardSkeleton() {
  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="size-11 rounded-xl" />
      </div>
      <div className="mt-4 flex gap-2 border-t border-line pt-4">
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[0, 1, 2].map((index) => (
        <Skeleton key={index} className="h-28 rounded-card" />
      ))}
    </div>
  );
}
