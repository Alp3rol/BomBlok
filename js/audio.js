import { state } from './state.js';
import { soundBtn } from './state.js';

// --- WEB AUDIO API: SYNTHESIZED SOUND EFFECTS ---
export const AudioFX = {
    ctx: null,
    muted: localStorage.getItem('block_blast_muted') === 'true',

    init() {
        if (this.ctx) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            this.ctx = new AudioContextClass();
        }
    },

    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('block_blast_muted', this.muted);
        this.updateButtonUI();
        if (this.muted) {
            this.stopBgMusic();
        } else {
            this.startBgMusic();
        }
        return this.muted;
    },

    updateButtonUI() {
        if (!soundBtn) return;
        if (this.muted) {
            soundBtn.textContent = '🔇';
            soundBtn.classList.add('muted');
        } else {
            soundBtn.textContent = '🔊';
            soundBtn.classList.remove('muted');
        }
    },

    autoDisconnect(osc, ...nodes) {
        osc.onended = () => {
            try { osc.disconnect(); } catch (e) {}
            nodes.forEach(n => { try { n.disconnect(); } catch (e) {} });
        };
    },

    play(setupFn) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        setupFn(this.ctx);
    },

    playDrop() {
        this.play((ctx) => {
            const now = ctx.currentTime;
            const duration = 0.06; // very short decay

            // Fundamental sine (soft & warm)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(350, now);
            osc1.frequency.exponentialRampToValueAtTime(120, now + duration);
            gain1.gain.setValueAtTime(0.25, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);
            osc1.start(now);
            osc1.stop(now + duration);

            // Quiet wood block overtone
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(700, now);
            osc2.frequency.exponentialRampToValueAtTime(240, now + duration);
            gain2.gain.setValueAtTime(0.06, now);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + duration);
            osc2.start(now);
            osc2.stop(now + duration);
        });
    },

    playGrab() {
        this.play((ctx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            // A soft, low-frequency 30ms pop
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.03);

            gain.gain.setValueAtTime(0.06, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.03);
        });
    },

    playRotate() {
        this.play((ctx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            // Soft sine sweep
            osc.type = 'sine';
            osc.frequency.setValueAtTime(500, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);

            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.05);
        });
    },

    playClear(comboCount = 1) {
        this.play((ctx) => {
            const now = ctx.currentTime;
            
            const isNeon = document.body.classList.contains('theme-neon');
            const isCandy = document.body.classList.contains('theme-candy');
            const isWood = document.body.classList.contains('theme-wood');
            const isSeasons = document.body.classList.contains('theme-seasons');

            const duration = 0.15;
            
            if (isNeon) {
                // Zapping / Electric sound
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150 * comboCount, now);
                osc.frequency.exponentialRampToValueAtTime(800 + comboCount * 100, now + duration);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
                osc.start(now);
                osc.stop(now + duration);
                return;
            } 
            
            if (isCandy) {
                // Bubble pop sound
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400 + comboCount * 50, now);
                osc.frequency.exponentialRampToValueAtTime(800 + comboCount * 50, now + duration * 0.5);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
                osc.start(now);
                osc.stop(now + duration);
                return;
            }
            
            if (isWood) {
                // Thud / wooden crack
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(300 + comboCount * 20, now);
                osc.connect(gain);
                gain.connect(filter);
                filter.connect(ctx.destination);
                osc.type = 'square';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + duration);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
                osc.start(now);
                osc.stop(now + duration);
                return;
            }
            
            if (isSeasons) {
                // Gentle chime / wind sound
                const notes = [523.25, 659.25, 783.99, 1046.50];
                const baseIndex = Math.min(comboCount - 1, notes.length - 2);
                [notes[baseIndex], notes[baseIndex+1]].forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.05);
                    gain.gain.setValueAtTime(0.1, now + idx * 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + duration * 1.5);
                    osc.start(now + idx * 0.05);
                    osc.stop(now + duration * 1.5 + idx * 0.05);
                });
                return;
            }

            // Default warm pentatonic notes
            const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99];
            const baseIndex = Math.min(comboCount - 1, notes.length - 2);

            const f1 = notes[baseIndex];
            const f2 = notes[baseIndex + 1];

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(750, now);
            filter.connect(ctx.destination);

            [f1, f2].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(filter);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.03);

                gain.gain.setValueAtTime(0.18, now + idx * 0.03);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + duration);

                osc.start(now + idx * 0.03);
                osc.stop(now + idx * 0.03 + duration);
            });
        });
    },

    playCrossClear() {
        this.play((ctx) => {
            const now = ctx.currentTime;
            // Beautiful warm Cmaj9 chord (C4, E4, G4, B4, D5)
            const notes = [261.63, 329.63, 392.00, 493.88, 587.33];

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(900, now);
            filter.connect(ctx.destination);

            const duration = 0.18;

            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(filter);

                osc.type = 'sine';
                // Strummed offset
                osc.frequency.setValueAtTime(freq, now + idx * 0.025);

                gain.gain.setValueAtTime(0.12, now + idx * 0.025);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.025 + duration);

                osc.start(now + idx * 0.025);
                osc.stop(now + idx * 0.025 + duration);
            });
        });
    },

    playBomb() {
        this.play((ctx) => {
            const now = ctx.currentTime;

            // Create a lowpass filter to make the boom soft, warm, and low-frequency
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(250, now); // Low cutoff removes all high noise crackle
            filter.frequency.exponentialRampToValueAtTime(70, now + 0.35);
            filter.Q.setValueAtTime(1.0, now);
            filter.connect(ctx.destination);

            // 1. Deep sine wave boom
            const osc = ctx.createOscillator();
            const gainOsc = ctx.createGain();
            osc.connect(gainOsc);
            gainOsc.connect(filter);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(110, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);

            gainOsc.gain.setValueAtTime(0.45, now);
            gainOsc.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

            osc.start(now);
            osc.stop(now + 0.3);

            // 2. Soft white noise explosion puff
            const bufferSize = ctx.sampleRate * 0.25; // 0.25s duration
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const gainNoise = ctx.createGain();
            noise.connect(gainNoise);
            gainNoise.connect(filter);

            gainNoise.gain.setValueAtTime(0.18, now);
            gainNoise.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

            noise.start(now);
            noise.stop(now + 0.25);
        });
    },

    playGameOver() {
        this.play((ctx) => {
            const now = ctx.currentTime;
            const notes = [300, 250, 200, 150];
            const duration = 0.2;

            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.1);

                gain.gain.setValueAtTime(0.1, now + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + duration);

                osc.start(now + idx * 0.1);
                osc.stop(now + idx * 0.1 + duration);
            });
        });
    },

    playBuzzer() {
        this.play((ctx) => {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            // Soft deep thud
            osc.type = 'sine';
            osc.frequency.setValueAtTime(120, now);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.12);

            osc.start(now);
            osc.stop(now + 0.12);
        });
    },

    playMissionComplete() {
        this.play((ctx) => {
            const now = ctx.currentTime;
            // Rising major arpeggio (C4 -> E4 -> G4 -> C5 -> E5 -> G5)
            const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; 
            const duration = 0.15;

            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);

                gain.gain.setValueAtTime(0.08, now + idx * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + duration);

                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + duration);
            });
        });
    },

    bgMusicInterval: null,
    bgMusicStep: 0,
    bgMusicTempo: 500, // ms per beat

    startBgMusic() {
        if (this.muted) return;
        if (this.bgMusicInterval) return;
        this.init();
        if (!this.ctx) return;

        this.bgMusicStep = 0;
        this.bgMusicInterval = setInterval(() => {
            this.playBeat();
        }, this.bgMusicTempo);
    },

    stopBgMusic() {
        if (this.bgMusicInterval) {
            clearInterval(this.bgMusicInterval);
            this.bgMusicInterval = null;
        }
    },

    setBgMusicTempo(tempo) {
        if (this.bgMusicTempo === tempo) return;
        this.bgMusicTempo = tempo;
        if (this.bgMusicInterval) {
            this.stopBgMusic();
            this.startBgMusic();
        }
    },

    playBeat() {
        this.play((ctx) => {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            // Rhythmic low synth beat
            osc.type = 'triangle';
            
            // Simple retro bass melody: C2, E2, G2, A2
            const notes = [65.41, 82.41, 98.00, 110.00]; 
            const note = notes[this.bgMusicStep % notes.length];
            this.bgMusicStep++;

            const isFeverActive = state && state.isFeverActive;
            const frequency = isFeverActive ? note * 1.5 : note;

            osc.frequency.setValueAtTime(frequency, now);

            gain.gain.setValueAtTime(isFeverActive ? 0.04 : 0.02, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

            osc.start(now);
            osc.stop(now + 0.15);
        });
    },

    playUndo() {
        this.play((ctx) => {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.25);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        });
    },

    playReroll() {
        this.play((ctx) => {
            const now = ctx.currentTime;
            const notes = [300, 400, 500, 700];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, now + i * 0.06);
                gain.gain.setValueAtTime(0.06, now + i * 0.06);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.08);
                osc.start(now + i * 0.06);
                osc.stop(now + i * 0.06 + 0.08);
            });
        });
    }
};

// Warm up Web Audio API on first user interaction
window.addEventListener('pointerdown', () => {
    AudioFX.init();
    AudioFX.startBgMusic();
}, { once: true });
if (soundBtn) {
    soundBtn.addEventListener('click', () => {
        AudioFX.toggleMute();
        AudioFX.init();
    });
    AudioFX.updateButtonUI(); // Sync button on load
}

document.addEventListener('visibilitychange', () => {
    if (AudioFX.ctx) {
        if (document.hidden) {
            if (AudioFX.ctx.state === 'running') {
                AudioFX.ctx.suspend().catch(() => {});
            }
        } else {
            if (AudioFX.ctx.state === 'suspended' && !AudioFX.muted) {
                AudioFX.ctx.resume().catch(() => {});
            }
        }
    }
});
