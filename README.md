# Varsity Bowl Shop — Cloudflare Pages + D1

Toko afiliasi Amazon yang dirakit di server (HTML lengkap untuk Google), data di Cloudflare D1,
dashboard admin dilindungi Cloudflare Access. Semua di paket gratis.

```
lib/                  util, akses D1, render HTML, cache edge, verifikasi Access
functions/shop/       GET /shop/  dan  /shop/detail/<slug>
functions/api/admin/  API admin (products, import, settings) + middleware auth
functions/admin/      middleware untuk halaman dashboard
functions/sitemap-shop.xml.js   sitemap produk
public/shop.css       CSS toko (statis, di-cache selamanya)
public/admin/         dashboard (index.html + admin.js)
schema.sql            tabel products + settings
```

## Menggabungkan ke repo situs yang sudah ada
Salin folder `lib/`, `functions/`, `schema.sql`, `public/shop.css`, `public/admin/` ke repo Pages Anda,
lalu gabungkan `wrangler.toml` (binding D1 + vars). **Hapus** file lama yang bentrok:
`public/shop/index.html` dan function lama `shop/detail/[slug]` (kalau ada).
Biarkan `public/shop/og_image.jpg` dan file favicon seperti semula.

## Langkah deploy
1. `npm install`
2. Buat database: `npx wrangler d1 create varsity-shop` → salin `database_id` ke `wrangler.toml`.
3. Buat tabel: `npx wrangler d1 execute varsity-shop --remote --file=schema.sql`
4. Deploy: `npx wrangler pages deploy` (atau hubungkan repo ke Pages; pastikan binding D1 `DB` terpasang).
5. **Kunci dashboard (wajib)** — Zero Trust → Access → Applications → Add → Self-hosted:
   - Domain `sportfusion.online`, dua path: `/admin*` dan `/api/admin*`
   - Policy: Allow, email Anda saja
   - Salin **Application Audience (AUD) Tag** → `ACCESS_AUD`; team domain (`namatim.cloudflareaccess.com`) → `ACCESS_TEAM_DOMAIN`
     (di `wrangler.toml` bagian `[vars]`, atau Pages → Settings → Variables), lalu deploy ulang.
   - Sebelum Access dikonfigurasi, API admin menjawab **503** (tertutup) — sengaja, supaya tidak pernah terbuka.
6. Pindahkan produk lama: di dashboard lama klik **EXPORT JSON**, lalu di `/admin/` klik **IMPOR JSON**.
   Slug sama dengan toko lama, jadi link `/shop/detail/...` yang sudah dibagikan tetap hidup.
7. Kirim `https://sportfusion.online/sitemap-shop.xml` ke Google Search Console.

## Lokal
Buat `.dev.vars` berisi `DEV_BYPASS_AUTH=1` (**jangan pernah** diset di production), lalu
`npm run db:local` dan `npm run dev` → http://localhost:8788/shop/ dan /admin/.

## Cara kerja cache
Halaman toko disimpan di cache edge dengan kunci yang memuat `version` (tabel `settings`).
Setiap simpan/hapus produk menaikkan `version`, jadi pengunjung berikutnya langsung dapat halaman baru.
`caches.default` hanya aktif di domain kustom (bukan `*.pages.dev`).

## Batas gratis yang perlu diingat
- Setiap kunjungan halaman toko/detail memanggil Pages Function → dihitung ke kuota **100.000 request/hari**
  (file statis seperti CSS tidak dihitung). Cache menghemat D1, bukan jumlah invokasi.
- Kalau kuota habis, mode "fail open" bawaan Pages melewati function dan melayani file statis.
- Pantau di dashboard Cloudflare → Workers & Pages → project → Metrics. Upgrade Workers Paid ($5/bln) bila perlu.

## Catatan SEO
- JSON-LD `Product` sengaja **tanpa** `offers` dan `aggregateRating`: harga/rating berasal dari Amazon dan bisa
  basi, dan markup yang tidak cocok dengan halaman Amazon berisiko kena kebijakan data terstruktur Google.
- Halaman hasil pencarian dan urutan non-default diberi `noindex`; kategori dan paginasi boleh diindeks.
- Pastikan `robots.txt` tidak memblokir Googlebot (cek juga pengaturan "Block AI bots / managed robots.txt" di Cloudflare).
