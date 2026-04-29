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
import { db, APP_ID, isFirebaseEnabled } from '../lib/firebase';
import type { Lead, LeadDocument, LeadMessage, SavedLead, StageMessage } from '../types';

function leadsCol(uid: string) { return collection(db!, 'artifacts', APP_ID, 'users', uid, 'saved_leads'); }
function leadRef(uid: string, leadId: string) { return doc(db!, 'artifacts', APP_ID, 'users', uid, 'saved_leads', leadId); }

function localKey(uid: string) { return `leadscrubber:artifacts:${APP_ID}:users:${uid}:saved_leads`; }
function readLocal(uid: string): SavedLead[] {
  try { const raw = localStorage.getItem(localKey(uid)); return raw ? (JSON.parse(raw) as SavedLead[]) : []; } catch { return []; }
}
function writeLocal(uid: string, leads: SavedLead[]) {
  try { localStorage.setItem(localKey(uid), JSON.stringify(leads)); } catch {}
}

function fillTemplate(template: string, lead: SavedLead): string {
  return template
    .replace(/\{\{author\}\}/g, lead.author || 'there')
    .replace(/\{\{platform\}\}/g, lead.platform || '')
    .replace(/\{\{group\}\}/g, lead.groupName || '')
    .replace(/\{\{stage\}\}/g, lead.stage || '');
}

export function useLeads(user: User | null) {
  const [savedLeads, setSavedLeads] = useState<SavedLead[]>([]);

  useEffect(() => {
    if (!user) return;
    if (!isFirebaseEnabled || !db) {
      const data = readLocal(user.uid);
      data.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      setSavedLeads(data);
      return;
    }
    return onSnapshot(leadsCol(user.uid), (snap) => {
      const data: SavedLead[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as SavedLead));
      data.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      setSavedLeads(data);
    });
  }, [user]);

  const persistLead = async (uid: string, lead: SavedLead) => {
    if (!isFirebaseEnabled || !db) {
      const all = readLocal(uid);
      const idx = all.findIndex((l) => l.id === lead.id);
      if (idx >= 0) all[idx] = lead; else all.push(lead);
      writeLocal(uid, all);
      setSavedLeads([...all].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()));
      return;
    }
    await setDoc(leadRef(uid, lead.id), lead);
  };

  const patchLead = async (uid: string, leadId: string, patch: Partial<SavedLead>) => {
    if (!isFirebaseEnabled || !db) {
      const all = readLocal(uid);
      const idx = all.findIndex((l) => l.id === leadId);
      if (idx < 0) return;
      all[idx] = { ...all[idx], ...patch } as SavedLead;
      writeLocal(uid, all);
      setSavedLeads([...all].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()));
      return all[idx];
    }
    await updateDoc(leadRef(uid, leadId), patch as { [key: string]: unknown });
  };

  const removeLead = async (uid: string, leadId: string) => {
    if (!isFirebaseEnabled || !db) {
      const all = readLocal(uid).filter((l) => l.id !== leadId);
      writeLocal(uid, all);
      setSavedLeads([...all]);
      return;
    }
    await deleteDoc(leadRef(uid, leadId));
  };

  const saveLead = async (lead: Lead) => {
    if (!user) return;
    const saved: SavedLead = { ...lead, stage: 'saved', savedAt: new Date().toISOString() } as SavedLead;
    await persistLead(user.uid, saved);
  };

  const updateStage = async (
    leadId: string,
    stage: string,
    opts?: { stageMessages?: Record<string, StageMessage> }
  ) => {
    if (!user) return;
    const current = savedLeads.find((l) => l.id === leadId);
    const sm = opts?.stageMessages?.[stage];
    if (current && sm && sm.autoSend && sm.template.trim()) {
      const text = fillTemplate(sm.template, { ...current, stage });
      const newMsg: LeadMessage = { id: crypto.randomUUID(), text, date: new Date().toISOString(), type: 'outbound', auto: true };
      const messages = [...(current.messages ?? []), newMsg];
      await patchLead(user.uid, leadId, { stage, messages, lastContacted: new Date().toISOString() } as Partial<SavedLead>);
      return;
    }
    await patchLead(user.uid, leadId, { stage } as Partial<SavedLead>);
  };

  const deleteLead = async (leadId: string) => { if (!user) return; await removeLead(user.uid, leadId); };

  const sendMessage = async (lead: SavedLead, text: string): Promise<SavedLead> => {
    if (!user) throw new Error('Not authenticated');
    const newStage = lead.stage === 'saved' ? 'contacted' : lead.stage;
    const newMsg: LeadMessage = { id: crypto.randomUUID(), text, date: new Date().toISOString(), type: 'outbound' };
    const messages = [...(lead.messages ?? []), newMsg];
    await patchLead(user.uid, lead.id, { stage: newStage, messages, lastContacted: new Date().toISOString() } as Partial<SavedLead>);
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
    await patchLead(user.uid, lead.id, { documents } as Partial<SavedLead>);
    return { ...lead, documents };
  };

  const sendDocument = async (lead: SavedLead, documentId: string): Promise<SavedLead> => {
    if (!user) throw new Error('Not authenticated');
    const target = lead.documents?.find((d) => d.id === documentId);
    if (!target) return lead;
    const documents = (lead.documents ?? []).map((d) =>
      d.id === documentId ? { ...d, status: 'sent' as const, sentAt: new Date().toISOString() } : d,
    );
    let stage = lead.stage;
    if (target.type === 'contract' && (stage === 'saved' || stage === 'contacted')) stage = 'contract_sent';
    if (target.type === 'invoice') stage = 'won';
    await patchLead(user.uid, lead.id, { documents, stage } as Partial<SavedLead>);
    return { ...lead, documents, stage };
  };

  return { savedLeads, saveLead, updateStage, deleteLead, sendMessage, addDocument, sendDocument };
}
