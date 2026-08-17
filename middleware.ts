import { NextRequest, NextResponse } from 'next/server';

/**
 * Puerta de entrada: sin cookie de sesión, todo redirige a /login.
 *
 * Aquí solo se comprueba que la cookie exista — la verificación de la firma y
 * del rol ocurre en el servidor (lib/auth.ts), porque el middleware corre en el
 * runtime Edge y no tiene acceso a node:crypto ni a Supabase.
 */

const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get('evidencias_session')?.value);
  if (hasSession) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Inicia sesión para continuar.' }, { status: 401 });
  }

  const loginUrl = new URL('/login', request.url);
  if (pathname !== '/') loginUrl.searchParams.set('destino', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Todo excepto archivos estáticos y los iconos de la app.
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|icon.png|apple-icon.png).*)',
  ],
};
