// functions/api/leads/ingest.ts
// POST /api/leads/ingest  Body: { posts, keywords }
// Per-user. Requires session cookie.
import { requireUser, userKey } from '../../lib/auth';
import { scoreIntent, urgency, hashUrl } from '../../lib/score';
import type { AuthEnv } from '../../lib/auth';

interface IngestPost { url: string; author?: string; group?: string; text?: string; timestamp?: string; city?: string; platform?: string; }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
};

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers: cors });

export const onRequestPost: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const u = await requireUser(env, request); if (u instanceof Response) return u;
  let body: { posts?: IngestPost[]; keywords?: string[] };
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } });
  }
  const posts = Array.isArray(body.posts) ? body.posts : [];
  const keywords = Array.isArray(body.keywords) ? body.keywords : [];
  let saved = 0, skipped = 0;
  for (const p of posts) {
    if (!p?.url) { skipped++; continue; }
    const id = await hashUrl(p.url);
    const key = userKey(u.uid, 'lead:' + id);
    if (await env.LEADS.get(key)) { skipped++; continue; }
    const text = p.text || '';
    const score = scoreIntent(text, keywords);
    const lead = {
      id, url: p.url, platform: p.platform || 'web', group: p.group || '',
      author: p.author || 'Unknown', text, timestamp: p.timestamp || new Date().toISOString(),
      city: p.city || '', intentScore: score, urgency: urgency(score),
      ingestedAt: new Date().toISOString(), uid: u.uid,
    };
    await env.LEADS.put(key, JSON.stringify(lead), { metadata: { score, ingestedAt: lead.ingestedAt } });
    saved++;
  }
  return new Response(JSON.stringify({ saved, skipped, total: posts.length }), { status: 200, headers: { 'Content-Type': 'application/json', ...cors } });
};
