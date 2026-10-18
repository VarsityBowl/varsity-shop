-- Jalankan SEKALI, SEBELUM deploy kode baru (Cloudflare Dashboard -> D1 -> varsity-shop -> Console, tempel 2 baris ini)
ALTER TABLE products ADD COLUMN list_price TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN discount INTEGER NOT NULL DEFAULT 0;
