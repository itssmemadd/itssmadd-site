'use strict';
/* Standalone gallery page — reads body[data-gallery], renders grid + lightbox.
   PHOTOS comes from /portfolio/photos.js (loaded before this file). */

const GALLERIES = {
  swimwear:  { g: 'swimwear',  altBase: 'Swimwear photography' },
  portrait:  { g: 'portraits', altBase: 'Portrait photography Agadir Marrakech' },
  editorial: { g: 'editorials', altBase: 'Fashion editorial photography Morocco' },
  events:    { g: 'events',    altBase: 'Event photography Morocco' },
};

(function () {
  const slug = document.body.dataset.gallery;
  const cfg = GALLERIES[slug];
  if (!cfg || typeof PHOTOS === 'undefined') return;

  const imgs = PHOTOS.filter(p => p.g === cfg.g).map((p, i) => ({
    src:  `/portfolio/images/web/${p.g}/${p.file}`,
    th:   `/portfolio/images/thumbs/${p.g}/${p.file}`,
    alt:  p.file.startsWith('moga-')
      ? `MOGA Festival Essaouira 2026 photo ${i + 1} — itssmadd, photographer in Morocco`
      : `${cfg.altBase} ${i + 1} — Mohamed Lemsayl (itssmadd), photographer in Agadir & Marrakech`,
    w: p.w, h: p.h,
  }));

  // Count badge
  const countEl = document.getElementById('galCount');
  if (countEl) countEl.textContent = `${imgs.length} PHOTOS`;

  // Grid
  const grid = document.getElementById('galGrid');
  const isLandscape = im => im.w > im.h;
  imgs.forEach((img, i) => {
    const cell = document.createElement('div');
    cell.className = 'g-cell' + (isLandscape(img) ? ' g-cell--wide' : '');
    const im = document.createElement('img');
    im.src = img.th; im.alt = img.alt;
    im.loading = 'lazy'; im.decoding = 'async';
    cell.appendChild(im);
    cell.addEventListener('click', () => openLb(i));
    grid.appendChild(cell);
  });

  // Lightbox
  const lb = document.getElementById('lb');
  const stage = document.getElementById('lbStage');
  const ctr = document.getElementById('lbCtr');
  const prev = document.getElementById('lbPrev');
  const next = document.getElementById('lbNext');
  let idx = 0;

  function render() {
    const it = imgs[idx];
    stage.innerHTML = '';
    const im = document.createElement('img');
    im.src = it.src; im.alt = it.alt;
    stage.appendChild(im);
    ctr.textContent = `${idx + 1} / ${imgs.length}`;
    prev.disabled = idx === 0;
    next.disabled = idx === imgs.length - 1;
    // preload neighbours
    [imgs[idx + 1], imgs[idx - 1]].forEach(n => { if (n) { const p = new Image(); p.src = n.src; } });
  }
  function openLb(i) {
    idx = i; render();
    lb.classList.add('open');
    document.body.classList.add('locked');
  }
  function closeLb() {
    lb.classList.remove('open');
    document.body.classList.remove('locked');
  }
  document.getElementById('lbClose').addEventListener('click', closeLb);
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  prev.addEventListener('click', () => { if (idx > 0) { idx--; render(); } });
  next.addEventListener('click', () => { if (idx < imgs.length - 1) { idx++; render(); } });
  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowRight') next.click();
    if (e.key === 'ArrowLeft') prev.click();
  });
  let tx = null;
  lb.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 45) (dx < 0 ? next : prev).click();
    tx = null;
  });
})();
