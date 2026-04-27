import { Filter, Link, Plus, RefreshCw, Search, Target, Users, X } from 'lucide-react';
import { useState } from 'react';
import type { ScraperStatus, TargetUrl, UrlType } from '../../types';

interface ScraperControlsProps {
  niche: string;
  keywords: string;
  targetUrls: TargetUrl[];
  status: ScraperStatus;
  onNicheChange: (v: string) => void;
  onKeywordsChange: (v: string) => void;
  onAddUrl: (url: string, type: UrlType) => void;
  onRemoveUrl: (id: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const URL_ICON: Record<UrlType, React.ReactNode> = {
  facebook: <Users className="w-3 h-3 text-blue-600 shrink-0" />,
  linkedin: <Target className="w-3 h-3 text-blue-500 shrink-0" />,
  custom: <Link className="w-3 h-3 text-slate-500 shrink-0" />,
};

export default function ScraperControls({
  niche, keywords, targetUrls, status,
  onNicheChange, onKeywordsChange, onAddUrl, onRemoveUrl, onSubmit,
}: ScraperControlsProps) {
  const [newUrl, setNewUrl] = useState('');
  const [newUrlType, setNewUrlType] = useState<UrlType>('facebook');
  const busy = status === 'scraping' || status === 'filtering';

  const handleAdd = () => {
    if (!newUrl.trim()) return;
    onAddUrl(newUrl.trim(), newUrlType);
    setNewUrl('');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Filter className="w-5 h-5 text-blue-500" /> Scraping Parameters
      </h2>

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Your Niche / Service</label>
          <input
            type="text"
            value={niche}
            onChange={(e) => onNicheChange(e.target.value)}
            placeholder="e.g. Graphic Designer, Plumber"
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            required
            disabled={busy}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Target Keywords</label>
          <textarea
            value={keywords}
            onChange={(e) => onKeywordsChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all h-24 resize-none"
            disabled={busy}
          />
        </div>

        <div className="pt-4 border-t border-slate-100">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Target URLs to Scrape</label>

          <div className="space-y-2 mb-3 max-h-40 overflow-y-auto pr-1">
            {targetUrls.length === 0 && (
              <div className="text-xs text-slate-500 italic">No URLs added. Add one below.</div>
            )}
            {targetUrls.map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-lg text-xs shadow-sm group">
                <span className="truncate mr-2 flex items-center gap-2 font-medium text-slate-700">
                  {URL_ICON[t.type]}
                  <span className="truncate max-w-[180px]">{t.url}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveUrl(t.id)}
                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <select
              value={newUrlType}
              onChange={(e) => setNewUrlType(e.target.value as UrlType)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-24 shrink-0"
            >
              <option value="facebook">FB Group</option>
              <option value="linkedin">LinkedIn</option>
              <option value="custom">Custom</option>
            </select>
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all min-w-0"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newUrl}
              className="bg-slate-800 hover:bg-slate-900 text-white rounded-lg px-3 flex items-center justify-center disabled:opacity-50 transition-colors shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={busy || targetUrls.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
        >
          {busy ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          {status === 'scraping'
            ? 'Scraping APIs...'
            : status === 'filtering'
              ? 'AI Filtering Intent...'
              : targetUrls.length === 0
                ? 'Add a Target URL first'
                : 'Start Lead Search'}
        </button>
      </form>
    </div>
  );
}
