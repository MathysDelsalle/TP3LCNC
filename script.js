// Sélection des éléments DOM
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

/**
 * Calcule le nombre minimal de coups nécessaires pour résoudre les Tours de Hanoï.
 * @param {number} n - Nombre de disques.
 * @returns {number} Le nombre minimal de coups.
 */
function computeMinMoves(n) {
  return Math.pow(2, n) - 1;
}

/**
 * Met à jour l'affichage du score et du meilleur score.
 */
function updateScoreboard() {
  scoreSpan.textContent = score;
  bestScoreSpan.textContent = bestScore;
}

/**
 * Réinitialise l'état de la démonstration automatique.
 */
function resetDemoState() {
  demoRunning = false;
  demoMoves = [];
  demoIndex = 0;
}

/**
 * Démarre une nouvelle partie :
 * - Réinitialisation des variables
 * - Placement initial des disques
 * - Mise à jour de l'affichage
 */
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

/**
 * Affiche les tours et les disques dans le DOM.
 */
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

/**
 * Retire toute sélection visuelle sur les tours.
 */
function clearSelection() {
  towerElements.forEach(t => t.classList.remove('selected'));
}

/**
 * Effectue un déplacement animé d'un disque d'une tour vers une autre.
 * @param {number} from - Index de la tour source.
 * @param {number} to - Index de la tour destination.
 * @param {boolean} isDemoMove - Indique si le coup provient de la démo automatique.
 * @param {Function} [callback] - Fonction appelée après la fin de l’animation.
 */
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
    fromTower.pop();
    toTower.push(diskToMove);
    moveCount++;
    moveCountSpan.textContent = moveCount;
    renderTowers();
    checkWin(isDemoMove);
    if (callback) callback();
    return;
  }

  fromTower.pop();
  toTower.push(diskToMove);

  moveCount++;
  moveCountSpan.textContent = moveCount;

  messageDiv.textContent = isDemoMove
    ? "Démo automatique en cours..."
    : "Coup joué. Continue !";

  const fromRect = diskDom.getBoundingClientRect();
  const towerRect = toTowerEl.getBoundingClientRect();

  const computed = window.getComputedStyle(diskDom);
  const pixelWidth = computed.width;
  const pixelHeight = computed.height;

  const startLeft = fromRect.left;
  const startTop = fromRect.top;

  const targetLeft = towerRect.left + (towerRect.width - fromRect.width) / 2;
  const targetTop = towerRect.top + 10;

  const dx = targetLeft - startLeft;
  const dy = targetTop - startTop;

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

  requestAnimationFrame(() => {
    moving.style.transform = `translate(${dx}px, ${dy}px)`;
  });

  setTimeout(() => {
    moving.remove();
    isAnimating = false;
    renderTowers();
    checkWin(isDemoMove);
    if (callback) callback();
  }, animationDuration + 40);
}
/**
 * Gestion du clic sur une tour :
 * - Sélection de la tour de départ
 * - Validation de la tour d'arrivée
 * - Vérification de la légalité du mouvement
 * @param {MouseEvent} event - L'événement de clic.
 */
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

  // Sélection de la tour de départ
  if (selectedFrom === null) {
    if (tower.length === 0) {
      messageDiv.textContent = "Cette tour est vide, choisis une autre tour comme départ.";
      return;
    }
    selectedFrom = index;
    clearSelection();
    towerEl.classList.add('selected');
    messageDiv.textContent = "Choisis maintenant la tour d’arrivée.";
    return;
  }

  // Sélection de la tour d'arrivée
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

/**
 * Vérifie si le joueur ou la démo a gagné.
 * - Si la colonne 3 contient tous les disques, la partie est terminée
 * - Gère l'affichage des messages de fin
 * - Calcule le score
 * @param {boolean} isDemoMove - Indique si le coup provient de la démo automatique.
 */
function checkWin(isDemoMove) {
  if (towers[2].length !== numDisks) return;

  const minMoves = computeMinMoves(numDisks);
  const moves = moveCount;

  // Cas démo
  if (isDemoMove) {
    demoRunning = false;
    messageDiv.textContent = "Démo terminée en " + moves + " coups (solution optimale).";
    return;
  }

  // Fin normale
  if (moves === minMoves) {
    messageDiv.textContent =
      "🌟 Parfait ! Tu as réussi en " + moves + " coups, le minimum possible !";
  } else {
    messageDiv.textContent =
      "Bravo ! Tu as terminé en " + moves + " coups (minimum possible : " + minMoves + ").";
  }

  const rawScore = Math.round(1000 * (minMoves / moves));
  score = Math.max(10, rawScore);
  if (score > bestScore) bestScore = score;

  updateScoreboard();

  let alertMsg;
  if (moves === minMoves) {
    alertMsg =
      `Score parfait !\nTu as réussi en ${moves} coups (minimum possible).\nScore : ${score}`;
  } else {
    alertMsg =
      `Bravo ! Tu as terminé en ${moves} coups (minimum possible : ${minMoves}).\nScore : ${score}`;
    if (score === bestScore) alertMsg += `\nNouveau meilleur score !`;
  }

  alert(alertMsg);
}

/**
 * Génère la liste des mouvements optimaux pour résoudre les Tours de Hanoï.
 * Algorithme récursif standard.
 * @param {number} n - Nombre de disques.
 * @param {number} from - Tour source.
 * @param {number} to - Tour destination.
 * @param {number} aux - Tour auxiliaire.
 */
function generateHanoiMoves(n, from, to, aux) {
  if (n === 0) return;
  generateHanoiMoves(n - 1, from, aux, to);
  demoMoves.push([from, to]);
  generateHanoiMoves(n - 1, aux, to, from);
}

/**
 * Joue le prochain coup de la démo automatique.
 */
function playNextDemoMove() {
  if (!demoRunning) return;

  if (demoIndex >= demoMoves.length) {
    return; // la dernière animation déclenchera checkWin(true)
  }

  const [from, to] = demoMoves[demoIndex];
  demoIndex++;

  performMove(from, to, true, () => {
    if (demoRunning && demoIndex < demoMoves.length) {
      setTimeout(playNextDemoMove, 40);
    }
  });
}

/**
 * Démarre la démonstration automatique :
 * - génère la solution optimale
 * - joue les coups l'un après l'autre
 */
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

/**
 * Applique le thème clair ou sombre en fonction de la variable isDark.
 */
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
