// functions/api/scrape/run.ts
// POST /api/scrape/run
// Body: { url: string, actor?: string, keywords?: string[] }
// Starts an Apify Actor run for the given source URL. Returns { runId, datasetId, actor }.
// Token comes from KV (set via /api/connections) or env.APIFY_TOKEN.

import { getApifyToken, startRun, pickActorForUrl } from '../../lib/apify';

interface Env { LEADS: KVNamespace; APIFY_TOKEN?: string }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } });

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers: cors });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: { url?: string; actor?: string; keywords?: string[] };
  try { body = await request.json(); } catch { return json({ error: 'invalid json' }, 400); }
  const url = (body.url || '').trim();
  if (!url) return json({ error: 'url required' }, 400);

  const token = await getApifyToken(env);
  if (!token) return json({ error: 'no Apify token. Connect Apify in the Connections page.' }, 412);

  const actor = body.actor || pickActorForUrl(url);
  // Generic input shape; actor-specific tuning can come later.
  const input: Record<string, unknown> = {
    startUrls: [{ url }],
    keywords: body.keywords || [],
    maxItems: 100,
  };

  try {
    const run = await startRun(token, actor, input);
    // Persist a lightweight run record for UI polling.
    const record = {
      runId: run.id,
      datasetId: run.defaultDatasetId,
      actor,
      sourceUrl: url,
      status: run.status,
      keywords: body.keywords || [],
      startedAt: new Date().toISOString(),
      ingested: 0,
    };
    await env.LEADS.put('run:' + run.id, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 30 });
    return json({ ok: true, runId: run.id, datasetId: run.defaultDatasetId, actor, status: run.status });
  } catch (e: any) {
    return json({ error: e?.message || String(e) }, 502);
  }
};
