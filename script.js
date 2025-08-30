
const gameBoard = document.getElementById('game-board');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const highScoreElement = document.getElementById('high-score');
const objectiveTextElement = document.getElementById('objective-text');
const gameOverOverlay = document.getElementById('game-over-overlay');
const finalScoreElement = document.getElementById('final-score');
const playAgainBtn = document.getElementById('play-again-btn');
const specialMeterBar = document.getElementById('special-meter-bar');
const modeSelectionOverlay = document.getElementById('mode-selection-overlay');
const levelModeBtn = document.getElementById('level-mode-btn');
const timeAttackModeBtn = document.getElementById('time-attack-mode-btn');
const levelContainer = document.getElementById('level-container');
const objectiveContainer = document.getElementById('objective-container');
const timerContainer = document.getElementById('timer-container');
const timerElement = document.getElementById('timer');
const badgeContainer = document.getElementById('badge-container');
const movesContainer = document.getElementById('moves-container');
const movesLeftElement = document.getElementById('moves-left');


// Audio elements
const soundBackground = document.getElementById('sound-background');
soundBackground.volume = 0.5;
const soundSwap = document.getElementById('sound-swap');
const soundMatch = document.getElementById('sound-match');
const soundBomb = document.getElementById('sound-bomb');
const soundLineBomb = document.getElementById('sound-line-bomb');
const soundRainbowBomb = document.getElementById('sound-rainbow-bomb');
const soundLevelUp = document.getElementById('sound-level-up');

const boardSize = 8;
const tileTypes = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
const tileGap = 4;
const boardPadding = 2;

let dynamicTileSize;
let dynamicTileSlotSize;

let gameMode = 'level'; // 'level' or 'timeAttack'
let timerInterval;
let timeLeft = 60;

function updateTileDimensions() {
    console.log('Inside updateTileDimensions - gameBoard.offsetWidth:', gameBoard.offsetWidth);
    const gameBoardWidth = gameBoard.offsetWidth;
    dynamicTileSize = (gameBoardWidth - (tileGap * (boardSize - 1)) - (boardPadding * 2)) / boardSize;
    dynamicTileSlotSize = dynamicTileSize + tileGap;
    console.log(`updateTileDimensions: gameBoardWidth=${gameBoardWidth}, dynamicTileSize=${dynamicTileSize}, dynamicTileSlotSize=${dynamicTileSlotSize}`);
}

let board = [];
let score = 0;
let multiplier = 1;
let level = 1;
let highScore = 0;
let selectedTile = null;
let specialMeter = 0;
const specialMeterMax = 100;
let isMusicPlaying = false;
let movesLeft = 0;
let isAnimating = false;

const levels = [
    { level: 1, objective: { type: 'score', value: 800 }, moves: 30 },
    { level: 2, objective: { type: 'clearColor', color: 'red', count: 24 }, moves: 30 },
    { level: 3, objective: { type: 'clearColor', color: 'blue', count: 32 }, moves: 35 },
    { level: 4, objective: { type: 'score', value: 4000 }, moves: 35 },
    { level: 5, objective: { type: 'clearColor', color: 'green', count: 40 }, moves: 40 },
    { level: 6, objective: { type: 'clearColor', color: 'yellow', count: 48 }, moves: 40 },
    { level: 7, objective: { type: 'clearColor', color: 'purple', count: 56 }, moves: 45 },
    { level: 8, objective: { type: 'score', value: 8000 }, moves: 45 },
    { level: 9, objective: { type: 'clearColor', color: 'orange', count: 64 }, moves: 50 },
    { level: 10, objective: { type: 'score', value: 12000 }, moves: 50 }
];

let currentObjective = {};
let objectiveProgress = 0;

function initializeLevel(level) {
    const levelData = levels.find(l => l.level === level);
    if (levelData) {
        currentObjective = levelData.objective;
        movesLeft = levelData.moves;
    } else {
        currentObjective = { type: 'score', value: Math.floor(1000 * Math.pow(1.5, level - 1)) };
        movesLeft = Math.max(15, 50 - (level - 10) * 2); // Decrease moves for higher levels
    }
    objectiveProgress = 0;
    updateObjectiveDisplay();
    updateMovesDisplay();
}

function updateMovesDisplay() {
    movesLeftElement.textContent = movesLeft;
}

function updateObjectiveDisplay() {
    if (gameMode === 'level') {
        if (currentObjective.type === 'score') {
            objectiveTextElement.textContent = `スコア ${Math.round(currentObjective.value)} を目指す`;
        } else if (currentObjective.type === 'clearColor') {
            const colorSpan = document.createElement('span');
            colorSpan.textContent = currentObjective.color;
            colorSpan.style.color = currentObjective.color;
            objectiveTextElement.innerHTML = ``;
            objectiveTextElement.appendChild(colorSpan);
            objectiveTextElement.innerHTML += `タイルを${currentObjective.count}個消す (${objectiveProgress}/${currentObjective.count})`;
        }
    }
}

function playSound(sound) {
    sound.currentTime = 0;
    sound.play();
}

function updateSpecialMeter() {
    const percentage = Math.min(100, (specialMeter / specialMeterMax) * 100);
    specialMeterBar.style.width = `${percentage}%`;
}

function updateScoreDisplay() {
    scoreElement.textContent = score;
    levelElement.textContent = level;
    highScoreElement.textContent = highScore;
    updateObjectiveDisplay();
}

function showLevelUpPopup() {
    playSound(soundLevelUp);
    gameBoard.classList.add('screen-flash');
    setTimeout(() => gameBoard.classList.remove('screen-flash'), 500);

    const popup = document.createElement('div');
    popup.textContent = 'Level Up!';
    popup.classList.add('level-up-popup');
    gameBoard.appendChild(popup);

    setTimeout(() => { popup.remove(); }, 2500);
}

function showComboPopup(multiplier) {
    const comboTexts = ['Combo', 'Super', 'Awesome', 'Excellent', 'Unbelievable!'];
    const text = `${comboTexts[Math.min(multiplier - 2, comboTexts.length - 1)]} x${multiplier}!`;

    const popup = document.createElement('div');
    popup.textContent = text;
    popup.classList.add('combo-popup');
    gameBoard.appendChild(popup);

    setTimeout(() => { popup.remove(); }, 1000);
}

function handleGameOver() {
    clearInterval(timerInterval);
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
    }
    finalScoreElement.textContent = score;
    gameOverOverlay.classList.remove('hidden');
    gameBoard.style.pointerEvents = 'none';
}

function checkForPossibleMoves() {
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            if (isSpecial(board[r][c])) {
                return true;
            }
        }
    }

    const tempBoard = board.map(row => [...row]);

    function checkMatchesOnTempBoard(tempB) {
        const colorBoard = tempB.map(row => row.map(tile => tile ? tile.split('-')[0] : null));
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize - 2; c++) {
                if (colorBoard[r][c] && colorBoard[r][c] === colorBoard[r][c + 1] && colorBoard[r][c] === colorBoard[r][c + 2]) return true;
            }
        }
        for (let c = 0; c < boardSize; c++) {
            for (let r = 0; r < boardSize - 2; r++) {
                if (colorBoard[r][c] && colorBoard[r + 1][c] && colorBoard[r][c] === colorBoard[r + 1][c] && colorBoard[r][c] === colorBoard[r + 2][c]) return true;
            }
        }
        return false;
    }

    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            if (c + 1 < boardSize) {
                [tempBoard[r][c], tempBoard[r][c + 1]] = [tempBoard[r][c + 1], tempBoard[r][c]];
                if (checkMatchesOnTempBoard(tempBoard)) return true;
                [tempBoard[r][c], tempBoard[r][c + 1]] = [tempBoard[r][c + 1], tempBoard[r][c]];
            }
            if (r + 1 < boardSize) {
                [tempBoard[r][c], tempBoard[r + 1][c]] = [tempBoard[r + 1][c], tempBoard[r][c]];
                if (checkMatchesOnTempBoard(tempBoard)) return true;
                [tempBoard[r][c], tempBoard[r + 1][c]] = [tempBoard[r + 1][c], tempBoard[r][c]];
            }
        }
    }
    return false;
}

function shuffleBoard() {
    let hasPossibleMoves = false;
    do {
        board = [];
        for (let row = 0; row < boardSize; row++) {
            board[row] = [];
            for (let col = 0; col < boardSize; col++) {
                let tileType;
                do {
                    tileType = tileTypes[Math.floor(Math.random() * tileTypes.length)];
                } while (
                    (col >= 2 && board[row][col - 1] === tileType && board[row][col - 2] === tileType) ||
                    (row >= 2 && board[row - 1][col] === tileType && board[row - 2][col] === tileType)
                );
                board[row][col] = tileType;
            }
        }
        hasPossibleMoves = checkForPossibleMoves();
    } while (!hasPossibleMoves);
    renderBoard();
}

function initializeBoard() {
    highScore = localStorage.getItem('highScore') || 0;
    board = [];
    for (let row = 0; row < boardSize; row++) {
        board[row] = [];
        for (let col = 0; col < boardSize; col++) {
            let tileType;
            do {
                tileType = tileTypes[Math.floor(Math.random() * tileTypes.length)];
            } while (
                (col >= 2 && board[row][col - 1] === tileType && board[row][col - 2] === tileType) ||
                (row >= 2 && board[row - 1][col] === tileType && board[row - 2][col] === tileType)
            );
            board[row][col] = tileType;
        }
    }
}

function renderBoard() {
    gameBoard.innerHTML = '';
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            const tileType = board[row][col];
            const color = tileType.split('-')[0];
            tile.style.backgroundColor = color;
            tile.dataset.row = row;
            tile.dataset.col = col;
            tile.style.width = `${dynamicTileSize}px`;
            tile.style.height = `${dynamicTileSize}px`;

            if (isSpecial(tileType)) {
                tile.classList.add('special-tile');
                if (tileType.includes('line-bomb-h')) {
                    tile.classList.add('line-h');
                } else if (tileType.includes('line-bomb-v')) {
                    tile.classList.add('line-v');
                } else if (tileType.includes('rainbow-bomb')) {
                    tile.classList.add('rainbow-bomb');
                } else if (tileType.includes('bomb')) {
                    tile.classList.add('bomb');
                }
            }

            tile.style.top = `${boardPadding + row * dynamicTileSlotSize}px`;
            tile.style.left = `${boardPadding + col * dynamicTileSlotSize}px`;
            gameBoard.appendChild(tile);
        }
    }
}

function startGame(mode) {
    gameMode = mode;
    score = 0;
    multiplier = 1;
    level = 1;
    specialMeter = 0;
    badgeContainer.innerHTML = '';

    if (gameMode === 'level') {
        levelContainer.classList.remove('hidden');
        objectiveContainer.classList.remove('hidden');
        movesContainer.classList.remove('hidden');
        timerContainer.classList.add('hidden');
        initializeLevel(level);
    } else { // timeAttack
        levelContainer.classList.add('hidden');
        objectiveContainer.classList.add('hidden');
        movesContainer.classList.add('hidden');
        timerContainer.classList.remove('hidden');
        timeLeft = 60;
        timerElement.textContent = timeLeft;
        timerInterval = setInterval(() => {
            timeLeft--;
            timerElement.textContent = timeLeft;
            if (timeLeft <= 0) {
                handleGameOver();
            }
        }, 1000);
    }

    updateScoreDisplay();
    modeSelectionOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    gameBoard.style.pointerEvents = 'auto';
    initializeBoard();
    shuffleBoard();
}

updateTileDimensions();
window.addEventListener('resize', updateTileDimensions);

levelModeBtn.addEventListener('click', () => startGame('level'));
timeAttackModeBtn.addEventListener('click', () => startGame('timeAttack'));

playAgainBtn.addEventListener('click', () => {
    gameOverOverlay.classList.add('hidden');
    modeSelectionOverlay.classList.remove('hidden');
});

function checkSwapValidity(row1, col1, row2, col2) {
    // Temporarily swap the tiles on the board
    [board[row1][col1], board[row2][col2]] = [board[row2][col2], board[row1][col1]];

    // Check for matches
    const matchInfo = checkForMatches();

    // Swap back to the original state
    [board[row1][col1], board[row2][col2]] = [board[row2][col2], board[row1][col1]];

    // A swap is valid only if it creates a match.
    return matchInfo.toRemove.size > 0;
}

gameBoard.addEventListener('click', async (e) => {
    if (isAnimating) return;
    if (!isMusicPlaying) {
        soundBackground.play();
        isMusicPlaying = true;
    }

    const clickedTileElement = e.target.classList.contains('tile') ? e.target : e.target.parentElement;
    if (!clickedTileElement.classList.contains('tile')) return;

    const row = parseInt(clickedTileElement.dataset.row);
    const col = parseInt(clickedTileElement.dataset.col);

    if (selectedTile) {
        const selectedTileElement = document.querySelector(`.tile[data-row='${selectedTile.row}'][data-col='${selectedTile.col}']`);
        if (selectedTileElement) {
            selectedTileElement.classList.remove('selected');
        }

        if (isAdjacent(row, col, selectedTile.row, selectedTile.col)) {
            const tile1Type = getTileType(selectedTile.row, selectedTile.col);
            const tile2Type = getTileType(row, col);

            let isValidMove = false;
            if (isSpecial(tile1Type) || isSpecial(tile2Type)) {
                isValidMove = true;
            } else {
                isValidMove = checkSwapValidity(row, col, selectedTile.row, selectedTile.col);
            }

            if (isValidMove) {
                isAnimating = true;
                if (gameMode === 'level') {
                    movesLeft--;
                    updateMovesDisplay();
                }

                await swapTiles(row, col, selectedTile.row, selectedTile.col);

                if (isSpecial(tile1Type) && tile1Type.includes('rainbow-bomb')) {
                    const colorToClear = tile2Type.split('-')[0];
                    const tilesToClear = new Set();
                    for (let r = 0; r < boardSize; r++) {
                        for (let c = 0; c < boardSize; c++) {
                            if (getTileType(r, c)?.startsWith(colorToClear)) {
                                tilesToClear.add(`${r}-${c}`);
                            }
                        }
                    }
                    tilesToClear.add(`${row}-${col}`); // Add the rainbow bomb itself
                    await runMatchCycle(tilesToClear, []);
                } else if (isSpecial(tile2Type) && tile2Type.includes('rainbow-bomb')) {
                    const colorToClear = tile1Type.split('-')[0];
                    const tilesToClear = new Set();
                    for (let r = 0; r < boardSize; r++) {
                        for (let c = 0; c < boardSize; c++) {
                            if (getTileType(r, c)?.startsWith(colorToClear)) {
                                tilesToClear.add(`${r}-${c}`);
                            }
                        }
                    }
                    tilesToClear.add(`${selectedTile.row}-${selectedTile.col}`); // Add the rainbow bomb itself
                    await runMatchCycle(tilesToClear, []);
                } else if (isSpecial(tile1Type) && isSpecial(tile2Type)) {
                    const tilesToClear = handleSpecialTileCombination(tile1Type, tile2Type, row, col, selectedTile.row, selectedTile.col);
                    await runMatchCycle(tilesToClear, []);
                } else {
                    await handleMatches(row, col, selectedTile.row, selectedTile.col);
                }

                if (gameMode === 'level' && movesLeft <= 0) {
                    const objectiveMet = (currentObjective.type === 'score' && score >= currentObjective.value) ||
                                         (currentObjective.type === 'clearColor' && objectiveProgress >= currentObjective.count);
                    if (!objectiveMet) {
                        handleGameOver();
                    }
                }
                isAnimating = false;
            }
            selectedTile = null;
        } else {
            selectedTile = { row, col };
            clickedTileElement.classList.add('selected');
        }
    } else {
        selectedTile = { row, col };
        clickedTileElement.classList.add('selected');
    }
});

async function handleMatches(row1, col1, row2, col2) {
    const matchInfo = checkForMatches();
    let tilesToClear = matchInfo.toRemove;

    if (tilesToClear.size === 0) {
        setTimeout(async () => {
            await swapTiles(row1, col1, row2, col2);
            isAnimating = false;
        }, 200);
        return;
    }

    await runMatchCycle(tilesToClear, matchInfo.toCreate);
}

function handleSpecialTileCombination(tile1Type, tile2Type, row1, col1, row2, col2) {
    createSpecialCombinationParticles(boardPadding + col1 * dynamicTileSlotSize + (dynamicTileSize / 2), boardPadding + row1 * dynamicTileSlotSize + (dynamicTileSize / 2));
    let tilesToClear = new Set();
    const color1 = tile1Type.split('-')[0];
    const color2 = tile2Type.split('-')[0];

    if (tile1Type.includes('line-bomb-h') && tile2Type.includes('line-bomb-h')) {
        playSound(soundLineBomb);
        for (let c = 0; c < boardSize; c++) {
            tilesToClear.add(`${row1}-${c}`);
            tilesToClear.add(`${row2}-${c}`);
        }
    } else if (tile1Type.includes('line-bomb-v') && tile2Type.includes('line-bomb-v')) {
        playSound(soundLineBomb);
        for (let r = 0; r < boardSize; r++) {
            tilesToClear.add(`${r}-${col1}`);
            tilesToClear.add(`${r}-${col2}`);
        }
    } else if ((tile1Type.includes('line-bomb-h') && tile2Type.includes('line-bomb-v')) ||
               (tile1Type.includes('line-bomb-v') && tile2Type.includes('line-bomb-h'))) {
        playSound(soundLineBomb);
        const hBombRow = tile1Type.includes('line-bomb-h') ? row1 : row2;
        const vBombCol = tile1Type.includes('line-bomb-v') ? col1 : col2;
        for (let c = 0; c < boardSize; c++) tilesToClear.add(`${hBombRow}-${c}`);
        for (let r = 0; r < boardSize; r++) tilesToClear.add(`${r}-${vBombCol}`);
    } else if ((tile1Type.includes('line-bomb-h') || tile1Type.includes('line-bomb-v')) && tile2Type.includes('bomb')) {
        playSound(soundBomb);
        const lineBombRow = tile1Type.includes('line-bomb-h') ? row1 : row2;
        const lineBombCol = tile1Type.includes('line-bomb-v') ? col1 : col2;
        const bombRow = tile2Type.includes('bomb') ? row2 : row1;
        const bombCol = tile2Type.includes('bomb') ? col2 : col1;

        if (tile1Type.includes('line-bomb-h')) {
            for (let c = 0; c < boardSize; c++) tilesToClear.add(`${lineBombRow}-${c}`);
        } else { 
            for (let r = 0; r < boardSize; r++) tilesToClear.add(`${r}-${lineBombCol}`);
        }

        const tempTilesToBomb = new Set();
        tilesToClear.forEach(pos => {
            const [r, c] = pos.split('-').map(Number);
            for (let br = Math.max(0, r - 1); br <= Math.min(boardSize - 1, r + 1); br++) {
                for (let bc = Math.max(0, c - 1); bc <= Math.min(boardSize - 1, c + 1); bc++) {
                    tempTilesToBomb.add(`${br}-${bc}`);
                }
            }
        });
        tempTilesToBomb.forEach(pos => tilesToClear.add(pos));

    } else if ((tile2Type.includes('line-bomb-h') || tile2Type.includes('line-bomb-v')) && tile1Type.includes('bomb')) {
        playSound(soundBomb);
        const lineBombRow = tile2Type.includes('line-bomb-h') ? row2 : row1;
        const lineBombCol = tile2Type.includes('line-bomb-v') ? col2 : col1;
        const bombRow = tile1Type.includes('bomb') ? row1 : row2;
        const bombCol = tile1Type.includes('bomb') ? col1 : col2;

        if (tile2Type.includes('line-bomb-h')) {
            for (let c = 0; c < boardSize; c++) tilesToClear.add(`${lineBombRow}-${c}`);
        } else { 
            for (let r = 0; r < boardSize; r++) tilesToClear.add(`${r}-${lineBombCol}`);
        }

        const tempTilesToBomb = new Set();
        tilesToClear.forEach(pos => {
            const [r, c] = pos.split('-').map(Number);
            for (let br = Math.max(0, r - 1); br <= Math.min(boardSize - 1, r + 1); br++) {
                for (let bc = Math.max(0, c - 1); bc <= Math.min(boardSize - 1, c + 1); bc++) {
                    tempTilesToBomb.add(`${br}-${bc}`);
                }
            }
        });
        tempTilesToBomb.forEach(pos => tilesToClear.add(pos));
    } else if (tile1Type.includes('bomb') && tile2Type.includes('bomb')) {
        playSound(soundBomb);
        const centerRow = Math.floor((row1 + row2) / 2);
        const centerCol = Math.floor((col1 + col2) / 2);
        const radius = 2;

        for (let r = Math.max(0, centerRow - radius); r <= Math.min(boardSize - 1, centerRow + radius); r++) {
            for (let c = Math.max(0, centerCol - radius); c <= Math.min(boardSize - 1, c + 1); c++) {
                tilesToClear.add(`${r}-${c}`);
            }
        }
    } else if (tile1Type.includes('rainbow-bomb') && tile2Type.includes('bomb')) {
        playSound(soundBomb);
        const bombColor = tile2Type.split('-')[0];
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (board[r][c] && board[r][c].startsWith(bombColor)) {
                    for (let br = Math.max(0, r - 1); br <= Math.min(boardSize - 1, r + 1); br++) {
                        for (let bc = Math.max(0, c - 1); bc <= Math.min(boardSize - 1, c + 1); bc++) {
                            tilesToClear.add(`${br}-${bc}`);
                        }
                    }
                }
            }
        }
    } else if (tile2Type.includes('rainbow-bomb') && tile1Type.includes('bomb')) {
        playSound(soundBomb);
        const bombColor = tile1Type.split('-')[0];
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (board[r][c] && board[r][c].startsWith(bombColor)) {
                    for (let br = Math.max(0, r - 1); br <= Math.min(boardSize - 1, r + 1); br++) {
                        for (let bc = Math.max(0, c - 1); bc <= Math.min(boardSize - 1, c + 1); bc++) {
                            tilesToClear.add(`${br}-${bc}`);
                        }
                    }
                }
            }
        }
    } else if (tile1Type.includes('rainbow-bomb') && (tile2Type.includes('line-bomb-h') || tile2Type.includes('line-bomb-v'))) {
        playSound(soundLineBomb);
        const lineBombColor = tile2Type.split('-')[0];
        const isHorizontal = tile2Type.includes('line-bomb-h');
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (board[r][c] && board[r][c].startsWith(lineBombColor)) {
                    if (isHorizontal) {
                        for (let i = 0; i < boardSize; i++) tilesToClear.add(`${r}-${i}`);
                    } else {
                        for (let i = 0; i < boardSize; i++) tilesToClear.add(`${i}-${c}`);
                    }
                }
            }
        }
    } else if (tile2Type.includes('rainbow-bomb') && (tile1Type.includes('line-bomb-h') || tile1Type.includes('line-bomb-v'))) {
        playSound(soundLineBomb);
        const lineBombColor = tile1Type.split('-')[0];
        const isHorizontal = tile1Type.includes('line-bomb-h');
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (board[r][c] && board[r][c].startsWith(lineBombColor)) {
                    if (isHorizontal) {
                        for (let i = 0; i < boardSize; i++) tilesToClear.add(`${r}-${i}`);
                    } else {
                        for (let i = 0; i < boardSize; i++) tilesToClear.add(`${i}-${c}`);
                    }
                }
            }
        }
    }

    return tilesToClear;
}

function createRandomSpecialTile() {
    const specialTileTypes = ['line-bomb-h', 'line-bomb-v', 'bomb', 'rainbow-bomb'];
    const randomType = specialTileTypes[Math.floor(Math.random() * specialTileTypes.length)];

    const availableTiles = [];
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            if (board[r][c] && !isSpecial(board[r][c])) {
                availableTiles.push({r, c});
            }
        }
    }

    if (availableTiles.length > 0) {
        const randomPos = availableTiles[Math.floor(Math.random() * availableTiles.length)];
        const color = board[randomPos.r][randomPos.c].split('-')[0];
        const newType = randomType === 'rainbow-bomb' ? 'rainbow-bomb' : `${color}-${randomType}`;
        board[randomPos.r][randomPos.c] = newType;

        const tileElement = document.querySelector(`.tile[data-row='${randomPos.r}'][data-col='${randomPos.c}']`);
        if (tileElement) {
            tileElement.innerHTML = '';
            tileElement.className = 'tile';
            tileElement.classList.add('special-tile');
            if (newType.includes('line-bomb-h')) {
                tileElement.classList.add('line-h');
                tileElement.style.backgroundColor = color;
            } else if (newType.includes('line-bomb-v')) {
                tileElement.classList.add('line-v');
                tileElement.style.backgroundColor = color;
            } else if (newType.includes('rainbow-bomb')) {
                tileElement.classList.add('rainbow-bomb');
                tileElement.style.backgroundColor = '';
            } else if (newType.includes('bomb')) {
                tileElement.classList.add('bomb');
                tileElement.style.backgroundColor = color;
            } else {
                tileElement.style.backgroundColor = color;
            }
        }
    }
}



function showScorePopup(score, positions) {
    const popup = document.createElement('div');
    popup.textContent = `+${score}`;
    popup.classList.add('score-popup');

    let totalX = 0;
    let totalY = 0;
    positions.forEach(pos => {
        const [row, col] = pos.split('-').map(Number);
        totalX += boardPadding + col * dynamicTileSlotSize + (dynamicTileSize / 2);
        totalY += boardPadding + row * dynamicTileSlotSize + (dynamicTileSize / 2);
    });
    const centerX = totalX / positions.size;
    const centerY = totalY / positions.size;

    popup.style.left = `${centerX}px`;
    popup.style.top = `${centerY}px`;

    gameBoard.appendChild(popup);

    setTimeout(() => { popup.remove(); }, 1500);
}

function animateScoreUpdate(startScore, endScore) {
    const duration = 500;
    const frameDuration = 1000 / 60;
    const totalFrames = Math.round(duration / frameDuration);
    const scoreIncrement = (endScore - startScore) / totalFrames;
    let currentFrame = 0;
    let currentScore = startScore;

    function update() {
        currentFrame++;
        currentScore += scoreIncrement;
        scoreElement.textContent = Math.round(currentScore);

        if (currentFrame < totalFrames) {
            requestAnimationFrame(update);
        } else {
            scoreElement.textContent = endScore;
        }
    }

    requestAnimationFrame(update);
}

async function runMatchCycle(initialTilesToClear, initialTilesToCreate) {
    let tilesToClear = new Set(initialTilesToClear);
    let tilesToCreate = initialTilesToCreate || [];

    multiplier = 1;
    updateScoreDisplay();

    let active = true;
    let loopCounter = 0;
    const maxLoopIterations = 100; // Add a safeguard against infinite loops

    while (active && loopCounter < maxLoopIterations) {
        loopCounter++;
        if (multiplier > 1) {
            showComboPopup(multiplier);
            gameBoard.classList.add('board-shaking');
            setTimeout(() => {
                gameBoard.classList.remove('board-shaking');
            }, 300);
        }

        const activatedTiles = await activateSpecialTiles(tilesToClear);
        tilesToClear = activatedTiles;

        const points = tilesToClear.size * 10 * multiplier;
        const startScore = score;
        score += points;
        animateScoreUpdate(startScore, score);
        specialMeter += tilesToClear.size;
        updateSpecialMeter();

        if (points > 0) {
            playSound(soundMatch);
            showScorePopup(points, tilesToClear);
        }

        if (gameMode === 'level' && currentObjective.type === 'score') {
            if (score >= currentObjective.value) {
                levelUp();
            }
        } else if (gameMode === 'level' && currentObjective.type === 'clearColor') {
            let clearedColorCount = 0;
            tilesToClear.forEach(pos => {
                const [row, col] = pos.split('-').map(Number);
                const tileType = getTileType(row, col);
                if (tileType && tileType.startsWith(currentObjective.color)) {
                    clearedColorCount++;
                }
            });
            objectiveProgress += clearedColorCount;
            if (objectiveProgress >= currentObjective.count) {
                levelUp();
            }
        }

        if (specialMeter >= specialMeterMax) {
            specialMeter -= specialMeterMax;
            // createRandomSpecialTile(); // Temporarily disabled
            updateSpecialMeter();
        }

        updateScoreDisplay();

        await removeMatches(tilesToClear, tilesToCreate);

        await shiftTilesDown();
        await fillNewTiles();

        const nextMatchInfo = checkForMatches();
        if (nextMatchInfo.toRemove.size > 0) {
            tilesToClear = nextMatchInfo.toRemove;
            tilesToCreate = nextMatchInfo.toCreate;
            multiplier++;
        } else {
            active = false;
        }
    }
    if (loopCounter >= maxLoopIterations) {
        console.warn("runMatchCycle exited due to reaching max iterations. This might indicate an issue.");
    }
    multiplier = 1;

    if (!checkForPossibleMoves()) {
        handleGameOver();
    }
    isAnimating = false;
}

function levelUp() {
    addBadge(level);
    level++;
    initializeLevel(level);
    showLevelUpPopup();
}

function addBadge(level) {
    const badge = document.createElement('div');
    badge.classList.add('badge');
    badge.textContent = '🏆'; // Use a trophy emoji
    badge.title = `Level ${level} Cleared`; // Add a tooltip for clarity
    badgeContainer.appendChild(badge);
}

async function activateSpecialTiles(tilesToClear) {
    let newTilesFound = true;
    while(newTilesFound) {
        newTilesFound = false;
        const currentTiles = [...tilesToClear];
        for (const tilePos of currentTiles) {
            const [row, col] = tilePos.split('-').map(Number);
            const tileType = getTileType(row, col);

            if (isSpecial(tileType)) {
                let affectedTiles = [];
                if (tileType.includes('line-bomb-h')) {
                    playSound(soundLineBomb);
                    for (let c = 0; c < boardSize; c++) affectedTiles.push(`${row}-${c}`);
                } else if (tileType.includes('line-bomb-v')) {
                    playSound(soundLineBomb);
                    for (let r = 0; r < boardSize; r++) affectedTiles.push(`${r}-${col}`);
                } else if (tileType.includes('bomb')) {
                    playSound(soundBomb);
                    for (let r = Math.max(0, row - 1); r <= Math.min(boardSize - 1, row + 1); r++) {
                        for (let c = Math.max(0, col - 1); c <= Math.min(boardSize - 1, c + 1); c++) {
                            affectedTiles.push(`${r}-${c}`);
                        }
                    }
                } else if (tileType.includes('rainbow-bomb')) {
                    playSound(soundRainbowBomb);
                    const randomColor = tileTypes[Math.floor(Math.random() * tileTypes.length)];
                    for (let r = 0; r < boardSize; r++) {
                        for (let c = 0; c < boardSize; c++) {
                            if (getTileType(r, c)?.startsWith(randomColor)) {
                                affectedTiles.push(`${r}-${c}`);
                            }
                        }
                    }
                }

                for (const affected of affectedTiles) {
                    if (!tilesToClear.has(affected)) {
                        tilesToClear.add(affected);
                        newTilesFound = true;
                    }
                }
            }
        }
    }
    return tilesToClear;
}

function createParticles(x, y, color) {
    const particleCount = 20;
    const gameBoardWidth = gameBoard.offsetWidth;
    const gameBoardHeight = gameBoard.offsetHeight;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.backgroundColor = color;
        const size = Math.random() * 10 + 5;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${(x / gameBoardWidth) * 100}%`;
        particle.style.top = `${(y / gameBoardHeight) * 100}%`;
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * 40 + 20;
        particle.style.setProperty('--x', `${((x + Math.cos(angle) * distance) / gameBoardWidth) * 100}%`);
        particle.style.setProperty('--y', `${((y + Math.sin(angle) * distance) / gameBoardHeight) * 100}%`);
        gameBoard.appendChild(particle);
        setTimeout(() => { particle.remove(); }, 800);
    }
}

function createSpecialCombinationParticles(x, y) {
    const particleCount = 50;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 15 + 5;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * 80 + 40;
        particle.style.setProperty('--x', `${x + Math.cos(angle) * distance}px`);
        particle.style.setProperty('--y', `${y + Math.sin(angle) * distance}px`);
        gameBoard.appendChild(particle);
        setTimeout(() => { particle.remove(); }, 1200);
    }

    const shockwave = document.createElement('div');
    shockwave.classList.add('shockwave');
    shockwave.style.left = `${x}px`;
    shockwave.style.top = `${y}px`;
    gameBoard.appendChild(shockwave);
    setTimeout(() => { shockwave.remove(); }, 500);
}

function removeMatches(tilesToRemove, tilesToCreate) {
    const specialPositions = new Set((tilesToCreate || []).map(st => `${st.pos.row}-${st.pos.col}`));

    tilesToRemove.forEach(pos => {
        const [row, col] = pos.split('-').map(Number);
        const tile = document.querySelector(`.tile[data-row='${row}'][data-col='${col}']`);

        if (specialPositions.has(pos)) {
            // This is a special tile, update it
            const st = tilesToCreate.find(st => st.pos.row == row && st.pos.col == col);
            if (tile && st) {
                const newType = st.type === 'rainbow-bomb' ? 'rainbow-bomb' : `${st.color}-${st.type}`;
                board[row][col] = newType;
                tile.innerHTML = '';
                tile.className = 'tile'; // Reset class
                tile.classList.add('special-tile');

                if (st.type === 'line-bomb-h') {
                    tile.classList.add('line-h');
                    tile.style.backgroundColor = st.color;
                } else if (st.type === 'line-bomb-v') {
                    tile.classList.add('line-v');
                    tile.style.backgroundColor = st.color;
                } else if (st.type === 'rainbow-bomb') {
                    tile.classList.add('rainbow-bomb');
                    tile.style.backgroundColor = '';
                } else if (st.type === 'bomb') {
                    tile.classList.add('bomb');
                    tile.style.backgroundColor = st.color;
                }
            }
        } else {
            // This is a normal tile, remove it
            if (tile) {
                createParticles(boardPadding + col * dynamicTileSlotSize + (dynamicTileSize / 2), boardPadding + row * dynamicTileSlotSize + (dynamicTileSize / 2), tile.style.backgroundColor);
                tile.classList.add('disappearing');
                board[row][col] = null;
            }
        }
    });

    return new Promise(resolve => setTimeout(() => {
        document.querySelectorAll('.disappearing').forEach(tile => tile.remove());
        resolve();
    }, 300));
}

async function shiftTilesDown() {
    for (let col = 0; col < boardSize; col++) {
        let emptySpaces = 0;
        for (let row = boardSize - 1; row >= 0; row--) {
            if (board[row][col] === null) {
                emptySpaces++;
            } else if (emptySpaces > 0) {
                const tileElement = document.querySelector(`.tile[data-row='${row}'][data-col='${col}']`);
                if (tileElement) {
                    const newRow = row + emptySpaces;
                    board[newRow][col] = board[row][col];
                    board[row][col] = null;
                    tileElement.dataset.row = newRow;
                    tileElement.style.top = `${boardPadding + newRow * dynamicTileSlotSize}px`;
                }
            }
        }
    }
    return new Promise(res => setTimeout(res, 300));
}

async function fillNewTiles() {
    const promises = [];
    for (let col = 0; col < boardSize; col++) {
        for (let row = boardSize - 1; row >= 0; row--) {
            if (board[row][col] === null) {
                const newTileType = tileTypes[Math.floor(Math.random() * tileTypes.length)];
                board[row][col] = newTileType;
                const tile = document.createElement('div');
                tile.classList.add('tile');
                tile.style.backgroundColor = newTileType;
                tile.dataset.row = row;
                tile.dataset.col = col;
                tile.style.width = `${dynamicTileSize}px`;
                tile.style.height = `${dynamicTileSize}px`;
                tile.style.left = `${boardPadding + col * dynamicTileSlotSize}px`;
                tile.style.top = `-${dynamicTileSize}px`;
                gameBoard.appendChild(tile);
                
                const promise = new Promise(res => setTimeout(() => {
                    tile.style.top = `${boardPadding + row * dynamicTileSlotSize}px`;
                    res();
                }, 200));
                promises.push(promise);
            }
        }
    }
    await Promise.all(promises);
}

function checkForMatches() {
    const toRemove = new Set();
    const toCreate = [];
    const colorBoard = board.map(row => row.map(tile => tile ? tile.split('-')[0] : null));
    
    // Find L and T shapes first
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            if (!colorBoard[r][c]) continue;

            const centerColor = colorBoard[r][c];
            const hMatch = [{r, c}];
            // Check right
            for (let i = c + 1; i < boardSize && colorBoard[r][i] === centerColor; i++) hMatch.push({r, c: i});
            // Check left
            for (let i = c - 1; i >= 0 && colorBoard[r][i] === centerColor; i--) hMatch.unshift({r, c: i});

            const vMatch = [{r, c}];
            // Check down
            for (let i = r + 1; i < boardSize && colorBoard[i][c] === centerColor; i++) vMatch.push({r: i, c});
            // Check up
            for (let i = r - 1; i >= 0 && colorBoard[i][c] === centerColor; i--) vMatch.unshift({r: i, c});

            if (hMatch.length >= 3 && vMatch.length >= 3) {
                hMatch.forEach(p => toRemove.add(`${p.r}-${p.c}`));
                vMatch.forEach(p => toRemove.add(`${p.r}-${p.c}`));
                toCreate.push({ pos: { row: r, col: c }, color: centerColor, type: 'bomb' });
            }
        }
    }

    // Find straight line matches, avoiding tiles already part of a bomb
    const visited = Array(boardSize).fill(false).map(() => Array(boardSize).fill(false));
    toRemove.forEach(pos => {
        const [r, c] = pos.split('-').map(Number);
        visited[r][c] = true;
    });

    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            if (!colorBoard[r][c] || visited[r][c]) continue;

            const hMatch = [];
            for (let i = c; i < boardSize && colorBoard[r][i] === colorBoard[r][c]; i++) hMatch.push({r, c: i});

            if (hMatch.length >= 3) {
                hMatch.forEach(p => toRemove.add(`${p.r}-${p.c}`));
                if (hMatch.length >= 5) {
                    toCreate.push({ pos: { row: r, col: c + 2 }, color: colorBoard[r][c], type: 'rainbow-bomb' });
                } else if (hMatch.length === 4) {
                    toCreate.push({ pos: { row: r, col: c + 1 }, color: colorBoard[r][c], type: 'line-bomb-h' });
                }
                hMatch.forEach(p => visited[p.r][p.c] = true);
            }
        }
    }
    
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            if (!colorBoard[r][c] || visited[r][c]) continue;

            const vMatch = [];
            for (let i = r; i < boardSize && colorBoard[i][c] === colorBoard[r][c]; i++) vMatch.push({r: i, c});

            if (vMatch.length >= 3) {
                vMatch.forEach(p => toRemove.add(`${p.r}-${p.c}`));
                if (vMatch.length >= 5) {
                    toCreate.push({ pos: { row: r + 2, col: c }, color: colorBoard[r][c], type: 'rainbow-bomb' });
                } else if (vMatch.length === 4) {
                    toCreate.push({ pos: { row: r + 1, col: c }, color: colorBoard[r][c], type: 'line-bomb-v' });
                }
                vMatch.forEach(p => visited[p.r][p.c] = true);
            }
        }
    }
    return { toRemove, toCreate };
}

function getTileType(row, col) {
    return board[row] ? board[row][col] : null;
}

function isSpecial(tileType) {
    return tileType && (tileType.includes('-') || tileType === 'rainbow-bomb');
}

function isAdjacent(row1, col1, row2, col2) {
    const rowDiff = Math.abs(row1 - row2);
    const colDiff = Math.abs(col1 - col2);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

async function swapTiles(row1, col1, row2, col2) {
    playSound(soundSwap);
    const tile1 = document.querySelector(`.tile[data-row='${row1}'][data-col='${col1}']`);
    const tile2 = document.querySelector(`.tile[data-row='${row2}'][data-col='${col2}']`);

    const tempType = board[row1][col1];
    board[row1][col1] = board[row2][col2];
    board[row2][col2] = tempType;

    if (tile1 && tile2) {
        const tile1Top = tile1.style.top;
        const tile1Left = tile1.style.left;
        tile1.style.top = tile2.style.top;
        tile1.style.left = tile2.style.left;
        tile2.style.top = tile1Top;
        tile2.style.left = tile1Left;

        const tempRow = tile1.dataset.row;
        tile1.dataset.row = tile2.dataset.row;
        tile2.dataset.row = tempRow;

        const tempCol = tile1.dataset.col;
        tile1.dataset.col = tile2.dataset.col;
        tile2.dataset.col = tempCol;
    }

    return new Promise(resolve => setTimeout(resolve, 300));
}
