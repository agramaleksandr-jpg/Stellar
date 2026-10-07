/* =========================================================
   Стеллар — политика (оглавление) и 404
   ========================================================= */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Оглавление политики ---------- */
  const nav = $('[data-toc-nav]');
  if (nav) {
    const links = $$('[data-toc]', nav);
    const secs = links.map((a) => $(a.getAttribute('href')));
    const bar = $('[data-toc-progress]');
    const body = $('.policy__body');
    let lock = 0;
    const set = (i) => links.forEach((a, k) => a.classList.toggle('is-active', k === i));
    links.forEach((a, i) => a.addEventListener('click', (e) => {
      e.preventDefault();
      set(i); lock = Date.now();
      const s = secs[i];
      window.scrollTo({ top: s.getBoundingClientRect().top + scrollY - 110, behavior: reduceMotion ? 'auto' : 'smooth' });
      s.classList.remove('is-flash'); void s.offsetWidth; s.classList.add('is-flash');
      setTimeout(() => s.classList.remove('is-flash'), 1400);
      history.replaceState(null, '', a.getAttribute('href'));
    }));
    const onScroll = () => {
      const r = body.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.4 - r.top) / r.height));
      bar.style.setProperty('--p', p.toFixed(3));
      if (Date.now() - lock < 900) return;
      let cur = 0;
      secs.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * 0.4) cur = i; });
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) cur = secs.length - 1;
      set(cur);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 404: неваляшку можно толкнуть ---------- */
  const toy = $('[data-nf-toy]');
  if (toy) toy.addEventListener('click', () => { toy.classList.remove('is-push'); void toy.offsetWidth; toy.classList.add('is-push'); });
})();
