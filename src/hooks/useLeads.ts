import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, APP_ID } from '../lib/firebase';
import type { Lead, LeadDocument, SavedLead } from '../types';

function leadsCol(uid: string) {
  return collection(db, 'artifacts', APP_ID, 'users', uid, 'saved_leads');
}

function leadRef(uid: string, leadId: string) {
  return doc(db, 'artifacts', APP_ID, 'users', uid, 'saved_leads', leadId);
}

export function useLeads(user: User | null) {
  const [savedLeads, setSavedLeads] = useState<SavedLead[]>([]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(leadsCol(user.uid), (snap) => {
      const data: SavedLead[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as SavedLead));
      data.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      setSavedLeads(data);
    });
  }, [user]);

  const saveLead = async (lead: Lead) => {
    if (!user) return;
    await setDoc(leadRef(user.uid, lead.id), {
      ...lead,
      stage: 'saved',
      savedAt: new Date().toISOString(),
    });
  };

  const updateStage = async (leadId: string, stage: string) => {
    if (!user) return;
    await updateDoc(leadRef(user.uid, leadId), { stage });
  };

  const deleteLead = async (leadId: string) => {
    if (!user) return;
    await deleteDoc(leadRef(user.uid, leadId));
  };

  const sendMessage = async (lead: SavedLead, text: string): Promise<SavedLead> => {
    if (!user) throw new Error('Not authenticated');
    const newStage = lead.stage === 'saved' ? 'contacted' : lead.stage;
    const newMsg = {
      id: crypto.randomUUID(),
      text,
      date: new Date().toISOString(),
      type: 'outbound' as const,
    };
    const messages = [...(lead.messages ?? []), newMsg];
    await updateDoc(leadRef(user.uid, lead.id), {
      stage: newStage,
      messages,
      lastContacted: new Date().toISOString(),
    });
    return { ...lead, stage: newStage, messages };
  };

  const addDocument = async (lead: SavedLead, docType: LeadDocument['type']): Promise<SavedLead> => {
    if (!user) throw new Error('Not authenticated');
    const newDoc: LeadDocument = {
      id: crypto.randomUUID(),
      type: docType,
      name: `${docType === 'contract' ? 'Service Agreement' : 'Invoice'} - ${lead.author}`,
      status: 'draft',
      date: new Date().toISOString(),
    };
    const documents = [...(lead.documents ?? []), newDoc];
    await updateDoc(leadRef(user.uid, lead.id), { documents });
    return { ...lead, documents };
  };

  const sendDocument = async (lead: SavedLead, documentId: string): Promise<SavedLead> => {
    if (!user) throw new Error('Not authenticated');
    const target = lead.documents?.find((d) => d.id === documentId);
    if (!target) return lead;

    const documents = (lead.documents ?? []).map((d) =>
      d.id === documentId
        ? { ...d, status: 'sent' as const, sentAt: new Date().toISOString() }
        : d,
    );

    let stage = lead.stage;
    if (target.type === 'contract' && (stage === 'saved' || stage === 'contacted'))
      stage = 'contract_sent';
    if (target.type === 'invoice') stage = 'won';

    await updateDoc(leadRef(user.uid, lead.id), { documents, stage });
    return { ...lead, documents, stage };
  };

  return { savedLeads, saveLead, updateStage, deleteLead, sendMessage, addDocument, sendDocument };
}
