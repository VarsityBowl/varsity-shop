import { saveProducts, setGlobalTag } from '../../../lib/db.js';
import { jsonResponse } from '../../../lib/util.js';

// Menerima {products:[...], globalTag?} atau array produk langsung (format EXPORT JSON toko lama).
export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'JSON tidak valid' }, 400); }
  const list = Array.isArray(body) ? body : body && Array.isArray(body.products) ? body.products : null;
  if (!list) return jsonResponse({ error: 'Harus berisi array produk' }, 400);
  if (list.length > 200) return jsonResponse({ error: 'Maksimal 200 produk per impor' }, 400);

  const r = await saveProducts(env.DB, list);
  const tag = !Array.isArray(body) && body.globalTag ? String(body.globalTag).trim() : '';
  if (/^[A-Za-z0-9_-]{3,40}$/.test(tag)) await setGlobalTag(env.DB, tag);
  return jsonResponse({ ok: true, saved: r.saved.length, errors: r.errors });
}
