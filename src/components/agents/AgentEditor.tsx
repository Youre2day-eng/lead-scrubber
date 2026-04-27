import { Activity, CheckCircle2, Clock, PlusCircle, Trash2, X } from 'lucide-react';
import { SMART_TEMPLATES } from '../../constants';
import type { Agent, AgentStep, AgentStepType, AgentTrigger, PipelineStage } from '../../types';

function StepRow({
  step, index, stages, onChange, onRemove,
}: {
  step: AgentStep;
  index: number;
  stages: PipelineStage[];
  onChange: (step: AgentStep) => void;
  onRemove: () => void;
}) {
  return (
    <div className="relative bg-white p-5 border border-slate-200 rounded-xl shadow-sm group">
      <div className="absolute -left-3 -top-3 w-6 h-6 bg-blue-100 text-blue-700 font-bold text-xs rounded-full flex items-center justify-center border border-blue-200 shadow-sm">
        {index + 1}
      </div>
      <button onClick={onRemove} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col gap-3">
        <select
          value={step.type}
          onChange={(e) => onChange({ ...step, type: e.target.value as AgentStepType })}
          className="w-fit bg-blue-50 border border-blue-100 text-blue-700 rounded-lg px-3 py-1.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="send_message">Send Message Template</option>
          <option value="send_document">Send Form/Invoice/Contract</option>
          <option value="move_stage">Change Pipeline Stage</option>
          <option value="wait">Wait for / Await Reply</option>
        </select>

        {step.type === 'send_message' && (
          <select value={step.templateId ?? '1'} onChange={(e) => onChange({ ...step, templateId: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm outline-none">
            {SMART_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        )}
        {step.type === 'send_document' && (
          <select value={step.docType ?? 'intake'} onChange={(e) => onChange({ ...step, docType: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm outline-none">
            <option value="intake">Client Intake Form</option>
            <option value="contract">Standard Service Contract</option>
            <option value="invoice">Initial Deposit Invoice</option>
          </select>
        )}
        {step.type === 'move_stage' && (
          <select value={step.stageId ?? stages[0]?.id} onChange={(e) => onChange({ ...step, stageId: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm outline-none">
            {stages.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        )}
        {step.type === 'wait' && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">Wait</span>
            <input type="number" min="1" defaultValue={step.waitDays ?? 2} onChange={(e) => onChange({ ...step, waitDays: Number(e.target.value) })} className="w-16 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm outline-none text-center" />
            <span className="text-sm font-medium text-slate-700">Days, or until reply received.</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface AgentEditorProps {
  agent: Agent;
  stages: PipelineStage[];
  onChange: (agent: Agent) => void;
  onSave: (agent: Agent) => void;
  onDelete: (id: string) => void;
}

export default function AgentEditor({ agent, stages, onChange, onSave, onDelete }: AgentEditorProps) {
  const updateStep = (idx: number, updated: AgentStep) => {
    const steps = [...agent.steps];
    steps[idx] = updated;
    onChange({ ...agent, steps });
  };

  return (
    <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
      <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <input
          type="text"
          value={agent.name}
          onChange={(e) => onChange({ ...agent, name: e.target.value })}
          className="font-bold text-lg bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 w-1/2"
        />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-bold">
            <span className={agent.isActive ? 'text-emerald-600' : 'text-slate-400'}>
              {agent.isActive ? 'Agent Active' : 'Agent Paused'}
            </span>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${agent.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <input type="checkbox" className="sr-only" checked={agent.isActive} onChange={(e) => onChange({ ...agent, isActive: e.target.checked })} />
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${agent.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </label>
          <button onClick={() => onDelete(agent.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-500" /> Trigger Condition
            </h4>
            <select
              value={agent.trigger}
              onChange={(e) => onChange({ ...agent, trigger: e.target.value as AgentTrigger })}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="on_lead_saved">When a new Lead is Saved to Pipeline</option>
              <option value="on_stage_contacted">When Lead enters stage: Contacted</option>
              <option value="on_no_reply_2_days">When no reply received for 2 days</option>
            </select>
          </div>

          <div className="w-px h-6 bg-slate-300 mx-auto" />

          <div className="space-y-4">
            {agent.steps.map((step, idx) => (
              <StepRow
                key={step.id}
                step={step}
                index={idx}
                stages={stages}
                onChange={(s) => updateStep(idx, s)}
                onRemove={() => onChange({ ...agent, steps: agent.steps.filter((_, i) => i !== idx) })}
              />
            ))}
            <div className="w-px h-6 bg-slate-300 mx-auto" />
            <button
              onClick={() => onChange({ ...agent, steps: [...agent.steps, { id: crypto.randomUUID(), type: 'send_message', templateId: '1' }] })}
              className="w-full py-4 border-2 border-dashed border-blue-200 rounded-xl text-blue-600 font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-5 h-5" /> Add Next Action Step
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-200 bg-white flex justify-end">
        <button onClick={() => onSave(agent)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Save Agent Pipeline
        </button>
      </div>
    </div>
  );
}
