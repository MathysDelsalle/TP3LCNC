// État du jeu
let gameState = {
    towers: [[], [], []],
    diskCount: 3,
    moves: 0,
    selectedDisk: null,
    selectedTower: null,
    gameStarted: false,
    autoMode: false,
    animating: false
};

// Éléments DOM
const startBtn = document.getElementById('startBtn');
const autoBtn = document.getElementById('autoBtn');
const resetBtn = document.getElementById('resetBtn');
const themeBtn = document.getElementById('themeBtn');
const diskCountInput = document.getElementById('diskCount');
const movesDisplay = document.getElementById('moves');
const scoreDisplay = document.getElementById('score');
const optimalDisplay = document.getElementById('optimal');

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    startBtn.addEventListener('click', startGame);
    autoBtn.addEventListener('click', startAutoDemo);
    resetBtn.addEventListener('click', resetGame);
    themeBtn.addEventListener('click', toggleTheme);
    
    document.querySelectorAll('.tower').forEach((tower, index) => {
        tower.addEventListener('click', () => handleTowerClick(index));
    });
});

// Démarrer le jeu
function startGame() {
    gameState.diskCount = parseInt(diskCountInput.value);
    gameState.moves = 0;
    gameState.selectedDisk = null;
    gameState.selectedTower = null;
    gameState.gameStarted = true;
    gameState.autoMode = false;
    
    // Initialiser les tours
    gameState.towers = [[], [], []];
    for (let i = gameState.diskCount; i >= 1; i--) {
        gameState.towers[0].push(i);
    }
    
    updateDisplay();
    updateOptimalMoves();
    startBtn.disabled = true;
    diskCountInput.disabled = true;
}

// Réinitialiser le jeu
function resetGame() {
    gameState = {
        towers: [[], [], []],
        diskCount: 3,
        moves: 0,
        selectedDisk: null,
        selectedTower: null,
        gameStarted: false,
        autoMode: false,
        animating: false
    };
    
    diskCountInput.value = 3;
    updateDisplay();
    updateOptimalMoves();
    startBtn.disabled = false;
    diskCountInput.disabled = false;
    autoBtn.disabled = false;
}

// Gestion des clics sur les tours
function handleTowerClick(towerIndex) {
    if (!gameState.gameStarted || gameState.autoMode || gameState.animating) return;
    
    const tower = gameState.towers[towerIndex];
    
    if (gameState.selectedTower === null) {
        // Sélectionner un disque
        if (tower.length > 0) {
            gameState.selectedTower = towerIndex;
            gameState.selectedDisk = tower[tower.length - 1];
            highlightDisk(towerIndex, true);
        }
    } else {
        // Déplacer le disque
        if (towerIndex === gameState.selectedTower) {
            // Désélectionner
            highlightDisk(gameState.selectedTower, false);
            gameState.selectedTower = null;
            gameState.selectedDisk = null;
        } else if (canMoveDisk(gameState.selectedTower, towerIndex)) {
            moveDisk(gameState.selectedTower, towerIndex);
        } else {
            // Mouvement invalide - réinitialiser la sélection
            highlightDisk(gameState.selectedTower, false);
            gameState.selectedTower = null;
            gameState.selectedDisk = null;
        }
    }
}

// Vérifier si un mouvement est valide
function canMoveDisk(fromTower, toTower) {
    const from = gameState.towers[fromTower];
    const to = gameState.towers[toTower];
    
    if (from.length === 0) return false;
    if (to.length === 0) return true;
    
    return from[from.length - 1] < to[to.length - 1];
}

// Déplacer un disque avec animation
async function moveDisk(fromTower, toTower) {
    if (!canMoveDisk(fromTower, toTower)) return;
    
    gameState.animating = true;
    const disk = gameState.towers[fromTower].pop();
    
    // Animation
    await animateDiskMove(fromTower, toTower, disk);
    
    gameState.towers[toTower].push(disk);
    gameState.moves++;
    
    highlightDisk(fromTower, false);
    gameState.selectedTower = null;
    gameState.selectedDisk = null;
    
    updateDisplay();
    gameState.animating = false;
    
    // Vérifier la victoire
    if (!gameState.autoMode && checkWin()) {
        setTimeout(() => showVictory(), 300);
    }
}

// Animation de déplacement de disque
function animateDiskMove(fromTower, toTower, diskSize) {
    return new Promise(resolve => {
        const fromElement = document.getElementById(`tower${fromTower}`);
        const toElement = document.getElementById(`tower${toTower}`);
        const diskElement = fromElement.querySelector(`[data-size="${diskSize}"]`);
        
        if (!diskElement) {
            resolve();
            return;
        }
        
        // Obtenir les positions
        const fromRect = fromElement.getBoundingClientRect();
        const toRect = toElement.getBoundingClientRect();
        
        // Calculer la translation
        const deltaX = toRect.left - fromRect.left;
        const deltaY = -200; // Hauteur de l'arc
        
        diskElement.classList.add('animating');
        
        // Première phase : monter
        diskElement.style.transform = `translateY(${deltaY}px)`;
        
        setTimeout(() => {
            // Deuxième phase : déplacer horizontalement
            diskElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            
            setTimeout(() => {
                // Troisième phase : descendre
                diskElement.style.transform = `translate(${deltaX}px, 0px)`;
                
                setTimeout(() => {
                    diskElement.classList.remove('animating');
                    diskElement.style.transform = '';
                    resolve();
                }, 400);
            }, 400);
        }, 400);
    });
}

// Surligner un disque
function highlightDisk(towerIndex, highlight) {
    const tower = document.getElementById(`tower${towerIndex}`);
    const disks = tower.querySelectorAll('.disk');
    if (disks.length > 0) {
        const topDisk = disks[disks.length - 1];
        if (highlight) {
            topDisk.classList.add('selected');
        } else {
            topDisk.classList.remove('selected');
        }
    }
}

// Mettre à jour l'affichage
function updateDisplay() {
    movesDisplay.textContent = gameState.moves;
    updateScore();
    
    // Afficher les disques
    for (let i = 0; i < 3; i++) {
        const towerElement = document.getElementById(`tower${i}`);
        towerElement.innerHTML = '';
        
        gameState.towers[i].forEach(diskSize => {
            const disk = document.createElement('div');
            disk.className = 'disk';
            disk.dataset.size = diskSize;
            towerElement.appendChild(disk);
        });
    }
}

// Calculer et afficher le score
function updateScore() {
    const optimal = Math.pow(2, gameState.diskCount) - 1;
    let score = 0;
    
    if (gameState.moves > 0) {
        score = Math.max(0, Math.round(1000 * (1 - (gameState.moves - optimal) / optimal)));
    }
    
    scoreDisplay.textContent = score;
}

// Mettre à jour les coups optimaux
function updateOptimalMoves() {
    const optimal = Math.pow(2, gameState.diskCount) - 1;
    optimalDisplay.textContent = optimal;
}

// Vérifier la victoire
function checkWin() {
    return gameState.towers[2].length === gameState.diskCount;
}

// Afficher la victoire
function showVictory() {
    const optimal = Math.pow(2, gameState.diskCount) - 1;
    const score = Math.max(0, Math.round(1000 * (1 - (gameState.moves - optimal) / optimal)));
    
    let message = `🎉 Félicitations ! 🎉\n\n`;
    message += `Vous avez résolu le puzzle en ${gameState.moves} coups !\n`;
    message += `Coups optimaux : ${optimal}\n`;
    message += `Score : ${score} points\n\n`;
    
    if (gameState.moves === optimal) {
        message += `⭐ PARFAIT ! Vous avez réussi en un nombre optimal de coups ! ⭐`;
    } else if (gameState.moves <= optimal * 1.5) {
        message += `👏 Très bon résultat !`;
    } else {
        message += `💪 Bien joué ! Réessayez pour améliorer votre score !`;
    }
    
    alert(message);
}

// Mode démo automatique
async function startAutoDemo() {
    gameState.diskCount = parseInt(diskCountInput.value);
    gameState.moves = 0;
    gameState.gameStarted = true;
    gameState.autoMode = true;
    
    // Initialiser les tours
    gameState.towers = [[], [], []];
    for (let i = gameState.diskCount; i >= 1; i--) {
        gameState.towers[0].push(i);
    }
    
    updateDisplay();
    updateOptimalMoves();
    startBtn.disabled = true;
    autoBtn.disabled = true;
    diskCountInput.disabled = true;
    
    // Lancer l'algorithme récursif
    await solveHanoi(gameState.diskCount, 0, 2, 1);
    
    setTimeout(() => {
        alert(`🤖 Démo terminée !\n\nLe puzzle a été résolu en ${gameState.moves} coups optimaux.`);
        autoBtn.disabled = false;
    }, 500);
}

// Algorithme récursif des Tours de Hanoï
async function solveHanoi(n, from, to, aux) {
    if (n === 1) {
        await moveDisk(from, to);
        await sleep(600);
        return;
    }
    
    await solveHanoi(n - 1, from, aux, to);
    await moveDisk(from, to);
    await sleep(600);
    await solveHanoi(n - 1, aux, to, from);
}

// Fonction utilitaire pour les délais
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Basculer entre mode clair et sombre
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    
    if (document.body.classList.contains('dark-mode')) {
        themeBtn.textContent = '☀️';
    } else {
        themeBtn.textContent = '🌙';
    }
}