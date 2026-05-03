import { useState } from 'react';
import type { Agent, AgentTemplate, PipelineStage } from '../../types';
import AgentEditor from './AgentEditor';
import AgentList from './AgentList';

interface AgentsViewProps {
  agents: Agent[];
  stages: PipelineStage[];
  onSaveAgent: (agent: Agent) => void;
  onDeleteAgent: (id: string) => void;
}

export default function AgentsView({ agents, stages, onSaveAgent, onDeleteAgent }: AgentsViewProps) {
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  const createEmpty = () => setEditingAgent({
    id: crypto.randomUUID(),
    name: 'New Auto-Agent',
    trigger: 'on_lead_saved',
    isActive: false,
    steps: [{ id: crypto.randomUUID(), type: 'send_message', templateId: '1' }],
  });

  const cloneTemplate = (template: AgentTemplate) => {
    // Deep-clone and assign new ids so edited copies don't clash with templates
    const reId = (steps: AgentTemplate['steps']): Agent['steps'] =>
      steps.map((s) => ({
        ...s,
        id: crypto.randomUUID(),
        replyBranch: s.replyBranch ? reId(s.replyBranch) : undefined,
        timeoutBranch: s.timeoutBranch ? reId(s.timeoutBranch) : undefined,
        thenBranch: s.thenBranch ? reId(s.thenBranch) : undefined,
        elseBranch: s.elseBranch ? reId(s.elseBranch) : undefined,
        loopBodySteps: s.loopBodySteps ? reId(s.loopBodySteps) : undefined,
      }));

    setEditingAgent({
      id: crypto.randomUUID(),
      name: template.name,
      trigger: template.trigger,
      isActive: false,
      steps: reId(template.steps),
    });
  };

  const handleSave = (agent: Agent) => {
    onSaveAgent(agent);
    setEditingAgent(null);
  };

  const handleDelete = (id: string) => {
    onDeleteAgent(id);
    if (editingAgent?.id === id) setEditingAgent(null);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-8">
      <AgentList
        agents={agents}
        editingId={editingAgent?.id ?? null}
        onSelect={(a) => setEditingAgent({ ...a })}
        onCreate={createEmpty}
        onUseTemplate={cloneTemplate}
      />
      {editingAgent && (
        <AgentEditor
          agent={editingAgent}
          stages={stages}
          onChange={setEditingAgent}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
