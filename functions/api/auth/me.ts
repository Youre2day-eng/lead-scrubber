// functions/api/auth/me.ts
import { getUser } from '../../lib/auth';
import type { AuthEnv } from '../../lib/auth';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: cors });

export const onRequestGet: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const u = await getUser(env, request);
  if (!u) {
    return new Response(JSON.stringify({ user: null }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
  return new Response(
    JSON.stringify({ user: { uid: u.uid, email: u.email, tier: u.tier || 'free', createdAt: u.createdAt } }),
    { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
  );
};
