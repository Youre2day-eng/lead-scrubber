// functions/api/scrape/poll.ts
// POST /api/scrape/poll
// Body: { runId: string }
// Checks Apify run status; if SUCCEEDED, fetches dataset items, normalizes them into
// IngestPost shape, scores intent and writes leads into KV under 'lead:<urlhash>'.
// Returns { status, ingested?, total? }.

import { getApifyToken, getRun, getDatasetItems } from '../../lib/apify';
import { scoreIntent, urgency, hashUrl } from '../../lib/score';

interface Env { LEADS: KVNamespace; APIFY_TOKEN?: string }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } });

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers: cors });

// Map an Apify dataset item from common scrapers (FB groups, Reddit) to our IngestPost shape.
function normalize(item: any): { url: string; author?: string; group?: string; text?: string; timestamp?: string; city?: string; platform?: string } | null {
  if (!item || typeof item !== 'object') return null;
  const url = item.url || item.postUrl || item.permalink || item.link;
  if (!url || typeof url !== 'string') return null;
  const text = item.text || item.message || item.body || item.title || item.selftext || '';
  const author = item.author?.name || item.author || item.user?.name || item.username;
  const group = item.group?.name || item.groupName || item.subreddit || item.community;
  const timestamp = item.time || item.timestamp || item.createdAt || item.created_utc;
  return { url, author, group, text, timestamp: timestamp ? String(timestamp) : undefined, platform: guessPlatform(url) };
}

function guessPlatform(u: string): string {
  const s = u.toLowerCase();
  if (s.includes('facebook.com')) return 'facebook';
  if (s.includes('reddit.com')) return 'reddit';
  if (s.includes('nextdoor.com')) return 'nextdoor';
  return 'web';
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: { runId?: string };
  try { body = await request.json(); } catch { return json({ error: 'invalid json' }, 400); }
  const runId = (body.runId || '').trim();
  if (!runId) return json({ error: 'runId required' }, 400);

  const token = await getApifyToken(env);
  if (!token) return json({ error: 'no Apify token' }, 412);

  const recordRaw = await env.LEADS.get('run:' + runId);
  const record = recordRaw ? JSON.parse(recordRaw) : null;

  let run;
  try { run = await getRun(token, runId); } catch (e: any) { return json({ error: e?.message || String(e) }, 502); }

  if (record) {
    record.status = run.status;
    await env.LEADS.put('run:' + runId, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 30 });
  }

  if (run.status !== 'SUCCEEDED') return json({ status: run.status });

  let items: any[] = [];
  try { items = await getDatasetItems(token, run.defaultDatasetId, 500); } catch (e: any) { return json({ error: e?.message || String(e) }, 502); }

  const keywords: string[] = record?.keywords || [];
  let saved = 0;
  let skipped = 0;
  for (const it of items) {
    const post = normalize(it);
    if (!post) { skipped++; continue; }
    const key = 'lead:' + (await hashUrl(post.url));
    if (await env.LEADS.get(key)) { skipped++; continue; }
    const score = scoreIntent(post.text || '', keywords);
    const lead = {
      id: key,
      url: post.url,
      author: post.author || '',
      group: post.group || '',
      text: post.text || '',
      timestamp: post.timestamp || new Date().toISOString(),
      city: '',
      platform: post.platform || 'web',
      intentScore: score,
      urgency: urgency(score),
      ingestedAt: new Date().toISOString(),
      runId,
    };
    await env.LEADS.put(key, JSON.stringify(lead), { metadata: { score, ingestedAt: lead.ingestedAt } });
    saved++;
  }
  if (record) {
    record.ingested = (record.ingested || 0) + saved;
    await env.LEADS.put('run:' + runId, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 30 });
  }
  return json({ status: 'SUCCEEDED', ingested: saved, skipped, total: items.length });
};
