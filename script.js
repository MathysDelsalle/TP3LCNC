document.addEventListener("DOMContentLoaded", () => {
  const body = document.documentElement;

  const towersEls = Array.from(document.querySelectorAll(".tower"));
  const diskCountInput = document.getElementById("diskCount");
  const startBtn = document.getElementById("startBtn");
  const autoDemoBtn = document.getElementById("autoDemoBtn");
  const resetBtn = document.getElementById("resetBtn");
  const themeToggleBtn = document.getElementById("themeToggle");

  const moveCountEl = document.getElementById("moveCount");
  const optimalMovesEl = document.getElementById("optimalMoves");
  const scoreEl = document.getElementById("score");
  const scoreMessageEl = document.getElementById("scoreMessage");

  const ANIMATION_DURATION = 380; // ms
  const DISK_HEIGHT = 22;
  const DISK_GAP = 4;
  const BASE_BOTTOM_OFFSET = 20;

  let numDisks = parseInt(diskCountInput.value, 10) || 4;
  let towers = [[], [], []]; // chaque tour est un tableau de tailles de disques (1 = petit)
  const diskElements = new Map(); // taille -> élément DOM

  let moveCount = 0;
  let isAutoPlaying = false;
  let cancelAuto = false;
  let selectedTowerIndex = null;

  // Palette de couleurs pour les disques
  const diskColors = [
    "#f97373",
    "#fb923c",
    "#facc15",
    "#4ade80",
    "#2dd4bf",
    "#38bdf8",
    "#6366f1",
    "#a855f7",
  ];

  /* ---------- Thème (clair / sombre) ---------- */
  function applyTheme(theme) {
    body.setAttribute("data-theme", theme);
    themeToggleBtn.textContent =
      theme === "dark" ? "Mode clair" : "Mode sombre";
    try {
      localStorage.setItem("hanoi-theme", theme);
    } catch {
      /* silencieux */
    }
  }

  (function initTheme() {
    let stored;
    try {
      stored = localStorage.getItem("hanoi-theme");
    } catch {
      stored = null;
    }
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored || (prefersDark ? "dark" : "light");
    applyTheme(initial);
  })();

  themeToggleBtn.addEventListener("click", () => {
    const current = body.getAttribute("data-theme") || "light";
    applyTheme(current === "light" ? "dark" : "light");
  });

  /* ---------- Utilitaires ---------- */
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function optimalMoves(n) {
    return Math.pow(2, n) - 1;
  }

  function updateScoreboard() {
    const optimal = optimalMoves(numDisks);
    moveCountEl.textContent = moveCount;
    optimalMovesEl.textContent = optimal;

    let score = 0;
    let msg = "";
    if (moveCount > 0) {
      score = Math.max(0, Math.round((optimal / moveCount) * 1000));
      if (moveCount === optimal) {
        msg = "Parfait ! Vous avez atteint le minimum théorique 🎉";
      } else if (moveCount <= optimal * 1.5) {
        msg = "Très bien joué, vous êtes proche de l&#39;optimal 👏";
      } else {
        msg = "Essayez de réduire encore vos coups pour plus de points 😉";
      }
    }
    scoreEl.textContent = score;
    scoreMessageEl.innerHTML = msg;
  }

  function computeBottomPosition(stackIndex) {
    // 0 = disque le plus bas
    return BASE_BOTTOM_OFFSET + 14 + stackIndex * (DISK_HEIGHT + DISK_GAP);
  }

  function layoutAllDisks(withTransition = false) {
    towers.forEach((towerArr, towerIndex) => {
      towerArr.forEach((size, i) => {
        const diskEl = diskElements.get(size);
        if (!diskEl) return;
        diskEl.style.transition = withTransition ? "" : "none";
        diskEl.style.bottom = `${computeBottomPosition(i)}px`;
      });
    });
  }

  /* ---------- Initialisation / Reset ---------- */
  function clearDisksDom() {
    towersEls.forEach((towerEl) => {
      towerEl.querySelectorAll(".disk").forEach((d) => d.remove());
    });
    diskElements.clear();
  }

  function createDisk(size, towerIndex, stackIndex) {
    const diskEl = document.createElement("div");
    diskEl.classList.add("disk");
    const minWidth = 60;
    const maxWidth = 160;
    const ratio = (size - 1) / Math.max(1, numDisks - 1);
    const width = minWidth + (maxWidth - minWidth) * ratio;

    diskEl.style.width = `${width}px`;
    diskEl.style.bottom = `${computeBottomPosition(stackIndex)}px`;
    diskEl.style.background = diskColors[(size - 1) % diskColors.length];
    diskEl.style.zIndex = 10 + size; // pour que les plus petits soient au-dessus

    const towerEl = towersEls[towerIndex];
    towerEl.appendChild(diskEl);
    diskElements.set(size, diskEl);
  }

  function resetState(keepDiskCount = true) {
    if (!keepDiskCount) {
      numDisks = clamp(
        parseInt(diskCountInput.value, 10) || numDisks,
        Number(diskCountInput.min),
        Number(diskCountInput.max)
      );
      diskCountInput.value = numDisks;
    }

    moveCount = 0;
    cancelAuto = true;
    isAutoPlaying = false;
    selectedTowerIndex = null;

    towers = [[], [], []];
    clearDisksDom();

    for (let size = numDisks; size >= 1; size--) {
      towers[0].push(size);
      createDisk(size, 0, numDisks - size);
    }

    layoutAllDisks(false);
    updateScoreboard();
  }

  function disableControlsDuringAuto(disabled) {
    towersEls.forEach((tower) =>
      tower.classList.toggle("disabled", disabled)
    );
    startBtn.disabled = disabled;
    diskCountInput.disabled = disabled;
    autoDemoBtn.disabled = disabled;
  }

  /* ---------- Mouvements ---------- */
  async function moveDisk(fromIndex, toIndex, isUserMove = false) {
    // validation de base
    if (fromIndex === toIndex) return false;

    const fromTower = towers[fromIndex];
    const toTower = towers[toIndex];

    if (!fromTower.length) return false;

    const movingSize = fromTower[fromTower.length - 1];
    const targetTopSize = toTower[toTower.length - 1];

    if (targetTopSize !== undefined && targetTopSize < movingSize) {
      const targetTowerEl = towersEls[toIndex];
      targetTowerEl.classList.add("invalid");
      setTimeout(() => targetTowerEl.classList.remove("invalid"), 200);
      return false;
    }

    fromTower.pop();
    toTower.push(movingSize);

    const diskEl = diskElements.get(movingSize);
    if (!diskEl) return false;

    // Animation : téléporté en haut de la tour d'arrivée puis chute fluide
    const targetTowerEl = towersEls[toIndex];
    const targetStackIndex = toTower.length - 1;
    const finalBottom = computeBottomPosition(targetStackIndex);

    // étape : déplacer l'élément dans le DOM et le placer en haut
    diskEl.classList.remove("selected");
    diskEl.style.transition = "none";
    targetTowerEl.appendChild(diskEl);
    diskEl.style.bottom = `${computeBottomPosition(numDisks + 1)}px`; // haut de la tour

    // forcer le reflow
    void diskEl.offsetHeight;

    // activer la transition pour la descente
    diskEl.style.transition = `bottom ${ANIMATION_DURATION}ms ease`;
    diskEl.style.bottom = `${finalBottom}px`;

    // attendre la fin de l'animation
    await new Promise((resolve) =>
      setTimeout(resolve, ANIMATION_DURATION + 20)
    );

    if (isUserMove) {
      moveCount++;
      updateScoreboard();
      checkVictoryForUser();
    }

    return true;
  }

  function checkVictoryForUser() {
    if (isAutoPlaying) return;
    const won =
      towers[1].length === numDisks || towers[2].length === numDisks;
    if (won) {
      setTimeout(() => {
        alert(
          `Bravo, vous avez gagné en ${moveCount} coups !\nScore: ${scoreEl.textContent}`
        );
      }, 50);
    }
  }

  /* ---------- Gestion des clics sur les tours ---------- */
  function clearSelected() {
    towersEls.forEach((towerEl) => {
      const disks = towerEl.querySelectorAll(".disk");
      disks.forEach((d) => d.classList.remove("selected"));
    });
    selectedTowerIndex = null;
  }

  towersEls.forEach((towerEl) => {
    towerEl.addEventListener("click", async () => {
      if (isAutoPlaying) return;

      const towerIndex = Number(towerEl.dataset.index);

      if (selectedTowerIndex === null) {
        // sélectionner la tour source
        const towerArr = towers[towerIndex];
        if (!towerArr.length) return;
        selectedTowerIndex = towerIndex;

        const topSize = towerArr[towerArr.length - 1];
        const topDisk = diskElements.get(topSize);
        if (topDisk) topDisk.classList.add("selected");
      } else if (selectedTowerIndex === towerIndex) {
        // désélection
        clearSelected();
      } else {
        const from = selectedTowerIndex;
        const to = towerIndex;
        clearSelected();
        const ok = await moveDisk(from, to, true);
        if (!ok) {
          // si le déplacement est invalide, garder la sélection de la tour source ?
          // On choisit de tout désélectionner pour simplifier.
        }
      }
    });
  });

  /* ---------- Démo automatique (algo récursif) ---------- */
  async function hanoiRecursive(n, from, to, aux) {
    if (cancelAuto) return;
    if (n === 0) return;

    await hanoiRecursive(n - 1, from, aux, to);
    if (cancelAuto) return;
    await moveDisk(from, to, false);
    moveCount++;
    updateScoreboard();
    await hanoiRecursive(n - 1, aux, to, from);
  }

  async function startAutoDemo() {
    if (isAutoPlaying) return;
    cancelAuto = false;
    moveCount = 0;
    resetState(true); // re-génère avec numDisks actuel
    isAutoPlaying = true;
    disableControlsDuringAuto(true);
    updateScoreboard();

    try {
      await hanoiRecursive(numDisks, 0, 2, 1);
    } finally {
      isAutoPlaying = false;
      disableControlsDuringAuto(false);
      cancelAuto = true;
    }
  }

  /* ---------- Boutons ---------- */
  startBtn.addEventListener("click", () => {
    resetState(false);
  });

  resetBtn.addEventListener("click", () => {
    resetState(true);
  });

  autoDemoBtn.addEventListener("click", () => {
    startAutoDemo();
  });

  diskCountInput.addEventListener("change", () => {
    // Optionnel : reconfigurer automatiquement quand on change la valeur
    resetState(false);
  });

  /* ---------- Démarrage ---------- */
  resetState(true);
});
