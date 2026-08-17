import 'server-only';
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from './supabase-admin';

export type Role = 'jefe' | 'asistente';

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  role: Role;
  employee_id: string | null;
}

export const SESSION_COOKIE = 'evidencias_session';
const SESSION_DAYS = 30;

// ─── Contraseñas ────────────────────────────────────────────────────────────
// scrypt de node:crypto: sin dependencias nativas que compilar en Railway.

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;

  const attempt = scryptSync(password, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(hash, 'hex');
  if (attempt.length !== expected.length) return false;

  return timingSafeEqual(attempt, expected);
}

// ─── Sesión ─────────────────────────────────────────────────────────────────
// Token propio firmado con HMAC: `payloadBase64.firma`. No necesita tabla de
// sesiones ni dependencias extra, y al ir firmado no se puede alterar.

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'Falta SESSION_SECRET (mínimo 16 caracteres). Agrégala a .env.local y a las variables de Railway.',
    );
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

export function createSessionToken(userId: string): string {
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: expiresAt })).toString(
    'base64url',
  );
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined): string | null {
  if (!token) return null;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = sign(payload);
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      sub?: string;
      exp?: number;
    };
    if (!data.sub || !data.exp || data.exp < Date.now()) return null;
    return data.sub;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAgeSeconds = SESSION_DAYS * 24 * 60 * 60) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

// ─── Usuario de la petición ─────────────────────────────────────────────────

/** Usuario autenticado, o null. Lee la cookie y lo trae de la base. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const userId = readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!userId) return null;

  const { data, error } = await getSupabaseAdmin()
    .from('app_users')
    .select('id, name, username, role, employee_id, active')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data || !data.active) return null;

  return {
    id: data.id as string,
    name: data.name as string,
    username: data.username as string,
    role: data.role as Role,
    employee_id: (data.employee_id as string | null) ?? null,
  };
}

/** Igual que `getSessionUser`, pero lanza si no hay sesión. Para route handlers. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireJefe(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'jefe') throw new ForbiddenError();
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Inicia sesión para continuar.');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super('No tienes permiso para esta acción.');
    this.name = 'ForbiddenError';
  }
}
