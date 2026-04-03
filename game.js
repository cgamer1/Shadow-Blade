const cv = document.getElementById("G");
const c = cv.getContext("2d");

function resize() {
  cv.width = Math.min(innerWidth - 4, 1100);
  cv.height = Math.min(innerHeight - 4, 660);
}

resize();
addEventListener("resize", resize);

let state = "title",
  lvl = 0,
  cam = { x: 0, y: 0 },
  fx = [],
  sk = 0,
  si = 0,
  enemyWakeT = 0,
  runTime = 0,
  levelStartTime = 0,
  newRecord = false,
  runSplits = [],
  fuelBoostOn = true,
  runEnemyKills = 0,
  levelEnemyKills = 0,
  bossHealthReductionApplied = 0;
const BEST_TIME_KEY = "shadow-blade-best-time";
const LEVEL_BESTS_KEY = "shadow-blade-level-bests";
const LEVEL_JUMP_PASSWORD = "88960420";
let bestTime = Number(localStorage.getItem(BEST_TIME_KEY)) || null;
let levelBestTimes = JSON.parse(localStorage.getItem(LEVEL_BESTS_KEY) || "[]");

document.getElementById("title").style.display = "flex";
document.getElementById("startBtn").onclick = () => startGame();
document.getElementById("retryBtn").onclick = () => retry();
document.getElementById("replayBtn").onclick = () => startGame();
const levelJumpOverlay = document.getElementById("levelJumpOverlay");
const levelJumpForm = document.getElementById("levelJumpForm");
const levelJumpPassword = document.getElementById("levelJumpPassword");
const levelJumpInput = document.getElementById("levelJumpInput");
const levelJumpStatus = document.getElementById("levelJumpStatus");

const K = {};
let JP = {};
let levelJumpReturnState = null;
let tutorialHints = [];

onkeydown = (e) => {
  if (
    document.activeElement === levelJumpInput ||
    document.activeElement === levelJumpPassword
  ) {
    if (e.code === "Escape") {
      e.preventDefault();
      closeLevelJump();
    }
    return;
  }

  if (e.code === "KeyT" && K["KeyC"]) {
    e.preventDefault();
    JP["KeyC"] = false;
    openLevelJump();
    return;
  }

  if (!K[e.code]) JP[e.code] = true;
  K[e.code] = true;
  if (
    [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Space",
      "KeyC",
      "KeyX",
      "KeyZ",
      "ShiftLeft",
      "ShiftRight",
    ].includes(e.code)
  ) {
    e.preventDefault();
  }
};

onkeyup = (e) => {
  K[e.code] = false;
};

levelJumpPassword.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  if (levelJumpPassword.value !== LEVEL_JUMP_PASSWORD) {
    setLevelJumpStatus("Incorrect password.", "#b00020");
    levelJumpPassword.select();
    return;
  }
  setLevelJumpStatus("Password accepted. Enter a level number.", "#2f6f2f");
  levelJumpInput.focus();
  levelJumpInput.select();
});

levelJumpForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (levelJumpPassword.value !== LEVEL_JUMP_PASSWORD) {
    setLevelJumpStatus("Incorrect password.", "#b00020");
    levelJumpPassword.select();
    return;
  }
  const targetLevel = Number(levelJumpInput.value.trim());
  if (!Number.isInteger(targetLevel) || targetLevel < 1 || targetLevel > LVLS.length) {
    setLevelJumpStatus(`Enter a level from 1 to ${LVLS.length}.`, "#b00020");
    levelJumpInput.select();
    return;
  }
  jumpToLevel(targetLevel - 1);
});

function clearInputState() {
  for (const code in K) K[code] = false;
  JP = {};
}

function setLevelJumpStatus(message, color = "#555") {
  levelJumpStatus.textContent = message;
  levelJumpStatus.style.color = color;
}

function openLevelJump() {
  clearInputState();
  if (state === "playing") {
    levelJumpReturnState = "playing";
    state = "paused";
  } else {
    levelJumpReturnState = null;
  }
  levelJumpPassword.value = "";
  levelJumpInput.value = String(lvl + 1);
  setLevelJumpStatus("");
  levelJumpOverlay.style.display = "flex";
  levelJumpPassword.focus();
  levelJumpPassword.select();
}

function closeLevelJump() {
  levelJumpOverlay.style.display = "none";
  levelJumpPassword.blur();
  levelJumpInput.blur();
  clearInputState();
  if (levelJumpReturnState === "playing") state = "playing";
  levelJumpReturnState = null;
}

function jumpToLevel(index) {
  if (index < 0 || index >= LVLS.length) return;
  lvl = index;
  runTime = 0;
  levelStartTime = 0;
  newRecord = false;
  runEnemyKills = 0;
  levelEnemyKills = 0;
  bossHealthReductionApplied = 0;
  runSplits = Array(LVLS.length).fill(null);
  document.getElementById("newRecordMsg").style.display = "none";
  state = "playing";
  hide("title");
  hide("dead");
  hide("win");
  closeLevelJump();
  loadLvl(lvl);
}

const GRAV = 0.5;
const JUMP = -9;
const JUMP_HOLD = 0.3;
const JUMP_MAX = -12;
const MAX_FALL = 12;
const MOVE_SPD = 3.5;
const AIR_CTRL = 0.25;
const WALL_SLIDE = 1.5;
const WALL_JUMP_VY = -11;
const WALL_JUMP_VX = 3.5;
const FAST_FALL = 0.8;
const P_ATK_CD = 60;
const E_ATK_CD = 120;
const PHASE_WINDOW = 180;
const CROUCH_TOGGLE_HOLD = 60;
const CROUCH_JUMP = JUMP * 0.5;
const CROUCH_JUMP_MAX = JUMP_MAX * 0.5;
const FUEL_MAX = 100;
const FUEL_GAIN = 0.55;
const FUEL_DRAIN = 0.75;
const FUEL_DECAY_FRAMES = 45;
const FUEL_IDLE_DRAIN = 0.2;
const SPEED_BONUS = 3;
const AIR_CTRL_BONUS = 0.25;

function mkP(x, y) {
  return {
    x,
    y,
    w: 28,
    h: 40,
    vx: 0,
    vy: 0,
    og: false,
    jumps: 2,
    face: 1,
    hp: 5,
    mhp: 5,
    cr: false,
    atk: false,
    atkT: 0,
    atkTy: "sweep",
    atkCD: 0,
    atkH: null,
    blk: false,
    pW: 0,
    stun: 0,
    iF: 0,
    _wb: false,
    wc: 0,
    onWall: 0,
    wallSlideT: 0,
    wjCD: 0,
    cjT: 0,
    cwj: false,
    crouchHoldT: 0,
    crouchLock: false,
    redSpeed: false,
    fuel: 0,
    fuelDecayT: 0,
    airT: 0,
    fixedJump: false,
    phaseT: 0,
    phaseShiftT: 0,
    phaseJumpT: 0,
    grabTarget: null,
    grabbedBy: null,
    thrown: false,
    throwT: 0,
    throwDmg: 1,
  };
}

function mkE(x, y, cfg = {}) {
  const isBoss = !!cfg.boss;
  const base = {
    x,
    y,
    w: isBoss ? 56 : 28,
    h: isBoss ? 80 : 40,
    vx: 0,
    vy: 0,
    og: false,
    face: -1,
    hp: isBoss ? BOSS_BASE_HP : 3,
    mhp: isBoss ? BOSS_BASE_HP : 3,
    pDir: 1,
    pD: 0,
    pM: isBoss ? 140 + Math.random() * 50 : 80 + Math.random() * 60,
    see: false,
    atk: false,
    atkT: 0,
    atkTy: "sweep",
    atkCD: 0,
    atkH: null,
    stun: 0,
    iF: 0,
    trip: false,
    tripT: 0,
    wc: 0,
    airT: 0,
    onWall: 0,
    jumpCD: 0,
    jumpTarget: null,
    grabTarget: null,
    grabbedBy: null,
    thrown: false,
    throwT: 0,
    throwDmg: 1,
    boss: isBoss,
    countedKill: false,
    bossPhase: 1,
    bossSpecialCD: 0,
    bossDashT: 0,
    renderW: isBoss ? 112 : 0,
    renderH: isBoss ? 200 : 0,
  };
  const merged = { ...base, ...cfg, x, y };
  if (cfg.hp == null) merged.hp = base.hp;
  if (cfg.mhp == null) merged.mhp = cfg.hp ?? base.mhp;
  return merged;
}

let P, EN, orbs, doors, plats, walls, spikes, levelBounds;

const LVLS = [
  {
    sp: { x: 40, y: 430 },
    pl: [
      { x: -40, y: 480, w: 300, h: 20 },
      { x: 320, y: 480, w: 220, h: 20 },
      { x: 620, y: 420, w: 150, h: 20 },
      { x: 860, y: 360, w: 140, h: 20 },
      { x: 1060, y: 300, w: 120, h: 20 },
      { x: 1240, y: 360, w: 130, h: 20 },
      { x: 1450, y: 430, w: 170, h: 20 },
      { x: 1700, y: 430, w: 200, h: 20 },
    ],
    wa: [
      { x: 560, y: 320, w: 18, h: 160 },
      { x: 1000, y: 220, w: 18, h: 140 },
    ],
    en: [{ x: 1490, y: 380 }, { x: 1760, y: 380 }],
    ob: [{ x: 1330, y: 290, gR: 120, gS: 0.28 }],
    dr: [{ x: 1820, y: 366 }],
    tt: [
      { x: 34, y: 418, lines: ["MOVE", "Arrow Left / Right"] },
      { x: 320, y: 418, lines: ["JUMP", "Tap Up", "Hold Up for height"] },
      { x: 610, y: 390, lines: ["WALL", "Slide on the wall", "Press Up to jump off"] },
      { x: 850, y: 328, lines: ["CROUCH / FAST-FALL", "Arrow Down on ground or in air"] },
      { x: 1225, y: 328, lines: ["ORB", "Blue orb pull affects jumps"] },
      { x: 1460, y: 398, lines: ["COMBAT", "Space attacks", "Shift blocks and parries"] },
      { x: 1710, y: 398, lines: ["EXIT", "Beat enemies", "Attack the door to open it"] },
    ],
  },
  {
    sp: { x: 40, y: 310 },
    pl: [
      { x: 20, y: 360, w: 100, h: 20 },
      { x: 250, y: 320, w: 100, h: 20 },
      { x: 450, y: 360, w: 100, h: 20 },
      { x: 600, y: 280, w: 120, h: 20 },
      { x: 820, y: 240, w: 120, h: 20 },
    ],
    wa: [
      { x: 180, y: 220, w: 16, h: 140 },
      { x: 390, y: 240, w: 16, h: 120 },
    ],
    en: [
      { x: 270, y: 270 },
      { x: 470, y: 310 },
      { x: 650, y: 230 },
    ],
    ob: [{ x: 190, y: 200, gR: 110, gS: 0.28 }],
    dr: [{ x: 870, y: 176 }],
  },
  {
    sp: { x: 40, y: 280 },
    pl: [
      { x: 20, y: 330, w: 90, h: 20 },
      { x: 200, y: 300, w: 80, h: 20 },
      { x: 380, y: 270, w: 80, h: 20 },
      { x: 540, y: 310, w: 80, h: 20 },
      { x: 700, y: 260, w: 100, h: 20 },
      { x: 880, y: 300, w: 100, h: 20 },
    ],
    wa: [{ x: 320, y: 180, w: 16, h: 90 }],
    en: [
      { x: 220, y: 250 },
      { x: 400, y: 220 },
      { x: 720, y: 210 },
    ],
    ob: [
      { x: 290, y: 240, gR: 120, gS: 0.3 },
      { x: 620, y: 220, gR: 100, gS: 0.26, type: "red" },
      { x: 800, y: 210, gR: 90, gS: 0.22 },
    ],
    dr: [{ x: 910, y: 236 }],
  },
  {
    sp: { x: 40, y: 400 },
    pl: [
      { x: 20, y: 450, w: 100, h: 20 },
      { x: 200, y: 400, w: 80, h: 20 },
      { x: 100, y: 300, w: 80, h: 20 },
      { x: 250, y: 220, w: 100, h: 20 },
      { x: 450, y: 180, w: 120, h: 20 },
      { x: 650, y: 240, w: 120, h: 20 },
    ],
    wa: [
      { x: 160, y: 220, w: 16, h: 180 },
      { x: 340, y: 120, w: 16, h: 100 },
      { x: 580, y: 130, w: 16, h: 110 },
    ],
    en: [
      { x: 220, y: 350 },
      { x: 120, y: 250 },
      { x: 280, y: 170 },
      { x: 680, y: 190 },
    ],
    ob: [
      { x: 170, y: 280, gR: 100, gS: 0.28 },
      { x: 500, y: 120, gR: 80, gS: 0.25 },
    ],
    dr: [{ x: 700, y: 176 }],
  },
  {
    sp: { x: 30, y: 330 },
    pl: [
      { x: 10, y: 380, w: 70, h: 20 },
      { x: 140, y: 350, w: 60, h: 20 },
      { x: 260, y: 320, w: 60, h: 20 },
      { x: 380, y: 350, w: 60, h: 20 },
      { x: 500, y: 300, w: 70, h: 20 },
      { x: 630, y: 340, w: 60, h: 20 },
      { x: 760, y: 280, w: 80, h: 20 },
      { x: 900, y: 320, w: 100, h: 20 },
    ],
    wa: [
      { x: 220, y: 230, w: 16, h: 90 },
      { x: 700, y: 200, w: 16, h: 80 },
    ],
    en: [
      { x: 160, y: 300 },
      { x: 280, y: 270 },
      { x: 520, y: 250 },
      { x: 650, y: 290 },
      { x: 920, y: 270 },
    ],
    ob: [
      { x: 320, y: 260, gR: 90, gS: 0.3 },
      { x: 580, y: 240, gR: 100, gS: 0.28 },
    ],
    dr: [{ x: 940, y: 256 }],
  },
  {
    sp: { x: 40, y: 500 },
    pl: [
      { x: 20, y: 540, w: 100, h: 20 },
      { x: 180, y: 480, w: 80, h: 20 },
      { x: 60, y: 400, w: 80, h: 20 },
      { x: 200, y: 330, w: 80, h: 20 },
      { x: 60, y: 260, w: 80, h: 20 },
      { x: 200, y: 190, w: 80, h: 20 },
      { x: 60, y: 120, w: 120, h: 20 },
    ],
    wa: [
      { x: 150, y: 120, w: 16, h: 420 },
      { x: 280, y: 180, w: 16, h: 360 },
    ],
    en: [
      { x: 200, y: 430 },
      { x: 80, y: 350 },
      { x: 220, y: 280 },
      { x: 80, y: 210 },
      { x: 220, y: 140 },
    ],
    ob: [
      { x: 210, y: 360, gR: 80, gS: 0.3 },
      { x: 140, y: 230, gR: 90, gS: 0.32, type: "red" },
    ],
    dr: [{ x: 90, y: 56 }],
  },
  {
    sp: { x: 40, y: 280 },
    pl: [
      { x: 20, y: 330, w: 100, h: 20 },
      { x: 180, y: 300, w: 80, h: 20 },
      { x: 320, y: 330, w: 80, h: 20 },
      { x: 460, y: 280, w: 100, h: 20 },
      { x: 620, y: 330, w: 80, h: 20 },
      { x: 760, y: 280, w: 80, h: 20 },
      { x: 900, y: 310, w: 100, h: 20 },
      { x: 1060, y: 270, w: 120, h: 20 },
    ],
    wa: [
      { x: 270, y: 210, w: 16, h: 120 },
      { x: 590, y: 200, w: 16, h: 130 },
      { x: 880, y: 190, w: 16, h: 120 },
    ],
    en: [
      { x: 200, y: 250 },
      { x: 340, y: 280 },
      { x: 480, y: 230 },
      { x: 640, y: 280 },
      { x: 780, y: 230 },
      { x: 920, y: 260 },
    ],
    ob: [
      { x: 390, y: 220, gR: 110, gS: 0.28 },
      { x: 700, y: 200, gR: 100, gS: 0.3 },
      { x: 1000, y: 210, gR: 90, gS: 0.26 },
    ],
    dr: [{ x: 1100, y: 206 }],
  },
  {
    sp: { x: 40, y: 350 },
    pl: [
      { x: 20, y: 400, w: 80, h: 20 },
      { x: 200, y: 360, w: 70, h: 20 },
      { x: 360, y: 400, w: 70, h: 20 },
      { x: 500, y: 340, w: 80, h: 20 },
      { x: 660, y: 380, w: 70, h: 20 },
      { x: 800, y: 320, w: 80, h: 20 },
      { x: 960, y: 360, w: 80, h: 20 },
    ],
    wa: [
      { x: 460, y: 250, w: 16, h: 90 },
      { x: 760, y: 240, w: 16, h: 80 },
    ],
    en: [
      { x: 220, y: 310 },
      { x: 380, y: 350 },
      { x: 520, y: 290 },
      { x: 680, y: 330 },
      { x: 820, y: 270 },
      { x: 980, y: 310 },
    ],
    ob: [
      { x: 300, y: 310, gR: 100, gS: 0.32 },
      { x: 580, y: 280, gR: 110, gS: 0.3, type: "red" },
      { x: 880, y: 260, gR: 90, gS: 0.28 },
    ],
    dr: [{ x: 990, y: 296 }],
  },
  {
    sp: { x: 40, y: 400 },
    pl: [
      { x: 20, y: 440, w: 80, h: 20 },
      { x: 180, y: 380, w: 60, h: 20 },
      { x: 330, y: 440, w: 60, h: 20 },
      { x: 480, y: 350, w: 80, h: 20 },
      { x: 680, y: 300, w: 80, h: 20 },
      { x: 850, y: 240, w: 100, h: 20 },
      { x: 580, y: 180, w: 80, h: 20 },
      { x: 380, y: 130, w: 100, h: 20 },
    ],
    wa: [
      { x: 140, y: 280, w: 16, h: 160 },
      { x: 260, y: 300, w: 16, h: 140 },
      { x: 430, y: 200, w: 16, h: 150 },
      { x: 560, y: 120, w: 16, h: 60 },
      { x: 750, y: 180, w: 16, h: 120 },
    ],
    en: [
      { x: 200, y: 330 },
      { x: 350, y: 390 },
      { x: 500, y: 300 },
      { x: 700, y: 250 },
      { x: 870, y: 190 },
      { x: 600, y: 130 },
      { x: 410, y: 80 },
    ],
    ob: [
      { x: 200, y: 300, gR: 80, gS: 0.3 },
      { x: 600, y: 240, gR: 100, gS: 0.32 },
      { x: 470, y: 120, gR: 90, gS: 0.28 },
    ],
    dr: [{ x: 410, y: 66 }],
  },
  {
    sp: { x: 40, y: 300 },
    pl: [
      { x: 20, y: 350, w: 80, h: 20 },
      { x: 180, y: 310, w: 60, h: 20 },
      { x: 320, y: 350, w: 60, h: 20 },
      { x: 460, y: 290, w: 70, h: 20 },
      { x: 600, y: 340, w: 60, h: 20 },
      { x: 740, y: 280, w: 70, h: 20 },
      { x: 880, y: 320, w: 70, h: 20 },
      { x: 1020, y: 260, w: 100, h: 20 },
    ],
    wa: [
      { x: 260, y: 230, w: 16, h: 120 },
      { x: 550, y: 210, w: 16, h: 130 },
      { x: 840, y: 200, w: 16, h: 120 },
    ],
    en: [
      { x: 200, y: 260 },
      { x: 340, y: 300 },
      { x: 480, y: 240 },
      { x: 620, y: 290 },
      { x: 760, y: 230 },
      { x: 900, y: 270 },
      { x: 1050, y: 210 },
    ],
    ob: [
      { x: 250, y: 260, gR: 120, gS: 0.35 },
      { x: 400, y: 240, gR: 100, gS: 0.32 },
      { x: 540, y: 260, gR: 110, gS: 0.35 },
      { x: 700, y: 230, gR: 100, gS: 0.3 },
      { x: 950, y: 220, gR: 120, gS: 0.35 },
    ],
    dr: [{ x: 1060, y: 196 }],
  },
  {
    sp: { x: 40, y: 560 },
    pl: [
      { x: 20, y: 600, w: 80, h: 20 },
      { x: 180, y: 540, w: 70, h: 20 },
      { x: 50, y: 470, w: 70, h: 20 },
      { x: 200, y: 400, w: 70, h: 20 },
      { x: 60, y: 340, w: 70, h: 20 },
      { x: 210, y: 280, w: 70, h: 20 },
      { x: 70, y: 220, w: 70, h: 20 },
      { x: 220, y: 160, w: 70, h: 20 },
      { x: 80, y: 100, w: 100, h: 20 },
    ],
    wa: [
      { x: 140, y: 100, w: 16, h: 500 },
      { x: 290, y: 150, w: 16, h: 450 },
    ],
    en: [
      { x: 200, y: 490 },
      { x: 70, y: 420 },
      { x: 220, y: 350 },
      { x: 80, y: 280 },
      { x: 230, y: 220 },
      { x: 90, y: 170 },
      { x: 240, y: 110 },
      { x: 110, y: 50 },
    ],
    ob: [
      { x: 200, y: 450, gR: 80, gS: 0.32 },
      { x: 150, y: 320, gR: 90, gS: 0.35 },
      { x: 200, y: 190, gR: 80, gS: 0.3 },
    ],
    dr: [{ x: 110, y: 36 }],
  },
  {
    sp: { x: 40, y: 330 },
    pl: [
      { x: 20, y: 380, w: 80, h: 20 },
      { x: 160, y: 340, w: 60, h: 20 },
      { x: 280, y: 380, w: 60, h: 20 },
      { x: 400, y: 330, w: 70, h: 20 },
      { x: 530, y: 370, w: 60, h: 20 },
      { x: 650, y: 310, w: 70, h: 20 },
      { x: 780, y: 350, w: 60, h: 20 },
      { x: 900, y: 290, w: 70, h: 20 },
      { x: 1030, y: 330, w: 60, h: 20 },
      { x: 1150, y: 270, w: 100, h: 20 },
    ],
    wa: [
      { x: 230, y: 270, w: 16, h: 110 },
      { x: 480, y: 240, w: 16, h: 130 },
      { x: 730, y: 230, w: 16, h: 120 },
      { x: 980, y: 210, w: 16, h: 120 },
      { x: 1120, y: 180, w: 16, h: 90 },
    ],
    en: [
      { x: 180, y: 290 },
      { x: 300, y: 330 },
      { x: 420, y: 280 },
      { x: 550, y: 320 },
      { x: 670, y: 260 },
      { x: 800, y: 300 },
      { x: 920, y: 240 },
      { x: 1050, y: 280 },
      { x: 1180, y: 220 },
    ],
    ob: [
      { x: 340, y: 280, gR: 120, gS: 0.35 },
      { x: 590, y: 260, gR: 110, gS: 0.38 },
      { x: 850, y: 240, gR: 100, gS: 0.35 },
      { x: 1080, y: 220, gR: 120, gS: 0.4 },
    ],
    dr: [{ x: 1190, y: 206 }],
  },
  {
    sp: { x: 40, y: 420 },
    pl: [
      { x: 20, y: 470, w: 90, h: 20 },
      { x: 180, y: 430, w: 80, h: 20, type: "green" },
      { x: 340, y: 320, w: 80, h: 20 },
      { x: 500, y: 420, w: 80, h: 20, type: "green" },
      { x: 670, y: 280, w: 90, h: 20 },
      { x: 860, y: 360, w: 90, h: 20, type: "green" },
      { x: 1040, y: 220, w: 120, h: 20 },
    ],
    wa: [{ x: 620, y: 280, w: 16, h: 140 }],
    en: [{ x: 360, y: 270 }, { x: 710, y: 230 }, { x: 1070, y: 170 }],
    ob: [{ x: 585, y: 240, gR: 100, gS: 0.26 }],
    dr: [{ x: 1090, y: 156 }],
  },
  {
    sp: { x: 40, y: 500 },
    pl: [
      { x: 20, y: 550, w: 100, h: 20 },
      { x: 180, y: 500, w: 90, h: 20, type: "green" },
      { x: 90, y: 390, w: 80, h: 20 },
      { x: 240, y: 320, w: 90, h: 20, type: "green" },
      { x: 120, y: 210, w: 80, h: 20 },
      { x: 300, y: 140, w: 100, h: 20, type: "green" },
      { x: 500, y: 90, w: 140, h: 20 },
    ],
    wa: [
      { x: 160, y: 210, w: 16, h: 310 },
      { x: 420, y: 90, w: 16, h: 230 },
    ],
    en: [{ x: 110, y: 340 }, { x: 260, y: 270 }, { x: 520, y: 40 }],
    ob: [{ x: 390, y: 210, gR: 85, gS: 0.24 }],
    dr: [{ x: 560, y: 26 }],
  },
  {
    sp: { x: 40, y: 340 },
    pl: [
      { x: 20, y: 390, w: 80, h: 20 },
      { x: 170, y: 350, w: 80, h: 20, type: "green" },
      { x: 320, y: 390, w: 70, h: 20 },
      { x: 460, y: 340, w: 80, h: 20, type: "green" },
      { x: 620, y: 390, w: 70, h: 20 },
      { x: 770, y: 330, w: 80, h: 20, type: "green" },
      { x: 940, y: 270, w: 90, h: 20 },
      { x: 1120, y: 220, w: 120, h: 20, type: "green" },
    ],
    wa: [
      { x: 280, y: 290, w: 16, h: 100 },
      { x: 710, y: 250, w: 16, h: 140 },
    ],
    en: [{ x: 340, y: 340 }, { x: 640, y: 340 }, { x: 960, y: 220 }],
    ob: [
      { x: 405, y: 295, gR: 95, gS: 0.25 },
      { x: 1080, y: 185, gR: 100, gS: 0.28 },
    ],
    dr: [{ x: 1150, y: 156 }],
  },
  {
    sp: { x: 30, y: 520 },
    pl: [
      { x: 10, y: 570, w: 90, h: 20 },
      { x: 140, y: 530, w: 90, h: 20, type: "green" },
      { x: 300, y: 470, w: 80, h: 20 },
      { x: 430, y: 410, w: 90, h: 20, type: "green" },
      { x: 610, y: 330, w: 80, h: 20 },
      { x: 760, y: 250, w: 100, h: 20, type: "green" },
      { x: 960, y: 180, w: 120, h: 20 },
    ],
    wa: [
      { x: 250, y: 470, w: 16, h: 100 },
      { x: 560, y: 330, w: 16, h: 100 },
      { x: 900, y: 180, w: 16, h: 90 },
    ],
    en: [{ x: 320, y: 420 }, { x: 640, y: 280 }, { x: 990, y: 130 }],
    ob: [
      { x: 350, y: 420, gR: 80, gS: 0.22, type: "red" },
      { x: 700, y: 210, gR: 100, gS: 0.28 },
    ],
    dr: [{ x: 1000, y: 116 }],
  },
  {
    sp: { x: 40, y: 480 },
    pl: [
      { x: 20, y: 530, w: 90, h: 20 },
      { x: 180, y: 500, w: 80, h: 20, type: "green" },
      { x: 340, y: 430, w: 90, h: 20, type: "green" },
      { x: 520, y: 360, w: 90, h: 20, type: "green" },
      { x: 720, y: 280, w: 90, h: 20, type: "green" },
      { x: 930, y: 200, w: 90, h: 20, type: "green" },
      { x: 1140, y: 130, w: 120, h: 20 },
    ],
    wa: [
      { x: 470, y: 360, w: 16, h: 90 },
      { x: 680, y: 280, w: 16, h: 100 },
      { x: 890, y: 200, w: 16, h: 100 },
    ],
    en: [
      { x: 210, y: 450 },
      { x: 550, y: 310 },
      { x: 760, y: 230 },
      { x: 1160, y: 80 },
    ],
    ob: [
      { x: 300, y: 450, gR: 95, gS: 0.24 },
      { x: 850, y: 240, gR: 95, gS: 0.24, type: "red" },
    ],
    dr: [{ x: 1170, y: 66 }],
  },
  {
    sp: { x: 40, y: 330 },
    pl: [
      { x: 20, y: 380, w: 90, h: 20 },
      { x: 220, y: 360, w: 120, h: 20 },
      { x: 480, y: 340, w: 120, h: 20 },
      { x: 760, y: 320, w: 120, h: 20 },
      { x: 1080, y: 300, w: 130, h: 20 },
    ],
    wa: [
      { x: 170, y: 280, w: 16, h: 100 },
      { x: 660, y: 240, w: 16, h: 100 },
    ],
    en: [
      { x: 260, y: 310 },
      { x: 520, y: 290 },
      { x: 1120, y: 250 },
    ],
    ob: [
      { x: 300, y: 300, gR: 120, gS: 0.26, type: "red" },
      { x: 610, y: 280, gR: 120, gS: 0.28, type: "red" },
      { x: 940, y: 250, gR: 110, gS: 0.24 },
    ],
    dr: [{ x: 1130, y: 236 }],
  },
  {
    sp: { x: 40, y: 520 },
    pl: [
      { x: 20, y: 570, w: 90, h: 20 },
      { x: 170, y: 520, w: 90, h: 20 },
      { x: 350, y: 450, w: 90, h: 20 },
      { x: 560, y: 380, w: 90, h: 20 },
      { x: 800, y: 300, w: 100, h: 20 },
      { x: 1080, y: 230, w: 130, h: 20 },
    ],
    wa: [
      { x: 130, y: 470, w: 16, h: 100 },
      { x: 490, y: 330, w: 16, h: 120 },
      { x: 980, y: 170, w: 16, h: 130 },
    ],
    en: [
      { x: 200, y: 470 },
      { x: 590, y: 330 },
      { x: 1110, y: 180 },
    ],
    ob: [
      { x: 250, y: 470, gR: 125, gS: 0.28, type: "red" },
      { x: 720, y: 250, gR: 120, gS: 0.26, type: "red" },
      { x: 930, y: 230, gR: 95, gS: 0.24 },
    ],
    dr: [{ x: 1110, y: 166 }],
  },
  {
    sp: { x: 40, y: 280 },
    pl: [
      { x: 20, y: 330, w: 80, h: 20 },
      { x: 180, y: 280, w: 80, h: 20 },
      { x: 380, y: 330, w: 80, h: 20 },
      { x: 600, y: 260, w: 90, h: 20 },
      { x: 830, y: 330, w: 90, h: 20 },
      { x: 1080, y: 240, w: 120, h: 20 },
    ],
    wa: [
      { x: 300, y: 210, w: 16, h: 120 },
      { x: 735, y: 200, w: 16, h: 130 },
    ],
    en: [
      { x: 210, y: 230 },
      { x: 420, y: 280 },
      { x: 620, y: 210 },
      { x: 1110, y: 190 },
    ],
    ob: [
      { x: 280, y: 245, gR: 105, gS: 0.25 },
      { x: 515, y: 255, gR: 125, gS: 0.3, type: "red" },
      { x: 960, y: 250, gR: 125, gS: 0.3, type: "red" },
    ],
    dr: [{ x: 1100, y: 176 }],
  },
  {
    sp: { x: 30, y: 470 },
    pl: [
      { x: 10, y: 520, w: 80, h: 20 },
      { x: 150, y: 480, w: 70, h: 20 },
      { x: 300, y: 430, w: 70, h: 20 },
      { x: 470, y: 380, w: 70, h: 20 },
      { x: 660, y: 330, w: 70, h: 20 },
      { x: 870, y: 280, w: 90, h: 20 },
      { x: 1110, y: 230, w: 120, h: 20 },
    ],
    wa: [
      { x: 250, y: 360, w: 16, h: 120 },
      { x: 610, y: 260, w: 16, h: 120 },
      { x: 1030, y: 180, w: 16, h: 100 },
    ],
    en: [
      { x: 170, y: 430 },
      { x: 500, y: 330 },
      { x: 900, y: 230 },
    ],
    ob: [
      { x: 220, y: 420, gR: 115, gS: 0.28, type: "red" },
      { x: 570, y: 310, gR: 115, gS: 0.28, type: "red" },
      { x: 990, y: 210, gR: 110, gS: 0.26, type: "red" },
    ],
    dr: [{ x: 1140, y: 166 }],
  },
  {
    sp: { x: 40, y: 560 },
    pl: [
      { x: 20, y: 610, w: 90, h: 20 },
      { x: 170, y: 560, w: 80, h: 20 },
      { x: 320, y: 500, w: 80, h: 20 },
      { x: 500, y: 430, w: 90, h: 20 },
      { x: 710, y: 350, w: 90, h: 20 },
      { x: 950, y: 260, w: 100, h: 20 },
      { x: 1180, y: 180, w: 120, h: 20 },
    ],
    wa: [
      { x: 270, y: 500, w: 16, h: 110 },
      { x: 455, y: 390, w: 16, h: 110 },
      { x: 900, y: 220, w: 16, h: 130 },
    ],
    en: [
      { x: 200, y: 510 },
      { x: 540, y: 380 },
      { x: 740, y: 300 },
      { x: 1210, y: 130 },
    ],
    ob: [
      { x: 240, y: 500, gR: 120, gS: 0.3, type: "red" },
      { x: 640, y: 330, gR: 120, gS: 0.3, type: "red" },
      { x: 1080, y: 210, gR: 105, gS: 0.25 },
    ],
    dr: [{ x: 1210, y: 116 }],
  },
];

const BOSS_BASE_HP = 28;

function clampNum(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function buildSpeedLevel(index, total) {
  const difficulty = total <= 1 ? 0 : index / (total - 1);
  const laneCount = difficulty > 0.65 ? 5 : 4;
  const lanes = Array.from({ length: laneCount }, (_, i) => 70 + i * 160);
  const pl = [{ x: -40, y: 610, w: 240, h: 20 }];
  const wa = [];
  const ob = [];
  const en = [];
  const spk = [];
  const segmentCount = 17 + Math.floor(index / 2);
  let laneIndex = 0;

  for (let s = 0; s < segmentCount; s++) {
    const prev = pl[pl.length - 1];
    const phase = s % 5;
    const prevLane = laneIndex;
    const laneShift = phase === 0 ? 1 : phase === 1 ? 1 : phase === 2 ? 2 : phase === 3 ? -1 : -2;
    laneIndex = clampNum(prevLane + laneShift, 0, lanes.length - 1);
    if (laneIndex === prevLane) laneIndex = clampNum(prevLane + (prevLane < lanes.length - 1 ? 1 : -1), 0, lanes.length - 1);
    let width = Math.max(76, 112 - Math.floor(difficulty * 18) - (phase === 2 ? 12 : 0));
    let nextY = prev.y - (72 + phase * 16 + Math.floor(difficulty * 34));
    let type;
    const mode = (index * 5 + s) % 8;
    let nextX = lanes[laneIndex] + ((s + index) % 2 === 0 ? 10 : -6);

    if (mode === 0) {
      nextY -= 22;
    } else if (mode === 1) {
      type = "green";
      width = 92;
      nextY -= 18;
    } else if (mode === 2) {
      type = "crumb";
      width = 86;
      nextY += 14;
    } else if (mode === 3) {
      const wallH = 155 + Math.floor(difficulty * 80);
      const wallX = laneIndex > prevLane ? nextX - 34 : nextX + width + 16;
      const wallY = nextY - wallH + 18;
      wa.push({ x: wallX, y: wallY, w: 18, h: wallH });
      nextY = wallY - 18;
      width = 88;
      if ((index + s) % 2 === 0) {
        ob.push({ x: wallX + 8, y: wallY + wallH / 2 - 28, gR: 95, gS: 0.24 + difficulty * 0.04 });
      }
    } else if (mode === 4) {
      type = "crumb";
      width = 72;
      nextY += 6;
      ob.push({
        x: (prev.x + nextX + width) / 2,
        y: Math.min(prev.y, nextY) - 88,
        gR: 95 + difficulty * 15,
        gS: 0.23 + difficulty * 0.05,
      });
    } else if (mode === 5) {
      nextY -= 8;
      if (index > total / 3 && (s + index) % 2 === 0) {
        ob.push({
          x: (prev.x + nextX + width) / 2,
          y: Math.max(prev.y, nextY) - 64,
          gR: 88 + difficulty * 10,
          gS: 0.22 + difficulty * 0.03,
          type: "red",
        });
      }
    } else if (mode === 6) {
      type = (s + index) % 2 === 0 ? "crumb" : undefined;
      nextY -= 28;
      width = type ? 78 : 84;
    } else {
      width = 76;
      nextY -= 34;
      if ((s + index) % 2 === 0) {
        type = "green";
        width = 82;
      }
    }

    nextY = clampNum(nextY, -980, 610);
    nextX = clampNum(nextX, 10, 760 - width);

    const spanLeft = Math.min(prev.x + prev.w, nextX);
    const spanRight = Math.max(prev.x + prev.w, nextX);
    const horizontalGap = spanRight - spanLeft;
    if (horizontalGap > 68 && (mode === 2 || mode === 4 || mode === 6 || mode === 7)) {
      const spikeWidth = Math.max(34, horizontalGap - 24);
      const spikeY = Math.max(prev.y, nextY) + 20;
      spk.push({
        x: spanLeft + 12,
        y: spikeY,
        w: spikeWidth,
        h: 22,
      });
    }
    pl.push({
      x: nextX,
      y: nextY,
      w: width,
      h: 20,
      ...(type ? { type } : {}),
    });

    if (s > 1 && s < segmentCount - 1 && (s + index) % 4 === 0) {
      en.push({
        x: nextX + Math.max(10, Math.floor((width - 28) / 2)),
        y: nextY - 40,
      });
    }
  }

  const last = pl[pl.length - 1];
  const exitY = last.y - 110;
  const exitX = clampNum(lanes[Math.max(0, laneIndex - 1)] + 30, 30, 690);
  pl.push({
    x: exitX,
    y: exitY,
    w: 150,
    h: 20,
    ...(index % 3 === 2 ? { type: "green" } : {}),
  });

  const tt =
    index === 0
      ? [
          { x: -20, y: 582, lines: ["VERTICAL RUN", "Climb fast", "Enemies are optional"] },
          {
            x: 210,
            y: 330,
            lines: ["USE THE FLOW", "Blue orbs pull jumps", "Green pads keep momentum"],
          },
          { x: 520, y: 180, lines: ["HAZARDS", "Crumbles will drop", "Spikes are lethal"] },
          { x: exitX - 80, y: exitY - 18, lines: ["EXIT", "Hit the door", "Keep climbing"] },
        ]
      : [];

  return {
    sp: { x: 20, y: 560 },
    pl,
    wa,
    en,
    ob,
    spk,
    dr: [{ x: exitX + 96, y: exitY - 64 }],
    tt,
    speedCourse: true,
    requiresClear: false,
  };
}

function buildBossLevel() {
  return {
    sp: { x: 80, y: 560 },
    pl: [
      { x: -40, y: 610, w: 900, h: 24 },
    ],
    wa: [
      { x: -90, y: 60, w: 18, h: 590 },
      { x: 880, y: 40, w: 18, h: 610 },
    ],
    en: [
      {
        x: 380,
        y: 530,
        boss: true,
        hp: BOSS_BASE_HP,
        mhp: BOSS_BASE_HP,
        renderW: 112,
        renderH: 200,
      },
    ],
    ob: [
      { x: 180, y: 500, gR: 115, gS: 0.26 },
      { x: 410, y: 470, gR: 100, gS: 0.24, type: "red" },
      { x: 650, y: 500, gR: 115, gS: 0.28 },
    ],
    spk: [],
    dr: [],
    tt: [
      {
        x: 24,
        y: 582,
        lines: ["FINAL BOSS", "Defeat the boss to win", "4 phases by health"],
      },
    ],
    bossLevel: true,
    requiresClear: true,
  };
}

function rebuildCampaign() {
  const total = LVLS.length;
  const generated = [];
  for (let i = 0; i < total - 1; i++) generated.push(buildSpeedLevel(i, total - 1));
  generated.push(buildBossLevel());
  LVLS.splice(0, LVLS.length, ...generated);
}

rebuildCampaign();

function calcLevelBounds() {
  const items = [
    ...plats,
    ...walls,
    ...doors,
    ...spikes,
    ...orbs.map((o) => ({ x: o.x - o.gR, y: o.y - o.gR, w: o.gR * 2, h: o.gR * 2 })),
    ...EN,
  ];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const item of items) {
    minX = Math.min(minX, item.x);
    minY = Math.min(minY, item.y);
    maxX = Math.max(maxX, item.x + item.w);
    maxY = Math.max(maxY, item.y + item.h);
  }
  return {
    minX: Number.isFinite(minX) ? minX : 0,
    minY: Number.isFinite(minY) ? minY : 0,
    maxX: Number.isFinite(maxX) ? maxX : cv.width,
    maxY: Number.isFinite(maxY) ? maxY : cv.height,
  };
}

function loadLvl(i) {
  const L = LVLS[i];
  plats = L.pl.map((p) => ({
    ...p,
    active: p.type === "crumb" ? true : p.active ?? true,
    crumbleT: 0,
    recoverT: 0,
  }));
  walls = L.wa.map((w) => ({ ...w }));
  spikes = (L.spk || []).map((s) => ({ ...s }));
  bossHealthReductionApplied = 0;
  EN = L.en.map((e) => {
    const foe = mkE(e.x, e.y, e);
    if (L.bossLevel && foe.boss) {
      const maxReduction = Math.floor(foe.mhp / 2);
      bossHealthReductionApplied = Math.min(maxReduction, runEnemyKills);
      foe.mhp -= bossHealthReductionApplied;
      foe.hp = foe.mhp;
    }
    return foe;
  });
  orbs = L.ob.map((o) => ({
    x: o.x,
    y: o.y,
    r: 12,
    bob: Math.random() * 6.28,
    gR: o.gR || 120,
    gS: o.gS || 0.25,
    type: o.type || "blue",
    iF: 0,
    hT: 0,
  }));
  doors = L.dr.map((d) => ({
    x: d.x,
    y: d.y,
    w: 48,
    h: 64,
    hp: 3,
    mhp: 3,
    open: false,
    oT: 0,
    hT: 0,
    locked: !!L.requiresClear,
  }));
  tutorialHints = (L.tt || []).map((hint) => ({
    ...hint,
    lines:
      L.bossLevel && hint.lines[0] === "FINAL BOSS"
        ? [
            "FINAL BOSS",
            `Earlier kills removed ${bossHealthReductionApplied} HP`,
            "4 phases tied to health.",
          ]
        : [...hint.lines],
  }));
  P = mkP(L.sp.x, L.sp.y);
  fx = [];
  cam = { x: 0, y: 0 };
  enemyWakeT = L.bossLevel ? 45 : 75;
  levelEnemyKills = 0;
  levelStartTime = runTime;
  levelBounds = calcLevelBounds();
}

function startGame() {
  lvl = 0;
  runTime = 0;
  levelStartTime = 0;
  newRecord = false;
  runEnemyKills = 0;
  levelEnemyKills = 0;
  bossHealthReductionApplied = 0;
  runSplits = Array(LVLS.length).fill(null);
  document.getElementById("newRecordMsg").style.display = "none";
  state = "playing";
  hide("title");
  hide("dead");
  hide("win");
  loadLvl(0);
}

function retry() {
  state = "playing";
  document.getElementById("newRecordMsg").style.display = "none";
  hide("dead");
  loadLvl(lvl);
}

function nextLvl() {
  if (LVLS[lvl]?.bossLevel && enemiesAlive() > 0) return;
  const levelTime = runTime - levelStartTime;
  runSplits[lvl] = levelTime;
  if (!LVLS[lvl].bossLevel) runEnemyKills += levelEnemyKills;
  const existingLevelBest = levelBestTimes[lvl];
  if (existingLevelBest == null || levelTime < existingLevelBest) {
    levelBestTimes[lvl] = levelTime;
    localStorage.setItem(LEVEL_BESTS_KEY, JSON.stringify(levelBestTimes));
  }
  lvl++;
  if (lvl >= LVLS.length) {
    state = "win";
    newRecord = bestTime == null || runTime < bestTime;
    if (bestTime == null || runTime < bestTime) {
      bestTime = runTime;
      localStorage.setItem(BEST_TIME_KEY, String(bestTime));
    }
    document.getElementById("winTime").textContent = "Time: " + formatTime(runTime);
    document.getElementById("newRecordMsg").style.display = newRecord ? "block" : "none";
    renderRunSummary();
    updateBestTimeDisplays();
    show("win");
    return;
  }
  loadLvl(lvl);
}

function die() {
  state = "dead";
  sk = 15;
  si = 8;
  spawnFx(P.x + P.w / 2, P.y + P.h / 2, "#38f", 20);
  setTimeout(() => show("dead"), 500);
}

function show(id) {
  document.getElementById(id).style.display = "flex";
}

function hide(id) {
  document.getElementById(id).style.display = "none";
}

function formatTime(ms) {
  const totalCentiseconds = Math.floor(ms / 10);
  const cs = String(totalCentiseconds % 100).padStart(2, "0");
  const totalSeconds = Math.floor(totalCentiseconds / 100);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  return `${minutes}:${seconds}.${cs}`;
}

function formatBestTime(ms) {
  return ms == null ? "--:--.--" : formatTime(ms);
}

function updateBestTimeDisplays() {
  const bestText = "Best: " + formatBestTime(bestTime);
  const levelBestText = "Level Best: " + formatBestTime(levelBestTimes[lvl]);
  document.getElementById("bestTimeCounter").textContent = bestText;
  document.getElementById("bestTimeWin").textContent = bestText;
  document.getElementById("levelBestCounter").textContent = levelBestText;
  document.getElementById("levelBestWin").textContent = levelBestText;
}

function updateFuelToggleDisplay() {
  const fuelToggle = document.getElementById("fuelToggleState");
  fuelToggle.textContent = fuelBoostOn ? "ON" : "OFF";
  fuelToggle.style.color = fuelBoostOn ? "#1454cc" : "#666";
}

function renderRunSummary() {
  const summary = document.getElementById("runSummary");
  summary.innerHTML = runSplits
    .map((time, i) => {
      const split = time == null ? "--:--.--" : formatTime(time);
      const best = formatBestTime(levelBestTimes[i]);
      return `<div class="summaryRow"><span class="summaryLevel">L${i + 1}</span><div class="summaryTimes"><span class="summaryTime">Run ${split}</span><span class="summaryBest">Best ${best}</span></div></div>`;
    })
    .join("");
}

function enemiesAlive() {
  return EN.filter((e) => e.hp > 0).length;
}

function trackLevelKills() {
  for (const e of EN) {
    if (e.hp > 0 || e.countedKill) continue;
    e.countedKill = true;
    if (!e.boss) levelEnemyKills++;
  }
}

function getBossPhase(e) {
  if (!e?.boss) return 1;
  const ratio = e.hp / Math.max(1, e.mhp);
  if (ratio > 0.75) return 1;
  if (ratio > 0.5) return 2;
  if (ratio > 0.25) return 3;
  return 4;
}

function rr(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function isSolidPlatform(p) {
  return p.type !== "crumb" || p.active;
}

function triggerCrumble(p) {
  if (p.type !== "crumb" || !p.active || p.crumbleT > 0) return;
  p.crumbleT = 18;
}

function hitSpikes(e) {
  if (!spikes || e.iF > 0) return false;
  const hurtbox = {
    x: e.x + 4,
    y: e.y + 6,
    w: e.w - 8,
    h: e.h - 8,
  };
  for (const s of spikes) {
    if (
      !rr(hurtbox, {
        x: s.x + 4,
        y: s.y - s.h + 8,
        w: s.w - 8,
        h: s.h - 6,
      })
    ) {
      continue;
    }
    spawnFx(e.x + e.w / 2, e.y + e.h / 2, "#ff6a45", 14, 4);
    e.hp = 0;
    e.iF = 20;
    return true;
  }
  return false;
}

function colResolve(e) {
  e.og = false;
  e.onWall = 0;
  if (e === P && e.phaseT > 0) {
    for (const p of plats) {
      if (!isSolidPlatform(p)) continue;
      if (
        e.vy >= 0 &&
        e.x + e.w > p.x &&
        e.x < p.x + p.w &&
        e.y <= p.y &&
        e.y + e.h >= p.y
      ) {
        e.phaseT = 0;
        e.y = p.y - e.h;
        e.vy = 0;
        e.og = true;
        triggerCrumble(p);
        return;
      }
    }
    return;
  }
  const solids = plats.concat(walls);
  for (const p of solids) {
    if (p.type === "crumb" && !p.active) continue;
    const isWall = p.h > p.w * 2;
    if (e.x + e.w > p.x && e.x < p.x + p.w) {
      if (
        e.vy >= 0 &&
        e.y + e.h > p.y &&
        e.y + e.h <= p.y + Math.max(e.vy, 0) + 6 &&
        e.y + e.h - e.vy <= p.y + 2
        ) {
        e.y = p.y - e.h;
        if (p.type === "green") {
          e.vy = getGreenBounceVy(e);
          e.og = false;
          if (e === P) {
            e.jumps = 2;
            e.cjT = 0;
            e.cwj = false;
            e.cr = false;
          }
          spawnFx(e.x + e.w / 2, p.y, "#6f6", 8, 3);
        } else {
          e.vy = 0;
          e.og = true;
          triggerCrumble(p);
        }
      }
      if (e.vy < 0 && e.y < p.y + p.h && e.y + e.h > p.y + p.h) {
        e.y = p.y + p.h;
        e.vy = 0;
      }
    }
    if (e.y + e.h > p.y + 4 && e.y < p.y + p.h - 4) {
      if (e.x + e.w > p.x && e.x + e.w < p.x + 18 && e.x < p.x) {
        e.x = p.x - e.w;
        e.vx = 0;
        if (e === P) e.fuelDecayT = Math.max(e.fuelDecayT, FUEL_DECAY_FRAMES);
        if (isWall && !e.og) e.onWall = 1;
      }
      if (
        e.x < p.x + p.w &&
        e.x > p.x + p.w - 18 &&
        e.x + e.w > p.x + p.w
      ) {
        e.x = p.x + p.w;
        e.vx = 0;
        if (e === P) e.fuelDecayT = Math.max(e.fuelDecayT, FUEL_DECAY_FRAMES);
        if (isWall && !e.og) e.onWall = -1;
      }
    }
  }
}

function spawnFx(x, y, col, n, sp) {
  sp = sp || 4;
  for (let i = 0; i < n; i++) {
    fx.push({
      x,
      y,
      vx: (Math.random() - 0.5) * sp,
      vy: (Math.random() - 0.5) * sp - 1,
      l: 25 + Math.random() * 20,
      ml: 45,
      c: col,
      sz: 2 + Math.random() * 3,
    });
  }
}

function slashFx(x, y, d) {
  for (let i = 0; i < 5; i++) {
    fx.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: d * (2 + Math.random() * 3),
      vy: (Math.random() - 0.5) * 2,
      l: 8 + Math.random() * 8,
      ml: 16,
      c: "#adf",
      sz: 1.5 + Math.random() * 2,
    });
  }
}

function doAtk(e, isP) {
  if (e.atkCD > 0 || e.stun > 0) return;
  const bossPhase = getBossPhase(e);
  const bossScale = e.boss ? 2 + (bossPhase - 1) * 0.18 : 1;
  e.atk = true;
  e.atkT = e.boss ? 20 - bossPhase : 14;
  e.atkCD = isP ? P_ATK_CD : e.boss ? [72, 56, 42, 28][bossPhase - 1] : E_ATK_CD;
  const moving = isP ? K["ArrowLeft"] || K["ArrowRight"] : Math.abs(e.vx) > 0.5;
  const cr = e.cr;
  const airDown = isP && !e.og && K["ArrowDown"];
  let w, h, hx, hy, dmg;

  if (airDown) {
    e.atkTy = "pogo";
    w = Math.round(34 * bossScale);
    h = Math.round(38 * bossScale);
    hx = e.x + e.w / 2 + e.face * 14 - (e.face === 1 ? 0 : w);
    hy = e.y + e.h / 2 + 6;
    dmg = e.boss ? 3 + Math.floor(bossPhase / 2) : 2;
    e.vy = Math.max(e.vy, 6);
  } else if (cr && moving) {
    e.atkTy = "lowsweep";
    w = Math.round(40 * bossScale);
    h = Math.round(14 * bossScale);
    hx = e.x + (e.face === 1 ? e.w : -w);
    hy = e.y + e.h - 14;
    dmg = e.boss ? 2 + Math.floor(bossPhase / 2) : 1;
  } else if (cr) {
    e.atkTy = "thrust";
    w = Math.round(42 * bossScale);
    h = Math.round(10 * bossScale);
    hx = e.x + (e.face === 1 ? e.w : -w);
    hy = e.y + e.h / 2 + 8;
    dmg = e.boss ? 3 + Math.floor(bossPhase / 2) : 2;
  } else {
    e.atkTy = e.boss && bossPhase >= 3 && Math.abs(e.vx) > 3 ? "thrust" : "sweep";
    w = Math.round(40 * bossScale);
    h = Math.round(26 * bossScale);
    hx = e.x + (e.face === 1 ? e.w : -w);
    hy = e.y + e.h / 2 - h / 2;
    dmg = e.boss ? 2 + Math.floor((bossPhase + 1) / 2) : 1;
  }

  e.atkH = { x: hx, y: hy, w, h, dmg, ty: e.atkTy };
  slashFx(e.x + e.w / 2 + e.face * 28, e.y + e.h / 2, e.face);
}

function hitCheck(a, t, isPA) {
  if (!a.atkH || a.atkT < 7) return;
  if (!rr(a.atkH, { x: t.x, y: t.y, w: t.w, h: t.h })) return;
  if (t.iF > 0) return;
  if (!isPA && t === P && t.phaseT > 0) return;

  if (t.blk) {
    if (t.pW > 0) {
      a.stun = 45;
      a.atk = false;
      a.atkH = null;
      sk = 6;
      si = 5;
      spawnFx(t.x + t.w / 2, t.y + t.h / 2, "#fff", 12, 6);
      spawnFx(a.x + a.w / 2, a.y + a.h / 2, "#ff0", 8, 3);
      return;
    }
    t.hp -= Math.max(1, a.atkH.dmg >> 1);
    t.iF = 15;
    spawnFx(t.x + t.w / 2, t.y + t.h / 2, "#888", 5, 3);
    t.vx = a.face * 3;
    return;
  }

  t.hp -= a.atkH.dmg;
  t.iF = 20;
  t.vx = a.face * 5;
  t.vy = -2;

  if (!isPA && !t.og && t.jumps < 1) t.jumps = 1;

  if (a.atkH.ty === "lowsweep") {
    t.stun = 40;
    t.trip = true;
    t.tripT = 40;
  }

  sk = 4;
  si = 3;
  spawnFx(t.x + t.w / 2, t.y + t.h / 2, isPA ? "#f44" : "#f66", 8, 4);

  if (!a.og && isPA) {
    if (a.atkH.ty === "pogo") {
      a.jumps = Math.max(a.jumps, 1);
      a.vy = JUMP * 1.5;
      a.vx *= 0.6;
      spawnFx(a.x + a.w / 2, a.y + a.h, "#8df", 8, 3);
    } else {
      a.vy = -6;
      a.vx = -a.face * 3;
    }
  }
}

function hitDoor(d) {
  if (d.open || d.locked || !P.atkH) return;
  if (!rr(P.atkH, { x: d.x, y: d.y, w: d.w, h: d.h })) return;
  d.hp--;
  d.hT = 10;
  sk = 3;
  si = 2;
  spawnFx(d.x + d.w / 2, d.y + d.h / 2, "#a84", 6, 3);
  if (d.hp <= 0) {
    d.open = true;
    d.oT = 60;
    spawnFx(d.x + d.w / 2, d.y + d.h / 2, "#fc4", 15, 5);
  }
}

function hitOrb(o) {
  if (!P.atkH || o.iF > 0) return;
  const oy = o.y + Math.sin(Date.now() / 400 + o.bob) * 6;
  const hitbox = {
    x: o.x - o.r,
    y: oy - o.r,
    w: o.r * 2,
    h: o.r * 2,
  };
  if (!rr(P.atkH, hitbox)) return;

  o.iF = 12;
  o.hT = 10;
  sk = 3;
  si = 2;
  spawnFx(o.x, oy, o.type === "red" ? "#f88" : "#7cf", 10, 4);

  if (o.type !== "red" && !P.og && P.atkH.ty === "pogo") {
    P.jumps = Math.max(P.jumps, 1);
    P.vy = JUMP * 1.5;
    P.vx *= 0.6;
    spawnFx(P.x + P.w / 2, P.y + P.h, "#8df", 8, 3);
  }
}

function tryGrab() {
  if (!P || !P.og || P.grabTarget || P.stun > 0) return false;
  const box = {
    x: P.x + (P.face === 1 ? P.w : -34),
    y: P.y + 4,
    w: 34,
    h: P.h - 8,
  };
  for (const e of EN) {
    if (
      e.hp > 0 &&
      !e.grabbedBy &&
      !e.grabTarget &&
      !e.thrown &&
      rr(box, { x: e.x, y: e.y, w: e.w, h: e.h })
    ) {
      P.grabTarget = e;
      e.grabbedBy = P;
      e.thrown = false;
      e.throwT = 0;
      P.vx = 0;
      P.vy = 0;
      e.vx = 0;
      e.vy = 0;
      P.atk = false;
      P.atkH = null;
      spawnFx(e.x + e.w / 2, e.y + e.h / 2, "#fff", 10, 3);
      return true;
    }
  }
  return false;
}

function updateGrabbedEntity(holder, target) {
  const holdX = holder.x + (holder.face === 1 ? holder.w + 6 : -target.w - 6);
  const holdY = holder.y + holder.h - target.h;
  target.x = holdX;
  target.y = holdY;
  target.vx = 0;
  target.vy = 0;
  target.face = -holder.face;
}

function releaseThrow(holder, dir) {
  const target = holder.grabTarget;
  if (!target) return;
  holder.grabTarget = null;
  target.grabbedBy = null;
  target.thrown = true;
  target.throwT = 30;
  target.throwDmg = 1;
  if (dir === "down") {
    target.vx = holder.face * 2;
    target.vy = 10;
  } else if (dir === "up") {
    target.vx = holder.face * 1.5;
    target.vy = -10;
  } else if (dir === "back") {
    target.vx = -holder.face * 8;
    target.vy = -2;
  } else {
    target.vx = holder.face * 8;
    target.vy = -2;
  }
  holder.vx = 0;
  spawnFx(target.x + target.w / 2, target.y + target.h / 2, "#fcb", 12, 4);
}

function resolveThrownImpact(e) {
  if (!e.thrown) return;
  if (e.throwT > 0) e.throwT--;
  const hitSolid = e.og || e.onWall !== 0;
  if (!hitSolid) return;

  e.thrown = false;
  if (e.onWall !== 0) e.vx = -e.onWall * Math.max(4, Math.abs(e.vx) * 0.6);
  else e.vx *= 0.5;
  e.vy = -5;
  e.hp -= e.throwDmg;
  e.iF = 12;
  e.stun = 18;
  spawnFx(e.x + e.w / 2, e.y + e.h / 2, "#f84", 12, 4);
  sk = 4;
  si = 3;
}

function getGreenBounceVy(e) {
  const airRatio = clampNum((e.airT || 0) / 45, 0, 1);
  return JUMP - airRatio * 4.5;
}

function tryPhaseDrop() {
  const fromCrouchJump = P.cjT > 0 && !P.og;
  const phaseEligible = (P.cr && P.og) || (P.onWall !== 0 && !P.og) || fromCrouchJump;
  if (!phaseEligible) return false;
  if (P.phaseShiftT <= 0 || P.phaseJumpT <= 0) return false;

  P.phaseT = 1;
  P.phaseShiftT = 0;
  P.phaseJumpT = 0;
  P.og = false;
  P.onWall = 0;
  P.cr = fromCrouchJump;
  P.blk = false;
  P.pW = 0;
  if (!fromCrouchJump) P.vy = Math.max(P.vy, 4);

  if (K["ArrowLeft"] && !K["ArrowRight"]) P.vx = Math.min(P.vx, -2);
  if (K["ArrowRight"] && !K["ArrowLeft"]) P.vx = Math.max(P.vx, 2);

  sk = 4;
  si = 3;
  spawnFx(P.x + P.w / 2, P.y + P.h / 2, "#ccd", 12, 4);
  return true;
}

function getPlat(e) {
  for (const p of plats) {
    if (!isSolidPlatform(p)) continue;
    if (
      e.x + e.w > p.x &&
      e.x < p.x + p.w &&
      Math.abs(e.y + e.h - p.y) < 6
    ) {
      return p;
    }
  }
  return null;
}

function getBlueOrbs() {
  return orbs.filter((o) => o.type !== "red");
}

function getOrbEdgeBias(plat) {
  let left = 0;
  let right = 0;
  for (const o of getBlueOrbs()) {
    const dy = Math.abs(o.y - plat.y);
    if (dy > o.gR) continue;
    const influence = 1 - dy / o.gR;
    const extra = 10 + influence * 24;
    if (o.x < plat.x + plat.w / 2) left = Math.max(left, extra);
    else right = Math.max(right, extra);
  }
  return { left, right };
}

function getOrbJumpBias(fromX, fromY, toX, toY) {
  let biasX = 0;
  for (const o of getBlueOrbs()) {
    const minX = Math.min(fromX, toX) - o.gR * 0.35;
    const maxX = Math.max(fromX, toX) + o.gR * 0.35;
    const minY = Math.min(fromY, toY) - o.gR * 0.35;
    const maxY = Math.max(fromY, toY) + o.gR * 0.35;
    if (o.x < minX || o.x > maxX || o.y < minY || o.y > maxY) continue;
    const midX = (fromX + toX) / 2;
    const distX = o.x - midX;
    const strength = (1 - Math.min(1, Math.abs(distX) / Math.max(o.gR, 1))) * o.gS;
    biasX += Math.sign(distX || 1) * strength;
  }
  return biasX;
}

let playerPlat = null;

function enemyJumpAI(e) {
  if (e.boss) return;
  if (!e.og || e.jumpCD > 0 || !P || e.stun > 0) return;
  if (!e.see || !playerPlat) return;

  const myPlat = getPlat(e);
  if (!myPlat || myPlat === playerPlat) return;

  const target = playerPlat;
  const tx = target.x + target.w / 2;
  const tdx = tx - (e.x + e.w / 2);
  const jv = JUMP * 0.85;
  const tdy = target.y - (e.y + e.h);
  const peakTime = Math.abs(jv) / GRAV;
  const totalTime = peakTime * 2 + (tdy > 0 ? Math.sqrt((2 * tdy) / GRAV) : 0);
  const airTime = Math.max(totalTime, 20);
  const orbBiasX = getOrbJumpBias(e.x + e.w / 2, e.y + e.h / 2, tx, target.y);
  const neededVx = tdx / airTime + orbBiasX * 6;

  e.vy = jv;
  e.vx = Math.max(-4, Math.min(4, neededVx));
  e.jumpCD = 60 + Math.floor(Math.random() * 40);
  e.og = false;
  e.jumpTarget = target;
}

function updP() {
  if (!P || state !== "playing") return;

  if (JP["KeyC"]) {
    fuelBoostOn = !fuelBoostOn;
    JP["KeyC"] = false;
  }

  if (JP["KeyR"]) {
    retry();
    JP["KeyR"] = false;
    return;
  }

  if (P.stun > 0) {
    P.stun--;
    P.vy += GRAV;
    P.y += P.vy;
    P.x += P.vx;
    P.vx *= 0.9;
    colResolve(P);
    return;
  }

  if (P.grabTarget) {
    P.vx = 0;
    P.vy = 0;
    P.atk = false;
    P.atkH = null;
    updateGrabbedEntity(P, P.grabTarget);
    if (JP["ArrowDown"]) releaseThrow(P, "down");
    else if (JP["ArrowUp"]) releaseThrow(P, "up");
    else if ((JP["ArrowLeft"] && P.face === 1) || (JP["ArrowRight"] && P.face === -1))
      releaseThrow(P, "back");
    else if ((JP["ArrowLeft"] && P.face === -1) || (JP["ArrowRight"] && P.face === 1))
      releaseThrow(P, "forward");
    return;
  }

  if (P.grabbedBy) {
    updateGrabbedEntity(P.grabbedBy, P);
    return;
  }

  if (P.wjCD > 0) P.wjCD--;
  if (P.fuelDecayT > 0) P.fuelDecayT--;
  if (P.phaseShiftT > 0) P.phaseShiftT--;
  if (P.phaseJumpT > 0) P.phaseJumpT--;

  const crouchPressed = K["ArrowDown"];
  const holdPhase = K["KeyX"];
  const shiftPressed = JP["ShiftLeft"] || JP["ShiftRight"];
  const instantPressed = K["KeyZ"];
  const instantToggleCrouch = instantPressed && JP["ArrowDown"];
  const instantPhase = instantPressed && (JP["ShiftLeft"] || JP["ShiftRight"]);
  const instantGrabAtk = instantPressed && JP["Space"];
  const moveDir =
    K["ArrowLeft"] && !K["ArrowRight"] ? -1 : K["ArrowRight"] && !K["ArrowLeft"] ? 1 : 0;
  let inRedField = false;
  for (const o of orbs) {
    if (o.type !== "red") continue;
    const dx = o.x - (P.x + P.w / 2);
    const dy = o.y + Math.sin(Date.now() / 400 + o.bob) * 6 - (P.y + P.h / 2);
    if (Math.sqrt(dx * dx + dy * dy) < o.gR) {
      inRedField = true;
      break;
    }
  }
  if (inRedField) {
    if (!P.og) P.redSpeed = true;
  } else if (P.og) {
    P.redSpeed = false;
  }
  if ((JP["ArrowLeft"] && P.vx > 0.25) || (JP["ArrowRight"] && P.vx < -0.25)) {
    P.fuelDecayT = Math.max(P.fuelDecayT, FUEL_DECAY_FRAMES);
  }
  if (moveDir !== 0 && P.fuelDecayT <= 0) {
    P.fuel = Math.min(FUEL_MAX, P.fuel + FUEL_GAIN);
  } else if (P.fuelDecayT > 0) {
    P.fuel = Math.max(0, P.fuel - FUEL_DRAIN);
  } else {
    P.fuel = Math.max(0, P.fuel - FUEL_IDLE_DRAIN);
  }
  const fuelRatio = fuelBoostOn ? P.fuel / FUEL_MAX : 0;
  const speedMul = inRedField || P.redSpeed ? 2 : 1;
  const baseMoveSpd = MOVE_SPD + fuelRatio * SPEED_BONUS;
  const baseAirCtrl = AIR_CTRL + fuelRatio * AIR_CTRL_BONUS;
  const moveSpd = baseMoveSpd * speedMul;
  const airCtrl = baseAirCtrl * speedMul;
  if (shiftPressed || holdPhase) P.phaseShiftT = PHASE_WINDOW;
  if (JP["ArrowUp"] || holdPhase) P.phaseJumpT = PHASE_WINDOW;

  if (K["ArrowLeft"]) {
    P.og ? (P.vx = -moveSpd) : (P.vx = Math.max(P.vx - airCtrl, -moveSpd));
    P.face = -1;
  } else if (K["ArrowRight"]) {
    P.og ? (P.vx = moveSpd) : (P.vx = Math.min(P.vx + airCtrl, moveSpd));
    P.face = 1;
  } else {
    P.og ? (P.vx *= 0.7) : (P.vx *= 0.95);
  }

  if (P.og) {
    if (instantToggleCrouch) {
      P.crouchLock = true;
      P.crouchHoldT = CROUCH_TOGGLE_HOLD;
    }
    if (P.crouchLock && JP["ArrowDown"] && !instantToggleCrouch) {
      P.crouchLock = false;
      P.crouchHoldT = 0;
    } else if (crouchPressed && !P.crouchLock) {
      P.crouchHoldT++;
      if (P.crouchHoldT >= CROUCH_TOGGLE_HOLD) {
        P.crouchLock = true;
      }
    } else if (!crouchPressed && !P.crouchLock) {
      P.crouchHoldT = 0;
    }
  } else if (!P.cjT) {
    P.crouchHoldT = 0;
  }

  P.cr = (crouchPressed || P.crouchLock) && P.og;
  if (P.og) P.fixedJump = false;
  if (P.cr) P.vx *= 0.5;
  const crouchJump = P.cr && JP["ArrowUp"];
  const fullJumpVy = crouchJump || P.cjT > 0 || P.cwj ? CROUCH_JUMP_MAX : JUMP;

  if (instantPhase) {
    P.phaseShiftT = 1;
    P.phaseJumpT = 1;
  }

  const phaseTriggered = tryPhaseDrop();
  if (phaseTriggered) JP["ArrowUp"] = false;

  if (JP["ArrowUp"]) {
    if (P.cwj && P.onWall !== 0 && !P.og && P.wjCD <= 0) {
      P.vy = CROUCH_JUMP;
      P.vx = -P.onWall * WALL_JUMP_VX;
      P.face = -P.onWall;
      P.jumps = 1;
      P.wjCD = 10;
      P.cjT = 1;
      P.cwj = false;
      P.fixedJump = false;
      P.onWall = 0;
      spawnFx(P.x + P.w / 2, P.y + P.h / 2, "#aaf", 8, 3);
    } else if (P.onWall !== 0 && !P.og && P.wjCD <= 0) {
      P.vy = WALL_JUMP_VY;
      P.vx = -P.onWall * WALL_JUMP_VX;
      P.face = -P.onWall;
      P.jumps = 1;
      P.wjCD = 10;
      P.cjT = 0;
      P.cwj = false;
      P.fixedJump = false;
      P.onWall = 0;
      spawnFx(P.x + (P.onWall === 1 ? P.w : 0), P.y + P.h / 2, "#aaf", 6, 3);
    } else if (P.cjT > 0 && P.jumps > 0) {
      P.vy = CROUCH_JUMP;
      P.jumps--;
      P.og = false;
      P.cjT = 1;
      P.cwj = false;
      P.fixedJump = false;
      spawnFx(P.x + P.w / 2, P.y + P.h, "#aaf", 6, 2.5);
    } else if (P.jumps > 0) {
      P.vy = crouchJump ? CROUCH_JUMP : JUMP;
      P.jumps--;
      P.og = false;
      P.cjT = crouchJump ? 1 : 0;
      P.cwj = false;
      P.fixedJump = false;
      spawnFx(P.x + P.w / 2, P.y + P.h, "#aaf", 5, 2);
    }
  }

  const jumpHoldMax = P.cjT > 0 || P.cwj ? CROUCH_JUMP_MAX : JUMP_MAX;
  if (K["ArrowUp"] && P.vy < -2 && !P.fixedJump) {
    P.vy -= JUMP_HOLD;
    if (P.vy < jumpHoldMax) P.vy = jumpHoldMax;
  }

  if (K["ArrowDown"] && !P.og && !P.cwj) P.vy += FAST_FALL;

  if (P.cwj && P.onWall !== 0 && !P.og) {
    P.vy = 0;
    P.vx = 0;
    P.wallSlideT = 0;
  } else if (P.onWall !== 0 && !P.og && P.vy > 0) {
    P.vy = Math.min(P.vy, WALL_SLIDE);
    P.wallSlideT++;
    if (P.wallSlideT % 8 === 0) {
      spawnFx(P.x + (P.onWall === 1 ? P.w : 0), P.y + P.h / 2, "#666", 2, 1);
    }
  } else {
    P.wallSlideT = 0;
  }

  if (!P.cwj) P.vy += GRAV;
  if (P.vy > MAX_FALL) P.vy = MAX_FALL;

  if (P.phaseT <= 0 && !P.cr && P.cjT <= 0) {
    for (const o of orbs) {
      if (o.type === "red") continue;
      const dx = o.x - (P.x + P.w / 2);
      const dy = o.y + Math.sin(Date.now() / 400 + o.bob) * 6 - (P.y + P.h / 2);
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < o.gR && d > 10) {
        const f = o.gS * 4 * (1 - d / o.gR);
        P.vx += (dx / d) * f;
        P.vy += (dy / d) * f;
      }
    }
  }

  P.x += P.vx;
  P.y += P.vy;
  colResolve(P);
  resolveThrownImpact(P);
  hitSpikes(P);

  if (!P.og && P.cjT > 0 && P.onWall !== 0) {
    P.cwj = true;
    P.vy = 0;
    P.vx = 0;
  } else if (P.onWall === 0 || P.og) {
    P.cwj = false;
  }

  if (P.og) {
    P.airT = 0;
    P.jumps = 2;
    P.trip = false;
    P.tripT = 0;
    P.cjT = 0;
    P.cwj = false;
    P.redSpeed = false;
    P.fuelDecayT = 0;
    if (!crouchPressed && !P.crouchLock) P.crouchHoldT = 0;
    playerPlat = getPlat(P);
  } else {
    P.airT++;
  }

  if (!P.og && (P.cjT > 0 || P.cwj)) P.cr = true;

  if (instantGrabAtk) {
    if (!P.og) {
      const prevDown = K["ArrowDown"];
      K["ArrowDown"] = true;
      doAtk(P, true);
      K["ArrowDown"] = prevDown;
    } else {
      tryGrab() || doAtk(P, true);
    }
  } else if (JP["Space"]) {
    doAtk(P, true);
  }

  P.blk = K["ShiftLeft"] || K["ShiftRight"];
  if (P.blk && !P._wb) P.pW = 18;
  P._wb = P.blk;
  if (P.pW > 0) P.pW--;

  if (P.atkT > 0) {
    P.atkT--;
    if (P.atkT <= 0) {
      P.atk = false;
      P.atkH = null;
    }
  }

  if (P.atkCD > 0) P.atkCD--;
  if (P.iF > 0) P.iF--;

  if (P.atk && P.atkH) {
    for (const e of EN) {
      if (e.hp > 0) hitCheck(P, e, true);
    }
    for (const d of doors) hitDoor(d);
    for (const o of orbs) hitOrb(o);
  }

  if (Math.abs(P.vx) > 0.5 && P.og) P.wc += 0.15;
  if (P.y > 900) P.hp = 0;
  if (P.hp <= 0) {
    die();
    return;
  }

  for (const d of doors) {
    if (
      d.open &&
      d.oT <= 0 &&
      Math.abs(P.x + P.w / 2 - d.x - d.w / 2) < 28 &&
      Math.abs(P.y + P.h / 2 - d.y - d.h / 2) < 38
    ) {
      nextLvl();
      return;
    }
  }
}

function updEN() {
  const enemiesAwake = enemyWakeT <= 0;
  for (const e of EN) {
    if (e.hp <= 0) continue;

    if (e.grabbedBy) {
      updateGrabbedEntity(e.grabbedBy, e);
      continue;
    }

    if (e.stun > 0) {
      e.stun--;
      e.vy += GRAV;
      e.y += e.vy;
      e.x += e.vx;
      e.vx *= 0.85;
      colResolve(e);
      if (e.tripT > 0) e.tripT--;
      continue;
    }

    if (e.jumpCD > 0) e.jumpCD--;

    if (P && enemiesAwake) {
      const dx = P.x - e.x;
      const dy = P.y - e.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      e.see = e.boss ? true : d < 280;

      if (e.boss) {
        const phase = getBossPhase(e);
        if (phase !== e.bossPhase) {
          e.bossPhase = phase;
          e.atkCD = Math.min(e.atkCD, 12);
          e.jumpCD = 0;
          sk = 8;
          si = 5;
          spawnFx(e.x + e.w / 2, e.y + e.h / 2, "#ff5555", 18, 5);
        }
        if (e.bossSpecialCD > 0) e.bossSpecialCD--;
        if (e.bossDashT > 0) {
          e.bossDashT--;
          e.vx = e.face * (4.4 + phase * 0.5);
        }
        e.face = dx > 0 ? 1 : -1;
        if (e.og) {
          const chaseSpeed = [2.6, 3.2, 3.9, 4.6][phase - 1];
          const attackRange = [140, 165, 195, 225][phase - 1];
          if (Math.abs(dx) > 70) {
            e.vx += e.face * 0.22;
            e.vx = Math.max(-chaseSpeed, Math.min(chaseSpeed, e.vx));
          } else {
            e.vx *= 0.84;
          }
          if (Math.abs(dx) < attackRange && Math.abs(dy) < 140 && e.atkCD <= 0) {
            doAtk(e, false);
          } else if (
            phase >= 2 &&
            e.jumpCD <= 0 &&
            (Math.abs(dx) > 240 || P.y + P.h < e.y - 20 || phase === 4)
          ) {
            e.vy = WALL_JUMP_VY * (phase >= 4 ? 1.08 : 0.95);
            e.vx = e.face * (4.7 + phase * 0.35);
            e.og = false;
            e.jumpCD = 34;
          } else if (phase >= 3 && e.bossSpecialCD <= 0 && Math.abs(dx) > 140) {
            e.bossDashT = 12 + phase * 2;
            e.bossSpecialCD = 80 - phase * 10;
          }
        } else if (Math.abs(dx) > 40) {
          e.vx += e.face * (phase >= 3 ? 0.32 : 0.24);
          e.vx = Math.max(-(5 + phase * 0.45), Math.min(5 + phase * 0.45, e.vx));
        }
        if (phase === 4 && e.jumpCD <= 0 && e.og && Math.abs(dx) > 90) {
          e.vy = JUMP * 1.12;
          e.vx = e.face * 5.4;
          e.og = false;
          e.jumpCD = 24;
        }
      } else if (e.og) {
        if (e.jumpTarget) {
          const landed = getPlat(e);
          if (!landed) {
            let closest = null;
            let closestDist = Infinity;
            for (const p of plats) {
              const cx = p.x + p.w / 2;
              const cy = p.y;
              const ddx = cx - (e.x + e.w / 2);
              const ddy = cy - (e.y + e.h);
              const dd = Math.sqrt(ddx * ddx + ddy * ddy);
              if (dd < closestDist) {
                closestDist = dd;
                closest = p;
              }
            }
            if (closest) {
              e.x = closest.x + closest.w / 2 - e.w / 2;
              e.y = closest.y - e.h;
              e.vy = 0;
              e.vx = 0;
              e.og = true;
            }
          }
          e.jumpTarget = null;
        }

        const curPlat = getPlat(e);
        if (curPlat) {
          const orbEdgeBias = getOrbEdgeBias(curPlat);
          const leftEdge = curPlat.x + 6 + orbEdgeBias.left;
          const rightEdge = curPlat.x + curPlat.w - e.w - 6 - orbEdgeBias.right;

          if (e.see) {
            e.face = dx > 0 ? 1 : -1;
            if (d < 55 && e.atkCD <= 0 && Math.abs(dy) < 50) {
              doAtk(e, false);
            } else if (d > 40) {
              e.vx += e.face * 0.15;
              e.vx = Math.max(-2, Math.min(2, e.vx));
            }
          } else {
            e.pD += Math.abs(e.vx);
            if (e.pD > e.pM) {
              e.pDir *= -1;
              e.pD = 0;
            }
            e.vx += e.pDir * 0.08;
            e.vx = Math.max(-1.2, Math.min(1.2, e.vx));
            e.face = e.pDir;
          }

          if (e.x < leftEdge) {
            e.x = leftEdge;
            e.vx = Math.max(0, e.vx);
            e.pDir = 1;
          }
          if (e.x > rightEdge) {
            e.x = rightEdge;
            e.vx = Math.min(0, e.vx);
            e.pDir = -1;
          }
        }
      } else {
        if (e.jumpTarget) {
          const tx = e.jumpTarget.x + e.jumpTarget.w / 2;
          const steer = tx - (e.x + e.w / 2);
          e.vx += steer > 0 ? 0.25 : -0.25;
          e.vx = Math.max(-4, Math.min(4, e.vx));
        }
        e.face = e.vx > 0 ? 1 : -1;
      }

      enemyJumpAI(e);
    }

    e.vy += GRAV;
    if (e.vy > MAX_FALL) e.vy = MAX_FALL;
    e.og ? (e.vx *= 0.85) : (e.vx *= 0.95);
    e.x += e.vx;
    e.y += e.vy;
    colResolve(e);
    resolveThrownImpact(e);
    hitSpikes(e);
    if (e.og) e.airT = 0;
    else e.airT++;

    if (e.atkT > 0) {
      e.atkT--;
      if (e.atkT <= 0) {
        e.atk = false;
        e.atkH = null;
      }
    }

    if (e.atkCD > 0) e.atkCD--;
    if (e.iF > 0) e.iF--;
    if (enemiesAwake && e.atk && e.atkH && P && P.iF <= 0) hitCheck(e, P, false);
    if (Math.abs(e.vx) > 0.3 && e.og) e.wc += 0.12;
    if (e.y > 900) e.hp = 0;
  }
}

function update() {
  if (JP["KeyP"] && (state === "playing" || state === "paused")) {
    state = state === "playing" ? "paused" : "playing";
    JP["KeyP"] = false;
  }

  if (state !== "playing") {
    document.getElementById("timeCounter").textContent = "Time: " + formatTime(runTime);
    updateBestTimeDisplays();
    updateFuelToggleDisplay();
    JP = {};
    return;
  }

  runTime += TK;
  if (enemyWakeT > 0) enemyWakeT--;

  updP();
  updEN();
  trackLevelKills();

  const alive = enemiesAlive();
  for (const d of doors) {
    if (!LVLS[lvl].requiresClear || alive <= 0) d.locked = false;
    if (d.hT > 0) d.hT--;
    if (d.open && d.oT > 0) d.oT--;
  }

  for (const p of plats) {
    if (p.type !== "crumb") continue;
    if (p.active && p.crumbleT > 0) {
      p.crumbleT--;
      if (p.crumbleT <= 0) {
        p.active = false;
        p.recoverT = 140;
        spawnFx(p.x + p.w / 2, p.y + 8, "#f4cf87", 10, 3);
      }
    } else if (!p.active && p.recoverT > 0) {
      p.recoverT--;
      if (p.recoverT <= 0) {
        p.active = true;
        spawnFx(p.x + p.w / 2, p.y + 8, "#f7e6b5", 8, 2.5);
      }
    }
  }

  if (LVLS[lvl].bossLevel && alive <= 0) {
    nextLvl();
    return;
  }

  for (const o of orbs) {
    if (o.iF > 0) o.iF--;
    if (o.hT > 0) o.hT--;
  }

  for (let i = fx.length - 1; i >= 0; i--) {
    const p = fx[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.l--;
    if (p.l <= 0) fx.splice(i, 1);
  }

  if (sk > 0) sk--;

  if (P) {
    const targetCamX = P.x - cv.width / 2 + P.w / 2;
    const targetCamY = P.y - cv.height * 0.58 + P.h / 2;
    cam.x += (targetCamX - cam.x) * 0.08;
    cam.y += (targetCamY - cam.y) * 0.1;
    if (levelBounds) {
      cam.x = clampNum(
        cam.x,
        levelBounds.minX - 120,
        Math.max(levelBounds.minX - 120, levelBounds.maxX - cv.width + 120),
      );
      cam.y = clampNum(
        cam.y,
        levelBounds.minY - 180,
        Math.max(levelBounds.minY - 180, levelBounds.maxY - cv.height + 120),
      );
    }
  }

  JP = {};

  if (P) {
    document.getElementById("hhp").textContent = "HP: " + P.hp;
    document.getElementById("timeCounter").textContent = "Time: " + formatTime(runTime);
    updateBestTimeDisplays();
    updateFuelToggleDisplay();
    document.getElementById("levelCounter").textContent =
      "Level: " + (lvl + 1) + "/" + LVLS.length;
    document.getElementById("hpFill").style.width = (P.hp / P.mhp) * 100 + "%";
    document.getElementById("spdFill").style.width = (P.fuel / FUEL_MAX) * 100 + "%";
    const al = enemiesAlive();
    const hen = document.getElementById("hen");
    if (LVLS[lvl].bossLevel) {
      const boss = EN.find((e) => e.boss && e.hp > 0);
      hen.textContent = boss
        ? `Boss HP: ${boss.hp}/${boss.mhp} | Phase ${getBossPhase(boss)}/4`
        : "BOSS DEFEATED";
      hen.style.color = boss ? "#ff8f8f" : "#f5cd65";
    } else {
      hen.textContent =
        al > 0 ? `Enemies: ${al} optional | Saved kills: ${runEnemyKills + levelEnemyKills}` : "EXIT OPEN";
      hen.style.color = al > 0 ? "#9fb4d5" : "#7fe08d";
    }
  }
}

updateBestTimeDisplays();
updateFuelToggleDisplay();
renderRunSummary();

function roundRectPath(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + radius, y);
  c.arcTo(x + w, y, x + w, y + h, radius);
  c.arcTo(x + w, y + h, x, y + h, radius);
  c.arcTo(x, y + h, x, y, radius);
  c.arcTo(x, y, x + w, y, radius);
  c.closePath();
}

function drawBackdrop() {
  const t = Date.now() * 0.00015;
  const hue = 214 + (lvl % 5) * 7;
  const sky = c.createLinearGradient(0, 0, 0, cv.height);
  sky.addColorStop(0, `hsl(${hue} 52% 17%)`);
  sky.addColorStop(0.45, `hsl(${hue - 8} 40% 10%)`);
  sky.addColorStop(1, "#02050a");
  c.fillStyle = sky;
  c.fillRect(0, 0, cv.width, cv.height);

  const moonX = cv.width * 0.75;
  const moonY = 90 + Math.sin(t * 3) * 10;
  const moon = c.createRadialGradient(moonX, moonY, 0, moonX, moonY, 180);
  moon.addColorStop(0, "rgba(173,223,255,0.26)");
  moon.addColorStop(0.35, "rgba(104,173,255,0.12)");
  moon.addColorStop(1, "rgba(10,24,52,0)");
  c.fillStyle = moon;
  c.fillRect(0, 0, cv.width, cv.height);

  c.fillStyle = "rgba(255,255,255,0.75)";
  for (let i = 0; i < 34; i++) {
    const sx =
      ((i * 191 + lvl * 83) % (cv.width + 120)) - 60 + Math.sin(t * (i + 1)) * 8;
    const sy = 20 + ((i * 53 + lvl * 17) % 180);
    const sr = i % 7 === 0 ? 2 : 1;
    c.globalAlpha = 0.25 + ((i * 17) % 10) / 30;
    c.fillRect(sx, sy, sr, sr);
  }
  c.globalAlpha = 1;

  const layers = [
    { baseY: cv.height * 0.64, step: 150, height: 120, color: "rgba(8,16,28,0.95)", sway: 0.18 },
    { baseY: cv.height * 0.72, step: 120, height: 90, color: "rgba(12,22,38,0.82)", sway: 0.28 },
    { baseY: cv.height * 0.81, step: 92, height: 52, color: "rgba(18,32,50,0.7)", sway: 0.42 },
  ];
  for (const layer of layers) {
    c.fillStyle = layer.color;
    c.beginPath();
    c.moveTo(-40, cv.height);
    for (let x = -40; x <= cv.width + 60; x += layer.step) {
      const peak =
        layer.baseY -
        layer.height -
        Math.sin(t * 6 + x * 0.01 + lvl) * layer.height * layer.sway;
      c.lineTo(x, peak + layer.height);
      c.lineTo(x + layer.step * 0.5, peak);
    }
    c.lineTo(cv.width + 60, cv.height);
    c.closePath();
    c.fill();
  }

  c.fillStyle = "rgba(120,180,255,0.06)";
  for (let i = 0; i < 3; i++) {
    const y = cv.height * (0.2 + i * 0.18) + Math.sin(t * 8 + i * 2.1) * 10;
    c.fillRect(0, y, cv.width, 12);
  }

  c.strokeStyle = "rgba(140,190,255,0.06)";
  c.lineWidth = 1;
  const gs = 48;
  const gox = (((-cam.x * 0.18) % gs) + gs) % gs;
  const goy = (((-cam.y * 0.12) % gs) + gs) % gs;
  for (let gx = gox - gs; gx < cv.width + gs; gx += gs) {
    c.beginPath();
    c.moveTo(gx, 0);
    c.lineTo(gx, cv.height);
    c.stroke();
  }
  for (let gy = goy - gs; gy < cv.height + gs; gy += gs) {
    c.beginPath();
    c.moveTo(0, gy);
    c.lineTo(cv.width, gy);
    c.stroke();
  }
}

function drawPlatform(p) {
  const x = p.x - cam.x;
  const y = p.y - cam.y;
  if (p.type === "crumb" && !p.active) {
    c.fillStyle = "rgba(242,219,170,0.12)";
    roundRectPath(x, y, p.w, p.h, 8);
    c.fill();
    c.strokeStyle = "rgba(250,230,190,0.28)";
    c.lineWidth = 1;
    c.stroke();
    return;
  }
  const top =
    p.type === "green" ? "#62f09a" : p.type === "crumb" ? "#f4d28f" : "#8fb6df";
  const mid =
    p.type === "green" ? "#1c7f4b" : p.type === "crumb" ? "#b38241" : "#24384f";
  const low =
    p.type === "green" ? "#0d3f24" : p.type === "crumb" ? "#5e3c1e" : "#111a26";
  const g = c.createLinearGradient(x, y, x, y + p.h);
  g.addColorStop(0, top);
  g.addColorStop(0.35, mid);
  g.addColorStop(1, low);
  c.fillStyle = "rgba(0,0,0,0.2)";
  roundRectPath(x + 3, y + 4, p.w, p.h, 8);
  c.fill();
  c.fillStyle = g;
  roundRectPath(x, y, p.w, p.h, 8);
  c.fill();
  c.strokeStyle =
    p.type === "green"
      ? "rgba(210,255,224,0.75)"
      : p.type === "crumb"
        ? "rgba(255,233,185,0.55)"
        : "rgba(201,225,255,0.38)";
  c.lineWidth = 1.5;
  c.stroke();
  c.fillStyle = "rgba(255,255,255,0.14)";
  roundRectPath(x + 4, y + 3, p.w - 8, 4, 4);
  c.fill();
  c.strokeStyle =
    p.type === "green"
      ? "rgba(120,255,180,0.24)"
      : p.type === "crumb"
        ? "rgba(92,54,18,0.35)"
        : "rgba(100,150,230,0.2)";
  for (let gx = x + 12; gx < x + p.w - 10; gx += 16) {
    c.beginPath();
    c.moveTo(gx, y + p.h - 4);
    c.lineTo(gx + 6, y + 6);
    c.stroke();
  }
  if (p.type === "crumb") {
    const shake = p.crumbleT > 0 ? (Math.random() - 0.5) * 2 : 0;
    c.strokeStyle = "rgba(92,54,18,0.55)";
    c.beginPath();
    c.moveTo(x + 16 + shake, y + 6);
    c.lineTo(x + p.w * 0.45, y + p.h - 5);
    c.lineTo(x + p.w * 0.7, y + 8);
    c.stroke();
    c.beginPath();
    c.moveTo(x + p.w * 0.58, y + 6);
    c.lineTo(x + p.w - 14 + shake, y + p.h - 6);
    c.stroke();
  }
}

function drawWall(w) {
  const x = w.x - cam.x;
  const y = w.y - cam.y;
  const g = c.createLinearGradient(x, y, x + w.w, y);
  g.addColorStop(0, "#162130");
  g.addColorStop(0.5, "#2d4059");
  g.addColorStop(1, "#101824");
  c.fillStyle = "rgba(0,0,0,0.24)";
  roundRectPath(x + 3, y + 4, w.w, w.h, 8);
  c.fill();
  c.fillStyle = g;
  roundRectPath(x, y, w.w, w.h, 8);
  c.fill();
  c.strokeStyle = "rgba(188,215,255,0.22)";
  c.lineWidth = 1;
  c.stroke();
  c.strokeStyle = "rgba(255,255,255,0.08)";
  for (let wy = y + 12; wy < y + w.h - 8; wy += 16) {
    c.beginPath();
    c.moveTo(x + 3, wy);
    c.lineTo(x + w.w - 3, wy);
    c.stroke();
  }
}

function drawSpikes() {
  for (const s of spikes) {
    const x = s.x - cam.x;
    const y = s.y - cam.y;
    const count = Math.max(2, Math.floor(s.w / 18));
    const spikeW = s.w / count;
    c.fillStyle = "rgba(0,0,0,0.18)";
    roundRectPath(x + 2, y - 2, s.w, 6, 3);
    c.fill();
    for (let i = 0; i < count; i++) {
      const sx = x + i * spikeW;
      const grad = c.createLinearGradient(sx, y - s.h, sx, y);
      grad.addColorStop(0, "#fff2e9");
      grad.addColorStop(0.45, "#ff9b74");
      grad.addColorStop(1, "#7a2217");
      c.fillStyle = grad;
      c.beginPath();
      c.moveTo(sx, y);
      c.lineTo(sx + spikeW * 0.5, y - s.h);
      c.lineTo(sx + spikeW, y);
      c.closePath();
      c.fill();
      c.strokeStyle = "rgba(255,220,220,0.28)";
      c.lineWidth = 1;
      c.stroke();
    }
  }
}

function drawBossNinja(e) {
  const x = e.x - cam.x;
  const y = e.y - cam.y;
  const phase = getBossPhase(e);
  const rw = e.renderW || 200;
  const rh = e.renderH || 460;

  c.save();
  c.translate(x + e.w / 2, y + e.h);
  if (e.face === -1) c.scale(-1, 1);
  if (e.stun > 0) c.rotate(Math.sin(Date.now() / 100) * 0.06);

  c.fillStyle = "rgba(0,0,0,0.24)";
  c.beginPath();
  c.ellipse(0, 8, rw * 0.34, 22, 0, 0, Math.PI * 2);
  c.fill();

  const aura = c.createRadialGradient(0, -rh * 0.45, 10, 0, -rh * 0.45, rw * 0.9);
  aura.addColorStop(0, `rgba(255,70,70,${0.12 + phase * 0.03})`);
  aura.addColorStop(1, "rgba(255,0,0,0)");
  c.fillStyle = aura;
  c.fillRect(-rw, -rh - 40, rw * 2, rh + 80);

  const bodyG = c.createLinearGradient(0, -rh * 0.95, 0, 0);
  bodyG.addColorStop(0, "#ff7676");
  bodyG.addColorStop(0.35, "#a10d18");
  bodyG.addColorStop(1, "#2a0309");
  c.fillStyle = bodyG;
  roundRectPath(-rw * 0.24, -rh * 0.78, rw * 0.48, rh * 0.58, 26);
  c.fill();

  c.fillStyle = "#4d0910";
  roundRectPath(-rw * 0.18, -rh * 0.22, rw * 0.14, rh * 0.24, 10);
  c.fill();
  roundRectPath(rw * 0.04, -rh * 0.22, rw * 0.14, rh * 0.24, 10);
  c.fill();

  c.fillStyle = "#5a0f16";
  roundRectPath(rw * 0.18, -rh * 0.68, rw * 0.1, rh * 0.4, 10);
  c.fill();
  roundRectPath(-rw * 0.28, -rh * 0.68, rw * 0.1, rh * 0.4, 10);
  c.fill();

  c.fillStyle = "#ffd8d8";
  c.beginPath();
  c.arc(0, -rh * 0.88, rw * 0.16, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#2d0208";
  roundRectPath(-rw * 0.2, -rh * 0.92, rw * 0.4, rw * 0.12, 10);
  c.fill();
  c.fillStyle = phase >= 3 ? "#ffef93" : "#ffe2e2";
  roundRectPath(rw * 0.02, -rh * 0.895, rw * 0.1, rw * 0.045, 4);
  c.fill();

  c.fillStyle = "#d92731";
  c.beginPath();
  c.moveTo(-rw * 0.22, -rh * 0.84);
  c.lineTo(-rw * 0.55, -rh * (0.72 + phase * 0.03));
  c.lineTo(-rw * 0.36, -rh * 0.64);
  c.fill();

  c.shadowColor = "rgba(255,130,130,0.35)";
  c.shadowBlur = 18;
  c.fillStyle = "#ffecec";
  roundRectPath(rw * 0.12, -rh * 0.58, rw * 0.52, rw * 0.06, 6);
  c.fill();
  c.strokeStyle = "#ffabab";
  c.lineWidth = 2;
  c.stroke();
  c.shadowBlur = 0;

  if (e.atk) {
    c.strokeStyle = "rgba(255,120,120,0.4)";
    c.lineWidth = 10 + phase * 2;
    c.beginPath();
    c.arc(rw * 0.18, -rh * 0.52, rw * 0.48, -0.65, 0.55);
    c.stroke();
  }

  c.restore();

  c.fillStyle = "rgba(7,12,20,0.84)";
  roundRectPath(x - 10, y - 26, Math.max(150, e.w + 60), 10, 5);
  c.fill();
  const hpG = c.createLinearGradient(x, 0, x + Math.max(150, e.w + 60), 0);
  hpG.addColorStop(0, "#ff5353");
  hpG.addColorStop(1, "#ffb36c");
  c.fillStyle = hpG;
  roundRectPath(x - 8, y - 24, (e.hp / e.mhp) * Math.max(146, e.w + 56), 6, 3);
  c.fill();
  c.fillStyle = "#ffe2e2";
  c.font = "12px monospace";
  c.fillText(`PHASE ${phase}/4`, x - 6, y - 34);
}

function drawN(e, col, acc2) {
  const x = e.x - cam.x;
  const y = e.y - cam.y;

  if (e.iF > 0 && Math.floor(e.iF / 3) % 2 === 0) return;
  if (e.boss) {
    drawBossNinja(e);
    return;
  }

  c.save();
  c.translate(x + e.w / 2, y + e.h / 2);
  if (e.face === -1) c.scale(-1, 1);
  const bob = e.og ? Math.sin(e.wc * 4) * 2 : 0;
  if (e.trip && e.tripT > 0) c.rotate(Math.PI / 4);
  else if (e.thrown) c.rotate(Math.sin(Date.now() / 60) * 0.35);
  else if (e.stun > 0) c.rotate(Math.sin(Date.now() / 100) * 0.1);

  const cr = e.cr;
  const ws = e.onWall !== 0 && !e.og && (e.vy > 0 || e.cwj);
  const bobY = cr ? 8 : ws ? 6 : 4;
  const bladeGlow = e === P ? "rgba(120,190,255,0.35)" : "rgba(255,120,120,0.28)";

  c.fillStyle = "rgba(0,0,0,0.2)";
  c.beginPath();
  c.ellipse(0, bobY + 18, cr ? 13 : 15, 5, 0, 0, Math.PI * 2);
  c.fill();

  const bodyG = c.createLinearGradient(0, -22, 0, 24);
  bodyG.addColorStop(0, e === P ? "#5cbcff" : "#ff7078");
  bodyG.addColorStop(0.35, col);
  bodyG.addColorStop(1, acc2);
  c.fillStyle = col;
  c.fillStyle = bodyG;
  if (cr) {
    roundRectPath(-11, 3, 22, 17, 7);
    c.fill();
  } else if (ws) {
    roundRectPath(-11, -9, 22, 28, 9);
    c.fill();
  } else {
    roundRectPath(-11, -13 + bob, 22, 30, 9);
    c.fill();
  }

  const hy = cr ? -6 : ws ? -16 : -20 + bob;
  const headG = c.createLinearGradient(0, hy - 10, 0, hy + 10);
  headG.addColorStop(0, "#f8fbff");
  headG.addColorStop(1, e === P ? "#a5caf7" : "#e4a0ab");
  c.beginPath();
  c.arc(0, hy, 9, 0, Math.PI * 2);
  c.fillStyle = headG;
  c.fill();
  c.fillStyle = e === P ? "#101826" : "#291116";
  roundRectPath(-10, hy - 3, 22, 6, 3);
  c.fill();
  c.fillStyle = e === P ? "#a9ecff" : "#ffe2e2";
  roundRectPath(1, hy - 2, 6, 3, 1.5);
  c.fill();
  c.fillStyle = "rgba(255,255,255,0.55)";
  c.fillRect(-3, hy - 7, 4, 2);

  if (!cr) {
    const lp = Math.sin(e.wc * 4);
    c.fillStyle = bodyG;
    if (ws) {
      roundRectPath(-8, 17, 6, 7, 2);
      c.fill();
      roundRectPath(2, 17, 6, 7, 2);
      c.fill();
    } else {
      roundRectPath(-8, 15 + bob, 6, 10 + lp * 2, 2);
      c.fill();
      roundRectPath(2, 15 + bob, 6, 10 - lp * 2, 2);
      c.fill();
    }
  }

  c.fillStyle = e === P ? "#0e5cbf" : "#7e1f2c";
  c.beginPath();
  c.moveTo(-8, hy + 1);
  c.lineTo(-2, hy + 8);
  c.lineTo(-10, hy + 9);
  c.fill();

  if (e.atk) {
    c.shadowColor = bladeGlow;
    c.shadowBlur = 14;
    c.fillStyle = e === P ? "#e0f1ff" : "#ffe3e3";
    c.strokeStyle = e === P ? "#8dbef5" : "#ff9ba1";
    c.lineWidth = 1.5;
    if (e.atkTy === "thrust") {
      roundRectPath(10, -5 + bob, 30, 5, 2);
      c.fill();
      c.stroke();
    } else if (e.atkTy === "pogo") {
      c.save();
      c.rotate(0.95);
      roundRectPath(6, 8, 30, 5, 2);
      c.fill();
      c.stroke();
      c.fillStyle = "#a84";
      roundRectPath(3, 7, 10, 5, 2);
      c.fill();
      c.restore();
    } else if (e.atkTy === "sweep") {
      c.save();
      c.rotate(-0.3);
      roundRectPath(8, -10 + bob, 28, 5, 2);
      c.fill();
      c.stroke();
      c.restore();
    } else {
      roundRectPath(10, 10, 26, 5, 2);
      c.fill();
      c.stroke();
    }
    c.shadowBlur = 0;
  } else if (e.blk) {
    c.fillStyle = e === P ? "#dceeff" : "#f7dfe2";
    c.strokeStyle = e === P ? "#88bfff" : "#f6a7ad";
    c.lineWidth = 1;
    c.save();
    c.rotate(-1.2);
    roundRectPath(4, -14, 5, 24, 2);
    c.fill();
    c.stroke();
    c.fillStyle = "#a84";
    roundRectPath(1, 6, 10, 5, 2);
    c.fill();
    c.restore();
    if (e.pW > 10) {
      c.globalAlpha = 0.35;
      c.fillStyle = e === P ? "#b5ecff" : "#ffd8dc";
      c.beginPath();
      c.arc(10, -4, 15, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    }
  } else {
    c.fillStyle = e === P ? "#dfeeff" : "#f4e4e6";
    roundRectPath(8, 2 + bob, 4, 18, 2);
    c.fill();
    c.fillStyle = "#863";
    roundRectPath(6, 18 + bob, 6, 6, 2);
    c.fill();
  }

  c.restore();

  if (e !== P && e.hp < e.mhp && e.hp > 0) {
    c.fillStyle = "rgba(7,12,20,0.84)";
    roundRectPath(x - 3, y - 14, e.w + 6, 7, 4);
    c.fill();
    const hpG = c.createLinearGradient(x, 0, x + e.w, 0);
    hpG.addColorStop(0, "#ff6f74");
    hpG.addColorStop(1, "#ffb36c");
    c.fillStyle = hpG;
    roundRectPath(x - 1, y - 12, (e.hp / e.mhp) * (e.w + 2), 3, 2);
    c.fill();
  }

  if (e.stun > 0) {
    const t = Date.now() / 200;
    c.fillStyle = "#fc0";
    c.font = "10px monospace";
    for (let i = 0; i < 3; i++) {
      c.fillText(
        "★",
        x + e.w / 2 + Math.cos(t + i * 2.1) * 15,
        y - 18 + Math.sin(t + i * 2.1) * 6,
      );
    }
  }
}

function draw() {
  c.clearRect(0, 0, cv.width, cv.height);
  c.save();
  c.lineCap = "round";
  c.lineJoin = "round";

  if (sk > 0) {
    c.translate((Math.random() - 0.5) * si, (Math.random() - 0.5) * si);
  }

  drawBackdrop();

  if (state === "playing" || state === "dead") {
    for (const p of plats) {
      drawPlatform(p);
    }

    for (const w of walls) {
      drawWall(w);
    }

    drawSpikes();

    for (const o of orbs) {
      const ox = o.x - cam.x;
      const oy = o.y - cam.y + Math.sin(Date.now() / 400 + o.bob) * 6;
      const pulse = Math.sin(Date.now() / 400) * 0.06 + 0.08;
      const ringStroke =
        o.type === "red" ? "rgba(255,120,120,.14)" : "rgba(100,180,255,.12)";
      const auraFill =
        o.type === "red"
          ? `rgba(255,90,90,${pulse})`
          : `rgba(80,160,255,${pulse})`;
      const swirlStroke =
        o.type === "red" ? "rgba(255,140,140,.3)" : "rgba(100,180,255,.25)";
      const coreGlow0 =
        o.type === "red" ? "rgba(255,120,120,.55)" : "rgba(100,200,255,.5)";
      const coreGlow1 =
        o.type === "red" ? "rgba(255,120,120,0)" : "rgba(100,200,255,0)";
      const coreFill =
        o.type === "red" ? (o.hT > 0 ? "#ffd0d0" : "#f55") : o.hT > 0 ? "#9ef" : "#5bf";

      c.save();
      if (o.hT > 0) {
        c.translate((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
      }
      c.strokeStyle = ringStroke;
      c.lineWidth = 1;
      c.setLineDash([3, 3]);
      c.beginPath();
      c.arc(ox, oy, o.gR, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = auraFill;
      c.beginPath();
      c.arc(ox, oy, o.gR * 0.7, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = swirlStroke;
      c.lineWidth = 1.5;
      const t = Date.now() / 1000;
      for (let i = 0; i < 3; i++) {
        const a = t * 1.5 + i * 2.09;
        const r1 = o.gR * 0.4;
        const r2 = o.r + 4;
        c.beginPath();
        c.moveTo(ox + Math.cos(a) * r1, oy + Math.sin(a) * r1);
        c.quadraticCurveTo(
          ox + (Math.cos(a + 0.5) * (r1 + r2)) / 2,
          oy + (Math.sin(a + 0.5) * (r1 + r2)) / 2,
          ox + Math.cos(a + 0.8) * r2,
          oy + Math.sin(a + 0.8) * r2,
        );
        c.stroke();
      }
      c.restore();

      const g = c.createRadialGradient(ox, oy, 0, ox, oy, o.r * 2);
      g.addColorStop(0, coreGlow0);
      g.addColorStop(1, coreGlow1);
      c.fillStyle = g;
      c.beginPath();
      c.arc(ox, oy, o.r * 2, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = coreFill;
      c.beginPath();
      c.arc(ox, oy, o.r, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgba(255,255,255,.7)";
      c.beginPath();
      c.arc(ox - 3, oy - 3, 4, 0, Math.PI * 2);
      c.fill();
    }

    for (const d of doors) {
      const dx = d.x - cam.x;
      const dy = d.y - cam.y;

      if (d.open) {
        const oa = Math.min(1, (60 - d.oT) / 30);
        c.save();
        c.translate(dx, dy);
        c.transform(1 - oa * 0.8, 0, 0, 1, 0, 0);
        c.fillStyle = "#8B6914";
        c.fillRect(0, 0, d.w / 2 - 2, d.h);
        c.strokeStyle = "#6B4914";
        c.lineWidth = 2;
        c.strokeRect(0, 0, d.w / 2 - 2, d.h);
        c.fillStyle = "#7B5914";
        c.fillRect(4, 6, d.w / 2 - 10, d.h / 2 - 10);
        c.fillRect(4, d.h / 2 + 4, d.w / 2 - 10, d.h / 2 - 10);
        c.restore();

        c.save();
        c.translate(dx + d.w, dy);
        c.transform(-(1 - oa * 0.8), 0, 0, 1, 0, 0);
        c.fillStyle = "#8B6914";
        c.fillRect(0, 0, d.w / 2 - 2, d.h);
        c.strokeStyle = "#6B4914";
        c.lineWidth = 2;
        c.strokeRect(0, 0, d.w / 2 - 2, d.h);
        c.fillStyle = "#7B5914";
        c.fillRect(4, 6, d.w / 2 - 10, d.h / 2 - 10);
        c.fillRect(4, d.h / 2 + 4, d.w / 2 - 10, d.h / 2 - 10);
        c.restore();

        if (d.oT <= 0) {
          c.fillStyle = `rgba(255,220,100,${0.3 + Math.sin(Date.now() / 300) * 0.1})`;
          c.fillRect(dx + 6, dy + 4, d.w - 12, d.h - 8);
        }
      } else {
        const sh = d.hT > 0 ? (Math.random() - 0.5) * 3 : 0;
        c.fillStyle = "#5a3a0a";
        c.fillRect(dx - 4 + sh, dy - 6, d.w + 8, d.h + 6);
        c.beginPath();
        c.arc(dx + d.w / 2 + sh, dy - 2, d.w / 2 + 4, Math.PI, 0);
        c.fill();
        c.fillStyle = "#fff";
        c.beginPath();
        c.arc(dx + d.w / 2 + sh, dy - 2, d.w / 2, Math.PI, 0);
        c.fill();
        c.fillStyle = d.locked ? "#665544" : "#8B6914";
        c.fillRect(dx + sh, dy, d.w / 2 - 1, d.h);
        c.fillRect(dx + d.w / 2 + 1 + sh, dy, d.w / 2 - 1, d.h);
        c.fillStyle = d.locked ? "#554433" : "#7B5914";
        c.fillRect(dx + 3 + sh, dy + 6, d.w / 2 - 7, d.h / 2 - 10);
        c.fillRect(dx + 3 + sh, dy + d.h / 2 + 4, d.w / 2 - 7, d.h / 2 - 10);
        c.fillRect(dx + d.w / 2 + 4 + sh, dy + 6, d.w / 2 - 7, d.h / 2 - 10);
        c.fillRect(
          dx + d.w / 2 + 4 + sh,
          dy + d.h / 2 + 4,
          d.w / 2 - 7,
          d.h / 2 - 10,
        );
        c.fillStyle = d.locked ? "#888" : "#a83";
        c.beginPath();
        c.arc(dx + d.w / 2 - 5 + sh, dy + d.h / 2, 3, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.arc(dx + d.w / 2 + 5 + sh, dy + d.h / 2, 3, 0, Math.PI * 2);
        c.fill();
        if (d.locked) {
          c.fillStyle = "#888";
          c.fillRect(dx + d.w / 2 - 6 + sh, dy + d.h - 18, 12, 12);
          c.strokeStyle = "#888";
          c.lineWidth = 2;
          c.beginPath();
          c.arc(dx + d.w / 2 + sh, dy + d.h - 22, 6, Math.PI, 0);
          c.stroke();
          c.fillStyle = "#555";
          c.beginPath();
          c.arc(dx + d.w / 2 + sh, dy + d.h - 12, 2, 0, Math.PI * 2);
          c.fill();
        }
        if (!d.locked && d.hp < d.mhp) {
          c.strokeStyle = "#3a2a00";
          c.lineWidth = 2;
          for (let i = 0; i < d.mhp - d.hp; i++) {
            c.beginPath();
            c.moveTo(dx + d.w / 2 + sh, dy + 10 + i * 18);
            c.lineTo(
              dx + d.w / 2 + (i % 2 ? -1 : 1) * 12 + sh,
              dy + 20 + i * 18,
            );
            c.lineTo(
              dx + d.w / 2 + (i % 2 ? 1 : -1) * 6 + sh,
              dy + 30 + i * 18,
            );
            c.stroke();
          }
        }
      }
    }

    for (const hint of tutorialHints) {
      const hx = hint.x - cam.x;
      const hy = hint.y - cam.y;
      const boxWidth = 170;
      const boxHeight = 18 + hint.lines.length * 14;
      const hintG = c.createLinearGradient(hx, hy - boxHeight, hx, hy);
      hintG.addColorStop(0, "rgba(9,20,37,0.88)");
      hintG.addColorStop(1, "rgba(5,10,18,0.8)");
      c.fillStyle = hintG;
      roundRectPath(hx, hy - boxHeight, boxWidth, boxHeight, 10);
      c.fill();
      c.strokeStyle = "rgba(120,190,255,0.6)";
      c.lineWidth = 1.5;
      c.stroke();
      c.fillStyle = "#eaf3ff";
      c.font = "11px monospace";
      for (let i = 0; i < hint.lines.length; i++) {
        c.fillText(hint.lines[i], hx + 10, hy - boxHeight + 18 + i * 14);
      }
    }

    for (const e of EN) {
      if (e.hp > 0) drawN(e, "#222", "#400");
    }

    if (P && state === "playing") {
      drawN(P, "#36c", "#1a2a55");
      if (P.blk) {
        c.fillStyle = P.pW > 0 ? "#ffd76b" : "#8ac";
        c.font = "10px monospace";
        c.fillText(P.pW > 0 ? "PARRY!" : "BLOCK", P.x - cam.x - 4, P.y - cam.y - 16);
      }
      if (P.onWall !== 0 && !P.og && P.vy > 0) {
        c.fillStyle = "#aaf";
        c.font = "9px monospace";
        c.fillText("WALL", P.x - cam.x - 2, P.y - cam.y - 16);
      }
    }

    for (const p of fx) {
      c.globalAlpha = p.l / p.ml;
      c.fillStyle = p.c;
      c.shadowColor = p.c;
      c.shadowBlur = 16;
      c.save();
      c.translate(p.x - cam.x, p.y - cam.y);
      c.rotate((p.ml - p.l) * 0.08);
      roundRectPath(-p.sz / 2, -p.sz / 2, p.sz, p.sz, Math.max(1, p.sz / 3));
      c.fill();
      c.restore();
    }
    c.shadowBlur = 0;
    c.globalAlpha = 1;
  }

  const vignette = c.createRadialGradient(
    cv.width / 2,
    cv.height / 2,
    Math.min(cv.width, cv.height) * 0.25,
    cv.width / 2,
    cv.height / 2,
    Math.max(cv.width, cv.height) * 0.8,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.3)");
  c.fillStyle = vignette;
  c.fillRect(0, 0, cv.width, cv.height);

  c.restore();
}

let lt = 0;
let acc2 = 0;
const TK = 1000 / 60;

function loop(t) {
  const dt = t - lt;
  lt = t;
  acc2 += Math.min(dt, 100);
  while (acc2 >= TK) {
    update();
    acc2 -= TK;
  }
  draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
