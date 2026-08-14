import type { LucideIcon } from 'lucide-react';
import { Card } from './ui/Card';

interface StatsCardProps {
  icon: LucideIcon;
  value: number;
  label: string;
}

export function StatsCard({ icon: Icon, value, label }: StatsCardProps) {
  return (
    <Card className="px-3.5 py-4 transition-shadow duration-200 hover:shadow-raised sm:px-5 sm:py-5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
        <Icon className="size-[18px]" aria-hidden />
      </span>

      <p className="mt-3 text-2xl font-bold tabular-nums leading-none tracking-tight text-ink sm:text-[28px]">
        {value.toLocaleString('es-MX')}
      </p>
      <p className="mt-1.5 text-xs leading-snug text-muted sm:text-[13px]">{label}</p>
    </Card>
  );
}
