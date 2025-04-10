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
let isPaused = false;
let isPauseTransitioning = false;
let lastPauseToggle = 0;
const PAUSE_COOLDOWN = 500; // 500ms cooldown between pause toggles
let lastBotDelay = 0;

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
    
    // Clear existing player elements
    const existingPlayers = container.querySelectorAll('.player-container');
    existingPlayers.forEach(element => element.remove());
    
    const positions = calculateEllipsePositions(nr_players, 600, 300);
    
    positions.forEach((pos, index) => {
        // Create main player container
        const playerContainer = document.createElement('div');
        playerContainer.className = 'player-container';
        playerContainer.id = `player${index + 1}-container`;
        playerContainer.style.left = `${pos.x}px`;
        playerContainer.style.top = `${pos.y}px`;
        
        // Create profile section
        const profileSection = document.createElement('div');
        profileSection.className = 'player-profile';
        
        // Create player icon
        const playerIcon = document.createElement('div');
        playerIcon.className = 'player-icon';
        playerIcon.style.backgroundImage = `url('Assets/Players/${index + 1}.png')`;
        
        // Create highlight
        const highlight = document.createElement('div');
        highlight.className = 'player-highlight';
        
        // Add icon and highlight to profile section
        profileSection.appendChild(playerIcon);
        profileSection.appendChild(highlight);
        
        // Create dice section
        const diceSection = document.createElement('div');
        diceSection.className = 'player-dice-section';
        
        // Create 5 dice elements with proper initial state
        for (let i = 0; i < 5; i++) {
            const dice = document.createElement('div');
            dice.className = 'player-dice';
            // Set initial visibility based on player's dice count
            if (i >= playerStates[index].nr_dice) {
                dice.classList.add('fade-out');
            }
            diceSection.appendChild(dice);
        }
        
        // Add sections to container
        playerContainer.appendChild(profileSection);
        playerContainer.appendChild(diceSection);
        
        // Add container to game
        container.appendChild(playerContainer);
    });
}

function updateDisplay() {
    console.log("=== Updating Display ===");
    // Update player positions and dice
    for (let i = 0; i < nr_players; i++) {
        const playerContainer = document.getElementById(`player${i + 1}-container`);
        if (playerContainer) {
            // Update player image based on elimination status
            const playerIcon = playerContainer.querySelector('.player-icon');
            if (playerIcon) {
                const playerImage = playerStates[i].eliminated ? `${i + 1}b` : `${i + 1}`;
                playerIcon.style.backgroundImage = `url('Assets/Players/${playerImage}.png')`;
            }
            
            // Update dice display
            const diceSection = playerContainer.querySelector('.player-dice-section');
            if (diceSection) {
                const diceElements = diceSection.querySelectorAll('.player-dice');
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
    if (element && element.tagName === 'IMG') {
        element.src = `Assets/dice_img/dice_${value}.png`;
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
        const quantityBox = yourBetBoxes.querySelector('.bet-box-number');
        const valueBox = yourBetBoxes.querySelector('.bet-box-large img');
        
        if (quantityBox && valueBox) {
            quantityBox.textContent = currentBet.quantity;
            valueBox.src = `Assets/dice_img/dice_${currentBet.value}.png`;
            valueBox.alt = currentBet.value;
        }
    }
}

function updateLastBetDisplay() {
    const lastBetSection = document.querySelector('.utility-section:first-child .bet-content');
    
    if (lastBetSection) {
        const quantityBox = lastBetSection.querySelector('.bet-box-number');
        const valueBox = lastBetSection.querySelector('.bet-box-large img');
        
        if (quantityBox && valueBox) {
            quantityBox.textContent = lastBet.quantity || '0';
            valueBox.src = `Assets/dice_img/dice_${lastBet.value || 1}.png`;
            valueBox.alt = lastBet.value || '1';
        }
    }
}

function handleKeyPress(event) {
    if (!isGameStarted) return;
    
    // Add pause functionality with 'P' key
    if (event.key.toLowerCase() === 'p') {
        togglePauseMenu();
        return;
    }
    
    if (isPaused) return;
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
    const messageList = document.getElementById('messageList');
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    
    // Add new message to the list
    messageList.appendChild(messageElement);
    
    // Store message in history
    messageHistory.push(message);
    
    // Keep only the last 50 messages in history
    if (messageHistory.length > 50) {
        messageHistory.shift();
    }
    
    // Only scroll to bottom if user hasn't manually scrolled up
    const isNearBottom = messageList.scrollHeight - messageList.scrollTop <= messageList.clientHeight + 50;
    if (isNearBottom) {
        // Use requestAnimationFrame for smooth scrolling
        requestAnimationFrame(() => {
            messageList.scrollTop = messageList.scrollHeight;
        });
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

    // Check if the bet is exactly the same as the last bet
    if (lastBet.quantity === quantity && lastBet.value === value) {
        console.log(`Bet rejected: cannot make the exact same bet as the last bet`);
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
    // Remove highlight from all players
    const highlights = document.querySelectorAll('.player-highlight');
    highlights.forEach(highlight => {
        highlight.classList.remove('active');
    });
    
    // Hide all progress bars
    const progressBars = document.querySelectorAll('.player-progress-bar');
    progressBars.forEach(bar => {
        bar.style.display = 'none';
    });
    
    // If game is started, show highlight for current player
    if (isGameStarted) {
        const currentPlayerElement = document.querySelector(`#player${currentPlayer + 1}-container .player-highlight`);
        if (currentPlayerElement) {
            currentPlayerElement.classList.add('active');
        }
    }
}

function nextPlayer() {
    const previousPlayer = currentPlayer;
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
    
    // Update all players' dice squares
    for (let i = 0; i < nr_players; i++) {
        updatePlayerDiceSquares(i);
    }
    
    updateDisplay();
    updateActionButtons();
    
    // If it's not the user's turn (player 2), simulate bot move
    if (currentPlayer !== 1 && !playerStates[currentPlayer].eliminated) {
        handleBotTurn();
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
    if (isPaused) return;
    
    // Check if it's not the user's turn and the current player is not eliminated
    if (currentPlayer !== 1 && !playerStates[currentPlayer].eliminated) {
        // Generate a new random delay different from the last one
        let randomDelay;
        do {
            randomDelay = 200 + Math.random() * 800; // Random delay between 200ms and 1000ms
        } while (Math.abs(randomDelay - lastBotDelay) < 100); // Ensure at least 100ms difference
        
        lastBotDelay = randomDelay;
        const totalDelay = 1000 + randomDelay; // Base 1.0s + random delay (0.2-1.0s)
        
        setTimeout(() => {
            if (isPaused) return;
            
            const botAction = getBotAction();
            switch (botAction.type) {
                case 'bet':
                    bet(currentPlayer + 1, botAction.quantity, botAction.value);
                    break;
                case 'doubt':
                    doubt(currentPlayer + 1);
                    break;
                case 'spot_on':
                    spot_on(currentPlayer + 1);
                    break;
            }
        }, totalDelay);
    }
}

function generateRandomStart() {
    console.log("=== Starting New Game ===");
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
    for (let i = 0; i < nr_players; i++) {
        if (!playerStates[i].eliminated) {
            console.log(`Player ${i + 1} dice:`, diceArray[i].filter(d => d > 0));
        }
    }
    
    // Start with player 1 (index 0) and find the first non-eliminated player
    currentPlayer = 0;
    while (playerStates[currentPlayer].eliminated) {
        currentPlayer = (currentPlayer + 1) % nr_players;
    }
    
    localStorage.setItem('currentPlayer', currentPlayer.toString());
    
    // Trigger dice animation for all players
    rollDice();
    
    // Update display after animation completes
    setTimeout(() => {
        updateDisplay();
        updateActionButtons();
    }, 1000); // Wait for animation to complete
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
            }
            console.log(`Player ${i + 1} new dice:`, playerDice);
        }
    }

    // Store updated dice data
    localStorage.setItem('diceData', JSON.stringify(diceArray));
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

    // Generate new dice values
    generate_random();
    
    // Set the next player as the one after the last action taker
    if (lastBet.player) {
        // Start with the player after the last action taker
        let nextPlayer = (lastBet.player - 1) % nr_players;
        
        // Find the next non-eliminated player
        do {
            nextPlayer = (nextPlayer + 1) % nr_players;
            // If we've looped through all players, break to avoid infinite loop
            if (nextPlayer === (lastBet.player - 1) % nr_players) {
                break;
            }
        } while (playerStates[nextPlayer].eliminated);
        
        currentPlayer = nextPlayer;
    } else {
        // If no last bet (first round), start with the next player after current
        let nextPlayer = currentPlayer;
        do {
            nextPlayer = (nextPlayer + 1) % nr_players;
            // If we've looped through all players, break to avoid infinite loop
            if (nextPlayer === currentPlayer) {
                break;
            }
        } while (playerStates[nextPlayer].eliminated);
        currentPlayer = nextPlayer;
    }
    
    console.log(`First player for new round: Player ${currentPlayer + 1}`);
    
    // Trigger dice animation
    rollDice();
    
    // Update displays after animation completes
    setTimeout(() => {
        updateDisplay();
        updateBetDisplay();
        updateLastBetDisplay();
        updateActionButtons();
        updateGameMessage("New round started!");
    }, 1000); // Wait for animation to complete

    // If first player is a bot, trigger their turn after animation
    if (currentPlayer !== 1) {
        setTimeout(() => {
            console.log("First player of new round is a bot, initiating bot turn...");
            handleBotTurn();
        }, 1000);
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

function updatePlayerDiceSquares(playerIndex) {
    const playerContainer = document.querySelector(`#player${playerIndex + 1}-container`);
    if (playerContainer) {
        const diceSection = playerContainer.querySelector('.player-dice-section');
        if (diceSection) {
            const diceElements = diceSection.querySelectorAll('.player-dice');
            const currentDiceCount = playerStates[playerIndex].nr_dice;
            
            // Update visibility of each dice square
            diceElements.forEach((dice, index) => {
                if (index < currentDiceCount) {
                    dice.classList.remove('fade-out');
                } else {
                    dice.classList.add('fade-out');
                }
            });
        }
    }
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
        
        // Get the player's dice section and update visibility
        const playerContainer = document.querySelector(`#player${playerIndex + 1}-container`);
        if (playerContainer) {
            const diceSection = playerContainer.querySelector('.player-dice-section');
            if (diceSection) {
                const diceElements = diceSection.querySelectorAll('.player-dice');
                // Update visibility of all dice
                diceElements.forEach((dice, index) => {
                    if (index < playerStates[playerIndex].nr_dice) {
                        dice.classList.remove('fade-out');
                    } else {
                        dice.classList.add('fade-out');
                    }
                });
            }
        }

        if (playerStates[playerIndex].nr_dice === 0) {
            playerStates[playerIndex].eliminated = true;
            
            // Update player icon to black version
            const playerIcon = document.querySelector(`#player${playerIndex + 1}-container .player-icon`);
            if (playerIcon) {
                playerIcon.style.backgroundImage = `url('Assets/Players/${playerIndex + 1}b.png')`;
            }
            
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
    
    // Reset all players' dice count to 5
    playerStates.forEach(state => {
        state.nr_dice = 5;
        state.eliminated = false;
    });
    
    // Clear the dice array
    diceArray = Array(nr_players).fill().map(() => Array(5).fill(0));
    
    // Update display
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

function rollDice() {
    const diceElements = document.querySelectorAll('.bet-box-dice img');
    const userDiceCount = playerStates[1].nr_dice; // Get the number of dice the user has (player 2)
    
    // Reset all dice containers first
    diceElements.forEach((dice, index) => {
        const container = dice.parentElement;
        container.style.display = 'flex'; // Always show the container
        container.classList.remove('rolling');
        
        if (index < userDiceCount) {
            // Show and animate dice that the user has
            dice.style.visibility = 'visible';
            container.classList.add('rolling');
            let frame = 0;
            const interval = setInterval(() => {
                if (frame < 10) {
                    const randomValue = Math.floor(Math.random() * 6) + 1;
                    dice.src = `Assets/dice_img/dice_${randomValue}.png`;
                    frame++;
                } else {
                    clearInterval(interval);
                    container.classList.remove('rolling');
                    const finalValue = Math.floor(Math.random() * 6) + 1;
                    dice.src = `Assets/dice_img/dice_${finalValue}.png`;
                }
            }, 50);
        } else {
            // Hide dice image but keep container visible
            dice.style.visibility = 'hidden';
        }
    });

    // Update player states and dice containers for all players
    for (let i = 0; i < nr_players; i++) {
        const playerContainer = document.getElementById(`player${i + 1}-container`);
        if (playerContainer) {
            // Update player image based on elimination status
            const playerIcon = playerContainer.querySelector('.player-icon');
            if (playerIcon) {
                const playerImage = playerStates[i].eliminated ? `${i + 1}b` : `${i + 1}`;
                playerIcon.style.backgroundImage = `url('Assets/Players/${playerImage}.png')`;
            }
            
            // Update dice display
            const diceSection = playerContainer.querySelector('.player-dice-section');
            if (diceSection) {
                const diceElements = diceSection.querySelectorAll('.player-dice');
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
}

// Add this function to handle pause menu
function togglePauseMenu() {
    const now = Date.now();
    if (isPauseTransitioning || (now - lastPauseToggle) < PAUSE_COOLDOWN) {
        return; // Prevent rapid toggling
    }
    
    lastPauseToggle = now;
    isPauseTransitioning = true;
    
    const pauseMenu = document.getElementById('pauseMenu');
    const mainContainer = document.querySelector('.main-container');
    
    if (!isPaused) {
        console.log("Game paused");
        isPaused = true;
        pauseMenu.style.display = 'flex';
        mainContainer.classList.add('paused');
        
        // Disable all game actions
        document.getElementById('betBtn').disabled = true;
        document.getElementById('spotOnBtn').disabled = true;
        document.getElementById('doubtBtn').disabled = true;
        document.getElementById('gameToggle').disabled = true;
        
        // Store the current game state
        localStorage.setItem('gamePaused', 'true');
    } else {
        console.log("Game resumed");
        isPaused = false;
        pauseMenu.style.display = 'none';
        mainContainer.classList.remove('paused');
        
        // Re-enable game actions if it's the player's turn
        if (isGameStarted && currentPlayer === 1) {
            document.getElementById('betBtn').disabled = false;
            document.getElementById('spotOnBtn').disabled = false;
            document.getElementById('doubtBtn').disabled = false;
        }
        document.getElementById('gameToggle').disabled = false;
        
        localStorage.setItem('gamePaused', 'false');
    }
    
    // Reset the transition flag after a short delay
    setTimeout(() => {
        isPauseTransitioning = false;
    }, PAUSE_COOLDOWN);
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
                // Reset game state
                initializePlayerStates();
                generateRandomStart();
                updateGameMessage("Starting new game");
                if (currentPlayer !== 1) {
                    console.log("First player is a bot, initiating bot turn...");
                    setTimeout(handleBotTurn, 3000); // Add 3-second delay for bot turn
                }
            } else {
                console.log("Ending game...");
                endGame();
                // Clear game state
                const diceSquares = document.querySelectorAll('.inner-square');
                diceSquares.forEach(square => {
                    square.textContent = '';
                });
                messageHistory = [];
                updateGameMessage('Game ended');
            }
        });
    }

    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyPress);

    // Add pause menu event listeners
    const pauseButton = document.getElementById('pauseButton');
    const resumeButton = document.getElementById('resumeButton');
    const exitGameButton = document.getElementById('exitGameButton');
    const settingsFromPauseButton = document.getElementById('settingsFromPauseButton');
    const rulesFromPauseButton = document.getElementById('rulesFromPauseButton');
    const tutorialButton = document.getElementById('tutorialButton');
    
    if (pauseButton) {
        pauseButton.addEventListener('click', togglePauseMenu);
    }
    
    if (resumeButton) {
        resumeButton.addEventListener('click', togglePauseMenu);
    }
    
    if (exitGameButton) {
        exitGameButton.addEventListener('click', () => {
            if (isGameStarted) {
                endGame();
            }
            togglePauseMenu();
        });
    }
    
    if (settingsFromPauseButton) {
        settingsFromPauseButton.addEventListener('click', () => {
            togglePauseMenu();
            settingsPanel.classList.add('open');
            isPanelOpen = true;
        });
    }
    
    if (rulesFromPauseButton) {
        rulesFromPauseButton.addEventListener('click', () => {
            togglePauseMenu();
            rulesPanel.classList.add('visible');
        });
    }
    
    if (tutorialButton) {
        tutorialButton.addEventListener('click', () => {
            // This will be implemented later
            console.log('Tutorial button clicked');
        });
    }
    
    // Check if game was paused
    const wasPaused = localStorage.getItem('gamePaused') === 'true';
    if (wasPaused) {
        isPaused = true; // Set the state first
        setTimeout(() => {
            togglePauseMenu(); // Then update the UI
        }, 100);
    }
    
    console.log("Initialization complete");
};

window.onresize = createPlayerPositions;

function getBotAction() {
    // Ensure diceArray is properly initialized
    if (!diceArray || !diceArray[currentPlayer]) {
        console.error("Dice array not properly initialized");
        return { type: 'bet', quantity: 1, value: 1 };
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
        
        return {
            type: 'bet',
            value: parseInt(bestValue),
            quantity: Math.ceil(totalDice * 0.2)
        };
    }
    
    // Use the existing makeBotDecision function for subsequent moves
    const decision = makeBotDecision(botDice, totalDice, {
        count: lastBet.quantity,
        face: lastBet.value
    });
    
    switch (decision) {
        case "dudo":
            return { type: 'doubt' };
        case "calzo":
            return { type: 'spot_on' };
        case "raise":
            // Increase either quantity or value, ensuring it's not the same as last bet
            if (Math.random() < 0.5) {
                // Increase quantity
                return {
                    type: 'bet',
                    value: lastBet.value,
                    quantity: lastBet.quantity + 1
                };
            } else {
                // Increase value, but ensure we don't make the same bet
                let newValue = lastBet.value + 1;
                if (newValue > 6) {
                    newValue = 1;
                }
                // If increasing value would result in same bet, increase quantity instead
                if (newValue === lastBet.value && lastBet.quantity === 1) {
                    return {
                        type: 'bet',
                        value: lastBet.value,
                        quantity: lastBet.quantity + 1
                    };
                }
                return {
                    type: 'bet',
                    value: newValue,
                    quantity: lastBet.quantity
                };
            }
    }
} 
