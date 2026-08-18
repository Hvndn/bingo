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
        
        this.timeLimit = 200; // Default 200s (shared timer)
        this.sharedTimeLeft = 200; // Single shared countdown timer
        
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

    // Generate math expression for a given target number N (1-100)
    // Seeded pseudo-random generator (Mulberry32)
    createRandomGenerator(seedInput) {
        let seed = 12345;
        if (typeof seedInput === 'number' && !isNaN(seedInput)) {
            seed = seedInput;
        } else if (typeof seedInput === 'string' && seedInput.length > 0) {
            seed = 0;
            for (let i = 0; i < seedInput.length; i++) {
                seed = (seed << 5) - seed + seedInput.charCodeAt(i);
                seed |= 0;
            }
        } else {
            seed = Math.floor(Math.random() * 1000000);
        }

        return function() {
            let t = seed += 0x6D2B79F5;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // ALL operands guaranteed to stay within 1-100 range
    generateMathExprFor(targetNum, rng = Math.random) {
        const candidates = [];

        // --- Addition: a + b = targetNum, both a,b in [1,99] ---
        if (targetNum >= 2) {
            const a = Math.floor(rng() * (targetNum - 1)) + 1; // 1..targetNum-1
            const b = targetNum - a; // also 1..targetNum-1
            candidates.push(`${a} + ${b}`);
        }

        // --- Subtraction: a - b = targetNum, a <= 100, b >= 1 ---
        // a = targetNum + b, need a <= 100, so b <= 100 - targetNum
        if (100 - targetNum >= 1) {
            const maxB = 100 - targetNum;
            const b = Math.floor(rng() * maxB) + 1; // 1..maxB
            const a = targetNum + b; // guaranteed <= 100
            candidates.push(`${a} - ${b}`);
        }

        // --- Multiplication: a × b = targetNum, both a,b in [1,100] ---
        const factors = [];
        for (let i = 1; i <= Math.sqrt(targetNum); i++) {
            if (targetNum % i === 0) {
                const j = targetNum / i;
                if (i >= 1 && j <= 100) factors.push([i, j]);
            }
        }
        if (factors.length > 0) {
            const [a, b] = factors[Math.floor(rng() * factors.length)];
            if (a !== 1 || b !== 1) { // avoid "1 × N" if possible
                candidates.push(`${a} × ${b}`);
            }
        }

        // --- Division: a ÷ k = targetNum, a = targetNum*k <= 100 ---
        const divPairs = [];
        for (let k = 2; k <= 10; k++) {
            const a = targetNum * k;
            if (a <= 100) divPairs.push([a, k]);
        }
        if (divPairs.length > 0) {
            const [a, k] = divPairs[Math.floor(rng() * divPairs.length)];
            candidates.push(`${a} ÷ ${k}`);
        }

        // Pick a candidate expression deterministically via rng
        if (candidates.length === 0) {
            const a = Math.max(1, targetNum - 1);
            return { targetNum, expr: `${a} + ${targetNum - a}` };
        }

        const expr = candidates[Math.floor(rng() * candidates.length)];
        return { targetNum, expr };
    }

    // Generate a deterministic 100-cell board using optional seed (e.g. roomCode)
    generateRandom100Board(seedInput = null) {
        const rng = this.createRandomGenerator(seedInput);
        const nums = Array.from({ length: 100 }, (_, i) => i + 1);
        
        // Fisher-Yates shuffle with seeded RNG
        for (let i = nums.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [nums[i], nums[j]] = [nums[j], nums[i]];
        }

        const usedExprs = new Set();
        return nums.map(n => {
            let item;
            let attempts = 0;
            do {
                item = this.generateMathExprFor(n, rng);
                attempts++;
            } while (usedExprs.has(item.expr) && attempts < 20);
            
            usedExprs.add(item.expr);
            return item;
        });
    }

    // Restore board from serialized data (used when host syncs board to guest)
    boardFromJSON(jsonArr) {
        if (!Array.isArray(jsonArr) || jsonArr.length !== 100) return null;
        return jsonArr.map(cell => ({
            targetNum: cell.targetNum,
            expr: cell.expr
        }));
    }

    // Smart Fill: Keeps manual entries, fills remaining slots randomly (within 1-100)
    fillRemainingRandomly100(currentBoard) {
        if (!Array.isArray(currentBoard) || currentBoard.length !== 100) {
            return this.generateRandom100Board();
        }

        const assignedNums = new Set(currentBoard.filter(c => c !== null).map(c => c.targetNum));
        const unassignedNums = [];
        for (let i = 1; i <= 100; i++) {
            if (!assignedNums.has(i)) unassignedNums.push(i);
        }

        // Shuffle missing numbers
        for (let i = unassignedNums.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [unassignedNums[i], unassignedNums[j]] = [unassignedNums[j], unassignedNums[i]];
        }

        const usedExprs = new Set(currentBoard.filter(c => c !== null).map(c => c.expr));
        let uIdx = 0;
        return currentBoard.map(cell => {
            if (cell !== null && cell.targetNum >= 1 && cell.targetNum <= 100) return cell;
            const targetNum = unassignedNums[uIdx++];
            let item;
            let attempts = 0;
            do {
                item = this.generateMathExprFor(targetNum);
                attempts++;
            } while (usedExprs.has(item.expr) && attempts < 20);
            usedExprs.add(item.expr);
            return item;
        });
    }

    // Submit target prompt N from attacker
    setPromptTarget(number) {
        if (this.currentPhase !== 'PROMPT') return false;
        if (this.foundNumbers.has(number)) return false;

        this.currentTargetNum = number;
        this.currentPhase = 'FIND';
        
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
            this.wrongClickStreak = 0;

            this.markedCells.set(cellIndex, playerRole);
            this.foundNumbers.add(this.currentTargetNum);

            if (playerRole === 'p1') this.p1Score++;
            else this.p2Score++;

            // Switch turn: Defender becomes Attacker
            this.currentAttacker = playerRole;
            this.currentDefender = playerRole === 'p1' ? 'p2' : 'p1';
            this.currentPhase = 'PROMPT';
            this.currentTargetNum = null;

            return { success: true, cellIndex, playerRole, isComplete: this.foundNumbers.size === 100 };
        } else {
            this.wrongClickStreak++;
            return { success: false, wrongStreak: this.wrongClickStreak };
        }
    }

    // Evaluate Win Condition (shared timer + score comparison)
    checkWinCondition() {
        if (this.sharedTimeLeft <= 0) {
            if (this.p1Score > this.p2Score) return this.myRole === 'p1' ? 'my_win' : 'opp_win';
            if (this.p2Score > this.p1Score) return this.myRole === 'p2' ? 'my_win' : 'opp_win';
            return 'draw';
        }

        if (this.foundNumbers.size >= 100) {
            if (this.p1Score > this.p2Score) return this.myRole === 'p1' ? 'my_win' : 'opp_win';
            if (this.p2Score > this.p1Score) return this.myRole === 'p2' ? 'my_win' : 'opp_win';
            return 'draw';
        }

        return null;
    }

    // AI Bot Search Logic for Game 2
    getBestBotChoiceForTarget(targetNum) {
        if (!this.myBoard || this.myBoard.includes(null)) return -1;
        return this.myBoard.findIndex(cell => cell && cell.targetNum === targetNum);
    }
}

window.mathGameEngine = new MathGameEngine();
