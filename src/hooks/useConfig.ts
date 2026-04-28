import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, APP_ID, isFirebaseEnabled } from '../lib/firebase';
import type { Agent, AppConfig, PipelineStage, TargetUrl } from '../types';
import { DEFAULT_PIPELINE_STAGES, DEFAULT_TARGET_URLS } from '../constants';

// localStorage key mirrors the Firestore path so the data shape is identical:
// artifacts/{APP_ID}/users/{uid}/config/main
function localKey(uid: string) {
    return `leadscrubber:artifacts:${APP_ID}:users:${uid}:config:main`;
}

function readLocal(uid: string): Partial<AppConfig> {
    try {
          const raw = localStorage.getItem(localKey(uid));
          return raw ? (JSON.parse(raw) as Partial<AppConfig>) : {};
    } catch {
          return {};
    }
}

function writeLocal(uid: string, partial: Partial<AppConfig>) {
    try {
          const merged = { ...readLocal(uid), ...partial };
          localStorage.setItem(localKey(uid), JSON.stringify(merged));
    } catch {
          // ignore quota / unavailable
    }
}

export function useConfig(user: User | null) {
    const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>(DEFAULT_PIPELINE_STAGES);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [targetUrls, setTargetUrls] = useState<TargetUrl[]>(DEFAULT_TARGET_URLS);

  useEffect(() => {
        if (!user) return;

                if (!isFirebaseEnabled || !db) {
                        const data = readLocal(user.uid);
                        if (data.pipelineStages) setPipelineStages(data.pipelineStages);
                        if (data.agents) setAgents(data.agents);
                        if (data.targetUrls) {
      const legacy = data.targetUrls.some((u: any) => u && u.url && u.url.includes('groups/local-business'));
      if (legacy || data.targetUrls.length === 0) {
        setTargetUrls(DEFAULT_TARGET_URLS);
      } else {
        setTargetUrls(data.targetUrls);
      }
    }
                        return;
                }

                const ref = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'config', 'main');
        return onSnapshot(ref, (snap) => {
                if (!snap.exists()) return;
                const data = snap.data() as Partial<AppConfig>;
                if (data.pipelineStages) setPipelineStages(data.pipelineStages);
                if (data.agents) setAgents(data.agents);
                if (data.targetUrls) {
      const legacy = data.targetUrls.some((u: any) => u && u.url && u.url.includes('groups/local-business'));
      if (legacy || data.targetUrls.length === 0) {
        setTargetUrls(DEFAULT_TARGET_URLS);
      } else {
        setTargetUrls(data.targetUrls);
      }
    }
        });
  }, [user]);

  const persist = (partial: Partial<AppConfig>, uid: string) => {
        if (!isFirebaseEnabled || !db) {
                writeLocal(uid, partial);
                return;
        }
        const ref = doc(db, 'artifacts', APP_ID, 'users', uid, 'config', 'main');
        return setDoc(ref, partial, { merge: true });
  };

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
