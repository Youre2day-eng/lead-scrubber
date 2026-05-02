// src/components/connections/ConnectionsView.tsx
// Full-page connections manager.
// Shows Apify token input + per-platform OAuth connect cards for Facebook, Instagram, Threads, Reddit.
import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Link as LinkIcon,
  Loader2,
  RefreshCcw,
  Search,
  Trash2,
} from 'lucide-react';
import type { SocialConnectionState, ViewType } from '../../types';
import { useSocialConnections } from '../../hooks/useSocialConnections';
import { consumeOAuthRedirectParams } from '../../lib/oauthRedirect';

interface Props {
  onViewChange?: (v: ViewType) => void;
}

// ── Apify panel (unchanged) ──────────────────────────────────────────────────

function ApifyPanel({
  state,
  onRefresh,
}: {
  state: { connected: boolean; username?: string; savedAt?: string };
  onRefresh: () => void;
}) {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
      setToken('');
      onRefresh();
    } catch (e: any) {
      setErr(e?.message || 'failed');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!confirm('Remove the saved Apify token?')) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/connections?provider=apify', { method: 'DELETE' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      onRefresh();
    } catch (e: any) {
      setErr(e?.message || 'failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Apify</h3>
          <p className="text-sm text-slate-500">One token, every scraper. Auto-routes Facebook / Reddit / Nextdoor / generic web URLs to the right Actor.</p>
        </div>
        {state.connected ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 border border-green-200 text-xs font-semibold"><CheckCircle2 className="w-4 h-4" /> Connected</span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">Not connected</span>
        )}
      </div>

      {state.connected ? (
        <div className="space-y-3">
          <div className="text-sm text-slate-700">
            Signed in as <span className="font-mono font-semibold">{state.username || 'unknown'}</span>
            {state.savedAt && <span className="text-slate-400"> &middot; saved {new Date(state.savedAt).toLocaleString()}</span>}
          </div>
          <button onClick={disconnect} disabled={busy} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold disabled:opacity-50">
            <Trash2 className="w-4 h-4" /> Disconnect
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <ol className="text-sm text-slate-600 list-decimal pl-5 space-y-1">
            <li>Sign up (or sign in) at <a className="text-blue-600 underline inline-flex items-center gap-1" href="https://apify.com" target="_blank" rel="noreferrer">apify.com <ExternalLink className="w-3 h-3" /></a> &mdash; free tier works.</li>
            <li>Open <a className="text-blue-600 underline inline-flex items-center gap-1" href="https://console.apify.com/account/integrations" target="_blank" rel="noreferrer">Console &rarr; Settings &rarr; Integrations <ExternalLink className="w-3 h-3" /></a> and copy your <span className="font-mono">Personal API token</span>.</li>
            <li>Paste it below and hit Save.</li>
          </ol>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Save & verify
          </button>
        </div>
      )}

      {err && (
        <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {err}
        </div>
      )}
    </div>
  );
}

// ── Social platform card ─────────────────────────────────────────────────────

const PLATFORM_META: Record<string, { label: string; color: string; description: string; noteForMessaging?: string }> = {
  facebook: {
    label: 'Facebook',
    color: 'bg-blue-600',
    description: 'Send Messenger messages on your behalf. Requires a Facebook Page with Messenger enabled.',
    noteForMessaging: 'Messenger can only reply to users who have already messaged your Page (platform policy).',
  },
  instagram: {
    label: 'Instagram',
    color: 'bg-pink-600',
    description: 'Send Instagram DMs on your behalf via the Instagram Messaging API.',
    noteForMessaging: 'Instagram DMs via API require app review and can only reply to existing conversations.',
  },
  threads: {
    label: 'Threads',
    color: 'bg-slate-800',
    description: 'Connect your Threads account.',
    noteForMessaging: 'Threads does not currently provide a public API for direct messages.',
  },
  reddit: {
    label: 'Reddit',
    color: 'bg-orange-500',
    description: 'Send Reddit private messages on your behalf using your Reddit account.',
  },
};

function StatusBadge({ state }: { state: SocialConnectionState }) {
  if (state.connected && state.expired) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
        <AlertCircle className="w-3.5 h-3.5" /> Token expired
      </span>
    );
  }
  if (state.connected) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 border border-green-200 text-xs font-semibold">
        <CheckCircle2 className="w-4 h-4" /> Connected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">
      Not connected
    </span>
  );
}

function SocialPlatformCard({
  provider,
  state,
  onDisconnect,
}: {
  provider: string;
  state: SocialConnectionState;
  onDisconnect: (provider: string) => Promise<void>;
}) {
  const meta = PLATFORM_META[provider];
  const [busy, setBusy] = useState(false);

  const handleDisconnect = async () => {
    if (!confirm(`Disconnect ${meta.label}?`)) return;
    setBusy(true);
    try { await onDisconnect(provider); } finally { setBusy(false); }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mb-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${meta.color} flex items-center justify-center shrink-0`}>
            <span className="text-white text-xs font-bold">{meta.label.slice(0, 2).toUpperCase()}</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">{meta.label}</h3>
            <p className="text-sm text-slate-500">{meta.description}</p>
          </div>
        </div>
        <StatusBadge state={state} />
      </div>

      {state.connected && !state.expired && (
        <div className="text-sm text-slate-600 mb-3">
          {state.username && <span>Connected as <span className="font-semibold">{state.username}</span></span>}
          {state.connectedAt && (
            <span className="text-slate-400"> &middot; {new Date(state.connectedAt).toLocaleString()}</span>
          )}
        </div>
      )}

      {meta.noteForMessaging && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{meta.noteForMessaging}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(!state.connected || state.expired) ? (
          <a
            href={`/api/oauth/start/${provider}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            {state.expired ? (
              <><RefreshCcw className="w-4 h-4" /> Reconnect {meta.label}</>
            ) : (
              <><LinkIcon className="w-4 h-4" /> Connect {meta.label}</>
            )}
          </a>
        ) : (
          <button
            onClick={handleDisconnect}
            disabled={busy}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────

export default function ConnectionsView({ onViewChange }: Props) {
  const { connections, loading, error, reload, disconnect } = useSocialConnections();

  // Show flash if redirected back after OAuth
  const [oauthMsg, setOauthMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  useEffect(() => {
    const msg = consumeOAuthRedirectParams();
    if (msg) setOauthMsg(msg);
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <LinkIcon className="w-6 h-6 text-blue-500" /> Connections
        </h2>
        <p className="text-slate-500">Connect your accounts to send messages directly from the Pipeline. Each message goes out through your own account — we never hold shared credentials.</p>
      </div>

      {oauthMsg && (
        <div className={`mb-5 flex items-start gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${oauthMsg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {oauthMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{oauthMsg.text}</span>
          <button onClick={() => setOauthMsg(null)} className="ml-auto text-current opacity-60 hover:opacity-100">&times;</button>
        </div>
      )}

      {error && (
        <div className="mb-5 flex items-start gap-2 px-4 py-3 rounded-xl border bg-red-50 border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          <button onClick={reload} className="ml-auto underline text-red-600 font-semibold">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 py-8">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading connections…
        </div>
      ) : (
        <>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Messaging accounts</h3>
          {(['facebook', 'instagram', 'threads', 'reddit'] as const).map((p) => (
            <SocialPlatformCard
              key={p}
              provider={p}
              state={connections[p]}
              onDisconnect={disconnect}
            />
          ))}

          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-8 mb-3">Scraper</h3>
          <ApifyPanel state={connections.apify} onRefresh={reload} />

          {onViewChange && connections.apify.connected && (
            <div className="mt-2">
              <button
                onClick={() => onViewChange('scraper')}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              >
                <Search className="w-4 h-4" /> Go run a scrape
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
