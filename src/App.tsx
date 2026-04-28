import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useConfig } from './hooks/useConfig';
import { useLeads } from './hooks/useLeads';
import type { Lead, SavedLead, UrlType, ViewType } from './types';
import Header from './components/layout/Header';
import ScraperView from './components/scraper/ScraperView';
import PipelineView from './components/pipeline/PipelineView';
import AgentsView from './components/agents/AgentsView';
import SettingsView from './components/settings/SettingsView';
import ConnectionsView from './components/connections/ConnectionsView';
import LeadModal from './components/modals/LeadModal';

export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('scraper');
  const [selectedLead, setSelectedLead] = useState<SavedLead | null>(null);
  const [sessionSavedIds, setSessionSavedIds] = useState<Set<string>>(new Set());
  const [niche, setNiche] = useState('');

  const user = useAuth();
  const { savedLeads, saveLead, updateStage, deleteLead, sendMessage, addDocument, sendDocument } = useLeads(user);
  const { pipelineStages, agents, targetUrls, setPipelineStages, saveStages, saveAgents, saveUrls } = useConfig(user);

  const handleSaveLead = async (lead: Lead) => {
    await saveLead(lead);
    setSessionSavedIds((prev) => new Set([...prev, lead.id]));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
      <Header activeView={activeView} onViewChange={setActiveView} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeView === 'scraper' && (
          <ScraperView
            targetUrls={targetUrls}
            onAddUrl={(url, type: UrlType) => saveUrls([...targetUrls, { id: crypto.randomUUID(), url, type }])}
            onRemoveUrl={(id) => saveUrls(targetUrls.filter((u) => u.id !== id))}
            onSaveLead={handleSaveLead}
            sessionSavedIds={sessionSavedIds}
            onNicheChange={setNiche}
          />
        )}

        {activeView === 'pipeline' && (
          <PipelineView
            stages={pipelineStages}
            leads={savedLeads}
            onOpenLead={setSelectedLead}
            onStageChange={updateStage}
            onDeleteLead={deleteLead}
          />
        )}

        {activeView === 'agents' && (
          <AgentsView
            agents={agents}
            stages={pipelineStages}
            onSaveAgent={(agent) => saveAgents([...agents.filter((a) => a.id !== agent.id), agent])}
            onDeleteAgent={(id) => saveAgents(agents.filter((a) => a.id !== id))}
          />
        )}

        {activeView === 'settings' && (
          <SettingsView
            stages={pipelineStages}
            onChange={setPipelineStages}
            onSave={saveStages}
          />
        )}

        {activeView === 'connections' && (
          <ConnectionsView />
        )}
      </main>

      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          stages={pipelineStages}
          niche={niche}
          onClose={() => setSelectedLead(null)}
          onLeadUpdate={setSelectedLead}
          onSendMessage={sendMessage}
          onAddDocument={addDocument}
          onSendDocument={sendDocument}
        />
      )}
    </div>
  );
}
