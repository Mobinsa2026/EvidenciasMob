'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, BellOff, CheckCheck } from 'lucide-react';
import { formatRelativeDateTime } from '@/lib/format';
import type { Notification } from '@/lib/types';

/** Cada cuánto se consulta si hay avisos nuevos. */
const POLL_MS = 20_000;

export function NotificationBell() {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?limit=15', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      setItems(data.notifications ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      // Sin red: se reintenta en el siguiente ciclo.
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      // Solo consulta si la pestaña está visible: no gasta datos en segundo plano.
      if (document.visibilityState === 'visible') void load();
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [load]);

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

  async function markAllRead() {
    setUnread(0);
    setItems((current) =>
      current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })),
    );
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    }).catch(() => null);
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          if (!open) void load();
        }}
        aria-label={unread ? `Notificaciones (${unread} sin leer)` : 'Notificaciones'}
        className="relative flex size-11 items-center justify-center rounded-xl transition-colors duration-200 hover:bg-white/15 active:bg-white/25"
      >
        <Bell className="size-[19px]" aria-hidden />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-[18px] text-white ring-2 ring-brand">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-card border border-line bg-surface text-ink shadow-float animate-fade-up">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-bold">Notificaciones</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1.5 text-xs font-semibold text-brand transition-colors duration-200 hover:text-brand-2"
              >
                <CheckCheck className="size-3.5" aria-hidden />
                Marcar leídas
              </button>
            )}
          </div>

          <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <BellOff className="size-6 text-muted" aria-hidden />
                <p className="text-sm font-semibold text-ink">Sin notificaciones</p>
                <p className="text-xs text-muted">Aquí llegarán tus avisos.</p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((item) => {
                  const contenido = (
                    <>
                      <div className="flex items-start gap-2">
                        {!item.read_at && (
                          <span
                            className="mt-1.5 size-2 shrink-0 rounded-full bg-brand"
                            aria-label="Sin leer"
                          />
                        )}
                        <div className={item.read_at ? 'min-w-0 pl-4' : 'min-w-0'}>
                          <p className="text-[13px] font-semibold leading-snug text-ink">
                            {item.title}
                          </p>
                          {item.body && (
                            <p className="mt-0.5 text-xs leading-snug text-muted">{item.body}</p>
                          )}
                          <p className="mt-1 text-[11px] text-muted">
                            {formatRelativeDateTime(item.created_at)}
                          </p>
                        </div>
                      </div>
                    </>
                  );

                  return (
                    <li key={item.id}>
                      {item.assignment_id ? (
                        <Link
                          href={`/tareas/${item.assignment_id}`}
                          onClick={() => setOpen(false)}
                          className="block px-4 py-3 transition-colors duration-200 hover:bg-canvas"
                        >
                          {contenido}
                        </Link>
                      ) : (
                        <div className="px-4 py-3">{contenido}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
