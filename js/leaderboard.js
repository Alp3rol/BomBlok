import { state, leaderboardBtn, leaderboardModal, leaderboardCloseBtn, leaderboardStatusEl, leaderboardListEl, lbTabWeekly, lbTabGlobal, submitScoreBtn, nicknamePanelEl, nicknameInputEl, nicknameSaveBtnEl, nicknameHintEl, gameOverSaveStatusEl, gameOverNicknameInputEl, gameOverSaveBtnEl, gameOverNicknameHintEl } from './state.js';

export function getISOWeekKey(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7; // 1..7 (Mon..Sun)
    d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Perşembe referansı
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function escapeHtml(str) {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

export const Leaderboard = {
    client: null,
    enabled: false,
    view: 'weekly', // weekly | global

    init() {
        const url = window.SUPABASE_URL;
        const key = window.SUPABASE_ANON_KEY;
        const hasConfig =
            typeof url === 'string' && url.startsWith('https://') && !url.includes('YOUR_PROJECT_REF') &&
            typeof key === 'string' && key.length > 20 && !key.includes('YOUR_SUPABASE_ANON_KEY');

        if (window.supabase && hasConfig) {
            try {
                this.client = window.supabase.createClient(url, key);
                this.enabled = true;
            } catch (e) {
                this.enabled = false;
            }
        }

        if (leaderboardBtn && leaderboardModal) {
            leaderboardBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.open();
            });
        }
        if (leaderboardCloseBtn && leaderboardModal) {
            leaderboardCloseBtn.addEventListener('click', () => this.close());
        }
        if (leaderboardModal) {
            leaderboardModal.addEventListener('click', (e) => {
                if (e.target === leaderboardModal) this.close();
            });
        }

        if (lbTabWeekly) lbTabWeekly.addEventListener('click', () => this.setView('weekly'));
        if (lbTabGlobal) lbTabGlobal.addEventListener('click', () => this.setView('global'));

        if (submitScoreBtn) {
            submitScoreBtn.addEventListener('click', async () => {
                await this.submitCurrentScore('modal');
            });
        }

        if (gameOverSaveBtnEl) {
            gameOverSaveBtnEl.addEventListener('click', async () => {
                await this.submitCurrentScore('gameover');
            });
        }

        // Nickname UI (prompt yerine)
        if (nicknameSaveBtnEl) {
            nicknameSaveBtnEl.addEventListener('click', () => {
                const nick = this.readNicknameFromInput('modal');
                if (!nick) {
                    this.setStatus('Rumuz 2-16 karakter olmalı.', 'modal');
                    if (nicknameInputEl) nicknameInputEl.focus();
                    return;
                }
                this.persistNickname(nick);
                this.updateNicknameUI();
                this.setStatus(`Rumuz kaydedildi: ${nick}`, 'modal');
            });
        }

        if (nicknameInputEl) {
            nicknameInputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (nicknameSaveBtnEl) nicknameSaveBtnEl.click();
                }
            });
        }

        if (gameOverNicknameInputEl) {
            gameOverNicknameInputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (gameOverSaveBtnEl) gameOverSaveBtnEl.click();
                }
            });
        }
    },

    open() {
        if (!leaderboardModal) return;
        leaderboardModal.classList.remove('hidden');
        this.updateNicknameUI();
        this.refresh();
    },

    close() {
        if (!leaderboardModal) return;
        leaderboardModal.classList.add('hidden');
    },

    setView(view) {
        this.view = view;
        if (lbTabWeekly) lbTabWeekly.classList.toggle('active', view === 'weekly');
        if (lbTabGlobal) lbTabGlobal.classList.toggle('active', view === 'global');
        this.refresh();
    },

    setStatus(text, target = 'modal') {
        if ((target === 'modal' || target === 'both') && leaderboardStatusEl) {
            leaderboardStatusEl.textContent = text;
        }
        if ((target === 'gameover' || target === 'both') && gameOverSaveStatusEl) {
            gameOverSaveStatusEl.textContent = text;
        }
    },

    setSubmitEnabled(enabled) {
        if (submitScoreBtn) submitScoreBtn.disabled = !enabled;
        if (gameOverSaveBtnEl) gameOverSaveBtnEl.disabled = !enabled;
    },

    render(rows) {
        if (!leaderboardListEl) return;
        if (!rows || rows.length === 0) {
            leaderboardListEl.innerHTML = '';
            this.setStatus('Henüz kayıt yok.');
            return;
        }

        leaderboardListEl.innerHTML = rows.map((r, idx) => {
            const name = (r.nickname || '???').toString().slice(0, 20);
            const score = Number(r.score || 0);
            return `
                <div class="lb-row">
                    <div class="lb-rank">#${idx + 1}</div>
                    <div class="lb-name">${escapeHtml(name)}</div>
                    <div class="lb-score">${score}</div>
                </div>
            `;
        }).join('');
        this.setStatus(this.view === 'weekly' ? 'Haftalık en iyiler' : 'Global en iyiler');
    },

    async refresh() {
        if (!this.enabled || !this.client) {
            this.setStatus('Supabase ayarlı değil. `supabase-config.js` dosyasını doldur.', 'modal');
            this.setStatus('Online skor kapalı. Supabase ayarı gerekli.', 'gameover');
            if (leaderboardListEl) leaderboardListEl.innerHTML = '';
            this.setSubmitEnabled(false);
            return;
        }

        this.setSubmitEnabled(true);
        this.setStatus('Yükleniyor...', 'modal');
        try {
            const weekKey = getISOWeekKey();
            let q = this.client.from('scores').select('nickname, score, created_at');
            if (this.view === 'weekly') q = q.eq('week_key', weekKey);
            const { data, error } = await q.order('score', { ascending: false }).limit(20);
            if (error) throw error;
            this.render(data);
        } catch (err) {
            this.setStatus('Yüklenemedi. İnternet / RLS ayarlarını kontrol et.', 'modal');
            if (leaderboardListEl) leaderboardListEl.innerHTML = '';
        }
    },

    async ensureNickname(source = 'modal') {
        const nick =
            this.readNicknameFromInput(source) ||
            this.readNicknameFromInput(source === 'gameover' ? 'modal' : 'gameover') ||
            this.normalizeNick(state.nickname);

        if (nick) {
            this.persistNickname(nick);
            this.updateNicknameUI();
            return nick;
        }

        this.setStatus('Skor göndermek için rumuz gerekli (2-16 karakter).', source);
        this.updateNicknameUI();
        if (source === 'modal' && nicknamePanelEl) {
            nicknamePanelEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
        const targetInput = source === 'gameover' ? gameOverNicknameInputEl : nicknameInputEl;
        if (targetInput) targetInput.focus();
        return null;
    },

    normalizeNick(value) {
        let nick = (value || '').toString().trim();
        // çok agresif olmadan: ardışık boşlukları tek boşluğa indir
        nick = nick.replace(/\s+/g, ' ');
        nick = nick.slice(0, 16);
        if (nick.length < 2 || nick.length > 16) return null;
        return nick;
    },

    readNicknameFromInput(source = 'modal') {
        const input = source === 'gameover' ? gameOverNicknameInputEl : nicknameInputEl;
        if (!input) return null;
        return this.normalizeNick(input.value);
    },

    persistNickname(nick) {
        state.nickname = nick;
        localStorage.setItem('bomblok_nickname', nick);
    },

    updateNicknameUI() {
        const nick = this.normalizeNick(state.nickname) || '';
        if (nicknameInputEl && !nicknameInputEl.value) nicknameInputEl.value = nick;
        if (gameOverNicknameInputEl && !gameOverNicknameInputEl.value) gameOverNicknameInputEl.value = nick;
        if (nicknameHintEl) {
            nicknameHintEl.textContent = nick
                ? `Kayıtlı rumuz: ${nick}`
                : 'Skor göndermek için rumuz gerekli.';
        }
        if (gameOverNicknameHintEl) {
            gameOverNicknameHintEl.textContent = nick
                ? `Kayıtlı rumuz: ${nick}`
                : 'Skor göndermek için rumuz gerekli.';
        }
    },

    prepareGameOverUI() {
        this.updateNicknameUI();
        if (!this.enabled || !this.client) {
            this.setSubmitEnabled(false);
            this.setStatus('Online skor kapalı. Supabase ayarı gerekli.', 'gameover');
            return;
        }
        this.setSubmitEnabled(true);
        this.setStatus('Skorunu şimdi leaderboard’a gönderebilirsin.', 'gameover');
    },

    async submitCurrentScore(source = 'modal') {
        if (!this.enabled || !this.client) {
            this.setStatus('Supabase ayarlı değil. Önce `supabase-config.js` doldur.', source);
            return;
        }

        const nick = await this.ensureNickname(source);
        if (!nick) {
            this.setStatus('Rumuz geçersiz.', source);
            return;
        }

        const score = Number(state.score || 0);
        if (!Number.isFinite(score) || score <= 0) {
            this.setStatus('Skor 0 iken gönderilemez.', source);
            return;
        }

        this.setStatus('Gönderiliyor...', source);
        try {
            const payload = {
                nickname: nick,
                score,
                week_key: getISOWeekKey()
            };
            const { error } = await this.client.from('scores').insert(payload);
            if (error) throw error;
            await this.refresh();
            this.setStatus('Skor gönderildi!', source);
        } catch (err) {
            this.setStatus('Gönderilemedi. RLS/policy veya interneti kontrol et.', source);
        }
    }
};
