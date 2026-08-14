'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { History, Home, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

const ITEMS = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/registrar', label: 'Registrar', icon: Plus, highlight: true },
  { href: '/historial', label: 'Historial', icon: History },
] as const;

function useActive(href: string) {
  const pathname = usePathname();
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}

/**
 * Dock flotante. No se pega al borde: va suspendido sobre el contenido con
 * márgenes laterales, forma de píldora y sombra marcada.
 */
export function BottomNavigation() {
  return (
    <nav
      aria-label="Navegación principal"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 md:hidden"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <ul
        className={cn(
          'pointer-events-auto flex w-full max-w-sm items-center justify-between',
          'rounded-full border border-line/80 bg-surface/85 px-2.5 py-2',
          'shadow-float backdrop-blur-xl',
        )}
      >
        {ITEMS.map((item) => (
          <DockItem key={item.href} {...item} />
        ))}
      </ul>
    </nav>
  );
}

function DockItem({
  href,
  label,
  icon: Icon,
  highlight,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  highlight?: boolean;
}) {
  const active = useActive(href);

  if (highlight) {
    return (
      <li className="-mt-7">
        <Link
          href={href}
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          className="group flex flex-col items-center gap-1"
        >
          <span
            className={cn(
              'flex size-14 items-center justify-center rounded-full text-white',
              'gradient-brand ring-4 ring-surface/90',
              'shadow-[0_10px_24px_rgba(55,39,126,0.45)]',
              'transition-transform duration-200 ease-out',
              active ? 'scale-105' : 'group-active:scale-95',
            )}
          >
            <Plus className="size-7" strokeWidth={2.5} aria-hidden />
          </span>
          <span
            className={cn(
              'text-[11px] font-bold transition-colors duration-200',
              active ? 'text-brand' : 'text-muted',
            )}
          >
            {label}
          </span>
        </Link>
      </li>
    );
  }

  return (
    <li className="flex-1">
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'mx-auto flex h-12 w-full max-w-24 flex-col items-center justify-center gap-0.5 rounded-full',
          'transition-colors duration-200',
          active ? 'bg-brand-soft text-brand' : 'text-muted hover:text-brand',
        )}
      >
        <Icon className={cn('size-[21px]', active && 'stroke-[2.4]')} aria-hidden />
        <span className="text-[11px] font-semibold">{label}</span>
      </Link>
    </li>
  );
}

/**
 * Dock flotante de escritorio. Se posiciona en absoluto sobre el borde inferior
 * del encabezado para que quede suspendido sin ocupar altura propia.
 */
export function DesktopNavigation() {
  return (
    <>
      {/* Difumina el contenido que pasa por detrás del dock al hacer scroll. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-full hidden h-16 bg-gradient-to-b from-canvas via-canvas/80 to-transparent md:block"
      />

      <nav
        aria-label="Navegación principal"
        className="pointer-events-none absolute inset-x-0 -bottom-7 hidden justify-center px-6 md:flex"
      >
        <ul
          className={cn(
            'pointer-events-auto flex items-center gap-1',
            'rounded-full border border-line/70 bg-surface/90 p-1.5',
            'shadow-float backdrop-blur-xl',
          )}
        >
          {ITEMS.map((item) => (
            <DesktopItem key={item.href} {...item} />
          ))}
        </ul>
      </nav>
    </>
  );
}

function DesktopItem({
  href,
  label,
  icon: Icon,
  highlight,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  highlight?: boolean;
}) {
  const active = useActive(href);

  return (
    <li>
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold',
          'transition-all duration-200 ease-out active:scale-[0.97]',
          active
            ? 'gradient-brand text-white shadow-raised'
            : highlight
              ? 'text-brand hover:bg-brand-soft'
              : 'text-muted hover:bg-brand-soft hover:text-brand',
        )}
      >
        <Icon
          className={cn('size-[18px]', highlight && !active && 'stroke-[2.4]')}
          aria-hidden
        />
        {label}
      </Link>
    </li>
  );
}
