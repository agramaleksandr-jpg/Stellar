/* =========================================================
   Информационные страницы: общие эффекты, фото и видео в окне,
   «О компании» (счётчики, лента истории, цикл производства)
   ========================================================= */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const S = window.Stellar || {};
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const onView = (el, cb, threshold = 0.3) => {
    if (!el) return;
    if (!('IntersectionObserver' in window) || reduceMotion) { cb(el); return; }
    const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); cb(e.target); } }), { threshold });
    io.observe(el);
  };
  const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c; };
  function countUp(el, to, dur = 1400, from = 0, fmt = (v) => String(v)) {
    if (reduceMotion) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    (function tick(t) {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 4);
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* ---------- Первый экран «О компании» ---------- */
  const ahero = $('.ahero');
  if (ahero) {
    const years = new Date().getFullYear() - 1994;
    const num = $('[data-years]', ahero);
    const cap = $('[data-years-text]', ahero);
    cap.textContent = `${plural(years, 'год', 'года', 'лет')} на рынке детских игрушек`;
    const ready = () => requestAnimationFrame(() => {
      ahero.classList.add('is-ready');
      countUp(num, years, 1600, Math.max(0, years - 30));
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ready); else ready();
  }

  const pdark = $('.phero-dark');
  if (pdark) {
    const ready = () => requestAnimationFrame(() => pdark.classList.add('is-ready'));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ready); else ready();
  }

  /* ---------- Шаги «Как начать работу» ---------- */
  const psteps = $('[data-psteps]');
  if (psteps) {
    const list = $('.psteps__list', psteps);
    const items = $$('.pstep', psteps);
    const set = (n) => {
      items.forEach((it, i) => it.classList.toggle('is-on', i <= n));
      list.style.setProperty('--p', items.length > 1 ? n / (items.length - 1) : 1);
    };
    let auto = 0, timer = null;
    onView(psteps, () => {
      set(0);
      timer = setInterval(() => { auto += 1; set(auto); if (auto >= items.length - 1) clearInterval(timer); }, 650);
    }, 0.5);
    items.forEach((it, i) => it.addEventListener('pointerenter', () => { clearInterval(timer); set(i); }));
  }

  /* счётчики */
  $$('[data-count]').forEach((el) => {
    const to = +el.dataset.count;
    const from = el.hasAttribute('data-count-plain') ? to - 40 : 0;
    onView(el, () => countUp(el, to, 1400, from), 0.6);
  });

  /* ---------- Лента истории ---------- */
  const tline = $('[data-tline]');
  if (tline) {
    $$('.tline__item', tline).forEach((li, i) => li.style.setProperty('--i', i));
    onView(tline, () => { tline.classList.add('is-in'); requestAnimationFrame(() => tline.style.setProperty('--p', 1)); }, 0.25);
    $$('.tline__dot', tline).forEach((dot) => dot.addEventListener('click', () => {
      const li = dot.closest('.tline__item');
      const on = !li.classList.contains('is-active');
      $$('.tline__item', tline).forEach((x) => x.classList.remove('is-active'));
      li.classList.toggle('is-active', on);
    }));
  }

  /* ---------- Цикл производства: этапы подсвечиваются по очереди ---------- */
  const cycle = $('[data-cycle]');
  if (cycle && !reduceMotion) {
    const steps = $$('.cstep', cycle);
    let timer = null, i = 0, hover = false;
    const step = () => {
      if (hover) return;
      steps.forEach((s, k) => s.classList.toggle('is-lit', k === i));
      i = (i + 1) % (steps.length + 1);
    };
    onView(cycle, () => { step(); timer = setInterval(step, 900); }, 0.4);
    cycle.addEventListener('pointerenter', () => { hover = true; steps.forEach((s) => s.classList.remove('is-lit')); });
    cycle.addEventListener('pointerleave', () => { hover = false; });
    document.addEventListener('visibilitychange', () => { if (document.hidden && timer) { clearInterval(timer); timer = null; } else if (!document.hidden && !timer) timer = setInterval(step, 900); });
  }

  /* сравнение: строки по очереди */
  $$('[data-compare] .compare__row').forEach((r, i) => r.style.setProperty('--i', i));

  /* кнопка «Фотоотчёт»/«Смотреть» открывает фото своей карточки */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lb-open]');
    if (!b) return;
    const card = b.closest('[data-item], article');
    const t = card && card.querySelector('[data-lightbox]');
    if (t) t.click();
  });

  /* ---------- Фото в окне ---------- */
  const lbox = $('[data-lbox]');
  if (lbox) {
    const img = $('[data-lbox-img]', lbox);
    const cap = $('[data-lbox-cap]', lbox);
    const count = $('[data-lbox-count]', lbox);
    const prev = $('[data-lbox-prev]', lbox);
    const next = $('[data-lbox-next]', lbox);
    let group = [], idx = 0;
    const show = (i, swap) => {
      idx = (i + group.length) % group.length;
      const it = group[idx];
      img.src = it.dataset.lightbox;
      img.alt = it.dataset.caption || '';
      cap.textContent = it.dataset.caption || '';
      count.textContent = group.length > 1 ? `${idx + 1} / ${group.length}` : '';
      prev.hidden = next.hidden = group.length < 2;
      if (swap) { img.classList.remove('is-swap'); void img.offsetWidth; img.classList.add('is-swap'); }
    };
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-lightbox]');
      if (!t) return;
      e.preventDefault();
      const g = t.dataset.lbGroup;
      group = g ? $$(`[data-lightbox][data-lb-group="${g}"]`).filter((x) => !x.closest('[hidden]')) : $$(':scope > [data-lightbox]', t.parentElement);
      show(group.indexOf(t));
      S.openModal && S.openModal('lightbox', t);
    });
    prev.addEventListener('click', () => show(idx - 1, true));
    next.addEventListener('click', () => show(idx + 1, true));
    document.addEventListener('keydown', (e) => {
      if (!lbox.closest('.modal').classList.contains('is-open')) return;
      if (e.key === 'ArrowLeft') show(idx - 1, true);
      if (e.key === 'ArrowRight') show(idx + 1, true);
    });
    // свайп
    let x0 = null;
    img.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
    img.addEventListener('pointerup', (e) => { if (x0 !== null && Math.abs(e.clientX - x0) > 40) show(idx + (e.clientX < x0 ? 1 : -1), true); x0 = null; });
  }

  /* ---------- Видео в окне ---------- */
  const vmodal = $('[data-vmodal]');
  if (vmodal) {
    const screen = $('[data-vmodal-screen]', vmodal);
    // ссылка на ролик-презентацию: <div class="vmodal" data-vmodal data-src="https://www.youtube.com/embed/ID">
    const src = vmodal.dataset.src;
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-video-open]');
      if (!t) return;
      e.preventDefault();
      // обзор конкретного товара: своя обложка, название и поиск ролика на YouTube
      const one = t.dataset.videoTitle;
      const CH = 'https://www.youtube.com/channel/UCFnpPpj2sRNHml6yER500HQ';
      const def = vmodal._def || (vmodal._def = { img: $('[data-vm-img]', vmodal).getAttribute('src'), title: $('[data-vm-title]', vmodal).textContent, sub: $('[data-vm-sub]', vmodal).textContent });
      vmodal.classList.toggle('vmodal--thumb', !!one);
      $('[data-vm-img]', vmodal).src = one ? t.dataset.videoPoster : def.img;
      $('[data-vm-title]', vmodal).textContent = one || def.title;
      $('[data-vm-sub]', vmodal).textContent = one ? 'Ролик опубликован на YouTube-канале «Стеллар»' : def.sub;
      const link = one ? 'https://www.youtube.com/results?search_query=' + encodeURIComponent('Стеллар ' + one.replace(/[«»"]/g, '')) : CH;
      $$('[data-vm-link]', vmodal).forEach((a) => { a.href = link; });
      if (src && !one && !$('iframe', screen)) {
        const f = document.createElement('iframe');
        f.src = src + (src.includes('?') ? '&' : '?') + 'autoplay=1';
        f.allow = 'autoplay; fullscreen; picture-in-picture';
        f.allowFullscreen = true;
        f.title = 'Презентация компании «Стеллар»';
        screen.appendChild(f);
      }
      S.openModal && S.openModal('video', t);
    });
    const modal = vmodal.closest('.modal');
    new MutationObserver(() => { if (modal.hidden) { const f = $('iframe', screen); if (f) f.remove(); } }).observe(modal, { attributes: true, attributeFilter: ['hidden'] });
  }

  /* ---------- Аккордеон вопросов ---------- */
  $$('[data-faq]').forEach((faq) => {
    const items = $$('.faq__item', faq);
    items.forEach((it) => {
      const btn = $('.faq__q', it);
      const body = $('.faq__a', it);
      const set = (open, instant) => {
        it.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
        if (instant || reduceMotion) { body.style.height = open ? 'auto' : '0px'; return; }
        const from = body.offsetHeight;
        body.style.height = 'auto';
        const to = open ? body.scrollHeight : 0;
        body.style.height = from + 'px';
        void body.offsetHeight;
        body.style.height = to + 'px';
        body.addEventListener('transitionend', function te(ev) {
          if (ev.propertyName !== 'height') return;
          body.removeEventListener('transitionend', te);
          if (it.classList.contains('is-open')) body.style.height = 'auto';
        });
      };
      set(it.classList.contains('is-open'), true);
      btn.addEventListener('click', () => {
        const open = !it.classList.contains('is-open');
        if (open && faq.hasAttribute('data-faq-single')) items.forEach((o) => { if (o !== it && o.classList.contains('is-open')) o._set(false); });
        set(open);
      });
      it._set = set;
    });
  });

  /* ---------- Поделиться ---------- */
  $$('[data-share]').forEach((b) => b.addEventListener('click', async () => {
    const url = location.href.split('#')[0];
    const title = document.title;
    const kind = b.dataset.share;
    if (kind === 'tg') window.open('https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(title), '_blank', 'noopener');
    else if (kind === 'wa') window.open('https://wa.me/?text=' + encodeURIComponent(title + ' ' + url), '_blank', 'noopener');
    else { const ok = await S.copyText(url); S.toast(ok ? 'Ссылка скопирована' : 'Не удалось скопировать'); }
  }));

  /* ---------- Списки с фильтрами, поиском и страницами ----------
     <div data-flist data-per="12">
       кнопки: [data-f="all"|значение] внутри [data-fgroup="ключ"]; поиск: [data-fq]
       элементы: [data-item data-ключ="значение …" data-text="…"]; [data-fgrid], [data-fpager], [data-fempty], [data-fcount] */
  $$('[data-flist]').forEach((root) => {
    const items = $$('[data-item]', root);
    const per = +root.dataset.per || 999;
    const pager = $('[data-fpager]', root);
    const empty = $('[data-fempty]', root);
    const countEl = $('[data-fcount]', root);
    const q = $('[data-fq]', root);
    const state = {};
    let page = 1;
    const groups = $$('[data-fgroup]', root);
    groups.forEach((g) => {
      const key = g.dataset.fgroup;
      state[key] = 'all';
      $$('[data-f]', g).forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset.f === 'all' || (!$('[data-f="all"]', g) && false)));
        // счётчик в кнопке
        if (b.dataset.f !== 'all' && !b.hasAttribute('data-nocount')) {
          const n = items.filter((it) => (it.dataset[key] || '').split(' ').includes(b.dataset.f)).length;
          b.insertAdjacentHTML('beforeend', `<span class="nf__n">${n}</span>`);
        }
        b.addEventListener('click', () => {
          const on = b.getAttribute('aria-pressed') === 'true';
          const val = on && b.dataset.f !== 'all' && !$('[data-f="all"]', g) ? 'all' : b.dataset.f;
          state[key] = val;
          $$('[data-f]', g).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.f === val)));
          page = 1; render(true);
        });
      });
    });
    const match = (it) => {
      for (const k in state) if (state[k] !== 'all' && !(it.dataset[k] || '').split(' ').includes(state[k])) return false;
      const s = q ? q.value.trim().toLowerCase() : '';
      return !s || (it.dataset.text || it.textContent).toLowerCase().includes(s);
    };
    function render(animate) {
      const ok = items.filter(match);
      const pages = Math.max(1, Math.ceil(ok.length / per));
      page = Math.min(page, pages);
      const show = new Set(ok.slice((page - 1) * per, page * per));
      let i = 0;
      items.forEach((it) => {
        const on = show.has(it);
        it.hidden = !on;
        if (on && animate && !reduceMotion) { it.style.setProperty('--i', i++); it.classList.remove('is-pop'); void it.offsetWidth; it.classList.add('is-pop'); }
      });
      if (empty) empty.hidden = ok.length > 0;
      if (countEl) countEl.textContent = ok.length ? `Показано ${show.size} из ${ok.length}` : '';
      if (pager) {
        pager.hidden = pages < 2;
        pager.innerHTML = `<button class="pg" type="button" data-pg="${page - 1}" aria-label="Назад"${page === 1 ? ' disabled' : ''}><svg class="i"><use href="#i-arrow-left"/></svg></button>` +
          Array.from({ length: pages }, (_, k) => `<button class="pg${k + 1 === page ? ' is-active' : ''}" type="button" data-pg="${k + 1}">${k + 1}</button>`).join('') +
          `<button class="pg" type="button" data-pg="${page + 1}" aria-label="Вперёд"${page === pages ? ' disabled' : ''}><svg class="i"><use href="#i-arrow-right"/></svg></button>`;
      }
    }
    if (pager) pager.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pg]');
      if (!b || b.disabled) return;
      page = +b.dataset.pg; render(true);
      const top = root.getBoundingClientRect().top + scrollY - 120;
      if (scrollY > top) window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    let t;
    if (q) q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { page = 1; render(true); }, 150); });
    $$('[data-freset]', root).forEach((b) => b.addEventListener('click', () => {
      if (q) q.value = '';
      groups.forEach((g) => { state[g.dataset.fgroup] = 'all'; $$('[data-f]', g).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.f === 'all'))); });
      page = 1; render(true);
    }));
    render();
  });

  /* ---------- Загрузка файлов ---------- */
  $$('[data-drop]').forEach((drop) => {
    const input = $('[data-drop-input]', drop);
    const list = $('[data-drop-files]', drop);
    const max = (+drop.dataset.max || 50) * 1024 * 1024;
    let files = [];
    const sync = () => {
      try { const dt = new DataTransfer(); files.forEach((f) => dt.items.add(f)); input.files = dt.files; } catch (e) { /* старые браузеры */ }
      list.innerHTML = files.map((f, i) => `<span class="drop__file"><span>${f.name.replace(/</g, '&lt;')}</span><button type="button" data-drop-rm="${i}" aria-label="Убрать файл"><svg class="i"><use href="#i-close"/></svg></button></span>`).join('');
      drop.classList.toggle('has-files', files.length > 0);
    };
    const add = (fl) => {
      const big = [];
      Array.from(fl).forEach((f) => { if (f.size > max) big.push(f.name); else if (!files.some((x) => x.name === f.name && x.size === f.size)) files.push(f); });
      if (big.length) S.toast('Файл больше допустимого размера: ' + big[0]);
      sync();
    };
    input.addEventListener('change', () => { add(input.files); });
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); if (ev === 'dragleave' && drop.contains(e.relatedTarget)) return; drop.classList.remove('is-over'); }));
    drop.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files.length) add(e.dataTransfer.files); });
    list.addEventListener('click', (e) => {
      const b = e.target.closest('[data-drop-rm]');
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      files.splice(+b.dataset.dropRm, 1); sync();
    });
    const form = drop.closest('form');
    if (form) form.addEventListener('reset', () => { files = []; setTimeout(sync); });
  });

  /* ---------- Вакансии: «Откликнуться» ---------- */
  const jobSel = $('[data-job-select]');
  $$('[data-apply]').forEach((b) => b.addEventListener('click', () => {
    const box = $('#cv');
    if (jobSel && jobSel._select) jobSel._select.set(b.dataset.apply);
    if (!box) return;
    const top = box.getBoundingClientRect().top + scrollY - 110;
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    box.classList.remove('is-flash'); void box.offsetWidth; box.classList.add('is-flash');
    setTimeout(() => { const n = $('input[name="name"]', box); if (n) n.focus({ preventScroll: true }); }, reduceMotion ? 0 : 600);
  }));

  /* ---------- Пресс-формы: этапы ---------- */
  const mst = $('[data-mstages]');
  if (mst) {
    const st = $$('.mstage', mst);
    const light = () => st.forEach((s, i) => setTimeout(() => {
      s.classList.add('is-lit');
      mst.style.setProperty('--p', i / (st.length - 1));
    }, reduceMotion ? 0 : 350 + i * 650));
    onView(mst, light, 0.4);
  }
  const msteps = $('[data-msteps]');
  if (msteps) {
    const it = $$('.mstep', msteps);
    it.forEach((s) => s.addEventListener('mouseenter', () => it.forEach((x) => x.classList.toggle('is-on', x === s))));
    msteps.addEventListener('mouseleave', () => it.forEach((x, i) => x.classList.toggle('is-on', i === 0)));
  }
})();
