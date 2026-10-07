/* =========================================================
   Заказ: позиции из корзины, добавление по артикулу, итоги,
   данные компании с черновиком, отправка и экран «Спасибо».
   ========================================================= */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const S = window.Stellar;
  const D = window.STELLAR_DATA;
  const P = window.STELLAR_PRODUCTS || [];
  if (!S || !D || !$('[data-cart]')) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const rowsEl = $('[data-rows]');
  const itemsCard = $('[data-items-card]');
  const emptyCard = $('[data-empty]');
  const companyCard = $('[data-company-card]');
  const form = $('[data-order-form]');
  const sendBtn = $('[data-send]');
  const meter = $('[data-meter]');
  const MIN_BOXES = +(meter && meter.dataset.min) || 10;
  const rows = new Map(); // art → элемент строки

  const fmt = (n) => n.toLocaleString('ru-RU');
  const fmtVol = (v) => v.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' м³';
  const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c; };
  const cart = () => S.store.read('cart');
  const bump = (el) => { el.classList.remove('is-bump'); void el.offsetWidth; el.classList.add('is-bump'); };

  /* ---------- Шаги оформления ---------- */
  function setStep(n) {
    $$('[data-ostep]').forEach((li) => {
      const i = +li.dataset.ostep;
      li.classList.toggle('is-done', i < n);
      li.classList.toggle('is-active', i === n);
    });
  }

  /* ---------- Строки ---------- */
  function rowHTML(item) {
    const p = D.byArt(item.art);
    const url = S.href('product.html?art=' + item.art);
    const name = D.esc(p ? p.name : item.name || 'Товар');
    return `<div class="orow__prod">
  <a class="orow__img" href="${url}" tabindex="-1" aria-hidden="true">${p ? `<img src="${p.img}" alt="" loading="lazy">` : ''}</a>
  <div><a class="orow__name" href="${url}">${name}</a><span class="orow__meta">Арт. ${item.art}${p ? ' · ' + D.esc(p.sub) : ''}</span></div>
</div>
<span class="orow__box">${p ? p.box + ' шт' : '—'}</span>
<div class="stepper"><button type="button" data-row-step="-1" aria-label="Меньше коробов"><svg class="i"><use href="#i-minus"/></svg></button><span class="stepper__val"><b data-row-qty>${item.qty}</b> кор.</span><button type="button" data-row-step="1" aria-label="Больше коробов"><svg class="i"><use href="#i-plus"/></svg></button></div>
<span class="orow__pcs"><b data-row-pcs>${p ? fmt(p.box * item.qty) : '—'}</b></span>
<button class="orow__del" type="button" aria-label="Удалить ${name}" data-row-del><svg class="i"><use href="#i-trash"/></svg></button>`;
  }

  function createRow(item) {
    const row = document.createElement('div');
    row.className = 'orow';
    row.dataset.row = item.art;
    row.innerHTML = rowHTML(item);
    $$('[data-row-step]', row).forEach((b) => b.addEventListener('click', () => changeQty(item.art, +b.dataset.rowStep)));
    $('[data-row-del]', row).addEventListener('click', () => removeItem(item.art));
    return row;
  }

  function syncRow(row, item, dir) {
    const p = D.byArt(item.art);
    const q = $('[data-row-qty]', row);
    const pcs = $('[data-row-pcs]', row);
    if (q.textContent !== String(item.qty)) {
      q.textContent = item.qty;
      if (dir) { q.classList.remove('is-up', 'is-down'); void q.offsetWidth; q.classList.add(dir > 0 ? 'is-up' : 'is-down'); }
      if (p) { pcs.textContent = fmt(p.box * item.qty); bump(pcs); }
    }
    $('[data-row-step="-1"]', row).disabled = item.qty <= 1;
    $('[data-row-step="1"]', row).disabled = item.qty >= 99;
  }

  let lastDir = 0;
  function changeQty(art, d) {
    const list = cart();
    const item = list.find((i) => i.art === art);
    if (!item) return;
    const next = Math.min(99, Math.max(1, item.qty + d));
    if (next === item.qty) return;
    item.qty = next;
    lastDir = d;
    S.store.write('cart', list);
  }

  function removeItem(art) {
    const list = cart();
    const idx = list.findIndex((i) => i.art === art);
    if (idx < 0) return;
    const [item] = list.splice(idx, 1);
    const row = rows.get(art);
    const p = D.byArt(art);
    const done = () => {
      S.store.write('cart', list);
      S.toast(`Удалено: ${p ? p.name : item.name}`, 5000, {
        label: 'Вернуть',
        fn: () => { const l = cart().filter((i) => i.art !== art); l.splice(Math.min(idx, l.length), 0, item); flashArt = art; S.store.write('cart', l); },
      });
    };
    if (!row || reduceMotion) { done(); return; }
    row._leaving = true;
    const h = row.offsetHeight;
    row.animate([
      { height: h + 'px', opacity: 1, transform: 'none' },
      { height: h + 'px', opacity: 0, transform: 'translateX(-24px)', offset: 0.45 },
      { height: '0px', opacity: 0, paddingTop: 0, paddingBottom: 0, borderBottomWidth: 0, transform: 'translateX(-24px)' },
    ], { duration: 520, easing: 'cubic-bezier(.65, 0, .35, 1)' }).finished.then(() => { row.remove(); rows.delete(art); done(); });
  }

  /* ---------- Итоги ---------- */
  const shown = {};
  function countTo(el, key, to, format) {
    const from = shown[key] == null ? to : shown[key];
    shown[key] = to;
    if (from === to) { el.textContent = format(to); return; }
    bump(el);
    if (reduceMotion) { el.textContent = format(to); return; }
    const t0 = performance.now(), dur = 450;
    (function tick(t) {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = format(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }

  function totals(list) {
    let boxes = 0, pcs = 0, vol = 0, volKnown = true;
    list.forEach((i) => {
      const p = D.byArt(i.art);
      boxes += i.qty;
      if (p) pcs += p.box * i.qty;
      if (p && p.volume) vol += p.volume * i.qty; else volKnown = false;
    });
    return { pos: list.length, boxes, pcs, vol, volKnown };
  }

  function renderSummary(list) {
    const t = totals(list);
    countTo($('[data-sum="pos"]'), 'pos', t.pos, (v) => fmt(Math.round(v)));
    countTo($('[data-sum="boxes"]'), 'boxes', t.boxes, (v) => fmt(Math.round(v)));
    countTo($('[data-sum="pcs"]'), 'pcs', t.pcs, (v) => fmt(Math.round(v)));
    countTo($('[data-sum="vol"]'), 'vol', t.vol, (v) => (t.pos ? (t.volKnown ? '' : '≈ ') + fmtVol(v) : '—'));
    $('[data-pos-count]').textContent = t.pos;

    const left = MIN_BOXES - t.boxes;
    meter.classList.toggle('is-ok', left <= 0);
    $('[data-meter-bar]').style.setProperty('--p', Math.min(100, (t.boxes / MIN_BOXES) * 100) + '%');
    $('[data-meter-text]').textContent = !t.pos
      ? `Минимальная партия — ${MIN_BOXES} коробов`
      : left > 0 ? `Ещё ${left} ${plural(left, 'короб', 'короба', 'коробов')} до минимальной партии` : 'Минимальная партия набрана';
    sendBtn.disabled = !t.pos;
  }

  /* ---------- Пустое состояние ---------- */
  let emptyFilled = false;
  function renderEmpty(isEmpty) {
    itemsCard.hidden = isEmpty;
    companyCard.hidden = isEmpty;
    emptyCard.hidden = !isEmpty;
    if (isEmpty && !emptyFilled) {
      emptyFilled = true;
      const grid = $('[data-empty-grid]');
      grid.innerHTML = P.slice().sort((a, b) => b.pop - a.pop).slice(0, 3).map(D.cardHTML).join('');
      S.initProductCards(grid);
    }
    if (isEmpty) setStep(1);
  }

  /* ---------- Рендер ---------- */
  let flashArt = null;
  function render() {
    const list = cart();
    const arts = new Set(list.map((i) => i.art));
    rows.forEach((row, art) => { if (!arts.has(art) && !row._leaving) { row.remove(); rows.delete(art); } });
    list.forEach((item, idx) => {
      let row = rows.get(item.art);
      if (!row) {
        row = createRow(item);
        rows.set(item.art, row);
      }
      const at = rowsEl.children[idx];
      if (at !== row) rowsEl.insertBefore(row, at || null);
      syncRow(row, item, lastDir);
    });
    lastDir = 0;
    if (flashArt && rows.get(flashArt)) {
      const r = rows.get(flashArt);
      r.classList.remove('is-new'); void r.offsetWidth; r.classList.add('is-new');
      const box = r.getBoundingClientRect();
      if (box.top < 90 || box.bottom > innerHeight) r.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    flashArt = null;
    renderEmpty(!list.length);
    renderSummary(list);
  }
  document.addEventListener('stellar:store', (e) => { if (e.detail.key === 'cart') render(); });

  /* ---------- Очистить и CSV ---------- */
  $('[data-clear]').addEventListener('click', () => {
    const saved = cart();
    if (!saved.length) return;
    const leaving = [...rows.values()];
    const finish = () => {
      S.store.write('cart', []);
      S.toast(`Заказ очищен: ${saved.length} ${plural(saved.length, 'позиция', 'позиции', 'позиций')}`, 5000, { label: 'Вернуть', fn: () => S.store.write('cart', saved) });
    };
    if (reduceMotion) { finish(); return; }
    leaving.forEach((r, i) => { r._leaving = true; r.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-24px)' }], { duration: 260, delay: i * 50, easing: 'ease-in', fill: 'forwards' }); });
    setTimeout(() => { leaving.forEach((r) => r.remove()); rows.clear(); finish(); }, 260 + leaving.length * 50);
  });

  function csvRows(list, extra) {
    const out = [];
    if (extra) { extra.forEach((r) => out.push(r)); out.push([]); }
    out.push(['Артикул', 'Наименование', 'В коробе, шт', 'Коробов', 'Итого, шт', 'Объём, м³']);
    list.forEach((i) => {
      const p = D.byArt(i.art);
      out.push([i.art, p ? p.name : i.name, p ? p.box : '', i.qty, p ? p.box * i.qty : '', p && p.volume ? (p.volume * i.qty).toFixed(3).replace('.', ',') : '']);
    });
    const t = totals(list);
    out.push(['', 'Итого', '', t.boxes, t.pcs, t.vol.toFixed(3).replace('.', ',')]);
    return out;
  }
  function companyRows(data) {
    const map = [['Компания', 'company'], ['ИНН', 'inn'], ['Город доставки', 'city'], ['Контактное лицо', 'name'], ['Телефон', 'phone'], ['E-mail', 'email'], ['Комментарий', 'comment']];
    return map.filter(([, k]) => data[k]).map(([label, k]) => [label, data[k]]);
  }
  const today = () => new Date().toISOString().slice(0, 10);
  $('[data-csv]').addEventListener('click', () => {
    const list = cart();
    if (!list.length) return;
    const extra = companyRows(readForm());
    S.downloadCSV(csvRows(list, extra.length ? extra : null), `stellar-zakaz-${today()}.csv`);
    S.toast('Файл заказа скачан — открывается в Excel');
  });

  /* ---------- Добавить по артикулу ---------- */
  const addField = $('.addart__field');
  const addInput = $('[data-addart-input]');
  const addList = $('[data-addart-list]');
  let matches = [], active = -1;

  function find(q) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    const digits = q.replace(/\D/g, '');
    return P.filter((p) => (digits && p.art.includes(digits)) || p.name.toLowerCase().includes(q))
      .sort((a, b) => (b.art.startsWith(digits) && digits ? 1 : 0) - (a.art.startsWith(digits) && digits ? 1 : 0) || b.pop - a.pop)
      .slice(0, 6);
  }
  function hl(text, q) {
    const s = D.esc(text);
    q = q.trim();
    if (!q) return s;
    const i = s.toLowerCase().indexOf(D.esc(q).toLowerCase());
    return i < 0 ? s : s.slice(0, i) + '<mark>' + s.slice(i, i + q.length) + '</mark>' + s.slice(i + q.length);
  }
  function renderList() {
    const q = addInput.value;
    matches = find(q);
    active = matches.length ? 0 : -1;
    const inCart = cart();
    addList.innerHTML = matches.map((p, i) => {
      const it = inCart.find((c) => c.art === p.art);
      return `<li role="option" data-i="${i}" class="${i === active ? 'is-active' : ''}${it ? ' is-in' : ''}"><img src="${p.img}" alt=""><span>${hl(p.name, q)}</span><small>${it ? 'в заказе · ' + it.qty + ' кор.' : 'арт. ' + hl(p.art, q.replace(/\D/g, ''))}</small></li>`;
    }).join('') || (q.trim() ? '<li class="is-none" aria-disabled="true"><span>Ничего не нашли — проверьте артикул</span></li>' : '');
    addField.classList.toggle('is-open', !!q.trim());
  }
  function setActive(i) {
    if (!matches.length) return;
    active = (i + matches.length) % matches.length;
    $$('li', addList).forEach((li, k) => li.classList.toggle('is-active', k === active));
  }
  function addProduct(p) {
    const list = cart();
    const it = list.find((i) => i.art === p.art);
    if (it) { it.qty = Math.min(99, it.qty + 1); S.toast(`+1 короб: ${p.name}`); }
    else { list.push({ art: p.art, name: p.name, qty: 1 }); S.toast(`Добавлено: ${p.name} · 1 кор.`); }
    flashArt = p.art;
    lastDir = 1;
    S.store.write('cart', list);
    addInput.value = '';
    addField.classList.remove('is-open');
  }
  function submitAdd() {
    const q = addInput.value.trim();
    const exact = P.find((p) => p.art === q.replace(/\D/g, '') && q.replace(/\D/g, '').length >= 4);
    const pick = exact || (active >= 0 ? matches[active] : null);
    if (pick) { addProduct(pick); return; }
    addField.classList.remove('is-shake'); void addField.offsetWidth; addField.classList.add('is-shake');
    S.toast(q ? `Не нашли товар «${q}»` : 'Введите артикул или название');
    addInput.focus();
  }
  addInput.addEventListener('input', renderList);
  addInput.addEventListener('focus', () => { if (addInput.value.trim()) renderList(); });
  addInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); submitAdd(); }
    else if (e.key === 'Escape') addField.classList.remove('is-open');
  });
  addList.addEventListener('mousedown', (e) => {
    const li = e.target.closest('li[data-i]');
    if (!li) return;
    e.preventDefault();
    addProduct(matches[+li.dataset.i]);
  });
  addList.addEventListener('mousemove', (e) => { const li = e.target.closest('li[data-i]'); if (li && +li.dataset.i !== active) setActive(+li.dataset.i); });
  document.addEventListener('click', (e) => { if (!addField.contains(e.target)) addField.classList.remove('is-open'); });
  $('[data-addart-btn]').addEventListener('click', submitAdd);

  /* ---------- Данные компании: черновик ---------- */
  const DRAFT = 'stellar.orderDraft';
  const fields = ['company', 'inn', 'city', 'name', 'phone', 'email', 'comment'];
  function readForm() {
    const o = {};
    fields.forEach((k) => { o[k] = (form.elements[k].value || '').trim(); });
    o.edo = form.elements.edo.checked;
    return o;
  }
  function saveDraft() {
    try { localStorage.setItem(DRAFT, JSON.stringify(readForm())); return true; } catch (e) { return false; }
  }
  (function restoreDraft() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(DRAFT) || 'null'); } catch (e) { /* нет доступа */ }
    if (!d) return;
    fields.forEach((k) => { if (d[k]) form.elements[k].value = d[k]; });
    form.elements.edo.checked = !!d.edo;
  })();
  form.elements.inn.addEventListener('input', () => { const el = form.elements.inn; const v = el.value.replace(/\D/g, '').slice(0, 12); if (v !== el.value) el.value = v; });
  let draftTimer;
  form.addEventListener('input', () => { clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 500); });
  form.addEventListener('change', saveDraft);
  form.addEventListener('focusin', () => { if (cart().length) setStep(2); });

  const draftBtn = $('[data-draft]');
  const draftText = $('[data-draft-text]');
  let draftReset;
  draftBtn.addEventListener('click', () => {
    saveDraft();
    draftText.textContent = 'Черновик сохранён';
    draftBtn.classList.add('is-saved');
    clearTimeout(draftReset);
    draftReset = setTimeout(() => { draftText.textContent = 'Сохранить черновик'; draftBtn.classList.remove('is-saved'); }, 2400);
    S.toast('Заказ и данные сохранены на этом устройстве');
  });

  /* ---------- Отправка ---------- */
  sendBtn.addEventListener('click', () => {
    if (!cart().length) { S.toast('Добавьте хотя бы одну позицию'); return; }
    setStep(2);
    form.requestSubmit();
  });
  form.addEventListener('stellar:invalid', () => S.toast('Заполните данные компании — так менеджер сможет выставить счёт', 3200));
  form.addEventListener('stellar:valid', async () => {
    if (sendBtn.classList.contains('is-loading')) return;
    sendBtn.classList.add('is-loading');
    sendBtn.setAttribute('aria-busy', 'true');
    const data = readForm();
    const list = cart();
    try {
      const endpoint = form.dataset.endpoint;
      if (endpoint) {
        const body = new FormData(form);
        body.append('items', JSON.stringify(list));
        const res = await fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body });
        if (!res.ok) throw new Error(res.status);
      } else {
        await new Promise((r) => setTimeout(r, 1300));
      }
    } catch (err) {
      sendBtn.classList.remove('is-loading');
      sendBtn.removeAttribute('aria-busy');
      S.toast('Не удалось отправить. Позвоните нам: +7 (863) 290-31-16', 4000);
      return;
    }
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const order = {
      num: `СТ-${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: d.toISOString(), items: list, company: data,
    };
    try { localStorage.setItem('stellar.lastOrder', JSON.stringify(order)); } catch (e) { /* ок */ }
    lastOrder = order;
    sendBtn.classList.remove('is-loading');
    sendBtn.removeAttribute('aria-busy');
    S.store.write('cart', []);
    showDone(order);
  });

  /* ---------- Экран «Спасибо» ---------- */
  const doneEl = $('[data-done]');
  const cartEl = $('[data-cart]');
  let lastOrder = null;
  function showDone(order) {
    const t = totals(order.items);
    $('[data-done-num]').textContent = order.num;
    const c = order.company;
    $('[data-done-contact]').textContent = c.email ? `на ${c.email}` : c.phone ? `и позвонит по номеру ${c.phone}` : '';
    $('[data-done-stats]').innerHTML = [['Позиций', t.pos], ['Коробов', t.boxes], ['Штук', fmt(t.pcs)], ['Объём', t.volKnown ? fmtVol(t.vol) : '≈ ' + fmtVol(t.vol)]]
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    cartEl.hidden = true;
    doneEl.hidden = false;
    doneEl.classList.remove('is-in'); void doneEl.offsetWidth; doneEl.classList.add('is-in');
    setStep(3);
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    confetti();
  }
  $('[data-done-csv]').addEventListener('click', () => {
    if (!lastOrder) return;
    S.downloadCSV(csvRows(lastOrder.items, [['Заказ', lastOrder.num], ...companyRows(lastOrder.company)]), `stellar-${lastOrder.num}.csv`);
  });
  $('[data-repeat]').addEventListener('click', () => {
    if (!lastOrder) return;
    S.store.write('cart', lastOrder.items.map((i) => ({ ...i })));
    doneEl.hidden = true;
    cartEl.hidden = false;
    setStep(1);
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    S.toast('Позиции прошлого заказа снова в корзине');
  });

  function confetti() {
    if (reduceMotion) return;
    const cv = document.createElement('canvas');
    cv.className = 'confetti';
    const dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    const colors = ['#F0503A', '#D63F2A', '#1C1E23', '#FDE4DE', '#1C8050', '#F2B33D'];
    const cx = innerWidth / 2;
    const parts = Array.from({ length: 140 }, () => ({
      x: cx + (Math.random() - 0.5) * 120, y: innerHeight * 0.32,
      vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 14 - 4,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      w: 6 + Math.random() * 6, h: 4 + Math.random() * 6, c: colors[(Math.random() * colors.length) | 0],
    }));
    const t0 = performance.now();
    (function frame(t) {
      const k = (t - t0) / 2200;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach((p) => {
        p.vy += 0.35; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k * k); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      });
      if (k < 1) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  }

  render();
})();
