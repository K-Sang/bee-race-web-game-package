const bees = Array.from({ length: 4 }, (_, i) => ({
  el: document.getElementById(`bee${i}`),
  labelEl: document.getElementById(`label${i}`),
  inputEl: document.getElementById(`name${i + 1}`),
  x: 0,
  y: 0,
  vx: 0,
  phase: Math.random() * Math.PI * 2,
  finished: false,
  target: 0,
  maxSpeed: 0
}));

const startBtns = [document.getElementById('startBtn'), document.getElementById('startBtnMobile')].filter(Boolean);
const resetBtns = [document.getElementById('resetBtn'), document.getElementById('resetBtnMobile')].filter(Boolean);
const fsBtns = [document.getElementById('fullscreenBtn'), document.getElementById('fullscreenBtnMobile')].filter(Boolean);
const winnerBox = document.getElementById('winnerBox');
const countdownBox = document.getElementById('countdownBox');
const track = document.getElementById('raceTrack');
const winnerModal = document.getElementById('winnerModal');
const winnerModalName = document.getElementById('winnerModalName');
const closeWinnerBtn = document.getElementById('closeWinnerBtn');

let animId = null;
let raceRunning = false;
let startTime = 0;
let countdownTimer = null;
let winnerIndex = 0;
let finishOrder = [];

function syncNames() {
  bees.forEach((bee, i) => {
    const value = (bee.inputEl.value || `Ong ${i + 1}`).trim();
    bee.labelEl.textContent = value;
  });
}

function setButtonsDisabled(disabled) {
  [...startBtns, ...resetBtns].forEach(btn => {
    if (!btn) return;
    if (btn.id.includes('start')) btn.disabled = disabled;
  });
}

function showCountdown(text) {
  countdownBox.textContent = text;
}

function randomWinner() {
  return Math.floor(Math.random() * bees.length);
}

function prepRaceState() {
  const trackWidth = track.clientWidth;
  const finishPadding = Math.max(120, trackWidth * 0.1);
  const finishLine = trackWidth - finishPadding;
  const closeGap = Math.min(26, Math.max(12, trackWidth * 0.018));
  winnerIndex = randomWinner();
  finishOrder = [];

  bees.forEach((bee, idx) => {
    bee.finished = false;
    bee.x = 0;
    bee.y = 0;
    bee.phase = Math.random() * Math.PI * 2;
    const isWinner = idx === winnerIndex;

    // winner reaches closest point first; the rest still reach finish, just slightly behind.
    const finalNudge = isWinner ? 0 : (idx === (winnerIndex + 1) % bees.length ? closeGap : closeGap + (10 + Math.random() * 14));
    bee.target = Math.max(0, finishLine - finalNudge);

    const baseSpeed = 260 + Math.random() * 20;
    bee.maxSpeed = isWinner ? baseSpeed + 36 + Math.random() * 20 : baseSpeed + Math.random() * 12;
    bee.vx = 0;
    bee.el.style.transform = `translateX(0px) translateY(0px)`;
    bee.el.classList.toggle('is-winner', false);
  });
}

function finishRace() {
  raceRunning = false;
  cancelAnimationFrame(animId);
  animId = null;
  const winnerName = bees[winnerIndex].labelEl.textContent;
  winnerBox.textContent = `Winner: ${winnerName}`;
  winnerModalName.textContent = winnerName;
  bees[winnerIndex].el.classList.add('is-winner');
  showCountdown('Về đích rồi!');
  setTimeout(() => winnerModal.classList.add('show'), 450);
  setButtonsDisabled(false);
}

function animate(ts) {
  if (!startTime) startTime = ts;
  const dt = Math.min(0.033, (ts - startTime) / 1000 || 0.016);
  startTime = ts;

  let completed = 0;
  bees.forEach((bee, idx) => {
    const distanceLeft = bee.target - bee.x;
    const progress = bee.target === 0 ? 1 : Math.min(1, bee.x / bee.target);

    if (distanceLeft <= 0.5) {
      bee.x = bee.target;
      bee.finished = true;
      completed += 1;
      if (!finishOrder.includes(idx)) finishOrder.push(idx);
    } else {
      const catchUp = 0.9 + (1 - progress) * 0.45;
      const dramaBoost = idx === winnerIndex && progress > 0.72 ? 1.18 : 1;
      const subtleBrake = idx !== winnerIndex && progress > 0.78 ? 0.93 : 1;
      bee.vx += (bee.maxSpeed * catchUp * dramaBoost * subtleBrake - bee.vx) * 2.8 * dt;
      const step = Math.min(distanceLeft, bee.vx * dt);
      bee.x += step;
    }

    bee.phase += 8 * dt;
    const bob = Math.sin(bee.phase + idx) * 7 + Math.sin(bee.phase * 0.52 + idx) * 3;
    const tilt = Math.sin(bee.phase * 1.8) * 2;
    bee.y = bob;
    bee.el.style.transform = `translateX(${bee.x}px) translateY(${bee.y}px) rotate(${tilt}deg)`;
  });

  if (completed === bees.length) {
    finishRace();
    return;
  }

  animId = requestAnimationFrame(animate);
}

function startRaceSequence() {
  if (raceRunning) return;
  syncNames();
  winnerModal.classList.remove('show');
  winnerBox.textContent = 'Winner: ?';
  setButtonsDisabled(true);
  prepRaceState();

  let count = 3;
  showCountdown(`Bắt đầu sau ${count}`);
  countdownTimer = setInterval(() => {
    count -= 1;
    if (count > 0) {
      showCountdown(`Bắt đầu sau ${count}`);
    } else {
      clearInterval(countdownTimer);
      countdownTimer = null;
      showCountdown('Đua nào!');
      raceRunning = true;
      startTime = 0;
      animId = requestAnimationFrame(animate);
    }
  }, 650);
}

function resetRace() {
  clearInterval(countdownTimer);
  countdownTimer = null;
  raceRunning = false;
  cancelAnimationFrame(animId);
  animId = null;
  bees.forEach((bee, idx) => {
    bee.x = 0;
    bee.y = 0;
    bee.vx = 0;
    bee.finished = false;
    bee.el.style.transform = `translateX(0px) translateY(0px)`;
    bee.el.classList.remove('is-winner');
    bee.labelEl.textContent = (bee.inputEl.value || `Ong ${idx + 1}`).trim();
  });
  winnerBox.textContent = 'Winner: ?';
  showCountdown('Sẵn sàng?');
  winnerModal.classList.remove('show');
  setButtonsDisabled(false);
}

async function openFullscreen() {
  const root = document.documentElement;
  if (!document.fullscreenElement && root.requestFullscreen) {
    await root.requestFullscreen();
  }
}

bees.forEach(bee => bee.inputEl.addEventListener('input', syncNames));
startBtns.forEach(btn => btn.addEventListener('click', startRaceSequence));
resetBtns.forEach(btn => btn.addEventListener('click', resetRace));
fsBtns.forEach(btn => btn.addEventListener('click', openFullscreen));
closeWinnerBtn.addEventListener('click', () => {
  winnerModal.classList.remove('show');
  resetRace();
});
window.addEventListener('resize', () => {
  if (!raceRunning) resetRace();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startRaceSequence();
  if (e.key.toLowerCase() === 'r') resetRace();
  if (e.key.toLowerCase() === 'f') openFullscreen();
});

syncNames();
resetRace();
