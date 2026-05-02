import { Bot, ChevronRight, Inbox, Plus, RefreshCw, RotateCcw, Send } from 'lucide-react';
import { useState } from 'react';
import { AGENT_TEMPLATES } from '../../constants';
import type { Agent, AgentTemplate } from '../../types';

interface AgentListProps {
  agents: Agent[];
  editingId: string | null;
  onSelect: (agent: Agent) => void;
  onCreate: () => void;
  onUseTemplate: (template: AgentTemplate) => void;
}

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  send: <Send className="w-5 h-5" />,
  inbox: <Inbox className="w-5 h-5" />,
  loop: <RefreshCw className="w-5 h-5" />,
  rewind: <RotateCcw className="w-5 h-5" />,
};

const TEMPLATE_COLORS: string[] = [
  'bg-blue-100 text-blue-600',
  'bg-purple-100 text-purple-600',
  'bg-indigo-100 text-indigo-600',
  'bg-amber-100 text-amber-600',
];

const TRIGGER_LABELS: Record<string, string> = {
  on_lead_saved: 'Trigger: New Lead Saved',
  on_stage_contacted: 'Trigger: Lead Contacted',
  on_no_reply_2_days: 'Trigger: No Reply (2 days)',
  on_reply_received: 'Trigger: Reply Received',
};

export default function AgentList({ agents, editingId, onSelect, onCreate, onUseTemplate }: AgentListProps) {
  const [tab, setTab] = useState<'agents' | 'templates'>('agents');

  return (
    <div className="w-full lg:w-1/3 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-800">Agents</h2>
        {tab === 'agents' && (
          <button
            onClick={onCreate}
            className="flex items-center gap-1 text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Agent
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-xl p-1 mb-4 gap-1">
        <button
          onClick={() => setTab('agents')}
          className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-colors ${tab === 'agents' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          My Agents
        </button>
        <button
          onClick={() => setTab('templates')}
          className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-colors ${tab === 'templates' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Templates
        </button>
      </div>

      {/* My Agents */}
      {tab === 'agents' && (
        <div className="space-y-3 overflow-y-auto">
          {agents.length === 0 ? (
            <div className="text-center p-8 border-2 border-dashed border-slate-300 rounded-xl text-slate-500">
              <Bot className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm font-medium mb-3">No agents yet. Build one from scratch or start from a template.</p>
              <button
                onClick={() => setTab('templates')}
                className="text-sm font-bold text-blue-600 hover:underline"
              >
                Browse templates →
              </button>
            </div>
          ) : (
            agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => onSelect(agent)}
                className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                  editingId === agent.id
                    ? 'bg-blue-50 border-blue-300 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-blue-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${agent.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{agent.name}</h3>
                    <p className="text-xs text-slate-500">{agent.steps.length} Steps • {agent.isActive ? 'Active' : 'Paused'}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            ))
          )}
        </div>
      )}

      {/* Templates */}
      {tab === 'templates' && (
        <div className="space-y-3 overflow-y-auto">
          <p className="text-xs text-slate-500 mb-1">Click a template to clone it and start editing.</p>
          {AGENT_TEMPLATES.map((tpl, i) => (
            <div
              key={tpl.id}
              className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg flex-shrink-0 ${TEMPLATE_COLORS[i % TEMPLATE_COLORS.length]}`}>
                  {TEMPLATE_ICONS[tpl.icon] ?? <Bot className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 text-sm">{tpl.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{tpl.description}</p>
                  <p className="text-xs text-slate-400 mt-1">{TRIGGER_LABELS[tpl.trigger] ?? tpl.trigger} • {tpl.steps.length} steps</p>
                </div>
              </div>
              <button
                onClick={() => { onUseTemplate(tpl); setTab('agents'); }}
                className="mt-3 w-full py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg transition-colors"
              >
                Use This Template
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
