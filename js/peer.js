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
        // Ensure no leading zero
        if (code[0] === '0') code = '1' + code.slice(1);
        return code;
    }

    // Format full PeerJS ID prefix
    getFullPeerId(code) {
        return `neon-bingo-v1-${code.trim().toUpperCase()}`;
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

    // Join Existing Room Code
    joinRoom(code, onConnected) {
        this.isHost = false;
        this.roomCode = code.trim().toUpperCase();
        const hostFullId = this.getFullPeerId(this.roomCode);

        // Generate temporary client peer ID
        const clientTempId = `neon-bingo-client-${Math.random().toString(36).substr(2, 6)}`;

        this.initPeer(clientTempId, () => {
            this.updateStatus('CONNECTING', 'Đang kết nối tới phòng...');
            
            try {
                const conn = this.peer.connect(hostFullId, { reliable: true });
                this.setupConnection(conn, onConnected);
            } catch (err) {
                console.error('Peer connect error:', err);
                this.handleError('Không thể kết nối tới phòng. Kiểm tra lại mã phòng!');
            }
        });
    }

    // Initialize PeerJS Object with Local/Cloud Server Option
    initPeer(id, onOpen) {
        if (this.peer) {
            try {
                this.peer.destroy();
            } catch (e) {}
        }

        const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        let peerOpts = {
            debug: 1,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' }
                ]
            }
        };

        if (isLocalhost) {
            peerOpts.host = location.hostname;
            peerOpts.port = location.port || 3000;
            peerOpts.path = '/peerjs/myapp';
        }

        this.peer = new Peer(id, peerOpts);

        this.peer.on('open', (assignedId) => {
            this.peerId = assignedId;
            console.log('Peer initialized with ID:', assignedId);
            if (onOpen) onOpen(assignedId);
        });

        // Host listens for incoming guest connection
        this.peer.on('connection', (conn) => {
            if (this.isHost) {
                console.log('Guest connecting:', conn.peer);
                this.setupConnection(conn);
            }
        });

        this.peer.on('error', (err) => {
            console.error('PeerJS error:', err.type, err);
            let errMsg = 'Lỗi kết nối mạng!';
            if (err.type === 'peer-unavailable') {
                errMsg = 'Không tìm thấy phòng với mã này. Hãy kiểm tra lại mã!';
            } else if (err.type === 'unavailable-id') {
                errMsg = 'Mã phòng đang trùng lặp. Đang tạo mã mới...';
            }
            this.handleError(errMsg);
        });

        this.peer.on('disconnected', () => {
            console.warn('Peer disconnected from signaling server, attempting automatic reconnect...');
            if (this.peer && !this.peer.destroyed) {
                try {
                    this.peer.reconnect();
                } catch (e) {
                    console.error('Reconnect error:', e);
                }
            }
        });
    }

    // Setup Data Connection Listeners
    setupConnection(conn, onConnected) {
        this.conn = conn;

        this.conn.on('open', () => {
            this.isConnected = true;
            console.log('P2P Data Channel Connected!');
            this.updateStatus('CONNECTED', 'Đã kết nối thành công với đối thủ!');

            if (onConnected) onConnected();

            // Send handshake packet from both host & guest to trigger auto-transition
            this.sendData({ type: 'HANDSHAKE', payload: { role: this.isHost ? 'HOST' : 'GUEST' } });
        });

        this.conn.on('data', (data) => {
            console.log('Received P2P Data:', data);
            if (this.onDataReceived) {
                this.onDataReceived(data);
            }
        });

        this.conn.on('close', () => {
            this.isConnected = false;
            console.warn('P2P connection closed');
            this.updateStatus('CLOSED', 'Đối thủ đã ngắt kết nối!');
        });

        this.conn.on('error', (err) => {
            console.error('Connection error:', err);
            this.handleError('Lỗi gián đoạn kênh truyền dữ liệu!');
        });
    }

    // Send payload to connected peer
    sendData(data) {
        if (this.conn && this.conn.open) {
            this.conn.send(data);
        } else {
            console.warn('Cannot send data, connection not open');
        }
    }

    // Disconnect & Cleanup
    disconnect() {
        if (this.conn) {
            this.conn.close();
            this.conn = null;
        }
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        this.isConnected = false;
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
        if (this.onError) {
            this.onError(message);
        }
    }
}

window.peerManager = new PeerManager();
