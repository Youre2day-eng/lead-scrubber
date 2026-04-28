// functions/api/auth/login.ts
// POST /api/auth/login  Body: { email, password }
import { verifyPassword, issueSession, makeSessionCookie, normEmail } from '../../lib/auth';
import type { AuthEnv } from '../../lib/auth';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
};

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers: cors });

export const onRequestPost: PagesFunction<AuthEnv> = async ({ request, env }) => {
  let body: { email?: string; password?: string };
  try { body = await request.json(); } catch { return j({ error: 'invalid json' }, 400); }
  const email = normEmail(body.email || '');
  const pw = body.password || '';
  if (!email || !pw) return j({ error: 'email and password required' }, 400);

  const uid = await env.LEADS.get('user:byemail:' + email);
  if (!uid) return j({ error: 'invalid credentials' }, 401);
  const userRaw = await env.LEADS.get('user:' + uid);
  if (!userRaw) return j({ error: 'invalid credentials' }, 401);
  const user = JSON.parse(userRaw);
  const ok = await verifyPassword(pw, user.passwordHash || '');
  if (!ok) return j({ error: 'invalid credentials' }, 401);

  const token = await issueSession(env, { uid, email, tier: user.tier || 'free' });
  return new Response(JSON.stringify({ user: { uid, email, tier: user.tier || 'free' } }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json', 'Set-Cookie': makeSessionCookie(token) },
  });
};

function j(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
