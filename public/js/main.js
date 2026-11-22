import { dict, detectLang } from './i18n.js';
import { SITE, PROJECTS, SKILLS, MARQUEE } from './data.js';

/* =========================================================
   Utilitaires
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const isMobile = matchMedia('(max-width: 860px)').matches || !finePointer;

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* navigation privée */ } },
};

try { history.scrollRestoration = 'manual'; } catch (e) { /* ignore */ }

let started = false;

/* =========================================================
   Langue (FR / EN)
   ========================================================= */
let lang = store.get('lang') || detectLang();
if (!dict[lang]) lang = 'fr';
const tr = (k) => (dict[lang][k] !== undefined ? dict[lang][k] : dict.fr[k] !== undefined ? dict.fr[k] : k);
const pick = (v) => (typeof v === 'string' ? v : v[lang] || v.fr);

function applyLang() {
  root.lang = lang;
  document.title = tr('meta.title');
  const md = $('meta[name="description"]');
  if (md) md.content = tr('meta.desc');

  $$('[data-i18n]').forEach((el) => { el.textContent = tr(el.dataset.i18n); });
  $$('[data-i18n-ph]').forEach((el) => { el.placeholder = tr(el.dataset.i18nPh); });
  $$('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', tr(el.dataset.i18nAria)); });
  $$('[data-i18n-alt]').forEach((el) => { el.alt = tr(el.dataset.i18nAlt); });
  $$('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));

  renderSkills();
  renderProjects();
  updateHud(currentIndex, true);
  startTypewriter();

  if (modalProject) setModalTexts(modalProject);
}

$$('.lang button').forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.lang === lang) return;
  lang = b.dataset.lang;
  store.set('lang', lang);
  applyLang();
}));

/* =========================================================
   Rendu : marquee, compétences, projets
   ========================================================= */
function renderMarquee() {
  const host = $('#marquee');
  const row = MARQUEE.map((m) => `<span>${m}</span>`).join('');
  host.innerHTML = row + row;
}

function renderSkills() {
  const host = $('#skillGroups');
  host.innerHTML = SKILLS.map((g) => `
    <div class="group group--${g.id} reveal ${started ? 'in' : ''}">
      <div class="group-head">
        <h3><i></i>${tr(`skills.g.${g.id}.t`)}</h3>
        <p>${tr(`skills.g.${g.id}.d`)}</p>
      </div>
      <ul class="skill-grid">
        ${g.items.map((s) => `
          <li class="skill">
            <span class="mono" aria-hidden="true">${s.abbr}</span>
            <span class="meta">
              <span class="nm">${pick(s.name)}</span>
              <span class="pips" role="img" aria-label="${tr('skills.lvl')} ${s.level} ${tr('skills.of')}">
                ${[1, 2, 3, 4, 5].map((i) => `<i class="pip${i <= s.level ? ' on' : ''}${started ? ' fill' : ''}" style="--i:${i}"></i>`).join('')}
              </span>
            </span>
          </li>`).join('')}
      </ul>
    </div>`).join('');
  observeNew(host);
}

const ICON_PLAY = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
const ICON_ARROW = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_LOCK = '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="15.5" r="1.4" fill="currentColor"/></svg>';

const thumbCache = new Map(); // driveId -> true/false (vignette Drive disponible ?)

function renderProjects() {
  const host = $('#projectGrid');
  host.innerHTML = PROJECTS.map((p, i) => `
    <article class="project reveal ${started ? 'in' : ''}" style="--d:${i % 2}" data-open="${p.id}" tabindex="0" role="button" aria-label="${tr('projects.watch')} — ${tr(`project.${p.id}.t`)}">
      <div class="project-in" data-tilt>
        <div class="cover" data-thumb="${p.driveId}">
          <span class="num" aria-hidden="true">${p.n}</span>
          <span class="play" aria-hidden="true">${ICON_PLAY}</span>
        </div>
        <div class="project-body">
          <div class="tags"><span class="tag">${tr(`project.${p.id}.tag`)}</span><span class="tag tag--alt">${tr('projects.local')}</span></div>
          <h3>${tr(`project.${p.id}.t`)}</h3>
          <p>${tr(`project.${p.id}.d`)}</p>
          <span class="go">${tr('projects.watch')} ${ICON_ARROW}</span>
        </div>
      </div>
    </article>`).join('') + `
    <article class="project project--locked reveal ${started ? 'in' : ''}" style="--d:1">
      <div class="project-in">
        <span class="lock" aria-hidden="true">${ICON_LOCK}</span>
        <div>
          <div class="tags"><span class="tag tag--alt">${tr('projects.locked.badge')}</span></div>
          <h3>${tr('projects.locked.t')}</h3>
          <p>${tr('projects.locked.d')}</p>
        </div>
      </div>
    </article>`;

  // Vignettes Google Drive (si disponibles) — sinon on garde le visuel stylisé
  $$('.cover[data-thumb]', host).forEach((c) => {
    const id = c.dataset.thumb;
    const url = `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    const apply = () => { c.style.backgroundImage = `url("${url}")`; c.classList.add('has-thumb'); };
    if (thumbCache.get(id) === true) return apply();
    if (thumbCache.has(id)) return;
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.onload = () => { thumbCache.set(id, true); $$(`.cover[data-thumb="${id}"]`).forEach((el) => { el.style.backgroundImage = `url("${url}")`; el.classList.add('has-thumb'); }); };
    img.onerror = () => thumbCache.set(id, false);
    thumbCache.set(id, null);
    img.src = url;
  });

  bindTilt(host);
  observeNew(host);
}

/* =========================================================
   Machine à écrire
   ========================================================= */
let twTimer = 0;
function startTypewriter() {
  clearTimeout(twTimer);
  const el = $('#role');
  const roles = tr('hero.roles');
  if (reduced) { el.textContent = roles[0]; return; }
  let i = 0, j = 0, del = false;
  (function tick() {
    const w = roles[i];
    el.textContent = w.slice(0, j);
    if (!del && j === w.length) { del = true; twTimer = setTimeout(tick, 1900); return; }
    if (del && j === 0) { del = false; i = (i + 1) % roles.length; }
    j += del ? -1 : 1;
    twTimer = setTimeout(tick, del ? 26 : 58);
  })();
}

/* =========================================================
   Titre : découpage en lettres
   ========================================================= */
let charIndex = 0;
$$('[data-split]').forEach((line) => {
  const txt = line.textContent;
  line.textContent = '';
  [...txt].forEach((ch) => {
    const s = document.createElement('span');
    s.className = 'ch';
    s.style.setProperty('--i', charIndex++);
    s.textContent = ch;
    line.appendChild(s);
  });
});

/* Ajuste la taille du nom pour qu'il remplisse la colonne, quelle que soit la police chargée */
function fitName() {
  const h = $('.name');
  if (!h) return;
  const box = h.parentElement;
  h.style.fontSize = '';
  const base = parseFloat(getComputedStyle(h).fontSize);
  let w = 0;
  $$('.line', h).forEach((l) => { w = Math.max(w, [...l.children].reduce((a, c) => a + c.offsetWidth, 0)); });
  if (!w) return;
  const target = box.clientWidth * 0.97;
  const cap = window.innerWidth <= 860 ? 112 : 150;
  h.style.fontSize = `${Math.max(34, Math.min(base * target / w, cap)).toFixed(1)}px`;
}
window.addEventListener('resize', fitName, { passive: true });
(document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(fitName);
fitName();

/* =========================================================
   Révélation au scroll + compteurs + barres de niveau
   ========================================================= */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target;
    el.classList.add('in');
    $$('.pip.on', el).forEach((p) => p.classList.add('fill'));
    $$('[data-count]', el).forEach(countUp);
    if (el.matches('[data-count]')) countUp(el);
    io.unobserve(el);
  });
}, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });

function observeNew(scope) {
  if (!started) return; // on n'observe qu'une fois le jeu lancé
  $$('.reveal:not(.in)', scope).forEach((el) => io.observe(el));
  $$('.reveal.in', scope).forEach((el) => { $$('.pip.on', el).forEach((p) => p.classList.add('fill')); });
}

function countUp(el) {
  if (el.dataset.done) return;
  el.dataset.done = '1';
  const target = Number(el.dataset.count);
  if (reduced) { el.textContent = target; return; }
  const dur = 1500;
  const t0 = performance.now();
  (function step(now) {
    const k = Math.min((now - t0) / dur, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}

/* =========================================================
   Inclinaison 3D (cartes)
   ========================================================= */
function bindTilt(scope = document) {
  if (!finePointer || reduced) return;
  $$('[data-tilt]', scope).forEach((el) => {
    if (el.dataset.tiltBound) return;
    el.dataset.tiltBound = '1';
    const glare = $('.glare', el);
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.setProperty('--ry', `${(x - 0.5) * 12}deg`);
      el.style.setProperty('--rx', `${(0.5 - y) * 10}deg`);
      if (glare) { glare.style.setProperty('--mx', `${x * 100}%`); glare.style.setProperty('--my', `${y * 100}%`); glare.style.setProperty('--go', '1'); }
    });
    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--rx', '0deg');
      if (glare) glare.style.setProperty('--go', '0');
    });
  });
}

/* =========================================================
   Curseur personnalisé
   ========================================================= */
if (finePointer && !reduced) {
  const cur = $('.cursor');
  let cx = 0, cy = 0, tx = 0, ty = 0;
  window.addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; cur.classList.add('on'); }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => cur.classList.remove('on'));
  document.addEventListener('pointerover', (e) => { cur.classList.toggle('hover', !!e.target.closest('a, button, [data-open], input')); });
  (function loop() {
    cx += (tx - cx) * 0.2;
    cy += (ty - cy) * 0.2;
    cur.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(loop);
  })();
}

/* =========================================================
   Scroll : niveaux, barre XP, scène 3D
   ========================================================= */
const sections = $$('main > section.level');
const navLinks = $$('#levels a');
let anchors = [], maxScroll = 1;
let currentIndex = 0;
let scene = null;
let toastTimer = 0;

function measure() {
  maxScroll = Math.max(1, root.scrollHeight - window.innerHeight);
  anchors = sections.map((s) => Math.min(s.offsetTop, maxScroll));
}

function sectionFloat(y) {
  if (y <= anchors[0]) return 0;
  for (let i = 0; i < anchors.length - 1; i++) {
    if (y < anchors[i + 1]) return i + (y - anchors[i]) / Math.max(1, anchors[i + 1] - anchors[i]);
  }
  return anchors.length - 1;
}

function updateHud(idx, silent) {
  navLinks.forEach((a, i) => { a.classList.toggle('active', i === idx); if (i === idx) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  $('#lvl').textContent = `${tr('xp.level')} ${String(idx + 1).padStart(2, '0')}`;
  if (!silent && started) showToast(idx);
}

function showToast(idx) {
  if (idx === 0) return;
  const t = $('#toast');
  $('#toastName').textContent = tr(sections[idx].dataset.i18nName);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const y = window.scrollY;
    const p = Math.min(1, Math.max(0, y / maxScroll));
    root.style.setProperty('--p', p.toFixed(4));
    $('.xp').style.setProperty('--p', p.toFixed(4));
    $('#xpPct').textContent = `${Math.round(p * 100)}%`;
    const sf = sectionFloat(y);
    if (scene) scene.setSection(sf);
    const idx = Math.round(sf);
    if (idx !== currentIndex) { currentIndex = idx; updateHud(idx); }
  });
}
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', () => { measure(); onScroll(); }, { passive: true });
if ('ResizeObserver' in window) new ResizeObserver(() => { measure(); onScroll(); }).observe(document.body);

// Navigation douce
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const target = a.getAttribute('href');
  if (target.length < 2) return;
  const el = $(target);
  if (!el) return;
  e.preventDefault();
  const top = target === '#start' ? 0 : Math.min(el.offsetTop, maxScroll);
  window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
});

/* =========================================================
   Modale vidéo (Google Drive)
   ========================================================= */
const modal = $('#modal');
const frame = $('#modalFrame');
let modalProject = null;
let lastFocus = null;

function setModalTexts(id) {
  $('#modalTitle').textContent = tr(`project.${id}.t`);
  $('#modalTag').textContent = tr(`project.${id}.tag`);
  frame.title = tr(`project.${id}.t`);
}

function openModal(id) {
  const p = PROJECTS.find((x) => x.id === id);
  if (!p) return;
  modalProject = id;
  lastFocus = document.activeElement;
  setModalTexts(id);
  frame.src = `https://drive.google.com/file/d/${p.driveId}/preview`;
  $('#modalDrive').href = `https://drive.google.com/file/d/${p.driveId}/view`;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  root.classList.add('modal-open');
  setTimeout(() => $('.modal-close', modal).focus(), 50);
}

function closeModal() {
  if (!modalProject) return;
  modalProject = null;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  root.classList.remove('modal-open');
  setTimeout(() => { if (!modalProject) frame.src = 'about:blank'; }, 400); // coupe la lecture
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

document.addEventListener('click', (e) => {
  const open = e.target.closest('[data-open]');
  if (open) { openModal(open.dataset.open); return; }
  if (e.target.closest('[data-close]')) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-open]')) { e.preventDefault(); openModal(e.target.dataset.open); }
  // Piège à focus dans la modale
  if (e.key === 'Tab' && modalProject) {
    const f = $$('button, a[href], iframe', modal).filter((el) => !el.disabled);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

/* =========================================================
   Formulaire de contact
   ========================================================= */
const form = $('#contactForm');
const statusEl = $('#formStatus');
const submitBtn = $('#submitBtn');
const pageLoadedAt = Date.now();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function setStatus(msg) { statusEl.textContent = msg || ''; }

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus('');
  const fd = new FormData(form);
  const name = String(fd.get('name') || '').trim();
  const email = String(fd.get('email') || '').trim();
  const nameInput = form.elements.name;
  const emailInput = form.elements.email;
  nameInput.classList.toggle('bad', name.length < 2);
  emailInput.classList.toggle('bad', !EMAIL_RE.test(email));
  if (name.length < 2 || !EMAIL_RE.test(email)) {
    setStatus(tr('contact.err.invalid'));
    (name.length < 2 ? nameInput : emailInput).focus();
    return;
  }

  const label = $('span', submitBtn);
  const original = label.textContent;
  submitBtn.disabled = true;
  label.textContent = tr('contact.sending');

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, lang, company: fd.get('company') || '', elapsed: Date.now() - pageLoadedAt }),
    });
    let data = {};
    try { data = await res.json(); } catch (err) { /* réponse non JSON */ }
    if (res.ok && data.ok) {
      form.hidden = true;
      $('#formDone').hidden = false;
      return;
    }
    if (data.hint) console.warn('[contact] cause (visible en local uniquement) :', data.hint);
    if (res.status === 400) setStatus(tr('contact.err.invalid'));
    else if (res.status === 429) setStatus(tr('contact.err.rate'));
    else setStatus(tr('contact.err.generic'));
  } catch (err) {
    setStatus(tr('contact.err.generic'));
  } finally {
    submitBtn.disabled = false;
    label.textContent = original === tr('contact.sending') ? tr('contact.submit') : original;
  }
});
form.addEventListener('input', (e) => e.target.classList && e.target.classList.remove('bad'));

/* =========================================================
   Écran de démarrage + 3D
   ========================================================= */
const loader = $('#loader');
const loaderBar = $('#loaderBar');
const loaderStatus = $('#loaderStatus');
const startBtn = $('#startBtn');
let prog = 0;
let progTarget = 6;
const setProg = (v) => { progTarget = Math.max(progTarget, v); };
(function progLoop() {
  prog += (progTarget - prog) * 0.07;
  loaderBar.style.transform = `scaleX(${(prog / 100).toFixed(4)})`;
  loaderBar.parentElement.setAttribute('aria-valuenow', String(Math.round(prog)));
  if (!started) requestAnimationFrame(progLoop);
})();

// Contacts (modifiables dans data.js)
$('#mailLink').href = `mailto:${SITE.email}`;
$('#mailLink strong').textContent = SITE.email;
$('#waLink').href = `https://wa.me/${SITE.whatsapp}`;
$('#waLink strong').textContent = SITE.whatsappDisplay;

renderMarquee();
applyLang();
measure();

const fontsReady = (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => setProg(35));

const sceneReady = (async () => {
  try {
    const mod = await import('./scene.js');
    scene = mod.initScene($('#bg'), { reducedMotion: reduced, isMobile });
    root.classList.add('webgl');
  } catch (err) {
    console.warn('Scène 3D indisponible, affichage de secours :', err);
    root.classList.add('no-webgl');
  }
  setProg(75);
})();

const pageLoaded = new Promise((res) => {
  if (document.readyState === 'complete') res();
  else window.addEventListener('load', res, { once: true });
}).then(() => setProg(90));

const timeout = new Promise((res) => setTimeout(res, 9000));

Promise.race([Promise.all([fontsReady, sceneReady, pageLoaded]), timeout]).then(() => {
  setProg(100);
  setTimeout(() => {
    loaderStatus.textContent = tr('loader.ready');
    startBtn.hidden = false;
    startBtn.focus({ preventScroll: true });
  }, 650);
});

function startGame() {
  if (started) return;
  started = true;
  loader.classList.add('done');
  loader.setAttribute('inert', '');
  root.classList.remove('locked');
  root.classList.add('started');
  document.body.classList.add('started');
  window.scrollTo(0, 0);
  measure();
  if (scene) scene.start();
  // On commence à observer les éléments à révéler
  $$('.reveal:not(.in)').forEach((el) => io.observe(el));
  $$('.reveal.in').forEach((el) => { $$('.pip.on', el).forEach((p) => p.classList.add('fill')); });
  onScroll();
}
startBtn.addEventListener('click', startGame);
window.addEventListener('keydown', (e) => { if (!started && !startBtn.hidden && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); startGame(); } });

bindTilt();
