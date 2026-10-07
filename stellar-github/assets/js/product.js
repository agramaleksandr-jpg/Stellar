/* =========================================================
   Карточка товара: галерея, покупка, логистика, материалы
   для маркетплейсов (генерация фото, инфографики, CSV и ZIP),
   вкладки, похожие и недавно просмотренные
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const S = window.Stellar;
  const D = window.STELLAR_DATA;
  const P = window.STELLAR_PRODUCTS;
  if (!S || !D || !P) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const esc = D.esc;
  const plural = (n, w) => w[(n % 100 > 4 && n % 100 < 20) ? 2 : [2, 0, 1, 1, 1, 2][Math.min(n % 10, 5)]];
  const fmt = (n, d = 0) => n.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });
  const bump = (el) => { el.classList.remove('is-bump'); void el.offsetWidth; el.classList.add('is-bump'); };

  const param = (new URLSearchParams(location.search).get('art') || '03228').replace(/\D/g, '').padStart(5, '0');
  const p = D.byArt(param);

  if (!p) {
    $$('main > section').forEach((s) => { s.hidden = !s.hasAttribute('data-notfound'); });
    document.title = 'Товар не найден — «Стеллар»';
    return;
  }

  const coll = p.coll ? D.COLLECTIONS[p.coll] : null;
  const catName = D.CATEGORIES[p.cat];
  const url = (u) => D.href(u);
  document.title = `${p.name} — арт. ${p.art} оптом от производителя | «Стеллар»`;
  const metaDesc = $('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', p.lead);

  /* ---------- Хлебные крошки ---------- */
  const crumbs = $('[data-crumbs]');
  crumbs.insertAdjacentHTML('beforeend', (coll
    ? `<span aria-hidden="true">/</span><a href="${url('catalog.html')}?coll=${p.coll}">Коллекция «${coll.name}»</a>`
    : `<span aria-hidden="true">/</span><a href="${url('catalog.html')}?cat=${p.cat}">${esc(catName)}</a>`) +
    `<span aria-hidden="true">/</span><span aria-current="page">${esc(p.name)}</span>`);

  /* ---------- Галерея ---------- */
  const gallery = $('[data-gallery]');
  const stage = $('[data-stage]');
  const mainImg = $('[data-main-img]');
  const thumbs = $('[data-thumbs]');
  const images = p.gallery;
  let cur = 0;
  stage.style.setProperty('--tint', coll ? coll.tint : '#F2EFEB');
  stage.classList.toggle('is-single', images.length < 2);
  const word = $('[data-word]');
  word.textContent = p.word;

  thumbs.innerHTML = images.map((src, i) => `<button class="thumb" type="button" role="tab" aria-selected="${i === 0}" aria-label="Фото ${i + 1}" data-thumb="${i}"><img src="${src}" alt=""></button>`).join('') +
    (p.video ? `<a class="thumb thumb--video" href="https://www.youtube.com/channel/UCFnpPpj2sRNHml6yER500HQ" target="_blank" rel="noopener" aria-label="Видеообзор на YouTube"><svg class="i"><use href="#i-play"/></svg>Видео</a>` : '');

  const tagsHTML = (p.tags.includes('hit') ? '<span class="tag tag--accent">Хит продаж</span>' : '') +
    (p.tags.includes('new') ? '<span class="tag tag--accent">Новинка</span>' : '') +
    (coll ? `<span class="tag"><i style="--c:${coll.color}"></i>Коллекция «${coll.name}»</span>` : '');
  $('[data-ptags]').innerHTML = tagsHTML;

  function show(i, dir = 1) {
    const n = (i + images.length) % images.length;
    $('[data-counter-photo]').textContent = `${n + 1} / ${images.length}`;
    $$('[data-thumb]', thumbs).forEach((t) => t.setAttribute('aria-selected', String(Number(t.dataset.thumb) === n)));
    if (n === cur && mainImg.getAttribute('src')) return;
    cur = n;
    if (!mainImg.getAttribute('src') || reduceMotion) { mainImg.src = images[n]; return; }
    mainImg.style.setProperty('--dir', dir > 0 ? '-36px' : '36px');
    mainImg.classList.remove('is-in');
    mainImg.classList.add('is-out');
    setTimeout(() => {
      mainImg.src = images[n];
      mainImg.classList.remove('is-out'); void mainImg.offsetWidth; mainImg.classList.add('is-in');
    }, 220);
  }
  mainImg.alt = p.name;
  show(0);
  thumbs.addEventListener('click', (e) => { const t = e.target.closest('[data-thumb]'); if (t) show(Number(t.dataset.thumb), Number(t.dataset.thumb) > cur ? 1 : -1); });
  $('[data-prev]').addEventListener('click', () => show(cur - 1, -1));
  $('[data-next]').addEventListener('click', () => show(cur + 1, 1));
  gallery.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { show(cur - 1, -1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { show(cur + 1, 1); e.preventDefault(); }
  });

  // слово-подложка подгоняется под ширину
  function fitWord() {
    word.style.fontSize = '';
    const max = stage.clientWidth * 0.92;
    if (word.offsetWidth > max) word.style.fontSize = (22 * max / word.offsetWidth).toFixed(2) + 'cqw';
  }
  const ready = () => { fitWord(); requestAnimationFrame(() => gallery.classList.add('is-ready')); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ready); else ready();
  window.addEventListener('resize', fitWord);

  // лупа при наведении
  const zoomBtn = $('[data-open-lightbox]');
  if (finePointer && !reduceMotion) {
    zoomBtn.addEventListener('pointermove', (e) => {
      const r = zoomBtn.getBoundingClientRect();
      mainImg.style.setProperty('--ox', ((e.clientX - r.left) / r.width) * 100 + '%');
      mainImg.style.setProperty('--oy', ((e.clientY - r.top) / r.height) * 100 + '%');
    });
    let zoomTimer = null;
    // лупа включается, когда курсор задержался на фото (а не просто оказался над ним при загрузке)
    zoomBtn.addEventListener('pointermove', () => {
      if (zoomBtn.classList.contains('is-zoom') || zoomTimer) return;
      zoomTimer = setTimeout(() => { zoomBtn.classList.add('is-zoom'); stage.classList.add('is-zooming'); }, 450);
    });
    zoomBtn.addEventListener('pointerleave', () => { clearTimeout(zoomTimer); zoomTimer = null; zoomBtn.classList.remove('is-zoom'); stage.classList.remove('is-zooming'); });
  }
  // свайп
  let sx = null;
  stage.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') sx = e.clientX; });
  stage.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });

  /* ---------- Лайтбокс ---------- */
  const lb = $('[data-lightbox]');
  const lbImg = $('[data-lb-img]');
  const lbDots = $('[data-lb-dots]');
  let lbIndex = 0;
  let lbTrigger = null;
  lb.classList.toggle('is-single', images.length < 2);
  lbDots.innerHTML = images.map((_, i) => `<button type="button" aria-label="Фото ${i + 1}" data-lb-dot="${i}"></button>`).join('');
  function lbShow(i) {
    lbIndex = (i + images.length) % images.length;
    lbImg.classList.add('is-swap');
    setTimeout(() => { lbImg.src = images[lbIndex]; lbImg.alt = p.name; lbImg.classList.remove('is-swap'); }, lb.classList.contains('is-open') ? 150 : 0);
    $$('[data-lb-dot]', lbDots).forEach((d) => d.setAttribute('aria-current', String(Number(d.dataset.lbDot) === lbIndex)));
  }
  function lbOpen() {
    lbTrigger = document.activeElement;
    lb.hidden = false;
    lbShow(cur);
    document.documentElement.classList.add('is-locked');
    requestAnimationFrame(() => requestAnimationFrame(() => lb.classList.add('is-open')));
    setTimeout(() => $('[data-lb-close]').focus({ preventScroll: true }), 50);
  }
  function lbClose() {
    lb.classList.remove('is-open');
    document.documentElement.classList.remove('is-locked');
    setTimeout(() => { lb.hidden = true; if (lbTrigger) lbTrigger.focus({ preventScroll: true }); }, 300);
    show(lbIndex);
  }
  zoomBtn.addEventListener('click', lbOpen);
  $('[data-lb-close]').addEventListener('click', lbClose);
  $('[data-lb-prev]').addEventListener('click', () => lbShow(lbIndex - 1));
  $('[data-lb-next]').addEventListener('click', () => lbShow(lbIndex + 1));
  lbDots.addEventListener('click', (e) => { const d = e.target.closest('[data-lb-dot]'); if (d) lbShow(Number(d.dataset.lbDot)); });
  lb.addEventListener('click', (e) => { if (e.target === lb) lbClose(); });
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') lbClose();
    if (e.key === 'ArrowLeft') lbShow(lbIndex - 1);
    if (e.key === 'ArrowRight') lbShow(lbIndex + 1);
  });

  /* ---------- Избранное и «поделиться» ---------- */
  const favBtn = $('[data-pfav]');
  function renderFav() {
    const on = S.store.read('fav').includes(p.art);
    favBtn.setAttribute('aria-pressed', String(on));
    favBtn.setAttribute('aria-label', on ? 'Убрать из избранного' : 'Добавить в избранное');
  }
  favBtn.addEventListener('click', () => {
    const favs = S.store.read('fav');
    const on = !favs.includes(p.art);
    S.store.write('fav', on ? [...favs, p.art] : favs.filter((a) => a !== p.art));
    if (on) { favBtn.classList.remove('is-pop'); void favBtn.offsetWidth; favBtn.classList.add('is-pop'); }
    S.toast(on ? 'Добавлено в избранное' : 'Убрано из избранного');
  });
  $('[data-share]').addEventListener('click', async () => {
    const shareUrl = location.href;
    if (navigator.share) { try { await navigator.share({ title: p.name, text: p.lead, url: shareUrl }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    const ok = await S.copyText(shareUrl);
    S.toast(ok ? 'Ссылка на товар скопирована' : 'Не удалось скопировать ссылку');
  });

  /* ---------- Информация ---------- */
  $('[data-pchips]').innerHTML = (coll ? `<a class="pchip" href="${url('catalog.html')}?coll=${p.coll}"><i style="--c:${coll.color}"></i>Коллекция «${coll.name}»</a>` : '') +
    `<a class="pchip" href="${url('catalog.html')}?cat=${p.cat}">${esc(catName)}</a>`;
  $('[data-pname]').textContent = p.name;
  $('[data-part]').textContent = p.art;
  $('[data-art-copy]').dataset.copy = p.art;
  $('[data-plead]').textContent = p.lead;
  const matShort = p.mats.map((m) => D.MATERIALS[m].replace(/ \(.*\)/, '')).join(', ');
  $('[data-specs4]').innerHTML = [
    ['i-baby', 'Возраст', D.ageOf(p.age).long],
    ['i-atom', 'Материал', matShort],
    ['i-cube', 'В коробе', `${p.box} шт`],
    ['i-layers', 'Упаковка', D.PACKS[p.pack]],
  ].map(([icon, k, v]) => `<div class="spec"><svg class="i"><use href="#${icon}"/></svg><small>${k}</small><b>${esc(v)}</b></div>`).join('');

  const DEV_ICONS = [[/координац|ловкост/i, 'i-footprints'], [/цвет|форм/i, 'i-shapes'], [/звук|слух/i, 'i-music'], [/эмоц/i, 'i-smile'], [/моторик|тактил/i, 'i-hand'],
    [/логик|мышлен|последоват/i, 'i-puzzle'], [/воображ|фантаз/i, 'i-sparkles'], [/прорезыв/i, 'i-baby'], [/чтени|речь|внимани|памят/i, 'i-message'], [/равновес|сенсор/i, 'i-footprints']];
  $('[data-develops]').innerHTML = p.develops.map((d) => {
    const icon = (DEV_ICONS.find(([re]) => re.test(d)) || [0, 'i-sparkles'])[1];
    return `<span class="dev"><svg class="i"><use href="#${icon}"/></svg>${esc(d)}</span>`;
  }).join('');

  if (p.series) {
    const items = P.filter((x) => x.series === p.series);
    if (items.length > 1) {
      $('[data-series]').hidden = false;
      $('[data-series-label]').textContent = p.series === 'pugovka' ? 'Цвет' : 'Другие в серии';
      $('[data-series-list]').innerHTML = items.map((x) => `<a class="series__item" href="${url('product.html?art=' + x.art)}" ${x.art === p.art ? 'aria-current="true"' : ''} data-tip="${esc(x.word)} · ${x.art}"><img src="${x.img}" alt="${esc(x.name)}"></a>`).join('');
    }
  }

  /* ---------- Покупка ---------- */
  const buy = $('[data-buy]');
  const buybar = $('[data-buybar]');
  const inCart = () => S.store.read('cart').find((i) => i.art === p.art);
  let qty = inCart() ? inCart().qty : 1;
  let flying = false;
  $('[data-bb-img]').src = p.img;
  $('[data-bb-name]').textContent = p.name;
  $('[data-bb-art]').textContent = p.art;
  $('[data-bb-box]').textContent = p.box;
  $('[data-bbox]').textContent = p.box;

  function renderBuy(dir) {
    $$('[data-bqty]').forEach((el) => {
      el.textContent = qty;
      if (dir) { el.classList.remove('is-up', 'is-down'); void el.offsetWidth; el.classList.add(dir > 0 ? 'is-up' : 'is-down'); }
    });
    $('[data-bqty-word]').textContent = plural(qty, ['короб', 'короба', 'коробов']);
    const pcs = $('[data-bpcs]');
    pcs.textContent = fmt(qty * p.box);
    if (dir) bump(pcs.parentElement);
    $$('[data-bstep="-1"]').forEach((b) => { b.disabled = qty <= 1; });
    $$('[data-bstep="1"]').forEach((b) => { b.disabled = qty >= 99; });
    const added = !!inCart() || flying;
    buy.classList.toggle('is-added', added);
    buybar.classList.toggle('is-added', added);
  }
  function step(d) {
    const next = Math.min(99, Math.max(1, qty + d));
    if (next === qty) return;
    qty = next;
    const cart = S.store.read('cart');
    const item = cart.find((i) => i.art === p.art);
    if (item) { item.qty = qty; S.store.write('cart', cart); }
    renderBuy(d);
  }
  $$('[data-bstep]').forEach((b) => b.addEventListener('click', () => step(Number(b.dataset.bstep))));
  $$('[data-badd]').forEach((btn) => btn.addEventListener('click', () => {
    if (flying) return;
    if (inCart()) { location.href = url('order.html'); return; }
    flying = true;
    renderBuy();
    S.toast(`Добавлено в заказ: ${qty} ${plural(qty, ['короб', 'короба', 'коробов'])} · ${fmt(qty * p.box)} шт`);
    const from = btn.closest('[data-buybar]') ? $('[data-bb-img]') : mainImg;
    S.flyToCart(from).then(() => {
      const cart = S.store.read('cart').filter((i) => i.art !== p.art);
      cart.push({ art: p.art, name: p.name, qty });
      S.store.write('cart', cart);
      flying = false;
      renderBuy();
    });
  }));
  document.addEventListener('stellar:store', (e) => {
    if (e.detail.key === 'cart') { const it = inCart(); if (it && it.qty !== qty) qty = it.qty; renderBuy(); }
    if (e.detail.key === 'fav') renderFav();
  });
  renderBuy();
  renderFav();

  // липкая панель, когда блок покупки ушёл из вида
  if ('IntersectionObserver' in window) {
    let buyVisible = true, footerVisible = false;
    const upd = () => {
      const show = !buyVisible && !footerVisible && buy.getBoundingClientRect().top < 0;
      buybar.classList.toggle('is-shown', show);
      buybar.setAttribute('aria-hidden', String(!show));
      $$('button', buybar).forEach((b) => { b.tabIndex = show ? 0 : -1; });
    };
    new IntersectionObserver(([en]) => { buyVisible = en.isIntersecting; upd(); }).observe(buy);
    new IntersectionObserver(([en]) => { footerVisible = en.isIntersecting; upd(); }).observe($('.footer'));
  }

  /* ---------- Логистика ---------- */
  function boxSVG(dims, count) {
    const [L, W, H] = dims || [470, 340, 180];
    const c = Math.cos(Math.PI / 6), s = 0.5;
    const VW = 360, VH = 300, m = 44;
    const k = Math.min((VW - 2 * m) / ((L + W) * c), (VH - 2 * m) / (H + (L + W) * s));
    const ox = m + L * c * k + ((VW - 2 * m) - (L + W) * c * k) / 2;
    const oy = VH - m;
    const O = [ox, oy], A = [ox - L * c * k, oy - L * s * k], B = [ox + W * c * k, oy - W * s * k];
    const up = (pt) => [pt[0], pt[1] - H * k];
    const O2 = up(O), A2 = up(A), B2 = up(B), C2 = [A2[0] + W * c * k, A2[1] - W * s * k];
    const pts = (...a) => a.map((q) => q.map((v) => v.toFixed(1)).join(',')).join(' ');
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const top = (u, v) => { const a = lerp(O2, A2, u); return [a[0] + (B2[0] - O2[0]) * v, a[1] + (B2[1] - O2[1]) * v]; };
    const t1 = top(1, 0.5), t0 = top(0, 0.5), t3 = [t0[0], t0[1] + H * k * 0.28];
    const center = [(A[0] + O[0] + O2[0] + A2[0]) / 4, (A[1] + O[1] + O2[1] + A2[1]) / 4];
    const nL = [-0.5 * 18, c * 18], nR = [0.5 * 18, c * 18];
    const dim = (a, b, n, label, ang) => {
      const a1 = [a[0] + n[0], a[1] + n[1]], b1 = [b[0] + n[0], b[1] + n[1]];
      const mid = lerp(a1, b1, 0.5);
      return `<line class="box3d__dim" x1="${a1[0]}" y1="${a1[1]}" x2="${b1[0]}" y2="${b1[1]}"/>` +
        (dims ? `<text class="box3d__label" x="${mid[0] + n[0] * 0.9}" y="${mid[1] + n[1] * 0.9}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${ang} ${mid[0] + n[0] * 0.9} ${mid[1] + n[1] * 0.9})">${label}</text>` : '');
    };
    const hx = B[0] + 18;
    const label = `${count} шт`;
    const bw = 18 + label.length * 8;
    return `<svg class="box3d" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="Транспортный короб ${dims ? dims.join(' на ') + ' мм' : ''}, ${count} штук">
  <polygon class="box3d__face box3d__left" points="${pts(A, O, O2, A2)}" fill="#2A2D33" stroke="#1C1E23"/>
  <polygon class="box3d__face box3d__right" points="${pts(O, B, B2, O2)}" fill="#33363D" stroke="#1C1E23"/>
  <polygon class="box3d__face box3d__top" points="${pts(A2, O2, B2, C2)}" fill="#3A3D44" stroke="#1C1E23"/>
  <polyline class="box3d__tape" points="${pts(t1, t0, t3)}"/>
  ${dim(A, O, nL, `${L} мм`, 30)}
  ${dim(O, B, nR, `${W} мм`, -30)}
  <line class="box3d__dim" x1="${hx}" y1="${B[1]}" x2="${hx}" y2="${B2[1]}"/>
  ${dims ? `<text class="box3d__label" x="${hx + 14}" y="${(B[1] + B2[1]) / 2}" text-anchor="middle" dominant-baseline="middle" transform="rotate(90 ${hx + 14} ${(B[1] + B2[1]) / 2})">${H} мм</text>` : ''}
  <g class="box3d__badge"><rect x="${center[0] - bw / 2}" y="${center[1] - 15}" width="${bw}" height="30" rx="8"/><text x="${center[0]}" y="${center[1] + 1}" text-anchor="middle" dominant-baseline="middle">${label}</text></g>
</svg>`;
  }
  const boxWrap = $('[data-box3d]');
  boxWrap.innerHTML = boxSVG(p.carton, p.box);
  const svg = $('svg', boxWrap);
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { svg.classList.add('is-in'); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(boxWrap);
  } else svg.classList.add('is-in');

  const copyVal = (v) => `<span class="copyable"><b>${v}</b><button class="copy-btn" type="button" data-copy="${v}" aria-label="Скопировать"><svg class="i"><use href="#i-copy"/></svg></button></span>`;
  $('[data-ltiles]').innerHTML = [
    ['i-cube', 'Транспортный короб', p.carton ? copyVal(D.dims(p.carton)) : '<b>по запросу</b>'],
    ['i-layers', 'Объём короба', p.volume ? copyVal(fmt(p.volume, 3) + ' м³') : '<b>по запросу</b>'],
    ['i-hash', 'Вложение', `<b>${p.box} шт в коробе</b>`],
    ['i-ruler', 'Изделие в упаковке', p.item ? copyVal(D.dims(p.item)) : '<b>по запросу</b>'],
    ['i-layers', 'Упаковка', `<b>${D.PACKS[p.pack]}</b>`],
    ['i-atom', 'Материал', `<b>${esc(matShort)}</b>`],
  ].map(([icon, k, v]) => `<div class="ltile"><span class="ltile__ico"><svg class="i"><use href="#${icon}"/></svg></span><small>${k}</small>${v}</div>`).join('');

  /* ---------- Вкладки и характеристики ---------- */
  $('[data-pdesc]').innerHTML = p.desc.map((t) => `<p>${esc(t)}</p>`).join('');
  const specRows = [
    ['Артикул', p.art],
    ['Коллекция', coll ? `<a href="${url('catalog.html')}?coll=${p.coll}">${coll.name}</a>` : '—'],
    ['Категория', `<a href="${url('catalog.html')}?cat=${p.cat}">${esc(catName)}</a>`],
    ['Возраст', D.ageOf(p.age).long],
    ['Материал', esc(p.mats.map((m) => D.MATERIALS[m]).join(', '))],
    ['Упаковка', D.PACKS[p.pack]],
    ['Размер в упаковке', D.dims(p.item)],
    ['Транспортный короб', D.dims(p.carton)],
    ['В коробе', `${p.box} шт`],
    ['Производство', 'Россия, Ростов-на-Дону'],
  ];
  $('[data-spec-table]').innerHTML = specRows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

  const tabs = $('[data-ptabs]');
  const ink = $('.ptabs__ink', tabs);
  const moveInk = (b, instant) => {
    if (instant) ink.style.transition = 'none';
    ink.style.width = b.offsetWidth + 'px';
    ink.style.transform = `translateX(${b.offsetLeft}px)`;
    if (instant) { void ink.offsetWidth; ink.style.transition = ''; }
  };
  $$('[data-tab]', tabs).forEach((b) => b.addEventListener('click', () => {
    $$('[data-tab]', tabs).forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    moveInk(b);
    const t = b.dataset.tab;
    if (t === 'specs') {
      const card = $('[data-specs-card]');
      card.classList.remove('is-flash'); void card.offsetWidth; card.classList.add('is-flash');
      const r = card.getBoundingClientRect();
      if (r.top < 90 || r.bottom > innerHeight) card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      return;
    }
    $$('[data-pane]').forEach((pane) => { pane.hidden = pane.dataset.pane !== t; });
  }));
  const syncInk = () => moveInk($('[aria-selected="true"]', tabs) || $('[data-tab]', tabs), true);
  syncInk();
  window.addEventListener('resize', syncInk);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncInk);

  /* ---------- Похожие ---------- */
  const relTitle = $('[data-related-title]');
  let rel = coll ? P.filter((x) => x.coll === p.coll && x.art !== p.art) : [];
  relTitle.textContent = coll && rel.length >= 3 ? `Ещё из коллекции «${coll.name}»` : 'Похожие товары';
  if (rel.length < 3) rel = rel.concat(P.filter((x) => x.art !== p.art && !rel.includes(x) && x.cat === p.cat));
  if (rel.length < 4) rel = rel.concat(P.filter((x) => x.art !== p.art && !rel.includes(x)).sort((a, b) => b.pop - a.pop));
  rel = rel.slice(0, 8);
  const relWrap = $('[data-rel]');
  relWrap.innerHTML = rel.map(D.cardHTML).join('');
  S.initProductCards(relWrap);
  const prev = $('[data-rel-prev]');
  const next = $('[data-rel-next]');
  const relStep = () => (relWrap.firstElementChild ? relWrap.firstElementChild.offsetWidth + 16 : 300);
  const relState = () => {
    prev.disabled = relWrap.scrollLeft <= 4;
    next.disabled = relWrap.scrollLeft + relWrap.clientWidth >= relWrap.scrollWidth - 4;
    $('.slider-nav').hidden = relWrap.scrollWidth <= relWrap.clientWidth + 4;
  };
  prev.addEventListener('click', () => relWrap.scrollBy({ left: -relStep(), behavior: reduceMotion ? 'auto' : 'smooth' }));
  next.addEventListener('click', () => relWrap.scrollBy({ left: relStep(), behavior: reduceMotion ? 'auto' : 'smooth' }));
  relWrap.addEventListener('scroll', relState, { passive: true });
  window.addEventListener('resize', relState);
  relState();

  /* ---------- Недавно смотрели ---------- */
  const recent = S.store.read('recent').filter((a) => a !== p.art && D.byArt(a));
  if (recent.length) {
    $('[data-recent-section]').hidden = false;
    $('[data-recent]').innerHTML = recent.slice(0, 6).map((a) => {
      const x = D.byArt(a);
      return `<a class="rmini" href="${url('product.html?art=' + x.art)}"><span class="rmini__img"><img src="${x.img}" alt="" loading="lazy"></span><span><b>${esc(x.name)}</b><small>Арт. ${x.art}</small></span></a>`;
    }).join('');
  }
  S.store.write('recent', [p.art].concat(recent).slice(0, 12));

  /* =========================================================
     Материалы для маркетплейсов: генерация файлов в браузере
     ========================================================= */
  const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const canvasBlob = (cv, type = 'image/jpeg', q = 0.92) => new Promise((res) => cv.toBlob(res, type, q));
  function fitRect(iw, ih, bw, bh) { const k = Math.min(bw / iw, bh / ih); return [iw * k, ih * k]; }

  // фото на белом фоне 900×1200 (формат 3:4 для WB и Ozon)
  async function photoJPG(src) {
    const img = await loadImg(src);
    const cv = document.createElement('canvas');
    cv.width = 900; cv.height = 1200;
    const g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, 900, 1200);
    const [w, h] = fitRect(img.naturalWidth, img.naturalHeight, 760, 900);
    g.drawImage(img, (900 - w) / 2, (1200 - h) / 2, w, h);
    return canvasBlob(cv);
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function wrap(g, text, maxW) {
    const words = text.split(' '); const lines = []; let line = '';
    words.forEach((w) => { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line);
    return lines;
  }

  // инфографика 900×1200
  async function infographic(scale = 1) {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const [img, logo] = await Promise.all([loadImg(p.img), loadImg('assets/img/logo-mark.png').catch(() => null)]);
    const W = 900 * scale, H = 1200 * scale;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.scale(scale, scale);
    g.fillStyle = coll ? coll.tint : '#F2EFEB'; g.fillRect(0, 0, 900, 1200);
    // слово-подложка
    g.fillStyle = 'rgba(255,255,255,.9)';
    let fs = 230;
    g.font = `900 ${fs}px Onest, sans-serif`;
    const wtxt = p.word.toUpperCase();
    while (g.measureText(wtxt).width > 830 && fs > 60) { fs -= 6; g.font = `900 ${fs}px Onest, sans-serif`; }
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillText(wtxt, 450, 150 + fs * 0.8);
    // логотип
    g.fillStyle = '#fff'; roundRect(g, 40, 40, 190, 70, 18); g.fill();
    if (logo) { const [lw, lh] = fitRect(logo.naturalWidth, logo.naturalHeight, 150, 46); g.drawImage(logo, 135 - lw / 2, 75 - lh / 2, lw, lh); }
    // возраст
    const ageText = D.ageOf(p.age).label;
    g.font = '700 30px Onest, sans-serif';
    const aw = g.measureText(ageText).width + 56;
    g.fillStyle = '#D63F2A'; roundRect(g, 860 - aw, 40, aw, 70, 18); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ageText, 860 - aw / 2, 76);
    // фото
    g.save();
    g.shadowColor = 'rgba(80,40,30,.22)'; g.shadowBlur = 40; g.shadowOffsetY = 26;
    const [w, h] = fitRect(img.naturalWidth, img.naturalHeight, 680, 560);
    g.drawImage(img, 450 - w / 2, 250 + (560 - h) / 2, w, h);
    g.restore();
    // нижняя плашка
    g.fillStyle = '#fff'; roundRect(g, 40, 850, 820, 310, 36); g.fill();
    g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = '#1C1E23';
    g.font = '700 44px Onest, sans-serif';
    const nameLines = wrap(g, p.name, 740).slice(0, 2);
    nameLines.forEach((l, i) => g.fillText(l, 80, 915 + i * 52));
    let y = 915 + nameLines.length * 52 + 18;
    g.font = '500 28px Onest, sans-serif';
    p.develops.slice(0, nameLines.length > 1 ? 2 : 3).forEach((d) => {
      g.fillStyle = '#F0503A'; g.beginPath(); g.arc(92, y - 9, 8, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2A2D33'; g.fillText(d, 116, y);
      y += 44;
    });
    // плашки снизу
    const chips = [matShort, 'Сделано в России'];
    let x = 80;
    g.font = '600 22px Onest, sans-serif';
    chips.forEach((t) => {
      const cw = g.measureText(t).width + 36;
      g.fillStyle = '#F5F3F0'; roundRect(g, x, 1092, cw, 44, 12); g.fill();
      g.fillStyle = '#1C1E23'; g.textBaseline = 'middle'; g.fillText(t, x + 18, 1115); g.textBaseline = 'alphabetic';
      x += cw + 12;
    });
    return cv;
  }

  function csvBlob() {
    const cell = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const head = ['Артикул продавца', 'Наименование', 'Бренд', 'Категория', 'Описание', 'Возраст', 'Материал', 'Упаковка', 'Габариты упаковки, мм', 'Количество в коробе, шт', 'Страна производства', 'Развивает'];
    const row = [p.art, p.name, 'Стеллар', catName, p.desc.join(' '), D.ageOf(p.age).long, p.mats.map((m) => D.MATERIALS[m]).join(', '), D.PACKS[p.pack], p.item ? p.item.join('x') : '', p.box, 'Россия', p.develops.join(', ')];
    const text = '﻿' + [head, row].map((r) => r.map(cell).join(';')).join('\r\n');
    return new Blob([text], { type: 'text/csv;charset=utf-8' });
  }

  // ZIP без сжатия (store) — без сторонних библиотек
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = (c >>> 8) ^ CRC[(c ^ b[i]) & 0xFF]; return (c ^ 0xFFFFFFFF) >>> 0; };
  async function makeZip(files) {
    const enc = new TextEncoder();
    const now = new Date();
    const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const parts = []; const central = []; let offset = 0;
    for (const f of files) {
      const data = new Uint8Array(await f.blob.arrayBuffer());
      const name = enc.encode(f.name);
      const crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(lh.buffer, name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
      central.push(ch.buffer, name);
      offset += 30 + name.length + data.length;
    }
    const cdSize = central.reduce((s, b) => s + (b.byteLength || b.length), 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
  }

  function save(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const base = `stellar-${p.art}`;
  const photoFiles = async () => Promise.all(images.map(async (src, i) => ({ name: `${base}-foto-${i + 1}.jpg`, blob: await photoJPG(src) })));

  async function run(el, job) {
    if (el.classList.contains('is-loading')) return;
    el.classList.add('is-loading');
    try { await job(); } catch (e) { S.toast('Не удалось подготовить файл'); }
    el.classList.remove('is-loading');
  }
  $('[data-dl="photos"]').addEventListener('click', (e) => run(e.currentTarget.closest('.mpcard'), async () => {
    const files = await photoFiles();
    if (files.length === 1) save(files[0].blob, files[0].name);
    else save(await makeZip(files), `${base}-foto.zip`);
    S.toast(`Фото готовы: ${files.length} × 900×1200, белый фон`);
  }));
  $('[data-dl="info"]').addEventListener('click', (e) => run(e.currentTarget, async () => {
    save(await canvasBlob(await infographic()), `${base}-infografika.jpg`);
    S.toast('Инфографика сохранена');
  }));
  $('[data-dl="csv"]').addEventListener('click', (e) => run(e.currentTarget, async () => {
    save(csvBlob(), `${base}-opisanie-wb-ozon.csv`);
    S.toast('Описание для WB и Ozon сохранено');
  }));
  const allBtn = $('[data-dl-all]');
  allBtn.addEventListener('click', async () => {
    if (allBtn.classList.contains('is-loading')) return;
    allBtn.classList.add('is-loading');
    try {
      const files = await photoFiles();
      files.push({ name: `${base}-infografika.jpg`, blob: await canvasBlob(await infographic()) });
      files.push({ name: `${base}-opisanie-wb-ozon.csv`, blob: csvBlob() });
      files.push({ name: 'README.txt', blob: new Blob([`${p.name}, арт. ${p.art}\r\nООО «Стеллар», Ростов-на-Дону · sale@stellar.ru · +7 (863) 290-31-16\r\n\r\nФото 900×1200 на белом фоне подходят для Wildberries и Ozon.\r\nОписание — в CSV (разделитель «;», кодировка UTF-8).\r\nСертификаты: https://www.stellar.ru — раздел «Сертификаты».\r\n`], { type: 'text/plain' }) });
      save(await makeZip(files), `${base}-materialy.zip`);
      S.toast(`Архив готов: ${files.length} ${plural(files.length, ['файл', 'файла', 'файлов'])}`);
    } catch (e) { S.toast('Не удалось собрать архив'); }
    allBtn.classList.remove('is-loading');
  });

  // превью: фото на белом + миниатюра инфографики
  const mpThumbs = $('[data-mp-thumbs]');
  mpThumbs.innerHTML = images.slice(0, 3).map((src) => `<span class="mpthumb"><img src="${src}" alt=""></span>`).join('');
  $('[data-photo-count]').textContent = `${images.length} фото + инфографика`;
  infographic(0.25).then((cv) => {
    mpThumbs.insertAdjacentHTML('beforeend', `<button class="mpthumb mpthumb--more" type="button" aria-label="Скачать инфографику"><img src="${cv.toDataURL('image/jpeg', 0.85)}" alt=""><span>Инфографика</span></button>`);
    $('.mpthumb--more', mpThumbs).addEventListener('click', () => $('[data-dl="info"]').click());
  }).catch(() => {});

  if (!p.video) {
    const v = $('[data-video-card]');
    v.href = url('contacts.html') + '#ask';
    v.removeAttribute('target');
    $('[data-video-sub]').textContent = 'Снимем обзор для партнёра по запросу';
    $('[data-video-dl]').innerHTML = 'Запросить <svg class="i"><use href="#i-arrow-right"/></svg>';
  }
})();
