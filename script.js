/* ================================================================
   Planeswalker's Typing Trial — MTG-Themed Typing Test
   Ken Douglas | COMP 484
   ================================================================ */

// MTG-themed passages (7 available; one chosen at random per round)
const passages = [
    "A planeswalker's spark ignites when their very soul is pushed to the brink of oblivion. In that moment of complete and utter despair, reality shatters like a mirror, and the walker steps between the shards into a new world entire.",
    "The five colors of mana define not merely the magic of the Multiverse, but the very philosophies by which beings live and die. White seeks order and unity. Blue covets knowledge and perfection. Black craves power at any cost. Red burns with passion and freedom. Green nurtures the wild.",
    "Phyrexia does not merely conquer — it converts. The oil seeps into every wound, every crack in flesh and metal alike, whispering promises of strength and belonging. By the time its victims understand what they have lost, the process of compleation is already complete.",
    "The Eldrazi are not gods, nor demons, nor dragons. They are the embodiment of the void between worlds — ancient beyond reckoning, alien beyond comprehension. To gaze upon an Eldrazi titan is to understand in an instant how small and fragile every living thing truly is.",
    "In the city of Ravnica, ten guilds divide the sky, the street, and the deep earth between them. Thieves and senators share the same cobblestone roads. Angels broker deals beside demons in firelit chambers. Beneath every treaty is an older betrayal.",
    "The dragons of Tarkir did not fall to weakness — they fell to time, to politics, and to the slow erosion of a world that had grown too small to hold them. When the wanderer walked back through the currents of history to restore them, he did not save the dragons. He saved the world that needed them.",
    "To wield green mana is to surrender the arrogance of civilization. The forest does not ask permission to grow. The wolf does not hesitate before the hunt. Ancient wisdom flows through root and stone, reminding all who listen that the mightiest force in any world is simply life itself, persisting."
];

// ================================================================
// DOM References
// ================================================================
const testWrapper  = document.querySelector('.test-wrapper');
const testArea     = document.querySelector('#test-area');
const resetButton  = document.querySelector('#reset');
const theTimer     = document.querySelector('.timer');
const wpmDisplay   = document.querySelector('#wpm-display');
const errorDisplay = document.querySelector('#error-display');
const originTextEl = document.querySelector('#origin-text p');

// ================================================================
// App State
// ================================================================
let timerInterval  = null;
let startTime      = null;
let isRunning      = false;
let isComplete     = false;
let errorCount     = 0;
let wasMatchingPrev = true;   // tracks correction→mistake transitions
let currentPassage  = '';

// ================================================================
// Initialization
// ================================================================

function init() {
    setRandomPassage();
    displayScores();
}

// Pick a random passage and inject it into the origin-text box
function setRandomPassage() {
    const idx = Math.floor(Math.random() * passages.length);
    currentPassage = passages[idx];
    originTextEl.textContent = currentPassage;
}

// ================================================================
// Timer
// ================================================================

// Pad single-digit numbers with a leading zero (e.g. 3 → "03")
function zeroPad(n) {
    return n <= 9 ? '0' + n : String(n);
}

function getElapsedMs() {
    return startTime ? Date.now() - startTime : 0;
}

// Render current elapsed time to the clock display
function updateTimerDisplay() {
    const ms          = getElapsedMs();
    const centisecs   = Math.floor((ms % 1000) / 10);
    const totalSecs   = Math.floor(ms / 1000);
    const secs        = totalSecs % 60;
    const mins        = Math.floor(totalSecs / 60);
    theTimer.textContent = zeroPad(mins) + ':' + zeroPad(secs) + ':' + zeroPad(centisecs);
}

function startTimer() {
    if (!isRunning) {
        startTime = Date.now();
        isRunning = true;
        timerInterval = setInterval(function () {
            updateTimerDisplay();
            updateWPM();
        }, 50);
    }
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
}

// ================================================================
// Live Metrics
// ================================================================

// Words Per Minute = (characters typed / 5) / (elapsed minutes)
function updateWPM() {
    const elapsedSecs = getElapsedMs() / 1000;
    if (elapsedSecs < 0.5) { wpmDisplay.textContent = '0'; return; }
    const wpm = Math.round((testArea.value.length / 5) / (elapsedSecs / 60));
    wpmDisplay.textContent = wpm;
}

// ================================================================
// Text Matching & Visual Feedback
// ================================================================

function matchText() {
    if (isComplete) return;

    const userInput = testArea.value;

    // Start timer on first keystroke
    if (userInput.length > 0 && !isRunning) {
        startTimer();
    }

    // Empty input — reset to neutral (grey) state
    if (userInput.length === 0) {
        testWrapper.style.borderColor = '#555555';
        wasMatchingPrev = true;
        return;
    }

    const expected = currentPassage.substring(0, userInput.length);

    if (userInput === currentPassage) {
        // ── Test complete ────────────────────────────────────────
        const finalMs = Date.now() - startTime;
        stopTimer();
        isComplete = true;

        // Display the exact finish time
        const cs    = Math.floor((finalMs % 1000) / 10);
        const total = Math.floor(finalMs / 1000);
        theTimer.textContent = zeroPad(Math.floor(total / 60)) + ':' +
                               zeroPad(total % 60) + ':' +
                               zeroPad(cs);

        const finalWpm = Math.round((currentPassage.length / 5) / (finalMs / 1000 / 60));
        wpmDisplay.textContent = finalWpm;

        testWrapper.style.borderColor = '#1a7a1a';   // green mana — success
        testWrapper.classList.add('complete');

        saveScore(finalMs, finalWpm, theTimer.textContent);
        displayScores();

    } else if (userInput === expected) {
        // ── Correct so far — blue mana ───────────────────────────
        testWrapper.style.borderColor = '#1464aa';
        wasMatchingPrev = true;

    } else {
        // ── Typo detected — red mana ─────────────────────────────
        testWrapper.style.borderColor = '#cc2200';

        // Count each new error event (transition from correct → incorrect)
        if (wasMatchingPrev) {
            errorCount++;
            errorDisplay.textContent = errorCount;
        }
        wasMatchingPrev = false;
    }
}

// ================================================================
// Reset
// ================================================================

function resetTest() {
    stopTimer();
    startTime     = null;
    isRunning     = false;
    isComplete    = false;
    errorCount    = 0;
    wasMatchingPrev = true;

    theTimer.textContent     = '00:00:00';
    wpmDisplay.textContent   = '0';
    errorDisplay.textContent = '0';
    testArea.value           = '';
    testWrapper.style.borderColor = '#555555';
    testWrapper.classList.remove('complete');

    setRandomPassage();
    testArea.focus();
}

// ================================================================
// Local Storage — Top 3 Scores
// ================================================================

function saveScore(ms, wpm, timeDisplay) {
    const scores = JSON.parse(localStorage.getItem('mtgTypingScores') || '[]');
    scores.push({ ms: ms, wpm: wpm, time: timeDisplay });
    scores.sort(function (a, b) { return a.ms - b.ms; });     // fastest first
    localStorage.setItem('mtgTypingScores', JSON.stringify(scores.slice(0, 3)));
}

function displayScores() {
    const scores     = JSON.parse(localStorage.getItem('mtgTypingScores') || '[]');
    const leaderboard = document.querySelector('#leaderboard');

    if (scores.length === 0) {
        leaderboard.innerHTML = '<p class="no-scores">No records yet. Be the first champion!</p>';
        return;
    }

    const ranks  = ['I', 'II', 'III'];
    const titles = ['Grandmaster Arcanist', 'Archmage', 'Adept Spellcaster'];

    leaderboard.innerHTML = scores.map(function (score, i) {
        return '<div class="score-card">' +
            '<div class="score-rank">'  + ranks[i]          + '</div>' +
            '<div class="score-title">' + titles[i]         + '</div>' +
            '<div class="score-time">'  + score.time        + '</div>' +
            '<div class="score-wpm">'   + score.wpm + ' WPM' + '</div>' +
        '</div>';
    }).join('');
}

// ================================================================
// Event Listeners
// ================================================================

testArea.addEventListener('input', matchText);
resetButton.addEventListener('click', resetTest);

init();
