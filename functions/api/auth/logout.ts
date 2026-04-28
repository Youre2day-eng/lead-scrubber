// functions/api/auth/logout.ts
import { clearSessionCookie } from '../../lib/auth';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
};
export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers: cors });
export const onRequestPost: PagesFunction = async () => new Response(JSON.stringify({ ok: true }), {
  status: 200,
  headers: { ...cors, 'Content-Type': 'application/json', 'Set-Cookie': clearSessionCookie() },
});
