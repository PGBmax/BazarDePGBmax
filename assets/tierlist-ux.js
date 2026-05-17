/* =============================================================
   tierlist-ux.js — Enhanced UX for RSL Tier List pages
   Load AFTER script.js on each tier list page
   ============================================================= */
(function () {
  'use strict';

  // ─── State ────────────────────────────────────────────────────
  let hoveredImg = null;   // last img hovered in unranked
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
    window.saveState = function () {
      pushUndo();
      orig.apply(this, arguments);
      showToast('✓ Sauvegardé');
      updateAll();
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
        addHoverTracking(img);
        content.appendChild(img);
      });
    });
    unranked.innerHTML = '';
    snap.unranked.forEach(src => {
      const img = document.createElement('img');
      img.src = src;
      window.addDragEvents(img);
      addHoverTracking(img);
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
      <span class="ux-unranked-count" id="ux-unranked-count">0</span>
      <input type="search" id="ux-search" class="ux-search" placeholder="Filtrer…" autocomplete="off">`;
    unranked.parentNode.insertBefore(header, unranked);

    const searchInput = header.querySelector('#ux-search');
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      [...unranked.querySelectorAll('img')].forEach(img => {
        const name = img.src.split('/').pop().replace(/\.\w+$/, '').toLowerCase();
        img.style.display = (!q || name.includes(q)) ? '' : 'none';
      });
    });
  }

  function updateUnrankedCount() {
    const unranked = document.getElementById('unranked-container');
    const badge    = document.getElementById('ux-unranked-count');
    if (!unranked || !badge) return;
    badge.textContent = unranked.querySelectorAll('img').length;
  }

  // ─── 7. Keyboard shortcuts (1-9 → tier 1-9) ──────────────────
  function setupKeyboardShortcuts() {
    // Inject shortcut hint strip above tier list
    const tierListEl = document.getElementById('tier-list');
    if (!tierListEl || document.getElementById('ux-kb-hint')) return;
    const hint = document.createElement('div');
    hint.id = 'ux-kb-hint';
    hint.className = 'ux-kb-hint';
    hint.textContent = '⌨ Survole une image + presse 1–9 pour la classer rapidement · Ctrl+Z pour annuler';
    tierListEl.parentNode.insertBefore(hint, tierListEl);

    document.addEventListener('keydown', e => {
      if (e.target.isContentEditable || e.target.tagName === 'INPUT') return;
      const num = parseInt(e.key, 10);
      if (!hoveredImg || isNaN(num) || num < 1) return;
      const tiers = [...document.querySelectorAll('#tier-list .tier')];
      const target = tiers[num - 1];
      if (!target) return;
      const content = target.querySelector('.tier-content');
      if (!content) return;
      content.appendChild(hoveredImg);
      hoveredImg.classList.add('ux-drop-flash');
      setTimeout(() => hoveredImg?.classList.remove('ux-drop-flash'), 400);
      if (typeof window.saveState === 'function') window.saveState();
      e.preventDefault();
    });
  }

  function addHoverTracking(img) {
    img.addEventListener('mouseenter', () => { hoveredImg = img; });
    img.addEventListener('mouseleave', () => { if (hoveredImg === img) hoveredImg = null; });
  }

  // ─── 8. Patch addTier (replace prompt with modal) ────────────
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
      // hide the site-header and top-bar from capture
      const siteHeader = document.querySelector('.site-header');
      const topBar     = document.querySelector('.top-bar');
      const uxKbHint   = document.getElementById('ux-kb-hint');
      const uxUnhdr    = document.getElementById('ux-unranked-header');
      [siteHeader, topBar, uxKbHint, uxUnhdr].forEach(el => { if (el) el.style.display = 'none'; });
      window.html2canvas(captureZone, { backgroundColor: '#090807', useCORS: true }).then(canvas => {
        [siteHeader, topBar, uxKbHint, uxUnhdr].forEach(el => { if (el) el.style.display = ''; });
        const link = document.createElement('a');
        link.download = `tierlist-${name}.png`;
        link.href = canvas.toDataURL();
        link.click();
      });
    };
  }

  // ─── 10. MutationObserver ──────────────────────────────────────
  function setupObserver() {
    const tierList = document.getElementById('tier-list');
    const unranked = document.getElementById('unranked-container');
    if (!tierList || !unranked) return;

    const obs = new MutationObserver(() => {
      updateAll();
      // Re-attach hover tracking on new images
      [...document.querySelectorAll('#unranked-container img')].forEach(img => {
        if (!img._uxHover) { img._uxHover = true; addHoverTracking(img); }
      });
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
      setupKeyboardShortcuts();
      setupObserver();
      // Attach hover tracking to already-loaded images
      [...document.querySelectorAll('#unranked-container img')].forEach(img => {
        img._uxHover = true;
        addHoverTracking(img);
      });
      updateAll();
    }, 200); // wait for script.js DOMContentLoaded to fire first
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
