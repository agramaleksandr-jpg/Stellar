/* =========================================================
   Каталог: фильтры, подбор игрушки, сортировка, вид, страницы,
   быстрый заказ по артикулам, сводка заказа
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
  const PAGE = 9;
  const BOX_MIN = Math.min(...P.map((p) => p.box));
  const BOX_MAX = Math.max(...P.map((p) => p.box));
  const norm = (s) => String(s).toLowerCase().replace(/ё/g, 'е');
  const esc = D.esc;
  const plural = (n, w) => w[(n % 100 > 4 && n % 100 < 20) ? 2 : [2, 0, 1, 1, 1, 2][Math.min(n % 10, 5)]];
  const fmt = (n, d = 0) => n.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });

  // все категории сайта (для ссылок из меню, даже если в демо нет товаров)
  const CAT_NAMES = Object.assign({
    music: 'Музыкальные игрушки', dishes: 'Игрушечная посуда', play: 'Игровая среда', 'cubes-edu': 'Кубики обучающие',
    'cubes-pic': 'Кубики-картинки', constructor: 'Конструкторы', loto: 'Лото и домино',
  }, D.CATEGORIES);
  const GENDERS = { all: 'Всем', girl: 'Девочке', boy: 'Мальчику' };
  const FLAGS = { new: 'Новинки', hit: 'Хиты продаж', mp: 'Фото для маркетплейсов', video: 'Есть видеообзор' };
  const SORTS = {
    pop: (a, b) => b.pop - a.pop,
    new: (a, b) => (b.tags.includes('new') - a.tags.includes('new')) || b.pop - a.pop,
    name: (a, b) => a.name.localeCompare(b.name, 'ru'),
    art: (a, b) => a.art.localeCompare(b.art),
    box: (a, b) => b.box - a.box || b.pop - a.pop,
  };

  /* ---------- Состояние ---------- */
  const blank = () => ({
    cat: [], coll: [], age: [], mat: [], pack: [], skills: [], gender: 'all',
    box: [BOX_MIN, BOX_MAX], flags: { new: false, hit: false, mp: false, video: false },
    q: '', sort: 'pop', view: 'grid', page: 1, pages: 1,
  });
  let st = blank();

  function readURL() {
    const u = new URLSearchParams(location.search);
    const list = (k) => (u.get(k) ? u.get(k).split(',').filter(Boolean) : []);
    st.cat = list('cat');
    st.coll = list('coll').map((c) => (c === 'cvetnyashki' ? 'cvet' : c)).filter((c) => D.COLLECTIONS[c]);
    st.age = list('age').map(Number).filter((n) => D.AGES.some((a) => a.v === n));
    st.mat = list('mat').filter((m) => D.MATERIALS[m]);
    st.pack = list('pack').filter((m) => D.PACKS[m]);
    st.skills = list('skill').filter((s) => D.SKILLS[s]);
    st.gender = GENDERS[u.get('gender')] ? u.get('gender') : 'all';
    const box = (u.get('box') || '').split('-').map(Number);
    if (box.length === 2 && box.every((n) => !isNaN(n))) st.box = [Math.max(BOX_MIN, box[0]), Math.min(BOX_MAX, box[1])];
    Object.keys(FLAGS).forEach((f) => { st.flags[f] = u.get(f) === '1'; });
    st.q = (u.get('q') || '').trim();
    st.sort = SORTS[u.get('sort')] ? u.get('sort') : 'pop';
    let view = u.get('view');
    if (!view) { try { view = localStorage.getItem('stellar.view'); } catch (e) { /* нет доступа */ } }
    st.view = view === 'list' ? 'list' : 'grid';
    st.page = Math.max(1, parseInt(u.get('page'), 10) || 1);
  }
  function writeURL() {
    const u = new URLSearchParams();
    if (st.q) u.set('q', st.q);
    ['cat', 'coll', 'mat', 'pack'].forEach((k) => st[k].length && u.set(k, st[k].join(',')));
    if (st.age.length) u.set('age', st.age.join(','));
    if (st.skills.length) u.set('skill', st.skills.join(','));
    if (st.gender !== 'all') u.set('gender', st.gender);
    if (st.box[0] !== BOX_MIN || st.box[1] !== BOX_MAX) u.set('box', st.box.join('-'));
    Object.keys(FLAGS).forEach((f) => st.flags[f] && u.set(f, '1'));
    if (st.sort !== 'pop') u.set('sort', st.sort);
    if (st.view === 'list') u.set('view', 'list');
    if (st.page > 1) u.set('page', st.page);
    const qs = u.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }

  /* ---------- Фильтрация ---------- */
  function matches(p, s, skip) {
    if (skip !== 'cat' && s.cat.length && !s.cat.some((c) => p.cats.includes(c))) return false;
    if (skip !== 'coll' && s.coll.length && !s.coll.includes(p.coll)) return false;
    if (skip !== 'age' && s.age.length && !s.age.includes(p.age)) return false;
    if (skip !== 'mat' && s.mat.length && !s.mat.some((m) => p.mats.includes(m))) return false;
    if (skip !== 'pack' && s.pack.length && !s.pack.includes(p.pack)) return false;
    if (skip !== 'skills' && s.skills.length && !s.skills.some((k) => p.skills.includes(k))) return false;
    if (skip !== 'gender' && s.gender !== 'all' && p.gender !== 'all' && p.gender !== s.gender) return false;
    if (skip !== 'box' && (p.box < s.box[0] || p.box > s.box[1])) return false;
    if (skip !== 'flags') {
      if (s.flags.new && !p.tags.includes('new')) return false;
      if (s.flags.hit && !p.tags.includes('hit')) return false;
      if (s.flags.mp && !p.mp) return false;
      if (s.flags.video && !p.video) return false;
    }
    if (skip !== 'q' && s.q) {
      const hay = norm([p.name, p.art, p.sub, CAT_NAMES[p.cat], p.coll ? D.COLLECTIONS[p.coll].name : '', p.word].join(' '));
      if (!norm(s.q).split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  }
  const count = (fn, skip, s = st) => P.filter((p) => matches(p, s, skip) && fn(p)).length;
  const results = () => P.filter((p) => matches(p, st)).sort(SORTS[st.sort]);

  /* ---------- Элементы ---------- */
  const grid = $('[data-grid]');
  const table = $('[data-table]');
  const tbody = $('[data-table-body]');
  const empty = $('[data-empty]');
  const moreWrap = $('[data-more-wrap]');
  const moreBtn = $('[data-load-more]');
  const pager = $('[data-pager]');
  const found = $('[data-found]');
  const chipsWrap = $('[data-active-chips]');
  const filters = $('[data-filters]');
  $('[data-total]').textContent = P.length;

  /* ---------- Списки фильтров ---------- */
  function checkHTML(group, value, label, dot) {
    return `<label class="fcheck"><input type="checkbox" data-f="${group}" value="${value}"><span class="check__box"><svg class="i"><use href="#i-check"/></svg></span>${dot ? `<span class="fcheck__dot" style="--c:${dot}"></span>` : ''}<span class="fcheck__label">${esc(label)}</span><span class="fcheck__count" data-count></span></label>`;
  }
  function buildLists() {
    const cats = Object.keys(CAT_NAMES).filter((c) => P.some((p) => p.cats.includes(c)) || st.cat.includes(c));
    cats.sort((a, b) => P.filter((p) => p.cats.includes(b)).length - P.filter((p) => p.cats.includes(a)).length);
    const catList = $('[data-f-list="cat"]');
    catList.innerHTML = cats.map((c) => checkHTML('cat', c, CAT_NAMES[c])).join('');
    const extra = Math.max(0, cats.length - 6);
    $$('.fcheck', catList).forEach((el, i) => el.classList.toggle('is-extra', i >= 6));
    const more = $('[data-more="cat"]');
    const setMore = () => { more.textContent = catList.classList.contains('is-expanded') ? 'Свернуть' : extra ? `+ ещё ${extra} ${plural(extra, ['категория', 'категории', 'категорий'])}` : ''; };
    setMore();
    more.onclick = () => { catList.classList.toggle('is-expanded'); setMore(); };
    if (st.cat.some((c) => cats.indexOf(c) >= 6)) { catList.classList.add('is-expanded'); setMore(); }

    $('[data-f-list="coll"]').innerHTML = Object.entries(D.COLLECTIONS).map(([k, c]) => checkHTML('coll', k, c.name, c.color)).join('');
    $('[data-f-list="mat"]').innerHTML = Object.entries(D.MATERIALS).filter(([k]) => P.some((p) => p.mats.includes(k))).map(([k, v]) => checkHTML('mat', k, v)).join('');
    $('[data-f-list="pack"]').innerHTML = Object.entries(D.PACKS).filter(([k]) => k !== 'none').map(([k, v]) => checkHTML('pack', k, v)).join('');
    $('[data-f-ages]').innerHTML = D.AGES.map((a) => `<button class="tchip" type="button" aria-pressed="false" data-age="${a.v}">${a.label}</button>`).join('');
    $('[data-picker-age]').innerHTML = D.AGES.map((a) => `<button type="button" role="radio" aria-checked="false" data-value="${a.v}">${a.label}</button>`).join('');
    $('[data-picker-skills]').innerHTML = Object.entries(D.SKILLS).map(([k, s]) => `<button class="skill" type="button" aria-pressed="false" data-skill="${k}"><svg class="i"><use href="#${s.icon}"/></svg>${s.name}<sup data-count></sup></button>`).join('');
  }

  /* ---------- Сегментированные переключатели с «бегунком» ---------- */
  function segInk(seg) {
    let ink = $('.seg__ink', seg);
    if (!ink) { ink = document.createElement('span'); ink.className = 'seg__ink'; ink.setAttribute('aria-hidden', 'true'); seg.prepend(ink); }
    const on = $('[aria-checked="true"]', seg);
    if (!on) { ink.style.opacity = '0'; return; }
    ink.style.opacity = '1';
    // учитываем и перенос строки: кнопки в мобильной версии идут в несколько рядов
    ink.style.width = on.offsetWidth + 'px';
    ink.style.height = on.offsetHeight + 'px';
    ink.style.left = '0px';
    ink.style.top = '0px';
    ink.style.transform = `translate(${on.offsetLeft}px, ${on.offsetTop}px)`;
  }

  /* ---------- Синхронизация интерфейса с состоянием ---------- */
  function syncControls() {
    $$('[data-f]').forEach((inp) => {
      const g = inp.dataset.f;
      const v = inp.value;
      inp.checked = st[g].includes(v);
      const n = count((p) => (g === 'cat' ? p.cats.includes(v) : g === 'coll' ? p.coll === v : g === 'mat' ? p.mats.includes(v) : p.pack === v), g);
      const lab = inp.closest('.fcheck');
      $('[data-count]', lab).textContent = n;
      lab.classList.toggle('is-zero', n === 0 && !inp.checked);
    });
    $$('[data-age]').forEach((b) => {
      const v = Number(b.dataset.age);
      const on = st.age.includes(v);
      b.setAttribute('aria-pressed', String(on));
      b.disabled = !on && count((p) => p.age === v, 'age') === 0;
    });
    $$('[data-picker-age] button').forEach((b) => b.setAttribute('aria-checked', String(st.age.length === 1 && st.age[0] === Number(b.dataset.value))));
    $$('[data-picker-gender] button').forEach((b) => b.setAttribute('aria-checked', String(st.gender === b.dataset.value)));
    $$('[data-skill]').forEach((b) => {
      const k = b.dataset.skill;
      b.setAttribute('aria-pressed', String(st.skills.includes(k)));
      $('[data-count]', b).textContent = count((p) => p.skills.includes(k), 'skills');
    });
    $$('.seg').forEach(segInk);
    $$('[data-flag]').forEach((c) => { c.checked = st.flags[c.dataset.flag]; });
    // ползунок
    $('[data-range-min]').value = st.box[0];
    $('[data-range-max]').value = st.box[1];
    if (document.activeElement !== $('[data-range-min-input]')) $('[data-range-min-input]').value = st.box[0];
    if (document.activeElement !== $('[data-range-max-input]')) $('[data-range-max-input]').value = st.box[1];
    const pct = (v) => ((v - BOX_MIN) / (BOX_MAX - BOX_MIN)) * 100 + '%';
    $('[data-range-fill]').style.setProperty('--a', pct(st.box[0]));
    $('[data-range-fill]').style.setProperty('--b', pct(st.box[1]));
    // быстрые чипы
    const quick = !st.flags.new && !st.flags.hit && !st.coll.length ? 'all'
      : st.flags.new && !st.flags.hit && !st.coll.length ? 'new'
        : st.flags.hit && !st.flags.new && !st.coll.length ? 'hit'
          : !st.flags.new && !st.flags.hit && st.coll.length === 1 ? 'coll:' + st.coll[0] : '';
    $$('[data-quick]').forEach((b) => b.classList.toggle('is-active', b.dataset.quick === quick));
    // сортировка и вид
    const sort = $('[data-sort]');
    if (sort._select && sort._select.value !== st.sort) sort._select.set(st.sort, true);
    $$('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === st.view)));
    $('.view-toggle').classList.toggle('is-list', st.view === 'list');
  }

  function activeFilters() {
    const a = [];
    if (st.q) a.push({ label: `«${st.q}»`, off: () => { st.q = ''; } });
    st.cat.forEach((c) => a.push({ label: CAT_NAMES[c] || c, off: () => { st.cat = st.cat.filter((x) => x !== c); } }));
    st.coll.forEach((c) => a.push({ label: D.COLLECTIONS[c].name, off: () => { st.coll = st.coll.filter((x) => x !== c); } }));
    st.age.forEach((v) => a.push({ label: D.ageOf(v).label, off: () => { st.age = st.age.filter((x) => x !== v); } }));
    if (st.gender !== 'all') a.push({ label: GENDERS[st.gender], off: () => { st.gender = 'all'; } });
    st.skills.forEach((k) => a.push({ label: D.SKILLS[k].name, off: () => { st.skills = st.skills.filter((x) => x !== k); } }));
    st.mat.forEach((m) => a.push({ label: D.MATERIALS[m], off: () => { st.mat = st.mat.filter((x) => x !== m); } }));
    st.pack.forEach((m) => a.push({ label: D.PACKS[m], off: () => { st.pack = st.pack.filter((x) => x !== m); } }));
    if (st.box[0] !== BOX_MIN || st.box[1] !== BOX_MAX) a.push({ label: `${st.box[0]}–${st.box[1]} шт в коробе`, off: () => { st.box = [BOX_MIN, BOX_MAX]; } });
    Object.keys(FLAGS).forEach((f) => st.flags[f] && a.push({ label: FLAGS[f], off: () => { st.flags[f] = false; } }));
    return a;
  }
  function renderChips() {
    const list = activeFilters();
    chipsWrap.innerHTML = '';
    list.forEach((f) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'achip';
      b.innerHTML = `${esc(f.label)}<svg class="i"><use href="#i-close"/></svg>`;
      b.setAttribute('aria-label', 'Убрать фильтр: ' + f.label);
      b.addEventListener('click', () => {
        b.classList.add('is-out');
        setTimeout(() => { f.off(); st.page = 1; st.pages = 1; render(); }, reduceMotion ? 0 : 180);
      });
      chipsWrap.appendChild(b);
    });
    if (list.length) {
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'achip achip--clear';
      c.innerHTML = '<svg class="i"><use href="#i-rotate"/></svg>Очистить все';
      c.setAttribute('aria-label', 'Очистить все фильтры');
      c.addEventListener('click', resetAll);
      chipsWrap.appendChild(c);
    }
    $$('[data-reset]').forEach((r) => { if (r.closest('.filters__head')) r.hidden = list.length === 0; });
    const fc = $('[data-fcount]');
    fc.hidden = list.length === 0;
    fc.textContent = list.length;
  }

  /* ---------- Карточки и строки (кэшируются, чтобы сохранять состояние) ---------- */
  const cards = new Map();
  const rows = new Map();
  const tpl = document.createElement('template');
  function cardEl(p) {
    if (!cards.has(p.art)) {
      tpl.innerHTML = D.cardHTML(p).trim();
      const el = tpl.content.firstElementChild;
      el._keep = true;
      cards.set(p.art, el);
    }
    return cards.get(p.art);
  }
  function rowEl(p) {
    if (!rows.has(p.art)) {
      const url = D.href('product.html?art=' + p.art);
      tpl.innerHTML = `<div class="crow" data-product data-art="${p.art}" data-name="${esc(p.name)}">
  <a class="crow__img" href="${url}" tabindex="-1" aria-hidden="true"><img src="${p.img}" alt="" loading="lazy" data-fly-img></a>
  <span class="crow__art">${p.art}</span>
  <div class="crow__name"><a href="${url}">${esc(p.name)}</a><small>${esc(p.sub)}</small></div>
  <span class="crow__pack">${D.PACKS[p.pack]}</span>
  <span class="crow__box">${p.box} шт</span>
  <span class="crow__age">${D.ageShort(p.age)}</span>
  <span class="crow__meta">арт. ${p.art} · ${p.box} шт в коробе · ${D.ageShort(p.age)}</span>
  <div class="stepper" data-stepper><button type="button" data-step="-1" aria-label="Меньше коробов"><svg class="i"><use href="#i-minus"/></svg></button><span class="stepper__val"><b data-qty>1</b> кор.</span><button type="button" data-step="1" aria-label="Больше коробов"><svg class="i"><use href="#i-plus"/></svg></button></div>
  <button class="btn btn--dark btn--m pcard__add" type="button" data-add><span class="pcard__add-in">В заказ</span><span class="pcard__add-done"><svg class="i"><use href="#i-check"/></svg>В заказе</span></button>
</div>`;
      const el = tpl.content.firstElementChild;
      el._keep = true;
      rows.set(p.art, el);
    }
    return rows.get(p.art);
  }

  function place(container, els, animate) {
    const before = new Map();
    if (animate) Array.from(container.children).forEach((el) => before.set(el, el.getBoundingClientRect()));
    const clear = (el) => { if (el._leave) { el._leave.cancel(); el._leave = null; } };
    Array.from(container.children).forEach(clear);
    els.forEach(clear);
    container.replaceChildren(...els);
    S.initProductCards(container);
    if (!animate || reduceMotion) return;
    let k = 0;
    els.forEach((el) => {
      el.getAnimations().forEach((a) => a.cancel());
      const a = before.get(el);
      const b = el.getBoundingClientRect();
      if (!a) {
        el.animate([{ opacity: 0, transform: 'translateY(16px) scale(.97)' }, { opacity: 1, transform: 'none' }],
          { duration: 460, delay: Math.min(k++, 8) * 40, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
      } else if (Math.abs(a.left - b.left) > 1 || Math.abs(a.top - b.top) > 1) {
        el.animate([{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px)` }, { transform: 'none' }],
          { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
    });
  }

  /* ---------- Отрисовка ---------- */
  let lastCount = null;
  let token = 0;
  function render(opts = {}) {
    const animate = opts.animate !== false;
    const res = results();
    const n = res.length;
    const totalPages = Math.max(1, Math.ceil(n / PAGE));
    if (st.page > totalPages) { st.page = 1; st.pages = 1; }
    const start = (st.page - 1) * PAGE;
    const end = Math.min(n, start + st.pages * PAGE);
    const visible = res.slice(start, end);

    syncControls();
    renderChips();
    writeURL();

    // счётчики
    if (lastCount !== n) {
      found.textContent = n;
      $('[data-found-word]').textContent = plural(n, ['товар', 'товара', 'товаров']);
      if (lastCount !== null) { found.classList.remove('is-bump'); void found.offsetWidth; found.classList.add('is-bump'); }
      lastCount = n;
    }
    const showText = n ? `Показать ${n} ${plural(n, ['товар', 'товара', 'товаров'])}` : 'Нет подходящих товаров';
    $('[data-show-text]').textContent = showText;
    $('[data-show-results]').disabled = !n;
    $('[data-picker-go-text]').textContent = showText;
    $('[data-picker-go]').disabled = !n;

    // список
    const isList = st.view === 'list';
    empty.hidden = n > 0;
    grid.hidden = isList || n === 0;
    table.hidden = !isList || n === 0;
    const my = ++token;
    const container = isList ? tbody : grid;
    const els = visible.map(isList ? rowEl : cardEl);
    const leaving = Array.from(container.children).filter((el) => !els.includes(el));
    const go = () => { if (my === token) place(container, els, animate); };
    if (animate && leaving.length && !reduceMotion && container.children.length) {
      // анимацию ухода храним на элементе: карточки кэшируются и могут вернуться в сетку,
      // а у отсоединённого элемента getAnimations() её уже не видит — снимаем вручную
      leaving.forEach((el) => {
        if (el._leave) el._leave.cancel();
        el._leave = el.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.95)' }], { duration: 150, easing: 'ease-in', fill: 'forwards' });
      });
      setTimeout(go, 150);
    } else go();

    if (!n) {
      const sugg = P.slice().sort(SORTS.pop).slice(0, 3);
      place($('[data-empty-grid]'), sugg.map(cardEl), false);
    }

    // «ещё» и страницы
    const rest = n - end;
    moreWrap.hidden = n <= PAGE;
    moreBtn.hidden = rest <= 0;
    $('[data-load-more-text]').textContent = `Показать ещё ${Math.min(rest, PAGE)} ${plural(Math.min(rest, PAGE), ['товар', 'товара', 'товаров'])}`;
    const last = st.page + st.pages - 1;
    let ph = `<button type="button" data-page="${st.page - 1}" aria-label="Предыдущая страница" ${st.page <= 1 ? 'disabled' : ''}><svg class="i"><use href="#i-arrow-left"/></svg></button>`;
    for (let i = 1; i <= totalPages; i++) ph += `<button type="button" data-page="${i}" ${i >= st.page && i <= last ? 'aria-current="page"' : ''}>${i}</button>`;
    ph += `<button type="button" data-page="${last + 1}" aria-label="Следующая страница" ${last >= totalPages ? 'disabled' : ''}><svg class="i"><use href="#i-arrow-right"/></svg></button>`;
    pager.innerHTML = ph;
    pager.hidden = totalPages <= 1;
  }

  /* ---------- События фильтров ---------- */
  const changed = (opts) => { st.page = 1; st.pages = 1; render(opts); };
  filters.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.f) {
      const g = t.dataset.f;
      st[g] = t.checked ? [...st[g], t.value] : st[g].filter((x) => x !== t.value);
      changed();
    } else if (t.dataset.flag) {
      st.flags[t.dataset.flag] = t.checked;
      changed();
    }
  });
  $('[data-f-ages]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-age]');
    if (!b) return;
    const v = Number(b.dataset.age);
    st.age = st.age.includes(v) ? st.age.filter((x) => x !== v) : [...st.age, v].sort((a, c) => a - c);
    changed();
  });
  $('[data-picker-age]').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const v = Number(b.dataset.value);
    st.age = st.age.length === 1 && st.age[0] === v ? [] : [v];
    changed();
  });
  $('[data-picker-gender]').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    st.gender = b.dataset.value;
    changed();
  });
  $('[data-picker-skills]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-skill]');
    if (!b) return;
    const k = b.dataset.skill;
    st.skills = st.skills.includes(k) ? st.skills.filter((x) => x !== k) : [...st.skills, k];
    changed();
  });
  // стрелки в сегментах
  $$('.seg').forEach((seg) => seg.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const btns = $$('button', seg);
    const i = btns.indexOf(document.activeElement);
    const n = btns[(i + (e.key === 'ArrowRight' ? 1 : -1) + btns.length) % btns.length];
    n.focus(); n.click();
    e.preventDefault();
  }));

  $$('[data-quick]').forEach((b) => b.addEventListener('click', () => {
    const q = b.dataset.quick;
    st.flags.new = false; st.flags.hit = false; st.coll = [];
    if (q === 'new' || q === 'hit') st.flags[q] = true;
    if (q.startsWith('coll:')) st.coll = [q.slice(5)];
    changed();
  }));

  function resetAll() {
    const keep = { sort: st.sort, view: st.view };
    st = Object.assign(blank(), keep);
    render();
    S.toast('Фильтры сброшены');
  }
  $$('[data-reset]').forEach((b) => b.addEventListener('click', resetAll));

  // ползунок «штук в коробе»
  const rMin = $('[data-range-min]');
  const rMax = $('[data-range-max]');
  [rMin, rMax].forEach((r) => { r.min = BOX_MIN; r.max = BOX_MAX; r.step = 1; });
  let rangeTimer;
  function setRange(a, b, live) {
    a = Math.max(BOX_MIN, Math.min(a, BOX_MAX));
    b = Math.max(BOX_MIN, Math.min(b, BOX_MAX));
    if (a > b) [a, b] = [b, a];
    st.box = [a, b];
    syncControls();
    clearTimeout(rangeTimer);
    rangeTimer = setTimeout(() => changed(), live ? 220 : 0);
  }
  rMin.addEventListener('input', () => { if (+rMin.value > +rMax.value) rMin.value = rMax.value; setRange(+rMin.value, +rMax.value, true); });
  rMax.addEventListener('input', () => { if (+rMax.value < +rMin.value) rMax.value = rMin.value; setRange(+rMin.value, +rMax.value, true); });
  $('[data-range-min-input]').addEventListener('change', (e) => setRange(+e.target.value || BOX_MIN, st.box[1]));
  $('[data-range-max-input]').addEventListener('change', (e) => setRange(st.box[0], +e.target.value || BOX_MAX));

  // сортировка
  const sortField = $('[data-sort]');
  S.initSelect(sortField);
  sortField.addEventListener('select:change', (e) => { st.sort = e.detail.value; render(); });

  // вид
  $$('[data-view]').forEach((b) => b.addEventListener('click', () => {
    if (st.view === b.dataset.view) return;
    st.view = b.dataset.view;
    try { localStorage.setItem('stellar.view', st.view); } catch (e) { /* нет доступа */ }
    render();
  }));

  // страницы
  const toResults = () => {
    const y = $('#results-top').getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
  };
  moreBtn.addEventListener('click', () => {
    moreBtn.classList.add('is-loading');
    setTimeout(() => { st.pages += 1; render(); moreBtn.classList.remove('is-loading'); }, reduceMotion ? 0 : 380);
  });
  pager.addEventListener('click', (e) => {
    const b = e.target.closest('[data-page]');
    if (!b || b.disabled) return;
    st.page = Number(b.dataset.page);
    st.pages = 1;
    render({ animate: false });
    toResults();
  });

  // кнопки «Показать N товаров»
  $('[data-picker-go]').addEventListener('click', toResults);
  $('[data-show-results]').addEventListener('click', () => { closeFilters(); toResults(); });

  /* ---------- Фильтры на узком экране ---------- */
  const backdrop = $('[data-filters-backdrop]');
  function openFilters() {
    filters.classList.add('is-open');
    backdrop.hidden = false;
    requestAnimationFrame(() => backdrop.classList.add('is-open'));
    document.documentElement.classList.add('is-locked');
  }
  function closeFilters() {
    if (!filters.classList.contains('is-open')) return;
    filters.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    document.documentElement.classList.remove('is-locked');
    setTimeout(() => { backdrop.hidden = true; }, 300);
  }
  $('[data-filters-open]').addEventListener('click', openFilters);
  $('[data-filters-close]').addEventListener('click', closeFilters);
  backdrop.addEventListener('click', closeFilters);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFilters(); });

  /* ---------- Сводка заказа ---------- */
  const bar = $('[data-order-bar]');
  function renderBar() {
    const cart = S.store.read('cart');
    bar.hidden = !cart.length;
    if (!cart.length) return;
    let boxes = 0, pcs = 0, vol = 0;
    cart.forEach((i) => {
      const p = D.byArt(i.art);
      boxes += i.qty;
      if (p) { pcs += i.qty * p.box; vol += p.volume ? i.qty * p.volume : 0; }
    });
    $('[data-ob-pos]').textContent = `${cart.length} ${plural(cart.length, ['позиция', 'позиции', 'позиций'])}`;
    $('[data-ob-boxes]').textContent = `${boxes} ${plural(boxes, ['короб', 'короба', 'коробов'])}`;
    $('[data-ob-pcs]').textContent = `${fmt(pcs)} шт`;
    $('[data-ob-vol]').textContent = vol ? `≈ ${fmt(vol, 2)} м³` : '';
    bar.classList.remove('is-bump'); void bar.offsetWidth; bar.classList.add('is-bump');
  }
  $('a', bar).href = D.href('order.html');
  document.addEventListener('stellar:store', (e) => { if (e.detail.key === 'cart') renderBar(); });

  /* ---------- Быстрый заказ по артикулам ---------- */
  const qo = $('[data-qo]');
  const qoText = $('[data-qo-text]');
  const qoPreview = $('[data-qo-preview]');
  const qoAdd = $('[data-qo-add]');
  let parsed = [];
  function toggleQO(force) {
    const open = force !== undefined ? force : !qo.classList.contains('is-open');
    if (open) {
      qo.hidden = false;
      requestAnimationFrame(() => qo.classList.add('is-open'));
      setTimeout(() => qoText.focus({ preventScroll: true }), 250);
      const r = qo.getBoundingClientRect();
      if (r.top < 90 || r.top > window.innerHeight * 0.6) toResults();
    } else {
      qo.classList.remove('is-open');
      setTimeout(() => { if (!qo.classList.contains('is-open')) qo.hidden = true; }, 500);
    }
    $$('[data-qo-toggle]').forEach((b) => b.hasAttribute('aria-expanded') && b.setAttribute('aria-expanded', String(open)));
  }
  $$('[data-qo-toggle]').forEach((b) => b.addEventListener('click', () => toggleQO()));

  function parseQO() {
    const map = new Map();
    const bad = new Set();
    qoText.value.split(/\r?\n|;/).forEach((line) => {
      const m = line.match(/(\d{4,5})(?:\D+(\d{1,3}))?/);
      if (!m) return;
      const art = m[1].padStart(5, '0');
      const q = Math.max(1, parseInt(m[2], 10) || 1);
      if (D.byArt(art)) map.set(art, (map.get(art) || 0) + q);
      else bad.add(art);
    });
    parsed = Array.from(map, ([art, qty]) => ({ art, qty, p: D.byArt(art) }));
    qoPreview.innerHTML = parsed.map((x, i) => `<li class="qo__item" style="animation-delay:${i * 30}ms" title="${esc(x.p.name)}"><img src="${x.p.img}" alt=""><b>${x.art}</b> × ${x.qty} кор.<small>${x.qty * x.p.box} шт</small></li>`).join('') +
      Array.from(bad).map((a) => `<li class="qo__item is-bad">${a} — нет в каталоге</li>`).join('');
    const n = parsed.length;
    qoAdd.disabled = !n;
    $('[data-qo-add-text]').textContent = n ? `Добавить ${n} ${plural(n, ['позицию', 'позиции', 'позиций'])} в заказ` : 'Добавить в заказ';
  }
  qoText.addEventListener('input', parseQO);
  $('[data-qo-example]').addEventListener('click', () => { qoText.value = '03228\t2\n02608\t5\n02179\t3'; parseQO(); qoText.focus(); });
  $('[data-qo-file]').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { qoText.value = String(r.result); parseQO(); S.toast(`Файл «${f.name}» прочитан`); };
    r.readAsText(f);
    e.target.value = '';
  });
  qoAdd.addEventListener('click', () => {
    if (!parsed.length) return;
    const cart = S.store.read('cart');
    let boxes = 0;
    parsed.forEach(({ art, qty, p }) => {
      boxes += qty;
      const item = cart.find((i) => i.art === art);
      if (item) item.qty = Math.min(99, item.qty + qty);
      else cart.push({ art, name: p.name, qty });
    });
    S.store.write('cart', cart);
    S.toast(`В заказ: ${parsed.length} ${plural(parsed.length, ['позиция', 'позиции', 'позиций'])} · ${boxes} ${plural(boxes, ['короб', 'короба', 'коробов'])}`);
    const t = $('[data-qo-add-text]');
    t.textContent = 'Добавлено ✓';
    qoAdd.disabled = true;
    setTimeout(() => { qoText.value = ''; parseQO(); }, 1400);
  });

  /* ---------- Старт ---------- */
  readURL();
  buildLists();
  render({ animate: false });
  renderBar();
  window.addEventListener('resize', () => $$('.seg').forEach(segInk));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => $$('.seg').forEach(segInk));
  // открыть быстрый заказ по ссылке catalog.html#quick-order
  if (location.hash === '#quick-order') toggleQO(true);
})();
