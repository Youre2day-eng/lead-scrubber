// src/components/connections/ConnectionsView.tsx
// In-app page for pasting third-party tokens (Apify for now). Saves to KV via /api/connections.

import { useEffect, useState } from 'react';
import { CheckCircle2, Link as LinkIcon, ExternalLink, Loader2, AlertCircle, Trash2 } from 'lucide-react';

type ApifyState = { connected: boolean; username?: string; savedAt?: string };

export default function ConnectionsView() {
  const [apify, setApify] = useState<ApifyState>({ connected: false });
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/connections');
      const j = await r.json();
      setApify(j.apify || { connected: false });
    } catch (e: any) { setErr(e?.message || 'failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const save = async () => {
    setErr(null);
    if (!token.trim()) { setErr('paste your Apify token first'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'apify', token: token.trim() }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
      setApify(j.apify);
      setToken('');
    } catch (e: any) { setErr(e?.message || 'failed'); }
    finally { setBusy(false); }
  };

  const disconnect = async () => {
    if (!confirm('Remove the saved Apify token?')) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/connections?provider=apify', { method: 'DELETE' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      setApify({ connected: false });
    } catch (e: any) { setErr(e?.message || 'failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><LinkIcon className="w-6 h-6 text-blue-500" /> Connections</h2>
        <p className="text-slate-500">Paste API tokens once here. They're saved server-side and used by your scrapers.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Apify</h3>
            <p className="text-sm text-slate-500">Powers Facebook group / Reddit / web scrapers via the Apify Actor API.</p>
          </div>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          ) : apify.connected ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 border border-green-200 text-xs font-semibold"><CheckCircle2 className="w-4 h-4" /> Connected</span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">Not connected</span>
          )}
        </div>

        {apify.connected ? (
          <div className="space-y-3">
            <div className="text-sm text-slate-700">
              Signed in as <span className="font-mono font-semibold">{apify.username || 'unknown'}</span>
              {apify.savedAt && <span className="text-slate-400"> — saved {new Date(apify.savedAt).toLocaleString()}</span>}
            </div>
            <button onClick={disconnect} disabled={busy} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold disabled:opacity-50">
              <Trash2 className="w-4 h-4" /> Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <ol className="text-sm text-slate-600 list-decimal pl-5 space-y-1">
              <li>Sign up at <a className="text-blue-600 underline inline-flex items-center gap-1" href="https://apify.com" target="_blank" rel="noreferrer">apify.com <ExternalLink className="w-3 h-3" /></a> (free tier available).</li>
              <li>Open <a className="text-blue-600 underline inline-flex items-center gap-1" href="https://console.apify.com/account/integrations" target="_blank" rel="noreferrer">Settings → Integrations <ExternalLink className="w-3 h-3" /></a> and copy your Personal API token.</li>
              <li>Paste it below and click Save.</li>
            </ol>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Save & verify
            </button>
          </div>
        )}

        {err && (
          <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5" /> {err}
          </div>
        )}
      </div>
    </div>
  );
}
