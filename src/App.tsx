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
import LoginView from './components/auth/LoginView';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('scraper');
  const [selectedLead, setSelectedLead] = useState<SavedLead | null>(null);
  const [sessionSavedIds, setSessionSavedIds] = useState<Set<string>>(new Set());
  const [niche, setNiche] = useState('');
  const { user, loading, logout, refresh } = useAuth();
  const { savedLeads, saveLead, updateStage, deleteLead, sendMessage, addDocument, sendDocument } = useLeads(user as any);
  const { pipelineStages, agents, targetUrls, setPipelineStages, saveStages, saveAgents, saveUrls } = useConfig(user as any);

  const handleSaveLead = async (lead: Lead) => {
    await saveLead(lead);
    setSessionSavedIds((prev) => new Set([...prev, lead.id]));
  };

  if (loading) return (<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>);
  if (!user) return <LoginView onAuthed={refresh} />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
      <Header activeView={activeView} onViewChange={setActiveView} />
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeView === 'scraper' && (<ScraperView targetUrls={targetUrls} onAddUrl={(url, type: UrlType) => saveUrls([...targetUrls, { id: crypto.randomUUID(), url, type }])} onRemoveUrl={(id) => saveUrls(targetUrls.filter((u) => u.id !== id))} onSaveLead={handleSaveLead} sessionSavedIds={sessionSavedIds} onNicheChange={setNiche} />)}
        {activeView === 'pipeline' && (<PipelineView stages={pipelineStages} leads={savedLeads} onOpenLead={setSelectedLead} onStageChange={updateStage} onDeleteLead={deleteLead} />)}
        {activeView === 'agents' && (<AgentsView agents={agents} stages={pipelineStages} onSaveAgent={(agent) => saveAgents([...agents.filter((a) => a.id !== agent.id), agent])} onDeleteAgent={(id) => saveAgents(agents.filter((a) => a.id !== id))} />)}
        {activeView === 'settings' && (<SettingsView stages={pipelineStages} onChange={setPipelineStages} onSave={saveStages} />)}
        {activeView === 'connections' && (<ConnectionsView onViewChange={setActiveView} />)}
        <div className="text-right mt-4"><button onClick={logout} className="text-xs text-slate-500 hover:text-slate-700 underline">Sign out ({user.email})</button></div>
      </main>
      {selectedLead && (<LeadModal lead={selectedLead} stages={pipelineStages} niche={niche} onClose={() => setSelectedLead(null)} onLeadUpdate={setSelectedLead} onSendMessage={sendMessage} onAddDocument={addDocument} onSendDocument={sendDocument} />)}
    </div>
  );
}
