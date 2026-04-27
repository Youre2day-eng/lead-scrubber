import { Plus, Send } from 'lucide-react';
import { useState } from 'react';
import { SMART_TEMPLATES } from '../../constants';
import type { SavedLead } from '../../types';

interface MessagesTabProps {
  lead: SavedLead;
  niche: string;
  onSend: (lead: SavedLead, text: string) => Promise<SavedLead>;
  onLeadUpdate: (lead: SavedLead) => void;
}

export default function MessagesTab({ lead, niche, onSend, onLeadUpdate }: MessagesTabProps) {
  const [draft, setDraft] = useState('');

  const applyTemplate = (text: string) =>
    setDraft(text.replace('{name}', lead.author).replace('{niche}', niche || 'your services'));

  const handleSend = async () => {
    if (!draft.trim()) return;
    const updated = await onSend(lead, draft);
    onLeadUpdate(updated);
    setDraft('');
  };

  return (
    <div className="flex flex-col h-full">
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
            <Send className="w-4 h-4" /> Send Message
          </button>
        </div>
      </div>
    </div>
  );
}
