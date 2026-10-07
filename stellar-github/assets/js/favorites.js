/* =========================================================
   Избранное: карточки отложенных товаров, вкладки, «поделиться»,
   CSV, «добавить всё в заказ», подборка по ссылке ?list=…
   ========================================================= */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const S = window.Stellar;
  const D = window.STELLAR_DATA;
  const P = window.STELLAR_PRODUCTS || [];
  if (!S || !D || !$('[data-fgrid]')) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const grid = $('[data-fgrid]');
  const empty = $('[data-fempty]');
  const actions = $('[data-fav-actions]');
  const countEl = $('[data-fcount]');
  const allBtn = $('[data-all-to-cart]');
  const allText = $('[data-all-text]');
  const promo = $('[data-promo-tpl]').content.firstElementChild.cloneNode(true);
  const cards = new Map(); // art → карточка

  /* ---------- Подборка по ссылке ---------- */
  const params = new URLSearchParams(location.search);
  let shared = (params.get('list') || '').split(',').map((a) => a.trim()).filter((a, i, arr) => D.byArt(a) && arr.indexOf(a) === i);
  const sharedBar = $('[data-shared]');
  if (shared.length) {
    sharedBar.hidden = false;
    $('[data-shared-count]').textContent = `${shared.length} ${plural(shared.length, 'товар', 'товара', 'товаров')}`;
    $('[data-shared-mine]').href = S.href('favorites.html');
  } else shared = null;
  $('[data-shared-save]').addEventListener('click', () => {
    const favs = S.store.read('fav');
    const add = shared.filter((a) => !favs.includes(a));
    sharedBar.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-8px)' }], { duration: 250, easing: 'ease-in' })
      .finished.then(() => { sharedBar.hidden = true; });
    shared = null;
    history.replaceState(null, '', location.pathname);
    S.store.write('fav', favs.concat(add));
    S.toast(add.length ? `Сохранено в избранное: ${add.length}` : 'Все товары уже были в избранном');
  });

  function plural(n, a, b, c) { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c; }
  const list = () => (shared || S.store.read('fav')).filter((a) => D.byArt(a));
  const cartArts = () => S.store.read('cart').map((i) => i.art);

  /* ---------- Карточки ---------- */
  function makeCard(art) {
    const tmp = document.createElement('div');
    tmp.innerHTML = D.cardHTML(D.byArt(art));
    const card = tmp.firstElementChild;
    card._keep = true;
    return card;
  }

  function cols() { return getComputedStyle(grid).gridTemplateColumns.split(' ').length; }
  function placePromo(n) {
    const c = cols();
    const rem = c - (n % c);
    const span = rem; // заполняет остаток последнего ряда
    promo.style.gridColumn = `span ${span}`;
    promo.classList.toggle('fpromo--wide', span === c && c > 2);
    promo.classList.toggle('fpromo--narrow', span === 1 && c > 2);
    grid.appendChild(promo);
  }

  // FLIP: карточки плавно съезжают на новые места
  function flip(mutate) {
    if (reduceMotion) { mutate(); return; }
    const els = [...cards.values(), promo].filter((el) => el.isConnected);
    const before = new Map(els.map((el) => [el, el.getBoundingClientRect()]));
    mutate();
    els.forEach((el) => {
      if (!el.isConnected) return;
      const a = before.get(el), b = el.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (!dx && !dy) return;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.16, 1, .3, 1)' });
    });
  }

  let first = true;
  function render() {
    const arts = list();
    const keep = new Set(arts);
    const leaving = [...cards.entries()].filter(([a, el]) => !keep.has(a) && !el._leaving);

    const place = () => {
      arts.forEach((art, i) => {
        let card = cards.get(art);
        const isNew = !card;
        if (isNew) { card = makeCard(art); cards.set(art, card); }
        if (grid.children[i] !== card) grid.insertBefore(card, grid.children[i] || null);
        if (isNew) {
          S.initProductCards(grid);
          if (!first && !reduceMotion) card.animate([{ opacity: 0, transform: 'scale(.92)' }, { opacity: 1, transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.16, 1, .3, 1)' });
          else if (first && !reduceMotion) card.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 640, delay: Math.min(i, 8) * 60, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'backwards' });
        }
      });
      if (arts.length) placePromo(arts.length); else promo.remove();
    };

    if (leaving.length && !reduceMotion) {
      leaving.forEach(([art, el]) => {
        el._leaving = true;
        el.classList.add('is-leaving');
        el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.88)' }], { duration: 300, easing: 'ease-in', fill: 'forwards' })
          .finished.then(() => flip(() => { el.remove(); cards.delete(art); place(); }));
      });
    } else {
      leaving.forEach(([art, el]) => { el.remove(); cards.delete(art); });
      flip(place);
    }

    renderMeta(arts);
    first = false;
  }

  function renderMeta(arts) {
    const was = countEl.textContent;
    countEl.textContent = arts.length;
    if (was !== String(arts.length)) { countEl.classList.remove('is-bump'); void countEl.offsetWidth; countEl.classList.add('is-bump'); }
    const isEmpty = !arts.length;
    actions.hidden = isEmpty;
    grid.hidden = isEmpty && !cards.size;
    if (isEmpty) setTimeout(showEmpty, cards.size && !reduceMotion ? 340 : 0); else empty.hidden = true;
    renderAllBtn(arts);
    moveInk();
  }

  let emptyFilled = false;
  function showEmpty() {
    if (list().length) return;
    grid.hidden = true;
    empty.hidden = false;
    if (emptyFilled) return;
    emptyFilled = true;
    const box = $('[data-fempty-grid]');
    box.innerHTML = P.filter((p) => p.tags.includes('hit')).concat(P.slice().sort((a, b) => b.pop - a.pop)).filter((p, i, a) => a.indexOf(p) === i).slice(0, 4).map(D.cardHTML).join('');
    S.initProductCards(box);
  }

  function renderAllBtn(arts = list()) {
    const inCart = cartArts();
    const missing = arts.filter((a) => !inCart.includes(a)).length;
    const all = arts.length && !missing;
    allBtn.classList.toggle('btn--primary', !all);
    allBtn.classList.toggle('btn--coral-soft', !!all);
    allText.textContent = all ? 'Всё в заказе — оформить' : missing === arts.length ? 'Добавить всё в заказ' : `Добавить в заказ ещё ${missing}`;
  }

  let removedFrom = new Map(); // для «Вернуть»: art → индекс
  let prevFav = S.store.read('fav');
  document.addEventListener('stellar:store', (e) => {
    if (e.detail.key === 'cart') { renderAllBtn(); return; }
    if (e.detail.key !== 'fav') return;
    const now = S.store.read('fav');
    const gone = prevFav.filter((a) => !now.includes(a));
    gone.forEach((a) => removedFrom.set(a, prevFav.indexOf(a)));
    prevFav = now;
    if (shared) return; // в чужой подборке карточки не исчезают
    render();
    if (gone.length === 1) {
      const art = gone[0];
      const p = D.byArt(art);
      // после стандартного тоста карточки — свой, с отменой
      setTimeout(() => S.toast(`Убрано: ${p ? p.name : 'товар'}`, 5000, {
        label: 'Вернуть',
        fn: () => { const f = S.store.read('fav').filter((a) => a !== art); f.splice(Math.min(removedFrom.get(art) || 0, f.length), 0, art); S.store.write('fav', f); },
      }), 0);
    }
  });

  /* ---------- Вкладки ---------- */
  const tabs = $$('[data-ftab]');
  const ink = $('.fav-tabs__ink');
  function moveInk() {
    const t = tabs.find((b) => b.getAttribute('aria-selected') === 'true');
    if (!t) return;
    ink.style.width = t.offsetWidth + 'px';
    ink.style.transform = `translateX(${t.offsetLeft}px)`;
  }
  tabs.forEach((t) => t.addEventListener('click', () => {
    tabs.forEach((b) => b.setAttribute('aria-selected', String(b === t)));
    $$('[data-fpane]').forEach((p) => {
      const on = p.dataset.fpane === t.dataset.ftab;
      if (on && p.hidden) { p.hidden = false; if (!reduceMotion) p.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 400, easing: 'cubic-bezier(.16, 1, .3, 1)' }); }
      else if (!on) p.hidden = true;
    });
    actions.hidden = t.dataset.ftab !== 'products' || !list().length;
    moveInk();
  }));
  window.addEventListener('resize', () => { moveInk(); if (list().length) placePromo(list().length); });
  if (document.fonts) document.fonts.ready.then(moveInk);

  /* ---------- Действия ---------- */
  $('[data-share-list]').addEventListener('click', async () => {
    const arts = list();
    const url = location.href.split(/[?#]/)[0] + '?list=' + arts.join(',');
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({ title: 'Подборка «Стеллар»', url }); return; } catch (e) { /* отменили — копируем */ }
    }
    const ok = await S.copyText(url);
    S.toast(ok ? 'Ссылка на подборку скопирована' : 'Не удалось скопировать ссылку');
  });

  $('[data-fav-csv]').addEventListener('click', () => {
    const base = location.href.split(/[?#]/)[0].replace(/[^/]*$/, '');
    const rows = [['Артикул', 'Наименование', 'Категория', 'В коробе, шт', 'Возраст', 'Габариты короба', 'Ссылка']];
    list().forEach((a) => { const p = D.byArt(a); rows.push([p.art, p.name, p.sub, p.box, D.ageOf(p.age).label, D.dims(p.carton), base + 'product.html?art=' + p.art]); });
    S.downloadCSV(rows, `stellar-izbrannoe-${new Date().toISOString().slice(0, 10)}.csv`);
    S.toast('Список скачан — открывается в Excel');
  });

  let flying = false;
  allBtn.addEventListener('click', async () => {
    if (flying) return;
    const arts = list();
    const inCart = cartArts();
    const missing = arts.filter((a) => !inCart.includes(a));
    if (!missing.length) { location.href = S.href('order.html'); return; }
    flying = true;
    const imgs = missing.slice(0, 6).map((a) => cards.get(a)).filter(Boolean).map((c) => $('.pcard__img img', c))
      .filter((img) => { const r = img.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; });
    await Promise.all(imgs.map((img, i) => new Promise((res) => setTimeout(() => S.flyToCart(img).then(res), i * 110))));
    const cart = S.store.read('cart');
    missing.forEach((a) => cart.push({ art: a, name: D.byArt(a).name, qty: 1 }));
    S.store.write('cart', cart);
    flying = false;
    S.toast(`В заказ добавлено ${missing.length} ${plural(missing.length, 'позиция', 'позиции', 'позиций')} по 1 коробу`, 5000, { label: 'К заказу', fn: () => { location.href = S.href('order.html'); } });
  });

  render();
})();
