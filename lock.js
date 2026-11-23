/**
 * ==========================================================================
 * SmartRevision - ACCÈS ÉDITEUR PAR CODE (lock.js)
 * - Accès étudiant : direct, sans code.
 * - Accès Mode Éditeur : protégé par le code MASTER2030.
 * ==========================================================================
 */

window.lock = {
    EDITOR_CODE: "MASTER2030",
    STORAGE_KEY: "smart_revision_editor_unlock",

    todayStr() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    hasEditorUnlockToday() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) return false;
            const data = JSON.parse(raw);
            return data.date === this.todayStr() && data.unlocked === true;
        } catch (e) {
            return false;
        }
    },

    setEditorUnlockToday() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
            date: this.todayStr(),
            unlocked: true
        }));
    },

    init() {
        const lockScreen = document.getElementById('lock-screen');
        if (lockScreen) {
            lockScreen.classList.add('hidden');
        }
        this.wrapEditorToggle();
    },

    showStatus(elId, message, isLoading = false) {
        const el = document.getElementById(elId);
        if (!el) return;
        el.textContent = message;
        el.classList.remove('hidden');
        el.classList.toggle('lock-status-loading', !!isLoading);
    },

    hideStatus(elId) {
        const el = document.getElementById(elId);
        if (!el) return;
        el.classList.add('hidden');
    },

    wrapEditorToggle() {
        if (!window.app || typeof window.app.toggleAdminMode !== 'function') return;
        const originalToggle = window.app.toggleAdminMode.bind(window.app);

        window.app.toggleAdminMode = () => {
            const goingToEditor = window.app.currentViewZone === 'student-zone';

            if (goingToEditor && !this.hasEditorUnlockToday()) {
                const modal = document.getElementById('editor-code-modal');
                const input = document.getElementById('editor-code-input');
                this.hideStatus('editor-code-status');
                if (modal) modal.classList.remove('hidden');
                if (input) {
                    input.value = '';
                    input.focus();
                }
                return;
            }
            originalToggle();
        };
    },

    cancelEditorPrompt() {
        const modal = document.getElementById('editor-code-modal');
        const input = document.getElementById('editor-code-input');
        if (modal) modal.classList.add('hidden');
        if (input) input.value = '';
        this.hideStatus('editor-code-status');
    },

    tryEditorUnlock() {
        const input = document.getElementById('editor-code-input');
        if (!input) return;

        const code = input.value.trim().toUpperCase();
        if (!code) {
            this.showStatus('editor-code-status', 'Entre le code éditeur.');
            return;
        }

        if (code === this.EDITOR_CODE) {
            this.setEditorUnlockToday();
            this.cancelEditorPrompt();
            window.app.toggleAdminMode();
        } else {
            this.showStatus('editor-code-status', 'Code éditeur incorrect. Réessaie.');
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    window.lock.init();
});
