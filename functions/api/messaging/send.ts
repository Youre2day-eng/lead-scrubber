// functions/api/messaging/send.ts
// Routes an outbound message through the user's connected social account.
// POST body: { platform: string; recipientUsername: string; text: string }
// The access token is retrieved from KV and the platform API is called on behalf of the user.
import { requireUser, userKey } from '../../lib/auth';
import type { AuthEnv } from '../../lib/auth';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } });

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers: cors });

interface SocialTokenRecord {
  accessToken: string;
  refreshToken?: string | null;
  username?: string | null;
  connectedAt: string;
  expiresAt?: string | null;
}

async function getToken(env: AuthEnv, uid: string, platform: string): Promise<string | null> {
  const raw = await env.LEADS.get(userKey(uid, `connections:${platform}`));
  if (!raw) return null;
  try {
    const rec = JSON.parse(raw) as SocialTokenRecord;
    return rec.accessToken || null;
  } catch (err) {
    console.error(`[messaging/send] Failed to parse token record for platform ${platform}:`, err);
    return null;
  }
}

// ---------- Platform senders ----------

/**
 * Reddit: send a private message to a user.
 * Uses the authenticated user's token to POST to /api/compose.
 */
async function sendRedditMessage(token: string, recipient: string, text: string, subject?: string): Promise<{ ok: true } | { error: string }> {
  // Clean up common Reddit username formats (u/foo, /u/foo)
  const cleanRecipient = recipient.replace(/^\/?(u\/)?/, '');
  const messageSubject = (subject || '').trim() || 'Message via LeadScrubber';
  const res = await fetch('https://oauth.reddit.com/api/compose', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'LeadScrubber/1.0',
    },
    body: new URLSearchParams({
      api_type: 'json',
      to: cleanRecipient,
      subject: messageSubject,
      text,
    }).toString(),
  });
  if (!res.ok) return { error: `reddit_api_error_${res.status}` };
  const body = await res.json() as any;
  if (body?.json?.errors?.length) return { error: body.json.errors[0]?.[1] || 'reddit_compose_error' };
  return { ok: true };
}

/**
 * Facebook Messenger: send a message to a recipient.
 * NOTE: The Facebook Messenger API requires the recipient's PSID (Page-Scoped ID),
 * which is only available after they initiate contact with your Page. This endpoint
 * requires recipientUsername to be a valid Facebook PSID (numeric string).
 * Arbitrary contact by display name is not supported by the Messenger platform API.
 */
async function sendFacebookMessage(token: string, recipientId: string, text: string): Promise<{ ok: true } | { error: string }> {
  const res = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null) as any;
    return { error: body?.error?.message || `facebook_api_error_${res.status}` };
  }
  return { ok: true };
}

/**
 * Instagram: send a message via the Instagram Messaging API.
 * Requires the instagram_manage_messages permission (app review required).
 * recipientUsername should be the Instagram-scoped user ID.
 */
async function sendInstagramMessage(token: string, recipientId: string, text: string): Promise<{ ok: true } | { error: string }> {
  // First get the Instagram Business Account ID
  const accountRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${encodeURIComponent(token)}`);
  if (!accountRes.ok) return { error: `instagram_accounts_error_${accountRes.status}` };
  const accounts = await accountRes.json() as any;
  const igAccountId = accounts?.data?.[0]?.instagram_business_account?.id;
  if (!igAccountId) return { error: 'instagram_no_business_account' };

  const res = await fetch(`https://graph.facebook.com/v19.0/${igAccountId}/messages?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null) as any;
    return { error: body?.error?.message || `instagram_api_error_${res.status}` };
  }
  return { ok: true };
}

export const onRequestPost: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const u = await requireUser(env, request);
  if (u instanceof Response) return u;

  let body: { platform?: string; recipientUsername?: string; text?: string; subject?: string };
  try { body = await request.json(); } catch (err) {
    console.error('[messaging/send] Failed to parse request body:', err);
    return json({ error: 'invalid_json' }, 400);
  }

  const { platform, recipientUsername, text, subject } = body;
  if (!platform || !recipientUsername || !text) return json({ error: 'platform, recipientUsername, and text are required' }, 400);

  const supported = ['facebook', 'instagram', 'threads', 'reddit'];
  if (!supported.includes(platform)) return json({ error: `unsupported_platform_${platform}` }, 400);

  // Threads has no public DM API
  if (platform === 'threads') {
    return json({
      error: 'threads_no_dm_api',
      message: 'Threads does not currently provide a public API for direct messages. Copy your message and send it manually.',
    }, 422);
  }

  const token = await getToken(env, u.uid, platform);
  if (!token) return json({ error: 'not_connected', message: `Connect your ${platform} account in Settings → Connections before sending messages.` }, 403);

  let result: { ok: true } | { error: string };
  if (platform === 'reddit') {
    result = await sendRedditMessage(token, recipientUsername, text, subject);
  } else if (platform === 'facebook') {
    result = await sendFacebookMessage(token, recipientUsername, text);
  } else {
    // instagram
    result = await sendInstagramMessage(token, recipientUsername, text);
  }

  if ('error' in result) return json({ error: result.error }, 502);
  return json({ ok: true });
};
