// functions/api/leads/list.ts
// Returns all stored leads, sorted by intent score (desc), with optional filters.

interface Env { LEADS: KVNamespace; }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers: cors });

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const minScore = Number(url.searchParams.get('minScore') || 0);
  const limit = Math.min(500, Number(url.searchParams.get('limit') || 200));
  const groupFilter = (url.searchParams.get('group') || '').toLowerCase();

  const list = await env.LEADS.list({ prefix: 'lead:', limit });
  const leads: any[] = [];
  for (const k of list.keys) {
    const raw = await env.LEADS.get(k.name);
    if (!raw) continue;
    try {
      const lead = JSON.parse(raw);
      if (lead.intentScore < minScore) continue;
      if (groupFilter && !(lead.group || '').toLowerCase().includes(groupFilter)) continue;
      leads.push(lead);
    } catch {}
  }
  leads.sort((a, b) => (b.intentScore || 0) - (a.intentScore || 0));

  return new Response(JSON.stringify({ leads, count: leads.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'missing id' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } });
  await env.LEADS.delete(`lead:${id}`);
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json', ...cors } });
};
