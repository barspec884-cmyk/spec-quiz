// --- 音声オブジェクト ---
const sfx = {
    countdown: new Audio('sounds/countdown.mp3'),
    question: new Audio('sounds/question.mp3'),
    correct: new Audio('sounds/correct.mp3'),
    incorrect: new Audio('sounds/incorrect.mp3'),
    thinking: new Audio('sounds/thinkingtime.mp3'), // sinkingではなくthinkingに修正
    cheers: new Audio('sounds/cheers.mp3')
};
sfx.thinking.loop = true;

// --- グローバル変数 ---
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let timerInterval;
let timeLeft = 100;
let selectedMatches = { left: null, right: null };
let matchCount = 0;
let soundEnabled = true;

function playSound(key) {
    if (soundEnabled && sfx[key]) {
        sfx[key].currentTime = 0;
        sfx[key].play().catch(() => {});
    }
}

function stopAllSounds() {
    Object.values(sfx).forEach(a => { a.pause(); a.currentTime = 0; });
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('sound-toggle');
    btn.innerText = soundEnabled ? '🔊 ON' : '🔈 OFF';
    if (!soundEnabled) stopAllSounds();
}

// クイズ開始
function startQuiz(level) {
    stopAllSounds();
    // whiskyQuizDataがグローバルに存在することを確認
    currentQuestions = (level === '組み合わせ') 
        ? whiskyQuizData.filter(q => q.type === 'matching')
        : whiskyQuizData.filter(q => q.level === level);

    currentQuestions = currentQuestions.sort(() => Math.random() - 0.5).slice(0, 10);
    if (currentQuestions.length === 0) return alert("問題データが見つかりません。");

    score = 0;
    currentQuestionIndex = 0;
    document.getElementById('level-select').classList.add('hidden');
    
    showCountdown(() => {
        document.getElementById('quiz-container').classList.remove('hidden');
        showQuestion();
    });
}

function showCountdown(callback) {
    const overlay = document.getElementById('countdown-overlay');
    const numDisplay = document.getElementById('countdown-num');
    overlay.classList.remove('hidden');
    playSound('countdown');
    let count = 3;
    numDisplay.innerText = count;
    const interval = setInterval(() => {
        count--;
        if (count > 0) { numDisplay.innerText = count; } 
        else { clearInterval(interval); overlay.classList.add('hidden'); callback(); }
    }, 1000);
}

function showQuestion() {
    stopAllSounds();
    resetUI();
    const q = currentQuestions[currentQuestionIndex];
    document.getElementById('display-level').innerText = q.level;
    document.getElementById('current-num').innerText = `${currentQuestionIndex + 1} / ${currentQuestions.length}`;
    document.getElementById('question-text').innerText = q.q;

    playSound('question');
    setTimeout(() => playSound('thinking'), 500);

    if (q.type === 'matching') { renderMatching(q); } 
    else { renderOptions(q); }
    startTimer();
}

function renderOptions(q) {
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    container.classList.remove('hidden');
    q.a.forEach((text, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = text;
        btn.onclick = () => checkAnswer(index);
        container.appendChild(btn);
    });
}

function renderMatching(q) {
    const container = document.getElementById('matching-container');
    container.innerHTML = '';
    container.classList.remove('hidden');
    matchCount = 0;
    const grid = document.createElement('div');
    grid.className = 'matching-grid';
    const leftCol = document.createElement('div');
    leftCol.className = 'matching-column';
    const rightCol = document.createElement('div');
    rightCol.className = 'matching-column';

    const lefts = q.pairs.map((p, i) => ({ text: p.left, id: i })).sort(() => Math.random() - 0.5);
    const rights = q.pairs.map((p, i) => ({ text: p.right, id: i })).sort(() => Math.random() - 0.5);

    lefts.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'match-btn';
        btn.innerText = item.text;
        btn.onclick = () => selectMatch(btn, 'left', item.id, q);
        leftCol.appendChild(btn);
    });
    rights.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'match-btn';
        btn.innerText = item.text;
        btn.onclick = () => selectMatch(btn, 'right', item.id, q);
        rightCol.appendChild(btn);
    });
    grid.appendChild(leftCol); grid.appendChild(rightCol);
    container.appendChild(grid);
}

function selectMatch(btn, side, id, q) {
    if (btn.classList.contains('matched')) return;
    const siblings = btn.parentElement.querySelectorAll('.match-btn');
    siblings.forEach(s => s.classList.remove('selected'));
    btn.classList.add('selected');
    selectedMatches[side] = { btn, id };

    if (selectedMatches.left && selectedMatches.right) {
        if (selectedMatches.left.id === selectedMatches.right.id) {
            playSound('correct');
            selectedMatches.left.btn.classList.replace('selected', 'matched');
            selectedMatches.right.btn.classList.replace('selected', 'matched');
            selectedMatches = { left: null, right: null };
            matchCount++;
            if (matchCount === q.pairs.length) {
                clearInterval(timerInterval);
                showFeedback(true, q.r);
                score += (q.points || 10);
            }
        } else {
            playSound('incorrect');
            document.getElementById('quiz-app').classList.add('shake');
            setTimeout(() => {
                document.getElementById('quiz-app').classList.remove('shake');
                selectedMatches.left.btn.classList.remove('selected');
                selectedMatches.right.btn.classList.remove('selected');
                selectedMatches = { left: null, right: null };
            }, 500);
        }
    }
}

function checkAnswer(idx) {
    clearInterval(timerInterval);
    sfx.thinking.pause();
    const q = currentQuestions[currentQuestionIndex];
    const isCorrect = (idx === q.c);
    playSound(isCorrect ? 'correct' : 'incorrect');
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach((btn, i) => {
        btn.disabled = true;
        if (i === q.c) btn.classList.add('correct');
        else if (i === idx) btn.classList.add('wrong');
    });
    if (isCorrect) score += (q.points || 10);
    showFeedback(isCorrect, q.r);
}

function showFeedback(isCorrect, rationale) {
    const fb = document.getElementById('feedback');
    fb.style.display = 'block';
    const resText = document.getElementById('result-text');
    resText.innerText = isCorrect ? '正解！' : '不正解...';
    resText.style.color = isCorrect ? '#4caf50' : '#ef5350';
    document.getElementById('rationale-text').innerText = rationale;
    document.getElementById('next-btn').style.display = 'block';
}

function startTimer() {
    timeLeft = 100;
    const bar = document.getElementById('timer-bar');
    timerInterval = setInterval(() => {
        timeLeft -= 0.67; // 約15秒
        bar.style.width = timeLeft + '%';
        if (timeLeft <= 0) { clearInterval(timerInterval); checkAnswer(-1); }
    }, 100);
}

function resetUI() {
    document.getElementById('feedback').style.display = 'none';
    document.getElementById('next-btn').style.display = 'none';
    document.getElementById('options-container').classList.add('hidden');
    document.getElementById('matching-container').classList.add('hidden');
    document.getElementById('timer-bar').style.width = '100%';
}

function handleNext() {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuestions.length) showQuestion();
    else showFinalResult();
}

function showFinalResult() {
    stopAllSounds();
    document.getElementById('quiz-container').classList.add('hidden');
    document.getElementById('result-container').classList.remove('hidden');
    document.getElementById('final-score').innerText = score;
    playSound('cheers');
    document.getElementById('rank-name').innerText = score >= 80 ? "マスター" : "愛好家";
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
}