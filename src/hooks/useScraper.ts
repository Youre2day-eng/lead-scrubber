import { useState, useCallback, useEffect, useRef } from 'react';
import type { Lead, ScraperStatus, TargetUrl } from '../types';

// Backend dashboard endpoint. Same origin in production (Cloudflare Pages Function).
const LIST_URL = '/api/leads/list';

export function useScraper() {
  const [status, setStatus] = useState<ScraperStatus>('idle');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const pollRef = useRef<number | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch(LIST_URL, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      setLeads(Array.isArray(data.leads) ? data.leads : []);
      setErrorMsg('');
      return Array.isArray(data.leads) ? data.leads.length : 0;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load leads.';
      setErrorMsg(msg);
      return 0;
    }
  }, []);

  // Initial load + light polling so the dashboard reflects new ingests from the extension.
  useEffect(() => {
    fetchLeads();
    pollRef.current = window.setInterval(fetchLeads, 15000);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, [fetchLeads]);

  // Kept for compatibility with existing UI: 'Start Lead Search' now just refreshes from backend.
  const runScraper = async (_niche: string, _keywords: string, _targetUrls: TargetUrl[]) => {
    setStatus('scraping');
    setLeads([]);
    setErrorMsg('');
    const count = await fetchLeads();
    setStatus(count > 0 ? 'complete' : 'idle');
  };

  return { status, leads, errorMsg, runScraper, refresh: fetchLeads };
}
