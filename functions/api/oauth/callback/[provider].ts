// functions/api/oauth/callback/[provider].ts
// Handles the OAuth 2.0 redirect-back from social platforms.
// Validates CSRF state, exchanges the auth code for an access token,
// stores the token in KV, then redirects the user back into the app.
import { userKey } from '../../../lib/auth';
import type { AuthEnv } from '../../../lib/auth';

const SUPPORTED = ['facebook', 'instagram', 'threads', 'reddit'] as const;
type SocialProvider = (typeof SUPPORTED)[number];

interface TokenResult {
  accessToken: string;
  refreshToken?: string | null;
  username?: string | null;
  expiresAt?: string | null;
}

async function exchangeFacebookCode(
  provider: 'facebook' | 'instagram',
  code: string,
  callbackUrl: string,
  env: AuthEnv,
): Promise<TokenResult | { error: string }> {
  const appId = env.FACEBOOK_APP_ID;
  const appSecret = env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) return { error: `${provider}_not_configured` };

  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(callbackUrl)}&client_secret=${encodeURIComponent(appSecret)}&code=${encodeURIComponent(code)}`,
  );
  if (!tokenRes.ok) {
    const errBody = await tokenRes.json().catch(() => null) as any;
    return { error: errBody?.error?.message || `token_exchange_failed_${tokenRes.status}` };
  }
  const raw = await tokenRes.json() as any;
  const accessToken: string = raw.access_token;
  const expiresAt = raw.expires_in ? new Date(Date.now() + raw.expires_in * 1000).toISOString() : null;

  // Fetch display name / ID
  let username: string | null = null;
  const meRes = await fetch(
    `https://graph.facebook.com/v19.0/me?access_token=${encodeURIComponent(accessToken)}&fields=id,name`,
  );
  if (meRes.ok) {
    const me = await meRes.json() as any;
    username = me.name || me.id || null;
  }
  return { accessToken, username, expiresAt };
}

async function exchangeThreadsCode(
  code: string,
  callbackUrl: string,
  env: AuthEnv,
): Promise<TokenResult | { error: string }> {
  const appId = env.FACEBOOK_APP_ID;
  const appSecret = env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) return { error: 'threads_not_configured' };

  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: callbackUrl,
  });
  const tokenRes = await fetch('https://graph.threads.net/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!tokenRes.ok) {
    const errBody = await tokenRes.json().catch(() => null) as any;
    return { error: errBody?.error_message || `token_exchange_failed_${tokenRes.status}` };
  }
  const raw = await tokenRes.json() as any;
  return { accessToken: raw.access_token, expiresAt: null };
}

async function exchangeRedditCode(
  code: string,
  callbackUrl: string,
  env: AuthEnv,
): Promise<TokenResult | { error: string }> {
  const clientId = env.REDDIT_CLIENT_ID;
  const clientSecret = env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return { error: 'reddit_not_configured' };

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const tokenRes = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'LeadScrubber/1.0',
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: callbackUrl }).toString(),
  });
  if (!tokenRes.ok) return { error: `reddit_token_exchange_failed_${tokenRes.status}` };
  const raw = await tokenRes.json() as any;
  if (raw.error) return { error: `reddit_error_${raw.error}` };

  let username: string | null = null;
  const meRes = await fetch('https://oauth.reddit.com/api/v1/me', {
    headers: {
      Authorization: `Bearer ${raw.access_token}`,
      'User-Agent': 'LeadScrubber/1.0',
    },
  });
  if (meRes.ok) {
    const me = await meRes.json() as any;
    username = me.name || null;
  }
  return { accessToken: raw.access_token, refreshToken: raw.refresh_token || null, username };
}

export const onRequestGet: PagesFunction<AuthEnv> = async ({ request, env, params }) => {
  const provider = ((params.provider as string) || '').toLowerCase() as SocialProvider;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  const siteUrl = (env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
  const errorRedirect = (msg: string) =>
    Response.redirect(`${siteUrl}/settings?tab=connections&error=${encodeURIComponent(msg)}`, 302);

  if (!(SUPPORTED as readonly string[]).includes(provider)) return errorRedirect('unsupported_provider');
  if (oauthError) return errorRedirect(`oauth_denied_${oauthError}`);
  if (!code || !state) return errorRedirect('missing_code_or_state');

  // Validate and consume CSRF state
  const stateKey = `oauth:state:${state}`;
  const stateRaw = await env.LEADS.get(stateKey);
  if (!stateRaw) return errorRedirect('invalid_or_expired_state');
  let stateData: { uid: string; provider: string };
  try { stateData = JSON.parse(stateRaw); } catch (err) {
    console.error('[oauth/callback] Failed to parse state data:', err);
    return errorRedirect('corrupt_state');
  }
  if (stateData.provider !== provider) return errorRedirect('provider_mismatch');
  await env.LEADS.delete(stateKey);

  const callbackUrl = `${siteUrl}/api/oauth/callback/${provider}`;

  // Exchange code for token
  let result: TokenResult | { error: string };
  if (provider === 'facebook' || provider === 'instagram') {
    result = await exchangeFacebookCode(provider, code, callbackUrl, env);
  } else if (provider === 'threads') {
    result = await exchangeThreadsCode(code, callbackUrl, env);
  } else {
    result = await exchangeRedditCode(code, callbackUrl, env);
  }

  if ('error' in result) return errorRedirect(result.error);

  const record = {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken ?? null,
    username: result.username ?? null,
    connectedAt: new Date().toISOString(),
    expiresAt: result.expiresAt ?? null,
  };
  await env.LEADS.put(userKey(stateData.uid, `connections:${provider}`), JSON.stringify(record));

  return Response.redirect(`${siteUrl}/settings?tab=connections&connected=${encodeURIComponent(provider)}`, 302);
};
