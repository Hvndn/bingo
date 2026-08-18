/* ==========================================================================
   NEON BINGO 2P - MAIN APPLICATION CONTROLLER
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements References
    const elements = {
        // Views
        viewLobby: document.getElementById('view-lobby'),
        viewSetup: document.getElementById('view-setup'),
        viewGameplay: document.getElementById('view-gameplay'),

        // Header
        btnHistory: document.getElementById('btn-history'),
        btnTheme: document.getElementById('btn-theme'),
        btnSound: document.getElementById('btn-sound'),
        btnInfo: document.getElementById('btn-info'),

        // Lobby Mode Tabs
        modeTabs: document.querySelectorAll('.mode-tab'),
        modeContents: document.querySelectorAll('.mode-content'),

        // Online Controls
        btnCreateRoom: document.getElementById('btn-create-room'),
        inputRoomCode: document.getElementById('input-room-code'),
        btnJoinRoom: document.getElementById('btn-join-room'),
        roomCreatedInfo: document.getElementById('room-created-info'),
        displayRoomCode: document.getElementById('display-room-code'),
        btnCopyCode: document.getElementById('btn-copy-code'),
        btnCancelRoom: document.getElementById('btn-cancel-room'),
        connectionStatusText: document.getElementById('connection-status-text'),

        // AI & Local Controls
        btnStartAi: document.getElementById('btn-start-ai'),
        btnStartLocal: document.getElementById('btn-start-local'),

        // Setup View
        setupBoard: document.getElementById('setup-board'),
        btnAutoFill: document.getElementById('btn-auto-fill'),
        btnClearBoard: document.getElementById('btn-clear-board'),
        btnReady: document.getElementById('btn-ready'),
        opponentSetupBadge: document.getElementById('opponent-setup-badge'),
        opponentSetupText: document.getElementById('opponent-setup-text'),

        // Gameplay View
        p1Name: document.getElementById('p1-name'),
        p2Name: document.getElementById('p2-name'),
        turnIndicator: document.getElementById('turn-indicator'),
        turnText: document.getElementById('turn-text'),
        
        p1BingoLetters: document.getElementById('p1-bingo-letters'),
        p1LineCount: document.getElementById('p1-line-count'),
        btnCallBingo: document.getElementById('btn-call-bingo'),
        
        gameplayBoard: document.getElementById('gameplay-board'),
        linesSvg: document.getElementById('lines-svg'),
        inputCallNumber: document.getElementById('input-call-number'),
        btnCallNumber: document.getElementById('btn-call-number'),
        emoteButtons: document.querySelectorAll('.btn-emote'),
        floatingEmotesContainer: document.getElementById('floating-emotes'),

        // Modals
        modalGameOver: document.getElementById('modal-gameover'),
        modalTitle: document.getElementById('modal-title'),
        modalDesc: document.getElementById('modal-desc'),
        statP1Lines: document.getElementById('stat-p1-lines'),
        statP2Lines: document.getElementById('stat-p2-lines'),
        btnRematch: document.getElementById('btn-rematch'),
        btnBackLobby: document.getElementById('btn-back-lobby'),

        modalRematchOffer: document.getElementById('modal-rematch-offer'),
        btnAcceptRematch: document.getElementById('btn-accept-rematch'),
        btnDeclineRematch: document.getElementById('btn-decline-rematch'),

        modalRules: document.getElementById('modal-rules'),
        btnCloseRules: document.getElementById('btn-close-rules'),

        modalHistory: document.getElementById('modal-history'),
        btnCloseHistory: document.getElementById('btn-close-history'),
        historyList: document.getElementById('history-list'),
        histStatTotal: document.getElementById('hist-stat-total'),
        histStatWins: document.getElementById('hist-stat-wins'),
        
        toastContainer: document.getElementById('toast-container')
    };

    // State Variables
    let selectedSetupIndex = 0;

    // Initialize App
    function init() {
        initTheme();
        bindEvents();
        updateSoundButtonUI();
        bingoEngine.resetState();
    }

    // Theme Switcher System
    function initTheme() {
        const savedTheme = localStorage.getItem('bingo_theme') || 'light';
        setTheme(savedTheme);
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('bingo_theme', theme);
        elements.btnTheme.innerHTML = theme === 'dark' 
            ? '<i class="fa-solid fa-moon"></i>' 
            : '<i class="fa-solid fa-sun"></i>';
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        showToast(newTheme === 'light' ? 'Đã đổi giao diện Sáng' : 'Đã đổi giao diện Tối');
    }

    // View Routing
    function showView(viewName) {
        elements.viewLobby.classList.remove('active');
        elements.viewSetup.classList.remove('active');
        elements.viewGameplay.classList.remove('active');

        if (viewName === 'lobby') elements.viewLobby.classList.add('active');
        if (viewName === 'setup') elements.viewSetup.classList.add('active');
        if (viewName === 'gameplay') elements.viewGameplay.classList.add('active');
    }

    // Toast Notification Helper
    function showToast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerText = message;
        elements.toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
    }

    // Sound UI Update
    function updateSoundButtonUI() {
        const isMuted = soundEngine.isMuted();
        elements.btnSound.innerHTML = isMuted 
            ? '<i class="fa-solid fa-volume-xmark"></i>' 
            : '<i class="fa-solid fa-volume-high"></i>';
    }

    // Event Bindings
    function bindEvents() {
        // Sound & Theme & Rules & History
        elements.btnHistory.addEventListener('click', () => {
            soundEngine.playClick();
            elements.modalHistory.classList.remove('hidden');
            fetchMatchHistory();
        });

        elements.btnCloseHistory.addEventListener('click', () => {
            soundEngine.playClick();
            elements.modalHistory.classList.add('hidden');
        });

        elements.btnTheme.addEventListener('click', () => {
            soundEngine.playClick();
            toggleTheme();
        });

        elements.btnSound.addEventListener('click', () => {
            const muted = soundEngine.toggleMute();
            updateSoundButtonUI();
            showToast(muted ? 'Đã tắt âm thanh' : 'Đã bật âm thanh');
        });

        elements.btnInfo.addEventListener('click', () => {
            soundEngine.playClick();
            elements.modalRules.classList.remove('hidden');
        });

        elements.btnCloseRules.addEventListener('click', () => {
            soundEngine.playClick();
            elements.modalRules.classList.add('hidden');
        });

        // Mode Tabs
        elements.modeTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                soundEngine.playClick();
                elements.modeTabs.forEach(t => t.classList.remove('active'));
                elements.modeContents.forEach(c => c.classList.remove('active'));

                tab.classList.add('active');
                const mode = tab.dataset.mode;
                document.getElementById(`${mode}-controls`).classList.add('active');
            });
        });

        // Create Room Button
        elements.btnCreateRoom.addEventListener('click', () => {
            soundEngine.playClick();
            bingoEngine.resetState();
            bingoEngine.mode = 'online';
            bingoEngine.myRole = 'p1';

            peerManager.createRoom((roomCode) => {
                elements.displayRoomCode.innerText = roomCode;
                elements.roomCreatedInfo.classList.remove('hidden');
                elements.connectionStatusText.innerText = 'Đang chờ đối thủ nhập mã phòng...';
            });
        });

        // Copy Room Code Button
        elements.btnCopyCode.addEventListener('click', () => {
            soundEngine.playClick();
            const code = elements.displayRoomCode.innerText;
            navigator.clipboard.writeText(code).then(() => {
                showToast(`Đã chép mã phòng: ${code}`);
            }).catch(() => {
                showToast(`Mã phòng: ${code}`);
            });
        });

        // Cancel Room Button
        elements.btnCancelRoom.addEventListener('click', () => {
            soundEngine.playClick();
            peerManager.disconnect();
            elements.roomCreatedInfo.classList.add('hidden');
        });

        // Join Room Button
        elements.btnJoinRoom.addEventListener('click', () => {
            soundEngine.playClick();
            const code = elements.inputRoomCode.value.trim();
            if (!code) {
                showToast('Vui lòng nhập mã phòng!');
                return;
            }

            bingoEngine.resetState();
            bingoEngine.mode = 'online';
            bingoEngine.myRole = 'p2';

            peerManager.joinRoom(code, () => {
                showToast('Đã kết nối tới phòng!');
            });
        });

        // Start AI Practice Mode
        elements.btnStartAi.addEventListener('click', () => {
            soundEngine.playClick();
            bingoEngine.resetState();
            bingoEngine.mode = 'ai';
            bingoEngine.myRole = 'p1';
            bingoEngine.oppBoard = bingoEngine.generateRandomBoard();
            bingoEngine.oppReady = true;

            elements.p1Name.innerText = 'BẠN';
            elements.p2Name.innerText = 'BOT AI';

            prepareSetupBoard();
        });

        // Start Local Pass & Play Mode
        elements.btnStartLocal.addEventListener('click', () => {
            soundEngine.playClick();
            bingoEngine.resetState();
            bingoEngine.mode = 'local';
            bingoEngine.myRole = 'p1';

            elements.p1Name.innerText = 'PLAYER 1';
            elements.p2Name.innerText = 'PLAYER 2';

            // Random boards for quick local play
            bingoEngine.myBoard = bingoEngine.generateRandomBoard();
            bingoEngine.oppBoard = bingoEngine.generateRandomBoard();
            bingoEngine.myReady = true;
            bingoEngine.oppReady = true;

            startMatch();
        });

        // Manual Number Calling
        elements.btnCallNumber.addEventListener('click', () => {
            submitManualCallNumber();
        });

        elements.inputCallNumber.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitManualCallNumber();
            }
        });

        // Claim Bingo Victory Button
        elements.btnCallBingo.addEventListener('click', () => {
            claimBingoVictory();
        });

        // Setup Board Controls
        elements.btnAutoFill.addEventListener('click', () => {
            soundEngine.playClick();
            // Preserves manually picked numbers, fills remaining empty slots randomly
            bingoEngine.myBoard = bingoEngine.fillRemainingRandomly(bingoEngine.myBoard);
            renderSetupBoard();
            checkSetupReadyState();
        });

        elements.btnClearBoard.addEventListener('click', () => {
            soundEngine.playClick();
            bingoEngine.myBoard = new Array(25).fill(null);
            renderSetupBoard();
            checkSetupReadyState();
        });

        elements.btnReady.addEventListener('click', () => {
            soundEngine.playReady();
            bingoEngine.myReady = true;
            elements.btnReady.disabled = true;
            elements.btnReady.innerText = 'ĐÃ SẴN SÀNG ✓';

            if (bingoEngine.mode === 'online') {
                peerManager.sendData({
                    type: 'PLAYER_READY',
                    payload: { role: bingoEngine.myRole }
                });
            }

            checkBothReadyToStart();
        });

        // Emote Reactions
        elements.emoteButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                soundEngine.playEmote();
                const emote = btn.dataset.emote;
                spawnFloatingEmote(emote, true);

                if (bingoEngine.mode === 'online') {
                    peerManager.sendData({
                        type: 'EMOTE',
                        payload: { emote }
                    });
                }
            });
        });

        // Rematch & Back to Lobby
        elements.btnRematch.addEventListener('click', () => {
            soundEngine.playClick();

            if (bingoEngine.mode === 'online') {
                peerManager.sendData({ type: 'REMATCH_OFFER' });
                elements.btnRematch.disabled = true;
                elements.btnRematch.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang chờ đồng ý...';
                showToast('Đã gửi lời mời Tái Đấu. Đang chờ đối thủ đồng ý...');
            } else if (bingoEngine.mode === 'ai') {
                bingoEngine.resetState();
                bingoEngine.mode = 'ai';
                bingoEngine.myRole = 'p1';
                bingoEngine.oppBoard = bingoEngine.generateRandomBoard();
                bingoEngine.oppReady = true;
                prepareSetupBoard();
            } else {
                bingoEngine.resetState();
                bingoEngine.mode = 'local';
                bingoEngine.myBoard = bingoEngine.generateRandomBoard();
                bingoEngine.oppBoard = bingoEngine.generateRandomBoard();
                bingoEngine.myReady = true;
                bingoEngine.oppReady = true;
                startMatch();
            }
        });

        // Rematch Offer Decision Handlers
        elements.btnAcceptRematch.addEventListener('click', () => {
            soundEngine.playReady();
            elements.modalRematchOffer.classList.add('hidden');
            peerManager.sendData({ type: 'REMATCH_ACCEPT' });
            resetAndGoToSetup();
        });

        elements.btnDeclineRematch.addEventListener('click', () => {
            soundEngine.playClick();
            elements.modalRematchOffer.classList.add('hidden');
            peerManager.sendData({ type: 'REMATCH_DECLINE' });
        });

        elements.btnBackLobby.addEventListener('click', () => {
            soundEngine.playClick();
            elements.modalGameOver.classList.add('hidden');
            if (bingoEngine.mode === 'online') {
                peerManager.disconnect();
            }
            showView('lobby');
        });

        // Peer Manager Callbacks Setup
        peerManager.onStatusChange = (status) => {
            console.log('Network Status:', status);
            if (status.state === 'CONNECTED') {
                if (status.isHost) {
                    elements.connectionStatusText.innerText = 'Đối thủ đã vào phòng!';
                    elements.p1Name.innerText = 'BẠN (HOST)';
                    elements.p2Name.innerText = 'ĐỐI THỦ';
                } else {
                    elements.p1Name.innerText = 'BẠN (GUEST)';
                    elements.p2Name.innerText = 'ĐỐI THỦ (HOST)';
                }

                setTimeout(() => {
                    prepareSetupBoard();
                }, 800);
            } else if (status.state === 'CLOSED' || status.state === 'DISCONNECTED') {
                showToast(status.message);
                if (bingoEngine.gameStarted && !bingoEngine.gameOver) {
                    showGameOverModal('opp_disconnect', 'Đối thủ đã thoát phòng!');
                }
            }
        };

        peerManager.onDataReceived = (data) => {
            handleP2PData(data);
        };

        peerManager.onError = (msg) => {
            showToast(msg);
        };
    }

    // Prepare Setup Phase
    function prepareSetupBoard() {
        elements.roomCreatedInfo.classList.add('hidden');
        showView('setup');
        
        bingoEngine.myBoard = bingoEngine.generateRandomBoard(); // Pre-fill randomly for convenience
        renderSetupBoard();
        checkSetupReadyState();

        if (bingoEngine.mode === 'online') {
            elements.opponentSetupBadge.classList.remove('ready');
            elements.opponentSetupText.innerText = 'Đối phương đang xếp số...';
        } else {
            elements.opponentSetupBadge.classList.add('ready');
            elements.opponentSetupText.innerText = 'Đối phương đã sẵn sàng!';
        }
    }

    // Render Setup 5x5 Grid
    function renderSetupBoard() {
        elements.setupBoard.innerHTML = '';
        bingoEngine.myBoard.forEach((num, index) => {
            const cell = document.createElement('div');
            cell.className = `grid-cell setup-cell ${num !== null ? 'filled' : ''}`;
            cell.innerText = num !== null ? num : '';
            
            cell.addEventListener('click', () => {
                soundEngine.playClick();
                // Interactive cell fill logic
                fillNextAvailableSetupNumber(index);
            });

            elements.setupBoard.appendChild(cell);
        });
    }

    function fillNextAvailableSetupNumber(index) {
        if (bingoEngine.myBoard[index] !== null) {
            // Unset
            bingoEngine.myBoard[index] = null;
        } else {
            // Find lowest missing number from 1 to 25
            const set = new Set(bingoEngine.myBoard.filter(n => n !== null));
            for (let i = 1; i <= 25; i++) {
                if (!set.has(i)) {
                    bingoEngine.myBoard[index] = i;
                    break;
                }
            }
        }
        renderSetupBoard();
        checkSetupReadyState();
    }

    function checkSetupReadyState() {
        const isValid = bingoEngine.validateBoard(bingoEngine.myBoard);
        elements.btnReady.disabled = !isValid || bingoEngine.myReady;
    }

    function checkBothReadyToStart() {
        if (bingoEngine.myReady && bingoEngine.oppReady) {
            startMatch();
        }
    }

    // Start Main Gameplay Phase
    function startMatch() {
        bingoEngine.gameStarted = true;
        bingoEngine.currentTurn = 'p1'; // P1 Host goes first

        showView('gameplay');
        renderGameplayBoard();
        updateTurnUI();
        updateScoreTrackers();
    }

    // Render Gameplay 5x5 Grid
    function renderGameplayBoard() {
        elements.gameplayBoard.innerHTML = '';
        elements.linesSvg.innerHTML = '';

        bingoEngine.myBoard.forEach((num, index) => {
            const cell = document.createElement('div');
            const isMarked = bingoEngine.markedNumbers.has(num);
            cell.className = `grid-cell play-cell ${isMarked ? 'marked' : ''}`;
            cell.innerText = num;
            cell.dataset.number = num;

            cell.addEventListener('click', () => {
                handleCellClick(num);
            });

            elements.gameplayBoard.appendChild(cell);
        });
    }

    // Submit Manual Number Call
    function submitManualCallNumber() {
        const val = parseInt(elements.inputCallNumber.value.trim());
        if (isNaN(val) || val < 1 || val > 25) {
            soundEngine.playClick();
            showToast('Vui lòng nhập số hợp lệ từ 1 đến 25!');
            return;
        }

        if (bingoEngine.markedNumbers.has(val)) {
            soundEngine.playClick();
            showToast(`Số ${val} đã được chọn trước đó rồi!`);
            elements.inputCallNumber.value = '';
            return;
        }

        handleCellClick(val);
        elements.inputCallNumber.value = '';
    }

    // Cell Selection Handling
    function handleCellClick(number) {
        if (bingoEngine.gameOver) return;

        // Check if turn matches role
        if (bingoEngine.mode === 'online') {
            if (!bingoEngine.isMyTurn()) {
                soundEngine.playClick();
                showToast('Đang là lượt của đối thủ!');
                return;
            }
        }

        if (bingoEngine.markedNumbers.has(number)) {
            return;
        }

        // Execute Move
        executeMove(number);

        // Transmit if Online
        if (bingoEngine.mode === 'online') {
            peerManager.sendData({
                type: 'SELECT_NUMBER',
                payload: { number }
            });
        }
    }

    // Claim Bingo Victory
    function claimBingoVictory() {
        if (bingoEngine.gameOver) return;

        const p1Lines = bingoEngine.checkCompletedLines(bingoEngine.myBoard).length;
        if (p1Lines < 5) {
            showToast('Chưa đủ 5 hàng Bingo để xướng thắng!');
            return;
        }

        bingoEngine.gameOver = true;
        const p2Lines = (bingoEngine.mode === 'ai' || bingoEngine.mode === 'local') 
            ? bingoEngine.checkCompletedLines(bingoEngine.oppBoard).length 
            : 0;

        if (bingoEngine.mode === 'online') {
            peerManager.sendData({
                type: 'BINGO_CLAIM',
                payload: { role: bingoEngine.myRole }
            });
        }

        showGameOverModal('my_win', p1Lines, p2Lines);
    }

    // Execute Number Marking
    function executeMove(number) {
        soundEngine.playMarkNumber();

        bingoEngine.markNumber(number);
        renderGameplayBoard();
        updateScoreTrackers();
        drawBingoLines();

        // Sound effect on line complete
        const p1Lines = bingoEngine.checkCompletedLines(bingoEngine.myBoard).length;
        if (p1Lines > 0 && p1Lines > (this.lastP1Lines || 0)) {
            soundEngine.playLineComplete();
        }
        this.lastP1Lines = p1Lines;

        // In AI Mode, check if Bot completed 5 lines
        if (bingoEngine.mode === 'ai') {
            const botLines = bingoEngine.checkCompletedLines(bingoEngine.oppBoard).length;
            if (botLines >= 5 && !bingoEngine.gameOver) {
                bingoEngine.gameOver = true;
                setTimeout(() => {
                    showGameOverModal('opp_win', p1Lines, botLines);
                }, 800);
                return;
            }
        }

        // Switch Turn
        bingoEngine.switchTurn();
        updateTurnUI();

        // Trigger Bot Move if AI Mode
        if (bingoEngine.mode === 'ai' && bingoEngine.currentTurn === 'p2' && !bingoEngine.gameOver) {
            setTimeout(() => {
                const botChoice = bingoEngine.getBestBotMove();
                if (botChoice) {
                    executeMove(botChoice);
                }
            }, 1000);
        }
    }

    // Draw SVG Line Overlay for Completed Lines
    function drawBingoLines() {
        elements.linesSvg.innerHTML = '';
        const myLines = bingoEngine.checkCompletedLines(bingoEngine.myBoard);

        myLines.forEach(line => {
            const pattern = line.pattern;
            const startIdx = pattern[0];
            const endIdx = pattern[pattern.length - 1];

            // Get SVG coordinates (500x500 viewport mapped to 5x5 grid)
            const cellWidth = 500 / 5;
            const startCol = startIdx % 5;
            const startRow = Math.floor(startIdx / 5);
            const endCol = endIdx % 5;
            const endRow = Math.floor(endIdx / 5);

            const x1 = startCol * cellWidth + cellWidth / 2;
            const y1 = startRow * cellWidth + cellWidth / 2;
            const x2 = endCol * cellWidth + cellWidth / 2;
            const y2 = endRow * cellWidth + cellWidth / 2;

            const lineEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            lineEl.setAttribute('x1', x1);
            lineEl.setAttribute('y1', y1);
            lineEl.setAttribute('x2', x2);
            lineEl.setAttribute('y2', y2);
            lineEl.setAttribute('class', 'bingo-line-path');

            elements.linesSvg.appendChild(lineEl);
        });
    }

    // Update Turn Indicator UI
    function updateTurnUI() {
        const isMyTurn = bingoEngine.isMyTurn();

        if (isMyTurn) {
            elements.turnIndicator.className = 'turn-badge your-turn';
            elements.turnText.innerText = 'LƯỢT CỦA BẠN';
        } else {
            elements.turnIndicator.className = 'turn-badge opp-turn';
            elements.turnText.innerText = 'LƯỢT ĐỐI PHƯƠNG';
        }
    }

    // Update B-I-N-G-O Letter Trackers & Unlock Claim Button
    function updateScoreTrackers() {
        const p1Lines = bingoEngine.checkCompletedLines(bingoEngine.myBoard).length;
        const p1ActiveLetters = bingoEngine.getBingoLetters(p1Lines);

        elements.p1LineCount.innerText = `${p1Lines}/5`;
        const p1LetterSpans = elements.p1BingoLetters.querySelectorAll('.letter');
        p1LetterSpans.forEach(span => {
            const letter = span.dataset.letter;
            if (p1ActiveLetters.includes(letter)) {
                span.classList.add('active');
            } else {
                span.classList.remove('active');
            }
        });

        // Unlock BINGO Claim Button if >= 5 lines achieved
        if (p1Lines >= 5 && !bingoEngine.gameOver) {
            if (elements.btnCallBingo.classList.contains('hidden')) {
                soundEngine.playReady();
                showToast('🎉 BẠN ĐÃ ĐỦ 5 HÀNG BINGO! BẤM NÚT BINGO ĐỂ CHIẾN THẮNG!');
            }
            elements.btnCallBingo.classList.remove('hidden');
            elements.btnCallBingo.disabled = false;
        } else if (p1Lines < 5) {
            elements.btnCallBingo.classList.add('hidden');
            elements.btnCallBingo.disabled = true;
        }
    }

    // Reset State and Prepare Setup View for Rematch
    function resetAndGoToSetup() {
        bingoEngine.markedNumbers = new Set();
        bingoEngine.myReady = false;
        bingoEngine.oppReady = false;
        bingoEngine.gameStarted = false;
        bingoEngine.gameOver = false;
        bingoEngine.winner = null;

        elements.btnRematch.disabled = false;
        elements.btnRematch.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Tái Đấu';
        elements.btnReady.disabled = false;
        elements.btnReady.innerText = 'SẴN SÀNG CHƠI';
        elements.modalGameOver.classList.add('hidden');
        elements.modalRematchOffer.classList.add('hidden');

        prepareSetupBoard();
    }

    // Handle incoming P2P data packets
    function handleP2PData(data) {
        const { type, payload } = data;

        if (type === 'PLAYER_READY') {
            bingoEngine.oppReady = true;
            elements.opponentSetupBadge.classList.add('ready');
            elements.opponentSetupText.innerText = 'Đối phương đã sẵn sàng!';
            showToast('Đối thủ đã chuẩn bị xong bàn số!');
            checkBothReadyToStart();
        } else if (type === 'SELECT_NUMBER') {
            executeMove(payload.number);
        } else if (type === 'BINGO_CLAIM') {
            bingoEngine.gameOver = true;
            soundEngine.playLose();
            const p1Lines = bingoEngine.checkCompletedLines(bingoEngine.myBoard).length;
            showGameOverModal('opp_win', p1Lines, 5);
        } else if (type === 'EMOTE') {
            soundEngine.playEmote();
            spawnFloatingEmote(payload.emote, false);
        } else if (type === 'REMATCH_OFFER') {
            soundEngine.playReady();
            elements.modalRematchOffer.classList.remove('hidden');
        } else if (type === 'REMATCH_ACCEPT') {
            soundEngine.playReady();
            showToast('🎉 Đối thủ đã ĐỒNG Ý Tái Đấu! Chuyển sang màn chuẩn bị...');
            resetAndGoToSetup();
        } else if (type === 'REMATCH_DECLINE') {
            soundEngine.playClick();
            showToast('Đối thủ đã TỪ CHỐI Tái Đấu.');
            elements.btnRematch.disabled = false;
            elements.btnRematch.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Tái Đấu';
        }
    }

    // Save Match Record to Express Server SQLite DB
    async function saveMatchToHistory(result, p1Lines, p2Lines) {
        try {
            const payload = {
                p1_name: elements.p1Name.innerText || 'BẠN',
                p2_name: elements.p2Name.innerText || 'ĐỐI THỦ',
                p1_lines: p1Lines || 0,
                p2_lines: p2Lines || 0,
                winner: result,
                mode: bingoEngine.mode
            };

            await fetch('/api/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            console.log('Saved match history to SQLite DB');
        } catch (e) {
            console.warn('Could not save match to server API:', e);
        }
    }

    // Fetch Match History & Stats from SQLite DB
    async function fetchMatchHistory() {
        elements.historyList.innerHTML = '<div class="loading-history"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải dữ liệu...</div>';
        try {
            const [histRes, statsRes] = await Promise.all([
                fetch('/api/history'),
                fetch('/api/stats')
            ]);

            const histData = await histRes.json();
            const statsData = await statsRes.json();

            elements.histStatTotal.innerText = statsData.totalGames || 0;
            elements.histStatWins.innerText = statsData.p1Wins || 0;

            renderHistoryList(histData.history || []);
        } catch (e) {
            console.error('Failed to fetch history:', e);
            elements.historyList.innerHTML = '<div class="loading-history">Không thể kết nối máy chủ API lịch sử.</div>';
        }
    }

    // Render History Cards List
    function renderHistoryList(historyArray) {
        if (!historyArray || historyArray.length === 0) {
            elements.historyList.innerHTML = '<div class="loading-history">Chưa có trận đấu nào được lưu.</div>';
            return;
        }

        elements.historyList.innerHTML = '';
        historyArray.forEach(item => {
            const isWin = item.winner === 'my_win' || item.winner === 'p1';
            const dateStr = new Date(item.created_at).toLocaleString('vi-VN', {
                hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
            });

            const card = document.createElement('div');
            card.className = `history-card ${isWin ? 'win' : 'loss'}`;
            card.innerHTML = `
                <div class="history-main-info">
                    <div class="history-players">${item.p1_name} vs ${item.p2_name}</div>
                    <div class="history-meta">
                        <span><i class="fa-solid fa-table-cells"></i> ${item.p1_lines} - ${item.p2_lines} Hàng</span>
                        <span><i class="fa-solid fa-gamepad"></i> Mode: ${item.mode.toUpperCase()}</span>
                        <span><i class="fa-solid fa-clock"></i> ${dateStr}</span>
                    </div>
                </div>
                <div class="history-badge-win ${isWin ? 'win' : 'loss'}">
                    ${isWin ? 'THẮNG' : 'THUA'}
                </div>
            `;
            elements.historyList.appendChild(card);
        });
    }

    // Floating Emote FX
    function spawnFloatingEmote(emote, isLocal) {
        const el = document.createElement('div');
        el.className = 'floating-emote';
        el.innerText = emote;

        const leftPos = isLocal ? Math.random() * 30 + 10 : Math.random() * 30 + 60;
        el.style.left = `${leftPos}%`;
        el.style.bottom = '20%';

        elements.floatingEmotesContainer.appendChild(el);
        setTimeout(() => el.remove(), 2000);
    }

    // Game Over Victory / Defeat Modal
    function showGameOverModal(result, p1Lines, p2Lines) {
        elements.modalGameOver.classList.remove('hidden');

        elements.statP1Lines.innerText = p1Lines;
        elements.statP2Lines.innerText = p2Lines;

        // Auto save match record to SQLite CSDL
        saveMatchToHistory(result, p1Lines, p2Lines);

        if (result === 'my_win') {
            soundEngine.playWin();
            confetti({
                particleCount: 120,
                spread: 70,
                origin: { y: 0.6 }
            });
            elements.modalTitle.innerText = 'BẠN ĐÃ CHIẾN THẮNG!';
            elements.modalTitle.style.color = 'var(--gold-yellow)';
            elements.modalDesc.innerText = 'Chúc mừng! Bạn đã hoàn thành 5 hàng Bingo trước!';
        } else if (result === 'opp_win') {
            soundEngine.playLose();
            elements.modalTitle.innerText = 'BẠN ĐÃ THẤT BẠI!';
            elements.modalTitle.style.color = 'var(--accent-magenta)';
            elements.modalDesc.innerText = 'Đối thủ đã tạo thành công 5 hàng Bingo trước bạn!';
        } else if (result === 'opp_disconnect') {
            elements.modalTitle.innerText = 'ĐỐI THỦ ĐÃ THOÁT!';
            elements.modalTitle.style.color = 'var(--primary-cyan)';
            elements.modalDesc.innerText = 'Phòng đấu đã bị ngắt kết nối.';
        }
    }

    // Run Initialization
    init();
});
