import { state } from './state.js';
import { AudioFX } from './audio.js';
import { Haptics } from './haptics.js';

export const ACHIEVEMENTS = [
    { id: 'bomba_uzmani', icon: '💣', title: 'Bomba Uzmanı', desc: '25 bomba patlat', targetKey: 'bombs', targetValue: 25 },
    { id: 'kombo_ustadi', icon: '🔥', title: 'Kombo Üstadı', desc: '5x Kombo yap', targetKey: 'maxCombo', targetValue: 5 },
    { id: 'buz_kiran', icon: '❄️', title: 'Buz Kıran', desc: '30 buz bloğu erit', targetKey: 'ice', targetValue: 30 },
    { id: 'efsane_oyuncu', icon: '🏆', title: 'Efsane Oyuncu', desc: '10,000 puana ulaş', targetKey: 'maxScore', targetValue: 10000 },
    { id: 'gorev_avcisi', icon: '🎯', title: 'Görev Avcısı', desc: '10 görev tamamla', targetKey: 'missions', targetValue: 10 },
    { id: 'tas_kirici', icon: '🪨', title: 'Taş Kırıcı', desc: '15 taş engeli kır', targetKey: 'stone', targetValue: 15 },
    { id: 'fever_krali', icon: '🌟', title: 'Fever Kralı', desc: '5 kez Fever Mode başlat', targetKey: 'feverCount', targetValue: 5 },
    { id: 'renk_ustasi', icon: '🌈', title: 'Renk Ustası', desc: '10 Renk Çarpanı yap', targetKey: 'colorMatch', targetValue: 10 }
];

export const Achievements = {
    unlockedIds: new Set(JSON.parse(localStorage.getItem('bomblok_unlocked_achievements') || '[]')),
    stats: JSON.parse(localStorage.getItem('bomblok_lifetime_stats') || '{"bombs":0,"maxCombo":0,"ice":0,"maxScore":0,"missions":0,"stone":0,"feverCount":0,"colorMatch":0}'),

    save() {
        localStorage.setItem('bomblok_unlocked_achievements', JSON.stringify(Array.from(this.unlockedIds)));
        localStorage.setItem('bomblok_lifetime_stats', JSON.stringify(this.stats));
    },

    recordStat(key, amount = 1) {
        if (key === 'maxCombo' || key === 'maxScore') {
            this.stats[key] = Math.max(this.stats[key] || 0, amount);
        } else {
            this.stats[key] = (this.stats[key] || 0) + amount;
        }
        this.save();
        this.checkAchievements();
    },

    checkAchievements() {
        ACHIEVEMENTS.forEach(ach => {
            if (!this.unlockedIds.has(ach.id)) {
                const currentVal = this.stats[ach.targetKey] || 0;
                if (currentVal >= ach.targetValue) {
                    this.unlock(ach);
                }
            }
        });
    },

    unlock(ach) {
        this.unlockedIds.add(ach.id);
        this.save();

        try { AudioFX.playMissionComplete(); } catch (e) {}
        try { Haptics.vibrateReward(); } catch (e) {}

        this.showToast(`🏆 YENİ ROZET KAZANILDI!\n${ach.icon} ${ach.title}`);
    },

    showToast(text) {
        const toast = document.createElement('div');
        toast.className = 'achievement-toast';
        toast.innerText = text;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 50);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3200);
    },

    renderUI(containerEl) {
        if (!containerEl) return;
        containerEl.innerHTML = ACHIEVEMENTS.map(ach => {
            const isUnlocked = this.unlockedIds.has(ach.id);
            const currentVal = this.stats[ach.targetKey] || 0;
            const pct = Math.min(100, Math.floor((currentVal / ach.targetValue) * 100));

            return `
                <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
                    <div class="ach-icon">${ach.icon}</div>
                    <div class="ach-info">
                        <div class="ach-title">${ach.title} ${isUnlocked ? '✓' : ''}</div>
                        <div class="ach-desc">${ach.desc}</div>
                        <div class="ach-progress-bg">
                            <div class="ach-progress-fill" style="width: ${isUnlocked ? 100 : pct}%;"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
};
