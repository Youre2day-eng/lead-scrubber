// functions/lib/apify.ts
// Thin Apify REST client. Reads token from KV (key 'connections:apify') first, falls back to env.APIFY_TOKEN.

export interface ApifyEnv { LEADS: KVNamespace; APIFY_TOKEN?: string }

const BASE = 'https://api.apify.com/v2';

export async function getApifyToken(env: ApifyEnv): Promise<string | null> {
  try {
    const stored = await env.LEADS.get('connections:apify');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed.token === 'string' && parsed.token) return parsed.token;
    }
  } catch {}
  return env.APIFY_TOKEN || null;
}

export interface ApifyRun { id: string; status: string; defaultDatasetId: string; actId: string }

export async function whoAmI(token: string): Promise<{ ok: boolean; username?: string; error?: string }> {
  const r = await fetch(BASE + '/users/me', { headers: { Authorization: 'Bearer ' + token } });
  if (!r.ok) return { ok: false, error: 'HTTP ' + r.status };
  const j: any = await r.json();
  return { ok: true, username: j?.data?.username || j?.data?.id };
}

export async function startRun(token: string, actorId: string, input: Record<string, unknown>): Promise<ApifyRun> {
  const url = BASE + '/acts/' + encodeURIComponent(actorId) + '/runs?token=' + encodeURIComponent(token);
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error('Apify startRun failed: HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const j: any = await r.json();
  return { id: j.data.id, status: j.data.status, defaultDatasetId: j.data.defaultDatasetId, actId: j.data.actId };
}

export async function getRun(token: string, runId: string): Promise<ApifyRun> {
  const r = await fetch(BASE + '/actor-runs/' + encodeURIComponent(runId) + '?token=' + encodeURIComponent(token));
  if (!r.ok) throw new Error('Apify getRun failed: HTTP ' + r.status);
  const j: any = await r.json();
  return { id: j.data.id, status: j.data.status, defaultDatasetId: j.data.defaultDatasetId, actId: j.data.actId };
}

export async function getDatasetItems(token: string, datasetId: string, limit = 500): Promise<any[]> {
  const url = BASE + '/datasets/' + encodeURIComponent(datasetId) + '/items?clean=true&limit=' + limit + '&token=' + encodeURIComponent(token);
  const r = await fetch(url);
  if (!r.ok) throw new Error('Apify dataset fetch failed: HTTP ' + r.status);
  return await r.json();
}

// Map a guessed actor for a saved source URL. User can override via input.
export function pickActorForUrl(url: string): string {
  const u = url.toLowerCase();
  if (u.includes('facebook.com/groups/') || u.includes('facebook.com')) return 'apify/facebook-groups-scraper';
  if (u.includes('reddit.com')) return 'trudax/reddit-scraper';
  if (u.includes('nextdoor.com')) return 'apify/web-scraper';
  return 'apify/web-scraper';
}
