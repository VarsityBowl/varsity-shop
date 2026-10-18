CREATE TABLE IF NOT EXISTS products (
  id           TEXT PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  brand        TEXT NOT NULL,
  name         TEXT NOT NULL,
  sub          TEXT NOT NULL DEFAULT '',
  category     TEXT NOT NULL DEFAULT 'Accessories',
  sub_category TEXT NOT NULL DEFAULT '',
  asin         TEXT NOT NULL DEFAULT '',
  tag          TEXT NOT NULL DEFAULT '',
  aff_link     TEXT NOT NULL DEFAULT '',
  price        TEXT NOT NULL DEFAULT '',
  rating       REAL NOT NULL DEFAULT 4.5,
  reviews      INTEGER NOT NULL DEFAULT 0,
  prime        INTEGER NOT NULL DEFAULT 1,
  featured     INTEGER NOT NULL DEFAULT 0,
  best_seller  INTEGER NOT NULL DEFAULT 0,
  images       TEXT NOT NULL DEFAULT '[]',
  colors       TEXT NOT NULL DEFAULT '[]',
  sizes        TEXT NOT NULL DEFAULT '[]',
  description  TEXT NOT NULL DEFAULT '',
  details      TEXT NOT NULL DEFAULT '[]',
  specs        TEXT NOT NULL DEFAULT '[]',
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_asin ON products(asin) WHERE asin != '';
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_rank ON products(featured DESC, best_seller DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('global_tag', 'ariepplara-20');
INSERT OR IGNORE INTO settings (key, value) VALUES ('version', '1');
