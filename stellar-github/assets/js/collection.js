/* =========================================================
   Стеллар — страница коллекции: collection.html?c=zefir
   ========================================================= */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const S = window.Stellar || {};
  const D = window.STELLAR_DATA || {};
  const P = window.STELLAR_PRODUCTS || [];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c; };

  // Описания коллекций. total — позиций в линейке по каталогу 2025 (в демо-данных сайта их меньше).
  const INFO = {
    zefir: {
      total: 24, palette: 'Пастельная палитра',
      desc: 'Нежные пастельные оттенки и мягкие формы: машинки, каталки и погремушки премиального вида. Коллекция смотрится цельно на полке и хорошо продаётся в подарочном сегменте.',
      short: 'Пастельные машинки и каталки премиального вида',
      imgs: ['assets/img/toys/zefir-truck-01472.webp', 'assets/img/toys/katalka-zaika-03228.webp', 'assets/img/toys/zefir-plane-02636.webp'],
      tip: ['i-tag', 'Подарочный сегмент', 'Пастельные цвета хорошо смотрятся в подарочных подборках'],
    },
    biskvit: {
      total: 6, palette: 'Молочная гамма',
      desc: 'Погремушки-прорезыватели в тёплой молочной гамме — мягкие к дёснам и приятные в руке. Деликатные цвета нравятся родителям и хорошо смотрятся в наборах к выписке.',
      short: 'Погремушки-прорезыватели в тёплой молочной гамме',
      imgs: ['assets/img/toys/biskvit-butterfly-02199.webp', 'assets/img/toys/biskvit-rattle-02130.webp', 'assets/img/toys/akrobatik-02195.webp'],
      tip: ['i-baby', 'Отдел первого года', 'Ставьте рядом с товарами для новорождённых — их берут в подарок'],
    },
    karamel: {
      total: 19, palette: 'Яркие цвета',
      desc: 'Сочные цвета и прозрачные детали: юлы с шариками, погремушки, неваляшки и подвески. Яркая линейка, которая сама привлекает внимание на полке.',
      short: 'Сочные цвета и прозрачные детали',
      imgs: ['assets/img/toys/karamel-car-02623.webp', 'assets/img/toys/karamel-top-03854.webp', 'assets/img/toys/karusel-02110.webp'],
      tip: ['i-zap', 'Импульсная покупка', 'Яркие юлы и погремушки хорошо продаются в прикассовой зоне'],
    },
    cvet: {
      total: 17, palette: 'Совместно с «Цветняшками»',
      desc: 'Совместная линейка с брендом «Цветняшки»: пирамидки, сортеры и кубики-трансформеры. Знакомые детям герои помогают продавать без дополнительной рекламы.',
      short: 'Совместная линейка с брендом «Цветняшки»',
      imgs: ['assets/img/toys/vedro-03300.webp', 'assets/img/toys/piramidka-02179.webp', 'assets/img/toys/kubik-00881.webp'],
      tip: ['i-sparkles', 'Узнаваемые герои', 'Персонажи мультсериала знакомы детям — коллекция продаёт себя сама'],
    },
  };
  const u = new URLSearchParams(location.search);
  let key = (u.get('c') || u.get('coll') || 'zefir').toLowerCase();
  if (key === 'cvetnyashki') key = 'cvet';
  if (!INFO[key] || !D.COLLECTIONS || !D.COLLECTIONS[key]) key = 'zefir';
  const C = D.COLLECTIONS[key];
  const I = INFO[key];
  const items = P.filter((p) => p.coll === key);

  const ageText = (m) => (m <= 0 ? 'с рождения' : m < 12 ? `от ${m} мес` : m < 24 ? 'от 1 года' : `от ${Math.floor(m / 12)} лет`);
  const minAge = items.length ? Math.min(...items.map((p) => p.age || 0)) : 0;

  /* ---------- Hero ---------- */
  document.title = `Коллекция «${C.name}» — игрушки «Стеллар» оптом`;
  const hero = $('[data-chero]');
  hero.style.setProperty('--tint', C.tint);
  const word = $('[data-c-word]');
  word.textContent = C.name;
  const fitWord = () => { const w = hero.clientWidth * (innerWidth > 1280 ? 0.56 : 0.9); word.style.fontSize = Math.min(230, Math.floor(w / (C.name.length * 0.74))) + 'px'; };
  fitWord(); window.addEventListener('resize', fitWord);
  $('[data-c-name]').textContent = C.name;
  $('[data-c-q]').textContent = `«${C.name}»`;
  $('[data-c-desc]').textContent = I.desc;
  $('[data-c-facts]').innerHTML = [`${I.total} ${plural(I.total, 'позиция', 'позиции', 'позиций')}`, ageText(minAge), I.palette].map((t) => `<span class="tag tag--white">${t}</span>`).join('');
  $$('[data-c-img]').forEach((img) => { img.src = I.imgs[+img.dataset.cImg]; });
  $('[data-c-more]').href = S.href('catalog.html?coll=' + key);
  $('[data-c-more]').innerHTML = `Смотреть «${C.name}» в каталоге<svg class="i btn__arrow"><use href="#i-arrow-right"/></svg>`;
  const tip = I.tip;
  $('[data-c-tip-ico] use').setAttribute('href', '#' + tip[0]);
  $('[data-c-tip-t]').textContent = tip[1];
  $('[data-c-tip-d]').textContent = tip[2];

  /* ---------- Фото коллекции: галерея в окне ---------- */
  const photos = $('[data-c-photos]');
  const lb = $('[data-c-lb]');
  if (items.length) {
    photos.dataset.lightbox = items[0].img;
    photos.dataset.caption = `${items[0].name} · арт. ${items[0].art}`;
    lb.innerHTML = items.slice(1).map((p) => `<span data-lightbox="${p.img}" data-lb-group="coll" data-caption="${D.esc(p.name)} · арт. ${p.art}"></span>`).join('');
  } else photos.hidden = true;

  /* ---------- Вся коллекция в заказ ---------- */
  const addBtn = $('[data-c-add]');
  addBtn.addEventListener('click', async () => {
    const cart = S.store.read('cart');
    const missing = items.filter((p) => !cart.some((i) => i.art === p.art));
    if (!missing.length) { S.toast(`Вся коллекция «${C.name}» уже в заказе`, 3500, { label: 'К заказу', fn: () => { location.href = S.href('order.html'); } }); return; }
    addBtn.classList.add('is-loading');
    const imgs = missing.map((p) => $(`.pcard[data-art="${p.art}"] .pcard__img img`)).filter((img) => { if (!img) return false; const r = img.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }).slice(0, 6);
    if (!imgs.length) {
      const heroImgs = $$('.chero__toy');
      await Promise.all(heroImgs.map((img, i) => new Promise((r) => setTimeout(() => (S.flyToCart ? S.flyToCart(img) : Promise.resolve()).then(r), i * 120))));
    } else await Promise.all(imgs.map((img, i) => new Promise((r) => setTimeout(() => S.flyToCart(img).then(r), i * 110))));
    missing.forEach((p) => cart.push({ art: p.art, name: p.name, qty: 1 }));
    S.store.write('cart', cart);
    addBtn.classList.remove('is-loading');
    S.toast(`В заказ добавлено ${missing.length} ${plural(missing.length, 'позиция', 'позиции', 'позиций')} по 1 коробу`, 5000, { label: 'К заказу', fn: () => { location.href = S.href('order.html'); } });
  });

  /* ---------- Товары: фильтр и сортировка ---------- */
  const grid = $('[data-c-grid]');
  const chipsBox = $('[data-c-chips]');
  const subs = [];
  items.forEach((p) => { if (!subs.includes(p.sub)) subs.push(p.sub); });
  chipsBox.innerHTML = `<button class="cchip" type="button" aria-pressed="true" data-sub="all">Все<sup>${items.length}</sup></button>` +
    subs.map((s) => `<button class="cchip" type="button" aria-pressed="false" data-sub="${D.esc(s)}">${D.esc(s)}<sup>${items.filter((p) => p.sub === s).length}</sup></button>`).join('');
  if (subs.length < 2) chipsBox.innerHTML = chipsBox.firstElementChild.outerHTML;
  let sub = 'all', sort = 'pop';
  const SORTS = {
    pop: (a, b) => b.pop - a.pop,
    new: (a, b) => (b.tags.includes('new') - a.tags.includes('new')) || b.pop - a.pop,
    art: (a, b) => a.art.localeCompare(b.art),
    box: (a, b) => b.box - a.box,
  };
  function render(animate) {
    const list = items.filter((p) => sub === 'all' || p.sub === sub).sort(SORTS[sort]);
    grid.innerHTML = list.map(D.cardHTML).join('');
    S.initProductCards(grid);
    if (animate && !reduceMotion) $$('.pcard', grid).forEach((c, i) => { c.style.setProperty('--i', i); c.classList.add('is-pop'); });
  }
  chipsBox.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sub]');
    if (!b || b.getAttribute('aria-pressed') === 'true') return;
    $$('[data-sub]', chipsBox).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    sub = b.dataset.sub; render(true);
  });
  const sortEl = $('[data-c-sort]');
  if (sortEl) {
    S.initSelect(sortEl);
    sortEl.addEventListener('select:change', (e) => { sort = e.detail.value; render(true); });
  }
  render();

  /* ---------- Другие коллекции ---------- */
  $('[data-c-other]').innerHTML = Object.keys(INFO).filter((k) => k !== key).map((k) => {
    const c = D.COLLECTIONS[k], it = INFO[k];
    return `<a class="ocoll" href="${S.href('collection.html')}?c=${k}" style="--tint:${c.tint}"><span class="ocoll__word">${c.name}</span><img src="${it.imgs[0]}" alt="" loading="lazy"><p>${it.short}</p><span class="link-action">${it.total} ${plural(it.total, 'позиция', 'позиции', 'позиций')}<svg class="i"><use href="#i-arrow-right"/></svg></span></a>`;
  }).join('');
})();
