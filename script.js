
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

const levels = [
    { level: 1, objective: { type: 'score', value: 1000 } },
    { level: 2, objective: { type: 'clearColor', color: 'red', count: 30 } },
    { level: 3, objective: { type: 'clearColor', color: 'blue', count: 40 } },
    { level: 4, objective: { type: 'score', value: 5000 } },
    { level: 5, objective: { type: 'clearColor', color: 'green', count: 50 } },
];

let currentObjective = {};
let objectiveProgress = 0;

function initializeLevel(level) {
    const levelData = levels.find(l => l.level === level);
    if (levelData) {
        currentObjective = levelData.objective;
    } else {
        currentObjective = { type: 'score', value: Math.floor(1000 * Math.pow(1.5, level - 1)) };
    }
    objectiveProgress = 0;
    updateObjectiveDisplay();
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

    if (gameMode === 'level') {
        levelContainer.classList.remove('hidden');
        objectiveContainer.classList.remove('hidden');
        timerContainer.classList.add('hidden');
        initializeLevel(level);
    } else { // timeAttack
        levelContainer.classList.add('hidden');
        objectiveContainer.classList.add('hidden');
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

gameBoard.addEventListener('click', async (e) => {
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
        selectedTileElement.classList.remove('selected');

        if (isAdjacent(row, col, selectedTile.row, selectedTile.col)) {
            await swapTiles(row, col, selectedTile.row, selectedTile.col);
            await handleMatches(row, col, selectedTile.row, selectedTile.col);
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
    const tile1Type = getTileType(row1, col1);
    const tile2Type = getTileType(row2, col2);

    if (tile1Type === 'rainbow-bomb' && tile2Type === 'rainbow-bomb') {
        playSound(soundRainbowBomb);
        createSpecialCombinationParticles(boardPadding + col1 * dynamicTileSlotSize + (dynamicTileSize / 2), boardPadding + row1 * dynamicTileSlotSize + (dynamicTileSize / 2));
        let tilesToClear = new Set();
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                tilesToClear.add(`${r}-${c}`);
            }
        }
        await runMatchCycle(tilesToClear);
        return;
    }

    if (tile1Type === 'rainbow-bomb' || tile2Type === 'rainbow-bomb') {
        playSound(soundRainbowBomb);
        createSpecialCombinationParticles(boardPadding + col1 * dynamicTileSlotSize + (dynamicTileSize / 2), boardPadding + row1 * dynamicTileSlotSize + (dynamicTileSize / 2));
        const rainbowBomb = tile1Type === 'rainbow-bomb' ? {r: row1, c: col1} : {r: row2, c: col2};
        const otherTileColor = tile1Type === 'rainbow-bomb' ? board[row2][col2].split('-')[0] : board[row1][col1].split('-')[0];
        
        let tilesToClear = new Set([`${rainbowBomb.r}-${rainbowBomb.c}`]);
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (board[r][c] && board[r][c].startsWith(otherTileColor)) {
                    tilesToClear.add(`${r}-${c}`);
                }
            }
        }
        await runMatchCycle(tilesToClear);
        return;
    }

    if (isSpecial(tile1Type) && isSpecial(tile2Type)) {
        const combinedTilesToClear = handleSpecialTileCombination(tile1Type, tile2Type, row1, col1, row2, col2);
        if (combinedTilesToClear.size > 0) {
            board[row1][col1] = null;
            board[row2][col2] = null;
            await runMatchCycle(combinedTilesToClear);
            return;
        }
    }

    const matchInfo = checkForMatches();
    let tilesToClear = matchInfo.toRemove;

    if (tilesToClear.size === 0) {
        setTimeout(async () => { await swapTiles(row1, col1, row2, col2); }, 200);
        return;
    }

    const swappedTile1Pos = `${row1}-${col1}`;
    const swappedTile2Pos = `${row2}-${col2}`;
    let creationPos = null;
    if (tilesToClear.has(swappedTile1Pos)) {
        creationPos = {row: row1, col: col1};
    } else if (tilesToClear.has(swappedTile2Pos)) {
        creationPos = {row: row2, col: col2};
    }

    if (!creationPos && matchInfo.toCreate.length > 0) {
        const firstMatchPos = tilesToClear.values().next().value;
        const [row, col] = firstMatchPos.split('-').map(Number);
        creationPos = { row, col };
    }

    matchInfo.toCreate.forEach(st => st.pos = creationPos);

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

function createSpecialTiles(tilesToCreate) {
    if (!tilesToCreate || tilesToCreate.length === 0) return;

    tilesToCreate.forEach(st => {
        if (st.pos) {
            const { row, col } = st.pos;
            const newType = st.type === 'rainbow-bomb' ? 'rainbow-bomb' : `${st.color}-${st.type}`;
            board[row][col] = newType;

            const tileElement = document.querySelector(`.tile[data-row='${row}'][data-col='${col}']`);
            if(tileElement) {
                tileElement.innerHTML = '';
                tileElement.className = 'tile';
                tileElement.classList.add('special-tile');
                if (newType.includes('line-bomb-h')) {
                    tileElement.classList.add('line-h');
                    tileElement.style.backgroundColor = st.color;
                } else if (newType.includes('line-bomb-v')) {
                    tileElement.classList.add('line-v');
                    tileElement.style.backgroundColor = st.color;
                } else if (newType.includes('rainbow-bomb')) {
                    tileElement.classList.add('rainbow-bomb');
                    tileElement.style.backgroundColor = '';
                } else if (newType.includes('bomb')) {
                    tileElement.classList.add('bomb');
                    tileElement.style.backgroundColor = st.color;
                } else {
                    tileElement.style.backgroundColor = st.color;
                }
            }
        }
    });
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

async function runMatchCycle(initialTilesToClear, specialTilesToCreate = []) {
    let tilesToClear = new Set(initialTilesToClear);

    multiplier = 1;
    updateScoreDisplay();

    let active = true;
    while (active) {
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
            createRandomSpecialTile();
            updateSpecialMeter();
        }

        updateScoreDisplay();

        const creationPositions = new Set();
        if (specialTilesToCreate.length > 0 && specialTilesToCreate[0].pos) {
             specialTilesToCreate.forEach(st => creationPositions.add(`${st.pos.row}-${st.pos.col}`));
        }
        const finalTilesToRemove = new Set([...tilesToClear].filter(pos => !creationPositions.has(pos)));

        await removeMatches(finalTilesToRemove);
        await createSpecialTiles(specialTilesToCreate);
        specialTilesToCreate = [];

        await shiftTilesDown();
        await fillNewTiles();

        const nextMatchInfo = checkForMatches();
        if (nextMatchInfo.toRemove.size > 0) {
            tilesToClear = nextMatchInfo.toRemove;
            specialTilesToCreate = nextMatchInfo.toCreate;
            if (specialTilesToCreate.length > 0) {
                let cascadeCreationPos = null;
                for (const pos of tilesToClear) {
                    const [r, c] = pos.split('-').map(Number);
                    if (!isSpecial(board[r][c])) {
                        cascadeCreationPos = { row: r, col: c };
                        break;
                    }
                }
                if (!cascadeCreationPos) {
                    const firstMatchPos = tilesToClear.values().next().value;
                    const [row, col] = firstMatchPos.split('-').map(Number);
                    cascadeCreationPos = { row, col };
                }
                specialTilesToCreate.forEach(st => st.pos = cascadeCreationPos);
            }
            multiplier++;
        } else {
            active = false;
        }
    }
    multiplier = 1;

    if (!checkForPossibleMoves()) {
        handleGameOver();
    }
}

function levelUp() {
    level++;
    initializeLevel(level);
    showLevelUpPopup();
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

function removeMatches(tilesToRemove) {
    tilesToRemove.forEach(pos => {
        const [row, col] = pos.split('-').map(Number);
        const tile = document.querySelector(`.tile[data-row='${row}'][data-col='${col}']`);
        if (tile) {
            createParticles(boardPadding + col * dynamicTileSlotSize + (dynamicTileSize / 2), boardPadding + row * dynamicTileSlotSize + (dynamicTileSize / 2), tile.style.backgroundColor);
            tile.classList.add('disappearing');
            board[row][col] = null;
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

    const horizontalChains = [];
    const verticalChains = [];

    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize - 2; c++) {
            if (!colorBoard[r][c]) continue;
            let chain = [{r,c}];
            for (let k = c + 1; k < boardSize; k++) {
                if (colorBoard[r][k] === colorBoard[r][c]) chain.push({r,c:k});
                else break;
            }
            if (chain.length >= 3) {
                horizontalChains.push(chain);
                c += chain.length - 1;
            }
        }
    }

    for (let c = 0; c < boardSize; c++) {
        for (let r = 0; r < boardSize - 2; r++) {
            if (!colorBoard[r][c]) continue;
            let chain = [{r,c}];
            for (let k = r + 1; k < boardSize; k++) {
                if (colorBoard[k][c] === colorBoard[r][c]) chain.push({r:k,c});
                else break;
            }
            if (chain.length >= 3) {
                verticalChains.push(chain);
                r += chain.length - 1;
            }
        }
    }

    const allChains = [...horizontalChains, ...verticalChains];
    const processedChains = new Set();

    for (const hChain of horizontalChains) {
        for (const vChain of verticalChains) {
            const hSet = new Set(hChain.map(p => `${p.r}-${p.c}`));
            const vSet = new Set(vChain.map(p => `${p.r}-${p.c}`));
            const intersection = new Set([...hSet].filter(x => vSet.has(x)));
            if (intersection.size > 0) {
                const color = colorBoard[hChain[0].r][hChain[0].c];
                toCreate.push({type: 'bomb', color: color});
                const hChainStr = hChain.map(p => `${p.r}-${p.c}`).join(',');
                const vChainStr = vChain.map(p => `${p.r}-${p.c}`).join(',');
                processedChains.add(hChainStr);
                processedChains.add(vChainStr);
            }
        }
    }

    for (const chain of allChains) {
        const chainString = chain.map(p => `${p.r}-${p.c}`).join(',');
        if (processedChains.has(chainString)) continue;

        const color = colorBoard[chain[0].r][chain[0].c];
        if (chain.length === 4) {
            const type = horizontalChains.some(c => c.map(p => `${p.r}-${p.c}`).join(',') === chainString) ? 'line-bomb-h' : 'line-bomb-v';
            toCreate.push({type, color});
        } else if (chain.length >= 5) {
            toCreate.push({type: 'rainbow-bomb', color: 'rainbow'});
        }
    }
    
    allChains.forEach(chain => {
        chain.forEach(p => {
            toRemove.add(`${p.r}-${p.c}`);
        });
    });

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
