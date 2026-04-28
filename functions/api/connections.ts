// functions/api/connections.ts
// Stores third-party API tokens in KV (binding: LEADS) so the user can paste them in-app
// instead of editing Cloudflare Pages env vars.
//
// Storage shape (key 'connections:apify'): { token: string, savedAt: string, username?: string }
//
// Endpoints:
//   GET    /api/connections           -> { apify: { connected, username, savedAt } }
//   POST   /api/connections           -> body { provider: 'apify', token } -> verifies, saves
//   DELETE /api/connections?provider=apify -> remove token

import { whoAmI } from '../lib/apify';

interface Env { LEADS: KVNamespace }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } });

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers: cors });

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const raw = await env.LEADS.get('connections:apify');
  let apify: { connected: boolean; username?: string; savedAt?: string } = { connected: false };
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      apify = { connected: !!parsed?.token, username: parsed?.username, savedAt: parsed?.savedAt };
    } catch {}
  }
  return json({ apify });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: { provider?: string; token?: string };
  try { body = await request.json(); } catch { return json({ error: 'invalid json' }, 400); }
  if (body.provider !== 'apify') return json({ error: 'unknown provider' }, 400);
  const token = (body.token || '').trim();
  if (!token) return json({ error: 'token required' }, 400);

  const verified = await whoAmI(token);
  if (!verified.ok) return json({ error: 'apify token invalid: ' + verified.error }, 400);

  const record = { token, username: verified.username, savedAt: new Date().toISOString() };
  await env.LEADS.put('connections:apify', JSON.stringify(record));
  return json({ ok: true, apify: { connected: true, username: verified.username, savedAt: record.savedAt } });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const provider = new URL(request.url).searchParams.get('provider');
  if (provider !== 'apify') return json({ error: 'unknown provider' }, 400);
  await env.LEADS.delete('connections:apify');
  return json({ ok: true });
};
