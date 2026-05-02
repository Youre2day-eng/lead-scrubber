// functions/lib/auth.ts
// Cookie-based session auth for Cloudflare Pages Functions.
// Uses Web Crypto SubtleCrypto: PBKDF2 for password hashing, HMAC-SHA256 for session signing.
// All KV writes are namespaced per-user. Sessions live in a signed HTTP-only cookie.

export interface AuthEnv {
  LEADS: KVNamespace;
  AUTH_SECRET?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  SITE_URL?: string;
}

export interface SessionUser { uid: string; email: string; tier?: string; }

const COOKIE_NAME = 'ls_session';
const SESSION_TTL_SEC = 60 * 60 * 24 * 30;

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function te(s: string): Uint8Array { return new TextEncoder().encode(s); }
function td(b: Uint8Array): string { return new TextDecoder().decode(b); }

function getSecret(env: AuthEnv): string {
  return env.AUTH_SECRET || 'lead-scrubber-default-dev-secret-change-me';
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', te(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' }, key, 256);
  return 'pbkdf2$100000$' + b64url(salt) + '$' + b64url(bits);
}
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iter = parseInt(parts[1], 10);
  const salt = b64urlDecode(parts[2]);
  const expected = b64urlDecode(parts[3]);
  const key = await crypto.subtle.importKey('raw', te(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, key, expected.length * 8));
  if (bits.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ expected[i];
  return diff === 0;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', te(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function signSession(payload: SessionUser & { exp: number }, secret: string): Promise<string> {
  const body = b64url(te(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, te(body));
  return body + '.' + b64url(sig);
}
async function verifySession(token: string, secret: string): Promise<SessionUser | null> {
  const i = token.indexOf('.');
  if (i < 1) return null;
  const body = token.slice(0, i);
  const sig = b64urlDecode(token.slice(i + 1));
  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify('HMAC', key, sig, te(body));
  if (!ok) return null;
  try {
    const data = JSON.parse(td(b64urlDecode(body))) as SessionUser & { exp: number };
    if (typeof data.exp !== 'number' || data.exp < Math.floor(Date.now() / 1000)) return null;
    return { uid: data.uid, email: data.email, tier: data.tier };
  } catch { return null; }
}

export function makeSessionCookie(token: string): string {
  return COOKIE_NAME + '=' + token + '; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=' + SESSION_TTL_SEC;
}
export function clearSessionCookie(): string {
  return COOKIE_NAME + '=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
}
export function readCookie(request: Request, name: string): string | null {
  const h = request.headers.get('Cookie') || '';
  const parts = h.split(/;\s*/);
  for (const p of parts) {
    const eq = p.indexOf('=');
    if (eq > 0 && p.slice(0, eq) === name) return p.slice(eq + 1);
  }
  return null;
}

export async function issueSession(env: AuthEnv, user: SessionUser): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  return signSession({ ...user, exp }, getSecret(env));
}

export async function getUser(env: AuthEnv, request: Request): Promise<SessionUser | null> {
  const tok = readCookie(request, COOKIE_NAME);
  if (!tok) return null;
  return verifySession(tok, getSecret(env));
}

export async function requireUser(env: AuthEnv, request: Request): Promise<SessionUser | Response> {
  const u = await getUser(env, request);
  if (u) return u;
  return new Response(JSON.stringify({ error: 'unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

export const userKey = (uid: string, suffix: string) => 'u:' + uid + ':' + suffix;

export function genUid(): string {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return b64url(b);
}
export function normEmail(e: string): string { return (e || '').trim().toLowerCase(); }
