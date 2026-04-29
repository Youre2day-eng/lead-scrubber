import { useState } from 'react';
import { CheckCircle2, Code, Copy, Eye, FileSignature, GripVertical, Plus, Trash2 } from 'lucide-react';
import type { IntakeForm, IntakeFormField, PipelineStage } from '../../types';

interface FormsViewProps {
  forms: IntakeForm[];
  stages: PipelineStage[];
  onSave: (forms: IntakeForm[]) => void;
  userId: string;
}

function newField(): IntakeFormField {
  return { id: crypto.randomUUID(), label: 'New Field', key: 'custom', customKey: 'custom_field', type: 'text', required: false };
}

function newForm(): IntakeForm {
  return {
    id: crypto.randomUUID(),
    name: 'New Lead Form',
    headline: 'Get in touch',
    description: "Tell us a bit about your project and we'll be back within a day.",
    submitLabel: 'Send',
    successMessage: 'Thanks! We will reach out shortly.',
    accentColor: '#2563eb',
    defaultStage: 'saved',
    createdAt: new Date().toISOString(),
    fields: [
      { id: crypto.randomUUID(), label: 'Name', key: 'name', type: 'text', required: true, placeholder: 'Jane Doe' },
      { id: crypto.randomUUID(), label: 'Email', key: 'email', type: 'email', required: true, placeholder: 'jane@company.com' },
      { id: crypto.randomUUID(), label: 'What do you need?', key: 'message', type: 'textarea', required: true, placeholder: 'Project, budget, timeline…' },
    ],
  };
}

export default function FormsView({ forms, stages, onSave, userId }: FormsViewProps) {
  const [activeId, setActiveId] = useState<string | null>(forms[0]?.id ?? null);
  const [draft, setDraft] = useState<IntakeForm | null>(forms.find((f) => f.id === activeId) || forms[0] || null);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);

  const select = (id: string) => { setActiveId(id); setDraft(forms.find((f) => f.id === id) || null); setPublishMsg(null); };
  const create = () => { const f = newForm(); const next = [...forms, f]; onSave(next); setActiveId(f.id); setDraft(f); setPublishMsg(null); };
  const remove = (id: string) => { const next = forms.filter((f) => f.id !== id); onSave(next); if (activeId === id) { setActiveId(next[0]?.id ?? null); setDraft(next[0] || null); } };

  const persist = async () => {
    if (!draft) return;
    const next = forms.some((f) => f.id === draft.id) ? forms.map((f) => f.id === draft.id ? draft : f) : [...forms, draft];
    onSave(next);
    setPublishMsg('Publishing…');
    try {
      const r = await fetch('/api/forms/publish', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      const data = await r.json();
      if (data.ok) setPublishMsg('Published ✓  Form is live at the embed URL.');
      else setPublishMsg('Saved locally. Publish failed: ' + (data.error || 'Unknown error.'));
    } catch (e: any) {
      setPublishMsg('Saved locally. Publish failed: ' + (e?.message || 'Network error.'));
    }
    setTimeout(() => setPublishMsg(null), 5000);
  };

  const dirty = !!draft && JSON.stringify(forms.find((f) => f.id === draft.id)) !== JSON.stringify(draft);

  const updateDraft = (patch: Partial<IntakeForm>) => setDraft((prev) => prev ? { ...prev, ...patch } : prev);
  const updateField = (id: string, patch: Partial<IntakeFormField>) => setDraft((prev) => prev ? { ...prev, fields: prev.fields.map((f) => f.id === id ? { ...f, ...patch } : f) } : prev);
  const addField = () => setDraft((prev) => prev ? { ...prev, fields: [...prev.fields, newField()] } : prev);
  const removeField = (id: string) => setDraft((prev) => prev ? { ...prev, fields: prev.fields.filter((f) => f.id !== id) } : prev);
  const moveField = (id: string, dir: -1 | 1) => setDraft((prev) => { if (!prev) return prev; const idx = prev.fields.findIndex((f) => f.id === id); const j = idx + dir; if (idx < 0 || j < 0 || j >= prev.fields.length) return prev; const fields = [...prev.fields]; [fields[idx], fields[j]] = [fields[j], fields[idx]]; return { ...prev, fields }; });

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const embedUrl = draft ? `${origin}/f/${draft.id}?u=${userId}` : '';
  const embedCode = draft ? `<iframe src="${embedUrl}" width="100%" height="640" frameborder="0" style="border:0;border-radius:12px;"></iframe>` : '';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><FileSignature className="w-6 h-6 text-blue-600" /> Lead Capture Forms</h1>
          <p className="text-sm text-slate-500">Build a form, paste the iframe anywhere, leads land in your pipeline.</p>
        </div>
        <button onClick={create} className="flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm font-semibold"><Plus className="w-4 h-4" /> New form</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <aside className="lg:col-span-1 bg-white border border-slate-200 rounded-lg p-3">
          {forms.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-3">No forms yet. Create one to get started.</p>
          ) : (
            <ul className="space-y-1">
              {forms.map((f) => (
                <li key={f.id}>
                  <button onClick={() => select(f.id)} className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between gap-2 ${activeId === f.id ? 'bg-blue-50 text-blue-800 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <span className="truncate">{f.name}</span>
                    <Trash2 onClick={(e) => { e.stopPropagation(); if (confirm('Delete this form?')) remove(f.id); }} className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {!draft ? (
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-500">
            Pick a form on the left, or click <strong>New form</strong>.
          </div>
        ) : (
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <Input label="Form name" value={draft.name} onChange={(v) => updateDraft({ name: v })} />
                <Select label="Initial pipeline stage" value={draft.defaultStage || 'saved'} onChange={(v) => updateDraft({ defaultStage: v })} options={[{ value: 'saved', label: 'Saved' }, ...stages.map((s) => ({ value: s.id, label: s.title }))]} />
                <Input label="Headline" value={draft.headline} onChange={(v) => updateDraft({ headline: v })} />
                <Input label="Submit button text" value={draft.submitLabel} onChange={(v) => updateDraft({ submitLabel: v })} />
                <Textarea label="Description" value={draft.description} onChange={(v) => updateDraft({ description: v })} rows={2} />
                <Input label="Success message" value={draft.successMessage} onChange={(v) => updateDraft({ successMessage: v })} />
                <Input label="Accent color" value={draft.accentColor} onChange={(v) => updateDraft({ accentColor: v })} />
              </div>
              <h4 className="text-sm font-semibold text-slate-700 mt-2 mb-2">Fields</h4>
              <div className="space-y-2">
                {draft.fields.map((f, i) => (
                  <div key={f.id} className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-md p-2">
                    <div className="flex flex-col text-slate-300">
                      <button onClick={() => moveField(f.id, -1)} disabled={i === 0} className="hover:text-slate-600 disabled:opacity-30">▲</button>
                      <button onClick={() => moveField(f.id, 1)} disabled={i === draft.fields.length - 1} className="hover:text-slate-600 disabled:opacity-30">▼</button>
                    </div>
                    <GripVertical className="w-4 h-4 text-slate-300" />
                    <input value={f.label} onChange={(e) => updateField(f.id, { label: e.target.value })} className="flex-1 min-w-[140px] bg-white border border-slate-200 rounded px-2 py-1 text-sm" placeholder="Label" />
                    <select value={f.key} onChange={(e) => updateField(f.id, { key: e.target.value as IntakeFormField['key'] })} className="bg-white border border-slate-200 rounded px-2 py-1 text-sm">
                      <option value="name">name</option>
                      <option value="email">email</option>
                      <option value="phone">phone</option>
                      <option value="company">company</option>
                      <option value="message">message</option>
                      <option value="budget">budget</option>
                      <option value="custom">custom</option>
                    </select>
                    <select value={f.type} onChange={(e) => updateField(f.id, { type: e.target.value as IntakeFormField['type'] })} className="bg-white border border-slate-200 rounded px-2 py-1 text-sm">
                      <option value="text">text</option>
                      <option value="email">email</option>
                      <option value="tel">tel</option>
                      <option value="textarea">textarea</option>
                      <option value="number">number</option>
                      <option value="select">select</option>
                    </select>
                    <label className="flex items-center gap-1 text-xs text-slate-600"><input type="checkbox" checked={f.required} onChange={(e) => updateField(f.id, { required: e.target.checked })} /> required</label>
                    <button onClick={() => removeField(f.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
              <button onClick={addField} className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"><Plus className="w-4 h-4" /> Add field</button>
              <div className="flex justify-between items-center gap-3 mt-4">
                <span className="text-xs text-slate-500">{publishMsg}</span>
                <button onClick={persist} disabled={!dirty} className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 rounded-lg flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Save & Publish</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3 text-slate-700"><Eye className="w-4 h-4" /><span className="text-sm font-semibold">Preview</span></div>
                <FormPreview form={draft} />
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3 text-slate-700"><Code className="w-4 h-4" /><span className="text-sm font-semibold">Embed code</span></div>
                <p className="text-xs text-slate-500 mb-2">Click <strong>Save &amp; Publish</strong> first, then paste this anywhere on your site:</p>
                <CopyBox label="URL" value={embedUrl} />
                <div className="h-3" />
                <CopyBox label="Iframe HTML" value={embedCode} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FormPreview({ form }: { form: IntakeForm }) {
  return (
    <div className="border border-slate-200 rounded-lg p-4" style={{ borderTop: `3px solid ${form.accentColor}` }}>
      <h4 className="text-base font-bold text-slate-800 mb-1">{form.headline}</h4>
      <p className="text-xs text-slate-500 mb-3">{form.description}</p>
      <div className="space-y-2">
        {form.fields.map((f) => (
          <label key={f.id} className="block">
            <span className="text-xs font-medium text-slate-600">{f.label}{f.required && <span className="text-red-500"> *</span>}</span>
            {f.type === 'textarea' ? (
              <textarea placeholder={f.placeholder} className="mt-1 w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm" rows={3} />
            ) : (
              <input type={f.type} placeholder={f.placeholder} className="mt-1 w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm" />
            )}
          </label>
        ))}
      </div>
      <button className="mt-3 w-full text-sm font-bold text-white px-4 py-2 rounded-md" style={{ backgroundColor: form.accentColor }}>{form.submitLabel}</button>
    </div>
  );
}

function CopyBox({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-1"><span className="text-xs font-semibold text-slate-600">{label}</span><button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200); }} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"><Copy className="w-3 h-3" /> {copied ? 'Copied!' : 'Copy'}</button></div>
      <textarea readOnly value={value} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-mono" rows={3} />
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (<label className="block"><span className="text-xs font-semibold text-slate-600">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500" /></label>);
}

function Textarea({ label, value, onChange, rows }: { label: string; value: string; onChange: (v: string) => void; rows: number }) {
  return (<label className="block md:col-span-2"><span className="text-xs font-semibold text-slate-600">{label}</span><textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="mt-1 w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500" /></label>);
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (<label className="block"><span className="text-xs font-semibold text-slate-600">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500">{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>);
}
