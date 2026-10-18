import { slugify, cleanUrl, cleanAff, isValidAffLink, extractAsin } from './util.js';

const parse = (s, fb) => {
  try { const v = JSON.parse(s); return v ?? fb; } catch { return fb; }
};

export function rowToProduct(r) {
  return {
    id: r.id,
    slug: r.slug,
    brand: r.brand,
    name: r.name,
    sub: r.sub || '',
    category: r.category,
    subCategory: r.sub_category || '',
    asin: r.asin || '',
    tag: r.tag || '',
    affLink: r.aff_link || '',
    price: r.price || '',
    rating: r.rating ?? 4.5,
    reviews: r.reviews ?? 0,
    prime: !!r.prime,
    featured: !!r.featured,
    bestSeller: !!r.best_seller,
    images: parse(r.images, []),
    colors: parse(r.colors, []),
    sizes: parse(r.sizes, []),
    desc: r.description || '',
    details: parse(r.details, []),
    specs: parse(r.specs, []),
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

/* ---------- settings ---------- */

export async function getMeta(db) {
  const { results } = await db.prepare("SELECT key, value FROM settings WHERE key IN ('version','global_tag')").all();
  const m = Object.fromEntries(results.map((r) => [r.key, r.value]));
  return { version: m.version || '1', globalTag: m.global_tag || '' };
}

export const bumpVersionStmt = (db) =>
  db.prepare("UPDATE settings SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) WHERE key = 'version'");

export async function setGlobalTag(db, tag) {
  await db.batch([
    db.prepare("INSERT INTO settings (key, value) VALUES ('global_tag', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(tag),
    bumpVersionStmt(db)
  ]);
}

/* ---------- kategori & sub kategori buatan admin (disimpan permanen di settings.taxo) ---------- */

const cleanName = (s) => String(s ?? '').replace(/[<>"]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);

export function sanitizeTaxo(t) {
  const out = { customCats: [], subCats: {} };
  if (!t || typeof t !== 'object') return out;
  const seen = new Set();
  for (const c of Array.isArray(t.customCats) ? t.customCats : []) {
    const n = cleanName(c);
    if (n && !seen.has(n.toLowerCase())) { seen.add(n.toLowerCase()); out.customCats.push(n); }
  }
  for (const k of Object.keys(t.subCats && typeof t.subCats === 'object' ? t.subCats : {}).slice(0, 200)) {
    const key = cleanName(k);
    if (!key || !Array.isArray(t.subCats[k])) continue;
    const subs = [], s2 = new Set();
    for (const x of t.subCats[k].slice(0, 200)) {
      const n = cleanName(x);
      if (n && !s2.has(n.toLowerCase())) { s2.add(n.toLowerCase()); subs.push(n); }
    }
    if (subs.length) out.subCats[key] = subs;
  }
  return out;
}

export async function getTaxo(db) {
  const row = await db.prepare("SELECT value FROM settings WHERE key = 'taxo'").first();
  try { return sanitizeTaxo(JSON.parse(row && row.value)); } catch { return sanitizeTaxo(null); }
}

export async function setTaxo(db, t) {
  const clean = sanitizeTaxo(t);
  await db.prepare("INSERT INTO settings (key, value) VALUES ('taxo', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(JSON.stringify(clean)).run();
  return clean;
}

/* ---------- baca produk ---------- */

const LIST_COLS = 'id, slug, brand, name, category, asin, tag, aff_link, price, rating, reviews, prime, featured, best_seller, images, colors';
const ORDER = {
  featured: 'featured DESC, best_seller DESC, created_at DESC',
  rating: 'rating DESC, reviews DESC',
  name: 'name COLLATE NOCASE ASC'
};

export async function listProducts(db, { category = '', subCategory = '', q = '', sort = 'featured', page = 1, pageSize = 24 } = {}) {
  const where = [];
  const args = [];
  if (category) { where.push('category = ?'); args.push(category); }
  if (category && subCategory) { where.push('sub_category = ?'); args.push(subCategory); }
  if (q) {
    const like = '%' + q.replace(/[\\%_]/g, (m) => '\\' + m) + '%';
    where.push("(name LIKE ? ESCAPE '\\' OR brand LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\' OR asin LIKE ? ESCAPE '\\')");
    args.push(like, like, like, like);
  }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const totalRow = await db.prepare(`SELECT COUNT(*) AS n FROM products ${w}`).bind(...args).first();
  const { results } = await db
    .prepare(`SELECT ${LIST_COLS} FROM products ${w} ORDER BY ${ORDER[sort] || ORDER.featured} LIMIT ? OFFSET ?`)
    .bind(...args, pageSize, (page - 1) * pageSize)
    .all();
  return { total: totalRow ? totalRow.n : 0, items: results.map(rowToProduct) };
}

export async function listCategories(db) {
  const { results } = await db.prepare('SELECT category, COUNT(*) AS n FROM products GROUP BY category ORDER BY n DESC, category ASC').all();
  return results;
}

export async function listSubCategories(db, category) {
  if (!category) return [];
  const { results } = await db
    .prepare("SELECT sub_category, COUNT(*) AS n FROM products WHERE category = ? AND sub_category != '' GROUP BY sub_category ORDER BY n DESC, sub_category ASC")
    .bind(category).all();
  return results;
}

export async function getBySlug(db, slug) {
  const r = await db.prepare('SELECT * FROM products WHERE slug = ?').bind(slug).first();
  return r ? rowToProduct(r) : null;
}

export async function getById(db, id) {
  const r = await db.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
  return r ? rowToProduct(r) : null;
}

export async function relatedProducts(db, p, limit = 6) {
  const { results } = await db
    .prepare(`SELECT ${LIST_COLS} FROM products WHERE id != ? ORDER BY (category = ?) DESC, featured DESC, best_seller DESC, created_at DESC LIMIT ?`)
    .bind(p.id, p.category, limit)
    .all();
  return results.map(rowToProduct);
}

export async function allSlugs(db) {
  const { results } = await db.prepare('SELECT slug, updated_at FROM products ORDER BY updated_at DESC LIMIT 5000').all();
  return results;
}

/* ---------- validasi + simpan ---------- */

export function sanitizeProduct(input) {
  const i = input || {};
  const str = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

  const brand = str(i.brand, 60);
  const name = str(i.name, 200);
  if (!brand || !name) return { error: 'Brand dan Nama wajib diisi' };

  let asin = String(i.asin || '').trim();
  asin = extractAsin(asin) || asin.toUpperCase();
  if (asin && !/^[A-Z0-9]{10}$/.test(asin)) return { error: 'ASIN harus 10 karakter huruf/angka (contoh B0BF4D63YL)' };

  const affLink = cleanAff(i.affLink ?? i.aff_link);
  if (affLink && !isValidAffLink(affLink)) {
    return { error: 'Link afiliasi tidak valid. Harus link.amazon / amzn.to / amazon.com dengan ?tag=' };
  }
  if (!asin && !affLink) return { error: 'Isi ASIN atau Link Afiliasi' };

  const colors = (Array.isArray(i.colors) ? i.colors : []).slice(0, 20).map((c) => ({
    name: str(c && c.name, 40) || 'Default',
    hex: /^#[0-9a-f]{3,8}$/i.test(String((c && c.hex) || '')) ? c.hex : '#f97316',
    image: cleanUrl(c && c.image)
  }));
  if (!colors.length) colors.push({ name: 'Default', hex: '#f97316', image: '' });

  const images = [...new Set(
    colors.map((c) => c.image).concat((Array.isArray(i.images) ? i.images : []).map(cleanUrl)).filter(Boolean)
  )].slice(0, 12);

  const sizesIn = Array.isArray(i.sizes) ? i.sizes : String(i.sizes || '').split(',');
  const sizes = sizesIn.map((s) => str(s, 20)).filter((s) => s && !/^one size$/i.test(s)).slice(0, 20);

  const details = (Array.isArray(i.details) ? i.details : [])
    .map((d) => str(d, 400))
    .filter((d) => d.length > 5 && !/^Affiliate product - check Amazon/i.test(d))
    .slice(0, 10);

  const specs = (Array.isArray(i.specs) ? i.specs : [])
    .map((s) => ({ label: str(s && s.label, 40), value: str(s && s.value, 80) }))
    .filter((s) => s.label && s.value)
    .slice(0, 8);

  const rating = Math.min(5, Math.max(0, parseFloat(i.rating))) || 4.5;
  const reviews = Math.max(0, parseInt(i.reviews, 10) || 0);
  const id = String(i.id || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) ||
    'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  return {
    product: {
      id, brand, name,
      sub: str(i.sub, 120),
      category: str(i.category, 40) || 'Accessories',
      subCategory: str(i.subCategory ?? i.sub_category, 40),
      asin, tag: str(i.tag, 40), affLink,
      price: str(i.price, 30),
      rating, reviews,
      prime: i.prime === undefined ? true : !!i.prime,
      featured: !!i.featured,
      bestSeller: !!(i.bestSeller ?? i.best_seller),
      images, colors, sizes,
      desc: str(i.desc ?? i.description, 2000),
      details, specs
    }
  };
}

const UPSERT = `INSERT INTO products
 (id, slug, brand, name, sub, category, sub_category, asin, tag, aff_link, price, rating, reviews, prime, featured, best_seller, images, colors, sizes, description, details, specs, created_at, updated_at)
 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
 ON CONFLICT(id) DO UPDATE SET
  brand=excluded.brand, name=excluded.name, sub=excluded.sub, category=excluded.category, sub_category=excluded.sub_category,
  asin=excluded.asin, tag=excluded.tag, aff_link=excluded.aff_link, price=excluded.price, rating=excluded.rating,
  reviews=excluded.reviews, prime=excluded.prime, featured=excluded.featured, best_seller=excluded.best_seller,
  images=excluded.images, colors=excluded.colors, sizes=excluded.sizes, description=excluded.description,
  details=excluded.details, specs=excluded.specs, updated_at=excluded.updated_at`;

/**
 * Simpan 1..n produk. Slug lama dipertahankan saat edit (URL stabil untuk SEO).
 * Return { saved: [{id, slug}], errors: [{index, name, error}] }.
 */
export async function saveProducts(db, inputs) {
  const { results: existing } = await db.prepare('SELECT id, slug, asin, aff_link FROM products').all();
  const byId = new Map(existing.map((r) => [r.id, r]));
  const slugs = new Set(existing.map((r) => r.slug));
  const asins = new Map(existing.filter((r) => r.asin).map((r) => [r.asin, r.id]));
  const affs = new Map(existing.filter((r) => r.aff_link).map((r) => [r.aff_link, r.id]));

  const saved = [];
  const errors = [];
  const stmts = [];
  const now = Date.now();

  inputs.forEach((raw, index) => {
    const { product: p, error } = sanitizeProduct(raw);
    if (error) { errors.push({ index, name: String((raw && raw.name) || ''), error }); return; }

    if (p.asin && asins.has(p.asin) && asins.get(p.asin) !== p.id) {
      errors.push({ index, name: p.name, error: `ASIN ${p.asin} sudah dipakai produk lain`, status: 409 }); return;
    }
    if (p.affLink && affs.has(p.affLink) && affs.get(p.affLink) !== p.id) {
      errors.push({ index, name: p.name, error: 'Link afiliasi ini sudah dipakai produk lain', status: 409 }); return;
    }

    const prev = byId.get(p.id);
    let slug = prev ? prev.slug : slugify(p.name) || p.id;
    if (!prev) {
      if (slugs.has(slug)) slug = (slug + '-' + p.id.slice(-5)).slice(0, 90);
      slugs.add(slug);
    }
    if (prev) { asins.delete(prev.asin); affs.delete(prev.aff_link); }
    if (p.asin) asins.set(p.asin, p.id);
    if (p.affLink) affs.set(p.affLink, p.id);
    byId.set(p.id, { id: p.id, slug, asin: p.asin, aff_link: p.affLink });

    stmts.push(db.prepare(UPSERT).bind(
      p.id, slug, p.brand, p.name, p.sub, p.category, p.subCategory, p.asin, p.tag, p.affLink, p.price,
      p.rating, p.reviews, p.prime ? 1 : 0, p.featured ? 1 : 0, p.bestSeller ? 1 : 0,
      JSON.stringify(p.images), JSON.stringify(p.colors), JSON.stringify(p.sizes),
      p.desc, JSON.stringify(p.details), JSON.stringify(p.specs), now, now
    ));
    saved.push({ id: p.id, slug });
  });

  for (let k = 0; k < stmts.length; k += 40) await db.batch(stmts.slice(k, k + 40));
  if (stmts.length) await bumpVersionStmt(db).run();
  return { saved, errors };
}

export async function deleteProduct(db, id) {
  const r = await db.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
  await bumpVersionStmt(db).run();
  return (r.meta && r.meta.changes) || 0;
}
