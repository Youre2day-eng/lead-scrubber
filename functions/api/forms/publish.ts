import { requireUser, userKey } from '../../lib/auth';

interface Env { LEADS: KVNamespace; }

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  try {
    const user = await requireUser(env, request);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    const body = await request.json().catch(() => null) as any;
    if (!body || !body.id || typeof body.id !== 'string') return new Response(JSON.stringify({ ok: false, error: 'Invalid form payload' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    const formId = String(body.id);
    // Whitelist persisted fields to keep KV value tidy
    const safeForm = {
      id: formId,
      name: String(body.name || 'Form'),
      headline: String(body.headline || 'Get in touch'),
      description: String(body.description || ''),
      submitLabel: String(body.submitLabel || 'Send'),
      successMessage: String(body.successMessage || 'Thanks!'),
      accentColor: String(body.accentColor || '#2563eb'),
      defaultStage: String(body.defaultStage || 'saved'),
      fields: Array.isArray(body.fields) ? body.fields.slice(0, 30).map((f: any) => ({
        id: String(f.id || crypto.randomUUID()),
        label: String(f.label || ''),
        key: String(f.key || 'custom'),
        customKey: f.customKey ? String(f.customKey) : undefined,
        type: String(f.type || 'text'),
        required: !!f.required,
        placeholder: f.placeholder ? String(f.placeholder) : undefined,
        options: Array.isArray(f.options) ? f.options.slice(0, 50).map((o: any) => String(o)) : undefined,
      })) : [],
      updatedAt: new Date().toISOString(),
    };

    await env.LEADS.put(userKey(user.uid, 'form:' + formId), JSON.stringify(safeForm));
    return new Response(JSON.stringify({ ok: true, id: formId, url: 'https://lead-scrubber.pages.dev/f/' + formId + '?u=' + user.uid }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
