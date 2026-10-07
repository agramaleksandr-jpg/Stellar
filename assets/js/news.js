/* =========================================================
   Новости: данные, список с фильтрами/поиском/страницами,
   страница новости (news-item.html?id=…)
   ========================================================= */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const S = window.Stellar || {};
  const D = window.STELLAR_DATA || {};
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const href = (u) => (S.href ? S.href(u) : u);
  const T = 'assets/img/toys/';

  /* Новости из макета. Выставки и «30 лет» — демо-записи, даты уточнить у клиента. */
  const NEWS = [
    { id: 'mozaika', date: '2026-09-08', tag: 'new', art: '01091', img: T + 'mozaika-01091.webp', bg: '#F6E4EA', word: 'СКАЗКИ',
      title: 'Мозаика с картинками «Русские народные сказки»',
      lead: 'Увлекательная игра, которая приносит радость и развивает внимание, усидчивость, фантазию и творческие способности ребёнка. 110 деталей и картинки по мотивам любимых сказок.',
      intro: 'Мозаика с картинками на тему русских народных сказок — игра, которая приносит радость и развивает внимание, усидчивость, фантазию и творческие способности ребёнка.',
      body: [['Что в наборе', 'В наборе 110 деталей и картинки с героями любимых сказок: ребёнок выкладывает изображение по образцу или придумывает своё.'], ['Для кого', 'Для детей от 3 лет. Подходит для занятий дома и в детском саду, тренирует мелкую моторику и внимание.']] },
    { id: 'slova', date: '2026-08-25', tag: 'new', art: '01169', img: T + 'words-news.webp', bg: '#E8F1E4', word: 'СЛОВА',
      title: 'Настольная игра «Простые слова»', lead: 'Знакомство с буквами и словами для 2–4 игроков',
      intro: 'Настольная игра «Простые слова» помогает познакомиться с буквами и собрать первые слова — весело и в компании: играть могут от двух до четырёх человек.',
      body: [['Как играть', 'Игроки собирают слова из букв по картинкам-подсказкам. Правила простые — можно начать играть сразу после распаковки.'], ['Чему учит', 'Знакомит с буквами, тренирует внимание и речь, учит играть по правилам и дожидаться своей очереди.']] },
    { id: 'zaika', date: '2026-08-25', tag: 'new', art: '02625', img: T + 'zaika-02625.webp', bg: '#EDE9F6', word: 'ЗАЙКА',
      title: 'Машинка для малышей «Зайка»', lead: 'Настоящий друг ребёнка для первых путешествий',
      intro: 'Машинка «Зайка» — настоящий друг ребёнка для первых путешествий по дому: мягкие формы, яркие детали и колёса, которые легко катить маленькой ладошкой.',
      body: [['Для кого', 'Для самых маленьких: машинку удобно держать, толкать и катать по полу.'], ['Партнёрам', 'Позиция входит в линейку машинок для малышей — её удобно выставлять на полку вместе с «Тигрёнком», «Котёнком» и «Божьей коровкой».']] },
    { id: 'spectehnika', date: '2026-08-21', tag: 'new', img: T + 'spectehnika-01496.webp', bg: '#FDE4DE', word: 'ТЕХНИКА',
      title: 'Коллекция машинок «Спецтехника»', lead: 'Новая серия для малышей от 3 лет',
      intro: 'Новая серия машинок «Спецтехника» для малышей от 3 лет: пожарная и другие машины с весёлыми водителями за рулём.',
      body: [['Для кого', 'Для детей от 3 лет — для сюжетных игр, в которых машинки спешат на помощь.']] },
    { id: 'kubiki', date: '2026-05-14', tag: 'new', img: T + 'kubiki-00884.webp', bg: '#FFF1D6', word: 'КУБИКИ',
      title: 'Кубики с картинками', lead: 'Простая и многофункциональная игрушка для развития',
      intro: 'Кубики с картинками «Русские народные сказки» — простая и многофункциональная игрушка: из них строят башни, собирают картинки и рассказывают сказки.',
      body: [['Чему учат', 'Развивают мелкую моторику, внимание и речь: ребёнок узнаёт героев и учится собирать целое из частей.']] },
    { id: 'kolobok', date: '2026-03-02', tag: 'new', art: '03850', img: T + 'yula-kolobok-03850.webp', bg: '#E6F2EC', word: 'ЮЛА',
      title: 'Юла «Колобок»', lead: 'Весёлое путешествие по мотивам любимой сказки',
      intro: 'Юла «Колобок» — весёлое путешествие по мотивам любимой сказки: стоит нажать на ручку, и герои на юле оживают в движении.',
      body: [['Для кого', 'Для малышей, которые только знакомятся с причиной и следствием: нажал — юла закружилась.']] },
    { id: 'pupsik', date: '2026-02-17', tag: 'new', img: T + 'pupsik-02663.webp', bg: '#E8F1E4', word: 'ПУПСИК',
      title: 'Машинка «Пупсик»', lead: 'Путешествие, полное открытий и радости',
      intro: 'Машинка-самолётик «Пупсик» — путешествие, полное открытий и радости: обтекаемые формы и большие колёса для уверенной езды.',
      body: [['Для кого', 'Для малышей, которые учатся катать игрушки и играть в первые сюжетные игры.']] },
    { id: 'telefon', date: '2026-01-13', tag: 'new', img: T + 'telefon-01168.webp', bg: '#E5EEF6', word: 'ТЕЛЕФОН',
      title: 'Настольная игра «Телефон»', lead: 'Развивающая игра по мотивам стихотворения Чуковского',
      intro: 'Настольная игра «Телефон» по мотивам стихотворения Корнея Чуковского знакомит детей со стихотворением в игровой форме.',
      body: [['Что в наборе', '32 фишки и карточки с текстом стихотворения.']] },
    { id: 'naydi', date: '2025-11-18', tag: 'new', img: T + 'naydi-01167.webp', bg: '#FDE4DE', word: 'НАЙДИ',
      title: 'Настольная игра «Найди первым»', lead: 'Динамичная игра для семьи и друзей',
      intro: '«Найди первым» — динамичная игра на внимание и скорость реакции для семьи и друзей.',
      body: [['Что в наборе', '24 фишки и 8 карточек: найдите три предмета быстрее соперников.']] },
    { id: 'mir-detstva-2024', date: '2024-09-24', tag: 'expo', img: 'assets/img/about/expo-2024.webp', photo: true, bg: '#ECE8E3', word: 'ВЫСТАВКА',
      title: '«Стеллар» на выставке «Мир детства 2024»', lead: 'Показали новинки и отметили 30 лет компании на стенде в «Экспоцентре»',
      intro: 'На выставке «Мир детства 2024» в московском «Экспоцентре» мы показали новинки сезона и встретились с партнёрами из разных регионов.',
      body: [['На стенде', 'Новые коллекции для малышей, совместная линейка с брендом «Цветняшки» и праздничный торт к 30-летию компании.']] },
    { id: '30-let', date: '2024-06-01', tag: 'company', img: T + 'piramidka-02179.webp', bg: '#FFF1D6', word: '30 ЛЕТ',
      title: '«Стеллар» — 30 лет', lead: 'Юбилей компании и совместная линейка с брендом «Цветняшки»',
      intro: 'В 2024 году «Стеллар» отметил 30 лет: от небольшой частной фирмы с двумя термопластавтоматами — до фабрики полного цикла в Ростове-на-Дону.',
      body: [['Новая линейка', 'К юбилею вышла совместная линейка с брендом «Цветняшки»: пирамидка, ведро-сортер и кубик-трансформер.']] },
    { id: 'spielwarenmesse-2019', date: '2019-01-30', tag: 'expo', img: 'assets/img/about/expo-2019.webp', photo: true, bg: '#ECE8E3', word: 'NÜRNBERG',
      title: 'Spielwarenmesse 2019 в Нюрнберге', lead: 'Представили продукцию на главной выставке игрушек мира',
      intro: '«Стеллар» принял участие в Spielwarenmesse — главной международной выставке игрушек в Нюрнберге.',
      body: [['На стенде', 'Показали коллекции игрушек для малышей международной аудитории выставки.']] },
  ];
  const TAGS = { new: 'Новинка', expo: 'Выставка', company: 'Компания' };
  const fmtDate = (iso) => iso.split('-').reverse().join('.');
  const readTime = (n) => Math.max(1, Math.round((n.intro + n.body.map((b) => b.join(' ')).join(' ')).split(/\s+/).length / 120)) + ' мин чтения';
  const url = (n) => href('news-item.html?id=' + n.id);
  window.STELLAR_NEWS = NEWS;

  function card(n, i = 0) {
    return `<a class="ncard2${n.photo ? ' ncard2--photo' : ''}" href="${url(n)}" style="--i:${i}">
  <span class="ncard2__img"><img src="${n.img}" alt="" loading="lazy"></span>
  <span class="ncard2__meta"><time datetime="${n.date}">${fmtDate(n.date)}</time><span class="tag tag--soft">${TAGS[n.tag]}</span></span>
  <span class="ncard2__title">${esc(n.title)}</span>
  <span class="ncard2__text">${esc(n.lead)}</span>
  <span class="link-action">Читать<svg class="i"><use href="#i-arrow-right"/></svg></span>
</a>`;
  }

  /* ---------- Список ---------- */
  const listRoot = $('[data-news]');
  if (listRoot) {
    const grid = $('[data-news-grid]', listRoot);
    const pager = $('[data-pager]', listRoot);
    const empty = $('[data-news-empty]', listRoot);
    const q = $('[data-news-q]', listRoot);
    const PER = 8;
    let filter = 'all', page = 1;

    // главная новость
    const feat = NEWS[0];
    const featEl = $('[data-featured]');
    featEl.href = url(feat);
    $('[data-feat-img]', featEl).src = feat.img;
    $('[data-feat-date]', featEl).textContent = fmtDate(feat.date);
    $('[data-feat-title]', featEl).textContent = feat.title;
    $('[data-feat-text]', featEl).textContent = feat.lead;

    function items() {
      const s = q.value.trim().toLowerCase();
      return NEWS.slice(1).filter((n) => (filter === 'all' || n.tag === filter) && (!s || (n.title + ' ' + n.lead).toLowerCase().includes(s)));
    }
    function render(scroll) {
      const all = items();
      const pages = Math.max(1, Math.ceil(all.length / PER));
      page = Math.min(page, pages);
      const show = all.slice((page - 1) * PER, page * PER);
      grid.innerHTML = show.map(card).join('');
      empty.hidden = show.length > 0;
      pager.hidden = pages < 2;
      pager.innerHTML = `<button class="pg" type="button" data-pg="${page - 1}" aria-label="Назад"${page === 1 ? ' disabled' : ''}><svg class="i"><use href="#i-arrow-left"/></svg></button>` +
        Array.from({ length: pages }, (_, i) => `<button class="pg${i + 1 === page ? ' is-active' : ''}" type="button" data-pg="${i + 1}"${i + 1 === page ? ' aria-current="page"' : ''}>${i + 1}</button>`).join('') +
        `<button class="pg" type="button" data-pg="${page + 1}" aria-label="Вперёд"${page === pages ? ' disabled' : ''}><svg class="i"><use href="#i-arrow-right"/></svg></button>`;
      if (scroll) {
        const top = grid.getBoundingClientRect().top + scrollY - 200;
        if (scrollY > top) window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    }
    pager.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pg]');
      if (!b || b.disabled) return;
      page = +b.dataset.pg;
      render(true);
    });
    $$('[data-nfilter]', listRoot).forEach((b) => b.addEventListener('click', () => {
      $$('[data-nfilter]', listRoot).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      filter = b.dataset.nfilter;
      page = 1;
      render();
    }));
    // счётчики в фильтрах
    $$('[data-nfilter]', listRoot).forEach((b) => {
      const f = b.dataset.nfilter;
      const n = NEWS.slice(1).filter((x) => f === 'all' || x.tag === f).length;
      b.insertAdjacentHTML('beforeend', `<span class="nf__n">${n}</span>`);
    });
    let t;
    q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { page = 1; render(); }, 150); });
    $('[data-news-reset]', listRoot).addEventListener('click', () => { q.value = ''; $('[data-nfilter="all"]', listRoot).click(); });
    render();
  }

  /* ---------- Новость ---------- */
  const art = $('[data-article]');
  if (art) {
    const id = new URLSearchParams(location.search).get('id');
    const n = NEWS.find((x) => x.id === id) || NEWS[0];
    document.title = `${n.title} — новости «Стеллар»`;
    $('[data-a-crumb]').textContent = n.title.length > 40 ? n.title.slice(0, 38) + '…' : n.title;
    $('[data-a-tag]').textContent = TAGS[n.tag];
    $('[data-a-meta]').textContent = `${fmtDate(n.date)} · ${readTime(n)}`;
    $('[data-a-title]').textContent = n.title;
    const cover = $('[data-a-cover]');
    cover.style.setProperty('--bg', n.bg);
    $('[data-a-word]').textContent = n.word;
    const cimg = $('[data-a-img]');
    cimg.src = n.img; cimg.alt = n.title;
    cover.classList.toggle('acover--photo', !!n.photo);
    $('[data-a-body]').innerHTML = `<p class="abody__intro">${esc(n.intro)}</p>` + n.body.map(([h, t]) => `<h2>${esc(h)}</h2><p>${esc(t)}</p>`).join('');
    const p = n.art && D.byArt ? D.byArt(n.art) : null;
    const prodBox = $('[data-a-product]');
    if (p) {
      $('[data-a-product-card]').innerHTML = D.cardHTML(p);
      S.initProductCards && S.initProductCards(prodBox);
    } else prodBox.hidden = true;
    $('[data-a-note]').hidden = n.tag !== 'new';
    // другие новости
    const more = NEWS.filter((x) => x.id !== n.id).slice(0, 3);
    $('[data-more]').innerHTML = more.map(card).join('');
    // прогресс чтения
    const bar = $('[data-read-bar]');
    const body = $('[data-a-body]');
    const upd = () => {
      const r = body.getBoundingClientRect();
      const k = Math.min(1, Math.max(0, (innerHeight * 0.6 - r.top) / r.height));
      bar.style.transform = `scaleX(${k})`;
    };
    addEventListener('scroll', upd, { passive: true });
    upd();
    // параллакс слова на обложке
    if (!reduceMotion) {
      const word = $('[data-a-word]');
      addEventListener('scroll', () => {
        const r = cover.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        word.style.transform = `translate(-50%, ${(r.top * 0.12).toFixed(1)}px)`;
      }, { passive: true });
    }
  }

  /* ---------- Подписка ---------- */
  $$('[data-subscribe]').forEach((f) => f.addEventListener('submit', (e) => {
    e.preventDefault();
    const inp = $('input', f);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(inp.value.trim())) {
      f.classList.remove('is-shake'); void f.offsetWidth; f.classList.add('is-shake');
      S.toast && S.toast('Проверьте e-mail');
      inp.focus();
      return;
    }
    const btn = $('button', f);
    btn.classList.add('is-loading');
    setTimeout(() => {
      btn.classList.remove('is-loading');
      f.classList.add('is-done');
      inp.value = '';
      inp.placeholder = 'Готово — вы подписаны';
      S.toast && S.toast('Подписка оформлена — новинки придут на почту');
    }, 900);
  }));
})();
