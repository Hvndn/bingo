/* ==========================================================================
   NEON BINGO 2P - PEERJS NETWORK MANAGER (WebRTC P2P Engine)
   ========================================================================== */

class PeerManager {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.peerId = null;
        this.roomCode = null;
        this.isHost = false;
        this.isConnected = false;

        // Callbacks
        this.onStatusChange = null;
        this.onDataReceived = null;
        this.onError = null;
    }

    // Generate random 6-digit numeric room code (e.g., 847293)
    generateRoomCode() {
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += Math.floor(Math.random() * 10).toString();
        }
        if (code[0] === '0') code = '1' + code.slice(1);
        return code;
    }

    // Format full PeerJS Peer ID from room code
    getFullPeerId(code) {
        return `nbingo-${code.trim()}`;
    }

    // Initialize Host Peer & Create Room
    createRoom(onRoomCreated) {
        this.isHost = true;
        this.roomCode = this.generateRoomCode();
        const fullId = this.getFullPeerId(this.roomCode);

        this.initPeer(fullId, () => {
            if (onRoomCreated) onRoomCreated(this.roomCode);
            this.updateStatus('WAITING_FOR_GUEST', 'Đang chờ đối thủ nhập mã phòng...');
        });
    }

    // Join Existing Room
    joinRoom(code, onConnected) {
        this.isHost = false;
        this.roomCode = code.trim();
        const hostFullId = this.getFullPeerId(this.roomCode);

        // Use unique random guest ID to avoid conflict
        const guestId = `nbingo-guest-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

        this.initPeer(guestId, () => {
            this.updateStatus('CONNECTING', 'Đang kết nối tới phòng...');
            
            try {
                const conn = this.peer.connect(hostFullId, {
                    reliable: true,
                    serialization: 'json'
                });
                this.setupConnection(conn, onConnected);
            } catch (err) {
                console.error('Peer connect error:', err);
                this.handleError('Không thể kết nối tới phòng. Kiểm tra lại mã phòng!');
            }
        });
    }

    // Initialize PeerJS - use local embedded server on localhost, cloud otherwise
    initPeer(id, onOpen) {
        // Destroy old peer first
        if (this.peer) {
            try { this.peer.destroy(); } catch (e) {}
            this.peer = null;
        }

        const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

        const config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        let peerOpts = { debug: 2, config };

        if (isLocal) {
            // Use embedded PeerServer on the same Node.js port
            peerOpts.host = 'localhost';
            peerOpts.port = parseInt(location.port) || 3000;
            peerOpts.path = '/peerjs/myapp';
            peerOpts.secure = false;
        }
        // On non-localhost (Render, etc.) use PeerJS cloud server (default - no host/port needed)

        console.log(`[PeerJS] Initializing with ID: ${id}, local: ${isLocal}`);
        this.peer = new Peer(id, peerOpts);

        this.peer.on('open', (assignedId) => {
            this.peerId = assignedId;
            console.log('[PeerJS] Peer open, ID:', assignedId);
            if (onOpen) onOpen(assignedId);
        });

        // Host listens for incoming connections
        this.peer.on('connection', (conn) => {
            if (this.isHost) {
                console.log('[PeerJS] Guest connecting:', conn.peer);
                this.setupConnection(conn);
            }
        });

        this.peer.on('error', (err) => {
            console.error('[PeerJS] Error:', err.type, err.message);
            let errMsg = 'Lỗi kết nối mạng!';
            if (err.type === 'peer-unavailable') {
                errMsg = 'Không tìm thấy phòng này. Kiểm tra lại mã phòng!';
            } else if (err.type === 'unavailable-id') {
                errMsg = 'Mã phòng bị trùng. Đang tạo mã mới...';
            } else if (err.type === 'network' || err.type === 'server-error') {
                errMsg = 'Lỗi máy chủ kết nối. Thử lại sau!';
            }
            this.handleError(errMsg);
        });

        this.peer.on('disconnected', () => {
            console.warn('[PeerJS] Disconnected from signaling server, reconnecting...');
            // Only reconnect if we still have an active connection (don't reconnect if user left)
            if (this.peer && !this.peer.destroyed && this.isConnected) {
                try { this.peer.reconnect(); } catch (e) { console.error('Reconnect error:', e); }
            }
        });
    }

    // Setup Data Connection Listeners
    setupConnection(conn, onConnected) {
        this.conn = conn;

        this.conn.on('open', () => {
            this.isConnected = true;
            console.log('[PeerJS] Data channel open!');
            this.updateStatus('CONNECTED', 'Đã kết nối thành công với đối thủ!');

            if (onConnected) onConnected();

            // Both sides send handshake to trigger UI transition
            this.sendData({ type: 'HANDSHAKE', payload: { role: this.isHost ? 'HOST' : 'GUEST' } });
        });

        this.conn.on('data', (data) => {
            console.log('[PeerJS] Received:', data.type);
            if (this.onDataReceived) {
                this.onDataReceived(data);
            }
        });

        this.conn.on('close', () => {
            this.isConnected = false;
            console.warn('[PeerJS] Connection closed');
            this.updateStatus('CLOSED', 'Đối thủ đã ngắt kết nối!');
        });

        this.conn.on('error', (err) => {
            console.error('[PeerJS] Connection error:', err);
            this.handleError('Lỗi gián đoạn kênh truyền dữ liệu!');
        });
    }

    // Send data to connected peer
    sendData(data) {
        if (this.conn && this.conn.open) {
            this.conn.send(data);
        } else {
            console.warn('[PeerJS] Cannot send data - connection not open');
        }
    }

    // Disconnect & Cleanup
    disconnect() {
        this.isConnected = false;
        if (this.conn) {
            try { this.conn.close(); } catch (e) {}
            this.conn = null;
        }
        if (this.peer) {
            try { this.peer.destroy(); } catch (e) {}
            this.peer = null;
        }
        this.isHost = false;
        this.roomCode = null;
        this.updateStatus('IDLE', 'Chưa kết nối');
    }

    updateStatus(state, message) {
        if (this.onStatusChange) {
            this.onStatusChange({ state, message, isHost: this.isHost, roomCode: this.roomCode });
        }
    }

    handleError(message) {
        if (typeof window.showToast === 'function') {
            window.showToast(message);
        }
        if (this.onError) {
            this.onError(message);
        }
    }
}

window.peerManager = new PeerManager();
