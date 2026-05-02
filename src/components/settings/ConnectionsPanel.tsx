// src/components/settings/ConnectionsPanel.tsx
// Compact connections panel used inside Settings → Connections tab.
// Shows Apify token input + OAuth connect cards for messaging platforms.
import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Link as LinkIcon, Loader2, RefreshCcw, Trash2 } from 'lucide-react';
import type { SocialConnectionState } from '../../types';
import { useSocialConnections } from '../../hooks/useSocialConnections';
import { consumeOAuthRedirectParams } from '../../lib/oauthRedirect';

const PLATFORM_META: Record<string, { label: string; color: string; noteForMessaging?: string }> = {
  facebook: { label: 'Facebook', color: 'bg-blue-600', noteForMessaging: 'Messenger can only reply to users who first messaged your Page.' },
  instagram: { label: 'Instagram', color: 'bg-pink-600', noteForMessaging: 'Instagram DMs via API require app review and can only reply to existing conversations.' },
  threads: { label: 'Threads', color: 'bg-slate-800', noteForMessaging: 'Threads has no public DM API yet.' },
  reddit: { label: 'Reddit', color: 'bg-orange-500' },
};

function StatusBadge({ state }: { state: SocialConnectionState }) {
  if (state.connected && state.expired) {
    return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold"><AlertCircle className="w-3.5 h-3.5" /> Expired</span>;
  }
  if (state.connected) {
    return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 border border-green-200 text-xs font-semibold"><CheckCircle2 className="w-4 h-4" /> Connected</span>;
  }
  return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">Not connected</span>;
}

function SocialRow({ provider, state, onDisconnect }: { provider: string; state: SocialConnectionState; onDisconnect: (p: string) => Promise<void> }) {
  const meta = PLATFORM_META[provider];
  const [busy, setBusy] = useState(false);
  const handleDisconnect = async () => {
    if (!confirm(`Disconnect ${meta.label}?`)) return;
    setBusy(true);
    try { await onDisconnect(provider); } finally { setBusy(false); }
  };
  return (
    <div className="border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-md ${meta.color} flex items-center justify-center`}>
            <span className="text-white text-[10px] font-bold">{meta.label.slice(0, 2).toUpperCase()}</span>
          </div>
          <span className="font-semibold text-sm text-slate-800">{meta.label}</span>
          {state.connected && state.username && (
            <span className="text-xs text-slate-500">({state.username})</span>
          )}
        </div>
        <StatusBadge state={state} />
      </div>
      {meta.noteForMessaging && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mb-2">{meta.noteForMessaging}</p>
      )}
      {(!state.connected || state.expired) ? (
        <a href={`/api/oauth/start/${provider}`} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline">
          {state.expired ? <><RefreshCcw className="w-3.5 h-3.5" /> Reconnect</> : <><LinkIcon className="w-3.5 h-3.5" /> Connect</>}
        </a>
      ) : (
        <button onClick={handleDisconnect} disabled={busy} className="inline-flex items-center gap-1 text-sm text-red-600 font-semibold hover:underline disabled:opacity-50">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Disconnect
        </button>
      )}
    </div>
  );
}

export default function ConnectionsPanel() {
  const { connections, loading, error, reload, disconnect } = useSocialConnections();
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [apifyErr, setApifyErr] = useState<string | null>(null);

  // Handle OAuth redirect params when arriving via settings tab
  const [oauthMsg, setOauthMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  useEffect(() => {
    const msg = consumeOAuthRedirectParams();
    if (msg) setOauthMsg(msg);
  }, []);

  const saveApify = async () => {
    setApifyErr(null);
    if (!token.trim()) { setApifyErr('paste your Apify token first'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/connections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'apify', token: token.trim() }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
      setToken('');
      reload();
    } catch (e: any) { setApifyErr(e?.message || 'failed'); }
    finally { setBusy(false); }
  };

  const disconnectApify = async () => {
    if (!confirm('Remove the saved Apify token?')) return;
    setBusy(true); setApifyErr(null);
    try {
      const r = await fetch('/api/connections?provider=apify', { method: 'DELETE' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      reload();
    } catch (e: any) { setApifyErr(e?.message || 'failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      {oauthMsg && (
        <div className={`flex items-start gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${oauthMsg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {oauthMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{oauthMsg.text}</span>
          <button onClick={() => setOauthMsg(null)} className="ml-auto text-current opacity-60 hover:opacity-100">&times;</button>
        </div>
      )}

      {/* Messaging platform connections */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-blue-500" /> Messaging Platforms
        </h3>
        <p className="text-sm text-slate-500 mb-4">Connect your social accounts to send Pipeline messages directly. Each message routes through your own account.</p>
        {loading ? (
          <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-600 text-sm"><AlertCircle className="w-4 h-4" /> {error} <button onClick={reload} className="underline">Retry</button></div>
        ) : (
          <div className="space-y-3">
            {(['facebook', 'instagram', 'threads', 'reddit'] as const).map((p) => (
              <SocialRow key={p} provider={p} state={connections[p]} onDisconnect={disconnect} />
            ))}
          </div>
        )}
      </div>

      {/* Apify token */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-blue-500" /> Apify
            </h3>
            <p className="text-sm text-slate-500">Optional. Reddit works free without it. Apify only needed for Facebook groups, LinkedIn, or other paid sources.</p>
          </div>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          ) : connections.apify.connected ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 border border-green-200 text-xs font-semibold"><CheckCircle2 className="w-4 h-4" /> Connected</span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">Not connected</span>
          )}
        </div>

        {connections.apify.connected ? (
          <div className="space-y-3">
            <div className="text-sm text-slate-700">
              Signed in as <span className="font-mono font-semibold">{connections.apify.username || 'unknown'}</span>
              {connections.apify.savedAt && <span className="text-slate-400"> &middot; saved {new Date(connections.apify.savedAt).toLocaleString()}</span>}
            </div>
            <button onClick={disconnectApify} disabled={busy} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold disabled:opacity-50">
              <Trash2 className="w-4 h-4" /> Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <a href="https://console.apify.com/account/integrations" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 text-sm font-semibold hover:underline">
              Get your Apify token
            </a>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="apify_api_..."
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-blue-500"
              />
              <button onClick={saveApify} disabled={busy} className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save
              </button>
            </div>
          </div>
        )}

        {apifyErr && (
          <div className="mt-3 inline-flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            <AlertCircle className="w-4 h-4" /> {apifyErr}
          </div>
        )}
      </div>
    </div>
  );
}
