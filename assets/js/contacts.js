/* =========================================================
   «Контакты»: офисы ↔ карта, отделы ↔ форма, реквизиты
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const S = window.Stellar || {};
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Офисы и карта ---------- */
  const OFFICES = {
    sales: { name: 'Отдел продаж', query: 'Ростов-на-Дону, улица 2-я Луговая, 2а' },
    prod: { name: 'Производство', query: 'Ростов-на-Дону, улица Народного Ополчения, 65' },
  };
  const map = $('[data-map]');
  const live = $('[data-map-live]');
  const toggle = $('[data-map-toggle]');
  const openLink = $('[data-map-open]');
  const routeLink = $('[data-map-route]');
  let activeOffice = 'sales';

  const yaSearch = (q) => 'https://yandex.ru/maps/?text=' + encodeURIComponent(q);
  const yaRoute = (q) => 'https://yandex.ru/maps/?rtext=~' + encodeURIComponent(q) + '&rtt=auto';
  const yaWidget = (q) => 'https://yandex.ru/map-widget/v1/?mode=search&z=16&text=' + encodeURIComponent(q);

  function setOffice(id, opts = {}) {
    if (!OFFICES[id]) return;
    const changed = id !== activeOffice;
    activeOffice = id;
    $$('[data-office]').forEach((el) => el.classList.toggle('is-active', el.dataset.office === id));
    $$('[data-office-show]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.officeShow === id)));
    $$('[data-pin]').forEach((p) => p.classList.toggle('is-active', p.dataset.pin === id));
    if (map) map.dataset.active = id;
    const q = OFFICES[id].query;
    if (openLink) openLink.href = yaSearch(q);
    if (routeLink) routeLink.href = yaRoute(q);
    if (changed && map && map.classList.contains('is-live')) loadLive();
    if (opts.flashCard) {
      const card = $(`[data-office="${id}"]`);
      if (card) { card.classList.remove('is-flash'); void card.offsetWidth; card.classList.add('is-flash'); }
    }
    if (opts.scrollToMap && map) {
      const r = map.getBoundingClientRect();
      if (r.top < 90 || r.bottom > window.innerHeight) map.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    }
  }

  function loadLive() {
    if (!live) return;
    live.classList.remove('is-ready');
    live.innerHTML = '';
    const frame = document.createElement('iframe');
    frame.title = 'Карта: ' + OFFICES[activeOffice].name;
    frame.loading = 'lazy';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'no-referrer-when-downgrade';
    frame.addEventListener('load', () => live.classList.add('is-ready'));
    frame.src = yaWidget(OFFICES[activeOffice].query);
    live.appendChild(frame);
  }

  function setLive(on) {
    if (!map) return;
    map.classList.toggle('is-live', on);
    live.hidden = !on;
    toggle.setAttribute('aria-pressed', String(on));
    $('[data-map-toggle-text]', toggle).textContent = on ? 'Схема' : 'Интерактивная карта';
    if (on) loadLive();
    else { live.innerHTML = ''; live.classList.remove('is-ready'); }
  }

  if (map) {
    setOffice('sales');
    toggle.addEventListener('click', () => setLive(!map.classList.contains('is-live')));
    $$('[data-pin]').forEach((p) => p.addEventListener('click', () => setOffice(p.dataset.pin, { flashCard: true })));
  }

  // кнопки «Показать на карте» и клик по карточке офиса
  document.addEventListener('click', (e) => {
    const show = e.target.closest('[data-office-show]');
    if (show) {
      setOffice(show.dataset.officeShow, { scrollToMap: window.innerWidth <= 1180 });
      return;
    }
    const card = e.target.closest('[data-office]');
    if (card && !e.target.closest('a, button')) {
      if (window.getSelection && String(window.getSelection()).length) return; // не мешаем выделять текст
      setOffice(card.dataset.office);
    }
  });

  /* ---------- Отделы ↔ форма ---------- */
  const ask = $('#ask');
  const mainSelect = $('[data-main-select]');

  function markDept(value) {
    $$('[data-dept]').forEach((d) => d.classList.toggle('is-selected', d.dataset.dept === value));
  }
  if (mainSelect) {
    mainSelect.addEventListener('select:change', (e) => markDept(e.detail.value));
  }

  $$('[data-dept-write]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.deptWrite;
      const formWrap = ask;
      const form = $('[data-main-form]');
      // если открыт экран «Отправлено» — возвращаем форму
      const success = $('[data-form-success]', formWrap);
      if (success && !success.hidden) $('[data-form-reset]', success).click();

      if (mainSelect && mainSelect._select) {
        mainSelect._select.set(value);
        mainSelect._select.flash();
      }
      markDept(value);

      const r = formWrap.getBoundingClientRect();
      const needScroll = r.top < 100 || r.top > window.innerHeight * 0.45;
      if (needScroll) formWrap.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });

      formWrap.classList.remove('is-pulse'); void formWrap.offsetWidth; formWrap.classList.add('is-pulse');
      const name = $('[name="name"]', form);
      const msg = $('[name="message"]', form);
      setTimeout(() => (name && !name.value ? name : msg).focus({ preventScroll: true }), needScroll && !reduceMotion ? 520 : 60);
    });
  });

  // клик по карточке отдела (вне ссылок/кнопок) — тоже выбирает отдел
  $$('[data-dept]').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      $(`[data-dept-write="${card.dataset.dept}"]`, card).click();
    });
  });

  /* ---------- Реквизиты: скопировать всё ---------- */
  const copyAll = $('[data-copy-all]');
  if (copyAll) {
    copyAll.addEventListener('click', async () => {
      const rows = $$('.req__item').map((it) => `${$('dt', it).textContent.trim()}: ${$('.req__val', it).dataset.copy}`);
      const text = rows.join('\n');
      const ok = S.copyText ? await S.copyText(text) : false;
      if (!ok) return S.toast && S.toast('Не удалось скопировать — выделите текст вручную');
      const use = $('use', copyAll);
      const label = $('span', copyAll);
      use.setAttribute('href', '#i-check');
      label.textContent = 'Скопировано';
      S.toast && S.toast('Реквизиты скопированы — можно вставлять в договор');
      clearTimeout(copyAll._t);
      copyAll._t = setTimeout(() => { use.setAttribute('href', '#i-copy'); label.textContent = 'Скопировать всё'; }, 1800);
    });
  }
})();
