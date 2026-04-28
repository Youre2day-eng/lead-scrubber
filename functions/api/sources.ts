// functions/api/sources.ts
// CRUD for the user's saved FB groups / forum links / niche boards.
// Stored in KV under key 'sources:default' as a JSON array.

interface Source { id: string; url: string; label?: string; tags?: string[]; addedAt: string; }
interface Env { LEADS: KVNamespace; }

const KEY = 'sources:default';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function readAll(env: Env): Promise<Source[]> {
  const raw = await env.LEADS.get(KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as Source[]; } catch { return []; }
}

async function writeAll(env: Env, sources: Source[]) {
  await env.LEADS.put(KEY, JSON.stringify(sources));
}

function rid() { return Math.random().toString(36).slice(2, 10); }

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers: cors });

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const sources = await readAll(env);
  return new Response(JSON.stringify({ sources }), { status: 200, headers: { 'Content-Type': 'application/json', ...cors } });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: { url?: string; label?: string; tags?: string[] };
  try { body = await request.json(); } catch { return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } }); }
  if (!body.url) return new Response(JSON.stringify({ error: 'url required' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } });
  const sources = await readAll(env);
  if (sources.find(s => s.url === body.url)) {
    return new Response(JSON.stringify({ error: 'already exists' }), { status: 409, headers: { 'Content-Type': 'application/json', ...cors } });
  }
  const item: Source = { id: rid(), url: body.url, label: body.label || '', tags: body.tags || [], addedAt: new Date().toISOString() };
  sources.push(item);
  await writeAll(env, sources);
  return new Response(JSON.stringify({ source: item }), { status: 201, headers: { 'Content-Type': 'application/json', ...cors } });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'missing id' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } });
  const sources = (await readAll(env)).filter(s => s.id !== id);
  await writeAll(env, sources);
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json', ...cors } });
};
