import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, APP_ID, isFirebaseEnabled } from '../lib/firebase';
import type { Agent, AppConfig, Goals, IntakeForm, PipelineStage, StageMessage, TargetUrl } from '../types';
import { DEFAULT_PIPELINE_STAGES, DEFAULT_TARGET_URLS } from '../constants';

const DEFAULT_GOALS: Goals = { revenuePerLead: 50, monthlyGoal: 5000, wonStageIds: ['won', 'closed'] };

function localKey(uid: string) {
  return `leadscrubber:artifacts:${APP_ID}:users:${uid}:config:main`;
}

function readLocal(uid: string): Partial<AppConfig> {
  try {
    const raw = localStorage.getItem(localKey(uid));
    return raw ? (JSON.parse(raw) as Partial<AppConfig>) : {};
  } catch { return {}; }
}

function writeLocal(uid: string, partial: Partial<AppConfig>) {
  try {
    const merged = { ...readLocal(uid), ...partial };
    localStorage.setItem(localKey(uid), JSON.stringify(merged));
  } catch {}
}

export function useConfig(user: User | null) {
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>(DEFAULT_PIPELINE_STAGES);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [targetUrls, setTargetUrls] = useState<TargetUrl[]>(DEFAULT_TARGET_URLS);
  const [stageMessages, setStageMessages] = useState<Record<string, StageMessage>>({});
  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS);
  const [forms, setForms] = useState<IntakeForm[]>([]);

  const applySnapshot = (data: Partial<AppConfig>) => {
    if (data.pipelineStages) setPipelineStages(data.pipelineStages);
    if (data.agents) setAgents(data.agents);
    if (data.targetUrls) {
      const legacy = data.targetUrls.some((u: any) => u && u.url && u.url.includes('groups/local-business'));
      if (legacy || data.targetUrls.length === 0) setTargetUrls(DEFAULT_TARGET_URLS);
      else setTargetUrls(data.targetUrls);
    }
    if (data.stageMessages) setStageMessages(data.stageMessages);
    if (data.goals) setGoals({ ...DEFAULT_GOALS, ...data.goals });
    if (data.forms) setForms(data.forms);
  };

  useEffect(() => {
    if (!user) return;
    if (!isFirebaseEnabled || !db) {
      applySnapshot(readLocal(user.uid));
      return;
    }
    const ref = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'config', 'main');
    return onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      applySnapshot(snap.data() as Partial<AppConfig>);
    });
  }, [user]);

  const persist = (partial: Partial<AppConfig>, uid: string) => {
    if (!isFirebaseEnabled || !db) { writeLocal(uid, partial); return; }
    const ref = doc(db, 'artifacts', APP_ID, 'users', uid, 'config', 'main');
    return setDoc(ref, partial, { merge: true });
  };

  const saveStages = (stages: PipelineStage[]) => { if (!user) return; setPipelineStages(stages); persist({ pipelineStages: stages }, user.uid); };
  const saveAgents = (updated: Agent[]) => { if (!user) return; setAgents(updated); persist({ agents: updated }, user.uid); };
  const saveUrls = (urls: TargetUrl[]) => { if (!user) return; setTargetUrls(urls); persist({ targetUrls: urls }, user.uid); };
  const saveStageMessages = (sm: Record<string, StageMessage>) => { if (!user) return; setStageMessages(sm); persist({ stageMessages: sm }, user.uid); };
  const saveGoals = (g: Goals) => { if (!user) return; setGoals(g); persist({ goals: g }, user.uid); };
  const saveForms = (f: IntakeForm[]) => { if (!user) return; setForms(f); persist({ forms: f }, user.uid); };

  return {
    pipelineStages,
    agents,
    targetUrls,
    stageMessages,
    goals,
    forms,
    setPipelineStages,
    saveStages,
    saveAgents,
    saveUrls,
    saveStageMessages,
    saveGoals,
    saveForms,
  };
}
