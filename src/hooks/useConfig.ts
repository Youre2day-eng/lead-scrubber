import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, APP_ID } from '../lib/firebase';
import type { Agent, AppConfig, PipelineStage, TargetUrl } from '../types';
import { DEFAULT_PIPELINE_STAGES, DEFAULT_TARGET_URLS } from '../constants';

function configRef(uid: string) {
  return doc(db, 'artifacts', APP_ID, 'users', uid, 'config', 'main');
}

export function useConfig(user: User | null) {
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>(DEFAULT_PIPELINE_STAGES);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [targetUrls, setTargetUrls] = useState<TargetUrl[]>(DEFAULT_TARGET_URLS);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(configRef(user.uid), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as Partial<AppConfig>;
      if (data.pipelineStages) setPipelineStages(data.pipelineStages);
      if (data.agents) setAgents(data.agents);
      if (data.targetUrls) setTargetUrls(data.targetUrls);
    });
  }, [user]);

  const persist = (partial: Partial<AppConfig>, uid: string) =>
    setDoc(configRef(uid), partial, { merge: true });

  const saveStages = (stages: PipelineStage[]) => {
    if (!user) return;
    setPipelineStages(stages);
    persist({ pipelineStages: stages }, user.uid);
  };

  const saveAgents = (updated: Agent[]) => {
    if (!user) return;
    setAgents(updated);
    persist({ agents: updated }, user.uid);
  };

  const saveUrls = (urls: TargetUrl[]) => {
    if (!user) return;
    setTargetUrls(urls);
    persist({ targetUrls: urls }, user.uid);
  };

  return {
    pipelineStages,
    agents,
    targetUrls,
    setPipelineStages,
    saveStages,
    saveAgents,
    saveUrls,
  };
}
