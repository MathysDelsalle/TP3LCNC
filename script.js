const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const demoBtn = document.getElementById('demoBtn');
const themeToggleBtn = document.getElementById('themeToggle');
const numDisksInput = document.getElementById('numDisks');
const moveCountSpan = document.getElementById('moveCount');
const goalMovesSpan = document.getElementById('goalMoves');
const minMovesSpan = document.getElementById('minMoves');
const scoreSpan = document.getElementById('scoreValue');
const bestScoreSpan = document.getElementById('bestScoreValue');
const messageDiv = document.getElementById('message');
const towerElements = document.querySelectorAll('.tower');

const animationDuration = 300; // ms

let towers = [[], [], []];
let numDisks = 3;
let moveCount = 0;
let selectedFrom = null;
let isAnimating = false;

// Démo auto
let demoRunning = false;
let demoMoves = [];
let demoIndex = 0;

// Score
let score = 0;
let bestScore = 0;

function computeMinMoves(n) {
  return Math.pow(2, n) - 1;
}

function updateScoreboard() {
  scoreSpan.textContent = score;
  bestScoreSpan.textContent = bestScore;
}

function resetDemoState() {
  demoRunning = false;
  demoMoves = [];
  demoIndex = 0;
}

function startGame() {
  resetDemoState();
  isAnimating = false;

  numDisks = parseInt(numDisksInput.value, 10);
  if (isNaN(numDisks) || numDisks < 1) numDisks = 1;
  if (numDisks > 10) numDisks = 10;
  numDisksInput.value = numDisks;

  const minMoves = computeMinMoves(numDisks);
  moveCount = 0;
  score = 0;

  towers = [[], [], []];
  for (let size = numDisks; size >= 1; size--) {
    towers[0].push(size);
  }

  selectedFrom = null;
  moveCountSpan.textContent = moveCount;
  goalMovesSpan.textContent = minMoves;
  minMovesSpan.textContent = minMoves;
  messageDiv.textContent =
    "Clique d’abord sur une tour de départ, puis sur une tour d’arrivée pour déplacer un anneau.";

  updateScoreboard();
  clearSelection();
  renderTowers();
}

function renderTowers() {
  towerElements.forEach((towerEl, index) => {
    const disksContainer = towerEl.querySelector('.disks');
    disksContainer.innerHTML = '';

    const tower = towers[index];
    tower.forEach(size => {
      const diskEl = document.createElement('div');
      diskEl.classList.add('disk', `size-${size}`);

      const minWidth = 35;
      const maxWidth = 92;
      const ratio = (size - 1) / Math.max(1, numDisks - 1);
      const width = minWidth + (maxWidth - minWidth) * ratio;
      diskEl.style.width = width + '%';

      diskEl.textContent = size;
      disksContainer.appendChild(diskEl);
    });
  });
}

function clearSelection() {
  towerElements.forEach(t => t.classList.remove('selected'));
}

// Animation d’un coup (manuel ou démo)
// → le disque part de sa position actuelle et va se positionner
//   tout en haut de la tour d’arrivée, puis on ré-affiche la pile.
function performMove(from, to, isDemoMove, callback) {
  const fromTower = towers[from];
  const toTower = towers[to];

  if (!fromTower || fromTower.length === 0) {
    if (callback) callback();
    return;
  }

  const diskToMove = fromTower[fromTower.length - 1];
  const fromTowerEl = towerElements[from];
  const toTowerEl = towerElements[to];
  const fromDisksContainer = fromTowerEl.querySelector('.disks');
  const diskDom = fromDisksContainer.lastElementChild;

  if (!diskDom) {
    // fallback sans animation
    fromTower.pop();
    toTower.push(diskToMove);
    moveCount++;
    moveCountSpan.textContent = moveCount;
    renderTowers();
    checkWin(isDemoMove);
    if (callback) callback();
    return;
  }

  // --- Logique du jeu ---
  fromTower.pop();
  toTower.push(diskToMove);

  moveCount++;
  moveCountSpan.textContent = moveCount;

  if (isDemoMove) {
    messageDiv.textContent = "Démo automatique en cours...";
  } else {
    messageDiv.textContent = "Coup joué. Continue !";
  }

  // --- Animation : vers le haut de la tour d’arrivée ---

  const fromRect = diskDom.getBoundingClientRect();
  const towerRect = toTowerEl.getBoundingClientRect();

  // Taille réelle du disque (px) pour éviter les déformations
  const computed = window.getComputedStyle(diskDom);
  const pixelWidth = computed.width;
  const pixelHeight = computed.height;

  // Position de départ (centre du disque actuel)
  const startLeft = fromRect.left;
  const startTop = fromRect.top;

  // Position d’arrivée : tout en haut de la tour d’arrivée
  const targetLeft = towerRect.left + (towerRect.width - fromRect.width) / 2;
  const targetTop = towerRect.top + 10; // 10px sous le haut de la tour

  const dx = targetLeft - startLeft;
  const dy = targetTop - startTop;

  // Clone animé
  const moving = diskDom.cloneNode(true);
  moving.classList.add('moving-disk');
  moving.style.left = startLeft + 'px';
  moving.style.top = startTop + 'px';
  moving.style.width = pixelWidth;
  moving.style.height = pixelHeight;
  moving.style.lineHeight = pixelHeight;
  moving.style.transform = 'translate(0, 0)';

  document.body.appendChild(moving);
  diskDom.style.visibility = 'hidden';
  isAnimating = true;

  // Lancer l’animation
  requestAnimationFrame(() => {
    moving.style.transform = `translate(${dx}px, ${dy}px)`;
  });

  // Quand l’anim est finie : on enlève le clone et on ré-affiche les tours
  setTimeout(() => {
    moving.remove();
    isAnimating = false;
    renderTowers();
    checkWin(isDemoMove);
    if (callback) callback();
  }, animationDuration + 40);
}

function onTowerClick(event) {
  if (demoRunning) {
    messageDiv.textContent =
      "Démo automatique en cours. Clique sur « Nouvelle partie » pour reprendre la main.";
    return;
  }
  if (isAnimating) {
    messageDiv.textContent = "Patiente, un disque est en train de se déplacer.";
    return;
  }

  const towerEl = event.currentTarget;
  const index = parseInt(towerEl.dataset.index, 10);
  const tower = towers[index];

  if (selectedFrom === null) {
    if (tower.length === 0) {
      messageDiv.textContent = "Cette tour est vide, choisis une autre tour comme départ.";
      return;
    }
    selectedFrom = index;
    clearSelection();
    towerEl.classList.add('selected');
    messageDiv.textContent = "Choisis maintenant la tour d’arrivée.";
  } else {
    const from = selectedFrom;
    const to = index;

    if (from === to) {
      selectedFrom = null;
      clearSelection();
      messageDiv.textContent = "Sélection annulée.";
      return;
    }

    const fromTower = towers[from];
    const toTower = towers[to];

    if (fromTower.length === 0) {
      messageDiv.textContent = "La tour de départ est vide.";
      selectedFrom = null;
      clearSelection();
      return;
    }

    const diskToMove = fromTower[fromTower.length - 1];
    const topDest = toTower[toTower.length - 1];

    if (topDest !== undefined && topDest < diskToMove) {
      messageDiv.textContent =
        "Coup interdit : tu ne peux pas poser un grand disque sur un plus petit.";
      selectedFrom = null;
      clearSelection();
      return;
    }

    selectedFrom = null;
    clearSelection();
    performMove(from, to, false);
  }
}

function checkWin(isDemoMove) {
  if (towers[2].length !== numDisks) return;

  const minMoves = computeMinMoves(numDisks);
  const moves = moveCount;

  if (isDemoMove) {
    demoRunning = false;
    messageDiv.textContent = "Démo terminée en " + moves + " coups (solution optimale).";
    return;
  }

  if (moves === minMoves) {
    messageDiv.textContent =
      "🌟 Parfait ! Tu as réussi en " + moves + " coups, le minimum possible !";
  } else {
    messageDiv.textContent =
      "Bravo ! Tu as terminé en " + moves + " coups (minimum possible : " + minMoves + ").";
  }

  const rawScore = Math.round(1000 * (minMoves / moves));
  score = Math.max(10, rawScore);
  if (score > bestScore) {
    bestScore = score;
  }
  updateScoreboard();

  let alertMsg;
  if (moves === minMoves) {
    alertMsg =
      `Score parfait !\nTu as réussi en ${moves} coups (minimum possible).\nScore : ${score}`;
  } else {
    alertMsg =
      `Bravo ! Tu as terminé en ${moves} coups (minimum possible : ${minMoves}).\nScore : ${score}`;
    if (score === bestScore) {
      alertMsg += `\nNouveau meilleur score !`;
    }
  }
  alert(alertMsg);
}

// === Démo automatique ===

function generateHanoiMoves(n, from, to, aux) {
  if (n === 0) return;
  generateHanoiMoves(n - 1, from, aux, to);
  demoMoves.push([from, to]);
  generateHanoiMoves(n - 1, aux, to, from);
}

function playNextDemoMove() {
  if (!demoRunning) return;

  if (demoIndex >= demoMoves.length) {
    // la dernière animation appellera checkWin(true)
    return;
  }

  const [from, to] = demoMoves[demoIndex];
  demoIndex++;

  performMove(from, to, true, () => {
    if (demoRunning && demoIndex < demoMoves.length) {
      setTimeout(playNextDemoMove, 40);
    }
  });
}

function startDemo() {
  startGame();

  resetDemoState();
  demoRunning = true;
  demoMoves = [];
  generateHanoiMoves(numDisks, 0, 2, 1);
  demoIndex = 0;

  messageDiv.textContent = "Démo automatique en cours... (" + demoMoves.length + " coups)";
  playNextDemoMove();
}

// === Thème sombre / clair ===

let isDark = false;

function applyTheme() {
  if (isDark) {
    document.body.classList.add('dark');
    themeToggleBtn.innerHTML = '<span class="icon">☀️</span><span>Mode clair</span>';
  } else {
    document.body.classList.remove('dark');
    themeToggleBtn.innerHTML = '<span class="icon">🌙</span><span>Mode sombre</span>';
  }
}

themeToggleBtn.addEventListener('click', () => {
  isDark = !isDark;
  applyTheme();
});

// Événements
startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', startGame);
demoBtn.addEventListener('click', startDemo);
towerElements.forEach(t => t.addEventListener('click', onTowerClick));

// Initialisation
applyTheme();
startGame();
