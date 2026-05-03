import { Bookmark, Check, MessageCircle, Users } from 'lucide-react';
import type { Lead } from '../../types';
import { platformLabel } from '../../lib/platform';

interface LeadCardProps {
  lead: Lead;
  isSaved: boolean;
  onSave: (lead: Lead) => void;
}

export default function LeadCard({ lead, isSaved, onSave }: LeadCardProps) {
  const isFacebook = (lead.platform || '').toLowerCase().includes('facebook');
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      {lead.urgency === 'High' && (
        <div className="absolute top-4 right-[-30px] bg-red-500 text-white text-[10px] font-bold py-1 px-8 transform rotate-45">
          HOT
        </div>
      )}

      <div className="flex items-start justify-between mb-3 pr-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-600">
            {lead.author.charAt(0)}
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{lead.author}</h3>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1">
                {isFacebook ? (
                  <Users className="w-3 h-3" />
                ) : (
                  <MessageCircle className="w-3 h-3" />
                )}
                {isFacebook ? (lead.groupName || platformLabel(lead.platform)) : platformLabel(lead.platform)}
              </span>
              <span>• {lead.timeAgo}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-100">
        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">"{lead.text}"</p>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
        <div className="flex items-center gap-2">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Intent</div>
          <div className="flex items-center gap-1">
            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  lead.intentScore > 85
                    ? 'bg-green-500'
                    : lead.intentScore > 70
                      ? 'bg-yellow-500'
                      : 'bg-slate-400'
                }`}
                style={{ width: `${lead.intentScore}%` }}
              />
            </div>
            <span className="text-sm font-bold text-slate-700">{lead.intentScore}</span>
          </div>
        </div>

        <button
          onClick={() => onSave(lead)}
          disabled={isSaved}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            isSaved ? 'bg-green-50 text-green-700' : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
          }`}
        >
          {isSaved ? (
            <><Check className="w-4 h-4" /> Saved</>
          ) : (
            <><Bookmark className="w-4 h-4" /> Save to Pipeline</>
          )}
        </button>
      </div>
    </div>
  );
}
