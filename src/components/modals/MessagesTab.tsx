import { AlertTriangle, Info, Plus, Send } from 'lucide-react';
import { useState } from 'react';
import { SMART_TEMPLATES } from '../../constants';
import type { SavedLead, SocialConnectionState } from '../../types';

const SOCIAL_PLATFORMS = new Set(['facebook', 'instagram', 'threads', 'reddit']);

interface MessagesTabProps {
  lead: SavedLead;
  niche: string;
  onSend: (lead: SavedLead, text: string) => Promise<SavedLead>;
  onLeadUpdate: (lead: SavedLead) => void;
  /** Connection state for the lead's platform, if it's a social platform. */
  platformConnection?: SocialConnectionState;
}

export default function MessagesTab({ lead, niche, onSend, onLeadUpdate, platformConnection }: MessagesTabProps) {
  const [draft, setDraft] = useState('');
  const [sendErr, setSendErr] = useState<string | null>(null);

  const applyTemplate = (text: string) =>
    setDraft(text.replace('{name}', lead.author).replace('{niche}', niche || 'your services'));

  const isSocialPlatform = SOCIAL_PLATFORMS.has(lead.platform?.toLowerCase());
  const platformConnected = isSocialPlatform ? (platformConnection?.connected && !platformConnection?.expired) : true;

  const platformLabel = lead.platform
    ? lead.platform.charAt(0).toUpperCase() + lead.platform.slice(1)
    : 'the platform';

  const handleSend = async () => {
    if (!draft.trim()) return;
    setSendErr(null);

    const text = draft;

    /** Persists the message locally and advances the UI. */
    const recordLocally = async (errMsg?: string) => {
      const updated = await onSend(lead, text);
      onLeadUpdate(updated);
      setDraft('');
      if (errMsg) setSendErr(errMsg);
    };

    // For social platforms, attempt to send via backend API
    if (isSocialPlatform && platformConnected) {
      try {
        const res = await fetch('/api/messaging/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: lead.platform.toLowerCase(),
            recipientUsername: lead.author,
            text,
          }),
        });
        const body = await res.json() as { ok?: boolean; error?: string; message?: string };
        if (!res.ok) {
          await recordLocally(body.message || body.error || `Could not deliver via ${platformLabel} (${res.status}). Message recorded.`);
          return;
        }
      } catch (err) {
        // Network error — fall through to local-only record
        console.error('[MessagesTab] Failed to reach messaging API:', err);
        await recordLocally(`Could not reach the server. Message recorded locally only.`);
        return;
      }
    }

    await recordLocally();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Connection status banner */}
      {isSocialPlatform && !platformConnected ? (
        <div className="mb-3 flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span className="text-amber-800">
            <strong>{platformLabel} not connected.</strong> Messages will be recorded here but won't be delivered until you{' '}
            <a href="/settings?tab=connections" className="underline font-semibold text-amber-700">connect your {platformLabel} account</a>.
          </span>
        </div>
      ) : (
        <div className="mb-3 flex items-start gap-2 text-xs text-slate-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
          <span>
            {isSocialPlatform
              ? <>Messages will be sent to <strong>{lead.author}</strong> via your connected <strong>{platformLabel}</strong> account and recorded here.</>
              : <>Messages are saved here as a record. To reach <strong>{lead.author}</strong>, copy your message and send it directly on <strong>{platformLabel}</strong>{lead.groupName ? ` (via "${lead.groupName}")` : ''}.</>
            }
          </span>
        </div>
      )}

      <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-4 mb-4 overflow-y-auto space-y-3 min-h-[200px]">
        {!lead.messages || lead.messages.length === 0 ? (
          <div className="text-center text-slate-400 mt-10 text-sm">
            No messages sent yet. Use a smart template below to start!
          </div>
        ) : (
          lead.messages.map((msg) => (
            <div key={msg.id} className="bg-blue-600 text-white p-3 rounded-xl rounded-br-none max-w-[85%] ml-auto shadow-sm">
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              <span className="text-[10px] text-blue-200 mt-1 block">{new Date(msg.date).toLocaleTimeString()}</span>
            </div>
          ))
        )}
      </div>

      {sendErr && (
        <div className="mb-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {sendErr}
        </div>
      )}

      <div>
        <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
          {SMART_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => applyTemplate(tpl.text)}
              className="shrink-0 text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> {tpl.title}
            </button>
          ))}
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type your message to the lead here..."
          className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-24 mb-3 shadow-sm"
        />
        <div className="flex justify-end">
          <button
            onClick={handleSend}
            disabled={!draft.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {isSocialPlatform && platformConnected ? `Send via ${platformLabel}` : 'Record Message'}
          </button>
        </div>
      </div>
    </div>
  );
}
