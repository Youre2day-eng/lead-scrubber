// functions/api/oauth/start/[provider].ts
// Initiates OAuth 2.0 flow for social platforms.
// Requires the user to be authenticated (cookie session).
// Generates a CSRF state token, stores it in KV (10-min TTL), then redirects to the platform.
import { requireUser } from '../../../lib/auth';
import type { AuthEnv } from '../../../lib/auth';

const SUPPORTED = ['facebook', 'instagram', 'threads', 'reddit'] as const;
type SocialProvider = (typeof SUPPORTED)[number];

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buildAuthUrl(provider: SocialProvider, env: AuthEnv, callbackUrl: string, state: string): string | null {
  if (provider === 'facebook') {
    if (!env.FACEBOOK_APP_ID) return null;
    const scope = 'pages_messaging,pages_show_list';
    return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${encodeURIComponent(env.FACEBOOK_APP_ID)}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}&response_type=code`;
  }
  if (provider === 'instagram') {
    if (!env.FACEBOOK_APP_ID) return null;
    const scope = 'instagram_basic,instagram_manage_messages';
    return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${encodeURIComponent(env.FACEBOOK_APP_ID)}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}&response_type=code`;
  }
  if (provider === 'threads') {
    if (!env.FACEBOOK_APP_ID) return null;
    const scope = 'threads_basic,threads_manage_replies';
    return `https://threads.net/oauth/authorize?client_id=${encodeURIComponent(env.FACEBOOK_APP_ID)}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}&response_type=code`;
  }
  if (provider === 'reddit') {
    if (!env.REDDIT_CLIENT_ID) return null;
    const scope = 'privatemessages identity';
    return `https://www.reddit.com/api/v1/authorize?client_id=${encodeURIComponent(env.REDDIT_CLIENT_ID)}&response_type=code&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(callbackUrl)}&duration=permanent&scope=${encodeURIComponent(scope)}`;
  }
  return null;
}

export const onRequestGet: PagesFunction<AuthEnv> = async ({ request, env, params }) => {
  const provider = ((params.provider as string) || '').toLowerCase() as SocialProvider;
  if (!(SUPPORTED as readonly string[]).includes(provider)) {
    return new Response(JSON.stringify({ error: 'unsupported provider' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const u = await requireUser(env, request);
  if (u instanceof Response) return u;

  const siteUrl = (env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
  const callbackUrl = `${siteUrl}/api/oauth/callback/${provider}`;

  // Generate CSRF state and store in KV with 10-min TTL
  const state = b64url(crypto.getRandomValues(new Uint8Array(24)));
  await env.LEADS.put(
    `oauth:state:${state}`,
    JSON.stringify({ uid: u.uid, provider }),
    { expirationTtl: 600 },
  );

  const authUrl = buildAuthUrl(provider, env, callbackUrl, state);
  if (!authUrl) {
    // Credentials not configured — redirect back with error
    return Response.redirect(
      `${siteUrl}/settings?tab=connections&error=${encodeURIComponent(`${provider}_not_configured`)}`,
      302,
    );
  }

  return Response.redirect(authUrl, 302);
};
