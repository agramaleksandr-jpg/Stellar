/* =========================================================
   Стеллар — страница поиска: search.html?q=юла
   Товары — из window.STELLAR_PRODUCTS, разделы — из индекса сайта и новостей.
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
  const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[«»"]/g, '');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // простая «основа» слова, чтобы «юлы», «юлу», «юла» находили друг друга
  const stem = (w) => (w.length > 4 ? w.replace(/(ами|ями|ов|ев|ей|ах|ях|ом|ем|ой|ий|ый|ая|яя|ое|ее|ые|ие|ую|юю|а|я|ы|и|у|ю|е|о)$/, '') : w.replace(/[аяыиуюео]$/, '') || w);
  const terms = (q) => norm(q).split(/[\s,.;:!?()-]+/).filter(Boolean).map(stem);
  const match = (text, ts) => { const t = norm(text); return ts.every((w) => t.includes(w)); };
  const hl = (text, ts) => {
    let out = esc(text);
    ts.filter((w) => w.length > 1).forEach((w) => {
      const re = new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/е/g, '[её]') + ')', 'gi');
      out = out.replace(re, '<mark>$1</mark>');
    });
    return out;
  };

  const KINDS = {
    products: { label: 'Товары' },
    cert: { label: 'Сертификаты', icon: 'i-file-check', tag: 'Сертификат' },
    video: { label: 'Видео', icon: 'i-video', tag: 'Видео' },
    news: { label: 'Новости', icon: 'i-book', tag: 'Новость' },
    expo: { label: 'Выставки', icon: 'i-calendar', tag: 'Выставка' },
    award: { label: 'Награды', icon: 'i-award', tag: 'Награда' },
    page: { label: 'Разделы', icon: 'i-arrow-right', tag: 'Раздел' },
  };
  const KMAP = { 'Сертификат': 'cert', 'Видео': 'video', 'Выставка': 'expo', 'Награда': 'award' };
  const fmtDate = (d) => d.split('-').reverse().join('.');
  const SITE = (window.STELLAR_SITE_INDEX || []).map((x) => ({ kind: KMAP[x.k] || 'page', title: x.t, href: x.h, meta: x.m }))
    .concat((window.STELLAR_NEWS || []).map((n) => ({ kind: 'news', title: n.title, href: 'news-item.html?id=' + n.id, meta: fmtDate(n.date) + ' · Новости', text: n.lead })))
    .concat([
      ['Условия сотрудничества', 'partners.html', 'Партнёрам'], ['Где купить', 'where-to-buy.html', 'Партнёрам'], ['Материалы для скачивания', 'materials.html', 'Партнёрам'],
      ['О компании', 'about.html', 'Компания'], ['Производство', 'about.html#production', 'Компания'], ['Изготовление пресс-форм', 'molds.html', 'Услуги'],
      ['Вакансии', 'vacancies.html', 'Компания'], ['Контакты', 'contacts.html', 'Компания'], ['Вход для партнёров', 'login.html', 'Кабинет'],
      ['Коллекция «Зефир»', 'collection.html?c=zefir', 'Коллекции'], ['Коллекция «Бисквит»', 'collection.html?c=biskvit', 'Коллекции'],
      ['Коллекция «Карамель»', 'collection.html?c=karamel', 'Коллекции'], ['Коллекция «Цветняшки»', 'collection.html?c=cvet', 'Коллекции'],
    ].map(([t, h, m]) => ({ kind: 'page', title: t, href: h, meta: m })));

  const form = $('[data-bigsearch]');
  const input = $('[data-bs-input]');
  const clear = $('[data-bs-clear]');
  const countEl = $('[data-s-count]');
  const tabsEl = $('[data-s-tabs]');
  const hint = $('[data-s-hint]');
  const grid = $('[data-s-products]');
  const more = $('[data-s-more]');
  const otherWrap = $('[data-s-other-wrap]');
  const otherTitle = $('[data-s-other-title]');
  const other = $('[data-s-other]');
  const empty = $('[data-s-empty]');
  const PER = 8;
  let res = { products: [], site: [] }, tab = 'all', shown = PER, ts = [];

  $('[data-s-popular]').innerHTML = [['Каталки', 'каталка'], ['Неваляшки', 'неваляшка'], ['Юлы', 'юла'], ['Пирамидки', 'пирамидка'], ['Мозаики', 'мозаика'], ['Сертификаты', 'сертификат']]
    .map(([t, q]) => `<a class="btn btn--s" href="${S.href('search.html')}?q=${encodeURIComponent(q)}">${t}</a>`).join('');

  function search(q) {
    ts = terms(q);
    if (!ts.length) return { products: [], site: [] };
    const products = P.filter((p) => match([p.name, p.art, p.sub, p.word, (D.CATEGORIES || {})[p.cat], p.coll ? D.COLLECTIONS[p.coll].name : ''].join(' '), ts))
      .sort((a, b) => (norm(b.name).startsWith(ts[0]) - norm(a.name).startsWith(ts[0])) || b.pop - a.pop);
    const site = SITE.filter((x) => match(x.title + ' ' + (x.text || '') + ' ' + KINDS[x.kind].label, ts));
    return { products, site };
  }

  function tabsHTML() {
    const counts = { all: res.products.length + res.site.length, products: res.products.length };
    Object.keys(KINDS).filter((k) => k !== 'products').forEach((k) => { counts[k] = res.site.filter((x) => x.kind === k).length; });
    const order = ['all', 'products', 'cert', 'video', 'news', 'expo', 'award', 'page'];
    return order.filter((k) => k === 'all' || counts[k]).map((k) =>
      `<button class="stab" type="button" role="tab" aria-selected="${k === tab}" data-tab="${k}">${k === 'all' ? 'Все' : KINDS[k].label}<sup>${counts[k]}</sup></button>`).join('');
  }

  function hitHTML(x, i) {
    const k = KINDS[x.kind];
    const ext = x.href.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
    return `<a class="shit" href="${S.href(x.href)}"${ext} style="--i:${i}"><span class="ico-box"><svg class="i"><use href="#${k.icon}"/></svg></span><span class="tag">${k.tag}</span><b title="${esc(x.title)}">${hl(x.title, ts)}</b><small>${esc(x.meta || '')}</small></a>`;
  }

  function render(animate) {
    const total = res.products.length + res.site.length;
    const q = input.value.trim();
    empty.hidden = !(q && !total);
    tabsEl.innerHTML = q && total ? tabsHTML() : '';
    countEl.innerHTML = !q ? 'Введите название, артикул или раздел — например, «юла» или «03850»'
      : total ? `Найдено ${total} ${plural(total, 'результат', 'результата', 'результатов')} по запросу <b>«${esc(q)}»</b>` : `По запросу <b>«${esc(q)}»</b> ничего не нашлось`;
    hint.hidden = !(q && total && !/^\d{3,}$/.test(q));
    const showProducts = tab === 'all' || tab === 'products';
    const list = showProducts ? res.products.slice(0, shown) : [];
    grid.innerHTML = list.map(D.cardHTML).join('');
    $$('.pcard__name a', grid).forEach((a) => { a.innerHTML = hl(a.textContent, ts); });
    S.initProductCards(grid);
    if (animate && !reduceMotion) $$('.pcard', grid).forEach((c, i) => { c.style.setProperty('--i', i % PER); c.classList.add('is-pop'); });
    const left = showProducts ? res.products.length - list.length : 0;
    more.hidden = left <= 0;
    more.textContent = `Показать ещё ${Math.min(left, PER)} ${plural(Math.min(left, PER), 'товар', 'товара', 'товаров')}`;
    const site = tab === 'all' ? res.site : tab === 'products' ? [] : res.site.filter((x) => x.kind === tab);
    otherWrap.hidden = !site.length;
    otherTitle.textContent = tab === 'all' && res.products.length ? 'В других разделах' : (KINDS[tab] && tab !== 'products' ? KINDS[tab].label : 'Разделы сайта');
    other.innerHTML = site.map(hitHTML).join('');
  }

  function run(q, push) {
    const v = q.trim();
    input.value = v;
    clear.hidden = !v;
    // точный артикул — сразу в карточку
    if (/^\d{5}$/.test(v) && D.byArt && D.byArt(v) && push !== 'init-noredirect') { location.href = S.href('product.html?art=' + v); return; }
    res = search(v); tab = 'all'; shown = PER;
    document.title = v ? `«${v}» — поиск по сайту «Стеллар»` : 'Поиск по сайту — «Стеллар»';
    if (push) {
      const u = new URL(location.href);
      if (v) u.searchParams.set('q', v); else u.searchParams.delete('q');
      history.replaceState(null, '', u);
    }
    render(true);
  }

  tabsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b || b.dataset.tab === tab) return;
    tab = b.dataset.tab; shown = PER; render(true);
  });
  more.addEventListener('click', () => { shown += PER; render(false); });
  form.addEventListener('submit', (e) => { e.preventDefault(); run(input.value, true); input.blur(); });
  let t;
  input.addEventListener('input', () => { clear.hidden = !input.value; clearTimeout(t); t = setTimeout(() => { if (!/^\d{1,5}$/.test(input.value.trim())) run(input.value, true); }, 250); });
  clear.addEventListener('click', () => { input.value = ''; run('', true); input.focus(); });

  run(new URLSearchParams(location.search).get('q') || '', false);
  if (!input.value) input.focus();
})();
