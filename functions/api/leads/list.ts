// functions/api/leads/list.ts
// GET /api/leads/list -> { leads }
//
// Note: lead.intent is re-classified on every fetch using the latest detectIntent
// rules from lib/score.ts. This means classifier improvements take effect for all
// leads (including historical ones) without re-scraping.

import { requireUser, userKey } from '../../lib/auth';
import type { AuthEnv } from '../../lib/auth';
import { detectIntent } from '../../lib/score';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } });

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: cors });

export const onRequestGet: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const u = await requireUser(env, request);
  if (u instanceof Response) return u;
  const prefix = userKey(u.uid, 'lead:');
  const list = await env.LEADS.list({ prefix, limit: 500 });
  const leads: any[] = [];
  for (const k of list.keys) {
    const v = await env.LEADS.get(k.name);
    if (v) {
      try {
        const lead = JSON.parse(v);
        // Re-classify with the latest rules so older leads benefit from
        // improvements to detectIntent without needing a re-scrape.
        if (lead && typeof lead.text === 'string' && lead.text.length > 0) {
          lead.intent = detectIntent(lead.text);
        }
        leads.push(lead);
      } catch {}
    }
  }
  leads.sort((a, b) => (b.intentScore || 0) - (a.intentScore || 0));
  return json({ leads });
};
