// functions/api/auth/forgot-password.ts
// POST /api/auth/forgot-password  Body: { email }
// Generates a time-limited reset token, stores it in KV, and sends a reset link via Resend.
// Always returns { ok: true } to prevent email enumeration.
import { normEmail, genUid } from '../../lib/auth';
import type { AuthEnv } from '../../lib/auth';

const RESET_TTL_SEC = 3600; // 1 hour

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
};

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers: cors });

export const onRequestPost: PagesFunction<AuthEnv> = async ({ request, env }) => {
  let body: { email?: string };
  try { body = await request.json(); } catch { return j({ error: 'invalid json' }, 400); }
  const email = normEmail(body.email || '');
  if (!email || !email.includes('@')) return j({ error: 'valid email required' }, 400);

  // Always return ok to prevent email enumeration
  const uid = await env.LEADS.get('user:byemail:' + email);
  if (!uid) return j({ ok: true });

  // Generate a secure reset token (24 random bytes base64url-encoded)
  const token = genUid() + genUid();
  const exp = Math.floor(Date.now() / 1000) + RESET_TTL_SEC;
  await env.LEADS.put('reset:token:' + token, JSON.stringify({ uid, email, exp }), { expirationTtl: RESET_TTL_SEC });

  const siteUrl = (env.SITE_URL || new URL(request.url).origin).replace(/\/$/, '');
  const resetLink = `${siteUrl}/?reset_token=${token}`;

  if (env.RESEND_API_KEY) {
    const from = env.RESEND_FROM_EMAIL || 'LeadScrubber <noreply@leadscrubber.app>';
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: 'Reset your LeadScrubber password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2>Password Reset</h2>
            <p>We received a request to reset your LeadScrubber password.</p>
            <p>Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
            <p>
              <a href="${resetLink}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">
                Reset Password
              </a>
            </p>
            <p style="color:#888;font-size:13px">If you did not request this, you can safely ignore this email.</p>
          </div>
        `,
      }),
    });
  }

  return j({ ok: true });
};

function j(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
