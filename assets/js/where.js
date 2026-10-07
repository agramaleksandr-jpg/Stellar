/* =========================================================
   Где купить: вкладки, список городов, схема-карта с пинами,
   поиск и определение города, карточки дистрибьюторов
   ========================================================= */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const S = window.Stellar || {};
  const finder = $('[data-finder]');
  if (!finder) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c; };
  const maps = (q) => 'https://yandex.ru/maps/?text=' + encodeURIComponent(q);

  /* ---------- Данные ----------
     Города: координаты (для «Определить город») и положение на схеме (x, y — в % от схемы 824×760).
     Магазины и дистрибьюторы — из макета; заменить выгрузкой клиента. */
  const CITIES = {
    'Барнаул': { lat: 53.35, lon: 83.78, x: 57.0, y: 56.6 },
    'Белгород': { lat: 50.6, lon: 36.59, x: 16.3, y: 55.3 },
    'Бийск': { lat: 52.54, lon: 85.21, x: 60.7, y: 60.5 },
    'Благовещенск': { lat: 50.29, lon: 127.53, x: 85.0, y: 47.4 },
    'Владивосток': { lat: 43.12, lon: 131.89, x: 92.2, y: 59.2 },
    'Волгоград': { lat: 48.71, lon: 44.51, x: 25.5, y: 58.4 },
    'Воронеж': { lat: 51.67, lon: 39.18, x: 21.2, y: 50.7 },
    'Екатеринбург': { lat: 56.84, lon: 60.61, x: 43.7, y: 43.4 },
    'Железноводск': { lat: 44.14, lon: 43.03, x: 20.5, y: 70.0 },
    'Иркутск': { lat: 52.29, lon: 104.3, x: 71.6, y: 53.9 },
    'Калининград': { lat: 54.71, lon: 20.51, x: 7.3, y: 39.5 },
    'Киров': { lat: 58.6, lon: 49.66, x: 34.0, y: 39.5 },
    'Краснодар': { lat: 45.04, lon: 38.98, x: 14.6, y: 65.8 },
  };
  const FACTORY = { name: 'Ростов-на-Дону', lat: 47.22, lon: 39.72, x: 19.6, y: 61.2 };

  // магазины: [название, описание]; count — число магазинов в городе по данным макета
  const SHOPS = {
    'Екатеринбург': { count: 5, list: [['«Умные игрушки»', 'Сеть магазинов развивающих игрушек'], ['«Крошка-Антошка»', 'Сеть магазинов детских товаров'], ['«RichFamily»', 'Сеть детских гипермаркетов'], ['«МамаПапия»', 'Магазины для детей и родителей'], ['«Бубль-Гум»', 'Сеть магазинов игрушек']] },
    'Барнаул': { count: 2 }, 'Белгород': { count: 1 }, 'Бийск': { count: 1 }, 'Благовещенск': { count: 2 },
    'Владивосток': { count: 1 }, 'Воронеж': { count: 2 }, 'Иркутск': { count: 1 }, 'Калининград': { count: 1 },
    'Киров': { count: 1 }, 'Краснодар': { count: 2 },
  };
  const DEALERS = [
    { city: 'Барнаул', name: 'ТК «Стадион игрушек»', addr: 'пр. Ленина, 154а', phone: '(3852) 50-15-10', site: 'stadiumtoys.ru' },
    { city: 'Благовещенск', name: '«Остров сокровищ»', addr: 'ул. 50 лет Октября, 61', phone: '(4162) 53-02-37' },
    { city: 'Владивосток', name: '«Бубль-Гум»', addr: 'ул. Енисейская, 23 Д', phone: '8 (800) 222-24-28', site: 'boobl-goom.ru' },
    { city: 'Волгоград', name: 'ТК «Игрушкин»', addr: 'ул. Авиаторов, 9', phone: '(8442) 54-71-94', site: 'igrushkiopt34.ru' },
    { city: 'Воронеж', name: '«Юниор»', addr: 'ул. 45 Стрелковой дивизии, 234', phone: '(473) 224-50-50', site: 'игрушкиоптом.рф' },
    { city: 'Екатеринбург', name: '«Маркер Игрушка»', addr: 'ул. Черняховского, 82 А', phone: '(343) 216-70-43', site: 'markertoys.ru' },
    { city: 'Екатеринбург', name: '«URAL TOYS»', addr: 'Промышленный проезд, 2 Б', phone: '(343) 270-22-02', site: 'ural-toys.ru' },
    { city: 'Екатеринбург', name: '«Сима-ленд»', addr: 'ул. Черняховского, 86, корп. 8', phone: '+7 (343) 278-67-00', site: 'sima-land.ru' },
    { city: 'Железноводск', name: '«ИОН»', addr: 'п. Иноземцево, ул. Николаевская, 4', phone: '(8793) 34-70-90', site: 'iontoys.ru' },
    { city: 'Краснодар', name: '«Юг Тойз»', addr: 'ул. Новороссийская, 98', phone: '(861) 239-70-40', site: 'yugtoys.ru' },
    { city: 'Краснодар', name: '«Кубань игрушка»', addr: 'ул. Новороссийская, 236', phone: '(861) 234-30-08', site: 'кубаньигрушка.рф' },
  ];
  const telHref = (p) => { const d = p.replace(/\D/g, ''); return d.length >= 10 ? 'tel:' + (d.length === 10 ? '+7' + d : d.startsWith('8800') ? d : '+' + d.replace(/^8/, '7')) : ''; };

  /* ---------- Карточки дистрибьюторов ---------- */
  const dealersGrid = $('[data-dealers]');
  function dealerCard(d, i) {
    const site = d.site ? `<a class="dcard__site" href="https://${d.site}" target="_blank" rel="noopener">${esc(d.site)}<svg class="i"><use href="#i-arrow-up-right"/></svg></a>` : '';
    return `<article class="dcard" data-reveal style="--d:${i % 3}" data-dealer-city="${esc(d.city)}">
  <span class="dcard__city">${esc(d.city)}</span>
  <h3 class="dcard__title">${esc(d.name)}</h3>
  <a class="dcard__row" href="${maps(d.city + ', ' + d.addr)}" target="_blank" rel="noopener"><svg class="i"><use href="#i-pin"/></svg>${esc(d.addr)}</a>
  <a class="dcard__row dcard__row--phone" href="${telHref(d.phone)}"><svg class="i"><use href="#i-phone"/></svg>${esc(d.phone)}</a>
  ${site}
</article>`;
  }
  if (dealersGrid) {
    dealersGrid.innerHTML = DEALERS.map(dealerCard).join('');
    dealersGrid.appendChild($('[data-dealer-cta]').content.firstElementChild.cloneNode(true));
    // карточки появляются при прокрутке (main.js уже отработал — подключаем свой наблюдатель)
    const cards = $$('[data-reveal]', dealersGrid);
    if ('IntersectionObserver' in window && !reduceMotion) {
      const io = new IntersectionObserver((en) => en.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        e.target.classList.add('is-in');
        setTimeout(() => { e.target.removeAttribute('data-reveal'); e.target.classList.remove('is-in'); }, 1200);
      }), { threshold: 0.1 });
      cards.forEach((c) => io.observe(c));
    } else cards.forEach((c) => c.removeAttribute('data-reveal'));
  }

  /* ---------- Список и карта ---------- */
  const listEl = $('[data-clist]');
  const headEl = $('[data-clist-head]');
  const emptyEl = $('[data-clist-empty]');
  const pinsEl = $('[data-pins]');
  const input = $('[data-city-input]');
  const clearBtn = $('[data-city-clear]');
  let tab = 'shops';
  let openCity = 'Екатеринбург';

  function dataset() {
    if (tab === 'dealers') {
      const by = {};
      DEALERS.forEach((d) => { (by[d.city] = by[d.city] || { count: 0, list: [] }); by[d.city].count += 1; by[d.city].list.push(d); });
      return by;
    }
    return SHOPS;
  }

  function cityBody(city, info) {
    if (tab === 'dealers') {
      return info.list.map((d) => `<div class="shop"><div><b>${esc(d.name)}</b><small>${esc(d.addr)} · <a href="${telHref(d.phone)}">${esc(d.phone)}</a></small></div>${d.site ? `<a class="link-action" href="https://${d.site}" target="_blank" rel="noopener">Сайт<svg class="i"><use href="#i-arrow-up-right"/></svg></a>` : ''}</div>`).join('');
    }
    if (info.list) {
      return info.list.map(([n, t]) => `<div class="shop"><div><b>${esc(n)}</b><small>${esc(t)}</small></div><a class="link-action" href="${maps(city + ' ' + n.replace(/[«»]/g, ''))}" target="_blank" rel="noopener">Адреса<svg class="i"><use href="#i-arrow-right"/></svg></a></div>`).join('');
    }
    return `<div class="shop shop--ask"><div><b>Подскажем магазин рядом</b><small>Позвоните в отдел продаж или найдите на карте</small></div><a class="link-action" href="${maps('игрушки Стеллар ' + city)}" target="_blank" rel="noopener">На карте<svg class="i"><use href="#i-arrow-up-right"/></svg></a></div>`;
  }

  function renderList(filter = '') {
    const data = dataset();
    const q = filter.trim().toLowerCase();
    const cities = Object.keys(data).sort((a, b) => a.localeCompare(b, 'ru')).filter((c) => !q || c.toLowerCase().includes(q));
    // открытый город — первым
    cities.sort((a, b) => (b === openCity) - (a === openCity));
    headEl.textContent = tab === 'dealers' ? `Оптовые дистрибьюторы в ${Object.keys(data).length} городах` : 'Магазины-партнёры в 30+ городах';
    listEl.innerHTML = cities.map((c) => {
      const info = data[c];
      const word = tab === 'dealers' ? plural(info.count, 'дистрибьютор', 'дистрибьютора', 'дистрибьюторов') : plural(info.count, 'магазин', 'магазина', 'магазинов');
      const open = c === openCity;
      return `<div class="city${open ? ' is-open' : ''}" data-city="${esc(c)}">
  <button class="city__head" type="button" aria-expanded="${open}"><span class="city__name">${esc(c)}</span><span class="city__count">${info.count} ${word}</span><svg class="i city__chev"><use href="#i-chevron-down"/></svg></button>
  <div class="city__body"><div class="city__inner">${cityBody(c, info)}</div></div>
</div>`;
    }).join('');
    emptyEl.hidden = cities.length > 0;
    renderPins();
  }

  function renderPins() {
    const data = dataset();
    pinsEl.innerHTML = Object.keys(data).map((c) => {
      const p = CITIES[c];
      if (!p) return '';
      const n = data[c].count;
      const word = tab === 'dealers' ? plural(n, 'дистрибьютор', 'дистрибьютора', 'дистрибьюторов') : plural(n, 'магазин', 'магазина', 'магазинов');
      return `<button class="pin${c === openCity ? ' is-active' : ''}" type="button" style="left:${p.x}%;top:${p.y}%" data-pin="${esc(c)}" aria-label="${esc(c)}: ${n} ${word}"><span class="pin__n">${n}</span><span class="pin__label">${esc(c)} · ${n} ${word}</span></button>`;
    }).join('') + `<span class="pin pin--factory" style="left:${FACTORY.x}%;top:${FACTORY.y}%" title="Фабрика «Стеллар»"><svg class="i"><use href="#i-factory"/></svg><span class="pin__label">Фабрика · Ростов-на-Дону</span></span>`;
  }

  function setOpen(city, scroll) {
    openCity = openCity === city && !scroll ? '' : city;
    $$('.city', listEl).forEach((el) => {
      const on = el.dataset.city === openCity;
      el.classList.toggle('is-open', on);
      $('.city__head', el).setAttribute('aria-expanded', String(on));
    });
    $$('.pin[data-pin]', pinsEl).forEach((p) => p.classList.toggle('is-active', p.dataset.pin === openCity));
    if (scroll && openCity) {
      const el = $(`.city[data-city="${CSS.escape(openCity)}"]`, listEl);
      if (el) listEl.scrollTo({ top: el.offsetTop - listEl.offsetTop - 8, behavior: reduceMotion ? 'auto' : 'smooth' });
      focusMap(openCity);
    }
  }

  listEl.addEventListener('click', (e) => {
    const head = e.target.closest('.city__head');
    if (!head) return;
    const city = head.closest('.city').dataset.city;
    setOpen(city);
    if (openCity) focusMap(openCity);
  });
  pinsEl.addEventListener('click', (e) => {
    const pin = e.target.closest('[data-pin]');
    if (pin) setOpen(pin.dataset.pin, true);
  });
  // наведение на город в списке подсвечивает пин
  listEl.addEventListener('pointerover', (e) => {
    const c = e.target.closest('.city');
    $$('.pin[data-pin]', pinsEl).forEach((p) => p.classList.toggle('is-hover', !!c && p.dataset.pin === c.dataset.city));
  });
  listEl.addEventListener('pointerleave', () => $$('.pin.is-hover', pinsEl).forEach((p) => p.classList.remove('is-hover')));

  /* ---------- Масштаб и перетаскивание схемы ---------- */
  const wmap = $('[data-wmap]');
  const stage = $('[data-wmap-stage]');
  let zoom = 1, px = 0, py = 0;
  function applyMap(animate = true) {
    const max = (zoom - 1) * 0.5;
    px = Math.max(-max, Math.min(max, px));
    py = Math.max(-max, Math.min(max, py));
    stage.style.transition = animate && !reduceMotion ? 'transform .6s cubic-bezier(.16,1,.3,1)' : 'none';
    stage.style.transform = `translate(${px * 100}%, ${py * 100}%) scale(${zoom})`;
    wmap.classList.toggle('is-zoomed', zoom > 1);
    wmap.style.setProperty('--pin-scale', 1 / zoom);
  }
  function focusMap(city) {
    const p = CITIES[city];
    if (!p) return;
    zoom = Math.max(zoom, 1.6);
    px = (0.5 - p.x / 100) * zoom;
    py = (0.5 - p.y / 100) * zoom;
    applyMap();
  }
  $$('[data-zoom]', wmap).forEach((b) => b.addEventListener('click', () => {
    zoom = Math.max(1, Math.min(2.6, zoom + (+b.dataset.zoom) * 0.4));
    if (zoom === 1) { px = 0; py = 0; }
    applyMap();
  }));
  let drag = null;
  wmap.addEventListener('pointerdown', (e) => {
    if (zoom === 1 || e.target.closest('button')) return;
    drag = { x: e.clientX, y: e.clientY, px, py };
    wmap.setPointerCapture(e.pointerId);
    wmap.classList.add('is-drag');
  });
  wmap.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = wmap.getBoundingClientRect();
    px = drag.px + (e.clientX - drag.x) / r.width;
    py = drag.py + (e.clientY - drag.y) / r.height;
    applyMap(false);
  });
  const endDrag = () => { drag = null; wmap.classList.remove('is-drag'); };
  wmap.addEventListener('pointerup', endDrag);
  wmap.addEventListener('pointercancel', endDrag);

  /* ---------- Вкладки ---------- */
  const tabs = $$('[data-wtab]');
  const ink = $('.ftabs__ink');
  const body = $('[data-finder-body]');
  const mps = $('[data-mps]');
  const search = $('[data-finder-search]');
  function moveInk() {
    const t = tabs.find((b) => b.getAttribute('aria-selected') === 'true');
    if (!t) return;
    ink.style.width = t.offsetWidth + 'px';
    ink.style.transform = `translateX(${t.offsetLeft - 6}px)`;
  }
  tabs.forEach((t) => t.addEventListener('click', () => {
    if (t.getAttribute('aria-selected') === 'true') return;
    tabs.forEach((b) => b.setAttribute('aria-selected', String(b === t)));
    tab = t.dataset.wtab;
    moveInk();
    const isMp = tab === 'mp';
    body.hidden = isMp;
    mps.hidden = !isMp;
    search.classList.toggle('is-off', isMp);
    const target = isMp ? mps : body;
    if (!reduceMotion) target.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
    if (!isMp) {
      const data = dataset();
      if (!data[openCity]) openCity = Object.keys(data).sort((a, b) => a.localeCompare(b, 'ru'))[0];
      renderList(input.value);
    }
  }));
  window.addEventListener('resize', moveInk);
  if (document.fonts) document.fonts.ready.then(moveInk);

  /* ---------- Поиск города ---------- */
  input.addEventListener('input', () => {
    clearBtn.hidden = !input.value;
    const q = input.value.trim().toLowerCase();
    const data = dataset();
    const match = Object.keys(data).filter((c) => c.toLowerCase().startsWith(q));
    if (q && match.length === 1) openCity = match[0];
    renderList(input.value);
    if (q && match.length === 1) focusMap(match[0]);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const first = $('.city', listEl);
    if (first) { setOpen(first.dataset.city, true); }
  });
  clearBtn.addEventListener('click', () => { input.value = ''; clearBtn.hidden = true; renderList(); input.focus(); zoom = 1; px = py = 0; applyMap(); });

  /* ---------- Определить город ---------- */
  const geoBtn = $('[data-geo]');
  geoBtn.addEventListener('click', () => {
    if (!navigator.geolocation) { S.toast('Браузер не умеет определять город — выберите его в списке'); return; }
    geoBtn.classList.add('is-loading');
    navigator.geolocation.getCurrentPosition((pos) => {
      geoBtn.classList.remove('is-loading');
      const { latitude: la, longitude: lo } = pos.coords;
      const dist = (c) => Math.hypot(c.lat - la, (c.lon - lo) * Math.cos(la * Math.PI / 180));
      const data = dataset();
      const near = Object.keys(data).filter((c) => CITIES[c]).sort((a, b) => dist(CITIES[a]) - dist(CITIES[b]))[0];
      if (dist(FACTORY) < 1.2) S.toast('Вы рядом с фабрикой «Стеллар» — заказ можно забрать прямо в Ростове-на-Дону', 4000);
      else S.toast(`Ближайший город с партнёрами — ${near}`);
      input.value = ''; clearBtn.hidden = true;
      openCity = near;
      renderList();
      setOpen(near, true);
    }, () => {
      geoBtn.classList.remove('is-loading');
      S.toast('Не удалось определить город — выберите его в списке', 3000);
      input.focus();
    }, { timeout: 8000, maximumAge: 600000 });
  });

  renderList();
  // если пришли по ссылке #dealers — открываем вкладку дистрибьюторов
  if (location.hash === '#dealers-tab') $('[data-wtab="dealers"]').click();
})();
