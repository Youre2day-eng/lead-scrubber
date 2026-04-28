// functions/api/leads/ingest.ts
// Cloudflare Pages Function: receive leads from the Chrome extension or any client.
// Stores them in KV (binding name: LEADS), deduped by post URL.

interface IngestPost {
  url: string;
  author?: string;
  group?: string;
  text?: string;
  timestamp?: string;
  city?: string;
  platform?: string;
}

interface Env {
  LEADS: KVNamespace;
  INGEST_TOKEN?: string;
}

const BUYER_PHRASES = [
  /\blooking for\b/i,
  /\bneed (a|an|some|to find)\b/i,
  /\banyone (know|recommend)\b/i,
  /\brecommendations?\b/i,
  /\bhire\b/i,
  /\bwho can\b/i,
  /\bcan anyone\b/i,
  /\bquote\b/i,
  /\bestimate\b/i,
  /\bISO\b/,
  /\?$/m,
];

function scoreIntent(text: string, keywords: string[]): number {
  if (!text) return 0;
  let score = 0;
  for (const phrase of BUYER_PHRASES) if (phrase.test(text)) score += 10;
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    if (!kw) continue;
    const k = kw.toLowerCase().trim();
    if (k && lower.includes(k)) score += 15;
  }
  return Math.min(100, score);
}

function urgency(score: number): 'High' | 'Medium' | 'Low' {
  if (score >= 60) return 'High';
  if (score >= 30) return 'Medium';
  return 'Low';
}

async function hash(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers: cors });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (env.INGEST_TOKEN) {
    const auth = request.headers.get('Authorization') || '';
    if (auth !== `Bearer ${env.INGEST_TOKEN}`) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...cors } });
    }
  }

  let body: { posts?: IngestPost[]; keywords?: string[] };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } });
  }

  const posts = Array.isArray(body.posts) ? body.posts : [];
  const keywords = Array.isArray(body.keywords) ? body.keywords : [];
  let saved = 0, skipped = 0;

  for (const p of posts) {
    if (!p?.url) { skipped++; continue; }
    const id = await hash(p.url);
    const key = `lead:${id}`;
    const existing = await env.LEADS.get(key);
    if (existing) { skipped++; continue; }
    const text = p.text || '';
    const score = scoreIntent(text, keywords);
    const lead = {
      id,
      url: p.url,
      platform: p.platform || 'Facebook',
      group: p.group || '',
      author: p.author || 'Unknown',
      text,
      timestamp: p.timestamp || new Date().toISOString(),
      city: p.city || '',
      intentScore: score,
      urgency: urgency(score),
      ingestedAt: new Date().toISOString(),
    };
    await env.LEADS.put(key, JSON.stringify(lead), { metadata: { score, ingestedAt: lead.ingestedAt } });
    saved++;
  }

  return new Response(JSON.stringify({ saved, skipped, total: posts.length }), { status: 200, headers: { 'Content-Type': 'application/json', ...cors } });
};
