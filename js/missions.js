import { state } from './state.js';
import { AudioFX } from './audio.js';
import { updateJokerButtonsUI, showFloatingText, spawnTimeBomb } from './mechanics.js';

export const MISSION_POOL = [
    { type: 'lines', text: 'Satır/Sütun Temizle', target: () => Math.floor(Math.random() * 8) + 5, icon: '📏' }, // 5-12
    { type: 'ice', text: 'Buz Kır', target: () => Math.floor(Math.random() * 5) + 4, icon: '❄️' }, // 4-8
    { type: 'bombs', text: 'Bomba Patlat', target: () => Math.floor(Math.random() * 4) + 2, icon: '💣' }, // 2-5
    { type: 'points', text: 'Puan Topla', target: () => (Math.floor(Math.random() * 6) + 3) * 100, icon: '💯' }, // 300-800
    { type: 'combo', text: '3\'lü Kombo Yap', target: () => Math.floor(Math.random() * 2) + 1, icon: '🔥' }, // 1-2
    { type: 'multiclear', text: 'Çoklu Kırım (2+)', target: () => Math.floor(Math.random() * 3) + 2, icon: '⚡' }, // 2-4
    { type: 'fever', text: 'Fever Modunu Başlat', target: () => Math.floor(Math.random() * 2) + 1, icon: '🌟' }, // 1-2
    { type: 'blocks', text: 'Blok Yerleştir', target: () => (Math.floor(Math.random() * 5) + 2) * 10, icon: '🧱' }, // 20-60
    { type: 'rotate', text: 'Blok Döndür', target: () => Math.floor(Math.random() * 6) + 3, icon: '🔄' }, // 3-8
    { type: 'defuse', text: 'Saatli Bomba İmha Et', target: () => Math.floor(Math.random() * 3) + 1, icon: '⏱️' }, // 1-3
    { type: 'colormatch', text: 'Renk Çarpanı Yap', target: () => Math.floor(Math.random() * 3) + 2, icon: '🌈' }, // 2-4
    { type: 'crossclear', text: 'Çapraz Kırım Yap', target: () => Math.floor(Math.random() * 2) + 1, icon: '❌' }, // 1-2
    { type: 'stone', text: 'Taş Kır', target: () => Math.floor(Math.random() * 5) + 3, icon: '🪨' }, // 3-7
    // --- YENİ VE GELİŞMİŞ GÖREVLER ---
    { type: 'tamisabet', text: '3x3 Alan Kır', target: () => Math.floor(Math.random() * 2) + 1, icon: '🎯' },
    { type: 'sinirdevriyesi', text: 'Üst/Alt Satır Kır', target: () => Math.floor(Math.random() * 2) + 1, icon: '🛡️' },
    { type: 'serikatil', text: 'Arka Arkaya 3 Hamlede Kırım', target: () => 1, icon: '🗡️' },
    { type: 'buzkirangemisi', text: 'Tek Hamlede 3+ Buz Kır', target: () => Math.floor(Math.random() * 2) + 1, icon: '🚢' },
    { type: 'bombaimhauzmani', text: 'Tek Hamlede 2+ Bomba Patlat', target: () => 1, icon: '🧑‍🚒' },
    { type: 'daralanda', text: 'Kırım Yapmadan 10 Blok', target: () => 10, icon: '🗜️' },
    { type: 'meydanokuma', text: '5 Hamlede 3 Satır Kır', target: () => 3, icon: '🏆' },
    { type: 'katikurallar', text: '0 Döndürme İle 5 Satır', target: () => 5, icon: '📏' },
    { type: 'renklidiyet', text: 'Mavi Blok Patlatmadan 3 Satır', target: () => 3, icon: '🎨' },
    { type: 'kosekapmaca', text: '4 Köşeyi Doldur', target: () => 1, icon: '🔲' },
    { type: 'tetrisefsanesi', text: 'Sadece I Bloğu İle Kırım', target: () => Math.floor(Math.random() * 2) + 1, icon: '🏛️' },
    { type: 'boslukbirakmasanati', text: '3x3 Ortası Boş Şekil', target: () => 1, icon: '🍩' },
    { type: 'hiztesti', text: '30 Saniyede 5 Satır Kır', target: () => 5, icon: '⏱️' },
    { type: 'saatlibombapanigi', text: '15 Hamlede 3 Bomba İmha', target: () => 3, icon: '🆘' }
];

export function initMission() {
    if (state.missionTimerId) {
        clearInterval(state.missionTimerId);
        state.missionTimerId = null;
    }

    const randomMissionTemplate = MISSION_POOL[Math.floor(Math.random() * MISSION_POOL.length)];
    state.currentMission = {
        type: randomMissionTemplate.type,
        text: randomMissionTemplate.text,
        target: typeof randomMissionTemplate.target === 'function' ? randomMissionTemplate.target() : randomMissionTemplate.target,
        icon: randomMissionTemplate.icon,
        current: 0,
        completed: false
    };

    // Reset trackers
    state.missionMoves = 0;
    state.usedRotationsInMission = 0;

    if (state.currentMission.type === 'hiztesti') {
        state.missionTimeLeft = 30; // 30 seconds
        state.missionTimerId = setInterval(() => {
            if (!state.isGameOver && !state.currentMission.completed) {
                state.missionTimeLeft--;
                updateMissionUI();
                if (state.missionTimeLeft <= 0) {
                    try { AudioFX.playBuzzer(); } catch(e) {}
                    showFloatingText('Zaman Doldu! Yeni Görev', '#ff3333');
                    initMission(); // Restart with new mission
                }
            }
        }, 1000);
    }

    if (state.currentMission.type === 'saatlibombapanigi') {
        for(let i=0; i<3; i++) spawnTimeBomb(true);
    }

    updateMissionUI();
}

export function updateMissionProgress(type, amount = 1) {
    if (!state.currentMission || state.currentMission.completed || state.isGameOver) return;

    if (state.currentMission.type === type) {
        state.currentMission.current += amount;
        if (state.currentMission.current >= state.currentMission.target) {
            state.currentMission.current = state.currentMission.target;
            completeMission();
        }
        updateMissionUI();
    }
}

export function updateMissionUI() {
    const missionDescEl = document.getElementById('mission-desc');
    const missionProgressFillEl = document.getElementById('mission-progress-fill');
    const jokerCountEl = document.getElementById('joker-count');

    if (jokerCountEl) {
        jokerCountEl.textContent = state.jokers;
    }

    if (!state.currentMission) return;

    if (missionDescEl) {
        let extraText = '';
        if (state.currentMission.type === 'hiztesti') extraText = ` [⏱️ ${state.missionTimeLeft}s]`;
        if (state.currentMission.type === 'meydanokuma') extraText = ` [🏁 Kalan: ${5 - state.missionMoves}]`;
        if (state.currentMission.type === 'saatlibombapanigi') extraText = ` [🏁 Kalan: ${15 - state.missionMoves}]`;

        missionDescEl.textContent = `${state.currentMission.icon} ${state.currentMission.text}: ${state.currentMission.current}/${state.currentMission.target}${extraText}`;
    }

    if (missionProgressFillEl) {
        const percentage = (state.currentMission.current / state.currentMission.target) * 100;
        missionProgressFillEl.style.width = `${percentage}%`;
    }
}

export function completeMission() {
    state.currentMission.completed = true;
    state.jokers++;
    updateJokerButtonsUI();
    localStorage.setItem('bomblok_jokers', state.jokers);

    // Play victory chime
    AudioFX.playMissionComplete();

    // Show embedded completion banner inside mission panel (smooth open)
    const banner = document.getElementById('mission-complete-banner');
    if (banner) {
        banner.classList.add('show');
    }

    // Hide after 2.5s and start a new mission
    setTimeout(() => {
        if (banner) {
            banner.classList.remove('show');
        }
        initMission();
    }, 2500);
}

export function checkMissionConstraints() {
    if (!state.currentMission || state.currentMission.completed) return;
    const mType = state.currentMission.type;

    if (mType === 'meydanokuma' && state.missionMoves >= 5) {
        showFloatingText('Hamle Bitti! Görev Sıfırlandı', '#ff3333');
        initMission();
    }
    
    if (mType === 'saatlibombapanigi' && state.missionMoves >= 15) {
        showFloatingText('Hamle Bitti! Görev Sıfırlandı', '#ff3333');
        initMission();
    }

    if (mType === 'daralanda' && state.movesSinceClear === 0) {
        if (state.currentMission.current > 0) {
            state.currentMission.current = 0;
            updateMissionUI();
            showFloatingText('Kırım Yaptın! Seri Sıfırlandı', '#ffaa00');
        }
    }

    if (mType === 'kosekapmaca') {
        const corners = [state.grid[0][0], state.grid[0][7], state.grid[7][0], state.grid[7][7]];
        if (corners.every(c => c !== 0)) {
            updateMissionProgress('kosekapmaca', 1);
        }
    }

    if (mType === 'boslukbirakmasanati') {
        let found = false;
        for (let r=1; r<7; r++) {
            for (let c=1; c<7; c++) {
                if (state.grid[r][c] === 0) {
                    let allFull = true;
                    for (let dr=-1; dr<=1; dr++) {
                        for (let dc=-1; dc<=1; dc++) {
                            if (dr===0 && dc===0) continue;
                            if (state.grid[r+dr][c+dc] === 0) {
                                allFull = false;
                                break;
                            }
                        }
                        if (!allFull) break;
                    }
                    if (allFull) found = true;
                }
            }
        }
        if (found) {
            updateMissionProgress('boslukbirakmasanati', 1);
        }
    }
}
