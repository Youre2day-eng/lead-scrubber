// functions/api/sources.ts
// Per-user CRUD for saved scraping sources (FB groups, subreddits, niche boards).
// Stored in KV under per-user key 'u:<uid>:sources:default' as a JSON array.

import { requireUser, userKey } from '../lib/auth';
import type { AuthEnv } from '../lib/auth';

interface Source {
  id: string;
  url: string;
  label?: string;
  tags?: string[];
  addedAt: string;
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } });

function rid() { return Math.random().toString(36).slice(2, 10); }

async function readAll(env: AuthEnv, uid: string): Promise<Source[]> {
  const raw = await env.LEADS.get(userKey(uid, 'sources:default'));
  if (!raw) return [];
  try { return JSON.parse(raw) as Source[]; } catch { return []; }
}

async function writeAll(env: AuthEnv, uid: string, sources: Source[]) {
  await env.LEADS.put(userKey(uid, 'sources:default'), JSON.stringify(sources));
}

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers: cors });

export const onRequestGet: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const u = await requireUser(env, request);
  if (u instanceof Response) return u;
  return json({ sources: await readAll(env, u.uid) });
};

export const onRequestPost: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const u = await requireUser(env, request);
  if (u instanceof Response) return u;
  let body: { url?: string; label?: string; tags?: string[] };
  try { body = await request.json(); } catch { return json({ error: 'invalid json' }, 400); }
  if (!body.url) return json({ error: 'url required' }, 400);
  const sources = await readAll(env, u.uid);
  if (sources.find(s => s.url === body.url)) return json({ error: 'already exists' }, 409);
  const item: Source = { id: rid(), url: body.url, label: body.label || '', tags: body.tags || [], addedAt: new Date().toISOString() };
  sources.push(item);
  await writeAll(env, u.uid, sources);
  return json({ source: item }, 201);
};

export const onRequestDelete: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const u = await requireUser(env, request);
  if (u instanceof Response) return u;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return json({ error: 'missing id' }, 400);
  const sources = (await readAll(env, u.uid)).filter(s => s.id !== id);
  await writeAll(env, u.uid, sources);
  return json({ ok: true });
};
