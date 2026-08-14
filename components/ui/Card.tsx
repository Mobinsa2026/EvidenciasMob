import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-card border border-line bg-surface shadow-card',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface SectionCardProps {
  step?: number;
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Bloque del formulario: numerado, con título y contenido separado. */
export function SectionCard({
  step,
  title,
  description,
  icon,
  action,
  children,
  className,
}: SectionCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="flex items-start gap-3 border-b border-line px-5 py-4">
        {step !== undefined ? (
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-bold text-brand">
            {step}
          </span>
        ) : icon ? (
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            {icon}
          </span>
        ) : null}

        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
          {description && (
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{description}</p>
          )}
        </div>

        {action}
      </div>

      <div className="space-y-5 px-5 py-5">{children}</div>
    </Card>
  );
}
