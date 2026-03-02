let score = 0;
let hits = 0;
let totalClicks = 0;
let time = 30;
let streak = 0;
let bestScore = localStorage.getItem("cyberAimBestScore") || 0;

let spawnSpeed = 800; // ms between spawns
let baseTargetSize = 60; // px
let shrinkRate = 0.5; // size decrease per frame at 60fps equivalent
let timeLimit = 30; // total duration

const gameArea = document.getElementById("gameArea");
const timeDisplay = document.getElementById("time");
const scoreDisplay = document.getElementById("score");
const accuracyDisplay = document.getElementById("accuracy");
const streakDisplay = document.getElementById("streak");
const bestScoreDisplay = document.getElementById("bestScore");

// Modal elements
const gameOverModal = document.getElementById("gameOverModal");
const finalScoreDisplay = document.getElementById("finalScore");
const finalAccuracyDisplay = document.getElementById("finalAccuracy");

bestScoreDisplay.innerText = bestScore;

let gameInterval;
let timerInterval;
let animationFrameId;

let activeTargets = []; // Keep track of targets to shrink them

function setDifficulty(level) {
    // Update button visual states
    document.querySelectorAll('.difficulty .cyber-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (level === "easy") {
        spawnSpeed = 1000;
        baseTargetSize = 80;
        shrinkRate = 0.2;
    } else if (level === "medium") {
        spawnSpeed = 700;
        baseTargetSize = 60;
        shrinkRate = 0.4;
    } else {
        spawnSpeed = 450;
        baseTargetSize = 45;
        shrinkRate = 0.8;
    }
}

function startGame() {
    document.querySelector(".menu").classList.add("hidden");
    document.querySelector(".stats").classList.remove("hidden");
    gameArea.classList.remove("hidden");
    gameOverModal.classList.add("hidden"); // Ensure it's hidden on restart

    score = 0;
    hits = 0;
    totalClicks = 0;
    streak = 0;
    time = timeLimit;
    activeTargets = [];

    updateStats();
    timeDisplay.innerText = time;

    gameInterval = setInterval(createTarget, spawnSpeed);
    timerInterval = setInterval(updateTimer, 1000);

    // Start animation loop for shrinking targets
    lastTime = performance.now();
    shrinkLoop(lastTime);
}

let lastTime = 0;
function shrinkLoop(currentTime) {
    if (time <= 0) return; // Stop if game over

    // Calculate difference in milliseconds
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    for (let i = activeTargets.length - 1; i >= 0; i--) {
        let t = activeTargets[i];
        if (t.element && t.element.parentNode) {
            // Shrink based on delta time equivalent to ensure smooth shrinking independent of framerate
            let frameRateAdjust = deltaTime ? (deltaTime / 16.666) : 1;
            t.currentSize -= shrinkRate * frameRateAdjust;

            if (t.currentSize <= 10) {
                // Target shrinked to death (too small to hit)
                t.element.remove();
                activeTargets.splice(i, 1);
                streak = 0; // Miss penalty
                updateStats();
            } else {
                t.element.style.width = t.currentSize + "px";
                t.element.style.height = t.currentSize + "px";

                // Keep target center grounded to the original spot
                const offset = (t.initialSize - t.currentSize) / 2;
                t.element.style.left = (t.x + offset) + "px";
                t.element.style.top = (t.y + offset) + "px";
            }
        } else {
            // Element already removed manually
            activeTargets.splice(i, 1);
        }
    }

    animationFrameId = requestAnimationFrame(shrinkLoop);
}

function createTarget() {
    const target = document.createElement("div");
    target.classList.add("target");

    // Start with a slight random variation in base size
    const initialSize = baseTargetSize + (Math.random() * 10 - 5);

    // Limits
    const maxX = gameArea.clientWidth - initialSize;
    const maxY = gameArea.clientHeight - initialSize;

    const x = Math.max(0, Math.random() * maxX);
    const y = Math.max(0, Math.random() * maxY);

    target.style.width = initialSize + "px";
    target.style.height = initialSize + "px";
    target.style.left = x + "px";
    target.style.top = y + "px";

    // Create tracking object reference
    let targetObj = {
        element: target,
        initialSize: initialSize,
        currentSize: initialSize,
        x: x,
        y: y
    };

    target.onpointerdown = function (e) {
        e.stopPropagation();

        hits++;
        totalClicks++;

        // Point system: base + streak bonus + size bonus
        let points = 10 + streak;
        let sizeBonus = Math.floor((baseTargetSize - targetObj.currentSize) / 2);
        if (sizeBonus > 0) points += sizeBonus;

        score += points;
        streak++;

        createHitText(e.clientX, e.clientY, points);

        // Play hit sound instead of base shoot sound on target hit
        hitSound.currentTime = 0;
        hitSound.play().catch(e => console.log(e));

        updateStats();
        target.remove();

        // Remove from active targets array
        const index = activeTargets.indexOf(targetObj);
        if (index > -1) {
            activeTargets.splice(index, 1);
        }
    };

    gameArea.appendChild(target);
    activeTargets.push(targetObj);

    // Fallback cleanup max lifespan based on base speed
    setTimeout(() => {
        if (target.parentNode) {
            target.remove();
            streak = 0;
            updateStats();
            const index = activeTargets.indexOf(targetObj);
            if (index > -1) {
                activeTargets.splice(index, 1);
            }
        }
    }, 4000);
}

function createHitText(x, y, points) {
    const hitText = document.createElement('div');
    hitText.classList.add('hit-text');
    hitText.innerText = `+${points}`;
    hitText.style.left = `${x - 10}px`;
    hitText.style.top = `${y - 10}px`;

    document.body.appendChild(hitText);

    setTimeout(() => {
        hitText.remove();
    }, 800);
}

// Audio Elements
const shootSound = new Audio('Image/sound effect/shoot.mp3');
const hitSound = new Audio('Image/sound effect/hit.wav');

// Preload to ensure minimal delay
shootSound.preload = 'auto';
hitSound.preload = 'auto';

// Background click registers as a shoot and miss
gameArea.addEventListener("pointerdown", function () {
    // Play shooting sound
    shootSound.currentTime = 0; // Reset to start for rapid clicking
    shootSound.play().catch(e => console.log("Audio playback prevented by browser:", e));

    totalClicks++;
    streak = 0; // Reset streak on miss
    updateStats();
});

function updateTimer() {
    time--;
    timeDisplay.innerText = time;

    if (time <= 0) {
        endGame();
    }
}

function updateStats() {
    scoreDisplay.innerText = score;
    streakDisplay.innerText = streak;
    let accuracy = totalClicks === 0 ? 0 : Math.round((hits / totalClicks) * 100);
    accuracyDisplay.innerText = accuracy;
}

function endGame() {
    clearInterval(gameInterval);
    clearInterval(timerInterval);
    cancelAnimationFrame(animationFrameId);

    // Clean up remaining targets
    gameArea.innerHTML = '';
    activeTargets = [];

    let isNewHighscore = false;
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem("cyberAimBestScore", bestScore);
        bestScoreDisplay.innerText = bestScore;
        isNewHighscore = true;
    }

    // Populate and show modal
    finalScoreDisplay.innerText = score;

    let accuracy = totalClicks === 0 ? 0 : Math.round((hits / totalClicks) * 100);
    finalAccuracyDisplay.innerText = accuracy;

    // Handle highscore message
    const existingMsg = gameOverModal.querySelector('.new-highscore-msg');
    if (existingMsg) existingMsg.remove();

    if (isNewHighscore) {
        const msg = document.createElement('p');
        msg.className = 'new-highscore-msg';
        msg.innerText = 'NEW_HIGHSCORE_ACHIEVED!';
        gameOverModal.querySelector('.modal-content').insertBefore(msg, gameOverModal.querySelector('.restart-btn'));
    }

    gameOverModal.classList.remove("hidden");
}