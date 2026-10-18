import { withCache } from '../../lib/cache.js';
import { listProducts, listCategories, getMeta } from '../../lib/db.js';
import { shopPage, PAGE_SIZE } from '../../lib/render.js';

const html = (body, status = 200) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const q = (url.searchParams.get('q') || '').trim().slice(0, 60);
  const category = (url.searchParams.get('category') || '').trim().slice(0, 40);
  const sortRaw = url.searchParams.get('sort') || 'featured';
  const sort = ['featured', 'rating', 'name'].includes(sortRaw) ? sortRaw : 'featured';
  const page = Math.min(500, Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1));
  const siteUrl = context.env.SITE_URL || url.origin;

  const build = async (meta) => {
    try {
      const [{ items, total }, categories] = await Promise.all([
        listProducts(context.env.DB, { category, q, sort, page, pageSize: PAGE_SIZE }),
        listCategories(context.env.DB)
      ]);
      return html(shopPage({ items, total, page, category, q, sort, categories, siteUrl, globalTag: meta ? meta.globalTag : '' }));
    } catch (e) {
      return html('<h1>Temporarily unavailable</h1><p>Please try again in a minute.</p>', 503);
    }
  };

  // Pencarian bebas tidak di-cache (kunci cache tak terbatas); daftar/kategori/halaman di-cache.
  if (q) return build(await getMeta(context.env.DB));
  return withCache(context, ['category', 'sort', 'page'], build);
}
