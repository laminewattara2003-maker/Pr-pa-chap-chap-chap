/**
 * ==========================================================================
 * SmartRevision - MODULE ÉTUDIANT (student.js)
 * - Aucune matière codée en dur.
 * - Chargement des cours publiés depuis Google Sheets.
 * - Interface compacte sans défilement, sans pomodoro/étoiles/cœurs/objectifs.
 * - Mélange aléatoire des questions et des options à chaque quiz.
 * ==========================================================================
 */

window.app = {
    // Remplacez cette URL par l'URL de déploiement de votre Web App Google Apps Script
    SHEET_WEB_APP_URL: "https://script.google.com/macros/s/AKfycbyOPc7_24OsqqFa6gHzcze4y5mxbsFNAIqyLEqBJXC58hVvd-RyyEN4Rt0BAdYwb36X/exec",

    state: {
        courses: [],
        stats: {
            streak: 0,
            totalTime: 0,
            totalAnswers: 0,
            correctAnswers: 0
        },
        settings: {
            theme: 'light',
            fontSize: 'medium',
            dyslexia: false
        }
    },

    quiz: {
        currentQuestions: [],
        currentIndex: 0,
        score: 0,
        correct: 0,
        wrong: 0,
        selectedOptionIndex: null,
        timerInterval: null,
        timeLeft: 37,
        globalTimerInterval: null,
        globalTimeLeft: 1197
    },

    reader: {
        parts: [],
        currentIndex: 0
    },

    currentViewZone: 'student-zone',

    shuffleArray(array) {
        const copy = [...array];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    },

    async init() {
        this.loadLocalState();
        this.applySettings();
        this.renderDashboard();
        this.initGlobalTimers();
        await this.syncCoursesFromSheet();
    },

    saveLocalState() {
        try {
            localStorage.setItem('smart_revision_data', JSON.stringify({
                courses: this.state.courses,
                stats: this.state.stats,
                settings: this.state.settings
            }));
        } catch (error) {
            console.error("Erreur d'enregistrement local :", error);
        }
    },

    loadLocalState() {
        try {
            const localData = localStorage.getItem('smart_revision_data');
            if (localData) {
                const parsed = JSON.parse(localData);
                this.state.courses = Array.isArray(parsed.courses) ? parsed.courses : [];
                this.state.stats = parsed.stats || this.state.stats;
                this.state.settings = parsed.settings || this.state.settings;
            } else {
                this.state.courses = [];
            }
        } catch (error) {
            this.state.courses = [];
        }
    },

    isSheetConfigured() {
        return typeof this.SHEET_WEB_APP_URL === "string" &&
               this.SHEET_WEB_APP_URL.startsWith("https://script.google.com/macros/s/") &&
               !this.SHEET_WEB_APP_URL.includes("REMPLACE_PAR_TON_ID");
    },

    async syncCoursesFromSheet() {
        if (!this.isSheetConfigured()) {
            this.renderDashboard();
            return;
        }

        try {
            const res = await fetch(`${this.SHEET_WEB_APP_URL}?t=${Date.now()}`, {
                method: "GET"
            });
            const data = await res.json();
            if (data && data.ok && Array.isArray(data.courses)) {
                // La feuille Google Sheets est la source unique de vérité :
                // toute matière supprimée côté éditeur disparaît pour tous.
                this.state.courses = data.courses;
                this.saveLocalState();
                this.renderDashboard();
                if (this.currentViewZone === 'editor-zone' && typeof this.renderEditorDashboard === 'function') {
                    this.renderEditorDashboard();
                }
            }
        } catch (err) {
            console.error("Erreur de synchronisation Google Sheets :", err);
        }
    },

    switchView(viewId) {
        const activeZone = document.getElementById(this.currentViewZone);
        if (!activeZone) return;

        const views = activeZone.querySelectorAll('.app-view');
        views.forEach(v => v.classList.remove('active'));

        const targetView = document.getElementById(`view-${viewId}`);
        if (targetView) {
            targetView.classList.add('active');
        }

        const navButtons = document.querySelectorAll('.nav-button');
        navButtons.forEach(btn => btn.classList.remove('active'));

        const activeNav = document.getElementById(`nav-${viewId}`);
        if (activeNav) {
            activeNav.classList.add('active');
        }

        if (viewId === 'dashboard') {
            this.renderDashboard();
            this.syncCoursesFromSheet();
        }
        if (viewId === 'stats') this.renderStats();
    },

    renderDashboard() {
        const container = document.getElementById('courses-list');
        if (!container) return;
        container.innerHTML = '';

        if (!this.state.courses || this.state.courses.length === 0) {
            container.innerHTML = '<p style="color:#f4f3e8; text-align:center; padding:24px 12px; font-size:0.9rem;">Aucune matière disponible pour le moment.</p>';
            return;
        }

        this.state.courses.forEach(course => {
            const card = document.createElement('div');
            card.className = 'course-card';
            card.onclick = () => this.openReader(course.id);
            card.innerHTML = `
                <div>
                    <h3 style="color: var(--text-main); font-weight:700; font-size:1rem;">${course.title}</h3>
                    <span style="color: var(--text-muted); font-size:0.75rem; font-weight:bold;">${(course.chapters || []).length} MODULE(S)</span>
                </div>
                <span style="font-size: 1.2rem; color: var(--accent-green)">➡️</span>
            `;
            container.appendChild(card);
        });
    },

    openReader(courseId) {
        const course = this.state.courses.find(c => c.id === courseId);
        if (!course || !course.chapters || course.chapters.length === 0) return;

        this.reader.parts = [];
        this.quiz.currentQuestions = [];

        course.chapters.forEach(chapter => {
            (chapter.parts || []).forEach(part => {
                this.reader.parts.push(part);
                if (part.questions && part.questions.length) {
                    this.quiz.currentQuestions.push(...part.questions);
                }
            });
        });

        if (this.reader.parts.length === 0) return;
        this.reader.currentIndex = 0;

        this.switchView('reader');
        this.renderPart(0);
    },

    renderPart(index) {
        const parts = this.reader.parts;
        if (!parts || parts.length === 0) return;

        if (index < 0) index = 0;
        if (index >= parts.length) index = parts.length - 1;
        this.reader.currentIndex = index;

        const part = parts[index];

        document.getElementById('part-title').innerText = part.title;
        document.getElementById('part-content').innerHTML = part.content;

        const tipBox = document.getElementById('part-tip');
        if (part.tip) {
            tipBox.classList.remove('hidden');
            document.getElementById('part-tip-text').innerText = part.tip;
        } else {
            tipBox.classList.add('hidden');
        }

        const exBox = document.getElementById('part-example');
        if (part.example) {
            exBox.classList.remove('hidden');
            document.getElementById('part-example-text').innerText = part.example;
        } else {
            exBox.classList.add('hidden');
        }

        const indicator = document.getElementById('reader-part-indicator');
        if (indicator) {
            indicator.innerText = `Fiche ${index + 1}/${parts.length}`;
        }

        const progressPercent = ((index + 1) / parts.length) * 100;
        document.getElementById('reader-progress-bar').style.width = `${progressPercent}%`;

        const nextBtn = document.getElementById('btn-next-part');
        if (nextBtn) {
            nextBtn.innerText = (index === parts.length - 1) ? "🔁 Début" : "➡️ Suivante";
        }
    },

    nextPart() {
        const parts = this.reader.parts;
        if (!parts || parts.length === 0) return;
        const nextIndex = (this.reader.currentIndex + 1) % parts.length;
        this.renderPart(nextIndex);
    },

    startQuiz() {
        if (this.quiz.currentQuestions.length === 0) {
            alert("Cette matière ne possède pas encore de questions.");
            return;
        }

        const randomizedQuestions = this.shuffleArray(this.quiz.currentQuestions).map(q => {
            const correctText = q.options[q.answer];
            const shuffledOptions = this.shuffleArray(q.options);
            const newAnswerIndex = shuffledOptions.indexOf(correctText);
            return {
                ...q,
                options: shuffledOptions,
                answer: newAnswerIndex !== -1 ? newAnswerIndex : 0
            };
        });

        this.quiz.currentQuestions = randomizedQuestions;
        this.quiz.currentIndex = 0;
        this.quiz.score = 0;
        this.quiz.correct = 0;
        this.quiz.wrong = 0;
        this.quiz.globalTimeLeft = 1197;

        this.switchView('quiz');
        this.showQuestion();
    },

    showQuestion() {
        document.getElementById('quiz-feedback-box').classList.add('hidden');
        document.getElementById('btn-validate-quiz').classList.remove('hidden');

        const question = this.quiz.currentQuestions[this.quiz.currentIndex];

        document.getElementById('quiz-question-number').innerText = `QUESTION ${this.quiz.currentIndex + 1} / ${this.quiz.currentQuestions.length}`;
        document.getElementById('quiz-question-text').innerText = question.question;
        document.getElementById('quiz-question-badge').innerText = question.type || "QCM";

        document.getElementById('quiz-score').innerText = this.quiz.score;
        document.getElementById('quiz-correct').innerText = this.quiz.correct;
        document.getElementById('quiz-wrong').innerText = this.quiz.wrong;

        let currentGrade = (this.quiz.correct / this.quiz.currentQuestions.length) * 20;
        document.getElementById('quiz-grade').innerText = currentGrade.toFixed(1);

        let progressPercent = (this.quiz.currentIndex / this.quiz.currentQuestions.length) * 100;
        document.getElementById('quiz-progress-line').style.width = `${progressPercent}%`;

        this.quiz.timeLeft = 37;
        document.getElementById('question-timer-val').innerText = `${this.quiz.timeLeft}s`;

        clearInterval(this.quiz.timerInterval);
        this.quiz.timerInterval = setInterval(() => {
            this.quiz.timeLeft--;
            document.getElementById('question-timer-val').innerText = `${this.quiz.timeLeft}s`;
            if (this.quiz.timeLeft <= 0) {
                clearInterval(this.quiz.timerInterval);
                this.validateAnswer(true);
            }
        }, 1000);

        const container = document.getElementById('quiz-options-container');
        container.innerHTML = '';
        this.quiz.selectedOptionIndex = null;

        const letters = ['A', 'B', 'C', 'D'];
        question.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'option-item';
            btn.innerHTML = `
                <span class="option-letter">${letters[idx]}</span>
                <span class="option-string">${opt}</span>
            `;
            btn.onclick = () => this.selectOption(idx, btn);
            container.appendChild(btn);
        });
    },

    selectOption(index, element) {
        this.quiz.selectedOptionIndex = index;
        const items = document.querySelectorAll('.option-item');
        items.forEach(item => item.classList.remove('selected'));
        element.classList.add('selected');
    },

    validateAnswer(forcedTimeout = false) {
        clearInterval(this.quiz.timerInterval);

        if (this.quiz.selectedOptionIndex === null && !forcedTimeout) {
            alert("Veuillez sélectionner un choix de réponse !");
            return;
        }

        const question = this.quiz.currentQuestions[this.quiz.currentIndex];
        const feedbackBox = document.getElementById('quiz-feedback-box');
        const feedbackTitle = document.getElementById('feedback-title');
        const feedbackExplanation = document.getElementById('feedback-explanation');
        const statusIcon = document.getElementById('feedback-status-icon');
        const validateBtn = document.getElementById('btn-validate-quiz');

        validateBtn.classList.add('hidden');
        feedbackBox.classList.remove('hidden');

        const isCorrect = !forcedTimeout && (this.quiz.selectedOptionIndex === question.answer);
        this.state.stats.totalAnswers++;

        const motivationBox = document.getElementById('quiz-motivation-text');

        if (isCorrect) {
            this.quiz.correct++;
            this.quiz.score += 40;
            this.state.stats.correctAnswers++;

            statusIcon.innerText = "🎉";
            feedbackTitle.innerText = "Bonne réponse !";
            feedbackTitle.style.color = "var(--color-good)";
            motivationBox.innerText = "Excellent ! Ton travail acharné porte ses fruits.";
        } else {
            this.quiz.wrong++;

            statusIcon.innerText = "💡";
            feedbackTitle.innerText = forcedTimeout ? "Temps écoulé !" : "À revoir tranquillement.";
            feedbackTitle.style.color = "var(--color-bad)";
            motivationBox.innerText = "Aucune pression : chaque erreur aide à mémoriser.";
        }

        feedbackExplanation.innerText = question.explanation;

        document.getElementById('quiz-score').innerText = this.quiz.score;
        document.getElementById('quiz-correct').innerText = this.quiz.correct;
        document.getElementById('quiz-wrong').innerText = this.quiz.wrong;

        let finalGrade = (this.quiz.correct / this.quiz.currentQuestions.length) * 20;
        document.getElementById('quiz-grade').innerText = finalGrade.toFixed(1);

        this.saveLocalState();
    },

    nextStep() {
        this.quiz.currentIndex++;
        if (this.quiz.currentIndex < this.quiz.currentQuestions.length) {
            this.showQuestion();
        } else {
            clearInterval(this.quiz.timerInterval);
            let noteFinale = document.getElementById('quiz-grade').innerText;
            alert(`Évaluation terminée ! Note obtenue : ${noteFinale}/20.`);
            this.switchView('dashboard');
        }
    },

    initGlobalTimers() {
        setInterval(() => {
            const quizTimerView = document.getElementById('quiz-timer');
            if (quizTimerView && document.getElementById('view-quiz').classList.contains('active')) {
                this.quiz.globalTimeLeft--;
                if (this.quiz.globalTimeLeft <= 0) this.quiz.globalTimeLeft = 1197;

                let mins = Math.floor(this.quiz.globalTimeLeft / 60);
                let secs = this.quiz.globalTimeLeft % 60;
                quizTimerView.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
        }, 1000);

        setInterval(() => {
            if (!document.getElementById('view-dashboard').classList.contains('active')) {
                this.state.stats.totalTime++;
                this.saveLocalState();
            }
        }, 60000);
    },

    renderStats() {
        document.getElementById('stat-total-time').innerText = `${this.state.stats.totalTime} min`;
        document.getElementById('stat-total-answers').innerText = this.state.stats.totalAnswers;

        let rate = this.state.stats.totalAnswers > 0 ? Math.round((this.state.stats.correctAnswers / this.state.stats.totalAnswers) * 100) : 0;
        document.getElementById('stat-success-rate').innerText = `${rate}%`;

        const canvas = document.getElementById('stats-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = 130;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#eae8d4';
        ctx.lineWidth = 1;

        for (let i = 1; i < 4; i++) {
            let y = (canvas.height / 4) * i;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        ctx.strokeStyle = '#173f27';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height - 10);
        ctx.lineTo(canvas.width * 0.4, canvas.height - 40);
        ctx.lineTo(canvas.width * 0.7, canvas.height - 20);
        ctx.lineTo(canvas.width, canvas.height - (rate * 1.1 > canvas.height ? canvas.height - 15 : rate * 1.1));
        ctx.stroke();

        const badgeContainer = document.getElementById('badges-container');
        if (badgeContainer) {
            badgeContainer.innerHTML = `
                <div class="stat-card" style="opacity: ${this.state.stats.streak >= 1 ? '1' : '0.3'}">🔥 <h3>Série 1j</h3></div>
                <div class="stat-card" style="opacity: ${this.state.stats.totalAnswers >= 10 ? '1' : '0.3'}">📝 <h3>10 Quiz</h3></div>
                <div class="stat-card" style="opacity: ${rate >= 70 ? '1' : '0.3'}">🎓 <h3>70% Vrai</h3></div>
            `;
        }
    },

    themeToggle(isDark) {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        this.state.settings.theme = isDark ? 'dark' : 'light';
        this.saveLocalState();
    },

    fontSizeChange(size) {
        document.documentElement.setAttribute('data-size', size);
        this.state.settings.fontSize = size;
        this.saveLocalState();
    },

    fontToggle(isDyslexic) {
        document.documentElement.setAttribute('data-font', isDyslexic ? 'dyslexic' : 'standard');
        this.state.settings.dyslexia = isDyslexic;
        this.saveLocalState();
    },

    applySettings() {
        this.themeToggle(this.state.settings.theme === 'dark');
        this.fontSizeChange(this.state.settings.fontSize);
        this.fontToggle(this.state.settings.dyslexia);

        const darkModeInput = document.getElementById('setting-dark-mode');
        if (darkModeInput) darkModeInput.checked = this.state.settings.theme === 'dark';

        const fontSizeSelect = document.getElementById('setting-font-size');
        if (fontSizeSelect) fontSizeSelect.value = this.state.settings.fontSize;

        const dyslexiaInput = document.getElementById('setting-dyslexia');
        if (dyslexiaInput) dyslexiaInput.checked = this.state.settings.dyslexia;
    }
};

document.addEventListener("DOMContentLoaded", () => {
    window.app.init();
});
