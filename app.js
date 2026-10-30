// Initialize the game logic
const game = new Chess();

// Update the side panel with the current move history
function updateStatus() {
    const pgn = game.pgn();
    document.getElementById('pgn-display').innerText = pgn || 'No moves yet.';
}

// Panel Toggle Logic
function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    panel.classList.toggle('collapsed');
}

// Ensure the piece belongs to the player whose turn it is
function onDragStart(source, piece, position, orientation) {
    if (game.game_over()) return false;

    // Only pick up pieces for the side to move
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
}

// Locate your existing onDrop function and update it:
function onDrop(source, target) {
    const move = game.move({
        from: source,
        to: target,
        promotion: 'q'
    });

    if (move === null) return 'snapback';

    updateStatus();

    // Check if your move ended the game before asking Stockfish to think
    if (checkGameOver()) return;

    analyzeBoard(12);
}

// Update the board position after the piece snap
// (Crucial for handling castling, en passant, and pawn promotion animations)
function onSnapEnd() {
    board.position(game.fen());
}

// ... [keep your existing game logic above] ...

// Configuration for chessboard.js
const config = {
    draggable: true,
    position: 'start',
    orientation: 'black',
    // Point to a public CDN for the piece images
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
};

// Render the board
const board = Chessboard('board', config);

// Redraw the board dynamically when the window or mobile screen rotates
$(window).resize(board.resize);

// --- Game Over & Restart Logic ---
const gameOverModal = document.getElementById('gameOverModal');
const gameOverMessage = document.getElementById('gameOverMessage');
const restartBtn = document.getElementById('restartBtn');

function checkGameOver() {
    if (game.game_over()) {
        if (game.in_checkmate()) {
            // If it is White's turn during checkmate, Black (You) won.
            const winner = game.turn() === 'w' ? 'Black (You)' : 'White (Engine)';
            gameOverMessage.textContent = `Checkmate! ${winner} wins.`;
        } else if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) {
            gameOverMessage.textContent = "Game ended in a draw.";
        } else {
            gameOverMessage.textContent = "Game over.";
        }
        gameOverModal.showModal();
        return true;
    }
    return false;
}

restartBtn.addEventListener('click', () => {
    // Reset chess.js state and UI board
    game.reset();
    board.start();
    updateStatus();
    gameOverModal.close();

    // Kick off Stockfish's first move for the new game
    setTimeout(() => {
        analyzeBoard(10);
    }, 1000);
});


// --- Phase 2: Local Storage and Settings ---

const settingsModal = document.getElementById('settingsModal');
const settingsBtn = document.getElementById('settingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const llmProviderSelect = document.getElementById('llmProvider');
const ollamaSettings = document.getElementById('ollamaSettings');
const openaiSettings = document.getElementById('openaiSettings');
const engineDifficulty = document.getElementById('engineDifficulty');
const difficultyLabel = document.getElementById('difficultyLabel');
const modelNameInput = document.getElementById('modelName');

// Update the provider change listener to swap defaults automatically
llmProviderSelect.addEventListener('change', (e) => {
    if (e.target.value === 'ollama') {
        ollamaSettings.style.display = 'flex';
        openaiSettings.style.display = 'none';

        // Auto-fill Ollama default if empty or if it currently holds the OpenAI default
        if (!modelNameInput.value || modelNameInput.value === 'gpt-4o-mini') {
            modelNameInput.value = 'llama3.2:latest';
        }
    } else {
        ollamaSettings.style.display = 'none';
        openaiSettings.style.display = 'flex';

        // Auto-fill OpenAI default if empty or if it currently holds the Ollama default
        if (!modelNameInput.value || modelNameInput.value === 'llama3.2:latest') {
            modelNameInput.value = 'gpt-4o-mini';
        }
    }
});

// Toggle visible input fields based on provider selection
llmProviderSelect.addEventListener('change', (e) => {
    if (e.target.value === 'ollama') {
        ollamaSettings.style.display = 'flex';
        openaiSettings.style.display = 'none';
    } else {
        ollamaSettings.style.display = 'none';
        openaiSettings.style.display = 'flex';
    }
});

// Update the label when dragging the slider
engineDifficulty.addEventListener('input', (e) => {
    difficultyLabel.textContent = e.target.value;
});

// Load settings from localStorage into the form
function loadSettings() {
    const provider = localStorage.getItem('chessLlmProvider') || 'ollama';
    const ollamaUrl = localStorage.getItem('chessOllamaUrl') || 'http://localhost:11434';
    const openApiKey = localStorage.getItem('chessOpenApiKey') || '';
    const difficulty = localStorage.getItem('chessDifficulty') || '10';

    // Load the saved model, but don't force a default yet (the change event will handle it)
    const savedModel = localStorage.getItem('chessModel');
    if (savedModel) modelNameInput.value = savedModel;

    llmProviderSelect.value = provider;
    document.getElementById('ollamaUrl').value = ollamaUrl;
    document.getElementById('openApiKey').value = openApiKey;
    engineDifficulty.value = difficulty;
    difficultyLabel.textContent = difficulty;

    // Trigger the change event to set the layout and default model if empty
    llmProviderSelect.dispatchEvent(new Event('change'));
}

// Save form values to localStorage
function saveSettings() {
    localStorage.setItem('chessLlmProvider', llmProviderSelect.value);
    localStorage.setItem('chessOllamaUrl', document.getElementById('ollamaUrl').value);
    localStorage.setItem('chessOpenApiKey', document.getElementById('openApiKey').value);
    localStorage.setItem('chessDifficulty', engineDifficulty.value);

    // Save the new model name
    localStorage.setItem('chessModel', modelNameInput.value);

    setEngineDifficulty(engineDifficulty.value);
    settingsModal.close();
}

function setEngineDifficulty(level) {
    engine.postMessage(`setoption name Skill Level value ${level}`);
}

// Modal Event Listeners
settingsBtn.addEventListener('click', () => {
    loadSettings();
    settingsModal.showModal();
});

closeSettingsBtn.addEventListener('click', () => settingsModal.close());
saveSettingsBtn.addEventListener('click', saveSettings);

// Initialize settings on load
loadSettings();

/*-----------------------------*/

const testConnectionBtn = document.getElementById('testConnectionBtn');
const testStatus = document.getElementById('testStatus');

testConnectionBtn.addEventListener('click', async () => {
    const provider = llmProviderSelect.value;
    testStatus.textContent = 'Testing...';
    testStatus.style.color = '#c3c2c1';

    try {
        if (provider === 'ollama') {
            // Extract the base URL (e.g., http://localhost:11434)
            const inputUrl = document.getElementById('ollamaUrl').value;
            const urlObj = new URL(inputUrl);
            const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

            // Hit the tags endpoint to check if Ollama is running and CORS is allowed
            const response = await fetch(`${baseUrl}/api/tags`);
            if (response.ok) {
                testStatus.textContent = '✅ Connected to Ollama!';
                testStatus.style.color = '#81b64c';
            } else {
                throw new Error('Server reachable, but returned an error.');
            }
        }
        else if (provider === 'openai') {
            const apiKey = document.getElementById('openApiKey').value;
            if (!apiKey) throw new Error('API key is empty.');

            // Hit the models endpoint to verify authentication
            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (response.ok) {
                testStatus.textContent = '✅ API Key valid!';
                testStatus.style.color = '#81b64c';
            } else {
                throw new Error('Invalid API Key.');
            }
        }
    } catch (error) {
        console.error('Test Connection Error:', error);
        testStatus.textContent = '❌ Connection failed.';
        testStatus.style.color = '#e74c3c'; // A visible red for errors
    }
});

// Clear the status message when the modal is closed or opened
function resetTestStatus() {
    testStatus.textContent = '';
}
settingsBtn.addEventListener('click', resetTestStatus);
closeSettingsBtn.addEventListener('click', resetTestStatus);


// --- Phase 3: The In-Browser Chess Engine ---

// Initialize Stockfish inside a Web Worker from your local file
const engine = new Worker('stockfish.js');
let currentEvaluation = "0.00";
let recommendedMove = "";

// Configure the engine
engine.postMessage('uci');
engine.postMessage('isready');

// Listen to Stockfish's analysis
engine.onmessage = function(event) {
    const line = event.data;

    // 1. Extract evaluation score (centipawns or mate)
    // Note: Stockfish evaluates from the perspective of the side whose turn it is
    if (line.includes('info depth') && line.includes('score cp')) {
        const match = line.match(/score cp (-?\d+)/);
        if (match) {
            currentEvaluation = (parseInt(match[1]) / 100).toFixed(2);
        }
    } else if (line.includes('info depth') && line.includes('score mate')) {
        const match = line.match(/score mate (-?\d+)/);
        if (match) {
            currentEvaluation = `Mate in ${Math.abs(parseInt(match[1]))}`;
        }
    }

    // 2. Extract the best move when Stockfish finishes thinking
    if (line.startsWith('bestmove')) {
        const bestMove = line.split(' ')[1];

        if (bestMove && bestMove !== '(none)') {
            if (game.turn() === 'w') {
                // Opponent's turn: Execute the engine's move automatically
                executeEngineMove(bestMove);
            } else {
                // Player's turn: Store the best move in memory so the LLM coach can see it
                recommendedMove = bestMove;
            }
        }
    }
};

// Convert Stockfish's UCI output (e.g., 'e2e4') to a chess.js format
function executeEngineMove(uciMove) {
    const fromSquare = uciMove.substring(0, 2);
    const toSquare = uciMove.substring(2, 4);
    const promotionPiece = uciMove.length > 4 ? uciMove[4] : 'q';

    game.move({
        from: fromSquare,
        to: toSquare,
        promotion: promotionPiece
    });

    board.position(game.fen());
    updateStatus();

    // Check if the engine's move ended the game
    if (checkGameOver()) return;

    analyzeBoard(12);
}

// Ask Stockfish to evaluate the current board state
function analyzeBoard(depth = 12) {
    engine.postMessage(`position fen ${game.fen()}`);
    engine.postMessage(`go depth ${depth}`); // Calculates up to 12 moves ahead

    // engine.postMessage(`go movetime 1000`); To speed up the response of the bot
}

// Kick off the game by letting Stockfish (White) analyze and make the very first move
setTimeout(() => {
    analyzeBoard(10);
}, 1000);

// Once ready, load the saved difficulty from storage and apply it
const savedDifficulty = localStorage.getItem('chessDifficulty') || '10';
setEngineDifficulty(savedDifficulty);


// --- Phase 4: The LLM Coaching Layer ---
const askCoachBtn = document.getElementById('askCoachBtn');
const aiChat = document.getElementById('ai-chat');

// Scroll chat to the bottom automatically
function scrollChat() {
    aiChat.scrollTop = aiChat.scrollHeight;
}

// Build the prompt using the game state and Stockfish data
function constructPrompt() {
    const fen = game.fen();
    const isBlackTurn = game.turn() === 'b';

    if (!isBlackTurn) {
        return "It is currently White's turn. Please wait for the engine to move.";
    }

    return `
    You are an expert chess coach helping a human player. The player is playing the Black pieces.
    The current board state in FEN notation is: ${fen}
    The engine evaluates this position at ${currentEvaluation} (positive favors White, negative favors Black).
    The best mathematically calculated move for Black right now is: ${recommendedMove}.

    Please provide a brief, encouraging hint to the player. Do NOT explicitly tell them to play ${recommendedMove} right away. Instead, point out the tactical theme, the weakness in White's position, or the piece they should focus on. Keep your response concise (2 short paragraphs max).
    `;
}

// Handle the Ollama request
async function fetchOllama(prompt) {
    const baseUrl = localStorage.getItem('chessOllamaUrl') || 'http://localhost:11434';
    const modelToUse = localStorage.getItem('chessModel') || 'llama3.2:latest';

    const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: modelToUse,
            prompt: prompt,
            stream: false
        })
    });

    if (!response.ok) throw new Error('Ollama request failed');
    const data = await response.json();
    return data.response;
}

// Handle the OpenAI request
async function fetchOpenAI(prompt) {
    const apiKey = localStorage.getItem('chessOpenApiKey');
    const modelToUse = localStorage.getItem('chessModel') || 'gpt-4o-mini';

    if (!apiKey) throw new Error('OpenAI API key is missing in settings.');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: modelToUse,
            messages: [
                { role: "system", content: "You are a helpful and strategic chess coach." },
                { role: "user", content: prompt }
            ]
        })
    });

    if (!response.ok) throw new Error('OpenAI request failed');
    const data = await response.json();
    return data.choices[0].message.content;
}

// Wire up the button click event
askCoachBtn.addEventListener('click', async () => {
    // If game is over, don't ask for a hint
    if (game.game_over()) return;

    const provider = localStorage.getItem('chessLlmProvider') || 'ollama';
    const prompt = constructPrompt();

    // Catch if they click before Stockfish has a recommendation
    if (prompt.includes("White's turn")) {
        aiChat.innerHTML += `<p style="color: #e74c3c; margin-bottom: 10px;">Wait for White to move.</p>`;
        scrollChat();
        return;
    }

    // UI Loading state
    askCoachBtn.disabled = true;
    askCoachBtn.textContent = 'Thinking...';
    aiChat.innerHTML += `<p id="loadingMsg" style="color: #81b64c; margin-bottom: 10px;"><em>Coach is analyzing the board...</em></p>`;
    scrollChat();

    try {
        let reply = "";
        if (provider === 'ollama') {
            reply = await fetchOllama(prompt);
        } else {
            reply = await fetchOpenAI(prompt);
        }

        // Remove loading message and append the response
        document.getElementById('loadingMsg').remove();

        // Format the text slightly to handle basic line breaks
        const formattedReply = reply.replace(/\n/g, '<br>');
        aiChat.innerHTML += `<p style="color: #fff; margin-bottom: 15px; line-height: 1.4;"><strong>Coach:</strong><br>${formattedReply}</p>`;
    } catch (error) {
        document.getElementById('loadingMsg').remove();
        aiChat.innerHTML += `<p style="color: #e74c3c; margin-bottom: 15px;"><em>Error: ${error.message}</em></p>`;
    }

    scrollChat();
    askCoachBtn.disabled = false;
    askCoachBtn.textContent = 'Get Hint';
});


/* Rollback feature */
const undoBtn = document.getElementById('undoBtn');

undoBtn.addEventListener('click', () => {
    // Check if there are enough moves to undo
    if (game.history().length < 2) {
        return;
    }

    // Tell the engine to stop thinking about the current position
    engine.postMessage('stop');

    // Undo the engine's move, then undo your move
    game.undo();
    game.undo();

    board.position(game.fen());
    updateStatus();

    analyzeBoard(12);
});
