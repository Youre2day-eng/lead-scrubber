// functions/api/scrape/run.ts
// POST /api/scrape/run
// Body: { url: string, actor?: string, keywords?: string[] }
// For Reddit URLs: try native JSON fetch first (free), fall back to Apify reddit-scraper-lite if blocked.
// For other URLs: Apify Actor run.
import { getApifyToken, startRun, pickActorForUrl } from '../../lib/apify';
import { requireUser, userKey } from '../../lib/auth';
import { scoreIntent, urgency, hashUrl, detectIntent } from '../../lib/score';

interface Env { LEADS: KVNamespace; APIFY_TOKEN?: string; AUTH_SECRET?: string }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } });

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers: cors });

function isRedditUrl(u: string): boolean {
  return /(^|\/\/)([a-z0-9-]+\.)?reddit\.com\//i.test(u);
}

function redditListingUrl(u: string): string {
  let url = u.split('#')[0].split('?')[0].replace(/\/$/, '');
  url = url.replace(/^https?:\/\/(www\.)?reddit\.com/i, 'https://old.reddit.com');
  if (!url.endsWith('.json')) url = url + '.json';
  return url + '?limit=100&raw_json=1';
}

const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchRedditNative(url: string): Promise<any[] | null> {
  try {
    const r = await fetch(redditListingUrl(url), {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'application/json,text/html;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    if (!r.ok) return null;
    const j: any = await r.json();
    const children = j?.data?.children || [];
    return children.map((c: any) => c?.data).filter(Boolean).map((d: any) => ({
      url: 'https://www.reddit.com' + (d.permalink || ''),
      author: d.author || '',
      subreddit: d.subreddit || '',
      title: d.title || '',
      selftext: d.selftext || '',
      text: (d.title || '') + (d.selftext ? '\n\n' + d.selftext : ''),
      timestamp: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : new Date().toISOString(),
      platform: 'reddit',
    }));
  } catch { return null; }
}

async function persistRedditPosts(env: Env, uid: string, posts: any[], keywords: string[], sourceUrl: string, niche?: string): Promise<{ runId: string; saved: number; skipped: number; total: number }> {
  const runId = 'reddit_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  let saved = 0;
  let skipped = 0;
  for (const p of posts) {
    if (!p.text || String(p.text).trim().length < 3) { skipped++; continue; }
    const leadKey = userKey(uid, 'lead:' + (await hashUrl(p.url)));
    if (await env.LEADS.get(leadKey)) { skipped++; continue; }
    const score = scoreIntent(p.text, keywords, niche);
    const intent = detectIntent(p.text);
    const lead = {
      id: leadKey,
      url: p.url,
      author: p.author,
      group: p.subreddit ? 'r/' + p.subreddit : '',
      text: p.text,
      timestamp: p.timestamp,
      city: '',
      platform: 'reddit',
      intentScore: score,
      intent,
      urgency: urgency(score),
      ingestedAt: new Date().toISOString(),
      runId,
    };
    await env.LEADS.put(leadKey, JSON.stringify(lead), { metadata: { score, intent, ingestedAt: lead.ingestedAt } });
    saved++;
  }
  const record = { runId, datasetId: '', actor: 'reddit-native', sourceUrl, status: 'SUCCEEDED', keywords, niche, startedAt: new Date().toISOString(), ingested: saved, total: posts.length, skipped };
  await env.LEADS.put(userKey(uid, 'run:' + runId), JSON.stringify(record), { expirationTtl: 60*60*24*30 });
  return { runId, saved, skipped, total: posts.length };
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResp = await requireUser(env, request);
  if (userOrResp instanceof Response) return userOrResp;
  const user = userOrResp;

  let body: { url?: string; actor?: string; keywords?: string[]; niche?: string };
  try { body = await request.json(); } catch { return json({ error: 'invalid json' }, 400); }
  const url = (body.url || '').trim();
  if (!url) return json({ error: 'url required' }, 400);
  const keywords = body.keywords || [];
  const niche = (body.niche || '').trim();

  // Reddit: try native first
  if (isRedditUrl(url)) {
    const posts = await fetchRedditNative(url);
    if (posts && posts.length > 0) {
      const r = await persistRedditPosts(env, user.uid, posts, keywords, url, niche);
      return json({ ok: true, runId: r.runId, datasetId: '', actor: 'reddit-native', status: 'SUCCEEDED', ingested: r.saved, total: r.total });
    }
    const token = await getApifyToken(env, user.uid);
    if (!token) return json({ error: 'Reddit native fetch was blocked. Connect Apify in the Connections page to use the paid Reddit scraper.' }, 412);
    const actor = 'trudax/reddit-scraper-lite';
    const input: Record<string, unknown> = { startUrls: [{ url }], maxItems: 50, maxPostCount: 50 };
    try {
      const run = await startRun(token, actor, input);
      const record = { runId: run.id, datasetId: run.defaultDatasetId, actor, sourceUrl: url, status: run.status, keywords, niche, startedAt: new Date().toISOString(), ingested: 0 };
      await env.LEADS.put(userKey(user.uid, 'run:' + run.id), JSON.stringify(record), { expirationTtl: 60*60*24*30 });
      return json({ ok: true, runId: run.id, datasetId: run.defaultDatasetId, actor, status: run.status });
    } catch (e: any) {
      return json({ error: 'Reddit native blocked, Apify fallback failed: ' + (e?.message || String(e)) }, 502);
    }
  }

  // Non-Reddit: Apify path
  const token = await getApifyToken(env, user.uid);
  if (!token) return json({ error: 'no Apify token. Connect Apify in the Connections page.' }, 412);
  const actor = body.actor || pickActorForUrl(url);
  const input: Record<string, unknown> = { startUrls: [{ url }], keywords, maxItems: 100 };
  try {
    const run = await startRun(token, actor, input);
    const record = { runId: run.id, datasetId: run.defaultDatasetId, actor, sourceUrl: url, status: run.status, keywords, niche, startedAt: new Date().toISOString(), ingested: 0 };
    await env.LEADS.put(userKey(user.uid, 'run:' + run.id), JSON.stringify(record), { expirationTtl: 60*60*24*30 });
    return json({ ok: true, runId: run.id, datasetId: run.defaultDatasetId, actor, status: run.status });
  } catch (e: any) {
    return json({ error: e?.message || String(e) }, 502);
  }
};
