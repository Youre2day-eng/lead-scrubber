import { useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    signInAnonymously,
    signInWithCustomToken,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, isFirebaseEnabled } from '../lib/firebase';

declare const __initial_auth_token: string | undefined;

// When Firebase is disabled (no env vars) we return a synthetic local user.
// The rest of the app only reads user.uid, so this is structurally compatible.
const LOCAL_USER = { uid: 'local-user' } as unknown as User;

export function useAuth() {
    const [user, setUser] = useState<User | null>(
          isFirebaseEnabled ? null : LOCAL_USER,
        );

  useEffect(() => {
        if (!isFirebaseEnabled || !auth) return;

                const init = async () => {
        try {
                  if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                              await signInWithCustomToken(auth, __initial_auth_token);
                  } else {
                              await signInAnonymously(auth);
                  }
        } catch (err) {
                  console.error('Auth error:', err);
        }
                };
        init();
        return onAuthStateChanged(auth, setUser);
  }, []);

  return user;
}
