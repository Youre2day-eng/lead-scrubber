import { useState, useEffect, useRef } from 'react';
import { ListChecks, Plus, Trash2, Save } from 'lucide-react';
import type { TargetUrl, UrlType } from '../../types';

interface Props {
  targetUrls: TargetUrl[];
  onSave: (urls: TargetUrl[]) => void;
}

export default function SourcesPanel({ targetUrls, onSave }: Props) {
  const [draft, setDraft] = useState<TargetUrl[]>(
    targetUrls.map(u => ({ ...u, enabled: u.enabled !== false }))
  );
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<UrlType>('custom');

  // Keep draft in sync when the persisted targetUrls change (e.g. after
  // Firestore/localStorage loads on first render or from another tab).
  // Using a ref-based comparison avoids unnecessary resets when the parent
  // re-renders but the actual URL list content has not changed.
  const prevUrlsJsonRef = useRef(JSON.stringify(targetUrls));
  useEffect(() => {
    const json = JSON.stringify(targetUrls);
    if (json !== prevUrlsJsonRef.current) {
      prevUrlsJsonRef.current = json;
      setDraft(targetUrls.map(u => ({ ...u, enabled: u.enabled !== false })));
    }
  }, [targetUrls]);

  const update = (id: string, patch: Partial<TargetUrl>) => {
    setDraft(draft.map(u => u.id === id ? { ...u, ...patch } : u));
  };

  const add = () => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    setDraft([...draft, { id: crypto.randomUUID(), url: trimmed, type: newType, enabled: true }]);
    setNewUrl('');
  };

  const remove = (id: string) => setDraft(draft.filter(u => u.id !== id));

  const save = () => onSave(draft);

  const enabledCount = draft.filter(u => u.enabled !== false).length;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-blue-500" /> Target Sources
          </h3>
          <p className="text-sm text-slate-500">Toggle which sources to scan. Disabled sources stay saved but are skipped during scrapes.</p>
        </div>
        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
          {enabledCount} / {draft.length} active
        </span>
      </div>

      <div className="space-y-2 mb-6">
        {draft.length === 0 && (
          <div className="text-sm text-slate-500 italic p-4 text-center border border-dashed border-slate-200 rounded-lg">
            No sources yet. Add a URL below.
          </div>
        )}
        {draft.map(u => (
          <div key={u.id} className={`flex items-center gap-3 p-3 rounded-xl border ${u.enabled !== false ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-slate-200 opacity-60'}`}>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input type="checkbox" checked={u.enabled !== false} onChange={(e) => update(u.id, { enabled: e.target.checked })} className="sr-only peer" />
              <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
            </label>
            <select value={u.type} onChange={(e) => update(u.id, { type: e.target.value as UrlType })} className="bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs font-semibold text-slate-600">
              <option value="custom">Custom</option>
              <option value="facebook">FB Group</option>
              <option value="linkedin">LinkedIn</option>
            </select>
            <input type="text" value={u.url} onChange={(e) => update(u.id, { url: e.target.value })} className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-mono text-slate-700 outline-none focus:border-blue-500" />
            <button onClick={() => remove(u.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 pt-4 mb-4">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Add Source</label>
        <div className="flex items-center gap-2">
          <select value={newType} onChange={(e) => setNewType(e.target.value as UrlType)} className="bg-white border border-slate-200 rounded-md px-2 py-2 text-xs font-semibold text-slate-600">
            <option value="custom">Custom</option>
            <option value="facebook">FB Group</option>
            <option value="linkedin">LinkedIn</option>
          </select>
          <input type="text" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} placeholder="https://www.reddit.com/r/yoursub/" className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-blue-500" />
          <button onClick={add} className="text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg flex items-center gap-2"><Plus className="w-4 h-4" /> Add</button>
        </div>
      </div>

      <div className="flex justify-end border-t border-slate-100 pt-4">
        <button onClick={save} className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-6 py-2.5 rounded-lg flex items-center gap-2 shadow-sm">
          <Save className="w-4 h-4" /> Save Sources
        </button>
      </div>
    </div>
  );
}
