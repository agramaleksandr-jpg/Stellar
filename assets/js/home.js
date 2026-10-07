/* =========================================================
   Главная: первый экран, цифры, коллекции, фильтр ассортимента,
   шаги, поиск города, заявка
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const onView = (el, cb, opts = { threshold: 0.35 }) => {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { cb(el); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { io.unobserve(en.target); cb(en.target); } });
    }, opts);
    io.observe(el);
  };

  /* ---------- Параллакс: элементы с data-depth следуют за курсором ---------- */
  function parallax(area, items, extra) {
    if (!area || reduceMotion || !finePointer) return;
    const state = items.map((el) => ({ el, d: parseFloat(el.dataset.depth) || 10, x: 0, y: 0 }));
    let tx = 0, ty = 0, running = false, inside = false;
    function frame() {
      let moving = false;
      state.forEach((s) => {
        s.x = lerp(s.x, tx * s.d, 0.08);
        s.y = lerp(s.y, ty * s.d * 0.6, 0.08);
        if (Math.abs(s.x - tx * s.d) > 0.05 || Math.abs(s.y - ty * s.d * 0.6) > 0.05) moving = true;
        s.el.style.setProperty('--px', s.x.toFixed(2) + 'px');
        s.el.style.setProperty('--py', s.y.toFixed(2) + 'px');
      });
      if (extra) extra();
      running = moving || inside;
      if (running) requestAnimationFrame(frame);
    }
    const kick = () => { if (!running) { running = true; requestAnimationFrame(frame); } };
    area.addEventListener('pointermove', (e) => {
      const r = area.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      inside = true;
      kick();
    });
    area.addEventListener('pointerleave', () => { tx = 0; ty = 0; inside = false; kick(); });
  }

  /* ---------- Первый экран ---------- */
  const hero = $('[data-hero]');
  if (hero) {
    const ready = () => requestAnimationFrame(() => hero.classList.add('is-ready'));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ready); else ready();
    parallax(hero, $$('[data-depth]', hero));

    // лёгкий параллакс машинки при прокрутке
    const toy = $('.hero__toy', hero);
    if (toy && !reduceMotion) {
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const y = Math.min(window.scrollY, 900);
          toy.style.setProperty('--sy', (y * -0.12).toFixed(1) + 'px');
          ticking = false;
        });
      }, { passive: true });
    }
  }

  /* ---------- Карточка новинок на первом экране ---------- */
  const card = $('[data-hero-card]');
  if (card) {
    const SLIDES = [
      { title: 'Машинка «Зайка»', art: '02625', img: 'assets/img/toys/zaika-02625.webp', bg: '#F6E4EA', chip: 'Новинка 2026', alt: 'Машинка для малышей «Зайка»' },
      { title: 'Машинка «Котёнок»', art: '02602', img: 'assets/img/toys/cat-car-02602.webp', bg: '#ECEAF4', chip: 'Машинки для малышей', alt: 'Машинка для малышей «Котёнок»' },
      { title: 'Машинка «Божья коровка»', art: '02611', img: 'assets/img/toys/ladybug-02611.webp', bg: '#FCE4DE', chip: 'Машинки для малышей', alt: 'Машинка для малышей «Божья коровка»' },
    ];
    const DUR = 5000;
    const dots = $('[data-hc-dots]', card);
    const imgWrap = $('[data-hc-box]', card);
    const link = $('[data-hc-link]', card);
    const img = $('[data-hc-img]', card);
    let i = 0, timer = null, paused = false, started = 0, left = DUR;

    SLIDES.forEach((s, k) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', s.title);
      b.setAttribute('aria-selected', String(k === 0));
      b.addEventListener('click', () => go(k, true));
      dots.appendChild(b);
      const pre = new Image(); pre.src = s.img; // прогреваем картинки
    });

    function runBar() {
      if (reduceMotion) return;
      dots.classList.remove('is-run'); void dots.offsetWidth;
      dots.style.setProperty('--dur', DUR + 'ms');
      dots.classList.add('is-run');
    }
    function schedule(ms) {
      clearTimeout(timer);
      if (reduceMotion) return;
      started = Date.now(); left = ms;
      timer = setTimeout(() => go(i + 1), ms);
    }
    function go(n, manual) {
      const next = (n + SLIDES.length) % SLIDES.length;
      if (next === i && !manual) return;
      i = next;
      const s = SLIDES[i];
      $$('button', dots).forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
      img.classList.remove('is-in');
      img.classList.add('is-out');
      setTimeout(() => {
        img.src = s.img; img.alt = s.alt;
        img.classList.remove('is-out'); void img.offsetWidth; img.classList.add('is-in');
        $('[data-hc-title]', card).textContent = s.title;
        $('[data-hc-chip]', card).textContent = s.chip;
        $('[data-hc-art]', card).textContent = s.art;
        const href = window.Stellar.href('product.html?art=' + s.art);
        link.href = href; $('[data-hc-more]', card).href = href;
      }, reduceMotion ? 0 : 260);
      imgWrap.style.backgroundColor = s.bg;
      runBar();
      schedule(DUR);
    }
    imgWrap.style.backgroundColor = SLIDES[0].bg;
    card.addEventListener('pointerenter', () => { paused = true; clearTimeout(timer); left = Math.max(400, left - (Date.now() - started)); });
    card.addEventListener('pointerleave', () => { paused = false; schedule(left); card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); card.classList.remove('is-tilting'); });
    if (finePointer && !reduceMotion) {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.classList.add('is-tilting');
        card.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg');
        card.style.setProperty('--rx', (y * -8).toFixed(2) + 'deg');
      });
    }
    // запускаем автопрокрутку, только когда карточка видна
    onView(card, () => { if (!paused) { runBar(); schedule(DUR); } }, { threshold: 0.5 });
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(timer); else if (!paused) { runBar(); schedule(DUR); } });
  }

  /* ---------- Счётчики в цифрах ---------- */
  $$('[data-count]').forEach((el) => {
    const target = parseInt(el.dataset.count, 10);
    if (reduceMotion) return;
    el.textContent = '0';
    onView(el, () => {
      const t0 = performance.now();
      const dur = 1400;
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * e);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.6 });
  });

  /* ---------- Коллекции: игрушки следуют за курсором ---------- */
  if (finePointer && !reduceMotion) {
    $$('[data-tilt]').forEach((tile) => {
      tile.addEventListener('pointermove', (e) => {
        const r = tile.getBoundingClientRect();
        tile.classList.add('is-tilting');
        tile.style.setProperty('--tx', (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
        tile.style.setProperty('--ty', (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
      });
      tile.addEventListener('pointerleave', () => {
        tile.classList.remove('is-tilting');
        tile.style.setProperty('--tx', 0);
        tile.style.setProperty('--ty', 0);
      });
    });
  }

  /* ---------- Ассортимент: вкладки-фильтры ---------- */
  const tabsWrap = $('[data-filter-tabs]');
  const grid = $('[data-pgrid]');
  if (tabsWrap && grid) {
    const tabs = $$('[data-filter]', tabsWrap);
    const ink = $('[data-tabs-ink]', tabsWrap);
    const cards = $$('[data-product]', grid);
    const has = (c, f) => f === 'all' || c.dataset.tags.split(/\s+/).includes(f);

    tabs.forEach((t) => {
      const n = cards.filter((c) => has(c, t.dataset.filter)).length;
      const sup = $('[data-tab-count]', t);
      if (sup) sup.textContent = n;
    });

    function moveInk(tab, instant) {
      if (!ink) return;
      if (instant) ink.style.transition = 'none';
      ink.style.width = tab.offsetWidth + 'px';
      ink.style.transform = `translate(${tab.offsetLeft}px, ${tab.offsetTop}px)`;
      if (instant) { void ink.offsetWidth; ink.style.transition = ''; }
    }

    function applyFilter(f) {
      const before = new Map(cards.map((c) => [c, c.classList.contains('is-hidden') ? null : c.getBoundingClientRect()]));
      const leaving = cards.filter((c) => !c.classList.contains('is-hidden') && !has(c, f));
      const h0 = grid.offsetHeight;
      const doLayout = () => {
        cards.forEach((c) => { c.getAnimations().forEach((a) => a.cancel()); if (c._leave) { c._leave.cancel(); c._leave = null; } c.classList.toggle('is-hidden', !has(c, f)); });
        // плавно меняем высоту сетки, чтобы страница не прыгала
        grid.style.height = 'auto';
        const h1 = grid.offsetHeight;
        if (!reduceMotion && h0 !== h1) {
          grid.style.height = h0 + 'px'; void grid.offsetHeight; grid.style.height = h1 + 'px';
          setTimeout(() => { grid.style.height = ''; }, 520);
        } else grid.style.height = '';
        if (reduceMotion) return;
        let k = 0;
        cards.forEach((c) => {
          if (c.classList.contains('is-hidden')) return;
          const a = before.get(c);
          const b = c.getBoundingClientRect();
          if (!a) {
            c.animate([{ opacity: 0, transform: 'translateY(18px) scale(.96)' }, { opacity: 1, transform: 'none' }],
              { duration: 480, delay: k++ * 45, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
          } else if (a.left !== b.left || a.top !== b.top) {
            c.animate([{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px)` }, { transform: 'none' }],
              { duration: 560, easing: 'cubic-bezier(.16,1,.3,1)' });
          }
        });
      };
      if (leaving.length && !reduceMotion) {
        leaving.forEach((c) => { if (c._leave) c._leave.cancel(); c._leave = c.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.94)' }], { duration: 170, easing: 'ease-in', fill: 'forwards' }); });
        setTimeout(doLayout, 170);
      } else doLayout();
    }

    function select(tab, focus) {
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      moveInk(tab);
      if (focus) tab.focus();
      applyFilter(tab.dataset.filter);
    }
    tabs.forEach((t, k) => {
      t.tabIndex = k === 0 ? 0 : -1;
      t.addEventListener('click', () => { if (!t.classList.contains('is-active')) select(t); });
      t.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const n = tabs[(k + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
        select(n, true);
      });
    });
    const sync = () => moveInk($('.tab.is-active', tabsWrap) || tabs[0], true);
    sync();
    window.addEventListener('resize', sync);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync);
  }

  /* ---------- Шаги до поставки: линия и номера загораются по очереди ---------- */
  const steps = $('[data-steps]');
  if (steps) {
    const list = $('.steps__list', steps);
    const items = $$('.step', steps);
    items[0].classList.add('is-lit');
    onView(steps, () => {
      if (reduceMotion) { list.style.setProperty('--p', 1); items.forEach((s) => s.classList.add('is-lit')); return; }
      setTimeout(() => list.style.setProperty('--p', 1), 250);
      items.slice(1).forEach((s, k) => setTimeout(() => s.classList.add('is-lit'), 250 + (k + 1) * 600));
    }, { threshold: 0.45 });
  }

  /* ---------- Галочки в блоке «Производство» ---------- */
  onView($('[data-checks]'), (el) => el.classList.add('is-in'), { threshold: 0.4 });

  /* ---------- Поиск города ---------- */
  const citySearch = $('[data-city-search]');
  if (citySearch) {
    const input = $('[data-city-input]', citySearch);
    const clear = $('[data-city-clear]', citySearch);
    const wrap = $('[data-cities]');
    const chips = $$('a:not([data-city-more])', wrap);
    const note = $('[data-city-note]');
    const noteText = note.textContent;
    const norm = (s) => s.toLowerCase().replace(/ё/g, 'е').trim();
    chips.forEach((c) => { c.dataset.city = c.textContent.trim(); });

    function filter() {
      const q = norm(input.value);
      citySearch.classList.toggle('has-value', !!input.value);
      wrap.classList.toggle('is-filtering', q.length > 0);
      let hits = 0;
      chips.forEach((c) => {
        const city = c.dataset.city;
        const idx = q ? norm(city).indexOf(q) : -1;
        const match = idx >= 0;
        c.classList.toggle('is-match', match);
        if (match) { hits++; c.innerHTML = city.slice(0, idx) + '<mark>' + city.slice(idx, idx + q.length) + '</mark>' + city.slice(idx + q.length); }
        else c.textContent = city;
      });
      if (q.length >= 2 && !hits) {
        note.textContent = `«${input.value.trim()}» нет среди популярных — нажмите «Найти магазин», покажем все точки продаж.`;
        note.classList.add('is-hint');
      } else { note.textContent = noteText; note.classList.remove('is-hint'); }
    }
    input.addEventListener('input', filter);
    clear.addEventListener('click', () => { input.value = ''; filter(); input.focus(); });
    citySearch.addEventListener('submit', (e) => {
      if (!input.value.trim()) {
        e.preventDefault();
        const f = $('.city-search__field', citySearch);
        f.classList.remove('is-shake'); void f.offsetWidth; f.classList.add('is-shake');
        input.focus();
        return;
      }
      const exact = chips.find((c) => norm(c.dataset.city) === norm(input.value));
      if (exact) input.value = exact.dataset.city;
    });
  }

})();
