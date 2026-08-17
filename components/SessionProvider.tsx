'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { SessionUser } from '@/lib/types';

const SessionContext = createContext<SessionUser | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

/** Usuario de la sesión dentro de componentes de cliente. */
export function useSession(): SessionUser {
  const user = useContext(SessionContext);
  if (!user) {
    throw new Error('useSession debe usarse dentro de SessionProvider.');
  }
  return user;
}

export function useEsJefe(): boolean {
  return useSession().role === 'jefe';
}
