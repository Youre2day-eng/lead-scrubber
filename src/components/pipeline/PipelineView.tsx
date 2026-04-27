import type { PipelineStage, SavedLead } from '../../types';
import KanbanColumn from './KanbanColumn';

interface PipelineViewProps {
  stages: PipelineStage[];
  leads: SavedLead[];
  onOpenLead: (lead: SavedLead) => void;
  onStageChange: (leadId: string, stage: string) => void;
  onDeleteLead: (leadId: string) => void;
}

export default function PipelineView({ stages, leads, onOpenLead, onStageChange, onDeleteLead }: PipelineViewProps) {
  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Lead Pipeline</h2>
        <p className="text-slate-500">Track and manage your saved opportunities.</p>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        {stages.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            leads={leads.filter((l) => l.stage === col.id)}
            stages={stages}
            onOpenLead={onOpenLead}
            onStageChange={onStageChange}
            onDeleteLead={onDeleteLead}
          />
        ))}
      </div>
    </div>
  );
}
