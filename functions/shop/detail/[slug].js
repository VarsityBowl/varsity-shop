import { withCache } from '../../../lib/cache.js';
import { getBySlug, relatedProducts } from '../../../lib/db.js';
import { detailPage, notFoundPage } from '../../../lib/render.js';

const html = (body, status = 200) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const siteUrl = context.env.SITE_URL || url.origin;
  let slug = '';
  try { slug = decodeURIComponent(String(context.params.slug || '')).slice(0, 120); } catch { slug = ''; }

  return withCache(context, [], async (meta) => {
    try {
      const p = slug ? await getBySlug(context.env.DB, slug) : null;
      if (!p) return html(notFoundPage(siteUrl), 404);
      const related = await relatedProducts(context.env.DB, p, 6);
      return html(detailPage({ p, related, siteUrl, globalTag: meta.globalTag }));
    } catch (e) {
      return html('<h1>Temporarily unavailable</h1><p>Please try again in a minute.</p>', 503);
    }
  });
}
