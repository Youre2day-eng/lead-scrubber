import { Activity, AlertCircle, Users } from 'lucide-react';
import { useState } from 'react';
import { DEFAULT_KEYWORDS } from '../../constants';
import { useScraper } from '../../hooks/useScraper';
import type { Lead, TargetUrl, UrlType } from '../../types';
import LeadCard from './LeadCard';
import ScraperControls from './ScraperControls';

interface ScraperViewProps {
  targetUrls: TargetUrl[];
  onAddUrl: (url: string, type: UrlType) => void;
  onRemoveUrl: (id: string) => void;
  onSaveLead: (lead: Lead) => void;
  sessionSavedIds: Set<string>;
  onNicheChange: (niche: string) => void;
}

export default function ScraperView({
  targetUrls, onAddUrl, onRemoveUrl, onSaveLead, sessionSavedIds, onNicheChange,
}: ScraperViewProps) {
  const [niche, setNiche] = useState('');
  const [keywords, setKeywords] = useState(DEFAULT_KEYWORDS);
  const { status, leads, errorMsg, runScraper } = useScraper();

  const handleNicheChange = (v: string) => {
    setNiche(v);
    onNicheChange(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche.trim()) return;
    runScraper(niche, keywords, targetUrls);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-4 space-y-6">
        <ScraperControls
          niche={niche}
          keywords={keywords}
          targetUrls={targetUrls}
          status={status}
          onNicheChange={handleNicheChange}
          onKeywordsChange={setKeywords}
          onAddUrl={onAddUrl}
          onRemoveUrl={onRemoveUrl}
          onSubmit={handleSubmit}
        />

        {(status === 'scraping' || status === 'filtering') && (
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
                  <div className={`${active ? 'bg-blue-500 animate-pulse' : done ? 'bg-green-500' : 'bg-slate-200'}`} />
                  <span className={`${active ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-8">
        {status === 'error' && errorMsg && (
          <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-amber-300 rounded-2xl bg-amber-50 p-12 text-center min-h-[400px]">
            <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
            <h3 className="text-xl font-bold text-amber-800 mb-2">Scraper unavailable</h3>
            <p className="text-amber-700 max-w-md">{errorMsg}</p>
          </div>
        )}

        {status === 'idle' && (
          <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl bg-white p-12 text-center min-h-[400px]">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Leads Yet</h3>
            <p className="text-slate-500 max-w-md">Enter your niche on the left to start scrubbing platforms.</p>
          </div>
        )}

        {leads.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-slate-800">Qualified Leads</h2>
              <span className="text-sm font-medium text-slate-500">{leads.length} high-intent results</span>
            </div>
            {leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                isSaved={sessionSavedIds.has(lead.id)}
                onSave={onSaveLead}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
