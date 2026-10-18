import { setGlobalTag } from '../../../lib/db.js';
import { jsonResponse } from '../../../lib/util.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'JSON tidak valid' }, 400); }
  const tag = String((body && body.globalTag) || '').trim();
  if (!/^[A-Za-z0-9_-]{3,40}$/.test(tag)) return jsonResponse({ error: 'Tag Amazon tidak valid (contoh: namakamu-20)' }, 400);
  await setGlobalTag(env.DB, tag);
  return jsonResponse({ ok: true, globalTag: tag });
}
