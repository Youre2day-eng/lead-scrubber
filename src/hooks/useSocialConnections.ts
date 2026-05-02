// src/hooks/useSocialConnections.ts
// Fetches and caches the user's social platform connection status.
// Returns the full connections payload and a reload function.
import { useCallback, useEffect, useState } from 'react';
import type { ConnectionsPayload, SocialPlatform } from '../types';

const EMPTY_SOCIAL = { connected: false } as const;

const DEFAULT_PAYLOAD: ConnectionsPayload = {
  apify: { connected: false },
  facebook: EMPTY_SOCIAL,
  instagram: EMPTY_SOCIAL,
  threads: EMPTY_SOCIAL,
  reddit: EMPTY_SOCIAL,
};

export function useSocialConnections() {
  const [connections, setConnections] = useState<ConnectionsPayload>(DEFAULT_PAYLOAD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/connections');
      if (!r.ok) throw new Error(`Failed to load connections (HTTP ${r.status})`);
      const j = await r.json() as Partial<ConnectionsPayload>;
      setConnections({
        apify: j.apify ?? { connected: false },
        facebook: j.facebook ?? EMPTY_SOCIAL,
        instagram: j.instagram ?? EMPTY_SOCIAL,
        threads: j.threads ?? EMPTY_SOCIAL,
        reddit: j.reddit ?? EMPTY_SOCIAL,
      });
    } catch (e: any) {
      setError(e?.message || 'failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  /** Returns true if the given platform is connected and the token is not expired. */
  const isPlatformConnected = (platform: string): boolean => {
    const key = platform as SocialPlatform;
    const state = connections[key];
    if (!state) return false;
    return state.connected && !state.expired;
  };

  const disconnect = async (provider: string): Promise<void> => {
    await fetch(`/api/connections?provider=${encodeURIComponent(provider)}`, { method: 'DELETE' });
    await reload();
  };

  return { connections, loading, error, reload, isPlatformConnected, disconnect };
}
