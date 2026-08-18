/* ==========================================================================
   NEON BINGO 2P - SOUND ENGINE (Web Audio API Synthesizer)
   ========================================================================== */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = localStorage.getItem('bingo_sound_muted') === 'true';
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('bingo_sound_muted', this.muted);
        return this.muted;
    }

    isMuted() {
        return this.muted;
    }

    // Play a single note frequency
    playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.1) {
        if (this.muted) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            console.warn('Audio Context Error:', e);
        }
    }

    // Sound 1: Click / Select
    playClick() {
        this.playTone(800, 'sine', 0.05, 0.08);
    }

    // Sound 2: Ready Chime
    playReady() {
        if (this.muted) return;
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, idx) => {
            setTimeout(() => this.playTone(freq, 'triangle', 0.15, 0.12), idx * 80);
        });
    }

    // Sound 3: Mark Number Pop
    playMarkNumber() {
        if (this.muted) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.1);

            gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.1);
        } catch (e) {}
    }

    // Sound 4: Complete Line Fanfare
    playLineComplete() {
        if (this.muted) return;
        const chord = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        chord.forEach((freq, idx) => {
            setTimeout(() => this.playTone(freq, 'sine', 0.25, 0.15), idx * 60);
        });
    }

    // Sound 5: Game Win Fanfare
    playWin() {
        if (this.muted) return;
        const melody = [
            { f: 523.25, d: 0.15 }, { f: 659.25, d: 0.15 }, { f: 783.99, d: 0.15 },
            { f: 1046.50, d: 0.35 }, { f: 880, d: 0.15 }, { f: 1046.50, d: 0.5 }
        ];
        let delay = 0;
        melody.forEach(item => {
            setTimeout(() => this.playTone(item.f, 'triangle', item.d, 0.2), delay);
            delay += item.d * 1000 * 0.9;
        });
    }

    // Sound 6: Game Defeat Tone
    playLose() {
        if (this.muted) return;
        const notes = [400, 350, 300, 250];
        notes.forEach((freq, idx) => {
            setTimeout(() => this.playTone(freq, 'sawtooth', 0.2, 0.08), idx * 120);
        });
    }

    // Sound 7: Emote sound
    playEmote() {
        if (this.muted) return;
        this.playTone(600, 'sine', 0.1, 0.1);
    }
}

window.soundEngine = new SoundEngine();
