// Game variables
const gameMode = localStorage.getItem('gameMode') || '0';
const nr_players = parseInt(localStorage.getItem('nr_players')) || 4;
const modeNames = ['Easy', 'Medium', 'Hard'];

// Validate number of players
if (nr_players < 2 || nr_players > 6) {
    localStorage.setItem('nr_players', '4'); // Reset to default if invalid
    window.location.reload();
}

// Game state variables
let currentRoundDice = [];
let userDice = [];
let isGameStarted = false;
let isPanelOpen = false;
let playerStates = [];
let diceArray = []; // 2D array for all players' dice
let currentPlayer = 0; // Current player's turn (0-based index)
let currentBet = {
    quantity: 1,
    value: 1
};
let lastBet = {
    quantity: 0,
    value: 0,
    player: null
};
let min_amm = 1;
let isFirstTurn = true;
let messageHistory = [];
let gameMessage = ""; // Add this new variable for game messages
let playerScore = 0;
let challengeOutcomePanel = null;
let closeChallengeBtn = null;

function initializePlayerStates() {
    playerStates = [];
    for (let i = 0; i < nr_players; i++) {
        playerStates.push({
            id: i + 1,
            nr_dice: 5,
            eliminated: false
        });
    }
    localStorage.setItem('playerStates', JSON.stringify(playerStates));
}

function calculateEllipsePositions(numPlayers, width, height) {
    const positions = [];
    const a = width / 2 - 25;  // Horizontal radius
    const b = height / 2 - 25; // Vertical radius
    
    const centerX = width / 2;
    const centerY = height / 2;
    
    const baseAngle = (2 * Math.PI) / numPlayers;
    
    // Special handling for 2 and 3 players
    if (numPlayers === 2) {
        // Player 1 at top, Player 2 at bottom
        positions.push({ x: centerX, y: centerY - b }); // Player 1
        positions.push({ x: centerX, y: centerY + b }); // Player 2
    } else if (numPlayers === 3) {
        // Player 1 at top left, Player 2 at bottom, Player 3 at top right
        positions.push({ x: centerX - a, y: centerY - b/2 }); // Player 1
        positions.push({ x: centerX, y: centerY + b });       // Player 2
        positions.push({ x: centerX + a, y: centerY - b/2 }); // Player 3
    } else {
        // For 4+ players, use the original circular distribution
        const rotationOffset = Math.PI/2 - baseAngle;
        for (let i = 0; i < numPlayers; i++) {
            const angle = (i * baseAngle) + rotationOffset;
            const x = centerX + a * Math.cos(angle);
            const y = centerY + b * Math.sin(angle);
            positions.push({ x, y });
        }
    }
    
    return positions;
}

function createPlayerPositions() {
    const container = document.querySelector('.game-ellipse-container');
    const positions = calculateEllipsePositions(nr_players, 600, 300);
    
    positions.forEach((pos, index) => {
        // Create player position element
        const playerDiv = document.createElement('div');
        playerDiv.id = `player${index + 1}`;
        playerDiv.className = 'player-position';
        playerDiv.style.left = `${pos.x}px`;
        playerDiv.style.top = `${pos.y}px`;
        playerDiv.style.backgroundImage = `url('Assets/Players/${index + 1}.png')`;
        container.appendChild(playerDiv);
        
        // Calculate center of ellipse
        const centerX = 300; // Half of container width
        const centerY = 150; // Half of container height
        
        // Calculate vector from center to player
        const dx = pos.x - centerX;
        const dy = pos.y - centerY;
        
        // Calculate point at 40% of the distance from player to center
        const diceLineX = pos.x - (dx * 0.4);
        const diceLineY = pos.y - (dy * 0.4);
        
        // Create dice container
        const diceContainer = document.createElement('div');
        diceContainer.className = 'player-dice-container';
        diceContainer.style.left = `${diceLineX}px`;
        diceContainer.style.top = `${diceLineY}px`;
        
        // Create 5 dice in a horizontal line
        for (let i = 0; i < 5; i++) {
            const diceElement = document.createElement('div');
            diceElement.className = 'player-dice';
            diceElement.dataset.index = i; // Add data attribute for tracking
            diceContainer.appendChild(diceElement);
        }
        
        container.appendChild(diceContainer);
    });
}

function updateDisplay() {
    // Update player positions and dice
    for (let i = 0; i < nr_players; i++) {
        const playerElement = document.getElementById(`player${i + 1}`);
        if (playerElement) {
            // Update player image based on elimination status
            playerElement.style.backgroundImage = `url('Assets/Players/${i + 1}${playerStates[i].eliminated ? 'b' : ''}.png')`;
            
            // Update dice display
            const diceContainer = playerElement.nextElementSibling;
            if (diceContainer && diceContainer.classList.contains('player-dice-container')) {
                const diceElements = diceContainer.querySelectorAll('.player-dice');
                // Update visibility of dice based on player's remaining dice
                diceElements.forEach((dice, index) => {
                    if (index < playerStates[i].nr_dice) {
                        dice.classList.remove('fade-out');
                    } else {
                        dice.classList.add('fade-out');
                    }
                });
            }
        }
    }
    
    // Update current player highlight
    updateCurrentPlayerHighlight();
    
    // Update user's dice display
    updateUserDiceDisplay();
}

function updateUserDiceDisplay() {
    const diceRow = document.querySelector('.dice-row');
    const diceImages = diceRow.querySelectorAll('img');
    
    // Get the user's dice (player 2)
    const userDice = diceArray[1].filter(d => d > 0);
    
    // Update each dice image
    userDice.forEach((value, index) => {
        if (index < diceImages.length) {
            updateDiceImage(diceImages[index], value);
        }
    });
    
    // Hide remaining dice images if user has less than 5 dice
    for (let i = userDice.length; i < 5; i++) {
        if (i < diceImages.length) {
            diceImages[i].style.visibility = 'hidden';
        }
    }
}

function updateDiceImage(element, value) {
    if (element) {
        element.src = `Assets/dice_img/dice_${value}.png`;
        element.alt = value;
        element.style.visibility = 'visible';
    }
}

function eliminatePlayer(playerId) {
    const playerState = playerStates.find(state => state.id === playerId);
    if (playerState) {
        playerState.nr_dice = 0;
        playerState.eliminated = true;
        createPlayerPositions(); // Refresh the display
    }
}

function updatePlayerDice(playerId, newDiceCount) {
    const playerState = playerStates.find(state => state.id === playerId);
    if (playerState) {
        playerState.nr_dice = Math.max(0, newDiceCount);
        if (playerState.nr_dice === 0) {
            playerState.eliminated = true;
        }
        createPlayerPositions(); // Refresh the display
    }
}

function updateGameMode(value) {
    localStorage.setItem('gameMode', value);
    window.location.reload();
}

function updatePlayers(value) {
    const newValue = parseInt(value);
    if (newValue >= 2 && newValue <= 6) {
        localStorage.setItem('nr_players', value);
        // Reset game if it's in progress
        if (isGameStarted) {
            endGame();
        }
        window.location.reload();
    }
}

function setInitialStates() {
    document.querySelector(`input[name="settings-mode"][value="${gameMode}"]`).checked = true;
    document.querySelector(`input[name="settings-players"][value="${nr_players}"]`).checked = true;
}

function updateBetDisplay() {
    const betBoxes = document.querySelectorAll('.bet-content');
    const yourBetBoxes = betBoxes[1]; // Second bet-content div (Your Bet)
    
    if (yourBetBoxes) {
        const quantityBox = yourBetBoxes.querySelector('.bet-box-large:first-child');
        const valueBox = yourBetBoxes.querySelector('.bet-box-large:last-child img');
        
        if (quantityBox && valueBox) {
            quantityBox.textContent = currentBet.quantity;
            valueBox.src = `Assets/dice_img/dice_${currentBet.value}.png`;
            valueBox.alt = currentBet.value;
        }
    }
}

function updateLastBetDisplay() {
    const betBoxes = document.querySelectorAll('.bet-content');
    const lastBetBoxes = betBoxes[0]; // First bet-content div (Last Bet)
    
    if (lastBetBoxes) {
        const quantityBox = lastBetBoxes.querySelector('.bet-box-large:first-child');
        const valueBox = lastBetBoxes.querySelector('.bet-box-large:last-child img');
        
        if (quantityBox && valueBox) {
            quantityBox.textContent = lastBet.quantity || '0';
            if (lastBet.value) {
                valueBox.src = `Assets/dice_img/dice_${lastBet.value}.png`;
                valueBox.alt = lastBet.value;
            } else {
                valueBox.src = 'Assets/dice_img/dice_1.png';
                valueBox.alt = '1';
            }
        }
    }
}

function handleKeyPress(event) {
    if (!isGameStarted) return;
    if (currentPlayer !== 1) return; // Only allow keyboard input when it's the user's turn

    const key = event.key.toLowerCase();
    let valueChanged = false;

    switch (key) {
        case 'w':
        case 'arrowup':
            if (currentBet.quantity < 20) {
                currentBet.quantity = Math.max(min_amm, currentBet.quantity + 1);
                valueChanged = true;
            }
            break;
        case 's':
        case 'arrowdown':
            if (currentBet.quantity > min_amm) {
                currentBet.quantity--;
                valueChanged = true;
            }
            break;
        case 'd':
        case 'arrowright':
            currentBet.value = currentBet.value === 6 ? 1 : currentBet.value + 1;
            valueChanged = true;
            break;
        case 'a':
        case 'arrowleft':
            currentBet.value = currentBet.value === 1 ? 6 : currentBet.value - 1;
            valueChanged = true;
            break;
        case 'enter':
            if (isFirstTurn || currentBet.quantity >= min_amm) {
                bet(currentPlayer + 1, currentBet.quantity, currentBet.value);
            }
            break;
        case ' ': // Space bar for Spot On
            if (!isFirstTurn) {
                spot_on(currentPlayer + 1);
            }
            break;
        case 'x': // X key for Doubt
            if (!isFirstTurn) {
                doubt(currentPlayer + 1);
            }
            break;
    }

    if (valueChanged) {
        updateBetDisplay();
    }
}

function updateGameMessage(message) {
    gameMessage = message;
    messageHistory.push(message); // Add to end of array
    if (messageHistory.length > 3) {
        messageHistory.shift(); // Remove from start of array
    }
    
    const messageList = document.getElementById('messageList');
    if (messageList) {
        messageList.innerHTML = messageHistory
            .map(msg => `<div>${msg}</div>`)
            .join('');
    }
}

function updateActionButtons() {
    const betButton = document.getElementById('betBtn');
    const spotOnButton = document.getElementById('spotOnBtn');
    const doubtButton = document.getElementById('doubtBtn');
    
    if (betButton && spotOnButton && doubtButton) {
        // First, handle if it's not the user's turn
        if (currentPlayer !== 1 || !isGameStarted) {
            betButton.style.opacity = '0.5';
            spotOnButton.style.opacity = '0.5';
            doubtButton.style.opacity = '0.5';
            betButton.style.cursor = 'not-allowed';
            spotOnButton.style.cursor = 'not-allowed';
            doubtButton.style.cursor = 'not-allowed';
            betButton.disabled = true;
            spotOnButton.disabled = true;
            doubtButton.disabled = true;
            return;
        }

        // It's the user's turn, enable bet button
        betButton.style.opacity = '1';
        betButton.style.cursor = 'pointer';
        betButton.disabled = false;

        // Handle Spot On and Doubt buttons based on isFirstTurn
        if (isFirstTurn) {
            spotOnButton.style.opacity = '0.5';
            doubtButton.style.opacity = '0.5';
            spotOnButton.style.cursor = 'not-allowed';
            doubtButton.style.cursor = 'not-allowed';
            spotOnButton.disabled = true;
            doubtButton.disabled = true;
        } else {
            spotOnButton.style.opacity = '1';
            doubtButton.style.opacity = '1';
            spotOnButton.style.cursor = 'pointer';
            doubtButton.style.cursor = 'pointer';
            spotOnButton.disabled = false;
            doubtButton.disabled = false;
        }
    }
}

function bet(playerId, quantity, value) {
    console.log(`=== Bet Attempt: Player ${playerId} ===`);
    // Validate the bet
    if (quantity < min_amm) {
        console.log(`Bet rejected: quantity ${quantity} is less than minimum ${min_amm}`);
        return false;
    }
    
    // Check if it's the player's turn
    if (playerId - 1 !== currentPlayer) {
        console.log(`Bet rejected: not player ${playerId}'s turn`);
        return false;
    }

    console.log(`Bet accepted: ${quantity} × ${value}`);
    // Update last bet
    lastBet = {
        quantity: quantity,
        value: value,
        player: playerId
    };

    // Update minimum amount
    min_amm = quantity;
    console.log(`New minimum amount: ${min_amm}`);

    // Update display
    updateLastBetDisplay();
    updateGameMessage(`Player ${playerId} bet there are ${quantity} dice(s) × ${value} point(s)`);
    
    isFirstTurn = false;
    updateActionButtons();
    nextPlayer();
    return true;
}

function updateCurrentPlayerHighlight() {
    // Remove any existing highlights
    const existingHighlights = document.querySelectorAll('.player-highlight');
    existingHighlights.forEach(highlight => highlight.remove());
    
    // Add highlight to current player if they're not eliminated
    if (!playerStates[currentPlayer].eliminated) {
        const currentPlayerElement = document.getElementById(`player${currentPlayer + 1}`);
        if (currentPlayerElement) {
            const highlight = document.createElement('div');
            highlight.className = 'player-highlight';
            highlight.style.left = currentPlayerElement.style.left;
            highlight.style.top = currentPlayerElement.style.top;
            currentPlayerElement.parentNode.appendChild(highlight);
        }
    }
}

function nextPlayer() {
    let nextPlayerIndex = (currentPlayer + 1) % nr_players;
    
    // Find next non-eliminated player
    while (playerStates[nextPlayerIndex].eliminated) {
        nextPlayerIndex = (nextPlayerIndex + 1) % nr_players;
        if (nextPlayerIndex === currentPlayer) {
            // If we've looped back to current player, game is over
            endGame();
            return;
        }
    }
    
    currentPlayer = nextPlayerIndex;
    localStorage.setItem('currentPlayer', currentPlayer.toString());
    updateDisplay();
    updateActionButtons();
    
    // If it's not the user's turn (player 2), simulate bot move
    if (currentPlayer !== 1 && !playerStates[currentPlayer].eliminated) {
        setTimeout(handleBotTurn, 1000);
    }
}

// Helper function to calculate factorial
function factorial(n) {
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

// Helper function to calculate combination (n choose k)
function combination(n, k) {
    return factorial(n) / (factorial(k) * factorial(n - k));
}

// Helper function to calculate binomial probability
function binomialProbability(n, k, p) {
    return combination(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

// Helper function to calculate cumulative binomial probability
function cumulativeBinomialProbability(n, k, p) {
    let sum = 0;
    for (let i = k; i <= n; i++) {
        sum += binomialProbability(n, i, p);
    }
    return sum;
}

function makeBotDecision(botDice, totalDice, currentBid) {
    // If it's the first turn, make a strategic initial bet
    if (isFirstTurn) {
        // Count occurrences of each face in bot's dice
        const faceCounts = {};
        botDice.forEach(face => {
            faceCounts[face] = (faceCounts[face] || 0) + 1;
        });
        
        // Find the most common face
        let bestFace = 1;
        let maxCount = 0;
        for (const face in faceCounts) {
            if (faceCounts[face] > maxCount) {
                maxCount = faceCounts[face];
                bestFace = parseInt(face);
            }
        }
        
        // Make an aggressive first bet based on the most common face
        const initialQuantity = Math.max(2, Math.ceil(maxCount * 1.5));
        return { action: "bet", quantity: initialQuantity, face: bestFace };
    }

    // For subsequent turns, use advanced probability analysis
    const m = botDice.filter(d => d === currentBid.face).length;
    const u = totalDice - botDice.length;
    const x = currentBid.count - m;
    
    // If we already have enough matching dice, always raise
    if (x <= 0) {
        return "raise";
    }

    // Calculate probabilities
    const p = 1/6; // Base probability
    const p_exact = binomialProbability(u, x, p);
    const p_at_least = cumulativeBinomialProbability(u, x, p);
    
    // Calculate expected value of the current bid
    const expectedValue = p_at_least * currentBid.count;
    
    // Calculate risk factor based on remaining dice
    const riskFactor = botDice.length / totalDice;
    
    // Calculate bluff factor based on game state
    const bluffFactor = Math.min(1, currentBid.count / (totalDice * 0.3));
    
    // Advanced decision making
    if (gameMode === '2') { // Hard mode
        // If we have strong evidence the bid is wrong
        if (p_at_least < 0.2 && riskFactor > 0.3) {
            return "dudo";
        }
        
        // If we have a very high chance of exact match
        if (p_exact > 0.5 && p_at_least < 0.7) {
            return "calzo";
        }
        
        // If the current bid is very risky and we have few dice
        if (riskFactor < 0.3 && bluffFactor > 0.8) {
            return "dudo";
        }
        
        // If we have a strong hand and the bid is reasonable
        if (m >= 2 && p_at_least > 0.6) {
            return "raise";
        }
        
        // Calculate optimal raise strategy
        const optimalRaise = Math.ceil(currentBid.count * (1 + (1 - p_at_least)));
        if (optimalRaise <= totalDice * 0.6) {
            return "raise";
        }
        
        // If we're in a risky position but have a good chance
        if (p_at_least > 0.4 && riskFactor > 0.4) {
            const random = Math.random();
            if (random < 0.7) return "raise";
            if (random < 0.85) return "dudo";
            return "calzo";
        }
        
        // Default to a weighted random choice based on probabilities
        const random = Math.random();
        if (random < p_at_least * 0.8) return "raise";
        if (random < p_at_least * 0.8 + (1 - p_at_least) * 0.6) return "dudo";
        return "calzo";
    }
    
    // For medium and easy modes, keep the existing logic
    if (p_exact > 0.4 && p_at_least < 0.6) {
        return "calzo";
    } else if (p_at_least < 0.3) {
        return "dudo";
    } else if (p_at_least > 0.6) {
        return "raise";
    } else {
        const random = Math.random();
        if (random < 0.6) return "raise";
        if (random < 0.8) return "dudo";
        return "calzo";
    }
}

function handleBotTurn() {
    if (!isGameStarted || currentPlayer === 1 || playerStates[currentPlayer].eliminated) {
        return;
    }

    const botDice = diceArray[currentPlayer].filter(d => d > 0);
    const totalDice = playerStates.reduce((sum, state) => sum + (state.eliminated ? 0 : state.nr_dice), 0);
    
    if (lastBet.quantity === 0) {
        // First bet: Make a strategic bet based on own dice
        const diceCounts = {};
        botDice.forEach(d => diceCounts[d] = (diceCounts[d] || 0) + 1);
        
        // Find the value with highest count, preferring higher numbers
        const bestValue = Object.entries(diceCounts)
            .sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
        
        currentBet.quantity = Math.ceil(totalDice * 0.2);
        currentBet.value = parseInt(bestValue);
        bet(currentPlayer + 1, currentBet.quantity, currentBet.value);
    } else {
        let decision;
        if (gameMode === '0') { // Easy mode - random decisions
            const random = Math.random();
            if (random < 0.3) {
                decision = "dudo";
            } else if (random < 0.6) {
                decision = "calzo";
            } else {
                decision = "raise";
            }
        } else { // Medium mode - use probability-based decisions
            decision = makeBotDecision(botDice, totalDice, {
                count: lastBet.quantity,
                face: lastBet.value
            });
        }

        switch (decision) {
            case "dudo":
                doubt(currentPlayer + 1);
                break;
            case "calzo":
                spot_on(currentPlayer + 1);
                break;
            case "raise":
                // Increase either quantity or value
                if (Math.random() < 0.5) {
                    currentBet.quantity = lastBet.quantity + 1;
                    currentBet.value = lastBet.value;
                } else {
                    currentBet.quantity = lastBet.quantity;
                    currentBet.value = Math.min(6, lastBet.value + 1);
                }
                bet(currentPlayer + 1, currentBet.quantity, currentBet.value);
                break;
        }
    }
}

function generateRandomStart() {
    // Initialize 2D array for dice
    diceArray = Array(nr_players).fill().map(() => Array(5).fill(0));
    
    // Generate random dice for each player
    for (let i = 0; i < nr_players; i++) {
        const playerState = playerStates[i];
        if (!playerState.eliminated) {
            for (let j = 0; j < playerState.nr_dice; j++) {
                diceArray[i][j] = Math.floor(Math.random() * 6) + 1;
            }
        }
    }
    
    // Store dice in localStorage
    localStorage.setItem('diceArray', JSON.stringify(diceArray));
    
    // Log all players' dice
    console.log("=== Starting New Game ===");
    for (let i = 0; i < nr_players; i++) {
        if (!playerStates[i].eliminated) {
            console.log(`Player ${i + 1} dice:`, diceArray[i].filter(d => d > 0));
        }
    }
    
    // Select random first player (not eliminated)
    do {
        currentPlayer = Math.floor(Math.random() * nr_players);
    } while (playerStates[currentPlayer].eliminated);
    
    localStorage.setItem('currentPlayer', currentPlayer.toString());
    
    // Update display
    updateDisplay();
    updateActionButtons();
}

function generate_random() {
    console.log("=== Starting New Round ===");
    // Keep existing dice counts but generate new random values
    for (let i = 0; i < nr_players; i++) {
        if (!playerStates[i].eliminated) {
            const playerDice = diceArray[i];
            for (let j = 0; j < 5; j++) {
                if (j < playerStates[i].nr_dice) {
                    playerDice[j] = Math.floor(Math.random() * 6) + 1;
                }
                // Keep 0s for lost dice
            }
            console.log(`Player ${i + 1} new dice:`, playerDice);
        }
    }

    // Store updated dice data
    localStorage.setItem('diceData', JSON.stringify(diceArray));
    
    // Randomly select first player for new round
    do {
        currentPlayer = Math.floor(Math.random() * nr_players);
    } while (playerStates[currentPlayer].eliminated);
    
    console.log(`First player for new round: Player ${currentPlayer + 1}`);
}

function startNewRound() {
    console.log("Resetting round state...");
    // Reset betting state
    min_amm = 1;
    isFirstTurn = true;
    lastBet = {
        quantity: 0,
        value: 0,
        player: null
    };
    currentBet = {
        quantity: 1,
        value: 1
    };

    // Generate new dice values and select first player
    generate_random();
    
    // Update displays
    updateDisplay();
    updateBetDisplay();
    updateLastBetDisplay();
    updateActionButtons();
    updateGameMessage("New round started!");

    // If first player is a bot, trigger their turn
    if (currentPlayer !== 1) {
        console.log("First player of new round is a bot, initiating bot turn...");
        handleBotTurn();
    } else {
        console.log("First player of new round is human");
    }
}

function spot_on(playerId) {
    if (isFirstTurn) {
        console.log("Cannot call Spot On on the first turn");
        return false;
    }

    if (!lastBet.player) {
        console.log("No bet to check");
        return false;
    }

    let counter = 0;
    // Count matching dice across all players
    for (let playerDice of diceArray) {
        for (let diceValue of playerDice) {
            if (diceValue === lastBet.value) {
                counter++;
            }
        }
    }

    const isCorrect = counter === lastBet.quantity;
    const message = `Player ${playerId} chose Spot On and was ${isCorrect ? 'Right' : 'Wrong'}`;
    
    if (isCorrect) {
        // All other players lose one die
        playerStates.forEach((state, index) => {
            if (state.id !== playerId && !state.eliminated && state.nr_dice > 0) {
                removeDieFromPlayer(index);
            }
        });
    } else {
        // Calling player loses one die
        removeDieFromPlayer(playerId - 1);
    }

    // Update displays
    updateGameMessage(message);
    createPlayerPositions();
    localStorage.setItem('diceData', JSON.stringify(diceArray));
    localStorage.setItem('playerStates', JSON.stringify(playerStates));

    // Start new round with new dice values
    startNewRound();
    return true;
}

function doubt(playerId) {
    if (isFirstTurn) {
        console.log("Cannot doubt on the first turn");
        return false;
    }

    if (!lastBet.player) {
        console.log("No bet to doubt");
        return false;
    }

    let counter = 0;
    // Count matching dice across all players
    for (let playerDice of diceArray) {
        for (let diceValue of playerDice) {
            if (diceValue === lastBet.value) {
                counter++;
            }
        }
    }

    const isWrong = counter >= lastBet.quantity;
    const message = `Player ${playerId} doubted the last bet and was ${isWrong ? 'Wrong' : 'Right'}`;
    
    if (isWrong) {
        // Doubting player loses one die
        removeDieFromPlayer(playerId - 1);
    } else {
        // Previous player loses one die
        removeDieFromPlayer(lastBet.player - 1);
    }

    // Update displays
    updateGameMessage(message);
    createPlayerPositions();
    localStorage.setItem('diceData', JSON.stringify(diceArray));
    localStorage.setItem('playerStates', JSON.stringify(playerStates));

    // Start new round with new dice values
    startNewRound();
    return true;
}

function formatScore(score) {
    // Ensure score is within range [-99999, 99999]
    score = Math.max(-99999, Math.min(99999, score));
    
    // Format with leading zeros and handle negative numbers
    const isNegative = score < 0;
    const absScore = Math.abs(score);
    const paddedScore = String(absScore).padStart(5, '0');
    return (isNegative ? '-' : '') + paddedScore;
}

function updateScoreDisplay() {
    const scoreElement = document.getElementById('scoreValue');
    if (scoreElement) {
        scoreElement.textContent = formatScore(playerScore);
    }
}

function calculateGameScore(isWin, remainingDice) {
    const totalDice = nr_players * 5;
    const P = gameMode === '0' ? 20 : (gameMode === '1' ? 200 : 1000);
    
    if (isWin) {
        return P;
    } else {
        const M = remainingDice;
        return Math.floor(P * (M/totalDice - 0.5));
    }
}

function checkGameEnd() {
    // Check if user (player 2) has lost all dice
    if (playerStates[1].nr_dice === 0) {
        const scoreChange = calculateGameScore(false, playerStates[1].nr_dice);
        updateScore(scoreChange);
        displayGameOverMessage("You Lost", "#FF4444");
        endGame();
        return true;
    }

    // Check if user is the only player remaining
    const activePlayers = playerStates.filter(state => !state.eliminated).length;
    if (activePlayers === 1 && !playerStates[1].eliminated) {
        const scoreChange = calculateGameScore(true, playerStates[1].nr_dice);
        updateScore(scoreChange);
        displayGameOverMessage("You Won", "#FFD700");
        endGame();
        return true;
    }

    return false;
}

function displayGameOverMessage(message, color) {
    const gameStatusMessage = document.getElementById('gameStatusMessage');
    gameStatusMessage.textContent = message;
    gameStatusMessage.style.color = color;
    gameStatusMessage.classList.add('visible');
    
    // Remove the message after 3 seconds
    setTimeout(() => {
        gameStatusMessage.classList.remove('visible');
    }, 3000);
}

function removeDieFromPlayer(playerIndex) {
    if (!playerStates[playerIndex].eliminated && playerStates[playerIndex].nr_dice > 0) {
        // Find the last non-zero dice and set it to 0
        const playerDice = diceArray[playerIndex];
        for (let i = playerDice.length - 1; i >= 0; i--) {
            if (playerDice[i] !== 0) {
                playerDice[i] = 0;
                break;
            }
        }
        playerStates[playerIndex].nr_dice--;
        
        // Get the dice display elements
        const playerElement = document.getElementById(`player${playerIndex + 1}`);
        if (playerElement) {
            const diceContainer = playerElement.nextElementSibling;
            if (diceContainer && diceContainer.classList.contains('player-dice-container')) {
                const diceElements = diceContainer.querySelectorAll('.player-dice');
                // Find the last visible dice and fade it out
                for (let i = diceElements.length - 1; i >= 0; i--) {
                    if (!diceElements[i].classList.contains('fade-out')) {
                        diceElements[i].classList.add('fade-out');
                        break;
                    }
                }
            }
        }

        if (playerStates[playerIndex].nr_dice === 0) {
            playerStates[playerIndex].eliminated = true;
            // Display elimination message for bots
            if (playerIndex !== 1) { // Don't show message for user
                displayGameOverMessage(`Player ${playerIndex + 1} was eliminated`, '#FF4444');
            }
            // Check if game should end after elimination
            checkGameEnd();
        }
    }
}

function endGame() {
    isGameStarted = false;
    document.getElementById('gameToggle').textContent = 'Start Game';
    document.getElementById('gameToggle').style.backgroundColor = '#4CAF50';
    updateActionButtons();
    
    // The game over message will be automatically removed after 3 seconds
    // by the displayGameOverMessage function
}

function initializeScore() {
    // Check if score exists in localStorage
    const savedScore = localStorage.getItem('perudoScore');
    if (savedScore === null) {
        // First time visiting the page
        playerScore = 0;
        localStorage.setItem('perudoScore', '0');
    } else {
        // Load existing score
        playerScore = parseInt(savedScore);
    }
    updateScoreDisplay();
}

function updateScore(points) {
    playerScore += points;
    localStorage.setItem('perudoScore', playerScore.toString());
    updateScoreDisplay();
}

function initializeChallengeOutcome() {
    challengeOutcomePanel = document.getElementById('challengeOutcome');
    closeChallengeBtn = document.getElementById('closeChallengeBtn');
    
    if (closeChallengeBtn) {
        closeChallengeBtn.addEventListener('click', () => {
            challengeOutcomePanel.classList.remove('visible');
        });
    }
}

function showChallengeOutcome(challengeType, isCorrect, allDice, targetValue, targetQuantity) {
    const resultText = document.getElementById('challengeResult');
    const diceGrid = document.getElementById('challengeDiceGrid');
    const summaryText = document.getElementById('challengeSummary');
    
    // Clear previous content
    diceGrid.innerHTML = '';
    
    // Set the result text
    if (challengeType === 'doubt') {
        resultText.textContent = isCorrect ? 'Doubt Successful!' : 'Doubt Failed!';
        resultText.style.color = isCorrect ? '#4CAF50' : '#FF4444';
    } else {
        resultText.textContent = isCorrect ? 'Spot On! Perfect Guess!' : 'Spot On Failed!';
        resultText.style.color = isCorrect ? '#4CAF50' : '#FF4444';
    }
    
    // Count matching dice
    const matchingDice = allDice.filter(die => die === targetValue).length;
    
    // Create dice elements with staggered animation
    allDice.forEach((die, index) => {
        const diceElement = document.createElement('div');
        diceElement.className = 'challenge-dice';
        diceElement.style.setProperty('--index', index);
        const img = document.createElement('img');
        img.src = `Assets/dice_img/dice_${die}.png`;
        img.alt = die;
        diceElement.appendChild(img);
        diceGrid.appendChild(diceElement);
    });
    
    // Set the summary text
    if (challengeType === 'doubt') {
        summaryText.textContent = `There ${matchingDice === 1 ? 'is' : 'are'} ${matchingDice} ${targetValue}${matchingDice === 1 ? '' : 's'} in total. ` +
            `The bid was for ${targetQuantity} ${targetValue}${targetQuantity === 1 ? '' : 's'}.`;
    } else {
        summaryText.textContent = `There ${matchingDice === 1 ? 'is' : 'are'} ${matchingDice} ${targetValue}${matchingDice === 1 ? '' : 's'} in total. ` +
            `The bid was for exactly ${targetQuantity} ${targetValue}${targetQuantity === 1 ? '' : 's'}.`;
    }
    
    // Show the panel
    challengeOutcomePanel.classList.add('visible');
}

function handleDoubt() {
    if (doubtBtn.disabled) return;
    
    const allDice = getAllDice();
    const matchingDice = allDice.filter(die => die === lastBet.value).length;
    const isCorrect = matchingDice < lastBet.quantity;
    
    // Show the challenge outcome
    showChallengeOutcome('doubt', isCorrect, allDice, lastBet.value, lastBet.quantity);
    
    // Wait for the user to close the challenge outcome before proceeding
    const waitForClose = () => {
        if (!challengeOutcomePanel.classList.contains('visible')) {
            // Process the doubt result
            if (isCorrect) {
                // Previous player loses a die
                removeDieFromPlayer(lastBet.player - 1);
                updateGameMessage(`Player ${lastBet.player} lost a die!`);
            } else {
                // Current player loses a die
                removeDieFromPlayer(currentPlayer);
                updateGameMessage(`Player ${currentPlayer + 1} lost a die!`);
            }
            
            // Start new round
            startNewRound();
        } else {
            setTimeout(waitForClose, 100);
        }
    };
    waitForClose();
}

function handleSpotOn() {
    if (spotOnBtn.disabled) return;
    
    const allDice = getAllDice();
    const matchingDice = allDice.filter(die => die === lastBet.value).length;
    const isCorrect = matchingDice === lastBet.quantity;
    
    // Show the challenge outcome
    showChallengeOutcome('spotOn', isCorrect, allDice, lastBet.value, lastBet.quantity);
    
    // Wait for the user to close the challenge outcome before proceeding
    const waitForClose = () => {
        if (!challengeOutcomePanel.classList.contains('visible')) {
            // Process the spot on result
            if (isCorrect) {
                // All other players lose a die
                for (let i = 0; i < nr_players; i++) {
                    if (i !== currentPlayer && !playerStates[i].eliminated) {
                        removeDieFromPlayer(i);
                    }
                }
                updateGameMessage(`All other players lost a die!`);
            } else {
                // Current player loses a die
                removeDieFromPlayer(currentPlayer);
                updateGameMessage(`Player ${currentPlayer + 1} lost a die!`);
            }
            
            // Start new round
            startNewRound();
        } else {
            setTimeout(waitForClose, 100);
        }
    };
    waitForClose();
}

function getAllDice() {
    const allDice = [];
    players.forEach(player => {
        if (!player.eliminated) {
            allDice.push(...player.dice);
        }
    });
    return allDice;
}

// Initialize when the window loads and when it's resized
window.onload = function() {
    console.log("=== Initializing Game ===");
    initializeScore();
    initializePlayerStates();
    createPlayerPositions();
    setInitialStates();
    updateActionButtons();
    initializeChallengeOutcome();
    
    console.log("Setting up event listeners...");
    // Add settings panel toggle functionality
    const settingsToggle = document.getElementById('settingsToggle');
    const settingsPanel = document.querySelector('.settings-panel');
    const gameToggle = document.getElementById('gameToggle');
    const betButton = document.getElementById('betBtn');
    const spotOnButton = document.getElementById('spotOnBtn');
    const doubtButton = document.getElementById('doubtBtn');
    const resetScoreBtn = document.getElementById('resetScoreBtn');
    const rulesButton = document.getElementById('rulesButton');
    const rulesPanel = document.getElementById('rulesPanel');
    const closeRulesBtn = document.getElementById('closeRulesBtn');

    // Add score reset functionality
    if (resetScoreBtn) {
        resetScoreBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset your score to 0?')) {
                playerScore = 0;
                localStorage.setItem('perudoScore', '0');
                updateScoreDisplay();
            }
        });
    }

    // Add rules panel functionality
    if (rulesButton && rulesPanel && closeRulesBtn) {
        rulesButton.addEventListener('click', () => {
            rulesPanel.classList.add('visible');
        });

        closeRulesBtn.addEventListener('click', () => {
            rulesPanel.classList.remove('visible');
        });

        // Close rules panel when clicking outside
        document.addEventListener('click', (event) => {
            if (rulesPanel.classList.contains('visible') && 
                !rulesPanel.contains(event.target) && 
                event.target !== rulesButton) {
                rulesPanel.classList.remove('visible');
            }
        });
    }

    // Add button event listeners
    if (betButton) {
        betButton.addEventListener('click', () => {
            console.log("Bet button clicked");
            if (!betButton.disabled) {
                bet(2, currentBet.quantity, currentBet.value);
            }
        });
    }

    if (spotOnButton) {
        spotOnButton.addEventListener('click', () => {
            console.log("Spot On button clicked");
            if (!spotOnButton.disabled) {
                spot_on(2);
            }
        });
    }

    if (doubtButton) {
        doubtButton.addEventListener('click', () => {
            console.log("Doubt button clicked");
            if (!doubtButton.disabled) {
                doubt(2);
            }
        });
    }

    if (settingsToggle && settingsPanel) {
        settingsToggle.addEventListener('click', () => {
            console.log("Settings toggle clicked");
            isPanelOpen = !isPanelOpen;
            settingsPanel.classList.toggle('open', isPanelOpen);
            if (isPanelOpen) {
                settingsPanel.style.visibility = 'visible';
            } else {
                setTimeout(() => {
                    if (!isPanelOpen) {
                        settingsPanel.style.visibility = 'hidden';
                    }
                }, 300);
            }
        });
    }

    if (gameToggle) {
        gameToggle.addEventListener('click', () => {
            console.log("Game toggle clicked");
            isGameStarted = !isGameStarted;
            gameToggle.textContent = isGameStarted ? 'End Game' : 'Start Game';
            gameToggle.style.backgroundColor = isGameStarted ? '#FF4444' : '#4CAF50';
            
            if (isGameStarted) {
                console.log("Starting new game...");
                generateRandomStart();
                if (currentPlayer !== 1) {
                    console.log("First player is a bot, initiating bot turn...");
                    handleBotTurn();
                }
            } else {
                console.log("Ending game...");
                // Clear game state
                const diceSquares = document.querySelectorAll('.inner-square');
                diceSquares.forEach(square => {
                    square.textContent = '';
                });
                const players = document.querySelectorAll('.player-position');
                players.forEach(player => player.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)');
                messageHistory = [];
                updateGameMessage('Game ended');
            }
        });
    }

    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyPress);
    console.log("Initialization complete");
};

window.onresize = createPlayerPositions; 