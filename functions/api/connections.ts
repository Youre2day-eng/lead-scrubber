// functions/api/connections.ts
// Per-user storage of third-party API tokens.
// Storage key: u:<uid>:connections:<provider>
// Supported providers: apify, facebook, instagram, threads, reddit
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

const SOCIAL_PROVIDERS = ['facebook', 'instagram', 'threads', 'reddit'] as const;
type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

interface SocialRecord {
  accessToken: string;
  refreshToken?: string | null;
  username?: string | null;
  connectedAt: string;
  expiresAt?: string | null;
}

function socialState(raw: string | null): { connected: boolean; username?: string; connectedAt?: string; expiresAt?: string | null; expired?: boolean } {
  if (!raw) return { connected: false };
  try {
    const p = JSON.parse(raw) as SocialRecord;
    if (!p?.accessToken) return { connected: false };
    const expired = p.expiresAt ? new Date(p.expiresAt) <= new Date() : false;
    return {
      connected: true,
      username: p.username ?? undefined,
      connectedAt: p.connectedAt,
      expiresAt: p.expiresAt ?? null,
      expired,
    };
  } catch (err) {
    console.error('[connections] Failed to parse social token record:', err);
    return { connected: false };
  }
}

export const onRequestGet: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const u = await requireUser(env, request); if (u instanceof Response) return u;

  // Fetch all connection records in parallel
  const [apifyRaw, ...socialRaws] = await Promise.all([
    env.LEADS.get(userKey(u.uid, 'connections:apify')),
    ...SOCIAL_PROVIDERS.map((p) => env.LEADS.get(userKey(u.uid, `connections:${p}`))),
  ]);

  let apify: { connected: boolean; username?: string; savedAt?: string } = { connected: false };
  if (apifyRaw) {
    try {
      const parsed = JSON.parse(apifyRaw);
      apify = { connected: !!parsed?.token, username: parsed?.username, savedAt: parsed?.savedAt };
    } catch (err) {
      console.error('[connections] Failed to parse apify token record:', err);
    }
  }

  const social: Record<string, ReturnType<typeof socialState>> = {};
  SOCIAL_PROVIDERS.forEach((p, i) => { social[p] = socialState(socialRaws[i]); });

  return json({ apify, ...social });
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
  if (!provider) return json({ error: 'provider required' }, 400);
  if (provider !== 'apify' && !(SOCIAL_PROVIDERS as readonly string[]).includes(provider)) {
    return json({ error: 'unknown provider' }, 400);
  }
  await env.LEADS.delete(userKey(u.uid, `connections:${provider}`));
  return json({ ok: true });
};
