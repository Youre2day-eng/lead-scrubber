import { Activity, AlertCircle, Settings, Users } from 'lucide-react';
import { useState } from 'react';
import { DEFAULT_KEYWORDS } from '../../constants';
import { useScraper } from '../../hooks/useScraper';
import type { Lead, TargetUrl } from '../../types';
import LeadCard from './LeadCard';

interface ScraperViewProps {
  targetUrls: TargetUrl[];
  onGoToSettings: () => void;
  onSaveLead: (lead: Lead) => void;
  sessionSavedIds: Set<string>;
  onNicheChange: (niche: string) => void;
}

export default function ScraperView({
  targetUrls, onGoToSettings, onSaveLead, sessionSavedIds, onNicheChange,
}: ScraperViewProps) {
  const [niche, setNiche] = useState('');
  const [keywords, setKeywords] = useState(DEFAULT_KEYWORDS);
  const { status, leads, errorMsg, runScraper } = useScraper();

  const enabledUrls = targetUrls.filter(u => u.enabled !== false);

  const handleNicheChange = (v: string) => { setNiche(v); onNicheChange(v); };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche.trim()) return;
    runScraper(niche, keywords, enabledUrls);
  };

  const showEmptyState = status === 'idle' && leads.length === 0;
  const showLeads = leads.length > 0;
  const isBusy = status === 'scraping' || status === 'filtering';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-4 space-y-6">
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" /> Scraping Parameters
          </h3>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Your Niche / Service</label>
            <input
              type="text"
              value={niche}
              onChange={(e) => handleNicheChange(e.target.value)}
              placeholder="e.g. Graphic Designer, Plumber"
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Target Keywords</label>
            <textarea
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              rows={3}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600">Active Sources</label>
              <button
                type="button"
                onClick={onGoToSettings}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
              >
                <Settings className="w-3 h-3" /> Manage
              </button>
            </div>
            <div className="space-y-1.5 mb-2">
              {enabledUrls.length === 0 ? (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  No active sources. <button type="button" onClick={onGoToSettings} className="font-semibold underline">Add some in Settings</button>.
                </div>
              ) : (
                enabledUrls.map(u => (
                  <div key={u.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="text-xs font-mono text-slate-600 truncate">{u.url}</span>
                  </div>
                ))
              )}
            </div>
            {targetUrls.length > enabledUrls.length && (
              <div className="text-xs text-slate-500">
                {targetUrls.length - enabledUrls.length} disabled
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isBusy || !niche.trim() || enabledUrls.length === 0}
            className="w-full text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            {isBusy ? 'Scraping...' : 'Start Lead Search'}
          </button>
        </form>

        {isBusy && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Pipeline Active
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Scraping Networks', active: status === 'scraping', done: status !== 'scraping' && status !== 'idle' },
                { label: 'Scoring Lead Intent', active: status === 'filtering', done: status === 'complete' },
              ].map(({ label, active, done }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${active ? 'bg-blue-500 animate-pulse' : done ? 'bg-green-500' : 'bg-slate-200'}`} />
                  <span className={`text-sm ${active ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-8">
        {status === 'error' && errorMsg && (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-amber-300 rounded-2xl bg-amber-50 p-12 text-center min-h-[400px] mb-4">
            <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
            <h3 className="text-xl font-bold text-amber-800 mb-2">Scraper unavailable</h3>
            <p className="text-amber-700 max-w-md">{errorMsg}</p>
          </div>
        )}

        {showEmptyState && (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl bg-white p-12 text-center min-h-[400px]">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Leads Yet</h3>
            <p className="text-slate-500 max-w-md">Enter your niche on the left to start scrubbing platforms.</p>
          </div>
        )}

        {showLeads && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-slate-800">Qualified Leads</h2>
              <span className="text-sm font-medium text-slate-500">{leads.length} high-intent results</span>
            </div>
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} isSaved={sessionSavedIds.has(lead.id)} onSave={onSaveLead} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
