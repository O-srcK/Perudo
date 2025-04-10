<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Perudo - Game Mode Selection</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600&display=swap');
        
        body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #35654d; /* Poker table green */
        }

        .header {
            font-family: 'Cinzel', serif;
            font-size: 3.5rem;
            color: #FFD700; /* Golden color */
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
            margin-bottom: 2rem;
        }

        .container {
            background-color: rgba(255, 255, 255, 0.95);
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            text-align: center;
        }

        h1 {
            color: #333;
            margin-bottom: 1.5rem;
        }

        h2 {
            color: #444;
            margin: 2rem 0 1rem;
        }

        .mode-buttons, .player-buttons {
            display: flex;
            gap: 1rem;
            justify-content: center;
            margin-bottom: 1rem;
        }

        button {
            padding: 0.8rem 1.5rem;
            font-size: 1rem;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: transform 0.1s, background-color 0.2s;
        }

        button:hover {
            transform: scale(1.05);
        }

        #easyBtn {
            background-color: #4CAF50;
            color: white;
        }

        #mediumBtn {
            background-color: #FFA500;
            color: white;
        }

        #hardBtn {
            background-color: #FF4444;
            color: white;
        }

        .player-btn {
            background-color: #9c27b0;
            color: white;
        }

        .player-btn.selected {
            background-color: #6a1b9a;
            transform: scale(1.05);
            box-shadow: 0 0 10px rgba(0,0,0,0.2);
        }

        #selectedMode, #selectedPlayers {
            margin-top: 0.5rem;
            font-size: 1.1rem;
            color: #666;
        }

        #continueBtn {
            background-color: #4a90e2;
            color: white;
            font-size: 1.2rem;
            padding: 1rem 2.5rem;
            margin-top: 2rem;
            transition: background-color 0.3s;
        }

        #continueBtn:hover {
            background-color: #357abd;
        }

        #continueBtn:disabled {
            background-color: #cccccc;
            cursor: not-allowed;
            transform: none;
        }
    </style>
</head>
<body>
    <h1 class="header">Welcome to Perudo</h1>
    <div class="container">
        <h2>Select Game Mode</h2>
        <div class="mode-buttons">
            <button id="easyBtn" onclick="selectMode(0)">Easy</button>
            <button id="mediumBtn" onclick="selectMode(1)">Medium</button>
            <button id="hardBtn" onclick="selectMode(2)">Hard</button>
        </div>
        <div id="selectedMode"></div>

        <h2>Choose the number of players</h2>
        <div class="player-buttons">
            <button class="player-btn" onclick="selectPlayers(4)">4 Players</button>
            <button class="player-btn" onclick="selectPlayers(5)">5 Players</button>
            <button class="player-btn" onclick="selectPlayers(6)">6 Players</button>
        </div>
        <div id="selectedPlayers"></div>

        <button id="continueBtn" onclick="continueTo()" disabled>Continue</button>
    </div>

    <script>
        let gameMode = -1; // Variable to store the selected mode
        let nr_players = 0; // Variable to store the number of players

        function selectMode(mode) {
            gameMode = mode;
            const modeNames = ['Easy', 'Medium', 'Hard'];
            document.getElementById('selectedMode').textContent = 
                `Selected mode: ${modeNames[mode]} (value: ${mode})`;
            checkContinueButton();
        }

        function selectPlayers(num) {
            nr_players = num;
            document.getElementById('selectedPlayers').textContent = 
                `Selected players: ${num}`;
            
            // Update visual selection
            document.querySelectorAll('.player-btn').forEach(btn => {
                btn.classList.remove('selected');
                if (btn.textContent === `${num} Players`) {
                    btn.classList.add('selected');
                }
            });
            
            checkContinueButton();
        }

        function checkContinueButton() {
            // Enable continue button only if both mode and players are selected
            document.getElementById('continueBtn').disabled = (gameMode === -1 || nr_players === 0);
        }

        function continueTo() {
            // Store both gameMode and nr_players in localStorage
            localStorage.setItem('gameMode', gameMode);
            localStorage.setItem('nr_players', nr_players);
            // Redirect to the game page
            window.location.href = 'game.html';
        }
    </script>
</body>
</html> 
