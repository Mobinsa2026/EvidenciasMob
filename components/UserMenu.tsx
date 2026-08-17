'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, KeyRound, LogOut, ShieldCheck, Users } from 'lucide-react';
import type { SessionUser } from '@/lib/types';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  async function logout() {
    if (leaving) return;
    setLeaving(true);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    router.replace('/login');
    router.refresh();
  }

  const esJefe = user.role === 'jefe';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Cuenta de ${user.name}`}
        className="flex size-11 items-center justify-center rounded-xl transition-colors duration-200 hover:bg-white/15 active:bg-white/25"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-white/20 text-[13px] font-bold ring-1 ring-white/25">
          {initials(user.name)}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-card border border-line bg-surface text-ink shadow-float animate-fade-up"
        >
          <div className="border-b border-line px-4 py-3.5">
            <p className="truncate text-sm font-bold">{user.name}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
              {esJefe && <ShieldCheck className="size-3.5 text-brand" aria-hidden />}
              {esJefe ? 'Jefe' : 'Asistente'} · @{user.username}
            </p>
          </div>

          <div className="p-1.5">
            {esJefe && (
              <>
                <MenuLink href="/kpi" icon={BarChart3} onClick={() => setOpen(false)}>
                  Desempeño del equipo
                </MenuLink>
                <MenuLink href="/empleados" icon={Users} onClick={() => setOpen(false)}>
                  Empleados
                </MenuLink>
              </>
            )}

            <MenuLink href="/cuenta" icon={KeyRound} onClick={() => setOpen(false)}>
              Cambiar contraseña
            </MenuLink>

            <button
              type="button"
              role="menuitem"
              onClick={logout}
              disabled={leaving}
              className="flex h-11 w-full items-center gap-2.5 rounded-btn px-3 text-sm font-semibold text-danger transition-colors duration-200 hover:bg-danger-soft disabled:opacity-60"
            >
              <LogOut className="size-[18px]" aria-hidden />
              {leaving ? 'Saliendo…' : 'Cerrar sesión'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
  onClick,
}: {
  href: string;
  icon: typeof Users;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="flex h-11 items-center gap-2.5 rounded-btn px-3 text-sm font-semibold text-ink transition-colors duration-200 hover:bg-brand-soft hover:text-brand"
    >
      <Icon className="size-[18px] text-muted" aria-hidden />
      {children}
    </Link>
  );
}
