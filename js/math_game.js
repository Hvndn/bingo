/* ==========================================================================
   NEON BINGO 2P - MATH GAME ENGINE (Game 2: 10x10 Math Number Hunt)
   ========================================================================== */

class MathGameEngine {
    constructor() {
        this.resetState();
    }

    resetState() {
        this.mode = 'online'; // 'online', 'ai', 'local'
        this.myRole = 'p1'; // 'p1' or 'p2'
        
        this.timeLimit = 200; // Default 200s
        this.p1TimeLeft = 200;
        this.p2TimeLeft = 200;
        
        this.p1Score = 0;
        this.p2Score = 0;
        
        this.currentPhase = 'PROMPT'; // 'PROMPT' (Đố số) or 'FIND' (Tìm số)
        this.currentAttacker = 'p1'; // Player who prompts target
        this.currentDefender = 'p2'; // Player who searches grid while clock ticks
        this.currentTargetNum = null;

        this.myBoard = new Array(100).fill(null);
        this.oppBoard = new Array(100).fill(null);
        
        this.markedCells = new Map(); // cellIndex -> 'p1' | 'p2'
        this.foundNumbers = new Set(); // Set of target numbers already found
        this.promptHistory = []; // Array of prompted target numbers in order

        this.wrongClickStreak = 0; // Count consecutive wrong clicks
        this.isSpamLocked = false; // Anti-spam lock flag (3s penalty)

        this.myReady = false;
        this.oppReady = false;
        this.gameStarted = false;
        this.gameOver = false;
        this.winner = null;

        this.timerInterval = null;
    }

    // Generate clean math expression for a given target number N (1 to 100)
    generateMathExprFor(targetNum) {
        const types = ['add', 'sub', 'mul', 'div', 'mixed'];
        const chosenType = types[Math.floor(Math.random() * types.length)];

        let exprStr = '';

        if (chosenType === 'add') {
            const a = Math.floor(Math.random() * (targetNum - 1)) + 1;
            const b = targetNum - a;
            exprStr = `${a} + ${b}`;
        } else if (chosenType === 'sub') {
            const b = Math.floor(Math.random() * 30) + 1;
            const a = targetNum + b;
            exprStr = `${a} - ${b}`;
        } else if (chosenType === 'mul') {
            const factors = [];
            for (let i = 1; i <= Math.sqrt(targetNum); i++) {
                if (targetNum % i === 0) factors.push(i);
            }
            if (factors.length > 1) {
                const a = factors[Math.floor(Math.random() * (factors.length - 1)) + 1];
                const b = targetNum / a;
                exprStr = `${a} × ${b}`;
            } else {
                const a = Math.floor(Math.random() * (targetNum - 1)) + 1;
                exprStr = `${a} + ${targetNum - a}`;
            }
        } else if (chosenType === 'div') {
            const k = Math.floor(Math.random() * 4) + 2; // multiplier 2..5
            const a = targetNum * k;
            exprStr = `${a} ÷ ${k}`;
        } else {
            // Mixed: a * b + c = targetNum
            if (targetNum > 5) {
                const c = Math.floor(Math.random() * (targetNum - 4)) + 1;
                const rem = targetNum - c;
                const factors = [];
                for (let i = 1; i <= Math.sqrt(rem); i++) {
                    if (rem % i === 0) factors.push(i);
                }
                const a = factors[factors.length - 1];
                const b = rem / a;
                exprStr = `${a} × ${b} + ${c}`;
            } else {
                exprStr = `1 + ${targetNum - 1}`;
            }
        }

        return {
            targetNum,
            expr: exprStr
        };
    }

    // Generate random 100 math items for numbers 1 to 100
    generateRandom100Board() {
        const board = [];
        const nums = Array.from({ length: 100 }, (_, i) => i + 1);
        
        // Fisher-Yates shuffle
        for (let i = nums.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nums[i], nums[j]] = [nums[j], nums[i]];
        }

        nums.forEach(n => {
            board.push(this.generateMathExprFor(n));
        });

        return board;
    }

    // Smart Fill for 10x10 board: Keeps manual entries, fills missing 1-100 randomly
    fillRemainingRandomly100(currentBoard) {
        if (!Array.isArray(currentBoard) || currentBoard.length !== 100) {
            return this.generateRandom100Board();
        }

        const assignedNums = new Set(currentBoard.filter(c => c !== null).map(c => c.targetNum));
        const unassignedNums = [];
        for (let i = 1; i <= 100; i++) {
            if (!assignedNums.has(i)) {
                unassignedNums.push(i);
            }
        }

        // Shuffle missing numbers
        for (let i = unassignedNums.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [unassignedNums[i], unassignedNums[j]] = [unassignedNums[j], unassignedNums[i]];
        }

        let uIdx = 0;
        return currentBoard.map(cell => {
            if (cell !== null && cell.targetNum >= 1 && cell.targetNum <= 100) {
                return cell;
            }
            return this.generateMathExprFor(unassignedNums[uIdx++]);
        });
    }

    // Submit target prompt N from attacker
    setPromptTarget(number) {
        if (this.currentPhase !== 'PROMPT') return false;
        if (this.foundNumbers.has(number)) return false;

        this.currentTargetNum = number;
        this.currentPhase = 'FIND';
        
        // Record into history
        if (!this.promptHistory.includes(number)) {
            this.promptHistory.push(number);
        }

        return true;
    }

    // Attempt cell selection by defender
    selectCell(cellIndex, playerRole) {
        if (this.currentPhase !== 'FIND' || this.gameOver || this.isSpamLocked) return false;

        const cell = this.myBoard[cellIndex];
        if (!cell) return false;

        if (cell.targetNum === this.currentTargetNum) {
            // Correct match found! Reset wrong click streak
            this.wrongClickStreak = 0;

            this.markedCells.set(cellIndex, playerRole);
            this.foundNumbers.add(this.currentTargetNum);

            if (playerRole === 'p1') this.p1Score++;
            else this.p2Score++;

            // Switch turn: Defender now becomes Attacker
            this.currentAttacker = playerRole;
            this.currentDefender = playerRole === 'p1' ? 'p2' : 'p1';
            this.currentPhase = 'PROMPT';
            this.currentTargetNum = null;

            return { success: true, cellIndex, playerRole, isComplete: this.foundNumbers.size === 100 };
        } else {
            // Wrong click! Increment wrong streak
            this.wrongClickStreak++;
            return { success: false, wrongStreak: this.wrongClickStreak };
        }
    }

    // Evaluate Win Condition
    checkWinCondition() {
        if (this.p1TimeLeft <= 0) {
            return 'opp_win'; // P1 ran out of time
        }
        if (this.p2TimeLeft <= 0) {
            return 'my_win'; // P2 ran out of time
        }

        if (this.foundNumbers.size >= 100) {
            if (this.p1Score > this.p2Score) return 'my_win';
            if (this.p2Score > this.p1Score) return 'opp_win';
            return 'draw';
        }

        return null;
    }

    // AI Bot Search Logic for Game 2
    getBestBotChoiceForTarget(targetNum) {
        if (!this.myBoard || this.myBoard.includes(null)) return -1;
        // Find exact cell index containing targetNum
        return this.myBoard.findIndex(cell => cell && cell.targetNum === targetNum);
    }
}

window.mathGameEngine = new MathGameEngine();
