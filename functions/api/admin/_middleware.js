import { requireAccess, sameOriginOk } from '../../../lib/auth.js';

export async function onRequest(context) {
  const denied = await requireAccess(context);
  if (denied) return denied;

  const { request } = context;
  const method = request.method;
  if (method !== 'GET' && method !== 'HEAD') {
    if (!sameOriginOk(request)) return new Response('Forbidden', { status: 403 });
    const ct = request.headers.get('content-type') || '';
    if (method === 'POST' && !ct.includes('application/json')) return new Response('Unsupported Media Type', { status: 415 });
  }

  const res = await context.next();
  const out = new Response(res.body, res);
  out.headers.set('Cache-Control', 'no-store');
  return out;
}
