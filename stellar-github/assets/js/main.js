/* =========================================================
   Стеллар — общие скрипты: шапка, поиск, меню, окна, формы,
   копирование, тосты, анимации появления, статус «открыто».
   Без зависимостей.
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const Stellar = (window.Stellar = window.Stellar || {});

  // В песочнице (превью файла, iframe без своего адреса) смена адреса страницы запрещена
  // и ломала отрисовку каталога — глушим ошибку, страница работает и без обновления адреса.
  ['replaceState', 'pushState'].forEach((m) => {
    const orig = history[m];
    history[m] = function (...args) { try { return orig.apply(history, args); } catch (e) { return undefined; } };
  });

  /* ---------- Тост ---------- */
  const toastEl = $('[data-toast]');
  let toastTimer;
  // toast('Текст') или toast('Удалено', 5000, { label: 'Вернуть', fn: () => {...} })
  function toast(text, ms = 2200, action) {
    if (!toastEl) return;
    $('[data-toast-text]', toastEl).textContent = text;
    const btn = $('[data-toast-action]', toastEl);
    if (btn) {
      btn.hidden = !action;
      btn.onclick = null;
      if (action) {
        btn.textContent = action.label;
        btn.onclick = () => { action.fn(); toastEl.classList.remove('is-shown'); };
      }
    }
    toastEl.classList.toggle('has-action', !!action);
    toastEl.classList.remove('is-shown'); void toastEl.offsetWidth;
    toastEl.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-shown'), action ? Math.max(ms, 5000) : ms);
  }
  // CSV с BOM и «;» — открывается в Excel без настройки кодировки
  Stellar.downloadCSV = (rows, name) => {
    const cell = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const blob = new Blob(['\uFEFF' + rows.map((r) => r.map(cell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  Stellar.toast = toast;

  /* ---------- Блокировка прокрутки (меню, окна) ---------- */
  let locks = 0;
  function lockScroll() {
    if (locks++ > 0) return;
    const sbw = window.innerWidth - root.clientWidth;
    root.style.setProperty('--sbw', sbw + 'px');
    document.body.style.paddingRight = sbw ? sbw + 'px' : '';
    const header = $('[data-header]');
    if (header) header.style.paddingRight = sbw ? sbw + 'px' : '';
    root.classList.add('is-locked');
  }
  function unlockScroll() {
    if (--locks > 0) return;
    locks = 0;
    root.classList.remove('is-locked');
    document.body.style.paddingRight = '';
    const header = $('[data-header]');
    if (header) header.style.paddingRight = '';
  }

  /* ---------- Удержание фокуса внутри слоя ---------- */
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function trapFocus(container, e) {
    if (e.key !== 'Tab') return;
    const items = $$(FOCUSABLE, container).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- Шапка: состояние при прокрутке + прогресс кнопки «наверх» ---------- */
  const header = $('[data-header]');
  const progress = $('[data-scroll-progress]');
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (header) header.classList.toggle('is-scrolled', y > 24);
      if (progress) {
        const max = root.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, y / max) : 0;
        progress.style.strokeDashoffset = String(100 - p * 100);
      }
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  $$('[data-to-top]').forEach((b) => b.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })));

  /* ---------- Текущая страница в навигации ---------- */
  const current = document.body.dataset.page ? document.body.dataset.page + '.html' : (location.pathname.split('/').pop() || 'index.html');
  $$('.header__links a, .footer__nav a').forEach((a) => {
    if (a.getAttribute('href') === current) a.setAttribute('aria-current', 'page');
  });

  /* ---------- Хранилище избранного и заказа ---------- */
  // localStorage может быть недоступен (приватный режим, песочница) — тогда держим данные в памяти
  const memory = {};
  const store = {
    read(key) {
      try {
        const raw = localStorage.getItem('stellar.' + key);
        const v = raw ? JSON.parse(raw) : memory[key] || [];
        return Array.isArray(v) ? v : [];
      } catch (e) { return memory[key] || []; }
    },
    write(key, value) {
      memory[key] = value;
      try { localStorage.setItem('stellar.' + key, JSON.stringify(value)); } catch (e) { /* остаёмся в памяти */ }
      renderCounters();
      document.dispatchEvent(new CustomEvent('stellar:store', { detail: { key } }));
    },
  };
  Stellar.store = store;
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('stellar.')) document.dispatchEvent(new CustomEvent('stellar:store', { detail: { key: e.key.slice(8) } }));
  });

  // ссылки между страницами (в превью одним файлом страницы называются stellar-*.html)
  const PREFIX = /\/stellar-[\w-]+\.html$/.test(location.pathname) ? 'stellar-' : '';
  Stellar.href = (url) => (PREFIX && /^[a-z-]+\.html/.test(url) ? PREFIX + url : url);

  /* ---------- Счётчики избранного и заказа ---------- */
  function readCount(key) { return store.read(key).length; }
  function renderCounters() {
    $$('[data-counter]').forEach((el) => {
      const n = readCount(el.dataset.counter);
      const was = el.textContent;
      el.hidden = n <= 0;
      el.textContent = n > 99 ? '99+' : String(n);
      if (n > 0 && was !== el.textContent) { el.classList.remove('is-bump'); void el.offsetWidth; el.classList.add('is-bump'); }
    });
  }
  renderCounters();
  window.addEventListener('storage', renderCounters);
  Stellar.renderCounters = renderCounters;

  /* ---------- Режим работы: «открыто / закрыто» по московскому времени ---------- */
  function workState(now = new Date()) {
    const msk = new Date(now.getTime() + (180 + now.getTimezoneOffset()) * 60000);
    const d = msk.getDay(); // 0 — вс
    const m = msk.getHours() * 60 + msk.getMinutes();
    const weekday = d >= 1 && d <= 5;
    if (weekday && m >= 540 && m < 1080) {
      const left = 1080 - m;
      return { open: true, text: left <= 60 ? `Открыто · ещё ${left} мин` : 'Сейчас открыто · до 18:00' };
    }
    let when;
    if (weekday && m < 540) when = 'сегодня в 9:00';
    else if (d >= 1 && d <= 4) when = 'завтра в 9:00';
    else when = 'в пн в 9:00';
    return { open: false, text: `Закрыто · откроемся ${when}` };
  }
  function renderStatus() {
    const s = workState();
    $$('[data-status-dot]').forEach((el) => el.classList.toggle('is-open', s.open));
    $$('[data-hours-mini]').forEach((el) => (el.title = s.text + ' (время московское)'));
    $$('[data-status]').forEach((el) => {
      el.hidden = false;
      el.classList.toggle('is-open', s.open);
      $('[data-status-text]', el).textContent = s.text;
    });
  }
  renderStatus();
  setInterval(renderStatus, 60000);

  /* ---------- Поиск с подсказками ---------- */
  const PDF = 'https://www.stellar.ru/uploads/files/stellar_katalog_2025.pdf';
  const SEARCH_DATA = [
    ['Для новорождённых', 'catalog.html?cat=newborn', 'Категория'],
    ['Музыкальные игрушки', 'catalog.html?cat=music', 'Категория'],
    ['Неваляшки', 'catalog.html?cat=nevalyashki', 'Категория'],
    ['Каталки', 'catalog.html?cat=katalki', 'Категория'],
    ['Динамические и спортивные', 'catalog.html?cat=sport', 'Категория'],
    ['Логические', 'catalog.html?cat=logic', 'Категория'],
    ['Транспортные', 'catalog.html?cat=transport', 'Категория'],
    ['Игрушечная посуда', 'catalog.html?cat=dishes', 'Категория'],
    ['Игровая среда', 'catalog.html?cat=play', 'Категория'],
    ['Мозаики', 'catalog.html?cat=mosaic', 'Категория'],
    ['Кубики обучающие', 'catalog.html?cat=cubes-edu', 'Категория'],
    ['Кубики-картинки', 'catalog.html?cat=cubes-pic', 'Категория'],
    ['Кубики-трансформеры', 'catalog.html?cat=cubes-trans', 'Категория'],
    ['Конструкторы', 'catalog.html?cat=constructor', 'Категория'],
    ['Лото и домино', 'catalog.html?cat=loto', 'Категория'],
    ['Настольные игры', 'catalog.html?cat=board', 'Категория'],
    ['Для воды и песка', 'catalog.html?cat=sand', 'Категория'],
    ['Цветняшки', 'collection.html?c=cvet', 'Коллекция'],
    ['Зефир', 'collection.html?c=zefir', 'Коллекция'],
    ['Бисквит', 'collection.html?c=biskvit', 'Коллекция'],
    ['Карамель', 'collection.html?c=karamel', 'Коллекция'],
    ['Условия сотрудничества', 'partners.html', 'Партнёрам'],
    ['Каталог 2025 · PDF', PDF, 'Файл'],
    ['Где купить', 'where-to-buy.html', 'Партнёрам'],
    ['Материалы для скачивания', 'materials.html', 'Партнёрам'],
    ['Сертификаты', 'certificates.html', 'Компания'],
    ['Контакты', 'contacts.html', 'Компания'],
    ['О компании', 'about.html', 'Компания'],
    ['Производство', 'about.html#production', 'Компания'],
    ['Изготовление пресс-форм', 'molds.html', 'Компания'],
    ['Вакансии', 'vacancies.html', 'Компания'],
    ['Новости', 'news.html', 'Компания'],
    ['Награды и патенты', 'awards.html', 'Компания'],
    ['Выставки', 'exhibitions.html', 'Компания'],
    ['Видео', 'video.html', 'Компания'],
    ['Вход для партнёров', 'login.html', 'Кабинет'],
  ];
  const DEFAULT_SUGGEST = [21, 22, 23, 25];
  const norm = (s) => s.toLowerCase().replace(/ё/g, 'е');
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  $$('[data-search]').forEach((form) => {
    const input = $('[data-search-input]', form);
    const list = $('[data-search-list]', form);
    const label = $('[data-search-results-label]', form);
    const popular = $('[data-search-popular]', form);
    let active = -1;

    function itemHTML([title, href, kind], q) {
      let t = esc(title);
      if (q) {
        const i = norm(title).indexOf(norm(q));
        if (i >= 0) t = esc(title.slice(0, i)) + '<mark>' + esc(title.slice(i, i + q.length)) + '</mark>' + esc(title.slice(i + q.length));
      }
      const ext = href.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
      return `<li><a href="${Stellar.href(href)}"${ext} role="option"><svg class="i"><use href="#i-arrow-right"/></svg><span>${t}</span><small>${kind}</small></a></li>`;
    }
    function productHTML(p, q) {
      const hl = (str) => {
        const i = q ? norm(str).indexOf(norm(q)) : -1;
        return i < 0 ? esc(str) : esc(str.slice(0, i)) + '<mark>' + esc(str.slice(i, i + q.length)) + '</mark>' + esc(str.slice(i + q.length));
      };
      return `<li><a class="search__product" href="${Stellar.href('product.html?art=' + p.art)}" role="option"><span class="search__thumb"><img src="${p.img}" alt="" loading="lazy"></span><span>${hl(p.name)}</span><small>арт. ${hl(p.art)}</small></a></li>`;
    }
    function render() {
      const q = input.value.trim();
      active = -1;
      if (!q) {
        popular.hidden = false;
        label.textContent = 'Разделы';
        list.innerHTML = DEFAULT_SUGGEST.map((i) => itemHTML(SEARCH_DATA[i])).join('');
        return;
      }
      popular.hidden = true;
      const products = (window.STELLAR_PRODUCTS || []).filter((p) => norm(p.name + ' ' + p.art).includes(norm(q))).slice(0, 5);
      const hits = SEARCH_DATA.filter(([t]) => norm(t).includes(norm(q))).slice(0, products.length ? 3 : 6);
      label.textContent = products.length || hits.length ? 'Совпадения' : 'Ничего не нашли — попробуйте артикул';
      list.innerHTML = products.map((p) => productHTML(p, q)).join('') + hits.map((h) => itemHTML(h, q)).join('') +
        `<li><a href="${Stellar.href('search.html')}?q=${encodeURIComponent(q)}" role="option"><svg class="i"><use href="#i-search"/></svg><span>Все результаты по «${esc(q)}»</span><small>Enter</small></a></li>`;
    }
    function setOpen(v) {
      form.classList.toggle('is-open', v);
      input.setAttribute('aria-expanded', String(v));
    }
    function move(dir) {
      const links = $$('a', list);
      if (!links.length) return;
      active = (active + dir + links.length) % links.length;
      links.forEach((a, i) => a.classList.toggle('is-active', i === active));
    }
    input.addEventListener('focus', () => { render(); setOpen(true); });
    input.addEventListener('input', render);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Escape') { setOpen(false); input.blur(); }
      else if (e.key === 'Enter' && active >= 0) {
        e.preventDefault();
        $$('a', list)[active].click();
      }
    });
    form.addEventListener('focusout', (e) => { if (!form.contains(e.relatedTarget)) setOpen(false); });
    form.addEventListener('submit', (e) => {
      if (!input.value.trim()) { e.preventDefault(); input.focus(); return; }
      if (PREFIX) form.setAttribute('action', Stellar.href('search.html'));
    });
  });

  // «/» — быстрый переход к поиску
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t.closest('input, textarea, [contenteditable="true"]')) return;
    const input = $('[data-search-input]');
    if (input && input.offsetParent) { e.preventDefault(); input.focus(); }
  });

  /* ---------- Полноэкранное меню ---------- */
  const menu = $('[data-menu]');
  let menuTrigger = null;
  let menuCloseTimer;
  if (menu) {
    $$('[data-stagger]', menu).forEach((el, i) => el.style.setProperty('--i', i));

    function openMenu(trigger) {
      clearTimeout(menuCloseTimer);
      menuTrigger = trigger || document.activeElement;
      const r = (trigger || document.body).getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 60;
      menu.style.setProperty('--mx', x + 'px');
      menu.style.setProperty('--my', y + 'px');
      menu.style.setProperty('--mr', radius + 'px');
      if (!menu.classList.contains('is-open')) lockScroll();
      menu.hidden = false;
      menu.scrollTop = 0;
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
      $$('[data-menu-open]').forEach((b) => b.setAttribute('aria-expanded', 'true'));
      setTimeout(() => { const s = $('[data-mm-search]', menu); (s && s.offsetParent ? s : $('[data-menu-close]', menu)).focus({ preventScroll: true }); }, reduceMotion ? 0 : 380);
    }
    function closeMenu() {
      if (!menu.classList.contains('is-open')) return;
      menu.classList.remove('is-open');
      $$('[data-menu-open]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
      menuCloseTimer = setTimeout(() => {
        menu.hidden = true;
        unlockScroll();
        if (menuTrigger) menuTrigger.focus({ preventScroll: true });
      }, reduceMotion ? 0 : 620);
    }
    $$('[data-menu-open]').forEach((b) => b.addEventListener('click', () => openMenu(b)));
    $$('[data-menu-close]', menu).forEach((b) => b.addEventListener('click', closeMenu));
    menu.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !e.target.closest('.is-open[data-select]')) closeMenu();
      trapFocus(menu, e);
    });
    // переход по якорю на этой же странице — закрываем меню
    menu.addEventListener('click', (e) => {
      const a = e.target.closest('a[href*="#"]');
      if (a && a.pathname === location.pathname) closeMenu();
    });
    Stellar.openMenu = openMenu;
    Stellar.closeMenu = closeMenu;
  }

  /* ---------- Модальные окна ---------- */
  let modalTrigger = null;
  function openModal(name, trigger) {
    const modal = $(`[data-modal="${name}"]`);
    if (!modal) return;
    modalTrigger = trigger || document.activeElement;
    modal.hidden = false;
    lockScroll();
    requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('is-open')));
    setTimeout(() => { const f = $('input:not([type=radio]):not([type=hidden]), button', $('.modal__card form', modal) || modal); if (f) f.focus({ preventScroll: true }); }, 260);
  }
  function closeModal(modal) {
    if (!modal || !modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    setTimeout(() => {
      modal.hidden = true;
      unlockScroll();
      const wrap = $('[data-form-wrap]', modal);
      if (wrap && !$('[data-form-success]', wrap).hidden) resetForm(wrap, true);
      if (modalTrigger) modalTrigger.focus({ preventScroll: true });
    }, reduceMotion ? 0 : 380);
  }
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-modal-open]');
    if (opener) { e.preventDefault(); openModal(opener.dataset.modalOpen, opener); return; }
    const closer = e.target.closest('[data-modal-close]');
    if (closer) closeModal(closer.closest('[data-modal]'));
  });
  document.addEventListener('keydown', (e) => {
    const modal = $('[data-modal].is-open');
    if (!modal) return;
    if (e.key === 'Escape') closeModal(modal);
    trapFocus(modal, e);
  });
  Stellar.openModal = openModal;

  /* ---------- Копирование по клику ---------- */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { /* ignore */ }
      ta.remove();
      return ok;
    }
  }
  Stellar.copyText = copyText;
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    e.preventDefault();
    const text = btn.dataset.copy;
    const ok = await copyText(text);
    if (!ok) { toast('Не удалось скопировать — выделите текст вручную'); return; }
    const use = $('use', btn);
    btn.classList.add('is-done');
    if (use) use.setAttribute('href', '#i-check');
    toast(btn.dataset.copyMsg || `Скопировано: ${text}`);
    clearTimeout(btn._t);
    btn._t = setTimeout(() => {
      btn.classList.remove('is-done');
      if (use) use.setAttribute('href', '#i-copy');
    }, 1600);
  });

  /* ---------- Формы ---------- */
  const PHONE_RE = /^7\d{10}$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function formatPhone(digits) {
    if (!digits) return '';
    let d = digits;
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    let out = '+7 (';
    if (d.length > 1) out += d.slice(1, 4);
    if (d.length >= 4) out += ')';
    if (d.length > 4) out += ' ' + d.slice(4, 7);
    if (d.length > 7) out += '-' + d.slice(7, 9);
    if (d.length > 9) out += '-' + d.slice(9, 11);
    return out;
  }
  function initPhoneMask(input) {
    let prevDigits = '';
    input.addEventListener('focus', () => { if (!input.value) { input.value = '+7 ('; prevDigits = '7'; } });
    input.addEventListener('blur', () => { if (input.value.replace(/\D/g, '').length <= 1) { input.value = ''; prevDigits = ''; } });
    input.addEventListener('input', (e) => {
      let digits = input.value.replace(/\D/g, '');
      if (e.inputType && e.inputType.startsWith('delete') && digits === prevDigits && digits.length) digits = digits.slice(0, -1);
      // первая введённая «8» или «7» после «+7 (» — это код страны, а не часть номера
      if (prevDigits.length <= 1 && /^7[78]/.test(digits)) digits = '7' + digits.slice(2);
      // вставили номер целиком поверх префикса: «7» + «8 928 …»
      if (digits.length > 11 && /^7[78]/.test(digits)) digits = '7' + digits.slice(2);
      input.value = digits.length ? formatPhone(digits) : '';
      prevDigits = input.value.replace(/\D/g, '');
      const end = input.value.length;
      input.setSelectionRange(end, end);
    });
  }

  function validateControl(el) {
    const v = (el.type === 'checkbox' ? '' : el.value.trim());
    const rule = el.dataset.validate;
    if (el.type === 'checkbox') return el.required && !el.checked ? (el.dataset.msg || 'Нужно согласие') : '';
    if (!v) return el.required ? (rule === 'phone' ? 'Укажите телефон для связи' : (el.dataset.msg || 'Заполните поле')) : '';
    if (rule === 'phone') {
      const d = v.replace(/\D/g, '');
      if (!PHONE_RE.test(d)) return 'Проверьте номер: не хватает цифр';
    }
    if (rule === 'email' && !EMAIL_RE.test(v)) return 'Похоже, в адресе ошибка';
    if (rule === 'inn' && !/^(\d{10}|\d{12})$/.test(v)) return 'ИНН — 10 цифр для компании или 12 для ИП';
    if (rule === 'contact') {
      if (v.includes('@')) { if (!EMAIL_RE.test(v)) return 'Похоже, в e-mail ошибка'; }
      else if (v.replace(/\D/g, '').length < 10) return el.dataset.msg || 'Укажите телефон или e-mail';
    }
    if (el.minLength > 0 && v.length < el.minLength) return el.dataset.msg || `Минимум ${el.minLength} символа`;
    return '';
  }
  function showState(el, msg) {
    const field = el.closest('[data-field]');
    if (!field) return !msg;
    const filled = el.type === 'checkbox' ? el.checked : el.value.trim().length > 0;
    field.classList.toggle('is-invalid', !!msg);
    field.classList.toggle('is-valid', !msg && filled && el.type !== 'checkbox' && el.tagName !== 'TEXTAREA');
    const err = $('.field__error span', field);
    if (err && msg) err.textContent = msg;
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }

  function autoGrow(ta) {
    const min = parseFloat(getComputedStyle(ta).minHeight) || 0;
    ta.style.height = 'auto';
    ta.style.height = Math.min(Math.max(ta.scrollHeight, min), 260) + 'px';
    ta.style.overflowY = ta.scrollHeight > 260 ? 'auto' : 'hidden';
  }

  /* выпадающий список */
  function initSelect(field) {
    const btn = $('[data-select-btn]', field);
    const list = $('[data-select-list]', field);
    const input = $('[data-select-input]', field);
    const valueEl = $('[data-select-value]', field);
    const emailEl = $('[data-select-email]', field);
    const opts = $$('[role="option"]', list);
    const uid = 'sel' + Math.random().toString(36).slice(2, 7);
    let active = 0;
    opts.forEach((o, i) => { o.id = `${uid}-${i}`; });

    const labelOf = (o) => o.firstChild.textContent.trim();
    const selectedIndex = () => Math.max(0, opts.findIndex((o) => o.getAttribute('aria-selected') === 'true'));
    function setActive(i) {
      active = (i + opts.length) % opts.length;
      opts.forEach((o, k) => o.classList.toggle('is-active', k === active));
      btn.setAttribute('aria-activedescendant', opts[active].id);
    }
    function outside(e) { if (!field.contains(e.target)) close(); }
    function open() {
      field.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      setActive(selectedIndex());
      document.addEventListener('pointerdown', outside);
    }
    function close() {
      field.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.removeAttribute('aria-activedescendant');
      document.removeEventListener('pointerdown', outside);
    }
    function choose(i, silent) {
      const o = opts[i];
      const changed = input.value !== o.dataset.value;
      opts.forEach((x) => x.setAttribute('aria-selected', String(x === o)));
      input.value = o.dataset.value;
      valueEl.textContent = labelOf(o);
      if (changed) {
        valueEl.classList.remove('is-swap'); void valueEl.offsetWidth; valueEl.classList.add('is-swap');
        if (emailEl) {
          emailEl.textContent = o.dataset.email;
          emailEl.classList.remove('is-swap'); void emailEl.offsetWidth; emailEl.classList.add('is-swap');
        }
      }
      if (!silent) field.dispatchEvent(new CustomEvent('select:change', { bubbles: true, detail: { value: o.dataset.value, label: labelOf(o), short: o.dataset.short, email: o.dataset.email } }));
    }
    btn.addEventListener('click', () => (field.classList.contains('is-open') ? close() : open()));
    btn.addEventListener('keydown', (e) => {
      const isOpen = field.classList.contains('is-open');
      if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        if (!isOpen) open(); else setActive(active + (e.key === 'ArrowDown' ? 1 : -1));
      } else if ((e.key === 'Enter' || e.key === ' ') && isOpen) {
        e.preventDefault(); choose(active); close();
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault(); e.stopPropagation(); close();
      } else if (e.key === 'Tab' && isOpen) close();
    });
    opts.forEach((o, i) => {
      o.addEventListener('click', () => { choose(i); close(); btn.focus(); });
      o.addEventListener('pointermove', () => setActive(i));
    });
    field._select = {
      set(value, silent) { const i = opts.findIndex((o) => o.dataset.value === value); if (i >= 0) choose(i, silent); },
      get value() { return input.value; },
      get option() { return opts[selectedIndex()]; },
      flash() { field.classList.remove('is-flash'); void field.offsetWidth; field.classList.add('is-flash'); },
    };
  }

  /* смена формы ↔ экран успеха с анимацией высоты */
  function swapViews(wrap, from, to) {
    const h1 = wrap.offsetHeight;
    from.classList.add('is-fade-out');
    setTimeout(() => {
      from.hidden = true;
      from.classList.remove('is-fade-out');
      to.hidden = false;
      wrap.style.height = 'auto';
      const h2 = wrap.offsetHeight;
      wrap.style.height = h1 + 'px';
      void wrap.offsetHeight;
      wrap.style.height = h2 + 'px';
      to.classList.remove('is-in', 'is-fade-in'); void to.offsetWidth;
      to.classList.add('is-in', 'is-fade-in');
      const done = () => { wrap.style.height = ''; };
      wrap.addEventListener('transitionend', function te(ev) { if (ev.propertyName === 'height') { wrap.removeEventListener('transitionend', te); done(); } });
      setTimeout(done, 700);
    }, reduceMotion ? 0 : 240);
  }

  function resetForm(wrap, instant) {
    const form = $('[data-form]', wrap);
    const success = $('[data-form-success]', wrap);
    form.reset();
    $$('[data-field]', form).forEach((f) => f.classList.remove('is-valid', 'is-invalid'));
    $$('textarea', form).forEach((t) => { t.style.height = ''; });
    $$('[data-count]', form).forEach((c) => { c.textContent = '0 / ' + (c.closest('.field').querySelector('textarea').maxLength || ''); });
    const sel = $('[data-select]', form);
    if (sel && sel._select) sel._select.set($('[data-select-input]', sel).defaultValue, true);
    const submit = $('[data-submit]', form);
    if (submit) submit.classList.remove('is-loading');
    if (instant) { success.hidden = true; form.hidden = false; }
    else swapViews(wrap, success, form);
  }

  function successContact(form) {
    const fd = new FormData(form);
    const phone = (fd.get('phone') || '').toString().trim();
    const email = (fd.get('email') || '').toString().trim();
    const contact = (fd.get('contact') || '').toString().trim();
    if (email && phone) return `на ${email} или по номеру ${phone}`;
    if (email) return `на ${email}`;
    if (phone) return `по номеру ${phone}`;
    if (contact) return contact.includes('@') ? `на ${contact}` : `по номеру ${contact}`;
    return 'по указанным контактам';
  }

  function initForm(form) {
    const wrap = form.closest('[data-form-wrap]');
    const success = wrap && $('[data-form-success]', wrap);
    const controls = $$('input:not([type=hidden]):not([type=radio]), textarea', form);
    const touched = new WeakSet();

    $$('[data-select]', form).forEach(initSelect);
    $$('[data-mask="phone"]', form).forEach(initPhoneMask);

    controls.forEach((el) => {
      el.addEventListener('blur', () => {
        if (el.type === 'checkbox') return;
        if (el.value.trim()) touched.add(el);
        if (touched.has(el)) showState(el, validateControl(el));
      });
      el.addEventListener('input', () => {
        const field = el.closest('[data-field]');
        if (field && (field.classList.contains('is-invalid') || field.classList.contains('is-valid'))) showState(el, validateControl(el));
      });
      el.addEventListener('change', () => { if (el.type === 'checkbox') showState(el, validateControl(el)); });
    });

    $$('textarea', form).forEach((ta) => {
      const counter = $('[data-count]', ta.closest('.field'));
      const max = ta.maxLength > 0 ? ta.maxLength : 0;
      ta.addEventListener('input', () => {
        autoGrow(ta);
        if (counter) {
          counter.textContent = `${ta.value.length} / ${max}`;
          counter.classList.toggle('is-shown', ta.value.length > 0);
          counter.classList.toggle('is-warn', max && ta.value.length > max * 0.9);
        }
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      let firstBad = null;
      controls.forEach((el) => {
        touched.add(el);
        const ok = showState(el, validateControl(el));
        if (!ok) {
          if (!firstBad) firstBad = el;
          const field = el.closest('[data-field]');
          field.classList.remove('is-shake'); void field.offsetWidth; field.classList.add('is-shake');
        }
      });
      if (firstBad) { firstBad.focus({ preventScroll: false }); form.dispatchEvent(new CustomEvent('stellar:invalid')); return; }
      // форма со своей логикой отправки (страница заказа)
      if (form.hasAttribute('data-form-custom')) { form.dispatchEvent(new CustomEvent('stellar:valid')); return; }

      const submit = $('[data-submit]', form);
      submit.classList.add('is-loading');
      submit.setAttribute('aria-busy', 'true');
      try {
        // Если указан адрес обработчика (data-endpoint) — отправляем реально; иначе демо-режим.
        const endpoint = form.dataset.endpoint;
        if (endpoint) {
          const res = await fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
          if (!res.ok) throw new Error(res.status);
        } else {
          await new Promise((r) => setTimeout(r, 1100));
        }
      } catch (err) {
        submit.classList.remove('is-loading');
        submit.removeAttribute('aria-busy');
        toast('Не удалось отправить. Позвоните нам: +7 (863) 290-31-16', 4000);
        return;
      }
      submit.removeAttribute('aria-busy');
      if (!success) { submit.classList.remove('is-loading'); toast('Отправлено'); return; }
      const deptEl = $('[data-success-dept]', success);
      const sel = $('[data-select]', form);
      if (deptEl && sel && sel._select) deptEl.textContent = sel._select.option.dataset.short || 'Отдел';
      const cEl = $('[data-success-contact]', success);
      if (cEl) cEl.textContent = successContact(form);
      swapViews(wrap, form, success);
    });

    if (wrap) $$('[data-form-reset]', wrap).forEach((b) => b.addEventListener('click', () => resetForm(wrap)));
  }
  $$('[data-form]').forEach(initForm);

  /* ---------- Карточки товара: избранное, количество, «в заказ» ---------- */
  function flyToCart(img) {
    const target = $('.header__order');
    if (!img || !target || !target.offsetParent || reduceMotion) return Promise.resolve();
    const r = img.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    const clone = img.cloneNode();
    clone.className = 'fly';
    clone.removeAttribute('loading');
    clone.setAttribute('aria-hidden', 'true');
    Object.assign(clone.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    document.body.appendChild(clone);
    const dx = t.left + t.width / 2 - (r.left + r.width / 2);
    const dy = t.top + t.height / 2 - (r.top + r.height / 2);
    const anim = clone.animate([
      { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 140}px) scale(.5) rotate(-14deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(.1) rotate(-32deg)`, opacity: 0.3 },
    ], { duration: 820, easing: 'cubic-bezier(.45, 0, .2, 1)' });
    return anim.finished.then(() => {
      clone.remove();
      target.classList.remove('is-catch'); void target.offsetWidth; target.classList.add('is-catch');
    });
  }
  Stellar.flyToCart = flyToCart;

  const cardRegistry = new Set();
  document.addEventListener('stellar:store', () => cardRegistry.forEach((sync) => sync()));
  function initProductCards(root = document) {
    $$('[data-product]', root).forEach((card) => {
      if (card._ready) return;
      card._ready = true;
      const art = card.dataset.art;
      const name = card.dataset.name || 'Товар';
      const favBtn = $('[data-fav]', card);
      const qtyEl = $('[data-qty]', card);
      const minus = $('[data-step="-1"]', card);
      const plus = $('[data-step="1"]', card);
      const add = $('[data-add]', card);
      const img = $('[data-fly-img]', card) || $('.pcard__img img', card);
      const inCart = () => store.read('cart').find((i) => i.art === art);
      let qty = inCart() ? inCart().qty : 1;

      function renderQty(dir) {
        qtyEl.textContent = qty;
        if (dir) { qtyEl.classList.remove('is-up', 'is-down'); void qtyEl.offsetWidth; qtyEl.classList.add(dir > 0 ? 'is-up' : 'is-down'); }
        minus.disabled = qty <= 1;
        plus.disabled = qty >= 99;
      }
      function renderState() {
        const added = !!inCart() || pending;
        card.classList.toggle('is-added', added);
        add.title = added ? 'Перейти к заказу' : '';
        if (!favBtn) return;
        const fav = store.read('fav').includes(art);
        favBtn.setAttribute('aria-pressed', String(fav));
        favBtn.setAttribute('aria-label', fav ? 'Убрать из избранного' : 'Добавить в избранное');
      }
      cardRegistry.add(() => {
        if (!card.isConnected && !card._keep) return;
        const item = inCart();
        if (item && item.qty !== qty) { qty = item.qty; renderQty(); }
        renderState();
      });
      function step(d) {
        const next = Math.min(99, Math.max(1, qty + d));
        if (next === qty) return;
        qty = next;
        renderQty(d);
        const cart = store.read('cart');
        const item = cart.find((i) => i.art === art);
        if (item) { item.qty = qty; store.write('cart', cart); }
      }
      minus.addEventListener('click', () => step(-1));
      plus.addEventListener('click', () => step(1));

      if (favBtn) favBtn.addEventListener('click', () => {
        const favs = store.read('fav');
        const on = !favs.includes(art);
        store.write('fav', on ? [...favs, art] : favs.filter((a) => a !== art));
        renderState();
        if (on) { favBtn.classList.remove('is-pop'); void favBtn.offsetWidth; favBtn.classList.add('is-pop'); }
        toast(on ? `«${name.replace(/^.*«|».*$/g, '') || name}» — в избранном` : 'Убрано из избранного');
      });

      let pending = false; // товар «летит» в заказ — повторный клик не добавляет дубль
      add.addEventListener('click', () => {
        if (pending) return;
        if (inCart()) { location.href = Stellar.href('order.html'); return; }
        pending = true;
        card.classList.add('is-added');
        add.title = 'Перейти к заказу';
        toast(`Добавлено в заказ: ${qty} кор. · арт. ${art}`);
        flyToCart(img).then(() => {
          const cart = store.read('cart').filter((i) => i.art !== art);
          cart.push({ art, name, qty });
          store.write('cart', cart);
          pending = false;
        });
      });

      renderQty();
      renderState();
    });
  }
  initProductCards();
  Stellar.initProductCards = initProductCards;
  Stellar.initSelect = initSelect;

  /* ---------- Параллакс: элементы с data-depth следуют за курсором ---------- */
  function parallax(area, items) {
    if (!area || !items.length || reduceMotion || !window.matchMedia('(pointer: fine)').matches) return;
    const lerp = (a, b, t) => a + (b - a) * t;
    const state = items.map((el) => ({ el, d: parseFloat(el.dataset.depth) || 10, x: 0, y: 0 }));
    let tx = 0, ty = 0, running = false, inside = false;
    function frame() {
      let moving = false;
      state.forEach((st) => {
        st.x = lerp(st.x, tx * st.d, 0.08);
        st.y = lerp(st.y, ty * st.d * 0.6, 0.08);
        if (Math.abs(st.x - tx * st.d) > 0.05 || Math.abs(st.y - ty * st.d * 0.6) > 0.05) moving = true;
        st.el.style.setProperty('--px', st.x.toFixed(2) + 'px');
        st.el.style.setProperty('--py', st.y.toFixed(2) + 'px');
      });
      running = moving || inside;
      if (running) requestAnimationFrame(frame);
    }
    const kick = () => { if (!running) { running = true; requestAnimationFrame(frame); } };
    area.addEventListener('pointermove', (e) => {
      const r = area.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      inside = true; kick();
    });
    area.addEventListener('pointerleave', () => { tx = 0; ty = 0; inside = false; kick(); });
  }
  Stellar.parallax = parallax;
  $$('[data-lead]').forEach((lead) => parallax(lead, $$('.lead__toy', lead)));
  $$('[data-parallax]').forEach((area) => parallax(area, $$('[data-depth]', area)));

  /* ---------- Анимации появления ---------- */
  $$('[data-split]').forEach((el) => {
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    const line = document.createElement('span');
    line.className = 'split-line';
    line.setAttribute('aria-hidden', 'true');
    // буквы собираем в слова, чтобы перенос шёл только между словами
    let i = 0;
    text.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { line.appendChild(document.createTextNode(' ')); return; }
      const w = document.createElement('span');
      w.className = 'split-word';
      [...part].forEach((ch) => {
        const s = document.createElement('span');
        s.className = 'split-char';
        s.style.setProperty('--i', i++);
        s.textContent = ch;
        w.appendChild(s);
      });
      line.appendChild(w);
    });
    el.textContent = '';
    el.appendChild(line);
  });
  $$('[data-big-word] span').forEach((s, i) => s.style.setProperty('--i', i));

  const revealTargets = $$('[data-reveal], [data-split], [data-big-word]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        el.classList.add('is-in');
        io.unobserve(el);
        if (el.hasAttribute('data-reveal')) {
          const d = parseFloat(getComputedStyle(el).getPropertyValue('--d')) || 0;
          // после проявления возвращаем элементу его собственные переходы (ховеры)
          setTimeout(() => { el.removeAttribute('data-reveal'); el.classList.remove('is-in'); }, 1050 + d * 90);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => { el.classList.add('is-in'); el.removeAttribute('data-reveal'); });
  }
})();
