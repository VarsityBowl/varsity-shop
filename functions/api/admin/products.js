import { rowToProduct, getMeta, getTaxo, saveProducts, deleteProduct } from '../../../lib/db.js';
import { jsonResponse } from '../../../lib/util.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare('SELECT * FROM products ORDER BY featured DESC, created_at DESC').all();
  const meta = await getMeta(env.DB);
  const taxo = await getTaxo(env.DB);
  return jsonResponse({ products: results.map(rowToProduct), globalTag: meta.globalTag, taxo });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'JSON tidak valid' }, 400); }
  const r = await saveProducts(env.DB, [body]);
  if (r.errors.length) return jsonResponse({ error: r.errors[0].error }, r.errors[0].status || 400);
  return jsonResponse({ ok: true, ...r.saved[0] });
}

export async function onRequestDelete({ request, env }) {
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!id) return jsonResponse({ error: 'id wajib diisi' }, 400);
  const n = await deleteProduct(env.DB, id);
  return jsonResponse({ ok: true, deleted: n });
}
