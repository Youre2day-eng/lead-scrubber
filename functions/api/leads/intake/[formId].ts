import { userKey } from '../../../lib/auth';
import { hashUrl } from '../../../lib/score';

interface Env { LEADS: KVNamespace; }

function corsHeaders(origin: string | null): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get('Origin')) });
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env, params } = ctx;
  const origin = request.headers.get('Origin');
  const headers = { 'Content-Type': 'application/json', ...corsHeaders(origin) };
  try {
    const formId = String(params.formId || '');
    const url = new URL(request.url);
    const uid = url.searchParams.get('u') || '';
    if (!formId || !uid) return new Response(JSON.stringify({ ok: false, error: 'Missing form id or user' }), { status: 400, headers });

    const body = await safeJson(request);
    if (!body || typeof body !== 'object') return new Response(JSON.stringify({ ok: false, error: 'Invalid body' }), { status: 400, headers });

    const fields = body.fields || body;
    const stage = String(body.defaultStage || 'saved');

    // Compose lead text from known fields
    const author = pickStr(fields, ['name', 'full_name', 'fullName']) || 'Anonymous';
    const email = pickStr(fields, ['email']) || '';
    const phone = pickStr(fields, ['phone', 'tel']) || '';
    const company = pickStr(fields, ['company']) || '';
    const message = pickStr(fields, ['message', 'description', 'note']) || '';
    const budget = pickStr(fields, ['budget']) || '';

    const summaryParts: string[] = [];
    if (email) summaryParts.push('Email: ' + email);
    if (phone) summaryParts.push('Phone: ' + phone);
    if (company) summaryParts.push('Company: ' + company);
    if (budget) summaryParts.push('Budget: ' + budget);
    if (message) summaryParts.push(message);
    // Include any extra custom fields
    for (const [k, v] of Object.entries(fields as Record<string, any>)) {
      if (['name','full_name','fullName','email','phone','tel','company','message','description','note','budget'].includes(k)) continue;
      if (v == null || v === '') continue;
      summaryParts.push(`${k}: ${v}`);
    }
    const text = summaryParts.join('\n');

    const submittedAt = new Date().toISOString();
    const seed = formId + ':' + (email || phone || author) + ':' + submittedAt;
    const id = await hashUrl(seed);
    const leadKey = userKey(uid, 'lead:' + id);

    const lead = {
      id,
      platform: 'form',
      groupName: 'Form: ' + formId.slice(0, 8),
      author,
      text,
      url: 'https://lead-scrubber.pages.dev/f/' + formId,
      ingestedAt: submittedAt,
      timestamp: submittedAt,
      timeAgo: 'just now',
      urgency: 'High' as const,
      intent: 'buying' as const,
      intentScore: 80,
      runId: 'form_' + formId,
      // Pre-route into pipeline
      stage,
      savedAt: submittedAt,
      source: 'form:' + formId,
      contact: { email, phone, company, budget },
    };

    await env.LEADS.put(leadKey, JSON.stringify(lead), {
      metadata: { score: 80, intent: 'buying', ingestedAt: submittedAt, source: 'form' },
    });

    return new Response(JSON.stringify({ ok: true, id }), { status: 200, headers });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'Server error' }), { status: 500, headers });
  }
};

async function safeJson(req: Request): Promise<any> {
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('application/json')) { try { return await req.json(); } catch { return null; } }
  if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
    try { const fd = await req.formData(); const obj: Record<string, any> = {}; fd.forEach((v, k) => { obj[k] = v; }); return { fields: obj }; } catch { return null; }
  }
  try { return await req.json(); } catch { return null; }
}

function pickStr(obj: any, keys: string[]): string {
  if (!obj) return '';
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}
