/* =============================================================
   tierlist-ux.js — Enhanced UX for RSL Tier List pages
   Load AFTER script.js on each tier list page
   ============================================================= */
(function () {
  'use strict';

  // ─── State ────────────────────────────────────────────────────
  let undoStack  = [];     // array of serialised states

  // ─── 1. Toast ────────────────────────────────────────────────
  function showToast(msg, type = 'success') {
    const old = document.querySelector('.ux-toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'ux-toast ux-toast--' + type;
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('ux-toast--show'));
    setTimeout(() => {
      t.classList.remove('ux-toast--show');
      setTimeout(() => t.remove(), 300);
    }, 1800);
  }

  // ─── 2. Patch saveState → toast + undo push ──────────────────
  function patchSaveState() {
    const orig = window.saveState;
    if (typeof orig !== 'function') return;
    let _saving = false;
    window.saveState = function () {
      if (_saving) return;
      _saving = true;
      pushUndo();
      orig.apply(this, arguments);
      updateAll();
      _saving = false;
    };
  }

  // ─── 3. Undo ─────────────────────────────────────────────────
  function captureSnapshot() {
    const tierList = document.getElementById('tier-list');
    const unranked = document.getElementById('unranked-container');
    if (!tierList || !unranked) return null;
    const tiers = [...tierList.querySelectorAll('.tier')].map(tier => ({
      name:   tier.querySelector('.rank-label')?.textContent ?? '',
      color:  tier.querySelector('.rank-label')?.style.background ?? '',
      images: [...tier.querySelectorAll('.tier-content img')].map(i => i.src)
    }));
    const unrankedImgs = [...unranked.querySelectorAll('img')].map(i => i.src);
    return JSON.stringify({ tiers, unranked: unrankedImgs });
  }

  function pushUndo() {
    const snap = captureSnapshot();
    if (!snap) return;
    if (undoStack.length && undoStack[undoStack.length - 1] === snap) return;
    undoStack.push(snap);
    if (undoStack.length > 40) undoStack.shift();
  }

  function applyUndo() {
    if (undoStack.length < 2) { showToast('Rien à annuler', 'warn'); return; }
    undoStack.pop(); // discard current
    const snap = JSON.parse(undoStack[undoStack.length - 1]);
    const tierList = document.getElementById('tier-list');
    const unranked = document.getElementById('unranked-container');
    tierList.innerHTML = '';
    snap.tiers.forEach(t => {
      window.createTier(t.name, t.color);
      const content = tierList.lastChild.querySelector('.tier-content');
      t.images.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        window.addDragEvents(img);
        content.appendChild(img);
      });
    });
    unranked.innerHTML = '';
    snap.unranked.forEach(src => {
      const img = document.createElement('img');
      img.src = src;
      window.addDragEvents(img);
      unranked.appendChild(img);
    });
    showToast('↩ Annulé', 'warn');
    updateAll();
  }

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      applyUndo();
    }
  });

  // ─── 4. Tier count badges ─────────────────────────────────────
  function updateCounts() {
    const tierList = document.getElementById('tier-list');
    if (!tierList) return;
    [...tierList.querySelectorAll('.tier')].forEach(tier => {
      const count = tier.querySelectorAll('.tier-content img').length;
      let badge = tier.querySelector('.ux-count-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'ux-count-badge';
        const wrapper = tier.querySelector('.rank-label-wrapper');
        if (wrapper) wrapper.appendChild(badge);
      }
      badge.textContent = count;
      badge.style.opacity = count === 0 ? '0.3' : '1';
    });
  }

  // ─── 5. Progress tracker ─────────────────────────────────────
  function injectProgressTracker() {
    const topBar = document.querySelector('.top-bar');
    if (!topBar || document.getElementById('ux-progress')) return;
    const wrapper = document.createElement('div');
    wrapper.id = 'ux-progress';
    wrapper.className = 'ux-progress-wrapper';
    wrapper.innerHTML = `
      <span class="ux-progress-text">0 / 0 classés</span>
      <div class="ux-progress-bar-track">
        <div class="ux-progress-bar-fill" style="width:0%"></div>
      </div>`;
    topBar.appendChild(wrapper);
  }

  function updateProgress() {
    const tierList = document.getElementById('tier-list');
    const unranked = document.getElementById('unranked-container');
    if (!tierList || !unranked) return;
    const ranked   = tierList.querySelectorAll('.tier-content img').length;
    const total    = ranked + unranked.querySelectorAll('img').length;
    const pct      = total > 0 ? Math.round((ranked / total) * 100) : 0;
    const text = document.querySelector('.ux-progress-text');
    const fill = document.querySelector('.ux-progress-bar-fill');
    if (text) text.textContent = `${ranked} / ${total} classés`;
    if (fill) fill.style.width = pct + '%';
  }

  // ─── 6. Unranked section header ──────────────────────────────
  function injectUnrankedHeader() {
    const unranked = document.getElementById('unranked-container');
    if (!unranked || document.getElementById('ux-unranked-header')) return;
    const header = document.createElement('div');
    header.id = 'ux-unranked-header';
    header.className = 'ux-unranked-header';
    header.innerHTML = `
      <span class="ux-unranked-title">▌ Non classés</span>
      <span class="ux-unranked-count" id="ux-unranked-count">0</span>`;
    unranked.parentNode.insertBefore(header, unranked);
  }

  function updateUnrankedCount() {
    const unranked = document.getElementById('unranked-container');
    const badge    = document.getElementById('ux-unranked-count');
    if (!unranked || !badge) return;
    badge.textContent = unranked.querySelectorAll('img').length;
  }

  // ─── 7. Patch addTier (replace prompt with modal) ────────────
  function patchAddTier() {
    if (typeof window.createTier !== 'function') return;
    window.addTier = function () {
      showAddTierModal();
    };
  }

  function showAddTierModal() {
    const existing = document.querySelector('.ux-add-modal-overlay');
    if (existing) { existing.remove(); return; }
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay ux-add-modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content" style="gap:16px;min-width:300px;">
        <button class="ux-modal-close" title="Fermer">✖</button>
        <p style="font-family:'Space Mono',monospace;font-size:1rem;color:#e8790e;font-weight:700;margin:0;">Nouvelle catégorie</p>
        <input id="ux-tier-name-input" type="text" class="ux-search" placeholder="Nom (ex: S+, Meta…)" style="width:100%;font-size:1rem;padding:8px 12px;" maxlength="20" autofocus>
        <div style="display:flex;gap:10px;align-items:center;">
          <label style="color:#8a7a68;font-size:0.85rem;">Couleur :</label>
          <input id="ux-tier-color-input" type="color" value="#e8790e" style="width:40px;height:36px;border:none;background:none;cursor:pointer;">
        </div>
        <button id="ux-tier-add-btn" style="background:#e8790e;border:none;border-radius:2px;color:#fff;padding:10px 20px;font-weight:700;cursor:pointer;font-size:0.95rem;">Ajouter</button>
      </div>`;
    document.body.appendChild(overlay);
    const nameInput  = overlay.querySelector('#ux-tier-name-input');
    const colorInput = overlay.querySelector('#ux-tier-color-input');
    const addBtn     = overlay.querySelector('#ux-tier-add-btn');
    const closeBtn   = overlay.querySelector('.ux-modal-close');
    nameInput.focus();
    const doAdd = () => {
      const name = nameInput.value.trim();
      if (name) { window.createTier(name, colorInput.value); updateAll(); }
      overlay.remove();
    };
    addBtn.addEventListener('click', doAdd);
    nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); if (e.key === 'Escape') overlay.remove(); });
    closeBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  }

  // ─── 9. Export filename patch ─────────────────────────────────
  function patchExport() {
    const origExport = window.exportImage;
    if (typeof origExport !== 'function') return;
    window.exportImage = function () {
      const h1 = document.querySelector('h1');
      const name = (h1?.textContent?.trim() || 'tierlist').replace(/\s+/g, '-').toLowerCase();
      const captureZone = document.getElementById('capture-zone');
      // hide the site-header, top-bar and unranked section from capture
      const siteHeader    = document.querySelector('.site-header');
      const topBar        = document.querySelector('.top-bar');
      const uxUnhdr       = document.getElementById('ux-unranked-header');
      const unrankedBox   = document.getElementById('unranked-container');
      const h2Below       = document.querySelector('#tier-list ~ h2');
      [siteHeader, topBar, uxUnhdr, unrankedBox, h2Below].forEach(el => { if (el) el.style.display = 'none'; });
      // Add bottom breathing room so the last tier isn't cut tight
      const prevPadding = captureZone.style.paddingBottom;
      captureZone.style.paddingBottom = '24px';
      window.html2canvas(captureZone, { backgroundColor: '#090807', useCORS: true }).then(canvas => {
        captureZone.style.paddingBottom = prevPadding;
        [siteHeader, topBar, uxUnhdr, unrankedBox, h2Below].forEach(el => { if (el) el.style.display = ''; });
        const link = document.createElement('a');
        link.download = `tierlist-${name}.png`;
        link.href = canvas.toDataURL();
        link.click();
      });
    };
  }

  // ─── 10. MutationObserver ──────────────────────────────────────
  let _obsUpdating = false;

  function setupObserver() {
    const tierList = document.getElementById('tier-list');
    const unranked = document.getElementById('unranked-container');
    if (!tierList || !unranked) return;

    const obs = new MutationObserver((mutations) => {
      if (_obsUpdating) return;
      // Only react when actual IMG nodes are added/removed (not our own badge spans)
      const hasImgChange = mutations.some(m =>
        [...m.addedNodes, ...m.removedNodes].some(n => n.nodeName === 'IMG')
      );
      if (!hasImgChange) return;
      _obsUpdating = true;
      updateAll();
      _obsUpdating = false;
    });
    obs.observe(tierList,  { childList: true, subtree: true });
    obs.observe(unranked,  { childList: true, subtree: true });
  }

  function updateAll() {
    updateCounts();
    updateProgress();
    updateUnrankedCount();
  }

  // ─── Init ─────────────────────────────────────────────────────
  function init() {
    // Capture initial snapshot for undo
    setTimeout(() => {
      pushUndo();
      patchSaveState();
      patchAddTier();
      patchExport();
      injectProgressTracker();
      injectUnrankedHeader();
      setupObserver();
      updateAll();
    }, 200); // wait for script.js DOMContentLoaded to fire first
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
