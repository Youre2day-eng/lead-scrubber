import { useState, useEffect, useMemo } from 'react';
import { Activity, AlertCircle, Settings as SettingsIcon, Users, Loader2, Inbox, Megaphone, List } from 'lucide-react';
import { useScraper } from '../../hooks/useScraper';
import LeadCard from './LeadCard';
import type { TargetUrl, AuthUser, Lead, LeadIntent } from '../../types';

interface Props {
  user: AuthUser;
  targetUrls: TargetUrl[];
  onGoToSettings: () => void;
  onSaveLead: (id: string) => void;
  sessionSavedIds: Set<string>;
  onNicheChange?: (niche: string) => void;
}

// Client-side fallback intent detector for leads ingested before the
// server-side detector existed. Mirrors functions/lib/score.ts.
const SELLING_RX = /\b\[?for hire\]?\b|\bi (offer|provide|do|build|sell|design|run)\b|\bwe (offer|provide|sell|build|design)\b|\bdm me\b|\bmessage me\b|\bservices? (include|offered|available)\b|\bavailable for (hire|work|projects)\b|\baccepting (clients|new clients|projects|work)\b|\bportfolio\b|\brate(s)?:?\s*\$|\$\d+\s*\/\s*(hr|hour|month|project)\b|\bstarting at \$\d+|\bbook (a|me|now)\b|\bmy (services?|website|portfolio|rates?)\b|\bcheck out my\b|\bopen (for|to) (work|commissions|projects)\b|\btaking (orders|commissions|clients)\b/i;
const BUYING_RX = /\b\[?hiring\]?\b|\bin search of\b|\bISO\b|\blooking (for|to hire|to pay)\b|\bneed (a|an|to find|to hire|someone)\b|\bwilling to pay\b|\bbudget\b|\bany (recommendations?|recs|suggestions?)\b|\bwho (do you|can|knows|would you)\b|\brecommendations?\b|\bhelp me find\b/i;

function fallbackIntent(text: string): LeadIntent {
  if (!text) return 'neutral';
  const sell = SELLING_RX.test(text);
  const buy = BUYING_RX.test(text);
  if (sell && !buy) return 'selling';
  if (buy && !sell) return 'buying';
  if (sell && buy) {
    if (/\bfor hire\b|\bdm me\b|\$\d+\s*\/\s*hr/i.test(text)) return 'selling';
    return 'buying';
  }
  return 'neutral';
}

type IntentFilter = 'all' | 'buying' | 'selling';

export function ScraperView({ user, targetUrls, onGoToSettings, onSaveLead, sessionSavedIds, onNicheChange }: Props) {
  const [niche, setNiche] = useState('');
  const [keywords, setKeywords] = useState('ISO, looking for, any recommendations');
  const [filter, setFilter] = useState<IntentFilter>('buying');
  const { leads, status, errorMsg, runScraper } = useScraper();

  const enabledUrls = targetUrls.filter(u => u.enabled !== false);
  const disabledCount = targetUrls.length - enabledUrls.length;

  useEffect(() => { if (onNicheChange) onNicheChange(niche); }, [niche, onNicheChange]);

  const taggedLeads = useMemo(() => leads.map(l => {
    const anyL = l as Lead & { intent?: LeadIntent };
    const intent: LeadIntent = anyL.intent || fallbackIntent(anyL.text || '');
    return { ...anyL, intent };
  }), [leads]);

  const counts = useMemo(() => {
    const c = { all: taggedLeads.length, buying: 0, selling: 0, neutral: 0 };
    for (const l of taggedLeads) {
      if (l.intent === 'buying') c.buying++;
      else if (l.intent === 'selling') c.selling++;
      else c.neutral++;
    }
    return c;
  }, [taggedLeads]);

  const filteredLeads = useMemo(() => {
    if (filter === 'all') return taggedLeads;
    if (filter === 'buying') return taggedLeads.filter(l => l.intent === 'buying');
    if (filter === 'selling') return taggedLeads.filter(l => l.intent === 'selling');
    return taggedLeads;
  }, [taggedLeads, filter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche.trim() || enabledUrls.length === 0) return;
    runScraper(niche.trim(), keywords, enabledUrls);
  };

  const isRunning = status === 'scraping' || status === 'starting';
  const showEmptyState = status === 'idle' && taggedLeads.length === 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 h-fit">
        <div className="flex items-center gap-2 mb-5">
          <Activity className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-slate-900">Scraping Parameters</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Niche / Service</label>
            <input type="text" value={niche} onChange={e => setNiche(e.target.value)} placeholder="e.g. Graphic Designer, Plumber" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Target Keywords</label>
            <textarea value={keywords} onChange={e => setKeywords(e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-slate-500 mt-1">Comma-separated phrases to look for in posts.</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-700">Active Sources</label>
              <button type="button" onClick={onGoToSettings} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"><SettingsIcon className="w-3 h-3" /> Manage</button>
            </div>
            {enabledUrls.length === 0 ? (
              <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 text-xs text-amber-800">No sources enabled. Click <strong>Manage</strong> to enable some.</div>
            ) : (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-40 overflow-auto">{enabledUrls.map(u => (<div key={u.id} className="px-3 py-2 text-xs text-slate-700 truncate">{u.url}</div>))}</div>
            )}
            {disabledCount > 0 && (<p className="text-xs text-slate-400 mt-1">{disabledCount} disabled</p>)}
          </div>
          <button type="submit" disabled={isRunning || !niche.trim() || enabledUrls.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition">
            {isRunning ? (<><Loader2 className="w-4 h-4 animate-spin" /> Scrubbing…</>) : (<><Activity className="w-4 h-4" /> Start Lead Search</>)}
          </button>
          {status === 'error' && errorMsg && (<div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2"><AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{errorMsg}</span></div>)}
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 min-h-[400px]">
        {showEmptyState ? (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-4"><Users className="w-7 h-7 text-blue-500" /></div>
            <h3 className="font-semibold text-slate-900 mb-1">No Leads Yet</h3>
            <p className="text-sm text-slate-500 max-w-xs">Enter your niche on the left to start scrubbing platforms.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <h3 className="font-semibold text-slate-900">{filteredLeads.length} {filter === 'buying' ? 'Buyer' : filter === 'selling' ? 'Seller' : 'Lead'}{filteredLeads.length === 1 ? '' : 's'}</h3>
              {isRunning && <span className="text-xs text-blue-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Scrubbing…</span>}
            </div>
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
              <button onClick={() => setFilter('buying')} className={'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ' + (filter === 'buying' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                <Inbox className="w-3.5 h-3.5" /> Buyers <span className="opacity-75">({counts.buying})</span>
              </button>
              <button onClick={() => setFilter('selling')} className={'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ' + (filter === 'selling' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                <Megaphone className="w-3.5 h-3.5" /> Sellers <span className="opacity-75">({counts.selling})</span>
              </button>
              <button onClick={() => setFilter('all')} className={'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ' + (filter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                <List className="w-3.5 h-3.5" /> All <span className="opacity-75">({counts.all})</span>
              </button>
              <span className="text-xs text-slate-400 ml-auto">{filter === 'buying' ? 'People asking for / hiring this service' : filter === 'selling' ? 'People offering this service' : 'All posts'}</span>
            </div>
            {filteredLeads.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-500">
                No {filter === 'buying' ? 'buyer' : filter === 'selling' ? 'seller' : ''} posts in this batch. Try another filter.
              </div>
            ) : (
              filteredLeads.map(lead => (<LeadCard key={lead.id} lead={lead} onSave={() => onSaveLead(lead.id)} isSaved={sessionSavedIds.has(lead.id)} />))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ScraperView;

export default ScraperView;
