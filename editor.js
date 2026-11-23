/**
 * ==========================================================================
 * SmartRevision - MODULE ÉDITEUR (editor.js)
 * - Seul l'éditeur peut publier ou supprimer une matière.
 * - Toute matière publiée est poussée vers Google Sheets (visible par tous).
 * - Toute matière supprimée est définitivement effacée de Google Sheets.
 * ==========================================================================
 */

window.app.toggleAdminMode = function() {
    const studentZone = document.getElementById('student-zone');
    const editorZone = document.getElementById('editor-zone');
    const toggleBtn = document.getElementById('toggle-mode-btn');

    if (this.currentViewZone === 'student-zone') {
        studentZone.classList.remove('active');
        editorZone.classList.add('active');
        this.currentViewZone = 'editor-zone';
        toggleBtn.innerText = "Mode Étudiant";
        toggleBtn.style.backgroundColor = "#173f27";
        toggleBtn.style.color = "#ffffff";
        this.switchView('editor-dashboard');
        this.renderEditorDashboard();
        this.syncCoursesFromSheet();
    } else {
        editorZone.classList.remove('active');
        studentZone.classList.add('active');
        this.currentViewZone = 'student-zone';
        toggleBtn.innerText = "Mode Éditeur";
        toggleBtn.style.backgroundColor = "var(--card-bg)";
        toggleBtn.style.color = "var(--accent-green)";
        this.switchView('dashboard');
    }
};

window.app.postToSheet = async function(payload) {
    if (!this.isSheetConfigured()) {
        throw new Error("URL Google Sheets non configurée dans SHEET_WEB_APP_URL.");
    }
    const response = await fetch(this.SHEET_WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!result || !result.ok) {
        throw new Error((result && result.error) || "Erreur Google Sheets.");
    }
    return result;
};

window.app.renderEditorDashboard = function() {
    const list = document.getElementById('editor-courses-list');
    if (!list) return;
    list.innerHTML = '';

    if (this.state.courses.length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:10px;">Aucune matière publiée.</p>';
        return;
    }

    this.state.courses.forEach(course => {
        const row = document.createElement('div');
        row.className = 'course-card';
        row.style.background = 'var(--inner-box-bg)';
        row.style.marginBottom = '8px';
        row.innerHTML = `
            <div>
                <strong style="color:var(--text-main); font-size:0.95rem;">${course.title}</strong>
                <div style="font-size:0.75rem; color:var(--text-muted); font-weight:bold;">${(course.chapters || []).length} chapitre(s) • Publiée</div>
            </div>
            <button onclick="window.app.deleteCourse('${course.id}')" style="background:none; border:none; color:var(--color-bad); font-weight:bold; cursor:pointer; padding:6px;">Supprimer</button>
        `;
        list.appendChild(row);
    });
};

window.app.openCourseCreator = function() {
    this.switchView('course-creator');
    const stack = document.getElementById('chapters-dynamic-stack');
    if (stack) stack.innerHTML = '';

    const titleInput = document.getElementById('input-course-title');
    if (titleInput) titleInput.value = '';

    this.addChapterField();
};

window.app.addChapterField = function() {
    const stack = document.getElementById('chapters-dynamic-stack');
    if (!stack) return;

    const chapIdx = stack.children.length + 1;
    const chapBox = document.createElement('div');
    chapBox.className = 'form-element';
    chapBox.style.marginTop = '12px';
    chapBox.style.borderLeft = '5px solid var(--accent-green)';
    chapBox.style.paddingLeft = '10px';

    chapBox.innerHTML = `
        <h4 style="color:var(--text-main); font-size:0.95rem; font-weight:bold; margin-bottom:6px;">Chapitre Numéro ${chapIdx}</h4>
        <input type="text" class="input-chap-title" placeholder="Titre du chapitre (Ex: Chapitre ${chapIdx} : Introduction)" style="width:100%; padding:9px; border-radius:8px; border:1px solid #ccc; margin-bottom:8px;" required>

        <div class="parts-stack" style="background:rgba(0,0,0,0.02); padding:8px; border-radius:8px;">
            <h5 style="font-size:0.85rem; margin-bottom:4px; color:var(--accent-green);">📝 Contenu d'étude de la sous-partie</h5>
            <input type="text" class="input-part-title" placeholder="Titre de la sous-partie (Ex: 1. Notions clés)" style="width:100%; padding:8px; border-radius:6px; border:1px solid #ccc;" required>
            <textarea class="input-part-content" placeholder="Texte de cours ou résumé..." style="width:100%; height:90px; margin-top:6px; padding:8px; border-radius:6px; border:1px solid #ccc; font-family:sans-serif;" required></textarea>

            <input type="text" class="input-part-tip" placeholder="Astuce mémo-technique (Optionnel)" style="margin-top:6px; width:100%; padding:8px; border-radius:6px; border:1px solid #ccc;">
            <input type="text" class="input-part-example" placeholder="Exemple concret (Optionnel)" style="margin-top:6px; width:100%; padding:8px; border-radius:6px; border:1px solid #ccc;">

            <div class="question-builder-box" style="background:#ffffff; padding:10px; border-radius:10px; margin-top:10px; border:1px solid var(--inner-box-bg);">
                <h6 style="font-size:0.8rem; font-weight:bold; color:var(--text-main); margin-bottom:6px;">🎯 QUESTION DE VÉRIFICATION ACTIVE (QCM)</h6>
                <input type="text" class="input-q-text" placeholder="Énoncé clair de la question du Quiz" style="width:100%; padding:8px; margin-bottom:6px; border-radius:6px; border:1px solid #ccc;" required>
                <input type="text" class="input-q-opt1" placeholder="Option A (Bonne réponse)" style="width:100%; padding:8px; margin-bottom:6px; border-radius:6px; border:1px solid #173f27; background:#f0fff4;" required>
                <input type="text" class="input-q-opt2" placeholder="Option B (Mauvaise réponse)" style="width:100%; padding:8px; margin-bottom:6px; border-radius:6px; border:1px solid #ccc;" required>
                <input type="text" class="input-q-opt3" placeholder="Option C (Mauvaise réponse)" style="width:100%; padding:8px; margin-bottom:6px; border-radius:6px; border:1px solid #ccc;" required>
                <textarea class="input-q-explanation" placeholder="Explication pédagogique immédiate..." style="width:100%; height:55px; padding:8px; border-radius:6px; border:1px solid #ccc;" required></textarea>
            </div>
        </div>
    `;
    stack.appendChild(chapBox);
};

window.app.saveCreatedCourse = async function() {
    const title = document.getElementById('input-course-title').value.trim();
    if (!title) {
        alert("Veuillez donner un titre à la matière.");
        return;
    }

    const newCourse = {
        id: "cours_" + Date.now(),
        title: title,
        chapters: []
    };

    const chapBlocks = document.querySelectorAll('#chapters-dynamic-stack .form-element');
    let validationPassed = true;

    chapBlocks.forEach((block, cIdx) => {
        const chapTitle = block.querySelector('.input-chap-title').value.trim();
        const partTitle = block.querySelector('.input-part-title').value.trim();
        const partContent = block.querySelector('.input-part-content').value.trim();
        const partTip = block.querySelector('.input-part-tip').value.trim();
        const partExample = block.querySelector('.input-part-example').value.trim();

        const qText = block.querySelector('.input-q-text').value.trim();
        const qOpt1 = block.querySelector('.input-q-opt1').value.trim();
        const qOpt2 = block.querySelector('.input-q-opt2').value.trim();
        const qOpt3 = block.querySelector('.input-q-opt3').value.trim();
        const qExp = block.querySelector('.input-q-explanation').value.trim();

        if (!chapTitle || !partTitle || !partContent || !qText || !qOpt1 || !qOpt2 || !qExp) {
            validationPassed = false;
            return;
        }

        const rawOptions = [qOpt1, qOpt2, qOpt3].filter(o => o !== "");
        const correctAnswerString = qOpt1;
        const finalOptions = this.shuffleArray(rawOptions);
        const correctIndex = finalOptions.indexOf(correctAnswerString);

        newCourse.chapters.push({
            id: `chap_${cIdx}_${Date.now()}`,
            title: chapTitle,
            parts: [{
                id: `part_${cIdx}_${Date.now()}`,
                title: partTitle,
                content: partContent,
                tip: partTip,
                example: partExample,
                questions: [{
                    type: "QCM",
                    question: qText,
                    options: finalOptions,
                    answer: correctIndex !== -1 ? correctIndex : 0,
                    explanation: qExp
                }]
            }]
        });
    });

    if (!validationPassed) {
        alert("Veuillez remplir tous les champs obligatoires.");
        return;
    }

    try {
        await this.postToSheet({ action: "publish", course: newCourse });
        await this.syncCoursesFromSheet();
        alert("Matière publiée sur Google Sheets et visible par tous !");
        this.toggleAdminMode();
    } catch (err) {
        alert("Échec de publication sur Google Sheets : " + err.message);
    }
};

window.app.deleteCourse = async function(courseId) {
    if (!confirm("Supprimer définitivement cette matière pour tout le monde ?")) {
        return;
    }

    try {
        await this.postToSheet({ action: "delete", courseId: courseId });
        this.state.courses = this.state.courses.filter(c => c.id !== courseId);
        this.saveLocalState();
        this.renderEditorDashboard();
        this.renderDashboard();
        alert("Matière supprimée définitivement.");
    } catch (err) {
        alert("Erreur lors de la suppression sur Google Sheets : " + err.message);
    }
};

window.app.exportJSON = function() {
    if (this.state.courses.length === 0) {
        alert("Aucune matière à exporter.");
        return;
    }
    try {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.state.courses));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "SmartRevision_Matieres.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    } catch (e) {
        alert("Impossible d'exporter sur cet appareil.");
    }
};

window.app.importJSON = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const importedCourses = JSON.parse(e.target.result);
            if (!Array.isArray(importedCourses)) {
                alert("Format JSON invalide.");
                return;
            }
            for (const c of importedCourses) {
                if (c && c.title) {
                    const courseObj = {
                        ...c,
                        id: c.id || ("cours_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6))
                    };
                    await this.postToSheet({ action: "publish", course: courseObj });
                }
            }
            await this.syncCoursesFromSheet();
            this.renderEditorDashboard();
            alert("Matières importées et publiées sur Google Sheets !");
        } catch (err) {
            alert("Erreur d'importation : " + err.message);
        }
    };
    reader.readAsText(file);
};
