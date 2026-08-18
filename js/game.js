/* ==========================================================================
   NEON BINGO 2P - GAME LOGIC CORE & AI ENGINE
   ========================================================================== */

class BingoEngine {
    constructor() {
        // 12 Line definitions on a 5x5 grid (0-24 index)
        this.WIN_PATTERNS = [
            // 5 Rows
            [0, 1, 2, 3, 4],
            [5, 6, 7, 8, 9],
            [10, 11, 12, 13, 14],
            [15, 16, 17, 18, 19],
            [20, 21, 22, 23, 24],

            // 5 Columns
            [0, 5, 10, 15, 20],
            [1, 6, 11, 16, 21],
            [2, 7, 12, 17, 22],
            [3, 8, 13, 18, 23],
            [4, 9, 14, 19, 24],

            // 2 Diagonals
            [0, 6, 12, 18, 24],
            [4, 8, 12, 16, 20]
        ];

        this.resetState();
    }

    resetState() {
        this.mode = 'online'; // 'online', 'ai', 'local'
        this.myBoard = new Array(25).fill(null);
        this.oppBoard = new Array(25).fill(null);
        this.markedNumbers = new Set();
        
        this.currentTurn = 'p1'; // 'p1' (Local/Host) or 'p2' (Guest/Bot)
        this.myRole = 'p1'; // 'p1' or 'p2'
        
        this.myReady = false;
        this.oppReady = false;
        
        this.gameStarted = false;
        this.gameOver = false;
        this.winner = null;

        this.myLines = [];
        this.oppLines = [];
    }

    // Generate random 1-25 array
    generateRandomBoard() {
        const nums = Array.from({ length: 25 }, (_, i) => i + 1);
        // Fisher-Yates shuffle
        for (let i = nums.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nums[i], nums[j]] = [nums[j], nums[i]];
        }
        return nums;
    }

    // Smart Fill: Preserves manually placed numbers, randomly fills remaining empty slots
    fillRemainingRandomly(currentBoard) {
        if (!Array.isArray(currentBoard) || currentBoard.length !== 25) {
            return this.generateRandomBoard();
        }

        // Collect assigned numbers
        const assignedNums = new Set(currentBoard.filter(n => n !== null && n >= 1 && n <= 25));
        
        // Collect missing numbers
        const unassignedNums = [];
        for (let i = 1; i <= 25; i++) {
            if (!assignedNums.has(i)) {
                unassignedNums.push(i);
            }
        }

        // Shuffle missing numbers
        for (let i = unassignedNums.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [unassignedNums[i], unassignedNums[j]] = [unassignedNums[j], unassignedNums[i]];
        }

        // Construct complete board
        let unassignedIdx = 0;
        const newBoard = currentBoard.map(cell => {
            if (cell !== null && cell >= 1 && cell <= 25) {
                return cell;
            }
            return unassignedNums[unassignedIdx++];
        });

        return newBoard;
    }

    // Validate custom board setup (must contain exact 1-25 without duplicates)
    validateBoard(board) {
        if (!Array.isArray(board) || board.length !== 25) return false;
        const set = new Set(board.filter(n => n !== null && n >= 1 && n <= 25));
        return set.size === 25;
    }

    // Mark number on the board
    markNumber(number) {
        if (this.gameOver || !this.gameStarted) return false;
        if (this.markedNumbers.has(number)) return false;

        this.markedNumbers.add(number);
        
        // Evaluate lines for both players
        this.myLines = this.checkCompletedLines(this.myBoard);
        if (this.mode === 'ai' || this.mode === 'local') {
            this.oppLines = this.checkCompletedLines(this.oppBoard);
        }

        return true;
    }

    // Evaluate how many lines are completed for a given 5x5 board
    checkCompletedLines(board) {
        if (!board || board.includes(null)) return [];

        const completedLines = [];

        this.WIN_PATTERNS.forEach((pattern, index) => {
            const isComplete = pattern.every(cellIdx => {
                const num = board[cellIdx];
                return this.markedNumbers.has(num);
            });
            if (isComplete) {
                completedLines.push({ index, pattern });
            }
        });

        return completedLines;
    }

    // Map line count to B-I-N-G-O letters
    getBingoLetters(completedCount) {
        const letters = ['B', 'I', 'N', 'G', 'O'];
        const activeLetters = [];
        const count = Math.min(completedCount, 5);
        for (let i = 0; i < count; i++) {
            activeLetters.push(letters[i]);
        }
        return activeLetters;
    }

    // Check Win Condition: First to reach 5 lines!
    checkWinCondition(myLineCount, oppLineCount) {
        if (myLineCount >= 5 && oppLineCount >= 5) {
            // Draw or sudden tie break (First who called gets precedence or draw)
            return 'draw';
        } else if (myLineCount >= 5) {
            return 'my_win';
        } else if (oppLineCount >= 5) {
            return 'opp_win';
        }
        return null;
    }

    // Intelligent Bot Decision Making
    getBestBotMove() {
        if (!this.oppBoard || this.oppBoard.includes(null)) return null;

        const availableNums = this.oppBoard.filter(n => !this.markedNumbers.has(n));
        if (availableNums.length === 0) return null;

        // Score each available number based on completing lines
        let bestNum = availableNums[0];
        let maxScore = -1;

        availableNums.forEach(num => {
            let score = 0;
            // Find cell index of this num in bot's board
            const cellIdx = this.oppBoard.indexOf(num);

            // Check how close each pattern containing this cell is to completion
            this.WIN_PATTERNS.forEach(pattern => {
                if (pattern.includes(cellIdx)) {
                    let markedCount = 0;
                    pattern.forEach(pIdx => {
                        if (this.markedNumbers.has(this.oppBoard[pIdx])) {
                            markedCount++;
                        }
                    });
                    // Higher weight for lines almost completed (e.g., 4 marked out of 5)
                    score += Math.pow(4, markedCount);
                }
            });

            if (score > maxScore) {
                maxScore = score;
                bestNum = num;
            }
        });

        return bestNum;
    }

    // Toggle turn between P1 and P2
    switchTurn() {
        this.currentTurn = this.currentTurn === 'p1' ? 'p2' : 'p1';
        return this.currentTurn;
    }

    isMyTurn() {
        return this.currentTurn === this.myRole;
    }
}

window.bingoEngine = new BingoEngine();
