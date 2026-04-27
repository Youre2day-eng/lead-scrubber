import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

declare const __firebase_config: string | undefined;
declare const __app_id: string | undefined;

// Build the config from injected globals (Google AI Studio sandbox) or Vite env vars.
const rawConfig =
    typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
      : {
                apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
                authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
                projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
                storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
                appId: import.meta.env.VITE_FIREBASE_APP_ID,
      };

// Firebase is OPTIONAL. When the API key is missing we run in local-only mode
// (synthetic user + localStorage fallbacks in the hooks). This keeps the same
// Firestore-shaped data model so a future HIPAA multi-user build can flip back
// to Firebase by simply setting the env vars.
export const isFirebaseEnabled: boolean = Boolean(rawConfig && rawConfig.apiKey);

export const app: FirebaseApp | null = isFirebaseEnabled ? initializeApp(rawConfig) : null;
export const auth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;

export const APP_ID: string =
    typeof __app_id !== 'undefined' && __app_id ? __app_id : 'default-app-id';
