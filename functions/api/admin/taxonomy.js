import { getTaxo, setTaxo } from '../../../lib/db.js';
import { jsonResponse } from '../../../lib/util.js';

export async function onRequestGet({ env }) {
  return jsonResponse({ taxo: await getTaxo(env.DB) });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'JSON tidak valid' }, 400); }
  const taxo = await setTaxo(env.DB, body && body.taxo);
  return jsonResponse({ ok: true, taxo });
}
