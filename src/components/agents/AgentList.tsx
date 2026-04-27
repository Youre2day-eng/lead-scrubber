import { Bot, ChevronRight, Plus } from 'lucide-react';
import type { Agent } from '../../types';

interface AgentListProps {
  agents: Agent[];
  editingId: string | null;
  onSelect: (agent: Agent) => void;
  onCreate: () => void;
}

export default function AgentList({ agents, editingId, onSelect, onCreate }: AgentListProps) {
  return (
    <div className="w-full lg:w-1/3 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-800">Your Agents</h2>
        <button
          onClick={onCreate}
          className="flex items-center gap-1 text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Agent
        </button>
      </div>

      <div className="space-y-3 overflow-y-auto">
        {agents.length === 0 ? (
          <div className="text-center p-8 border-2 border-dashed border-slate-300 rounded-xl text-slate-500">
            <Bot className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p className="text-sm font-medium">No agents created yet. Build one to automate your pipeline.</p>
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
    </div>
  );
}
