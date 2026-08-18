/* ==========================================================================
   NEON BINGO 2P - FULLSTACK BACKEND SERVER (Node.js + Express + JSON DB)
   ========================================================================== */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'history.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Helper: Read DB File
function readDB() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = { history: [] };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
        return initialData;
    }
    try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        return { history: [] };
    }
}

// Helper: Write DB File
function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

console.log('📦 Connected to JSON database at:', DB_FILE);

// API 1: Save match history
app.post('/api/history', (req, res) => {
    try {
        const { p1_name, p2_name, p1_lines, p2_lines, winner, mode } = req.body;

        if (!winner) {
            return res.status(400).json({ error: 'Missing required field: winner' });
        }

        const db = readDB();
        const newRecord = {
            id: Date.now(),
            p1_name: p1_name || 'Player 1',
            p2_name: p2_name || 'Player 2',
            p1_lines: p1_lines || 0,
            p2_lines: p2_lines || 0,
            winner: winner,
            mode: mode || 'online',
            created_at: new Date().toISOString()
        };

        db.history.unshift(newRecord); // Add to beginning of array
        writeDB(db);

        console.log('✅ Saved match record ID:', newRecord.id);
        res.json({ success: true, id: newRecord.id });
    } catch (err) {
        console.error('❌ DB Save Error:', err);
        res.status(500).json({ error: 'Failed to save match history' });
    }
});

// API 2: Get recent match history
app.get('/api/history', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const db = readDB();
        const history = db.history.slice(0, limit);
        res.json({ history });
    } catch (err) {
        console.error('❌ DB Fetch Error:', err);
        res.status(500).json({ error: 'Failed to fetch match history' });
    }
});

// API 3: Get stats summary
app.get('/api/stats', (req, res) => {
    try {
        const db = readDB();
        const history = db.history;
        const totalGames = history.length;
        const p1Wins = history.filter(h => h.winner === 'p1' || h.winner === 'my_win').length;
        const p2Wins = history.filter(h => h.winner === 'p2' || h.winner === 'opp_win').length;

        res.json({
            totalGames,
            p1Wins,
            p2Wins
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

const { ExpressPeerServer } = require('peer');

// Start Server
const server = app.listen(PORT, () => {
    console.log(`🚀 NEON BINGO Fullstack Server running at http://localhost:${PORT}`);
});

// Integrated PeerServer for reliable instant WebRTC P2P signaling
const peerServer = ExpressPeerServer(server, {
    debug: false,
    path: '/myapp'
});

app.use('/peerjs', peerServer);

