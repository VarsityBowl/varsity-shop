import { requireAccess } from '../../lib/auth.js';

// Melindungi halaman dashboard (/admin/*). Lapisan kedua setelah Cloudflare Access di edge.
export async function onRequest(context) {
  const denied = await requireAccess(context);
  if (denied) return denied;
  const res = await context.next();
  const out = new Response(res.body, res);
  out.headers.set('Cache-Control', 'no-store');
  out.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return out;
}
