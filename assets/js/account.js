/* =========================================================
   Стеллар — вход для партнёров и кабинет (демо без сервера)
   ========================================================= */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const S = window.Stellar || {};
  const D = window.STELLAR_DATA || {};
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? 0 : ms));
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c; };
  const busy = (btn, on) => { if (!btn) return; btn.classList.toggle('is-loading', on); if (on) btn.setAttribute('aria-busy', 'true'); else btn.removeAttribute('aria-busy'); };

  /* ---------- Вход ---------- */
  const auth = $('[data-auth]');
  if (auth) {
    const views = $$('[data-auth-view]', auth);
    const show = (name) => {
      views.forEach((v) => {
        const on = v.dataset.authView === name;
        v.hidden = !on;
        v.classList.remove('is-fade-in', 'is-in');
        if (on) { void v.offsetWidth; v.classList.add('is-fade-in'); if (name === 'sent') v.classList.add('is-in'); }
      });
      const f = $(`[data-auth-view="${name}"] input:not([type=checkbox])`, auth);
      if (f && name !== 'sent') f.focus({ preventScroll: true });
    };
    $$('[data-auth-go]', auth).forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.authGo === 'reset') { const from = $('#lg-email'), to = $('#rs-email'); if (from && to && from.value) to.value = from.value; }
      show(b.dataset.authGo);
    }));
    const sent = (email) => { $('[data-sent-to]', auth).textContent = email; show('sent'); };

    // показать / скрыть пароль
    $$('[data-eye]').forEach((b) => b.addEventListener('click', () => {
      const input = $('input', b.closest('.field'));
      const on = input.type === 'password';
      input.type = on ? 'text' : 'password';
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', on ? 'Скрыть пароль' : 'Показать пароль');
      $('use', b).setAttribute('href', on ? '#i-eye-off' : '#i-eye');
      input.focus();
    }));

    const login = $('[data-login]');
    login.addEventListener('stellar:valid', async () => {
      const btn = $('[data-submit]', login);
      busy(btn, true);
      await wait(1000);
      location.href = S.href ? S.href('cabinet.html') : 'cabinet.html';
    });
    const reset = $('[data-reset]');
    reset.addEventListener('stellar:valid', async () => {
      const btn = $('[data-submit]', reset);
      busy(btn, true); await wait(900); busy(btn, false);
      sent($('#rs-email').value.trim());
    });

    // ссылка для входа на почту
    const magic = $('[data-magic]');
    magic.addEventListener('click', async () => {
      const input = $('#lg-email');
      const v = input.value.trim();
      if (!EMAIL_RE.test(v)) {
        const field = input.closest('[data-field]');
        field.classList.add('is-invalid'); field.classList.remove('is-valid');
        $('.field__error span', field).textContent = v ? 'Похоже, в адресе ошибка' : 'Укажите e-mail — пришлём ссылку';
        field.classList.remove('is-shake'); void field.offsetWidth; field.classList.add('is-shake');
        input.focus();
        return;
      }
      busy(magic, true); await wait(900); busy(magic, false);
      sent(v);
    });
  }

  /* ---------- Кабинет ---------- */
  const cab = $('.cab');
  if (!cab) return;

  // приветствие по времени суток
  const greet = $('[data-greet]');
  if (greet) { const h = new Date().getHours(); greet.textContent = h < 5 ? 'Доброй ночи!' : h < 12 ? 'Доброе утро!' : h < 18 ? 'Добрый день!' : 'Добрый вечер!'; }

  // меню: бегунок + подсветка раздела при прокрутке
  const nav = $('.cnav');
  const ink = $('.cnav__ink', nav);
  const items = $$('.cnav__item', nav);
  const setActive = (a) => {
    items.forEach((x) => x.classList.toggle('is-active', x === a));
    if (ink && a) ink.style.setProperty('--y', a.offsetTop + 'px');
  };
  setActive(items[0]);
  const anchors = items.filter((a) => a.hasAttribute('data-cnav'));
  let lock = 0;
  anchors.forEach((a) => a.addEventListener('click', (e) => {
    const t = $(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    setActive(a);
    lock = Date.now();
    const top = a.getAttribute('href') === '#overview' ? 0 : t.getBoundingClientRect().top + scrollY - 110;
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    if (t.classList.contains('cpanel') || t.id === 'price') { const el = t.id === 'price' ? $('.cq--red', t) : t; el.classList.remove('is-flash'); void el.offsetWidth; el.classList.add('is-flash'); }
    history.replaceState(null, '', a.getAttribute('href'));
  }));
  const onScroll = () => {
    if (Date.now() - lock < 900) return;
    let cur = anchors[0];
    if (scrollY < 60) { if (!cur.classList.contains('is-active')) setActive(cur); return; }
    anchors.forEach((a) => { const t = $(a.getAttribute('href')); if (t && t.getBoundingClientRect().top < innerHeight * 0.35) cur = a; });
    if ((innerHeight + scrollY) >= document.documentElement.scrollHeight - 4) cur = anchors[anchors.length - 1];
    if (!cur.classList.contains('is-active')) setActive(cur);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => setActive($('.cnav__item.is-active', nav)));

  // демо-состав заказа: детерминированно берём позиции из каталога
  const P = window.STELLAR_PRODUCTS || [];
  const orderLines = (no) => {
    const tr = $(`tr[data-order="${no}"]`);
    const n = tr ? +tr.dataset.lines : 6;
    const start = (+no * 7) % Math.max(P.length, 1);
    return Array.from({ length: Math.min(n, P.length) }, (_, i) => P[(start + i * 3) % P.length]).filter((p, i, arr) => arr.indexOf(p) === i)
      .map((p, i) => ({ p, qty: 1 + ((+no + i) % 4) }));
  };

  // повторить заказ → в корзину
  $$('[data-repeat]').forEach((b) => b.addEventListener('click', async () => {
    if (b.classList.contains('is-busy')) return;
    const no = b.dataset.repeat;
    b.classList.add('is-busy');
    await wait(500);
    const lines = orderLines(no);
    const cart = S.store.read('cart');
    lines.forEach(({ p, qty }) => {
      const ex = cart.find((i) => i.art === p.art);
      if (ex) ex.qty = (ex.qty || 1) + qty; else cart.push({ art: p.art, name: p.name, qty });
    });
    S.store.write('cart', cart);
    b.classList.remove('is-busy');
    S.toast(`Заказ № ${no} повторён: ${lines.length} ${plural(lines.length, 'позиция', 'позиции', 'позиций')} в заказе`, 5000, { label: 'К заказу', fn: () => { location.href = S.href('order.html'); } });
  }));

  // скачать состав заказа
  $$('[data-order-csv]').forEach((b) => b.addEventListener('click', () => {
    const no = b.dataset.orderCsv;
    const rows = [['Артикул', 'Наименование', 'Коробов']].concat(orderLines(no).map(({ p, qty }) => [p.art, p.name, qty]));
    S.downloadCSV(rows, `Стеллар — заказ ${no}.csv`);
    S.toast(`Состав заказа № ${no} скачан`);
  }));

  // прайс-лист (демо: CSV из каталога)
  const priceBtn = $('[data-price-dl]');
  if (priceBtn) priceBtn.addEventListener('click', () => {
    const rows = [['Артикул', 'Наименование', 'Категория', 'Штук в коробе']].concat(P.map((p) => [p.art, p.name, (D.CATEGORIES || {})[p.cat] || '', p.box || '']));
    S.downloadCSV(rows, 'Стеллар — прайс-лист.csv');
    S.toast('Прайс-лист скачан. В демо — без цен');
  });

  // документы
  $$('[data-doc]').forEach((b) => b.addEventListener('click', () => S.toast(`«${b.dataset.doc}» — в рабочей версии скачается файл`, 3500)));

  // новинки
  const minis = $('[data-new-arts]');
  if (minis && D.byArt) {
    minis.innerHTML = minis.dataset.newArts.split(',').map((a) => D.byArt(a)).filter(Boolean).map((p) =>
      `<a class="cmini" href="${S.href('product.html?art=' + p.art)}"><span class="cmini__img"><img src="${p.img}" alt="" loading="lazy"></span><b title="${p.name.replace(/"/g, '&quot;')}">${p.name}</b><small>Арт. ${p.art}</small></a>`).join('');
  }
})();
