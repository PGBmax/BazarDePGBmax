const tierList = document.getElementById("tier-list");
const unranked = document.getElementById("unranked-container");

// Ajoute le support drag & drop sur le bac des images à classer
unranked.ondrop = e => {
  e.preventDefault();
  const dragging = document.querySelector(".dragging");
  if (dragging) {
    unranked.appendChild(dragging);
  }
};
unranked.ondragover = e => e.preventDefault();

function createTier(name = "New", color = "#777") {
  const tier = document.createElement("div");
  tier.className = "tier";

  const labelWrapper = document.createElement("div");
  labelWrapper.className = "rank-label-wrapper";

  const label = document.createElement("div");
  label.className = "rank-label";
  label.textContent = name;
  label.contentEditable = true;
  label.spellcheck = false; // Désactive la correction orthographique
  label.style.background = color;

  // Empêche le collage d'images ou de HTML dans le nom de la catégorie
  label.addEventListener("paste", function(e) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, text);
  });

  // Empêche le glisser-déposer d'images ou de contenu dans le nom de la catégorie
  label.addEventListener("dragover", function(e) {
    e.preventDefault();
  });
  label.addEventListener("drop", function(e) {
    e.preventDefault();
  });

  labelWrapper.appendChild(label);

  const content = document.createElement("div");
  content.className = "tier-content";
  content.ondrop = e => {
    e.preventDefault();
    const dragging = document.querySelector(".dragging");
    if (dragging) {
      const ref = getDragAfterElement(content, e.clientX);
      if (ref == null) {
        content.appendChild(dragging);
      } else {
        content.insertBefore(dragging, ref);
      }
    }
  };
  content.ondragover = e => e.preventDefault();

  // Settings button (rouage)
  const settingsBtn = document.createElement("button");
  settingsBtn.className = "settings-btn";
  settingsBtn.innerHTML = "&#9881;"; // Unicode gear

  settingsBtn.onclick = (e) => {
    e.stopPropagation();
    showTierModal(tier, label, color);
  };

  tier.appendChild(labelWrapper);
  tier.appendChild(content);
  tier.appendChild(settingsBtn);

  tierList.appendChild(tier);
}

// Modal logic
function showTierModal(tier, label, color) {
  // Remove any existing modal
  const oldModal = document.querySelector('.modal-overlay');
  if (oldModal) oldModal.remove();

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  // Create modal content
  const modal = document.createElement('div');
  modal.className = 'modal-content';

  // Close button (croix)
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✖';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '10px';
  closeBtn.style.right = '10px';
  closeBtn.style.background = 'transparent';
  closeBtn.style.color = '#fff';
  closeBtn.style.border = 'none';
  closeBtn.style.fontSize = '24px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onclick = () => overlay.remove();

  modal.appendChild(closeBtn);

  // Color picker
  const colorPicker = document.createElement('input');
  colorPicker.type = 'color';
  colorPicker.value = label.style.background || color;
  colorPicker.oninput = () => {
    label.style.background = colorPicker.value;
  };

  // Move up button
  const upBtn = document.createElement('button');
  upBtn.textContent = '⬆️ Monter la colonne';
  upBtn.className = 'modal-btn-blue';
  upBtn.onclick = () => {
    const prev = tier.previousElementSibling;
    if (prev) {
      tierList.insertBefore(tier, prev);
    }
  };

  // Move down button
  const downBtn = document.createElement('button');
  downBtn.textContent = '⬇️ Descendre la colonne';
  downBtn.className = 'modal-btn-blue';
  downBtn.onclick = () => {
    const next = tier.nextElementSibling;
    if (next) {
      tierList.insertBefore(next, tier);
    }
  };

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Supprimer la Colonne';
  deleteBtn.className = 'delete-col-btn';
  deleteBtn.onclick = () => {
    const tierContent = tier.querySelector('.tier-content');
    const unranked = document.getElementById('unranked-container');
    [...tierContent.querySelectorAll('img')].forEach(img => {
      unranked.appendChild(img);
    });
    tier.remove();
    overlay.remove();
  };

  // Row for buttons
  const btnRow = document.createElement('div');
  btnRow.className = 'modal-row';
  const leftBtns = document.createElement('div');
  leftBtns.style.display = 'flex';
  leftBtns.style.gap = '10px';
  leftBtns.appendChild(upBtn);
  leftBtns.appendChild(downBtn);
  const rightBtns = document.createElement('div');
  rightBtns.appendChild(deleteBtn);
  btnRow.appendChild(leftBtns);
  btnRow.appendChild(rightBtns);

  modal.appendChild(colorPicker);
  modal.appendChild(btnRow);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function addTier() {
  const name = prompt("Nom de la nouvelle catégorie ?");
  if (name) createTier(name);
}

function getDragAfterElement(container, x) {
  const els = [...container.querySelectorAll("img:not(.dragging)")];
  return els.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = x - box.left - box.width / 2;
    return offset < 0 && offset > closest.offset ? { offset, element: child } : closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function addDragEvents(img) {
  img.draggable = true;
  img.addEventListener("dragstart", () => img.classList.add("dragging"));
  img.addEventListener("dragend", () => {
    img.classList.remove("dragging");
    saveState(); // Sauvegarde à chaque déplacement
  });
  img.addEventListener("dblclick", () => {
    unranked.appendChild(img);
    saveState(); // Sauvegarde aussi si on double-clique pour déplacer
  });
}

function loadInitialImages() {
  const total = 25;
  for (let i = 1; i <= total; i++) {
    const img = document.createElement("img");
	if (i < 10)
    	img.src = "images/0" + i + ".png";
	else
    	img.src = "images/" + i + ".png";
    addDragEvents(img);
    unranked.appendChild(img);
  }
}

function exportImage() {
  const captureZone = document.getElementById("capture-zone");
  html2canvas(captureZone, {
    backgroundColor: null,
    useCORS: true
  }).then(canvas => {
    const link = document.createElement("a");
    link.download = "tierlist.png";
    link.href = canvas.toDataURL();
    link.click();
  });
}

function saveState() {
  const state = {
    tiers: [],
    unranked: [...unranked.querySelectorAll("img")].map(img => img.src)
  };
  for (const tier of tierList.children) {
    const label = tier.querySelector(".rank-label");
    const name = label.textContent;
    const color = label.style.background; // Sauvegarde la couleur du label
    const images = [...tier.querySelectorAll(".tier-content img")].map(img => img.src);
    state.tiers.push({ name, color, images });
  }
  localStorage.setItem("tierListData_Revivers", JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem("tierListData_Revivers");
  if (!raw) return alert("Aucune sauvegarde trouvée.");
  const state = JSON.parse(raw);

  tierList.innerHTML = "";
  for (const tier of state.tiers) {
    createTier(tier.name, tier.color); // Passe le nom et la couleur
    const container = tierList.lastChild.querySelector(".tier-content");
    for (const src of tier.images) {
      const img = document.createElement("img");
      img.src = src;
      addDragEvents(img);
      container.appendChild(img);
    }
  }

  unranked.innerHTML = "";
  for (const src of state.unranked) {
    const img = document.createElement("img");
    img.src = src;
    addDragEvents(img);
    unranked.appendChild(img);
  }
}

function fixUnrankedHeight() {
  const unranked = document.getElementById('unranked-container');
  // Prend la hauteur actuelle
  const h = unranked.offsetHeight;
  unranked.style.setProperty('--unranked-max-height', h + 'px');
  unranked.classList.add('fixe-height');
}

function updateUnrankedHeight() {
    const container = document.getElementById('unranked-container');
    if (container.classList.contains('fixe-height')) {
        // Ajuste la hauteur selon le nombre d'images
        const imgs = container.querySelectorAll('img').length;
        let height = 100 + Math.ceil(imgs / 8) * 70; // Exemple : 8 images par ligne, 70px par ligne
        container.style.height = height + 'px';
    } else {
        container.style.height = 'auto';
    }
}

// Appelle cette fonction après chaque modification du contenu
updateUnrankedHeight();

function resetTierList() {
  if (!confirm("Voulez-vous vraiment réinitialiser la tier list ? Cette action est irréversible.")) return;
  localStorage.removeItem("tierListData_Revivers");
  tierList.innerHTML = "";
  unranked.innerHTML = "";
  loadInitialImages();
  ["S", "A", "B", "C", "D", "E", "F"].forEach((n, i) => {
    const colors = ["#e74c3c", "#f39c12", "#f1c40f", "#f9e79f", "#2ecc71", "#1abc9c", "#3498db"];
    createTier(n, colors[i]);
  });
  setTimeout(fixUnrankedHeight, 50);
}

// Appelle cette fonction après le chargement initial des images
document.addEventListener("DOMContentLoaded", () => {
  const raw = localStorage.getItem("tierListData_Revivers");
  if (raw) {
    loadState();
    setTimeout(fixUnrankedHeight, 50);
  } else {
    loadInitialImages();
    setTimeout(fixUnrankedHeight, 50);
    ["S", "A", "B", "C", "D", "E", "F"].forEach((n, i) => {
      const colors = ["#e74c3c", "#f39c12", "#f1c40f", "#f9e79f", "#2ecc71", "#1abc9c", "#3498db"];
      createTier(n, colors[i]);
    });
  }
});