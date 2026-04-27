import type { PipelineStage, SavedLead } from '../../types';
import LeadKanbanCard from './LeadKanbanCard';

interface KanbanColumnProps {
  column: PipelineStage;
  leads: SavedLead[];
  stages: PipelineStage[];
  onOpenLead: (lead: SavedLead) => void;
  onStageChange: (leadId: string, stage: string) => void;
  onDeleteLead: (leadId: string) => void;
}

export default function KanbanColumn({ column, leads, stages, onOpenLead, onStageChange, onDeleteLead }: KanbanColumnProps) {
  return (
    <div className={`${column.bgColor} border border-slate-200 rounded-2xl flex flex-col overflow-hidden min-w-[320px] w-[320px] shrink-0`}>
      <div className="p-4 border-b border-slate-200/50 bg-white/50 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${column.color}`} />
          <h3 className="font-bold text-slate-700">{column.title}</h3>
        </div>
        <span className="bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
          {leads.length}
        </span>
      </div>

      <div className="flex-1 p-3 overflow-y-auto space-y-3">
        {leads.length === 0 ? (
          <div className="text-center p-6 text-slate-400 text-sm font-medium border-2 border-dashed border-slate-300/50 rounded-xl">
            No leads in this stage.
          </div>
        ) : (
          leads.map((lead) => (
            <LeadKanbanCard
              key={lead.id}
              lead={lead}
              stages={stages}
              onOpen={onOpenLead}
              onStageChange={onStageChange}
              onDelete={onDeleteLead}
            />
          ))
        )}
      </div>
    </div>
  );
}
