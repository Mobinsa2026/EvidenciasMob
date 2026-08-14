'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Monta el contenido directamente en <body>.
 *
 * Necesario para overlays a pantalla completa: un ancestro con `transform`
 * (por ejemplo una animación de entrada) crea un containing block y haría que
 * `position: fixed` se midiera contra ese ancestro en lugar de la ventana.
 */
export function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
