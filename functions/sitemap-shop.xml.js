import { allSlugs } from '../lib/db.js';
import { esc } from '../lib/util.js';

export async function onRequestGet({ env, request }) {
  const site = env.SITE_URL || new URL(request.url).origin;
  const rows = await allSlugs(env.DB);
  const urls = [
    `<url><loc>${esc(site)}/shop/</loc></url>`,
    ...rows.map((r) => `<url><loc>${esc(site)}/shop/detail/${esc(encodeURIComponent(r.slug))}</loc><lastmod>${new Date(r.updated_at).toISOString().slice(0, 10)}</lastmod></url>`)
  ];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } }
  );
}
