'use strict';

const CATEGORIES = ['All', 'Stoic', 'Discipline', 'Mindset', 'Relationships', 'Purpose', 'Wisdom', 'Eastern'];
const KEY_FAVS = 'dl:favorites';
const KEY_DECKS = 'dl:decks';
const KEY_FILTER = 'dl:filter';

const $ = (id) => document.getElementById(id);

const state = {
  lessons: [],
  byId: new Map(),
  filter: 'All',
  todayId: null,
  dayKey: null,
  history: [],   // ids viewed this session, for Previous/Next
  pos: -1,
  favs: new Set(),
};

/* ---------- storage ---------- */

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
}

/* ---------- lesson of the day ---------- */

function localDayNumber(date = new Date()) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 864e5);
}

function gcd(a, b) { return b ? gcd(b, a % b) : a; }

// Stepping by a stride coprime with n visits every lesson once before
// any repeats, so consecutive days never show the same lesson.
function lessonOfDay(day) {
  const n = state.lessons.length;
  let stride = 37;
  while (gcd(stride, n) !== 1) stride++;
  return state.lessons[(day * stride) % n].id;
}

function refreshToday() {
  const day = localDayNumber();
  if (day === state.dayKey) return;
  const wasOnToday = currentId() === state.todayId;
  state.dayKey = day;
  state.todayId = lessonOfDay(day);
  if (state.pos === -1) goTo(state.todayId, null);
  else if (wasOnToday) goTo(state.todayId);
  else render();
}

/* ---------- shuffle without repeats ---------- */

function pool() {
  return state.lessons
    .filter((l) => state.filter === 'All' || l.category === state.filter)
    .map((l) => l.id);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function drawNext() {
  const ids = pool();
  const decks = load(KEY_DECKS, {});
  let deck = decks[state.filter];
  const valid = deck && deck.order.length === ids.length && ids.every((id) => deck.order.includes(id));

  if (!valid || deck.pos >= deck.order.length) {
    const order = shuffle(ids.slice());
    // Avoid showing the same lesson twice in a row across a reshuffle.
    if (order.length > 1 && order[0] === currentId()) order.push(order.shift());
    deck = { order, pos: 0 };
  }

  const id = deck.order[deck.pos++];
  decks[state.filter] = deck;
  save(KEY_DECKS, decks);
  return id;
}

/* ---------- navigation ---------- */

function currentId() {
  return state.history[state.pos];
}

function goTo(id, direction = 'left') {
  state.history = state.history.slice(0, state.pos + 1);
  state.history.push(id);
  state.pos = state.history.length - 1;
  render(direction);
}

function next() {
  if (state.pos < state.history.length - 1) {
    state.pos++;
    render('left');
  } else {
    goTo(drawNext(), 'left');
  }
}

function prev() {
  if (state.pos > 0) {
    state.pos--;
    render('right');
  } else {
    toast('This is the first lesson');
  }
}

/* ---------- rendering ---------- */

let animTimer;

function render(direction) {
  const lesson = state.byId.get(currentId());
  if (!lesson) return;
  const card = $('card');

  const paint = () => {
    $('badge').textContent = lesson.id === state.todayId ? "Today's lesson" : '';
    $('lesson-text').textContent = lesson.lesson;
    $('lesson-figure').textContent = lesson.figure;
    $('lesson-category').textContent = lesson.category;
    const fav = state.favs.has(lesson.id);
    $('btn-fav').setAttribute('aria-pressed', String(fav));
    $('btn-fav').setAttribute('aria-label', fav ? 'Remove from favorites' : 'Add to favorites');
    $('btn-today').hidden = lesson.id === state.todayId;
  };

  clearTimeout(animTimer);
  if (!direction || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    paint();
    return;
  }
  card.classList.add(direction === 'left' ? 'out-left' : 'out-right');
  animTimer = setTimeout(() => {
    paint();
    card.classList.remove('out-left', 'out-right');
  }, 160);
}

function renderFilters() {
  const wrap = $('filters');
  wrap.replaceChildren(...CATEGORIES.map((cat) => {
    const b = document.createElement('button');
    b.className = 'chip' + (cat === state.filter ? ' is-active' : '');
    b.textContent = cat;
    b.setAttribute('aria-pressed', String(cat === state.filter));
    b.addEventListener('click', () => setFilter(cat));
    return b;
  }));
}

function setFilter(cat) {
  if (cat === state.filter) return;
  state.filter = cat;
  save(KEY_FILTER, cat);
  renderFilters();
  goTo(drawNext(), 'left');
}

function renderFavorites() {
  const list = $('fav-list');
  const items = state.lessons.filter((l) => state.favs.has(l.id));
  $('fav-empty').hidden = items.length > 0;

  list.replaceChildren(...items.map((l) => {
    const li = document.createElement('li');
    li.className = 'fav-item';

    const open = document.createElement('button');
    open.className = 'fav-open';
    const text = document.createElement('p');
    text.className = 'lesson';
    text.textContent = l.lesson;
    const who = document.createElement('p');
    who.className = 'figure';
    who.textContent = `${l.figure} · ${l.category}`;
    open.append(text, who);
    open.addEventListener('click', () => {
      showView('lesson');
      goTo(l.id);
    });

    const remove = document.createElement('button');
    remove.className = 'icon-btn fav-remove';
    remove.setAttribute('aria-label', 'Remove from favorites');
    remove.innerHTML = $('btn-fav').innerHTML;
    remove.addEventListener('click', () => {
      toggleFavorite(l.id);
      renderFavorites();
    });

    li.append(open, remove);
    return li;
  }));
}

function showView(name) {
  document.querySelectorAll('.tab').forEach((t) => {
    const active = t.dataset.view === name;
    t.classList.toggle('is-active', active);
    t.setAttribute('aria-selected', String(active));
  });
  $('view-lesson').hidden = name !== 'lesson';
  $('view-favorites').hidden = name !== 'favorites';
  if (name === 'favorites') renderFavorites();
}

/* ---------- favorites & share ---------- */

function toggleFavorite(id = currentId()) {
  if (state.favs.has(id)) state.favs.delete(id);
  else state.favs.add(id);
  save(KEY_FAVS, [...state.favs]);
  if (id === currentId()) render();
}

async function share() {
  const l = state.byId.get(currentId());
  if (!l) return;
  const text = `"${l.lesson}" — ${l.figure}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Daily Lessons', text });
    } catch (err) {
      if (err.name !== 'AbortError') toast('Could not share');
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard');
  } catch {
    toast('Sharing is not supported here');
  }
}

let toastTimer;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

/* ---------- input ---------- */

function bindSwipe(el) {
  let x0 = null;
  let y0 = null;
  el.addEventListener('touchstart', (e) => {
    x0 = e.touches[0].clientX;
    y0 = e.touches[0].clientY;
  }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    x0 = y0 = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) next();
    else prev();
  }, { passive: true });
}

function bindEvents() {
  $('btn-next').addEventListener('click', next);
  $('btn-prev').addEventListener('click', prev);
  $('btn-fav').addEventListener('click', () => toggleFavorite());
  $('btn-share').addEventListener('click', share);
  $('btn-today').addEventListener('click', () => goTo(state.todayId, 'right'));
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => showView(t.dataset.view)));
  bindSwipe($('card'));

  document.addEventListener('keydown', (e) => {
    if ($('view-lesson').hidden) return;
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  });

  // Roll over to the new lesson of the day at midnight, even if the app stays open.
  setInterval(refreshToday, 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshToday();
  });
}

/* ---------- boot ---------- */

async function init() {
  try {
    const res = await fetch('lessons.json');
    state.lessons = (await res.json()).sort((a, b) => a.id - b.id);
  } catch {
    $('lesson-text').textContent = 'Could not load lessons. Check your connection and try again.';
    return;
  }
  state.lessons.forEach((l) => state.byId.set(l.id, l));
  state.favs = new Set(load(KEY_FAVS, []).filter((id) => state.byId.has(id)));
  const savedFilter = load(KEY_FILTER, 'All');
  state.filter = CATEGORIES.includes(savedFilter) ? savedFilter : 'All';

  renderFilters();
  bindEvents();
  refreshToday();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

init();
