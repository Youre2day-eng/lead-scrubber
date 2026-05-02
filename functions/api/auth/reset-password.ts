// functions/api/auth/reset-password.ts
// POST /api/auth/reset-password  Body: { token, password }
// Validates the reset token, updates the user's password hash, and invalidates the token.
import { hashPassword } from '../../lib/auth';
import type { AuthEnv } from '../../lib/auth';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
};

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers: cors });

export const onRequestPost: PagesFunction<AuthEnv> = async ({ request, env }) => {
  let body: { token?: string; password?: string };
  try { body = await request.json(); } catch { return j({ error: 'invalid json' }, 400); }
  const { token = '', password = '' } = body;

  if (!token) return j({ error: 'token required' }, 400);
  if (password.length < 8) return j({ error: 'password must be at least 8 chars' }, 400);

  const raw = await env.LEADS.get('reset:token:' + token);
  if (!raw) return j({ error: 'invalid or expired reset token' }, 400);

  let parsed: { uid: string; email: string; exp: number };
  try { parsed = JSON.parse(raw); } catch { return j({ error: 'invalid or expired reset token' }, 400); }

  if (Math.floor(Date.now() / 1000) > parsed.exp) {
    await env.LEADS.delete('reset:token:' + token);
    return j({ error: 'invalid or expired reset token' }, 400);
  }

  const userRaw = await env.LEADS.get('user:' + parsed.uid);
  if (!userRaw) return j({ error: 'invalid or expired reset token' }, 400);

  let user: Record<string, unknown>;
  try { user = JSON.parse(userRaw); } catch { return j({ error: 'invalid or expired reset token' }, 400); }

  user.passwordHash = await hashPassword(password);
  await env.LEADS.put('user:' + parsed.uid, JSON.stringify(user));
  await env.LEADS.delete('reset:token:' + token);

  return j({ ok: true });
};

function j(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
