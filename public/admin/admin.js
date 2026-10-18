(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var CATS = ['Jersey', 'Cleats', 'Gloves', 'Football', 'Helmets', 'Pads & Protective Gear', 'Training Equipment',
    'Bags & Backpacks', 'Apparel', 'Socks', 'Fan Gear & Merch', 'Accessories', 'Sports & Outdoors',
    "Men's Fashion", "Women's Fashion", 'Health & Household', 'Home & Kitchen', 'Electronics', 'Toys & Games'];
  var COLOR_HEX = [
    [/\bblack\b/i, '#000000'], [/\bwhite\b/i, '#ffffff'], [/\bnavy\b/i, '#1e3a5f'],
    [/\bred\b|\bcrimson\b|\bmaroon\b/i, '#dc2626'], [/\bblue\b/i, '#1d4ed8'],
    [/\bgreen\b|\bforest\b|\bolive\b/i, '#16a34a'], [/\byellow\b|\bgold\b/i, '#eab308'],
    [/\bgr[ae]y\b|\bcharcoal\b/i, '#6b7280'], [/\bbrown\b|\btan\b|\bkhaki\b|\bbeige\b/i, '#8B4513'],
    [/\bpink\b/i, '#ec4899'], [/\bpurple\b|\bviolet\b/i, '#7c3aed'], [/\borange\b/i, '#f97316'],
    [/\bsilver\b/i, '#c0c0c0'], [/\bteal\b|\bcyan\b/i, '#0d9488'], [/\bcream\b|\bivory\b/i, '#fef3c7']
  ];
  var products = [];
  var currentSpecs = [];
  var toastTimer = null;

  function toast(msg, isErr) {
    var t = $('toast');
    t.textContent = msg; t.className = isErr ? 'err' : ''; t.style.display = 'block';
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.style.display = 'none'; }, 3200);
  }

  function api(path, opts) {
    opts = opts || {};
    opts.credentials = 'same-origin';
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    return fetch(path, opts).then(function (r) {
      return r.text().then(function (t) {
        var d; try { d = JSON.parse(t); } catch (e) { d = { error: t.slice(0, 200) || ('HTTP ' + r.status) }; }
        if (!r.ok) throw new Error(d.error || ('HTTP ' + r.status));
        return d;
      });
    });
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function guessHex(name) {
    for (var i = 0; i < COLOR_HEX.length; i++) if (COLOR_HEX[i][0].test(name)) return COLOR_HEX[i][1];
    return '#f97316';
  }
  function upscale(u) { return String(u || '').replace(/\._[^./]+_\.(jpg|jpeg|png)(\?.*)?$/i, '._AC_SX679_.$1'); }
  function lines(v) { return String(v || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean); }

  /* ---------- daftar ---------- */
  function renderList() {
    var q = $('listSearch').value.toLowerCase().trim();
    var box = $('list'); box.textContent = '';
    var shown = products.filter(function (p) { return !q || (p.name + ' ' + p.brand + ' ' + p.category + ' ' + p.asin).toLowerCase().indexOf(q) > -1; });
    $('count').textContent = shown.length + ' dari ' + products.length + ' produk';
    if (!shown.length) { var e = el('div', 'sub', 'Belum ada produk.'); e.style.padding = '24px'; box.appendChild(e); return; }
    shown.forEach(function (p) {
      var row = el('div', 'item');
      var img = document.createElement('img'); img.referrerPolicy = 'no-referrer'; img.alt = '';
      img.src = (p.images && p.images[0]) || ''; img.onerror = function () { img.style.visibility = 'hidden'; };
      var t = el('div', 't'); t.appendChild(el('b', null, p.name));
      t.appendChild(el('div', 'm', p.brand + ' · ' + p.category + (p.subCategory ? ' › ' + p.subCategory : '') + ' · ★ ' + p.rating + (p.price ? ' · ' + p.price : '') + ' · /shop/detail/' + p.slug));
      var tags = el('div', 'm');
      if (p.featured) tags.appendChild(el('span', 'tag o', 'FEATURED'));
      if (p.bestSeller) tags.appendChild(el('span', 'tag g', 'BEST SELLER'));
      tags.appendChild(el('span', 'tag', p.affLink ? 'LINK AFILIASI' : 'ASIN + TAG'));
      t.appendChild(tags);
      var acts = el('div', 'row'); acts.style.flexDirection = 'column';
      var be = el('button', 'btn sm pri', 'EDIT'); be.onclick = function () { fillForm(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };
      var bd = el('button', 'btn sm red', 'HAPUS'); bd.onclick = function () { del(p); };
      var bv = el('a', 'btn sm', 'LIHAT'); bv.href = '/shop/detail/' + encodeURIComponent(p.slug); bv.target = '_blank'; bv.style.display = 'inline-flex'; bv.style.alignItems = 'center'; bv.style.textDecoration = 'none'; bv.style.color = 'inherit';
      acts.appendChild(be); acts.appendChild(bd); acts.appendChild(bv);
      row.appendChild(img); row.appendChild(t); row.appendChild(acts); box.appendChild(row);
    });
  }

  function load() {
    return api('/api/admin/products').then(function (d) {
      products = d.products || [];
      $('globalTag').value = d.globalTag || '';
      var cats = {}; CATS.forEach(function (c) { cats[c] = 1; }); products.forEach(function (p) { cats[p.category] = 1; });
      var dl = $('catList'); dl.textContent = '';
      Object.keys(cats).forEach(function (c) { var o = document.createElement('option'); o.value = c; dl.appendChild(o); });
      renderList();
    }).catch(function (e) { toast('Gagal memuat: ' + e.message, true); });
  }

  /* ---------- form ---------- */
  function clearForm() {
    ['f_id', 'f_brand', 'f_name', 'f_sub', 'f_subcat', 'f_asin', 'f_aff', 'f_tag', 'f_price', 'f_colors', 'f_images', 'f_sizes', 'f_desc', 'f_details']
      .forEach(function (id) { $(id).value = ''; });
    $('f_category').value = 'Jersey'; $('f_rating').value = '4.6'; $('f_reviews').value = '100';
    $('f_prime').checked = true; $('f_featured').checked = false; $('f_best').checked = false;
    $('pasteStatus').textContent = ''; currentSpecs = [];
  }

  function fillForm(p) {
    clearForm();
    $('f_id').value = p.id; $('f_brand').value = p.brand; $('f_name').value = p.name; $('f_sub').value = p.sub || '';
    $('f_category').value = p.category; $('f_subcat').value = p.subCategory || '';
    $('f_asin').value = p.asin; $('f_aff').value = p.affLink || ''; $('f_tag').value = p.tag || ''; $('f_price').value = p.price || '';
    $('f_rating').value = p.rating; $('f_reviews').value = p.reviews;
    $('f_colors').value = (p.colors || []).map(function (c) { return [c.name, c.hex, c.image || ''].join(' | '); }).join('\n');
    var colorImgs = (p.colors || []).map(function (c) { return c.image; });
    $('f_images').value = (p.images || []).filter(function (u) { return colorImgs.indexOf(u) < 0; }).join('\n');
    $('f_sizes').value = (p.sizes || []).join(', '); $('f_desc').value = p.desc || ''; $('f_details').value = (p.details || []).join('\n');
    $('f_prime').checked = !!p.prime; $('f_featured').checked = !!p.featured; $('f_best').checked = !!p.bestSeller;
    currentSpecs = p.specs || [];
  }

  function parseColors(text) {
    return lines(text).map(function (ln) {
      var parts = ln.split('|').map(function (s) { return s.trim(); });
      var name = parts[0] || 'Default', hex = '', image = '';
      parts.slice(1).forEach(function (x) { if (/^#[0-9a-f]{3,8}$/i.test(x)) hex = x; else if (/^(https?:)?\/\//i.test(x)) image = x; });
      return { name: name, hex: hex || guessHex(name), image: image };
    });
  }

  function readForm() {
    return {
      id: $('f_id').value || undefined,
      brand: $('f_brand').value, name: $('f_name').value, sub: $('f_sub').value,
      category: $('f_category').value, subCategory: $('f_subcat').value,
      asin: $('f_asin').value, affLink: $('f_aff').value, tag: $('f_tag').value, price: $('f_price').value,
      rating: $('f_rating').value, reviews: $('f_reviews').value,
      colors: parseColors($('f_colors').value), images: lines($('f_images').value),
      sizes: $('f_sizes').value.split(','), desc: $('f_desc').value, details: lines($('f_details').value), specs: currentSpecs,
      prime: $('f_prime').checked, featured: $('f_featured').checked, bestSeller: $('f_best').checked
    };
  }

  function save() {
    var btn = $('btnSave'); btn.disabled = true;
    api('/api/admin/products', { method: 'POST', body: JSON.stringify(readForm()) })
      .then(function () { toast('Tersimpan & langsung live di toko ✅'); clearForm(); return load(); })
      .catch(function (e) { toast(e.message, true); })
      .then(function () { btn.disabled = false; });
  }

  function del(p) {
    if (!confirm('Hapus produk ini?\n' + p.name)) return;
    api('/api/admin/products?id=' + encodeURIComponent(p.id), { method: 'DELETE' })
      .then(function () { toast('Produk dihapus'); return load(); })
      .catch(function (e) { toast(e.message, true); });
  }

  /* ---------- tempel data dari bookmarklet lama ---------- */
  function pasteData() {
    var get = navigator.clipboard && navigator.clipboard.readText ? navigator.clipboard.readText() : Promise.reject();
    get.catch(function () { return prompt('Tempel data produk dari bookmarklet di sini:') || ''; })
      .then(function (txt) {
        if (!txt || !txt.trim()) return;
        var d; try { d = JSON.parse(txt); } catch (e) { d = null; }
        if (!d || d.vb !== 1) { toast('Itu bukan data dari bookmarklet', true); return; }
        if (d.asin) $('f_asin').value = d.asin;
        if (d.name) $('f_name').value = d.name;
        if (d.brand) $('f_brand').value = d.brand;
        if (d.price) $('f_price').value = d.price;
        if (d.rating) $('f_rating').value = d.rating;
        if (d.reviews) $('f_reviews').value = d.reviews;
        if (d.desc) $('f_desc').value = d.desc;
        if (!$('f_sub').value && d.name) $('f_sub').value = d.name.split(' ').slice(-4).join(' ');
        var crumbs = (d.categoryList || []).slice().reverse(), hit = '';
        crumbs.forEach(function (c) { if (!hit) CATS.concat(products.map(function (p) { return p.category; })).forEach(function (k) { if (!hit && k.toLowerCase() === String(c).toLowerCase()) hit = k; }); });
        if (hit) $('f_category').value = hit;
        var imgs = (d.images || []).map(String);
        var cols = (d.colors || []).map(function (c, i) {
          var name = String((c && c.name) || c || '').trim(); if (!name) return null;
          var im = c && c.image ? upscale(c.image) : (i === 0 && imgs[0] ? imgs[0] : '');
          return { name: name, hex: guessHex(name), image: /media-amazon\.com\/images\/I\//i.test(im) ? im : (i === 0 ? (imgs[0] || '') : '') };
        }).filter(Boolean);
        if (!cols.length && imgs[0]) cols = [{ name: 'Default', hex: '#f97316', image: imgs[0] }];
        $('f_colors').value = cols.map(function (c) { return [c.name, c.hex, c.image].join(' | '); }).join('\n');
        var used = cols.map(function (c) { return c.image; });
        $('f_images').value = imgs.filter(function (u) { return used.indexOf(u) < 0; }).join('\n');
        $('f_sizes').value = (d.sizes || []).join(', ');
        $('f_details').value = (d.bullets || []).join('\n');
        currentSpecs = (d.specs || []).filter(function (s) { return s && s.label && s.value; });
        $('pasteStatus').textContent = '✅ Terisi: ' + String(d.name || '').slice(0, 60) + ' | Warna: ' + cols.length + ' | Foto: ' + imgs.length + ' | Kategori: ' + (hit || (d.category ? '"' + d.category + '" (isi manual)' : 'isi manual')) + ' - cek dulu lalu SIMPAN.';
        toast('Data ditempel ✅');
      });
  }

  /* ---------- export / import ---------- */
  function exportJson() {
    var data = JSON.stringify({ globalTag: $('globalTag').value, products: products }, null, 2);
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = 'products.json'; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function importJson(ev) {
    var f = ev.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      var d; try { d = JSON.parse(r.result); } catch (e) { toast('File bukan JSON yang valid', true); return; }
      var list = Array.isArray(d) ? d : d && d.products;
      if (!Array.isArray(list)) { toast('Harus berisi array produk', true); return; }
      var saved = 0, errs = [], chain = Promise.resolve();
      for (var i = 0; i < list.length; i += 100) (function (chunk, first) {
        chain = chain.then(function () {
          var body = { products: chunk }; if (first && d.globalTag) body.globalTag = d.globalTag;
          return api('/api/admin/import', { method: 'POST', body: JSON.stringify(body) }).then(function (res) { saved += res.saved; errs = errs.concat(res.errors || []); });
        });
      })(list.slice(i, i + 100), i === 0);
      chain.then(function () {
        toast('Impor selesai: ' + saved + ' tersimpan' + (errs.length ? ', ' + errs.length + ' dilewati' : ''), errs.length > 0);
        if (errs.length) console.warn('Impor dilewati:', errs);
        return load();
      }).catch(function (e) { toast('Impor gagal: ' + e.message, true); });
    };
    r.readAsText(f); ev.target.value = '';
  }

  /* ---------- init ---------- */
  $('btnSave').onclick = save;
  $('btnClear').onclick = clearForm;
  $('btnPaste').onclick = pasteData;
  $('btnExport').onclick = exportJson;
  $('btnImport').onclick = function () { $('importFile').click(); };
  $('importFile').onchange = importJson;
  $('listSearch').oninput = renderList;
  $('btnTag').onclick = function () {
    api('/api/admin/settings', { method: 'POST', body: JSON.stringify({ globalTag: $('globalTag').value }) })
      .then(function () { toast('Tag global disimpan ✅'); }).catch(function (e) { toast(e.message, true); });
  };
  $('f_asin').addEventListener('input', function () {
    var v = this.value.trim();
    var m = v.match(/(?:\/dp\/|\/gp\/product\/|\/gp\/aw\/d\/|\/product\/)([A-Za-z0-9]{10})(?:[\/?#&]|$)/i);
    if (m) { this.value = m[1].toUpperCase(); toast('ASIN diambil dari link: ' + this.value); }
    else if (/^https?:\/\/(amzn\.to|a\.co|amzn\.com|link\.amazon)\//i.test(v)) {
      $('f_aff').value = v; this.value = ''; toast('Itu link afiliasi, dipindah ke kolom Link afiliasi ✅');
    }
  });
  load();
})();
