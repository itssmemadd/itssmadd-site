'use strict';

/* ════════════════════════════════════════════════
   DATA
   La liste PHOTOS est définie dans photos.js (généré par
   build-photos.sh, chargé AVANT ce fichier). Les photos
   y sont triées de la plus récente à la plus ancienne.
════════════════════════════════════════════════ */
const ALT = {
  portraits:  'Portrait — Mohamed Lemsayl, portrait photographer in Agadir',
  editorials: 'Fashion editorial — Mohamed Lemsayl, photographer in Agadir',
  events:     'Event reportage — Mohamed Lemsayl, photographer in Agadir',
  swimwear:   'Swimwear — Mohamed Lemsayl, photographer in Agadir',
};
const toImg = p => ({
  src:  `images/web/${p.g}/${p.file}`,
  th:   `images/thumbs/${p.g}/${p.file}`,
  file: p.file,
  alt:  ALT[p.g],
  w:    p.w,
  h:    p.h,
});

const COLS = {
  portraits:  { title:'Mohamed Lemsayl, Portrait',    imgs: PHOTOS.filter(p => p.g === 'portraits').map(toImg)  },
  editorials: { title:'Mohamed Lemsayl, Editorial',   imgs: PHOTOS.filter(p => p.g === 'editorials').map(toImg) },
  events:     { title:'Mohamed Lemsayl, Events',  imgs: PHOTOS.filter(p => p.g === 'events').map(toImg) },
  swimwear:   { title:'Mohamed Lemsayl, Swimwear', imgs: PHOTOS.filter(p => p.g === 'swimwear').map(toImg) },
};

// Couvertures des tuiles = première photo de chaque galerie (auto)
function setTileCovers() {
  ['portraits', 'editorials', 'events', 'swimwear'].forEach((key) => {
    const img = document.querySelector(`.tile[data-open="${key}"] img`);
    if (img && COLS[key].imgs[0]) { img.src = COLS[key].imgs[0].th; img.alt = ALT[key]; }
  });
}
setTileCovers();

/* ════════════════════════════════════════════════
   CROSSFADE — transition fluide réutilisable
   Une image entrante (préchargée) apparaît PAR-DESSUS
   l'ancienne qui reste opaque → fondu enchaîné sans
   trou ni surimpression de fond. Garde de génération
   par conteneur pour gérer les clics rapides.
════════════════════════════════════════════════ */
function preload(src) { if (src) { const i = new Image(); i.src = src; } }

function crossfade(container, src, alt, onClick, instant) {
  const gen = (container._gen = (container._gen || 0) + 1);

  const img = document.createElement('img');
  img.className = 'xf-img';
  img.alt = alt || '';
  if (onClick) { img.style.cursor = 'pointer'; img.addEventListener('click', onClick); }

  if (instant) {
    container.innerHTML = '';
    img.style.opacity = '1';
    img.src = src;
    container.appendChild(img);
    return;
  }

  img.style.opacity = '0';

  const pre = new Image();
  pre.onload = () => {
    if (gen !== container._gen) return;            // une navigation plus récente a pris le relais
    img.src = src;
    container.appendChild(img);
    // double rAF : on attend la peinture du src avant de déclencher le fondu
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (gen !== container._gen) { img.remove(); return; }
      img.style.opacity = '1';
      // une fois le fondu terminé, on retire les calques précédents
      setTimeout(() => {
        if (gen !== container._gen) return;
        container.querySelectorAll('.xf-img').forEach(el => { if (el !== img) el.remove(); });
      }, 600);
    }));
  };
  pre.onerror = () => { if (gen === container._gen) img.remove(); };
  pre.src = src;
}


/* ════════════════════════════════════════════════
   PROFILE TOGGLE — scroll to/from profile
════════════════════════════════════════════════ */
const btn     = document.getElementById('profileToggle');
const profile = document.getElementById('profile');
const hub     = document.getElementById('hub');

btn.addEventListener('click', () => {
  const profileTop = profile.getBoundingClientRect().top;
  // Si le profil est déjà visible (proche du haut) → remonter
  if (profileTop < window.innerHeight * 0.6) {
    hub.scrollIntoView({ behavior: 'smooth' });
  } else {
    profile.scrollIntoView({ behavior: 'smooth' });
  }
});

// Mise à jour du label selon la position de scroll
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    btn.textContent = e.isIntersecting ? 'HIDE PROFILE' : 'SEE PROFILE';
  });
}, { threshold: 0.25 });

io.observe(profile);

// Clic sur le nom → retour en haut
window.scrollToTop = () => hub.scrollIntoView({ behavior: 'smooth' });


/* ════════════════════════════════════════════════
   SNAP — un seul geste de scroll enchaîne hub ⇄ profil
════════════════════════════════════════════════ */
(function () {
  const pContent = document.querySelector('.p-content');
  let animating = false;

  // 0 = hub visible, 1 = profil visible
  const atProfile = () => profile.getBoundingClientRect().top < window.innerHeight * 0.5;

  function goTo(target) {            // target : hub | profile
    animating = true;
    target.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => { animating = false; }, 850);
  }

  // Le contenu du profil peut défiler en interne (bio/news) : on ne snappe
  // que lorsqu'il est tout en haut (remonter) ou inexistant.
  const contentAtTop = () => !pContent || pContent.scrollTop <= 2;

  function handle(down, e) {
    if (document.body.classList.contains('locked')) return;   // overlay ouvert
    if (animating) { e.preventDefault(); return; }

    if (down && !atProfile()) {            // hub → profil
      e.preventDefault(); goTo(profile);
    } else if (!down && atProfile() && contentAtTop()) {   // profil → hub
      e.preventDefault(); goTo(hub);
    }
    // autres cas : on laisse le scroll natif (lecture du contenu profil)
  }

  // Molette / trackpad UNIQUEMENT (PC). Sur mobile : scroll naturel, pas de snap.
  // On exige un pointeur fin (souris/trackpad) → exclut les écrans tactiles.
  const isDesktop = window.matchMedia('(pointer: fine)').matches && window.innerWidth > 900;

  if (isDesktop) {
    window.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) < 4) return;
      handle(e.deltaY > 0, e);
    }, { passive: false });
  }
})();


/* ════════════════════════════════════════════════
   OVERLAYS — ouverture / fermeture
════════════════════════════════════════════════ */
function openOverlay(id) {
  document.getElementById(id).classList.add('open');
  document.body.classList.add('locked');
}

function closeOverlay(id) {
  document.getElementById(id).classList.remove('open');
  document.body.classList.remove('locked');
}

// Tiles
document.querySelectorAll('.tile[data-open]').forEach(tile => {
  tile.addEventListener('click', () => {
    const key = tile.dataset.open;
    if (key === 'commissions') {
      openOverlay('ov-commissions');
    } else {
      // Chaque galerie a sa page dédiée : /portrait, /editorial, /events, /swimwear
      const SLUG = { portraits:'portrait', editorials:'editorial', events:'events', swimwear:'swimwear' };
      location.href = '/' + (SLUG[key] || key) + '/';
    }
  });
});

// Lien CONTACT dans le profil
document.querySelectorAll('[data-open="commissions"]').forEach(el => {
  el.addEventListener('click', () => openOverlay('ov-commissions'));
});

// BACK buttons
document.getElementById('galleryBack').addEventListener('click',  () => closeOverlay('ov-gallery'));
document.getElementById('commBack').addEventListener('click',     () => closeOverlay('ov-commissions'));

// Deep link : itssmadd.com/portfolio/#booking → ouvre le formulaire direct
if (location.hash === '#booking') openOverlay('ov-commissions');

// Touche Échap — ferme la lightbox d'abord, puis l'overlay en dessous
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (document.getElementById('lb').classList.contains('open')) { closeLb(); return; }
  ['ov-gallery','ov-commissions'].forEach(id => {
    const el = document.getElementById(id);
    if (el.classList.contains('open')) closeOverlay(id);
  });
});


/* ════════════════════════════════════════════════
   GALERIE — GRID / CAROUSEL
════════════════════════════════════════════════ */
let col  = null;     // collection active
let carI = 0;
let mode = 'grid';

const isLandscape = (img) => img.w > img.h;

const panels = {
  grid:     document.getElementById('pane-grid'),
  carousel: document.getElementById('pane-car'),
};

function initGallery(key) {
  col  = key;
  carI = 0;

  const data = COLS[key];
  document.getElementById('galleryTitle').innerHTML = `<em>${data.title}</em>`;

  buildGrid(data.imgs);
  renderCar(true);
  setMode('grid');
}

/* ── Mode switcher ── */
function setMode(m) {
  mode = m;
  Object.entries(panels).forEach(([k, el]) => el.classList.toggle('dn', k !== m));
  document.querySelectorAll('.modeBtn').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
}

document.querySelectorAll('.modeBtn').forEach(b => {
  b.addEventListener('click', () => setMode(b.dataset.mode));
});


// Clavier carousel
document.addEventListener('keydown', e => {
  if (!document.getElementById('ov-gallery').classList.contains('open')) return;
  if (lb.classList.contains('open')) return; // lightbox a la priorité
  if (mode === 'carousel') {
    if (e.key === 'ArrowRight') document.getElementById('carNext').click();
    if (e.key === 'ArrowLeft')  document.getElementById('carPrev').click();
  }
});


/* ── GRID ── */
function buildGrid(imgs) {
  const grid = document.getElementById('galGrid');
  grid.innerHTML = '';
  imgs.forEach((img, i) => {
    const cell = document.createElement('div');
    cell.className = 'g-cell' + (isLandscape(img) ? ' g-cell--wide' : '');

    const im = document.createElement('img');
    im.src = img.th;
    im.alt = img.alt;
    im.loading = 'lazy';
    im.decoding = 'async';

    cell.appendChild(im);
    cell.addEventListener('click', () => openLb(i));
    grid.appendChild(cell);
  });
}


/* ── CAROUSEL ── */
const carCtrEl     = document.getElementById('carCtr');
const carPrev      = document.getElementById('carPrev');
const carNext      = document.getElementById('carNext');
const carContainer = document.getElementById('carImgs');

function renderCar(instant) {
  const imgs = COLS[col].imgs;
  const item = imgs[carI];

  carPrev.disabled = carI === 0;
  carNext.disabled = carI === imgs.length - 1;
  carCtrEl.textContent = `${carI + 1}/${imgs.length}`;

  crossfade(carContainer, item.src, item.alt, () => openLb(carI), instant);

  preload(imgs[carI + 1]?.src);
  preload(imgs[carI - 1]?.src);
}

carPrev.addEventListener('click', () => { if (carI > 0)                         { carI--; renderCar(); } });
carNext.addEventListener('click', () => { if (carI < COLS[col].imgs.length - 1) { carI++; renderCar(); } });

// Swipe carousel
let cTx = null;
document.getElementById('pane-car').addEventListener('touchstart', e => { cTx = e.touches[0].clientX; }, { passive: true });
document.getElementById('pane-car').addEventListener('touchend',   e => {
  if (cTx === null) return;
  const dx = e.changedTouches[0].clientX - cTx;
  if (Math.abs(dx) > 50) dx < 0 ? carNext.click() : carPrev.click();
  cTx = null;
});


/* ════════════════════════════════════════════════
   LIGHTBOX (depuis grid)
════════════════════════════════════════════════ */
const lb      = document.getElementById('lb');
const lbStage = document.getElementById('lbStage');
const lbCtrE  = document.getElementById('lbCtr');
let lbI = 0;

function openLb(i) {
  lbI = i;
  renderLb(true);
  lb.classList.add('open');
  document.body.classList.add('locked');
}

function closeLb() {
  lb.classList.remove('open');
  // ne libère le scroll que si aucun overlay n'est encore ouvert dessous
  if (!document.querySelector('.overlay.open')) document.body.classList.remove('locked');
}

function renderLb(instant) {
  const imgs = COLS[col].imgs;
  const item = imgs[lbI];
  crossfade(lbStage, item.src, item.alt, null, instant);
  lbCtrE.textContent = `${lbI + 1} / ${imgs.length}`;
  document.getElementById('lbPrev').disabled = lbI === 0;
  document.getElementById('lbNext').disabled = lbI === imgs.length - 1;
  preload(imgs[lbI + 1]?.src);
  preload(imgs[lbI - 1]?.src);
}

document.getElementById('lbClose').addEventListener('click', closeLb);
lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
document.getElementById('lbPrev').addEventListener('click', () => { if (lbI > 0) { lbI--; renderLb(); } });
document.getElementById('lbNext').addEventListener('click', () => { const l = COLS[col].imgs.length; if (lbI < l-1) { lbI++; renderLb(); } });

// Clavier lightbox — flèches pour naviguer
document.addEventListener('keydown', e => {
  if (!lb.classList.contains('open')) return;
  if (e.key === 'ArrowRight') document.getElementById('lbNext').click();
  if (e.key === 'ArrowLeft')  document.getElementById('lbPrev').click();
});

// Swipe lightbox
let lTx = null;
lb.addEventListener('touchstart', e => { lTx = e.touches[0].clientX; }, { passive: true });
lb.addEventListener('touchend',   e => {
  if (lTx === null) return;
  const dx = e.changedTouches[0].clientX - lTx;
  if (Math.abs(dx) > 45) dx < 0 ? document.getElementById('lbNext').click() : document.getElementById('lbPrev').click();
  lTx = null;
});


/* ════════════════════════════════════════════════
   NEWS — les 6 photos les plus récentes (auto)
════════════════════════════════════════════════ */
function buildNews() {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  // 6 plus récentes (PHOTOS est trié récent → ancien)
  const recent = PHOTOS.slice(0, 6);

  recent.forEach(p => {
    const idx = COLS[p.g].imgs.findIndex(im => im.file === p.file);
    const label = { portraits:'PORTRAIT', editorials:'ÉDITORIAL', events:'EVENTS', swimwear:'SWIMWEAR' }[p.g] || '';

    const a = document.createElement('a');
    a.className = 'news-item';
    a.href = 'javascript:void(0)';
    a.innerHTML =
      `<div class="news-img"><img src="images/thumbs/${p.g}/${p.file}" alt="${ALT[p.g]}" loading="lazy" decoding="async" /></div>` +
      `<span class="news-cap">MOHAMED LEMSAYL · ${label}</span>`;
    a.addEventListener('click', () => { col = p.g; openLb(idx); });
    grid.appendChild(a);
  });
}

buildNews();


/* ════════════════════════════════════════════════
   PROFIL — colonne droite défilante, hauteur = image gauche
════════════════════════════════════════════════ */
(function () {
  const photo   = document.querySelector('.p-photo');
  const content = document.querySelector('.p-content');
  if (!photo || !content) return;

  function sync() {
    // Sur mobile (1 colonne) : pas de contrainte de hauteur
    if (window.innerWidth <= 900) {
      content.style.height = '';
      content.style.overflowY = 'visible';
      return;
    }
    content.style.height = photo.offsetHeight + 'px';
    content.style.overflowY = 'auto';
  }

  window.addEventListener('resize', sync);

  // Synchronise une fois l'image chargée
  const img = photo.querySelector('img');
  if (img && !img.complete) {
    img.addEventListener('load', sync);
  }
  window.addEventListener('load', sync);
  sync();
})();


/* ════════════════════════════════════════════════
   BOOKING FORM — EmailJS
   Les champs du formulaire sont mappés vers les
   variables du template : from_name, from_email,
   project_type, message (détails booking inclus).
════════════════════════════════════════════════ */
const EMAILJS_PUBLIC_KEY  = 'WD6-BJ9casF3Qr9RX';   // Account → API Keys
const EMAILJS_SERVICE_ID  = 'service_907lcln';    // Email Services
const EMAILJS_TEMPLATE_ID = 'template_x1v2e9n';   // Email Templates

const emailReady = typeof emailjs !== 'undefined';
if (emailReady) emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

document.getElementById('commForm').addEventListener('submit', e => {
  e.preventDefault();
  const form = e.target;
  const sub  = form.querySelector('.comm-submit');
  const ok   = document.getElementById('commOk');

  const showMsg = (txt) => {
    ok.textContent = txt;
    ok.classList.add('show');
    setTimeout(() => ok.classList.remove('show'), 6000);
  };

  if (!emailReady) { showMsg('Email me directly: itssmadd4@gmail.com'); return; }

  const v = id => (form.querySelector('#' + id).value || '').trim();
  const fullName = (v('fn1') + ' ' + v('fn2')).trim();
  const wa = (form.querySelector('#wa-c').value + ' ' + v('wa-n')).trim();
  const msg = form.querySelector('#fm');
  const origMsg = msg.value;

  // Map vers les variables du template EmailJS
  form.querySelector('#hf-name').value  = fullName;
  form.querySelector('#hf-time').value  = new Date().toLocaleString('en-GB');
  msg.value =
    '\u2014 Booking via itssmadd.com \u2014\n' +
    'Name: ' + fullName + '\n' +
    'Email: ' + v('fe') + '\n' +
    'WhatsApp: ' + wa + '\n' +
    'Type: ' + (form.querySelector('#ft').value || '\u2014') + '\n' +
    'Date: ' + (v('fd') || '\u2014') + '\n' +
    'City / Venue: ' + (v('fc') || '\u2014') + '\n\n' +
    origMsg;

  sub.textContent = 'Sending\u2026';
  sub.disabled = true;

  emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, form)
    .then(() => { form.reset(); showMsg('Received \u2014 reply within 24h.'); })
    .catch(() => { msg.value = origMsg; showMsg('Error \u2014 email me directly : itssmadd4@gmail.com'); })
    .finally(() => { sub.textContent = 'Send'; sub.disabled = false; });
});
