// functions/api/leads/list.ts
// GET /api/leads/list -> { leads }
import { requireUser, userKey } from '../../lib/auth';
import type { AuthEnv } from '../../lib/auth';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } });

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers: cors });

export const onRequestGet: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const u = await requireUser(env, request); if (u instanceof Response) return u;
  const prefix = userKey(u.uid, 'lead:');
  const list = await env.LEADS.list({ prefix, limit: 500 });
  const leads: any[] = [];
  for (const k of list.keys) {
    const v = await env.LEADS.get(k.name);
    if (v) {
      try { leads.push(JSON.parse(v)); } catch {}
    }
  }
  leads.sort((a, b) => (b.intentScore || 0) - (a.intentScore || 0));
  return json({ leads });
};
