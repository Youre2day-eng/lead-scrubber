// src/lib/oauthRedirect.ts
// Reads and clears OAuth redirect params (?connected=&error=) from the current URL.
// Returns a flash message to display, or null if no params are present.
export interface OAuthFlashMsg {
  type: 'success' | 'error';
  text: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  threads: 'Threads',
  reddit: 'Reddit',
};

export function consumeOAuthRedirectParams(): OAuthFlashMsg | null {
  const params = new URLSearchParams(window.location.search);
  const connected = params.get('connected');
  const oauthError = params.get('error');

  if (!connected && !oauthError) return null;

  // Strip params without triggering a reload
  window.history.replaceState({}, '', window.location.pathname);

  if (connected) {
    const label = PLATFORM_LABELS[connected] || connected;
    return { type: 'success', text: `${label} connected successfully!` };
  }
  return { type: 'error', text: (oauthError as string).replace(/_/g, ' ') };
}
