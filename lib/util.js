export const CATEGORIES = [
  'Jersey', 'Cleats', 'Gloves', 'Football', 'Helmets', 'Pads & Protective Gear',
  'Training Equipment', 'Bags & Backpacks', 'Apparel', 'Socks', 'Fan Gear & Merch',
  'Accessories', 'Sports & Outdoors', "Men's Fashion", "Women's Fashion",
  'Health & Household', 'Home & Kitchen', 'Electronics', 'Toys & Games'
];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

// Sama persis dengan vbSlug() di toko lama, supaya link yang sudah dibagikan tetap hidup.
export function slugify(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

// Hanya https. data: URI ditolak di server (bikin data membengkak).
export function cleanUrl(u) {
  u = String(u || '').trim();
  if (u.startsWith('//')) u = 'https:' + u;
  u = u.replace(/^http:\/\//i, 'https://');
  return /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : '';
}

export function cleanAff(u) {
  return String(u || '').trim().replace(/\s+/g, '');
}

export function isValidAffLink(u) {
  u = String(u || '');
  if (!/^https:\/\/[^\s"'<>]+$/i.test(u)) return false;
  try {
    const url = new URL(u);
    const h = url.hostname.toLowerCase();
    if (['link.amazon', 'amzn.to', 'a.co', 'amzn.com'].includes(h)) return true;
    if (/(^|\.)amazon\.[a-z.]+$/.test(h) && url.searchParams.get('tag')) return true;
  } catch { /* abaikan */ }
  return false;
}

export function extractAsin(str) {
  const v = String(str || '').trim();
  const m = v.match(/(?:\/dp\/|\/gp\/product\/|\/gp\/aw\/d\/|\/product\/)([A-Za-z0-9]{10})(?:[\/?#&]|$)/i);
  if (m) return m[1].toUpperCase();
  if (/^[A-Za-z0-9]{10}$/.test(v)) return v.toUpperCase();
  return '';
}

// Link tombol SHOP: link afiliasi dipakai apa adanya; kalau kosong pakai ASIN + tag.
export function amazonLink(p, globalTag) {
  if (p.affLink && isValidAffLink(p.affLink)) return p.affLink;
  const tag = (p.tag && p.tag.trim()) || globalTag || '';
  return `https://www.amazon.com/dp/${encodeURIComponent(p.asin)}?tag=${encodeURIComponent(tag)}`;
}

// JSON di dalam <script type="application/ld+json"> harus aman dari "</script>".
export function ldJson(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
