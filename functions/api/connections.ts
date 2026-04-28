// functions/api/connections.ts
// Per-user storage of third-party API tokens.
// Storage key: u:<uid>:connections:apify
import { whoAmI } from '../lib/apify';
import { requireUser, userKey } from '../lib/auth';
import type { AuthEnv } from '../lib/auth';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
};

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } });

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers: cors });

export const onRequestGet: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const u = await requireUser(env, request); if (u instanceof Response) return u;
  const raw = await env.LEADS.get(userKey(u.uid, 'connections:apify'));
  let apify: { connected: boolean; username?: string; savedAt?: string } = { connected: false };
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      apify = { connected: !!parsed?.token, username: parsed?.username, savedAt: parsed?.savedAt };
    } catch {}
  }
  return json({ apify });
};

export const onRequestPost: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const u = await requireUser(env, request); if (u instanceof Response) return u;
  let body: { provider?: string; token?: string };
  try { body = await request.json(); } catch { return json({ error: 'invalid json' }, 400); }
  if (body.provider !== 'apify') return json({ error: 'unknown provider' }, 400);
  const token = (body.token || '').trim();
  if (!token) return json({ error: 'token required' }, 400);
  const verified = await whoAmI(token);
  if (!verified.ok) return json({ error: 'apify token invalid: ' + verified.error }, 400);
  const record = { token, username: verified.username, savedAt: new Date().toISOString() };
  await env.LEADS.put(userKey(u.uid, 'connections:apify'), JSON.stringify(record));
  return json({ ok: true, apify: { connected: true, username: verified.username, savedAt: record.savedAt } });
};

export const onRequestDelete: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const u = await requireUser(env, request); if (u instanceof Response) return u;
  const provider = new URL(request.url).searchParams.get('provider');
  if (provider !== 'apify') return json({ error: 'unknown provider' }, 400);
  await env.LEADS.delete(userKey(u.uid, 'connections:apify'));
  return json({ ok: true });
};
