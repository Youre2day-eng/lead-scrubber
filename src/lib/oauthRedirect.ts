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

function formatOAuthError(raw: string): string {
  // Convert underscore-separated codes to a readable sentence.
  // e.g. "oauth_denied_user_cancelled" → "OAuth denied: user cancelled"
  const parts = raw.split('_');
  if (parts.length >= 2 && parts[0] === 'oauth' && parts[1] === 'denied') {
    const reason = parts.slice(2).join(' ');
    return reason ? `OAuth denied: ${reason}` : 'OAuth denied';
  }
  return parts.join(' ');
}

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
  return { type: 'error', text: formatOAuthError(oauthError as string) };
}
