import { useState, useCallback, useEffect, useRef } from 'react';
import type { Lead, ScraperStatus, TargetUrl } from '../types';

const LIST_URL = '/api/leads/list';
const RUN_URL = '/api/scrape/run';
const POLL_URL = '/api/scrape/poll';

export function useScraper() {
  const [status, setStatus] = useState<ScraperStatus>('idle');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const pollRef = useRef<number | null>(null);
  // Tracks whether a user-triggered scrape is in progress so the background
  // refresh interval does not overwrite leads mid-scrape (Bug 4 fix).
  const scrapingRef = useRef(false);

  const fetchLeads = useCallback(async () => {
    // Skip background refresh while a scrape is running to keep counts stable.
    if (scrapingRef.current) return 0;
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

  useEffect(() => {
    fetchLeads();
    pollRef.current = window.setInterval(fetchLeads, 15000);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, [fetchLeads]);

  // Trigger a real Apify scrape across all target URLs, poll until each finishes,
  // then refresh the lead list. If no token / no URLs, falls back to a refresh.
  const runScraper = async (niche: string, keywords: string, targetUrls: TargetUrl[]) => {
    setErrorMsg('');
    if (!targetUrls || targetUrls.length === 0) {
      setStatus('scraping');
      const count = await fetchLeads();
      setStatus(count > 0 ? 'complete' : 'idle');
      return;
    }
    scrapingRef.current = true;
    setStatus('scraping');
    setLeads([]);

    const kw = (keywords || '').split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

    try {
      // Kick off one Apify run per target URL.
      const runs: { runId: string; url: string }[] = [];
      for (const t of targetUrls) {
        try {
          const res = await fetch(RUN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: t.url, type: t.type, keywords: kw, niche }),
          });
          if (!res.ok) {
            const txt = await res.text();
            throw new Error('run failed (' + res.status + '): ' + txt.slice(0, 160));
          }
          const data = await res.json();
          if (data && data.runId) runs.push({ runId: data.runId, url: t.url });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          setErrorMsg(prev => prev ? prev + ' | ' + msg : msg);
        }
      }

      if (runs.length === 0) {
        scrapingRef.current = false;
        setStatus('error');
        return;
      }

      setStatus('filtering');
      // Poll each run until SUCCEEDED / FAILED / TIMED-OUT (max ~3 min each).
      const deadline = Date.now() + 1000 * 60 * 3;
      const pending = new Set(runs.map(r => r.runId));
      while (pending.size > 0 && Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 5000));
        for (const runId of Array.from(pending)) {
          try {
            const res = await fetch(POLL_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ runId, niche, keywords: kw }),
            });
            if (!res.ok) continue;
            const data = await res.json();
            if (Array.isArray(data?.errors) && data.errors.length) {
              const msg = 'Apify: ' + data.errors.join(' | ');
              setErrorMsg(prev => prev ? prev + ' | ' + msg : msg);
            }
            if (data && (data.status === 'SUCCEEDED' || data.status === 'FAILED' || data.status === 'TIMED-OUT' || data.status === 'ABORTED')) {
              pending.delete(runId);
            }
          } catch {
            // keep polling
          }
        }
      }

      scrapingRef.current = false;
      const count = await fetchLeads();
      setStatus(count > 0 ? 'complete' : 'idle');
    } catch (err) {
      scrapingRef.current = false;
      const msg = err instanceof Error ? err.message : 'Scrape failed.';
      setErrorMsg(msg);
      setStatus('error');
    }
  };

  return { status, leads, errorMsg, runScraper, refresh: fetchLeads };
}
