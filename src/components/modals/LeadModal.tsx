import { FileText, Mail, X } from 'lucide-react';
import { useState } from 'react';
import type { LeadDocument, PipelineStage, SavedLead } from '../../types';
import DocumentsTab from './DocumentsTab';
import MessagesTab from './MessagesTab';

interface LeadModalProps {
  lead: SavedLead;
  stages: PipelineStage[];
  niche: string;
  onClose: () => void;
  onLeadUpdate: (lead: SavedLead) => void;
  onSendMessage: (lead: SavedLead, text: string) => Promise<SavedLead>;
  onAddDocument: (lead: SavedLead, type: LeadDocument['type']) => Promise<SavedLead>;
  onSendDocument: (lead: SavedLead, docId: string) => Promise<SavedLead>;
}

export default function LeadModal({
  lead, stages, niche, onClose, onLeadUpdate, onSendMessage, onAddDocument, onSendDocument,
}: LeadModalProps) {
  const [activeTab, setActiveTab] = useState<'messages' | 'documents'>('messages');
  const stageName = stages.find((s) => s.id === lead.stage)?.title ?? lead.stage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{lead.author}</h2>
            <div className="flex gap-2 text-sm text-slate-500 mt-1">
              <span>Intent Score: <strong className="text-slate-700">{lead.intentScore}</strong></span>
              {' • '}
              <span>Stage: <strong className="text-slate-700">{stageName}</strong></span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          <div className="w-full md:w-1/3 border-r border-slate-200 p-6 bg-slate-50/50 overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Original Post</h3>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-sm text-slate-700 whitespace-pre-wrap leading-relaxed mb-6">
              "{lead.text}"
            </div>

            <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Lead Details</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Platform', value: lead.platform },
                { label: 'Context', value: lead.groupName || 'Direct' },
                { label: 'Saved On', value: new Date(lead.savedAt).toLocaleDateString() },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-semibold text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-white">
            <div className="flex border-b border-slate-200 px-4 pt-2">
              {([
                { id: 'messages' as const, label: 'Contact Lead', Icon: Mail, color: 'border-blue-600 text-blue-700' },
                { id: 'documents' as const, label: 'Contracts & Invoices', Icon: FileText, color: 'border-purple-600 text-purple-700' },
              ]).map(({ id, label, Icon, color }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${activeTab === id ? color : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  <div className="flex items-center gap-2"><Icon className="w-4 h-4" /> {label}</div>
                </button>
              ))}
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === 'messages' ? (
                <MessagesTab lead={lead} niche={niche} onSend={onSendMessage} onLeadUpdate={onLeadUpdate} />
              ) : (
                <DocumentsTab lead={lead} onAddDocument={onAddDocument} onSendDocument={onSendDocument} onLeadUpdate={onLeadUpdate} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
