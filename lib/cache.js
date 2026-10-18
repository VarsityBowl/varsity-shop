import { getMeta } from './db.js';

/**
 * Cache di edge Cloudflare. Kunci cache memuat "version" dari tabel settings;
 * setiap simpan/hapus produk menaikkan version, jadi halaman langsung segar tanpa purge manual.
 * `keyParams` = parameter query yang boleh masuk kunci (anti cache-spam).
 * Catatan: caches.default hanya aktif di domain kustom (bukan *.pages.dev) — di sana build() jalan tiap request.
 */
export async function withCache(context, keyParams, build) {
  const { request, env } = context;
  const url = new URL(request.url);
  const meta = await getMeta(env.DB);

  const sp = new URLSearchParams();
  [...keyParams].sort().forEach((k) => { const v = url.searchParams.get(k); if (v) sp.set(k, v); });
  const cacheKey = new Request(`${url.origin}${url.pathname}?${sp.toString()}&_v=${meta.version}`);
  const cache = caches.default;

  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const res = await build(meta);
  if (res.status === 200) {
    res.headers.set('Cache-Control', 'public, max-age=60, s-maxage=86400');
    context.waitUntil(cache.put(cacheKey, res.clone()));
  }
  return res;
}
