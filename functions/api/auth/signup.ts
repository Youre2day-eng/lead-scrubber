// functions/api/auth/signup.ts
// POST /api/auth/signup  Body: { email, password }
// Creates account, sets session cookie, returns { user }.
import { hashPassword, issueSession, makeSessionCookie, genUid, normEmail } from '../../lib/auth';
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
  if (!email || !email.includes('@')) return j({ error: 'valid email required' }, 400);
  if (pw.length < 8) return j({ error: 'password must be at least 8 chars' }, 400);

  const existingUid = await env.LEADS.get('user:byemail:' + email);
  if (existingUid) return j({ error: 'account already exists for that email' }, 409);

  const uid = genUid();
  const passwordHash = await hashPassword(pw);
  const user = { uid, email, passwordHash, tier: 'free', createdAt: new Date().toISOString() };
  await env.LEADS.put('user:' + uid, JSON.stringify(user));
  await env.LEADS.put('user:byemail:' + email, uid);

  const token = await issueSession(env, { uid, email, tier: 'free' });
  return new Response(JSON.stringify({ user: { uid, email, tier: 'free' } }), {
    status: 201,
    headers: { ...cors, 'Content-Type': 'application/json', 'Set-Cookie': makeSessionCookie(token) },
  });
};

function j(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
