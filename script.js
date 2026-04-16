const canvas = document.getElementById("raceCanvas");
const ctx = canvas.getContext("2d");

const nameInputs = Array.from({ length: 4 }, (_, index) =>
  document.getElementById(`name${index + 1}`)
);
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const winnerNameEl = document.getElementById("winnerName");
const winnerNoteEl = document.getElementById("winnerNote");
const countdownBox = document.getElementById("countdownBox");
const leaderBox = document.getElementById("leaderBox");
const rankItems = Array.from(document.querySelectorAll(".rank-item"));
const beeSprite = new Image();
let beeSpriteReady = false;

beeSprite.decoding = "async";
beeSprite.addEventListener("load", () => {
  beeSpriteReady = true;
  render();
});
beeSprite.src = "bee-cute.png";

const palettes = [
  { accent: "#ff5e86", accentDark: "#e63d77", ribbon: "#ffc4d6", glow: "rgba(255, 94, 134, 0.28)" },
  { accent: "#31c6ef", accentDark: "#1898d4", ribbon: "#b5eeff", glow: "rgba(49, 198, 239, 0.28)" },
  { accent: "#ffbf36", accentDark: "#f09d00", ribbon: "#ffe6a1", glow: "rgba(255, 191, 54, 0.28)" },
  { accent: "#9977ff", accentDark: "#6d4bf0", ribbon: "#dacfff", glow: "rgba(153, 119, 255, 0.28)" },
];

const beeArchetypes = [
  {
    key: "rocket",
    label: "Bứt đầu",
    baseSpeed: 0.107,
    chaseBias: 0.007,
    passDesire: 0.006,
    finishKick: 0.009,
    fatigue: 0.017,
    breakawayDrag: 0.012,
    openingKick: 0.019,
    pulseRate: 1.86,
    rhythmAmp: 0.0046,
    slingBurst: 0.005,
    draftSkill: 0.002,
    earlyBias: 0.019,
    midBias: -0.003,
    lateBias: -0.011,
    chaosAmp: 0.0015,
    chaosRate: 2.2,
    finishKickPoint: 0.76,
    finishKickWidth: 0.11,
  },
  {
    key: "stalker",
    label: "Núp gió",
    baseSpeed: 0.103,
    chaseBias: 0.018,
    passDesire: 0.012,
    finishKick: 0.016,
    fatigue: 0.008,
    breakawayDrag: 0.006,
    openingKick: 0.006,
    pulseRate: 1.56,
    rhythmAmp: 0.0035,
    slingBurst: 0.01,
    draftSkill: 0.009,
    earlyBias: -0.001,
    midBias: 0.006,
    lateBias: 0.006,
    chaosAmp: 0.002,
    chaosRate: 2.6,
    finishKickPoint: 0.8,
    finishKickWidth: 0.12,
  },
  {
    key: "closer",
    label: "Nước rút cuối",
    baseSpeed: 0.1,
    chaseBias: 0.014,
    passDesire: 0.014,
    finishKick: 0.03,
    fatigue: 0.006,
    breakawayDrag: 0.004,
    openingKick: 0.002,
    pulseRate: 1.48,
    rhythmAmp: 0.0032,
    slingBurst: 0.013,
    draftSkill: 0.008,
    earlyBias: -0.01,
    midBias: 0.001,
    lateBias: 0.023,
    chaosAmp: 0.0015,
    chaosRate: 2.1,
    finishKickPoint: 0.86,
    finishKickWidth: 0.1,
  },
  {
    key: "roller",
    label: "Leo dần",
    baseSpeed: 0.102,
    chaseBias: 0.011,
    passDesire: 0.01,
    finishKick: 0.019,
    fatigue: 0.01,
    breakawayDrag: 0.005,
    openingKick: 0.008,
    pulseRate: 1.72,
    rhythmAmp: 0.0058,
    slingBurst: 0.009,
    draftSkill: 0.005,
    earlyBias: 0.002,
    midBias: 0.013,
    lateBias: 0.008,
    chaosAmp: 0.004,
    chaosRate: 3.2,
    finishKickPoint: 0.81,
    finishKickWidth: 0.13,
  },
];

const state = {
  mode: "idle",
  viewport: { width: 1280, height: 720, dpr: 1 },
  bees: [],
  rafId: null,
  lastFrame: 0,
  ambientTime: 0,
  raceElapsed: 0,
  countdownRemaining: 0,
  finishOrder: [],
  leaderIndex: null,
  whistleTriggered: false,
  whistleTime: 0,
};

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(t) {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
}

function smootherStep(t) {
  const x = clamp(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function gaussian(t, center, width) {
  const scaled = (t - center) / Math.max(0.001, width);
  return Math.exp(-scaled * scaled * 0.5);
}

function shuffled(array) {
  const next = [...array];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function roundRectPath(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fillRoundRect(x, y, width, height, radius, fillStyle) {
  roundRectPath(x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function strokeRoundRect(x, y, width, height, radius, strokeStyle, lineWidth = 1) {
  roundRectPath(x, y, width, height, radius);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function sanitizeName(value, index) {
  const cleaned = (value || "").trim().replace(/\s+/g, " ");
  return cleaned || `Ong ${index + 1}`;
}

function createBee(index) {
  const palette = palettes[index];
  return {
    index,
    palette,
    name: sanitizeName(nameInputs[index].value, index),
    size: 38 + (index % 2),
    progress: 0,
    displayProgress: 0,
    x: 0,
    y: 0,
    tilt: 0,
    finished: false,
    finishRank: null,
    finishTime: null,
    archetypeKey: "",
    archetypeLabel: "",
    speed: 0,
    baseSpeed: 0,
    chaseBias: 0,
    passDesire: 0,
    finishKick: 0,
    finishKickPoint: 0,
    finishKickWidth: 0,
    fatigue: 0,
    breakawayDrag: 0,
    openingKick: 0,
    pulseRate: 0,
    rhythmAmp: 0,
    slingBurst: 0,
    draftSkill: 0,
    earlyBias: 0,
    midBias: 0,
    lateBias: 0,
    chaosAmp: 0,
    chaosRate: 0,
    pathSeed: Math.random() * Math.PI * 2,
    wingSeed: Math.random() * Math.PI * 2,
    driftFreq: 2 + Math.random() * 0.65,
    driftFreqSecondary: 4 + Math.random() * 1.2,
    driftAmpX: 7 + Math.random() * 4,
    driftAmpY: 12 + Math.random() * 5,
    progressAmp: 0.012 + Math.random() * 0.01,
    progressWave: 2.4 + Math.random() * 0.8,
  };
}

function buildBees() {
  state.bees = Array.from({ length: 4 }, (_, index) => createBee(index));
}

function syncBeeNames() {
  state.bees.forEach((bee, index) => {
    bee.name = sanitizeName(nameInputs[index].value, index);
  });
}

function getTrackMetrics() {
  const { width, height } = state.viewport;
  const marginX = Math.max(42, width * 0.05);
  const trackTop = Math.max(108, height * 0.17);
  const trackBottom = height - Math.max(66, height * 0.11);
  const laneHeight = (trackBottom - trackTop) / 4;
  const startX = marginX + 46;
  const finishX = width - Math.max(108, width * 0.12);
  return {
    width,
    height,
    marginX,
    trackTop,
    trackBottom,
    laneHeight,
    startX,
    finishX,
    laneCenters: Array.from({ length: 4 }, (_, index) => trackTop + laneHeight * (index + 0.5)),
  };
}

function setStatusText(text) {
  countdownBox.textContent = text;
}

function setLeaderText(text) {
  leaderBox.textContent = text;
}

function refreshWinnerCard() {
  if (!state.finishOrder.length) {
    winnerNameEl.textContent = "Chưa có kết quả";
    winnerNoteEl.textContent =
      "Người thắng sẽ được nhấn mạnh nhẹ, nhưng bảng xếp hạng vẫn luôn giữ đủ 4 hạng.";
    return;
  }

  const winner = state.bees[state.finishOrder[0]];
  winnerNameEl.textContent = winner.name;

  if (state.finishOrder.length > 1) {
    const runnerUp = state.bees[state.finishOrder[1]];
    const gap = Math.max(0.01, runnerUp.finishTime - winner.finishTime).toFixed(2);
    winnerNoteEl.textContent = `${winner.name} thắng sát nút trước ${runnerUp.name} khoảng ${gap} giây.`;
  } else {
    winnerNoteEl.textContent = `${winner.name} vừa chạm đích trước tiên. Bảng xếp hạng đang tiếp tục lộ diện.`;
  }
}

function resetRankingBoard() {
  rankItems.forEach((item) => {
    item.classList.remove("revealed", "is-winner");
    item.querySelector(".rank-name").textContent = "Đang chờ về đích";
    item.querySelector(".rank-meta").textContent = "Kết quả sẽ xuất hiện khi cuộc đua bắt đầu.";
  });
}

function revealRank(bee) {
  const slot = rankItems[bee.finishRank - 1];
  if (!slot) {
    return;
  }

  slot.classList.add("revealed");
  if (bee.finishRank === 1) {
    slot.classList.add("is-winner");
  }

  slot.querySelector(".rank-name").textContent = bee.name;
  slot.querySelector(".rank-meta").textContent =
    bee.finishRank === 1
      ? `Về đích đầu tiên sau ${bee.finishTime.toFixed(2)} giây.`
      : `Cán đích ở vị trí #${bee.finishRank} sau ${bee.finishTime.toFixed(2)} giây.`;
}

function configureBeeRaceTraits(bee, archetype) {
  const spice = 0.0025;
  bee.speed = 0;
  bee.archetypeKey = archetype.key;
  bee.archetypeLabel = archetype.label;
  bee.baseSpeed = archetype.baseSpeed + (Math.random() - 0.5) * spice;
  bee.chaseBias = archetype.chaseBias + Math.random() * 0.003;
  bee.passDesire = archetype.passDesire + Math.random() * 0.003;
  bee.finishKick = archetype.finishKick + Math.random() * 0.005;
  bee.finishKickPoint = archetype.finishKickPoint + (Math.random() - 0.5) * 0.05;
  bee.finishKickWidth = archetype.finishKickWidth + (Math.random() - 0.5) * 0.03;
  bee.fatigue = archetype.fatigue + Math.random() * 0.003;
  bee.breakawayDrag = archetype.breakawayDrag + Math.random() * 0.0025;
  bee.openingKick = archetype.openingKick + Math.random() * 0.003;
  bee.pulseRate = archetype.pulseRate + (Math.random() - 0.5) * 0.2;
  bee.rhythmAmp = archetype.rhythmAmp + Math.random() * 0.0012;
  bee.slingBurst = archetype.slingBurst + Math.random() * 0.003;
  bee.draftSkill = archetype.draftSkill + Math.random() * 0.002;
  bee.earlyBias = archetype.earlyBias + (Math.random() - 0.5) * 0.003;
  bee.midBias = archetype.midBias + (Math.random() - 0.5) * 0.003;
  bee.lateBias = archetype.lateBias + (Math.random() - 0.5) * 0.003;
  bee.chaosAmp = archetype.chaosAmp + Math.random() * 0.0015;
  bee.chaosRate = archetype.chaosRate + (Math.random() - 0.5) * 0.35;
}

function getRaceScriptSummary(bees) {
  const labels = bees.map((bee) => bee.archetypeLabel.toLowerCase());
  return `${labels[0]}, ${labels[1]}, ${labels[2]}, ${labels[3]}`;
}

function getActiveRaceBees() {
  return state.bees.filter((bee) => !bee.finished).sort((a, b) => {
    if (b.progress !== a.progress) {
      return b.progress - a.progress;
    }
    return b.speed - a.speed;
  });
}

function triggerFinalWhistle(activeBees) {
  if (state.whistleTriggered) {
    return;
  }

  state.whistleTriggered = true;
  state.whistleTime = state.raceElapsed;
  setStatusText("Cú huýt cuối!");

  const frontPack = activeBees
    .slice(0, 2)
    .map((bee) => bee.name)
    .join(" và ");
  setLeaderText(frontPack ? `${frontPack} đang rướn` : "Cả đàn đang rướn");
}

function updateRaceStoryText(activeBees) {
  const leader = activeBees[0];
  const runnerUp = activeBees[1];

  if (!leader) {
    return;
  }

  if (state.whistleTriggered) {
    return;
  }

  const gap = runnerUp ? Math.max(0, leader.progress - runnerUp.progress) : 0;

  if (leader.progress < 0.18) {
    setStatusText(`${leader.name} đang bứt mở tốc`);
    return;
  }

  if (gap < 0.018) {
    setStatusText("Nhóm đầu đang ép sát");
    return;
  }

  if (leader.progress < 0.56) {
    setStatusText(`${leader.name} tạm dẫn nhưng bị bám gắt`);
    return;
  }

  setStatusText("Đường đua đang đảo nhịp");
}

function configureRace() {
  syncBeeNames();
  state.raceElapsed = 0;
  state.countdownRemaining = 3.1;
  state.finishOrder = [];
  state.mode = "countdown";
  state.leaderIndex = null;
  state.whistleTriggered = false;
  state.whistleTime = 0;
  const raceProfiles = shuffled(beeArchetypes);

  state.bees.forEach((bee, index) => {
    bee.progress = 0;
    bee.displayProgress = 0;
    bee.x = 0;
    bee.y = 0;
    bee.tilt = 0;
    bee.finished = false;
    bee.finishRank = null;
    bee.finishTime = null;
    bee.pathSeed = Math.random() * Math.PI * 2;
    bee.wingSeed = Math.random() * Math.PI * 2;
    configureBeeRaceTraits(bee, raceProfiles[index]);
  });

  setStatusText("Chuẩn bị xuất phát");
  setLeaderText(getRaceScriptSummary(state.bees));
  refreshWinnerCard();
  resetRankingBoard();
}

function startRace() {
  if (state.mode === "countdown" || state.mode === "racing") {
    return;
  }

  configureRace();
  startBtn.disabled = true;
  startLoop();
  render();
}

function resetRace() {
  state.mode = "idle";
  state.finishOrder = [];
  state.leaderIndex = null;
  state.countdownRemaining = 0;
  state.raceElapsed = 0;
  state.whistleTriggered = false;
  state.whistleTime = 0;

  state.bees.forEach((bee) => {
    bee.progress = 0;
    bee.displayProgress = 0;
    bee.x = 0;
    bee.y = 0;
    bee.tilt = 0;
    bee.speed = 0;
    bee.archetypeKey = "";
    bee.archetypeLabel = "";
    bee.finished = false;
    bee.finishRank = null;
    bee.finishTime = null;
  });

  startBtn.disabled = false;
  setStatusText("Sẵn sàng cho lượt đua");
  setLeaderText("Chờ xuất phát");
  refreshWinnerCard();
  resetRankingBoard();
  stopLoop();
  render();
}

function completeRace() {
  state.mode = "finished";
  startBtn.disabled = false;
  setStatusText("Tất cả ong đã về đích");
  setLeaderText("Bảng xếp hạng đã chốt");
  refreshWinnerCard();
  stopLoop();
  render();
}

function registerFinish(bee) {
  if (bee.finished) {
    return;
  }

  bee.finished = true;
  bee.finishRank = state.finishOrder.length + 1;
  bee.finishTime = state.raceElapsed;
  bee.progress = 1;
  bee.displayProgress = 1;
  state.finishOrder.push(bee.index);
  revealRank(bee);
  refreshWinnerCard();

  if (state.finishOrder.length === state.bees.length) {
    completeRace();
  }
}

function getDynamicSpeed(bee, activeBees) {
  const rank = activeBees.findIndex((candidate) => candidate.index === bee.index);
  const leader = activeBees[0] || bee;
  const ahead = rank > 0 ? activeBees[rank - 1] : null;
  const meanProgress =
    activeBees.reduce((total, candidate) => total + candidate.progress, 0) / Math.max(1, activeBees.length);
  const behindLeader = Math.max(0, leader.progress - bee.progress);
  const gapAhead = ahead ? Math.max(0, ahead.progress - bee.progress) : 0;
  const openingWindow = 1 - smootherStep(clamp((state.raceElapsed - 0.85) / 0.9));
  const openingBoost = openingWindow * bee.openingKick;
  const phase = bee.progress;
  const rhythm =
    Math.sin(state.raceElapsed * (bee.pulseRate * 2.15) + bee.pathSeed) * bee.rhythmAmp +
    Math.sin(state.raceElapsed * (bee.pulseRate * 3.5) + bee.wingSeed) * bee.rhythmAmp * 0.35;
  const chaos =
    Math.sin(state.raceElapsed * bee.chaosRate + bee.pathSeed * 1.6) *
    bee.chaosAmp *
    (0.35 + gaussian(phase, 0.48, 0.24));
  const earlyDrive = gaussian(phase, 0.17, 0.14) * bee.earlyBias;
  const midDrive = gaussian(phase, 0.5, 0.16) * bee.midBias;
  const lateDrive = gaussian(phase, 0.8, 0.12) * bee.lateBias;
  const chaseBoost = smoothstep(clamp(behindLeader / 0.13)) * bee.chaseBias;
  const passBoost = ahead ? gaussian(gapAhead, 0.028, 0.025) * bee.passDesire : 0;
  const draftBoost = ahead ? gaussian(gapAhead, 0.045, 0.02) * bee.draftSkill : 0;
  const frontDrag =
    rank === 0 ? clamp((leader.progress - meanProgress - 0.035) / 0.16) * bee.breakawayDrag : 0;
  const fatigue = smootherStep(clamp((phase - 0.64) / 0.28)) * bee.fatigue;

  let whistleBurst = 0;
  if (state.whistleTriggered) {
    const whistleBuild = smoothstep(clamp((state.raceElapsed - state.whistleTime) / 0.42));
    const closePackBoost = 1 + smoothstep(clamp((0.14 - behindLeader) / 0.14)) * 0.24;
    const rankBoost = rank === 0 ? 0.94 : 1 + Math.min(0.2, behindLeader * 1.6);
    whistleBurst =
      whistleBuild *
      gaussian(bee.progress, bee.finishKickPoint, bee.finishKickWidth) *
      (bee.finishKick + bee.slingBurst * 0.45) *
      closePackBoost *
      rankBoost;
  }

  const speed =
    bee.baseSpeed +
    openingBoost +
    earlyDrive +
    midDrive +
    lateDrive +
    rhythm +
    chaos +
    chaseBoost +
    passBoost +
    draftBoost +
    whistleBurst -
    fatigue -
    frontDrag;
  return clamp(speed, 0.082, 0.198);
}

function updateLeader() {
  const activeLeader = state.mode === "racing" ? getActiveRaceBees()[0] : state.bees[state.finishOrder[0]];

  if (!activeLeader) {
    return;
  }

  if (state.mode === "finished") {
    setLeaderText("Bảng xếp hạng đã chốt");
    return;
  }

  if (state.leaderIndex !== activeLeader.index) {
    state.leaderIndex = activeLeader.index;
    setLeaderText(activeLeader.name);
  }
}

function updateRace(dt) {
  state.ambientTime += dt;

  if (state.mode === "countdown") {
    state.countdownRemaining = Math.max(0, state.countdownRemaining - dt);
    const displayValue = Math.ceil(state.countdownRemaining);

    if (state.countdownRemaining > 0.15) {
      setStatusText(`Xuất phát sau ${displayValue}`);
      setLeaderText("Máy quay đang lia theo sân đua");
    } else {
      state.mode = "racing";
      state.raceElapsed = 0;
      setStatusText("Đua nào!");
      setLeaderText("Cuộc đua đã bắt đầu");
    }
    return;
  }

  if (state.mode !== "racing") {
    return;
  }

  state.raceElapsed += dt;
  const activeBees = getActiveRaceBees();
  const leader = activeBees[0];

  if (leader && !state.whistleTriggered && leader.progress >= 0.74) {
    triggerFinalWhistle(activeBees);
  }
  updateRaceStoryText(activeBees);

  state.bees.forEach((bee) => {
    if (bee.finished) {
      return;
    }

    bee.speed = getDynamicSpeed(bee, activeBees);
    bee.progress = clamp(bee.progress + bee.speed * dt);
    bee.displayProgress = bee.progress;

    if (bee.progress >= 1) {
      registerFinish(bee);
    }
  });

  updateLeader();
}

function getBeePosition(bee, metrics) {
  const laneCenter = metrics.laneCenters[bee.index];
  const progress = state.mode === "idle" ? 0 : bee.displayProgress;
  const baseX = metrics.startX + (metrics.finishX - metrics.startX) * progress;
  const motionTime = state.mode === "idle" ? state.ambientTime : state.raceElapsed;
  const swayFadeX = Math.pow(Math.max(0.02, 1 - progress), 0.55);
  const swayFadeY = 0.24 + Math.max(0, 1 - progress * 0.78);

  const swayX =
    (Math.sin(motionTime * bee.driftFreq + bee.pathSeed) * bee.driftAmpX * 0.34 +
      Math.sin(progress * 15 + bee.pathSeed * 0.6) * bee.driftAmpX * 0.2) *
    swayFadeX;
  const swayY =
    Math.sin(motionTime * bee.driftFreq + bee.pathSeed * 1.1) * bee.driftAmpY * 0.52 +
    Math.sin(motionTime * bee.driftFreqSecondary + bee.pathSeed * 0.55) * bee.driftAmpY * 0.28 +
    Math.sin(progress * Math.PI * (2.3 + bee.index * 0.18) + bee.pathSeed) *
      Math.min(metrics.laneHeight * 0.16, bee.driftAmpY * 0.8) *
      swayFadeY;
  const lift = state.mode === "idle" ? Math.sin(state.ambientTime * 1.8 + bee.pathSeed) * 4.5 : 0;

  const rawX = Math.min(metrics.finishX, baseX + Math.max(-2, swayX));
  const x = state.mode === "racing" ? Math.max(bee.x, rawX) : rawX;
  const y = laneCenter + swayY + lift;
  const tilt =
    Math.sin(motionTime * (bee.driftFreqSecondary + 0.75) + bee.pathSeed * 0.8) * 0.15 +
    swayX * 0.005;

  bee.x = x;
  bee.y = y;
  bee.tilt = tilt;
  return { x, y, tilt };
}

function drawCloud(x, y, width, height) {
  ctx.beginPath();
  ctx.ellipse(x + width * 0.25, y + height * 0.62, width * 0.2, height * 0.36, 0, 0, Math.PI * 2);
  ctx.ellipse(x + width * 0.5, y + height * 0.38, width * 0.24, height * 0.5, 0, 0, Math.PI * 2);
  ctx.ellipse(x + width * 0.72, y + height * 0.6, width * 0.2, height * 0.36, 0, 0, Math.PI * 2);
  ctx.ellipse(x + width * 0.5, y + height * 0.72, width * 0.44, height * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawSky(metrics) {
  const gradient = ctx.createLinearGradient(0, 0, 0, metrics.height);
  gradient.addColorStop(0, "#7edcff");
  gradient.addColorStop(0.34, "#d9f6ff");
  gradient.addColorStop(0.55, "#fbf3cf");
  gradient.addColorStop(1, "#83c046");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, metrics.width, metrics.height);

  const glow = ctx.createRadialGradient(metrics.width - 116, 88, 18, metrics.width - 116, 88, 92);
  glow.addColorStop(0, "rgba(255,243,176,0.96)");
  glow.addColorStop(1, "rgba(255,243,176,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(metrics.width - 116, 88, 92, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.88)";
  [
    { x: 106, y: 86, w: 154, h: 52 },
    { x: metrics.width * 0.36, y: 68, w: 138, h: 46 },
    { x: metrics.width - 360, y: 132, w: 180, h: 58 },
  ].forEach((cloud) => drawCloud(cloud.x, cloud.y, cloud.w, cloud.h));
}

function drawHills(metrics) {
  ctx.fillStyle = "#b4d84b";
  ctx.beginPath();
  ctx.moveTo(-40, metrics.height);
  ctx.quadraticCurveTo(140, metrics.height - 160, 320, metrics.height - 110);
  ctx.quadraticCurveTo(520, metrics.height - 40, 700, metrics.height - 122);
  ctx.quadraticCurveTo(900, metrics.height - 200, metrics.width + 40, metrics.height - 96);
  ctx.lineTo(metrics.width + 40, metrics.height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#7ab83c";
  ctx.beginPath();
  ctx.moveTo(-40, metrics.height);
  ctx.quadraticCurveTo(180, metrics.height - 110, 380, metrics.height - 76);
  ctx.quadraticCurveTo(620, metrics.height - 10, 820, metrics.height - 90);
  ctx.quadraticCurveTo(1010, metrics.height - 164, metrics.width + 40, metrics.height - 46);
  ctx.lineTo(metrics.width + 40, metrics.height);
  ctx.closePath();
  ctx.fill();
}

function drawLane(metrics, laneIndex) {
  const laneTop = metrics.trackTop + metrics.laneHeight * laneIndex;
  const laneHeight = metrics.laneHeight - 12;
  const palette = palettes[laneIndex];
  const gradient = ctx.createLinearGradient(metrics.marginX, laneTop, metrics.finishX, laneTop + laneHeight);
  gradient.addColorStop(0, `${palette.ribbon}e6`);
  gradient.addColorStop(1, "rgba(255,255,255,0.84)");

  fillRoundRect(metrics.marginX, laneTop, metrics.finishX - metrics.marginX + 34, laneHeight, 28, gradient);
  strokeRoundRect(
    metrics.marginX,
    laneTop,
    metrics.finishX - metrics.marginX + 34,
    laneHeight,
    28,
    "rgba(255,255,255,0.55)",
    2
  );

  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 3;
  ctx.setLineDash([16, 16]);
  ctx.beginPath();
  ctx.moveTo(metrics.marginX + 64, laneTop + laneHeight * 0.52);
  ctx.lineTo(metrics.finishX - 10, laneTop + laneHeight * 0.52);
  ctx.stroke();
  ctx.setLineDash([]);

  const badgeX = metrics.marginX + 18;
  const badgeY = laneTop + laneHeight * 0.5;
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 14px 'Trebuchet MS'";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(laneIndex + 1), badgeX, badgeY + 1);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawTrack(metrics) {
  fillRoundRect(
    metrics.marginX - 12,
    metrics.trackTop - 16,
    metrics.finishX - metrics.marginX + 130,
    metrics.trackBottom - metrics.trackTop + 28,
    34,
    "rgba(255,255,255,0.18)"
  );

  for (let laneIndex = 0; laneIndex < 4; laneIndex += 1) {
    drawLane(metrics, laneIndex);
  }
}

function drawFinishPortal(metrics) {
  const stripX = metrics.finishX + 10;
  const stripY = metrics.trackTop - 4;
  const stripWidth = 36;
  const stripHeight = metrics.trackBottom - metrics.trackTop + 8;

  const glow = ctx.createRadialGradient(stripX + stripWidth / 2, stripY + stripHeight / 2, 12, stripX + stripWidth / 2, stripY + stripHeight / 2, 86);
  glow.addColorStop(0, "rgba(255,255,255,0.28)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(stripX + stripWidth / 2, stripY + stripHeight / 2, 86, 0, Math.PI * 2);
  ctx.fill();

  fillRoundRect(stripX - 10, stripY - 10, stripWidth + 20, stripHeight + 20, 26, "rgba(255,255,255,0.3)");
  fillRoundRect(stripX, stripY, stripWidth, stripHeight, 18, "rgba(255,255,255,0.9)");

  const squareSize = 14;
  const innerX = stripX + 4;
  const innerY = stripY + 6;
  const cols = 2;
  const rows = Math.floor((stripHeight - 12) / squareSize);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? "#ffffff" : "#161616";
      ctx.fillRect(innerX + col * squareSize, innerY + row * squareSize, squareSize, squareSize);
    }
  }

  const signX = stripX - 42;
  const signY = stripY - 42;
  const signWidth = 126;
  const signHeight = 34;
  fillRoundRect(signX, signY, signWidth, signHeight, 17, "#ffefb2");
  strokeRoundRect(signX, signY, signWidth, signHeight, 17, "rgba(255,255,255,0.92)", 2);

  const bulbCount = 7;
  for (let bulb = 0; bulb < bulbCount; bulb += 1) {
    const bulbX = signX + 16 + (bulb * (signWidth - 32)) / (bulbCount - 1);
    ctx.fillStyle = bulb % 2 === 0 ? "#ff7aa1" : "#ffd24f";
    ctx.beginPath();
    ctx.arc(bulbX, signY + signHeight + 6, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#ff5c85";
  ctx.font = "900 18px 'Trebuchet MS'";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("FINISH", signX + signWidth / 2, signY + signHeight / 2 + 1);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawFlowers(metrics) {
  const patches = [
    { x: metrics.marginX + 28, y: metrics.trackBottom + 36, accent: "#ff6a94" },
    { x: metrics.marginX + 152, y: metrics.trackBottom + 52, accent: "#ffd34f" },
    { x: metrics.width - 232, y: metrics.trackBottom + 34, accent: "#a16dff" },
    { x: metrics.width - 104, y: metrics.trackBottom + 54, accent: "#39d1ff" },
  ];

  patches.forEach((patch) => {
    ctx.strokeStyle = "#4f8a28";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(patch.x, patch.y + 18);
    ctx.quadraticCurveTo(patch.x + 6, patch.y - 6, patch.x + 10, patch.y + 8);
    ctx.stroke();

    ctx.fillStyle = patch.accent;
    for (let petal = 0; petal < 5; petal += 1) {
      const angle = (Math.PI * 2 * petal) / 5;
      ctx.beginPath();
      ctx.ellipse(
        patch.x + 10 + Math.cos(angle) * 10,
        patch.y + 6 + Math.sin(angle) * 10,
        7,
        10,
        angle,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.fillStyle = "#ffe562";
    ctx.beginPath();
    ctx.arc(patch.x + 10, patch.y + 6, 6, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawBeeTrail(bee, metrics) {
  if (state.mode !== "racing") {
    return;
  }

  for (let step = 1; step <= 4; step += 1) {
    const ghostProgress = Math.max(0, bee.displayProgress - step * 0.03);
    const ghostX = metrics.startX + (metrics.finishX - metrics.startX) * ghostProgress;
    const ghostY =
      metrics.laneCenters[bee.index] +
      Math.sin((state.raceElapsed - step * 0.08) * bee.driftFreq + bee.pathSeed) * bee.driftAmpY * 0.35;
    ctx.fillStyle = `rgba(255,255,255,${0.085 - step * 0.013})`;
    ctx.beginPath();
    ctx.ellipse(ghostX - 4, ghostY + 8, 16 - step * 2, 10 - step * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBeeNameTag(bee, size, tagWidth) {
  const tagX = -tagWidth * 0.58;
  const tagY = -size * 1.02;
  fillRoundRect(tagX, tagY, tagWidth, 24, 12, bee.palette.accent);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 12px 'Trebuchet MS'";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(bee.name, tagX + tagWidth / 2, tagY + 12);
}

function drawWinnerStar(bee, size) {
  if (bee.finishRank !== 1) {
    return;
  }

  ctx.fillStyle = "#ffd95a";
  for (let point = 0; point < 5; point += 1) {
    const angle = -Math.PI / 2 + (point * Math.PI * 2) / 5;
    const outerX = size * 0.74 + Math.cos(angle) * 9;
    const outerY = -size * 0.78 + Math.sin(angle) * 9;
    const innerAngle = angle + Math.PI / 5;
    const innerX = size * 0.74 + Math.cos(innerAngle) * 4;
    const innerY = -size * 0.78 + Math.sin(innerAngle) * 4;
    if (point === 0) {
      ctx.beginPath();
      ctx.moveTo(outerX, outerY);
    } else {
      ctx.lineTo(outerX, outerY);
    }
    ctx.lineTo(innerX, innerY);
  }
  ctx.closePath();
  ctx.fill();
}

function drawFallbackBeeIllustration(bee, size, wingAngle) {
  ctx.strokeStyle = "rgba(122, 166, 214, 0.26)";
  ctx.lineWidth = 1.4;
  ctx.fillStyle = "rgba(255,255,255,0.74)";

  ctx.save();
  ctx.translate(-size * 0.02, -size * 0.36);
  ctx.rotate(-wingAngle);
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.24, size * 0.15, -0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(size * 0.14, -size * 0.34);
  ctx.rotate(wingAngle);
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.25, size * 0.16, 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  const bodyGradient = ctx.createLinearGradient(-size * 0.42, 0, size * 0.26, 0);
  bodyGradient.addColorStop(0, "#ffd44a");
  bodyGradient.addColorStop(1, "#f2b719");
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.ellipse(-size * 0.02, 0, size * 0.42, size * 0.27, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#171717";
  [-0.22, -0.04, 0.14].forEach((offset) => {
    ctx.beginPath();
    ctx.ellipse(size * offset, 0, size * 0.05, size * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#231d19";
  ctx.beginPath();
  ctx.moveTo(-size * 0.52, -size * 0.03);
  ctx.lineTo(-size * 0.72, 0);
  ctx.lineTo(-size * 0.52, size * 0.06);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = bee.palette.accent;
  ctx.beginPath();
  ctx.arc(size * 0.34, -size * 0.01, size * 0.19, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff5d7";
  ctx.beginPath();
  ctx.arc(size * 0.38, -size * 0.06, size * 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#4b331f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(size * 0.3, -size * 0.18);
  ctx.quadraticCurveTo(size * 0.42, -size * 0.44, size * 0.5, -size * 0.48);
  ctx.moveTo(size * 0.42, -size * 0.16);
  ctx.quadraticCurveTo(size * 0.6, -size * 0.4, size * 0.7, -size * 0.44);
  ctx.stroke();

  ctx.fillStyle = "#181818";
  ctx.beginPath();
  ctx.arc(size * 0.32, -size * 0.08, size * 0.028, 0, Math.PI * 2);
  ctx.arc(size * 0.42, -size * 0.07, size * 0.028, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 137, 171, 0.56)";
  ctx.beginPath();
  ctx.arc(size * 0.24, size * 0.01, size * 0.05, 0, Math.PI * 2);
  ctx.arc(size * 0.48, size * 0.02, size * 0.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#a04a34";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(size * 0.38, size * 0.02, size * 0.08, 0.1 * Math.PI, 0.92 * Math.PI);
  ctx.stroke();

  ctx.strokeStyle = "rgba(90, 67, 43, 0.44)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-size * 0.18, size * 0.2);
  ctx.lineTo(-size * 0.14, size * 0.33);
  ctx.moveTo(size * 0.01, size * 0.2);
  ctx.lineTo(size * 0.05, size * 0.34);
  ctx.moveTo(size * 0.2, size * 0.2);
  ctx.lineTo(size * 0.24, size * 0.33);
  ctx.stroke();
}

function drawSpriteBeeIllustration(bee, size, wingFlap) {
  const spriteSize = size * 1.62;
  const bob = wingFlap * size * 0.03;
  const pulseX = 1 + wingFlap * 0.018;
  const pulseY = 1 - wingFlap * 0.012;

  ctx.fillStyle = bee.palette.glow;
  ctx.beginPath();
  ctx.ellipse(-size * 0.02, size * 0.03, size * 0.62, size * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `${bee.palette.accent}33`;
  ctx.beginPath();
  ctx.ellipse(size * 0.12, -size * 0.06, size * 0.18, size * 0.12, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(size * 0.03, -size * 0.08 + bob);
  ctx.scale(-pulseX, pulseY);
  ctx.drawImage(beeSprite, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
  ctx.restore();
}

function drawBee(bee, metrics) {
  const { x, y, tilt } = getBeePosition(bee, metrics);
  const size = bee.size;
  const motionTime = state.mode === "idle" ? state.ambientTime : state.raceElapsed;
  const wingFlap = Math.sin(motionTime * 26 + bee.wingSeed);
  const wingAngle = 0.48 + wingFlap * 0.16;
  const tagWidth = Math.max(58, Math.min(100, bee.name.length * 7.4 + 22));

  drawBeeTrail(bee, metrics);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);

  ctx.fillStyle = "rgba(45, 38, 20, 0.14)";
  ctx.beginPath();
  ctx.ellipse(0, size * 0.5, size * 0.52, size * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  if (beeSpriteReady) {
    drawSpriteBeeIllustration(bee, size, wingFlap);
  } else {
    drawFallbackBeeIllustration(bee, size, wingAngle);
  }

  drawBeeNameTag(bee, size, tagWidth);
  drawWinnerStar(bee, size);

  ctx.restore();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawCountdownOverlay(metrics) {
  if (state.mode !== "countdown") {
    return;
  }

  const displayValue = Math.ceil(state.countdownRemaining);
  const label = displayValue > 0 ? String(displayValue) : "GO!";

  ctx.save();
  ctx.fillStyle = "rgba(35, 50, 80, 0.12)";
  ctx.fillRect(0, 0, metrics.width, metrics.height);
  ctx.font = "900 114px 'Trebuchet MS'";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 9;
  ctx.strokeStyle = "rgba(255,255,255,0.96)";
  ctx.strokeText(label, metrics.width / 2, metrics.height / 2 - 18);
  ctx.fillStyle = "#ff5a84";
  ctx.fillText(label, metrics.width / 2, metrics.height / 2 - 18);
  ctx.font = "800 25px 'Trebuchet MS'";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Sẵn sàng tăng tốc", metrics.width / 2, metrics.height / 2 + 70);
  ctx.restore();
}

function drawPhotoFinishBanner(metrics) {
  if (state.mode !== "racing") {
    return;
  }

  const sorted = [...state.bees].sort((a, b) => b.progress - a.progress);
  if (!sorted[1] || sorted[0].progress < 0.72) {
    return;
  }

  if (Math.abs(sorted[0].progress - sorted[1].progress) > 0.045) {
    return;
  }

  fillRoundRect(metrics.width / 2 - 122, 26, 244, 40, 20, "rgba(255,255,255,0.82)");
  ctx.fillStyle = "#ff4f86";
  ctx.font = "900 20px 'Trebuchet MS'";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Về đích sít sao", metrics.width / 2, 47);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawScene() {
  const metrics = getTrackMetrics();
  ctx.clearRect(0, 0, state.viewport.width, state.viewport.height);
  drawSky(metrics);
  drawHills(metrics);
  drawTrack(metrics);
  drawFinishPortal(metrics);
  drawFlowers(metrics);
  state.bees.forEach((bee) => drawBee(bee, metrics));
  drawPhotoFinishBanner(metrics);
  drawCountdownOverlay(metrics);
}

function render() {
  drawScene();
}

function tick(now) {
  if (!state.lastFrame) {
    state.lastFrame = now;
  }

  const dt = Math.min(0.05, (now - state.lastFrame) / 1000 || 1 / 60);
  state.lastFrame = now;
  updateRace(dt);
  render();

  if (state.mode === "countdown" || state.mode === "racing") {
    state.rafId = requestAnimationFrame(tick);
  } else {
    state.rafId = null;
  }
}

function startLoop() {
  if (state.rafId) {
    return;
  }

  state.lastFrame = 0;
  state.rafId = requestAnimationFrame(tick);
}

function stopLoop() {
  if (!state.rafId) {
    return;
  }

  cancelAnimationFrame(state.rafId);
  state.rafId = null;
  state.lastFrame = 0;
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  state.viewport = {
    width: rect.width,
    height: rect.height,
    dpr,
  };
  render();
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen?.();
    return;
  }

  document.documentElement.requestFullscreen?.();
}

function updateFullscreenLabel() {
  fullscreenBtn.textContent = document.fullscreenElement ? "Thoát toàn màn hình" : "Toàn màn hình";
}

function renderGameToText() {
  const metrics = getTrackMetrics();
  const payload = {
    mode: state.mode,
    coordinateSystem: {
      origin: "top-left",
      x: "increases to the right",
      y: "increases downward",
      width: Math.round(metrics.width),
      height: Math.round(metrics.height),
    },
    status: countdownBox.textContent,
    leader: leaderBox.textContent,
    winner: winnerNameEl.textContent,
    whistleTriggered: state.whistleTriggered,
    finishOrder: state.finishOrder.map((index) => state.bees[index].name),
    bees: state.bees.map((bee) => ({
      lane: bee.index + 1,
      name: bee.name,
      role: bee.archetypeLabel,
      x: Number(bee.x.toFixed(1)),
      y: Number(bee.y.toFixed(1)),
      progress: Number(bee.displayProgress.toFixed(3)),
      speed: Number(bee.speed.toFixed(3)),
      finished: bee.finished,
      finishRank: bee.finishRank,
    })),
  };
  return JSON.stringify(payload);
}

function advanceTime(ms) {
  const totalMs = Math.max(0, ms);
  const steps = Math.max(1, Math.round(totalMs / (1000 / 60)));
  const dt = totalMs / steps / 1000;
  for (let step = 0; step < steps; step += 1) {
    updateRace(dt);
  }
  render();
}

nameInputs.forEach((input, index) => {
  input.addEventListener("input", () => {
    state.bees[index].name = sanitizeName(input.value, index);
    render();
  });
});

startBtn.addEventListener("click", startRace);
resetBtn.addEventListener("click", resetRace);
fullscreenBtn.addEventListener("click", toggleFullscreen);

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (event.key === "Enter") {
    startRace();
  } else if (key === "r") {
    resetRace();
  } else if (key === "f") {
    toggleFullscreen();
  }
});

window.addEventListener("resize", resizeCanvas);
document.addEventListener("fullscreenchange", updateFullscreenLabel);

window.render_game_to_text = renderGameToText;
window.advanceTime = advanceTime;

buildBees();
resetRace();
resizeCanvas();
