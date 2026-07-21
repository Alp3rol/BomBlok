// --- HAPTIC FEEDBACK (VIBRATION API) MODULE ---
export const Haptics = {
    enabled: true,

    isSupported() {
        return typeof window !== 'undefined' && 'vibrate' in navigator;
    },

    vibrate(pattern) {
        if (!this.enabled || !this.isSupported()) return;
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            // Ignore browser vibration restrictions
        }
    },

    // Soft tap on block drop
    vibrateDrop() {
        this.vibrate(15);
    },

    // Light grab feedback
    vibrateGrab() {
        this.vibrate(8);
    },

    // Pulse feedback on line clear
    vibrateClear(comboCount = 1) {
        if (comboCount >= 3) {
            this.vibrate([35, 25, 45, 25, 60]); // Ascending rhythm for high combo
        } else if (comboCount === 2) {
            this.vibrate([30, 25, 35]);
        } else {
            this.vibrate([25, 30, 25]);
        }
    },

    // Heavy thud on bomb explosion
    vibrateBomb() {
        this.vibrate([60, 40, 80]);
    },

    // Game Over pattern
    vibrateGameOver() {
        this.vibrate([100, 50, 100]);
    },

    // Mission / Achievement unlocked chime pulse
    vibrateReward() {
        this.vibrate([30, 40, 30, 40, 50]);
    }
};
