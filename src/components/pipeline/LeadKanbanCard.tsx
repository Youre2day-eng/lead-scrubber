import { FileText, Mail } from 'lucide-react';
import type { PipelineStage, SavedLead } from '../../types';
import { platformAbbr } from '../../lib/platform';

interface LeadKanbanCardProps {
  lead: SavedLead;
  stages: PipelineStage[];
  onOpen: (lead: SavedLead) => void;
  onStageChange: (leadId: string, stage: string) => void;
  onDelete: (leadId: string) => void;
}

export default function LeadKanbanCard({ lead, stages, onOpen, onStageChange, onDelete }: LeadKanbanCardProps) {
  return (
    <div
      onClick={() => onOpen(lead)}
      className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm group cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-slate-800 text-sm">{lead.author}</h4>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">
          {platformAbbr(lead.platform)}
        </span>
      </div>

      <p className="text-xs text-slate-600 mb-4 line-clamp-3 leading-relaxed">"{lead.text}"</p>

      <div className="flex flex-wrap gap-2 mb-3">
        {lead.messages && lead.messages.length > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
            <Mail className="w-3 h-3" /> Contacted
          </span>
        )}
        {lead.documents && lead.documents.length > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
            <FileText className="w-3 h-3" /> Docs ({lead.documents.length})
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(lead.id); }}
          className="text-xs text-red-500 hover:text-red-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Remove
        </button>
        <select
          value={lead.stage}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onStageChange(lead.id, e.target.value)}
          className="text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[140px] truncate"
        >
          {stages.map((s) => (
            <option key={s.id} value={s.id}>Move to {s.title}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
