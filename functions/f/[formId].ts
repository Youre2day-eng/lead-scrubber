interface Env { LEADS: KVNamespace; }

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const { request, env, params } = ctx;
  const formId = String(params.formId || '');
  const url = new URL(request.url);
  const uid = url.searchParams.get('u') || '';
  if (!formId || !uid) return new Response('Missing form id or user.', { status: 400 });

  // Try to load custom form spec from KV (written by /api/forms/publish)
  let spec: any = null;
  try {
    const raw = await env.LEADS.get('u:' + uid + ':form:' + formId);
    if (raw) spec = JSON.parse(raw);
  } catch {}

  const accent = String(spec?.accentColor || '#2563eb');
  const headline = String(spec?.headline || 'Get in touch');
  const description = String(spec?.description || "Tell us a bit about your project and we'll be back within a day.");
  const submitLabel = String(spec?.submitLabel || 'Send');
  const success = String(spec?.successMessage || 'Thanks! We will reach out shortly.');
  const fields = Array.isArray(spec?.fields) && spec.fields.length ? spec.fields : [
    { id: 'name', label: 'Name', key: 'name', type: 'text', required: true, placeholder: 'Jane Doe' },
    { id: 'email', label: 'Email', key: 'email', type: 'email', required: true, placeholder: 'jane@company.com' },
    { id: 'message', label: 'What do you need?', key: 'message', type: 'textarea', required: true, placeholder: 'Project, budget, timeline…' },
  ];

  const fieldsHtml = fields.map((f: any) => {
    const key = f.key === 'custom' ? (f.customKey || f.id) : f.key;
    const required = f.required ? 'required' : '';
    const ph = (f.placeholder || '').replace(/"/g, '&quot;');
    const label = String(f.label || key).replace(/</g, '&lt;');
    const reqMark = f.required ? '<span style="color:#dc2626"> *</span>' : '';
    if (f.type === 'textarea') {
      return `<label class="fld"><span>${label}${reqMark}</span><textarea name="${key}" rows="4" placeholder="${ph}" ${required}></textarea></label>`;
    }
    return `<label class="fld"><span>${label}${reqMark}</span><input name="${key}" type="${f.type || 'text'}" placeholder="${ph}" ${required} /></label>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${headline}</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  html,body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;background:#fff}
  .wrap{max-width:520px;margin:0 auto;padding:28px 24px}
  h1{font-size:20px;margin:0 0 6px;font-weight:700}
  p.lead{margin:0 0 18px;color:#64748b;font-size:14px;line-height:1.4}
  .fld{display:block;margin-bottom:12px}
  .fld>span{display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:4px}
  .fld input,.fld textarea{width:100%;padding:9px 12px;font-size:14px;font-family:inherit;color:#0f172a;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;outline:none}
  .fld input:focus,.fld textarea:focus{border-color:${accent};box-shadow:0 0 0 3px ${accent}22}
  .fld textarea{resize:vertical;min-height:96px}
  button{margin-top:6px;width:100%;padding:11px 14px;font-size:14px;font-weight:700;color:#fff;background:${accent};border:0;border-radius:8px;cursor:pointer}
  button:disabled{opacity:.6;cursor:not-allowed}
  .topbar{height:4px;background:${accent};border-radius:6px;margin-bottom:18px}
  .ok,.err{margin-top:14px;padding:10px 12px;border-radius:8px;font-size:13px}
  .ok{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}
  .err{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}
  .pwr{margin-top:18px;font-size:11px;color:#94a3b8;text-align:center}
  .pwr a{color:#64748b;text-decoration:none}
</style>
</head>
<body>
<div class="wrap">
  <div class="topbar"></div>
  <h1>${headline}</h1>
  <p class="lead">${description}</p>
  <form id="f">${fieldsHtml}<button id="b" type="submit">${submitLabel}</button><div id="msg"></div></form>
  <div class="pwr"><a href="https://lead-scrubber.pages.dev" target="_blank">Powered by LeadScrubber</a></div>
</div>
<script>
const f=document.getElementById('f'),b=document.getElementById('b'),m=document.getElementById('msg');
f.addEventListener('submit',async(e)=>{
  e.preventDefault();
  b.disabled=true;b.textContent='Sending…';m.innerHTML='';
  const fd=new FormData(f),fields={};fd.forEach((v,k)=>{fields[k]=v;});
  try {
    const r=await fetch('/api/leads/intake/${formId}?u=${uid}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields, defaultStage:${JSON.stringify(spec?.defaultStage || 'saved')}})});
    const d=await r.json();
    if (d.ok){m.className='ok';m.textContent=${JSON.stringify(success)};f.reset();}
    else throw new Error(d.error||'Submit failed');
  } catch(err){m.className='err';m.textContent=err.message||String(err);}
  finally{b.disabled=false;b.textContent=${JSON.stringify(submitLabel)};}
});
</script>
</body>
</html>`;

  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Frame-Options': 'ALLOWALL', 'Cache-Control': 'public, max-age=60' } });
};
