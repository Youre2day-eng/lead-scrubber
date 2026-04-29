import { useState, useEffect, useMemo } from 'react';
import { Activity, AlertCircle, Settings as SettingsIcon, Users, Loader2, Inbox, Megaphone, List, MapPin } from 'lucide-react';
import { useScraper } from '../../hooks/useScraper';
import LeadCard from './LeadCard';
import type { TargetUrl, AuthUser, Lead, LeadIntent } from '../../types';

interface Props {
  user?: AuthUser;
  targetUrls: TargetUrl[];
  onSaveUrls?: (urls: TargetUrl[]) => void;
  onGoToSettings: () => void;
  onSaveLead: (lead: Lead) => void;
  sessionSavedIds: Set<string>;
  onNicheChange?: (niche: string) => void;
}

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

function detectPlatform(url: string): 'reddit' | 'facebook' | 'instagram' | 'linkedin' | 'other' {
  const u = (url || '').toLowerCase();
  if (u.includes('reddit.com')) return 'reddit';
  if (u.includes('facebook.com') || u.includes('fb.com')) return 'facebook';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('linkedin.com')) return 'linkedin';
  return 'other';
}

const PLATFORM_LABELS: Record<string, string> = {
  reddit: 'Reddit',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  other: 'Custom',
};

const PLATFORM_ORDER: Array<'reddit' | 'facebook' | 'instagram' | 'linkedin' | 'other'> = [
  'reddit', 'facebook', 'instagram', 'linkedin', 'other',
];

export function ScraperView({ targetUrls, onSaveUrls, onGoToSettings, onSaveLead, sessionSavedIds, onNicheChange }: Props) {
  const [niche, setNiche] = useState('');
  const [keywords, setKeywords] = useState('ISO, looking for, any recommendations');
  const [location, setLocation] = useState('');
  const [filter, setFilter] = useState<IntentFilter>('buying');
  const { leads, status, errorMsg, runScraper } = useScraper();

  useEffect(() => {
    if (onNicheChange) onNicheChange(niche);
  }, [niche, onNicheChange]);

  const isUrlOn = (u: TargetUrl): boolean => u.enabled !== false;

  const enabledUrls = useMemo(() => targetUrls.filter(isUrlOn), [targetUrls]);

  const grouped = useMemo(() => {
    const g: Record<string, TargetUrl[]> = { reddit: [], facebook: [], instagram: [], linkedin: [], other: [] };
    for (const u of targetUrls) g[detectPlatform(u.url)].push(u);
    return g;
  }, [targetUrls]);

  const updateUrls = (next: TargetUrl[]) => {
    if (onSaveUrls) onSaveUrls(next);
  };

  const toggleUrl = (u: TargetUrl) => {
    const next = targetUrls.map(t => t.id === u.id ? { ...t, enabled: !isUrlOn(t) } : t);
    updateUrls(next);
  };

  const togglePlatform = (platform: string, on: boolean) => {
    const ids = new Set((grouped[platform] || []).map(u => u.id));
    const next = targetUrls.map(t => ids.has(t.id) ? { ...t, enabled: on } : t);
    updateUrls(next);
  };

  const allOn = (platform: string): boolean => {
    const urls = grouped[platform] || [];
    return urls.length > 0 && urls.every(isUrlOn);
  };
  const anyOn = (platform: string): boolean => {
    const urls = grouped[platform] || [];
    return urls.some(isUrlOn);
  };

  const taggedLeads = useMemo(() => leads.map(l => {
    const anyL = l as Lead & { intent?: LeadIntent };
    const intent: LeadIntent = anyL.intent || fallbackIntent(anyL.text || '');
    return { ...anyL, intent };
  }), [leads]);

  const locationFiltered = useMemo(() => {
    const loc = location.trim().toLowerCase();
    if (!loc) return taggedLeads;
    const tokens = loc.split(/[,;|]+/).map(s => s.trim()).filter(Boolean);
    if (tokens.length === 0) return taggedLeads;
    return taggedLeads.filter(l => {
      const hay = ((l as any).city || '') + ' ' + (l.text || '') + ' ' + (l.groupName || '');
      const lower = hay.toLowerCase();
      return tokens.some(t => lower.includes(t));
    });
  }, [taggedLeads, location]);

  const counts = useMemo(() => {
    const c = { all: locationFiltered.length, buying: 0, selling: 0, neutral: 0 };
    for (const l of locationFiltered) {
      if (l.intent === 'buying') c.buying++;
      else if (l.intent === 'selling') c.selling++;
      else c.neutral++;
    }
    return c;
  }, [locationFiltered]);

  const filteredLeads = useMemo(() => {
    if (filter === 'all') return locationFiltered;
    if (filter === 'buying') return locationFiltered.filter(l => l.intent === 'buying');
    if (filter === 'selling') return locationFiltered.filter(l => l.intent === 'selling');
    return locationFiltered;
  }, [locationFiltered, filter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche.trim() || enabledUrls.length === 0) return;
    const kwWithLoc = location.trim()
      ? keywords + (keywords.trim() ? ', ' : '') + location
      : keywords;
    runScraper(niche.trim(), kwWithLoc, enabledUrls);
  };

  const isRunning = status === 'scraping' || status === 'filtering';
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
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" /> Location
              <span className="text-xs text-slate-400 font-normal ml-1">(optional)</span>
            </label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Austin, TX or Denver, NYC" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-slate-500 mt-1">Filter posts by city / region (comma-separated for multiple).</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-700">Active Sources</label>
              <button type="button" onClick={onGoToSettings} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"><SettingsIcon className="w-3 h-3" /> Manage</button>
            </div>
            {targetUrls.length === 0 ? (
              <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 text-xs text-amber-800">No sources configured. Click <strong>Manage</strong> to add some.</div>
            ) : (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-72 overflow-auto">
                {PLATFORM_ORDER.map(platform => {
                  const urls = grouped[platform];
                  if (!urls || urls.length === 0) return null;
                  const allChecked = allOn(platform);
                  const someChecked = anyOn(platform);
                  return (
                    <div key={platform} className="px-3 py-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none mb-1">
                        <input type="checkbox" checked={allChecked} ref={el => { if (el) el.indeterminate = !allChecked && someChecked; }} onChange={e => togglePlatform(platform, e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-xs font-semibold text-slate-700">{PLATFORM_LABELS[platform]}</span>
                        <span className="text-xs text-slate-400">({urls.length})</span>
                      </label>
                      <div className="ml-6 space-y-1">
                        {urls.map(u => (
                          <label key={u.id} className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={isUrlOn(u)} onChange={() => toggleUrl(u)} className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            <span className="text-xs text-slate-600 truncate" title={u.url}>{u.url}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1.5">{enabledUrls.length} of {targetUrls.length} sources will be scanned.</p>
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
              <h3 className="font-semibold text-slate-900">{filteredLeads.length} {filter === 'buying' ? 'Buyer' : filter === 'selling' ? 'Seller' : 'Lead'}{filteredLeads.length === 1 ? '' : 's'}{location.trim() && <span className="text-xs font-normal text-slate-500 ml-2">in "{location.trim()}"</span>}</h3>
              {isRunning && <span className="text-xs text-blue-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Scrubbing…</span>}
            </div>
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 flex-wrap">
              <button onClick={() => setFilter('buying')} className={'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ' + (filter === 'buying' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}><Inbox className="w-3.5 h-3.5" /> Buyers <span className="opacity-75">({counts.buying})</span></button>
              <button onClick={() => setFilter('selling')} className={'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ' + (filter === 'selling' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}><Megaphone className="w-3.5 h-3.5" /> Sellers <span className="opacity-75">({counts.selling})</span></button>
              <button onClick={() => setFilter('all')} className={'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ' + (filter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}><List className="w-3.5 h-3.5" /> All <span className="opacity-75">({counts.all})</span></button>
              <span className="text-xs text-slate-400 ml-auto">{filter === 'buying' ? 'People asking for / hiring this service' : filter === 'selling' ? 'People offering this service' : 'All posts'}</span>
            </div>
            {filteredLeads.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-500">No {filter === 'buying' ? 'buyer' : filter === 'selling' ? 'seller' : ''} posts{location.trim() ? ' matching this location' : ' in this batch'}. Try another filter{location.trim() ? ' or clear the location' : ''}.</div>
            ) : (
              filteredLeads.map(lead => (<LeadCard key={lead.id} lead={lead} onSave={() => onSaveLead(lead)} isSaved={sessionSavedIds.has(lead.id)} />))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ScraperView;
