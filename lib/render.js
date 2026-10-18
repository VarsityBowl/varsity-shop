import { esc, amazonLink, ldJson } from './util.js';

const SHOP_PATH = '/shop/';
export const PAGE_SIZE = 24;

/* ---------- kerangka halaman ---------- */

export function layout({ title, description, canonical, robots, siteUrl, body, jsonld = [], extraHead = '', ogImage }) {
  const img = ogImage || `${siteUrl}/shop/og_image.jpg`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
${robots ? `<meta name="robots" content="${esc(robots)}">` : ''}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#ffffff">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Varsity Bowl">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(img)}">
${extraHead}
<link rel="stylesheet" href="/shop.css">
${jsonld.map((o) => `<script type="application/ld+json">${ldJson(o)}</script>`).join('\n')}
</head>
<body>
<header class="hdr">
  <div class="wrap hdr-in">
    <a class="logo" href="/" aria-label="Varsity Bowl home"><span class="logo-dot">VB</span><span>VARSITY <b>BOWL</b></span></a>
    <nav class="hdr-nav">
      <a class="pill" href="/">&larr; SCORES</a>
      <a class="pill pill-on" href="${SHOP_PATH}">SHOP</a>
    </nav>
  </div>
</header>
${body}
<footer class="ftr">
  <div class="wrap">
    <p>As an Amazon Associate I earn from qualifying purchases. Product links are affiliate links.</p>
    <p>Prices, availability and shipping details are shown on Amazon and may change at any time.</p>
    <p class="ftr-links"><a href="/">Home</a> <a href="/about.html">About</a> <a href="/privacy.html">Privacy</a> <a href="/terms.html">Terms</a> <a href="/contact.html">Contact</a></p>
    <p>&copy; ${new Date().getUTCFullYear()} Varsity Bowl. All rights reserved.</p>
  </div>
</footer>
<nav class="bnav" aria-label="Main">
  <a href="/"><span>🏈</span>SCORES</a>
  <a href="${SHOP_PATH}" class="on"><span>🛒</span>SHOP</a>
  <a href="${SHOP_PATH}#search"><span>🔍</span>SEARCH</a>
</nav>
</body>
</html>`;
}

/* ---------- potongan kecil ---------- */

const stars = (r) => {
  const pct = Math.max(0, Math.min(100, ((Number(r) || 0) / 5) * 100));
  return `<span class="stars" style="--pct:${pct}%" role="img" aria-label="${esc(r)} out of 5"></span>`;
};

export function cardHtml(p, globalTag) {
  const img = (p.images && p.images[0]) || '';
  const href = `${SHOP_PATH}detail/${encodeURIComponent(p.slug)}`;
  return `<article class="card${p.featured || p.bestSeller ? ' card-hi' : ''}">
  <a class="card-img" href="${esc(href)}">
    ${img ? `<img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : '<span class="noimg">No image</span>'}
    <span class="badges">${p.featured ? '<i class="b b-or">FEATURED</i>' : ''}${p.bestSeller ? '<i class="b b-gr">BEST SELLER</i>' : ''}</span>
    ${p.prime ? '<i class="b b-bl prime">PRIME</i>' : ''}
    ${p.price ? `<span class="price-tag">${esc(p.price)}</span>` : ''}
    <span class="rate">★ ${esc(p.rating)}</span>
  </a>
  <div class="card-body">
    <h3><a href="${esc(href)}">${esc(p.name)}</a></h3>
    <div class="btns">
      <a class="btn btn-ghost" href="${esc(href)}">DETAILS</a>
      <a class="btn btn-pri" href="${esc(amazonLink(p, globalTag))}" target="_blank" rel="sponsored noopener">SHOP</a>
    </div>
  </div>
</article>`;
}

function pagination(page, pages, hrefFor) {
  if (pages <= 1) return '';
  const nums = new Set([1, pages, page - 1, page, page + 1]);
  const list = [...nums].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  let out = '';
  if (page > 1) out += `<a class="pg" rel="prev" href="${esc(hrefFor(page - 1))}">&larr; Prev</a>`;
  let last = 0;
  for (const n of list) {
    if (n - last > 1) out += '<span class="pg gap">…</span>';
    out += n === page ? `<span class="pg on" aria-current="page">${n}</span>` : `<a class="pg" href="${esc(hrefFor(n))}">${n}</a>`;
    last = n;
  }
  if (page < pages) out += `<a class="pg" rel="next" href="${esc(hrefFor(page + 1))}">Next &rarr;</a>`;
  return `<nav class="pager" aria-label="Pagination">${out}</nav>`;
}

/* ---------- halaman daftar toko ---------- */

export function shopPage({ items, total, page, category, subCategory = '', subCategories = [], q, sort, categories, siteUrl, globalTag }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (over = {}) => {
    const sp = new URLSearchParams();
    const v = { category, sub: subCategory, q, sort: sort !== 'featured' ? sort : '', page: '', ...over };
    for (const k of ['category', 'sub', 'q', 'sort', 'page']) if (v[k] && !(k === 'page' && Number(v[k]) <= 1)) sp.set(k, v[k]);
    const s = sp.toString();
    return SHOP_PATH + (s ? '?' + s : '');
  };

  const canonicalQs = new URLSearchParams();
  if (category) canonicalQs.set('category', category);
  if (category && subCategory) canonicalQs.set('sub', subCategory);
  if (page > 1) canonicalQs.set('page', String(page));
  const canonical = siteUrl + SHOP_PATH + (canonicalQs.toString() ? '?' + canonicalQs : '');

  const heading = subCategory ? `${subCategory} ${category}` : category;
  let title = category ? `${subCategory ? subCategory + ' - ' : ''}${category} - Varsity Bowl Shop` : 'Varsity Bowl Shop - Football Gear on Amazon';
  if (page > 1) title += ` - Page ${page}`;
  const description = category
    ? `Hand-picked ${heading.toLowerCase()} for varsity football teams, available on Amazon.`
    : 'Hand-picked football gear for varsity teams. Jerseys, cleats, gloves and more, available on Amazon.';

  const extraHead = [
    page > 1 ? `<link rel="prev" href="${esc(siteUrl + qs({ page: page - 1 }))}">` : '',
    page < pages ? `<link rel="next" href="${esc(siteUrl + qs({ page: page + 1 }))}">` : ''
  ].join('\n');

  const catOptions = ['<option value="">All Categories</option>']
    .concat(categories.map((c) => `<option value="${esc(c.category)}"${c.category === category ? ' selected' : ''}>${esc(c.category)} (${c.n})</option>`)).join('');
  const subChips = category && subCategories.length
    ? `<nav class="subs" aria-label="Sub categories"><a class="sub${subCategory ? '' : ' on'}" href="${esc(qs({ sub: '', page: '' }))}">All ${esc(category)}</a>${subCategories.map((s) => `<a class="sub${s.sub_category === subCategory ? ' on' : ''}" href="${esc(qs({ sub: s.sub_category, page: '' }))}">${esc(s.sub_category)} <i>${s.n}</i></a>`).join('')}</nav>`
    : '';
  const sortOptions = [['featured', 'Featured first'], ['rating', 'Top rated'], ['name', 'Name A-Z']]
    .map(([v, t]) => `<option value="${v}"${v === sort ? ' selected' : ''}>${t}</option>`).join('');

  const body = `<main class="wrap">
  <section class="hero">
    <div>
      <span class="chip">HAND-PICKED GEAR</span>
      <h1>TOP GEAR FOR<br>VARSITY <b>TEAMS</b></h1>
      <p>Hand-picked football gear for varsity teams: jerseys, cleats, gloves and more. Every link takes you straight to the product on Amazon.</p>
      <div class="stats"><span>${total} ${total === 1 ? 'Product' : 'Products'}</span><span>Amazon Affiliate</span></div>
    </div>
    <aside class="why">
      <div class="lbl">WHY SHOP HERE</div>
      <ul><li>Links open the product on Amazon.com</li><li>Secure checkout on Amazon</li><li>Always see the latest price on Amazon</li></ul>
    </aside>
  </section>

  <form class="filters" id="search" method="get" action="${SHOP_PATH}">
    <input type="search" name="q" value="${esc(q)}" maxlength="60" placeholder="Search products or brands..." aria-label="Search">
    <select name="category" aria-label="Category">${catOptions}</select>
    <select name="sort" aria-label="Sort">${sortOptions}</select>
    <button class="btn btn-pri" type="submit">FILTER</button>
  </form>
  ${subChips}

  ${items.length
    ? `<div class="grid">${items.map((p) => cardHtml(p, globalTag)).join('')}</div>${pagination(page, pages, (n) => qs({ page: String(n) }))}`
    : '<div class="empty">No products match your search. <a href="/shop/">Clear filters</a></div>'}
</main>`;

  return layout({
    title, description, canonical, siteUrl, body, extraHead,
    robots: q || sort !== 'featured' ? 'noindex,follow' : '',
    jsonld: [{
      '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, url: canonical,
      isPartOf: { '@type': 'WebSite', name: 'Varsity Bowl', url: siteUrl }
    }]
  });
}

/* ---------- halaman detail ---------- */

function descBullets(p) {
  if (p.details && p.details.length >= 2) return p.details;
  const d = String(p.desc || '').trim();
  const parts = d.split(/(?:^|\s)\d{1,2}\.\s+(?=\S)/).map((x) => x.replace(/\.+\s*$/, '').trim()).filter((x) => x.length > 8);
  return parts.length >= 2 ? parts : [];
}

function detailRows(p) {
  const rows = [];
  const seen = new Set();
  for (const s of p.specs || []) {
    if (!s.label || !s.value) continue;
    seen.add(s.label.toUpperCase());
    rows.push([s.label, s.value]);
  }
  const add = (k, v) => { if (v && !seen.has(k.toUpperCase())) { seen.add(k.toUpperCase()); rows.push([k, v]); } };
  add('Brand', p.brand);
  add('Category', p.category);
  add('Sub Category', p.subCategory);
  add('ASIN', p.asin);
  if (p.sizes && p.sizes.length) add('Sizes', p.sizes.join(', '));
  return rows;
}

export function detailPage({ p, related, siteUrl, globalTag }) {
  const link = amazonLink(p, globalTag);
  const url = `${siteUrl}${SHOP_PATH}detail/${encodeURIComponent(p.slug)}`;
  const startImg = (p.colors[0] && p.colors[0].image) || p.images[0] || '';
  const gallery = [...new Set([startImg, ...p.colors.map((c) => c.image), ...p.images].filter(Boolean))].slice(0, 10);

  const thumbs = gallery.length > 1
    ? `<div class="thumbs">${gallery.map((u, i) => `<button type="button" class="thumb${i === 0 ? ' on' : ''}" data-src="${esc(u)}"><img src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer"></button>`).join('')}</div>`
    : '';

  const colorRow = p.colors.length > 1
    ? `<div class="colors"><span class="lbl">COLOR: <b id="colorLabel">${esc(p.colors[0].name)}</b></span>
       ${p.colors.map((c, i) => `<button type="button" class="swatch${i === 0 ? ' on' : ''}" title="${esc(c.name)}" aria-label="${esc(c.name)}" data-name="${esc(c.name)}" data-img="${esc(c.image)}" style="background:${esc(c.hex)}"></button>`).join('')}</div>`
    : '';

  const badges = [
    p.bestSeller ? '<i class="b b-gr">BEST SELLER</i>' : '',
    p.featured ? '<i class="b b-or">FEATURED</i>' : '',
    p.prime ? '<i class="b b-bl">PRIME</i>' : ''
  ].join('');

  const priceBlock = p.price
    ? `<div class="pricebox"><div class="price">${esc(p.price)}</div><div class="note">Price on Amazon may change - check the latest price at checkout.</div></div>`
    : '<div class="pricebox"><div class="note strong">Prices change often - check the latest price on Amazon.</div></div>';

  const sizeBlock = p.sizes.length
    ? `<div class="sizes"><div class="lbl">AVAILABLE SIZES</div><div class="size-grid">${p.sizes.map((s) => `<span>${esc(s)}</span>`).join('')}</div><div class="note">Availability can vary by color - <a href="${esc(link)}" target="_blank" rel="sponsored noopener">check size details on Amazon</a>.</div></div>`
    : `<div class="sizes note-box">📏 Size details &amp; availability: <a href="${esc(link)}" target="_blank" rel="sponsored noopener">check on Amazon</a></div>`;

  const bullets = descBullets(p);
  const about = bullets.length
    ? `<ul class="ticks">${bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`
    : `<p>${esc(p.desc || 'See the Amazon listing for full details.')}</p>`;

  const rows = detailRows(p);
  const table = rows.length
    ? `<h2>Product details</h2><div class="dtable">${rows.map((r) => `<div><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join('')}</div>`
    : '';

  const rel = related.length
    ? `<section class="related"><h2>Related Products</h2><div class="grid">${related.map((r) => cardHtml(r, globalTag)).join('')}</div></section>`
    : '';

  const body = `<main class="wrap detail">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="${SHOP_PATH}">Shop</a> › <a href="${SHOP_PATH}?category=${encodeURIComponent(p.category)}">${esc(p.category)}</a> ›${p.subCategory ? ` <a href="${SHOP_PATH}?category=${encodeURIComponent(p.category)}&amp;sub=${encodeURIComponent(p.subCategory)}">${esc(p.subCategory)}</a> ›` : ''} <span>${esc(p.name)}</span></nav>
  <div class="dgrid">
    <div class="gal">
      <div class="mainimg">${startImg ? `<img id="mainImg" src="${esc(startImg)}" alt="${esc(p.name)}" referrerpolicy="no-referrer" fetchpriority="high">` : '<span class="noimg">No image</span>'}</div>
      ${thumbs}${colorRow}
    </div>
    <div class="info">
      <div class="meta"><b>${esc(p.brand)}</b> · ${esc(p.category)}${p.subCategory ? ' › ' + esc(p.subCategory) : ''}</div>
      <h1>${esc(p.name)}</h1>
      ${p.sub ? `<div class="subname">${esc(p.sub)}</div>` : ''}
      <div class="rating">${stars(p.rating)} <b>${esc(p.rating)}</b> <span>(${esc(p.reviews)} reviews)</span></div>
      ${badges ? `<div class="badge-row">${badges}</div>` : ''}
      ${priceBlock}
      ${sizeBlock}
      <a class="btn btn-pri btn-xl" href="${esc(link)}" target="_blank" rel="sponsored noopener">SHOP NOW ON AMAZON ↗</a>
      <div class="trust"><div>📦<span>Fulfilled by Amazon</span></div><div>🔒<span>Secure checkout on Amazon</span></div><div>🏷️<span>Latest price on Amazon</span></div></div>
      <p class="disc">As an Amazon Associate I earn from qualifying purchases. Product links are affiliate links. Prices may change at any time.</p>
    </div>
    <div class="about">
      <h2>About this item</h2>
      ${about}
      ${table}
    </div>
  </div>
  ${rel}
</main>
<div class="sticky"><div class="wrap sticky-in">
  ${startImg ? `<img src="${esc(startImg)}" alt="" referrerpolicy="no-referrer">` : ''}
  <div class="sticky-t"><b>${esc(p.name)}</b><span>${esc(p.price || 'Check price on Amazon')}</span></div>
  <a class="btn btn-pri" href="${esc(link)}" target="_blank" rel="sponsored noopener">SHOP ON AMAZON</a>
</div></div>
<script>
(function(){
  var m=document.getElementById('mainImg'),l=document.getElementById('colorLabel');
  function show(src){ if(!src||!m) return; m.src=src; document.querySelectorAll('.thumb').forEach(function(t){t.classList.toggle('on',t.getAttribute('data-src')===src);}); }
  document.querySelectorAll('.thumb').forEach(function(t){ t.addEventListener('click',function(){ show(t.getAttribute('data-src')); }); });
  document.querySelectorAll('.swatch').forEach(function(s){ s.addEventListener('click',function(){
    document.querySelectorAll('.swatch').forEach(function(x){ x.classList.remove('on'); }); s.classList.add('on');
    if(l) l.textContent=s.getAttribute('data-name'); show(s.getAttribute('data-img')); }); });
})();
</script>`;

  const description = (p.desc || `${p.name} - hand-picked football gear for varsity teams, available on Amazon.`).slice(0, 155);
  const product = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, description,
    brand: { '@type': 'Brand', name: p.brand }, ...(p.asin ? { sku: p.asin } : {}),
    ...(gallery.length ? { image: gallery.slice(0, 5) } : {}), url
  };
  const crumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Shop', item: siteUrl + SHOP_PATH },
      { '@type': 'ListItem', position: 2, name: p.category, item: `${siteUrl}${SHOP_PATH}?category=${encodeURIComponent(p.category)}` },
      ...(p.subCategory ? [{ '@type': 'ListItem', position: 3, name: p.subCategory, item: `${siteUrl}${SHOP_PATH}?category=${encodeURIComponent(p.category)}&sub=${encodeURIComponent(p.subCategory)}` }] : []),
      { '@type': 'ListItem', position: p.subCategory ? 4 : 3, name: p.name, item: url }
    ]
  };

  return layout({
    title: `${p.name} | Varsity Bowl Shop`, description, canonical: url, siteUrl, body,
    ogImage: startImg || undefined, jsonld: [product, crumbs]
  });
}

export function notFoundPage(siteUrl) {
  return layout({
    title: 'Product not found | Varsity Bowl Shop', description: 'This product is no longer available.',
    canonical: siteUrl + SHOP_PATH, robots: 'noindex', siteUrl,
    body: '<main class="wrap"><div class="empty"><h1>Product not found</h1><p>It may have been removed. <a href="/shop/">Back to the shop</a></p></div></main>'
  });
}
