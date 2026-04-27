import { CheckCircle2, FileSignature, FileText, Receipt, Send } from 'lucide-react';
import type { LeadDocument, SavedLead } from '../../types';

interface DocumentsTabProps {
  lead: SavedLead;
  onAddDocument: (lead: SavedLead, type: LeadDocument['type']) => Promise<SavedLead>;
  onSendDocument: (lead: SavedLead, docId: string) => Promise<SavedLead>;
  onLeadUpdate: (lead: SavedLead) => void;
}

export default function DocumentsTab({ lead, onAddDocument, onSendDocument, onLeadUpdate }: DocumentsTabProps) {
  const handle = async (fn: () => Promise<SavedLead>) => onLeadUpdate(await fn());

  return (
    <div>
      <div className="flex justify-between items-center mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <h3 className="font-bold text-slate-800">Smart Documents</h3>
          <p className="text-xs text-slate-500 mt-0.5">Sending documents automatically updates the pipeline stage.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handle(() => onAddDocument(lead, 'contract'))} className="text-sm font-semibold bg-white border border-slate-300 text-slate-700 hover:border-purple-400 hover:text-purple-700 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
            <FileSignature className="w-4 h-4" /> Draft Contract
          </button>
          <button onClick={() => handle(() => onAddDocument(lead, 'invoice'))} className="text-sm font-semibold bg-white border border-slate-300 text-slate-700 hover:border-green-400 hover:text-green-700 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
            <Receipt className="w-4 h-4" /> Draft Invoice
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {!lead.documents || lead.documents.length === 0 ? (
          <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm font-medium">No documents drafted for this lead yet.</p>
          </div>
        ) : (
          lead.documents.map((docItem) => (
            <div key={docItem.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${docItem.type === 'contract' ? 'bg-purple-50 text-purple-600' : 'bg-green-50 text-green-600'}`}>
                  {docItem.type === 'contract' ? <FileSignature className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{docItem.name}</h4>
                  <div className="flex items-center gap-2 text-[10px] mt-0.5">
                    <span className={`font-bold tracking-wider uppercase px-1.5 py-0.5 rounded ${docItem.status === 'draft' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>
                      {docItem.status}
                    </span>
                    {docItem.status === 'sent' && docItem.sentAt && (
                      <span className="text-slate-500">• Sent on {new Date(docItem.sentAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>
              {docItem.status === 'draft' ? (
                <button onClick={() => handle(() => onSendDocument(lead, docItem.id))} className="text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                  <Send className="w-4 h-4" /> Send via Email
                </button>
              ) : (
                <span className="text-sm font-bold text-emerald-600 flex items-center gap-1 px-4 py-2 bg-emerald-50 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" /> Delivered
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
