const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const modal = document.querySelector("#modal");
const startButton = document.querySelector("#startButton");
const pauseButton = document.querySelector("#pauseButton");
const reloadButton = document.querySelector("#reloadButton");
const crosshair = document.querySelector("#crosshair");
const waveValue = document.querySelector("#waveValue");
const scoreValue = document.querySelector("#scoreValue");
const healthFill = document.querySelector("#healthFill");
const weaponName = document.querySelector("#weaponName");
const weaponIcon = document.querySelector("#weaponIcon");
const ammoValue = document.querySelector("#ammoValue");
const modalKicker = document.querySelector("#modalKicker");
const modalTitle = document.querySelector("#modalTitle");
const modalText = document.querySelector("#modalText");
const finePointer = matchMedia("(pointer: fine)");
const effectsPanel = document.querySelector("#effects");
const modalStats = document.querySelector("#modalStats");
const reviveButton = document.querySelector("#reviveButton");
const settingsButton = document.querySelector("#settingsButton");
const settingsModal = document.querySelector("#settingsModal");
const settingsClose = document.querySelector("#settingsClose");
const optSfx = document.querySelector("#optSfx");
const optMusic = document.querySelector("#optMusic");
const optVibrate = document.querySelector("#optVibrate");

// ---------- الحفظ المحلي والإعدادات ----------
const SAVE_KEY = "ironFrontier.save.v1";
const save = { best: 0, bestWave: 1, games: 0, settings: { sfx: true, music: true, vibrate: true } };

(function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    save.best = Number(data.best) || 0;
    save.bestWave = Number(data.bestWave) || 1;
    save.games = Number(data.games) || 0;
    if (data.settings && typeof data.settings === "object") {
      save.settings.sfx = data.settings.sfx !== false;
      save.settings.music = data.settings.music !== false;
      save.settings.vibrate = data.settings.vibrate !== false;
    }
  } catch (error) {
    // التخزين غير متاح: اللعبة تشتغل عادي لكن من غير حفظ
  }
})();

function persistSave() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (error) {
    // تجاهل
  }
}

function vibrate(pattern) {
  if (save.settings.vibrate && navigator.vibrate) navigator.vibrate(pattern);
}

function statsLine() {
  return save.best > 0 ? `أعلى نتيجة: ${save.best} · أفضل موجة: ${save.bestWave}` : "";
}

async function recordRun(final = false) {
  try {
    await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName: "لاعب Iron Frontier",
        score: state.score,
        wave: state.wave,
        zone: state.zone,
        final
      })
    });
  } catch (error) {
    // حفظ الداشبورد الاختياري لا يوقف اللعب
  }
}

let bgCache = null; // الخلفية بترسم مرة واحدة بدل كل إطار (توفير بطارية)

const WEAPONS = [
  { id: "knife", name: "سكين رماء", icon: "🗡", ammo: Infinity, damage: 55, speed: 560, cooldown: 280, unlocked: 1 },
  { id: "bow", name: "قوس وسهم", icon: "➶", ammo: Infinity, damage: 42, speed: 760, cooldown: 520, unlocked: 3 },
  { id: "fire", name: "سهام نارية", icon: "♨", ammo: 18, damage: 34, speed: 840, cooldown: 390, reload: 1500, unlocked: 5 },
  { id: "pistol", name: "مسدس بدائي", icon: "⌖", ammo: 6, damage: 62, speed: 1180, cooldown: 420, reload: 1100, unlocked: 7 },
  { id: "rifle", name: "بندقية بارود", icon: "▰", ammo: 5, damage: 105, speed: 1550, cooldown: 650, reload: 1800, unlocked: 9 },
  { id: "sniper", name: "بندقية قناصة", icon: "⌁", ammo: 4, damage: 9999, speed: 2600, cooldown: 1250, reload: 3200, piercing: true, lethal: true, unlocked: 11 },
  { id: "rocket", name: "قاذف صاروخي", icon: "🚀", ammo: 4, damage: 95, speed: 820, cooldown: 900, reload: 2300, explosive: true, radius: 150, unlocked: 13 },
  { id: "laser", name: "مدفع ليزر", icon: "〽", ammo: 40, damage: 32, speed: 2200, cooldown: 90, reload: 2200, piercing: true, unlocked: 15 }
];

const FOREST_WEAPONS = [
  { id: "thorn", name: "سكين شوك", icon: "♢", ammo: Infinity, damage: 62, speed: 620, cooldown: 260, unlocked: 1 },
  { id: "forest_bow", name: "قوس خشبي", icon: "⌁", ammo: Infinity, damage: 48, speed: 820, cooldown: 480, unlocked: 3 },
  { id: "toxic", name: "سهام سامة", icon: "☣", ammo: 20, damage: 38, speed: 880, cooldown: 360, reload: 1400, unlocked: 5 },
  { id: "blowgun", name: "بوق نفخ", icon: "◁", ammo: 8, damage: 70, speed: 1250, cooldown: 380, reload: 1000, unlocked: 7 },
  { id: "hunter", name: "بندقية صياد", icon: "▥", ammo: 6, damage: 118, speed: 1600, cooldown: 620, reload: 1700, unlocked: 9 },
  { id: "harpoon", name: "رمح قناصة", icon: "⌖", ammo: 4, damage: 9999, speed: 2800, cooldown: 1250, reload: 3000, piercing: true, lethal: true, unlocked: 11 },
  { id: "spore", name: "قاذف جراثيم", icon: "✺", ammo: 5, damage: 105, speed: 860, cooldown: 850, reload: 2100, explosive: true, radius: 170, unlocked: 13 },
  { id: "vine", name: "ليزر كروم", icon: "❧", ammo: 40, damage: 36, speed: 2400, cooldown: 85, reload: 2100, piercing: true, unlocked: 15 }
];

// أنواع المكافآت: الأيقونة واللون والنص اللي بيظهر عند الالتقاط
const DROP_STYLES = {
  health: { icon: "+", color: "#78d18c", label: "صحة", banner: "مكافأة صحة +24" },
  ammo: { icon: "A", color: "#69b8db", label: "ذخيرة", banner: "ذخيرة إضافية لكل الأسلحة" },
  grenade: { icon: "G", color: "#d96850", label: "قنبلة", banner: "قنبلة إضافية +1" },
  weapon: { icon: "S", color: "#f2c35d", label: "سلاح", banner: "سلاح جديد بذخيرة كاملة" },
  rapid: { icon: "R", color: "#b98cff", label: "سرعة", banner: "سرعة رمي أعلى 10 ثوانٍ" },
  damage: { icon: "D", color: "#ff6f91", label: "ضرر", banner: "ضرر مضاعف 10 ثوانٍ" },
  shield: { icon: "O", color: "#5ee6c8", label: "درع", banner: "درع يمنع الضرر 8 ثوانٍ" }
};

// المكافآت المؤقتة (بالمللي ثانية). تكرار الالتقاط بيزوّد المدة لحد سقف معين
const EFFECTS = {
  rapid: { icon: "⚡", label: "سرعة رمي", duration: 10000 },
  damage: { icon: "💥", label: "ضرر ×2", duration: 10000 },
  shield: { icon: "🛡", label: "درع", duration: 8000 }
};
const MAX_EFFECT_MS = 20000;

const state = {
  running: false,
  paused: false,
  wave: 1,
  zone: "desert",
  weaponPath: "desert",
  zoneWave: 1,
  forestNewWeapons: false,
  score: 0,
  health: 100,
  weaponIndex: 0,
  ammo: Infinity,
  ammoStore: WEAPONS.map(item => item.ammo),
  reloadEnd: 0,
  lastShot: 0,
  lastFrame: performance.now(),
  enemies: [],
  projectiles: [],
  particles: [],
  drops: [],
  grenades: 2,
  spawnQueue: 0,
  spawnTimer: 0,
  waveDelay: 0,
  player: { x: 0, y: 0 },
  aim: { x: 0, y: 0 },
  keys: {},
  unlockedWeaponIndex: 0,
  audioContext: null,
  masterGain: null,
  musicTimer: null,
  musicEnabled: save.settings.music,
  killCount: 0,
  guaranteedHealthAt: 1,
  guaranteedWeaponAt: 6,
  guaranteedAmmoAt: 2,
  guaranteedGrenadeAt: 5,
  dropBanner: null,
  dropBannerEnd: 0,
  effects: { rapid: 0, damage: 0, shield: 0 },
  killsSinceDrop: 0,
  grenadeDropTimer: 22000,
  firing: false,
  revived: false,
  shake: 0,
  flash: 0
};

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  canvas.style.width = innerWidth + "px";
  canvas.style.height = innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  bgCache = null;
  state.player.x = innerWidth * 0.5;
  state.player.y = innerHeight - Math.max(105, innerHeight * 0.13);
  if (!state.aim.x && !state.aim.y) {
    state.aim.x = innerWidth * 0.5;
    state.aim.y = innerHeight * 0.38;
  }
}

window.addEventListener("resize", resize);
resize();

function weapon() {
  return currentWeapons()[state.weaponIndex];
}

function currentWeapons() {
  return state.weaponPath === "forest" ? FOREST_WEAPONS : WEAPONS;
}

function ensureAudio() {
  if (!state.audioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    state.audioContext = new AudioContext();
    state.masterGain = state.audioContext.createGain();
    state.masterGain.gain.value = .32;
    state.masterGain.connect(state.audioContext.destination);
  }
  if (state.audioContext.state === "suspended") state.audioContext.resume();
}

function tone(frequency, duration, volume = .12, type = "square", delay = 0) {
  if (!state.audioContext || !state.masterGain) return;
  const now = state.audioContext.currentTime + delay;
  const oscillator = state.audioContext.createOscillator();
  const gain = state.audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * .72), now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(.001, now + duration);
  oscillator.connect(gain);
  gain.connect(state.masterGain);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function noise(duration = .12, volume = .16) {
  if (!state.audioContext || !state.masterGain) return;
  const length = Math.floor(state.audioContext.sampleRate * duration);
  const buffer = state.audioContext.createBuffer(1, length, state.audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = state.audioContext.createBufferSource();
  const gain = state.audioContext.createGain();
  gain.gain.value = volume;
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(state.masterGain);
  source.start();
}

function playSound(kind) {
  if (!save.settings.sfx) return;
  ensureAudio();
  if (!state.audioContext) return;
  if (kind === "knife") {
    noise(.08, .09); tone(170, .08, .09, "triangle");
  } else if (kind === "bow") {
    tone(520, .12, .07, "sine"); tone(310, .1, .06, "triangle", .04);
  } else if (kind === "fire") {
    tone(250, .16, .1, "sawtooth"); noise(.13, .07);
  } else if (kind === "pistol") {
    noise(.09, .22); tone(95, .09, .13, "square");
  } else if (kind === "rifle") {
    noise(.16, .28); tone(70, .18, .16, "square");
  } else if (kind === "laser") {
    tone(780, .11, .1, "sawtooth"); tone(520, .1, .07, "square", .02);
  } else if (kind === "hit") {
    tone(130, .06, .08, "square");
  } else if (kind === "hurt") {
    tone(85, .22, .16, "sawtooth");
  } else if (kind === "pickup") {
    tone(440, .08, .08, "sine"); tone(660, .12, .08, "sine", .08);
  } else if (kind === "grenade") {
    noise(.5, .35); tone(55, .5, .18, "square");
  } else if (kind === "wave") {
    tone(220, .18, .09, "triangle"); tone(330, .18, .09, "triangle", .16); tone(440, .25, .1, "triangle", .32);
  } else if (kind === "lose") {
    tone(170, .35, .12, "sawtooth"); tone(110, .5, .12, "sawtooth", .28);
  }
}

function startMusic() {
  if (!state.musicEnabled) return;
  ensureAudio();
  if (state.musicTimer) clearInterval(state.musicTimer);
  let beat = 0;
  const melody = [110, 146.83, 164.81, 146.83, 196, 164.81, 146.83, 130.81];
  state.musicTimer = setInterval(() => {
    if (!state.running || state.paused || !state.audioContext) return;
    const base = 55 + (state.wave % 5) * 7;
    tone(base, .22, .025, "triangle");
    tone(melody[beat % melody.length], .34, .018, "sine", .04);
    if (beat % 2 === 0) noise(.035, .012);
    if (beat % 4 === 0) tone(base / 2, .12, .025, "square");
    if (beat % 8 === 6) tone(melody[(beat + 3) % melody.length] * 2, .18, .012, "triangle", .12);
    beat++;
  }, Math.max(330, 520 - state.wave * 12));
}

function syncMusicButton() {
  const button = document.querySelector("#musicButton");
  if (!button) return;
  button.textContent = state.musicEnabled ? "♪" : "×";
  button.classList.toggle("muted", !state.musicEnabled);
}

function setMusic(enabled) {
  state.musicEnabled = enabled;
  save.settings.music = enabled;
  persistSave();
  syncMusicButton();
  if (enabled) {
    startMusic();
  } else if (state.musicTimer) {
    clearInterval(state.musicTimer);
    state.musicTimer = null;
  }
}

function toggleMusic() {
  setMusic(!state.musicEnabled);
  vibrate(15);
}

function unlockWeapons() {
  let unlocked = 0;
  if (state.zone === "forest" && !state.forestNewWeapons) {
    document.querySelectorAll("#weaponSwitch button").forEach((button, index) => {
      button.disabled = index > state.unlockedWeaponIndex;
    });
    updateWeaponSwitch();
    return;
  }
  const unlockWave = state.zone === "forest" && state.forestNewWeapons ? state.zoneWave : state.wave;
  currentWeapons().forEach((item, index) => {
    if (unlockWave >= item.unlocked) unlocked = index;
  });
  if (unlocked > state.unlockedWeaponIndex) {
    state.unlockedWeaponIndex = unlocked;
    setWeapon(unlocked, true);
  }
  document.querySelectorAll("#weaponSwitch button").forEach((button, index) => {
    button.disabled = index > state.unlockedWeaponIndex;
  });
  updateWeaponSwitch();
}

function updateWeaponSwitch() {
  const buttons = document.querySelectorAll("#weaponSwitch button");
  currentWeapons().forEach((item, index) => {
    if (!buttons[index]) return;
    buttons[index].textContent = item.icon;
    buttons[index].title = item.name;
  });
}

function setWeapon(index, refill = false) {
  if (index > state.unlockedWeaponIndex) return;
  const switching = index !== state.weaponIndex;
  if (switching) state.ammoStore[state.weaponIndex] = state.ammo;
  state.weaponIndex = index;
  if (switching || refill) {
    state.ammo = refill ? currentWeapons()[index].ammo : state.ammoStore[index];
    state.reloadEnd = 0;
    reloadButton.textContent = "إعادة تعبئة";
  }
  weaponName.textContent = currentWeapons()[index].name;
  weaponIcon.textContent = currentWeapons()[index].icon;
  document.querySelectorAll("#weaponSwitch button").forEach((button, buttonIndex) => {
    button.classList.toggle("active", buttonIndex === index);
  });
  updateWeaponSwitch();
  updateAmmo();
}

function updateAmmo() {
  if (weapon().ammo === Infinity) {
    ammoValue.textContent = "∞";
  } else {
    ammoValue.textContent = `${state.ammo}/${weapon().ammo}`;
  }
  reloadButton.classList.toggle("visible", weapon().ammo !== Infinity && state.ammo === 0);
  const grenadeCount = document.querySelector("#grenadeCount");
  const grenadeButton = document.querySelector("#grenadeButton");
  if (grenadeCount) grenadeCount.textContent = state.grenades;
  if (grenadeButton) grenadeButton.disabled = state.grenades <= 0;
}

function updateHud() {
  waveValue.textContent = state.wave;
  scoreValue.textContent = state.score;
  healthFill.style.width = `${Math.max(0, state.health)}%`;
  healthFill.style.background = state.health > 35
    ? "linear-gradient(90deg, #dc5947, #f19a55)"
    : "linear-gradient(90deg, #a52d2d, #dc5947)";
  updateAmmo();
}

let hudSnapshot = "";
function updateHudIfChanged() {
  const snapshot = [state.wave, state.score, Math.round(state.health), state.ammo, state.grenades, state.weaponIndex].join("|");
  if (snapshot === hudSnapshot) return;
  hudSnapshot = snapshot;
  updateHud();
}

let effectsSnapshot = "";
function renderEffects() {
  if (!effectsPanel) return;
  const active = Object.keys(EFFECTS).filter(key => state.effects[key] > 0);
  const snapshot = active.map(key => key + Math.ceil(state.effects[key] / 250)).join("|");
  if (snapshot === effectsSnapshot) return;
  effectsSnapshot = snapshot;
  effectsPanel.innerHTML = active.map(key => {
    const effect = EFFECTS[key];
    const seconds = Math.ceil(state.effects[key] / 1000);
    const percent = Math.min(100, state.effects[key] / EFFECTS[key].duration * 100);
    return `<div class="effect-chip" style="--chip:${DROP_STYLES[key].color};--pct:${percent}%">` +
      `<span>${effect.icon}</span><span>${effect.label}</span><b>${seconds}</b><i></i></div>`;
  }).join("");
}

function startWave() {
  ensureAudio();
  playSound("wave");
  startMusic();
  modal.classList.add("hidden");
  startButton.textContent = "ابدأ الموجة";
  startButton.onclick = startWave;
  startButton.disabled = false;
  reviveButton.hidden = true;
  state.running = true;
  state.paused = false;
  const count = 3 + state.wave;
  state.spawnQueue = count;
  state.spawnTimer = 300;
  state.waveDelay = 0;
  state.grenadeDropTimer = Math.max(15000, 22000 - state.wave * 350);
  unlockWeapons();
  updateHud();
}

function spawnEnemy() {
  const margin = 70;
  const x = margin + Math.random() * (innerWidth - margin * 2);
  if (state.zone === "forest") {
    const roll = Math.random();
    const animal = roll < .32 ? "wolf" : roll < .58 ? "boar" : roll < .78 ? "bear" : "snake";
    const animalStats = {
      wolf: { radius: 18, hp: 78, speed: 42, score: 120 },
      boar: { radius: 23, hp: 125, speed: 29, score: 170 },
      bear: { radius: 31, hp: 210, speed: 20, score: 260 },
      snake: { radius: 14, hp: 58, speed: 55, score: 140 }
    }[animal];
    const bossWave = state.wave % 5 === 0;
    const stats = bossWave
      ? { radius: 44, hp: 900 + state.wave * 45, speed: 16, score: 900 }
      : animalStats;
    state.enemies.push({
      x: bossWave ? innerWidth / 2 : x,
      y: -55,
      radius: stats.radius,
      hp: stats.hp + state.wave * 8,
      maxHp: stats.hp + state.wave * 8,
      speed: stats.speed * (.9 + state.wave * .018),
      type: bossWave ? "boss" : animal,
      attack: 0,
      hit: 0,
      zigzag: Math.random() * Math.PI * 2,
      shootTimer: animal === "snake" ? 1.4 : 0
    });
    if (bossWave) state.spawnQueue = 0;
    return;
  }
  const armored = state.wave >= 4 && Math.random() < Math.min(.28, state.wave * .025);
  const runner = state.wave >= 2 && !armored && Math.random() < .22;
  const base = 0.58 + state.wave * 0.028;
  state.enemies.push({
    x,
    y: -55,
    radius: armored ? 24 : runner ? 15 : 19,
    hp: (armored ? 150 : runner ? 45 : 75) + state.wave * 7,
    maxHp: (armored ? 150 : runner ? 45 : 75) + state.wave * 7,
    speed: (runner ? 55 : 31) * base,
    type: armored ? "armored" : runner ? "runner" : "raider",
    attack: 0,
    hit: 0,
    zigzag: Math.random() * Math.PI * 2
  });
}

function showDropBanner(type) {
  state.dropBanner = (DROP_STYLES[type] && DROP_STYLES[type].banner) || "مكافأة";
  state.dropBannerEnd = performance.now() + 2400;
  playSound("pickup");
}

function grantDrop(type, dropX = state.player.x, dropY = state.player.y) {
  if (type === "health") {
    state.health = Math.min(100, state.health + 24);
  } else if (type === "weapon") {
    const candidates = currentWeapons().map((item, index) => ({ item, index }))
      .filter(entry => entry.index <= state.unlockedWeaponIndex);
    if (candidates.length) setWeapon(candidates[Math.floor(Math.random() * candidates.length)].index, true);
  } else if (type === "ammo") {
    // نصف المخزن لكل سلاح مفتوح (السلاح الحالي وكمان الأسلحة اللي مش شايلها دلوقتي)
    currentWeapons().forEach((item, index) => {
      if (item.ammo === Infinity || index > state.unlockedWeaponIndex) return;
      const bonus = Math.ceil(item.ammo / 2);
      if (index === state.weaponIndex) {
        state.ammo = Math.min(item.ammo, state.ammo + bonus);
      } else {
        state.ammoStore[index] = Math.min(item.ammo, state.ammoStore[index] + bonus);
      }
    });
  } else if (type === "grenade") {
    state.grenades = Math.min(5, state.grenades + 1);
  } else if (EFFECTS[type]) {
    state.effects[type] = Math.min(MAX_EFFECT_MS, state.effects[type] + EFFECTS[type].duration);
  }
  state.health = Math.max(0, Math.min(100, state.health));
  showDropBanner(type);
  const color = (DROP_STYLES[type] || DROP_STYLES.weapon).color;
  for (let i = 0; i < 18; i++) {
    state.particles.push({
      x: dropX,
      y: dropY,
      vx: (Math.random() - .5) * 180,
      vy: (Math.random() - .5) * 180,
      life: 700,
      maxLife: 700,
      color
    });
  }
  updateHud();
}

// اختيار المكافأة بالأوزان: اللي اللاعب محتاجه أكتر (صحة قليلة، ذخيرة قليلة...) فرصته أعلى
function chooseDropType() {
  const ammoOf = index => (index === state.weaponIndex ? state.ammo : state.ammoStore[index]);
  const finite = currentWeapons()
    .map((item, index) => ({ item, index }))
    .filter(entry => entry.index <= state.unlockedWeaponIndex && entry.item.ammo !== Infinity);
  const anyLowAmmo = finite.some(entry => ammoOf(entry.index) < entry.item.ammo * .6);
  const currentLow = weapon().ammo !== Infinity && state.ammo <= weapon().ammo / 3;

  const weights = {
    health: state.health < 40 ? 55 : state.health < 75 ? 24 : 8,
    ammo: anyLowAmmo ? (currentLow ? 50 : 22) : 0,
    rapid: 14,
    damage: 12,
    shield: 10,
    weapon: state.unlockedWeaponIndex > 0 ? 6 : 0
  };
  const entries = Object.entries(weights).filter(([, weight]) => weight > 0);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [type, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return type;
  }
  return entries[0][0];
}

function killEnemy(enemy) {
  if (enemy.dead) return;
  enemy.dead = true;
  state.score += enemy.type === "armored" ? 180 : enemy.type === "runner" ? 110 : 90;
  state.killCount++;
  state.killsSinceDrop++;

  // المدرّع دايمًا بيسقط مكافأة، والباقي بفرصة، ومضمون مكافأة كل 3 قتلات على الأكتر
  const chance = enemy.type === "armored" ? 1 : enemy.type === "runner" ? .5 : .45;
  if (Math.random() < chance || state.killsSinceDrop >= 3) {
    state.killsSinceDrop = 0;
    grantDrop(chooseDropType(), enemy.x, enemy.y);
  }

  for (let i = 0; i < 12; i++) {
    state.particles.push({
      x: enemy.x,
      y: enemy.y,
      vx: (Math.random() - .5) * 140,
      vy: (Math.random() - .5) * 140,
      life: 500,
      maxLife: 500,
      color: enemy.type === "armored" ? "#b89b66" : "#cf6b48"
    });
  }
}

function damageEnemy(enemy, amount, fire = false) {
  enemy.hp -= amount;
  enemy.hit = 1;
  playSound("hit");
  if (fire) enemy.burning = 180;
  if (enemy.hp <= 0) killEnemy(enemy);
}

function shoot() {
  const cooldown = weapon().cooldown * (state.effects.rapid > 0 ? .5 : 1);
  if (!state.running || state.paused || performance.now() - state.lastShot < cooldown) return;
  if (state.reloadEnd > 0) return;
  if (weapon().ammo !== Infinity) {
    if (state.ammo <= 0) {
      reload();
      return;
    }
    state.ammo--;
  }

  const dx = state.aim.x - state.player.x;
  const dy = state.aim.y - state.player.y;
  const length = Math.hypot(dx, dy) || 1;
  const speed = weapon().speed;
  state.projectiles.push({
    x: state.player.x,
    y: state.player.y,
    vx: dx / length * speed,
    vy: dy / length * speed,
    radius: weapon().id === "rifle" ? 5 : weapon().id === "pistol" ? 4 : 3,
    damage: weapon().damage * (state.effects.damage > 0 ? 2 : 1),
    life: 4000,
    fire: weapon().id === "fire",
    knife: weapon().id === "knife",
    laser: weapon().id === "laser",
    piercing: weapon().piercing === true,
    lethal: weapon().lethal === true,
    explosive: weapon().explosive === true,
    explosionRadius: weapon().radius || 150,
    sniper: weapon().id === "sniper",
    hitIds: [],
    laserHits: new Map(),
    color: weapon().id === "laser" ? "#60efff" : state.effects.damage > 0 ? "#ff7f9c" : weapon().id === "fire" ? "#ff9f43" : weapon().id === "rifle" ? "#d8c6a2" : "#f4e5bc"
  });
  state.lastShot = performance.now();
  playSound(weapon().id);
  updateAmmo();
  vibrate(12);
}

function explodeRocket(x, y, damage, radius) {
  state.shake = 420;
  for (let i = 0; i < 38; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 120 + Math.random() * 260;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 700,
      maxLife: 700,
      color: i % 3 === 0 ? "#fff1bd" : i % 2 === 0 ? "#ff9e42" : "#c94f38"
    });
  }
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    const distance = Math.hypot(enemy.x - x, enemy.y - y);
    if (distance <= radius) {
      const falloff = 1 - (distance / radius) * .35;
      damageEnemy(enemy, Math.round(damage * falloff), false);
    }
  }
  playSound("grenade");
  vibrate([70, 35, 90]);
}

function reload() {
  if (weapon().ammo === Infinity || state.ammo === weapon().ammo || state.reloadEnd > 0) return;
  state.reloadEnd = performance.now() + weapon().reload;
  reloadButton.classList.remove("visible");
  reloadButton.textContent = "جاري التعبئة...";
}

function finishReload() {
  state.reloadEnd = 0;
  state.ammo = weapon().ammo;
  reloadButton.textContent = "إعادة تعبئة";
  updateAmmo();
}

function endWave() {
  playSound("wave");
  state.running = false;
  const completedWave = state.wave;
  state.wave++;
  state.zoneWave++;
  if (completedWave === 20 && state.zone === "desert") {
    state.health = Math.min(100, state.health + 12);
    updateHud();
    recordRun(false);
    modalKicker.textContent = "الوضع الجديد";
    modalTitle.textContent = "الغابة الملتهبة";
    modalText.textContent = "وصلت إلى نهاية الموجات الصحراوية. اختر طريقك للدخول إلى الغابة.";
    modalStats.textContent = `درجتك: ${state.score}`;
    startButton.hidden = true;
    reviveButton.hidden = true;
    const zoneChoice = document.querySelector("#zoneChoice");
    zoneChoice.hidden = false;
    modal.classList.remove("hidden");
    return;
  }
  unlockWeapons();
  state.health = Math.min(100, state.health + 12);
  updateHud();
  modalKicker.textContent = `اكتملت الموجة ${state.wave - 1}`;
  modalTitle.textContent = "خط الدفاع ثابت";
  modalText.textContent = `حصلت على ${state.score} نقطة. الموجة التالية أقوى.`;
  save.best = Math.max(save.best, state.score);
  save.bestWave = Math.max(save.bestWave, state.wave);
  persistSave();
  recordRun(false);
  modalStats.textContent = statsLine();
  reviveButton.hidden = true;
  startButton.textContent = "الموجة التالية";
  startButton.disabled = false;
  startButton.onclick = startWave;
  modal.classList.remove("hidden");
}

function throwGrenade() {
  if (!state.running || state.paused || state.grenades <= 0) return;
  state.grenades--;
  playSound("grenade");
  state.shake = 380;
  state.enemies.forEach(enemy => {
    enemy.dead = true;
    state.score += enemy.type === "armored" ? 180 : enemy.type === "runner" ? 110 : 90;
  });
  for (let i = 0; i < 54; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 90 + Math.random() * 260;
    state.particles.push({
      x: innerWidth * (.25 + Math.random() * .5),
      y: innerHeight * (.18 + Math.random() * .58),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 650,
      maxLife: 650,
      color: i % 3 === 0 ? "#fff1bd" : i % 2 === 0 ? "#ff9e42" : "#c94f38"
    });
  }
  updateHud();
  vibrate([70, 35, 100]);
}

function resetRun() {
  state.wave = 1;
  state.zoneWave = 1;
  state.zone = "desert";
  state.weaponPath = "desert";
  state.forestNewWeapons = false;
  state.score = 0;
  state.health = 100;
  state.enemies = [];
  state.projectiles = [];
  state.particles = [];
  state.drops = [];
  state.grenades = 2;
  state.grenadeDropTimer = 22000;
  state.killCount = 0;
  state.spawnQueue = 0;
  state.waveDelay = 0;
  state.paused = false;
  state.firing = false;
  state.revived = false;
  state.shake = 0;
  state.flash = 0;
  state.dropBanner = null;
  state.dropBannerEnd = 0;
  state.effects = { rapid: 0, damage: 0, shield: 0 };
  state.killsSinceDrop = 0;
  state.unlockedWeaponIndex = 0;
  setWeapon(0);
  state.ammoStore = currentWeapons().map(item => item.ammo);
}

function loseGame() {
  if (!state.running) return;
  playSound("lose");
  if (state.musicTimer) {
    clearInterval(state.musicTimer);
    state.musicTimer = null;
  }
  state.running = false;
  state.firing = false;

  const record = state.score > save.best;
  save.games++;
  save.best = Math.max(save.best, state.score);
  save.bestWave = Math.max(save.bestWave, state.wave);
  persistSave();
  recordRun(true);

  modalKicker.textContent = record ? "رقم قياسي جديد!" : "انتهت المهمة";
  modalTitle.textContent = "سقط خط الدفاع";
  modalText.textContent = `وصلت إلى الموجة ${state.wave} وحصلت على ${state.score} نقطة.`;
  modalStats.textContent = statsLine();
  startButton.textContent = "حاول مجددًا";
  reviveButton.hidden = !(!state.revived && window.Ads && Ads.canShowRewarded());
  modal.classList.remove("hidden");

  startButton.onclick = async () => {
    startButton.disabled = true;
    try {
      if (window.Ads) await Ads.interstitialIfDue(save.games);
    } catch (error) {
      // الإعلان مش لازم يوقف اللعبة
    }
    startButton.disabled = false;
    resetRun();
    startButton.onclick = startWave;
    startWave();
  };
}

// إكمال اللعب بعد الخسارة مقابل مشاهدة إعلان (مرة واحدة في كل جولة)
async function reviveWithAd() {
  if (state.running || state.revived || !window.Ads || !Ads.canShowRewarded()) return;
  reviveButton.disabled = true;
  let rewarded = false;
  try {
    rewarded = await Ads.showRewarded();
  } catch (error) {
    rewarded = false;
  }
  reviveButton.disabled = false;
  if (!rewarded) return;

  state.revived = true;
  state.health = 60;
  state.enemies = [];
  state.projectiles = [];
  state.effects.shield = Math.max(state.effects.shield, 4000);
  reviveButton.hidden = true;
  startButton.onclick = startWave;
  modal.classList.add("hidden");
  state.running = true;
  startMusic();
  updateHud();
}

function update(dt) {
  if (state.paused) return;
  const now = performance.now();
  if (state.reloadEnd && now >= state.reloadEnd) finishReload();
  state.shake = Math.max(0, state.shake - dt * 1000);
  state.flash = Math.max(0, state.flash - dt * 2.5);

  const speed = 240;
  if (state.keys.ArrowLeft || state.keys.KeyA) state.aim.x -= speed * dt;
  if (state.keys.ArrowRight || state.keys.KeyD) state.aim.x += speed * dt;
  if (state.keys.ArrowUp || state.keys.KeyW) state.aim.y -= speed * dt;
  if (state.keys.ArrowDown || state.keys.KeyS) state.aim.y += speed * dt;
  state.aim.x = Math.max(0, Math.min(innerWidth, state.aim.x));
  state.aim.y = Math.max(0, Math.min(innerHeight, state.aim.y));
  if (state.firing && state.running) shoot();

  if (state.running) {
    for (const key of Object.keys(state.effects)) {
      if (state.effects[key] > 0) state.effects[key] = Math.max(0, state.effects[key] - dt * 1000);
    }

    if (state.grenades < 5) {
      state.grenadeDropTimer -= dt * 1000;
      if (state.grenadeDropTimer <= 0) {
        state.grenadeDropTimer = Math.max(15000, 22000 - state.wave * 350);
        state.grenades = Math.min(5, state.grenades + 1);
        state.dropBanner = "قنبلة جديدة +1";
        state.dropBannerEnd = performance.now() + 1800;
        playSound("pickup");
        updateHudIfChanged();
      }
    } else {
      state.grenadeDropTimer = 22000;
    }

    if (state.spawnQueue > 0) {
      state.spawnTimer -= dt * 1000;
      if (state.spawnTimer <= 0) {
        spawnEnemy();
        state.spawnQueue--;
        state.spawnTimer = Math.max(260, 900 - state.wave * 35);
      }
    }

    state.enemies.forEach(enemy => {
      enemy.hit = Math.max(0, enemy.hit - dt * 4);
      if (enemy.burning) {
        enemy.burning -= dt * 1000;
        enemy.hp -= dt * 12;
        if (Math.random() < .3) {
          state.particles.push({
            x: enemy.x + (Math.random() - .5) * enemy.radius,
            y: enemy.y,
            vx: (Math.random() - .5) * 20,
            vy: -20 - Math.random() * 25,
            life: 400,
            maxLife: 400,
            color: "#ffb13b"
          });
        }
      }
      enemy.zigzag += dt * 2.5;
      enemy.y += enemy.speed * dt;
      enemy.x += enemy.type === "runner" ? Math.sin(enemy.zigzag) * 18 * dt : Math.sin(enemy.zigzag) * 5 * dt;

      if (enemy.hp <= 0 && !enemy.dead) {
        killEnemy(enemy);
      }

      if (enemy.y > state.player.y - 18) {
        enemy.attack += dt;
        if (enemy.attack > .8) {
          enemy.attack = 0;
          enemy.y = state.player.y - 28;
          if (state.effects.shield > 0) {
            playSound("hit");
            for (let i = 0; i < 10; i++) {
              state.particles.push({
                x: state.player.x + (Math.random() - .5) * 50,
                y: state.player.y - 20,
                vx: (Math.random() - .5) * 120,
                vy: -30 - Math.random() * 90,
                life: 350,
                maxLife: 350,
                color: DROP_STYLES.shield.color
              });
            }
          } else {
            state.health -= enemy.type === "armored" ? 17 : enemy.type === "runner" ? 8 : 12;
            state.shake = 260;
            state.flash = 1;
            playSound("hurt");
            updateHud();
            vibrate([40, 30, 40]);
            if (state.health <= 0) loseGame();
          }
        }
      }
    });

    state.enemies = state.enemies.filter(enemy => !enemy.dead);
    if (state.spawnQueue === 0 && state.enemies.length === 0) {
      state.waveDelay += dt;
      if (state.waveDelay > 1.2) endWave();
    }
  }

  state.projectiles.forEach(projectile => {
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.life -= dt * 1000;
  });

  state.projectiles = state.projectiles.filter(projectile => {
    if (projectile.life <= 0 || projectile.x < -30 || projectile.x > innerWidth + 30 || projectile.y < -30 || projectile.y > innerHeight + 30) {
      if (projectile.explosive) explodeRocket(projectile.x, projectile.y, projectile.damage, projectile.explosionRadius);
      return false;
    }
    for (const enemy of state.enemies) {
      if (enemy.dead) continue;
      if (Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y) < enemy.radius + projectile.radius) {
        const now = performance.now();
        if (projectile.explosive) {
          explodeRocket(projectile.x, projectile.y, projectile.damage, projectile.explosionRadius);
          return false;
        }
        if (projectile.lethal) {
          enemy.hp = 0;
        }
        if (projectile.piercing) {
          const lastHit = projectile.laserHits.get(enemy) || 0;
          if (now - lastHit < 240) continue;
          projectile.laserHits.set(enemy, now);
        } else {
          if (projectile.hitIds && projectile.hitIds.includes(enemy)) continue;
          if (projectile.hitIds) projectile.hitIds.push(enemy);
        }
        damageEnemy(enemy, projectile.damage, projectile.fire);
        for (let i = 0; i < 5; i++) {
          state.particles.push({
            x: projectile.x,
            y: projectile.y,
            vx: (Math.random() - .5) * 100,
            vy: (Math.random() - .5) * 100,
            life: 300,
            maxLife: 300,
            color: projectile.fire ? "#ffad43" : "#e7d09e"
          });
        }
        if (projectile.knife) {
          enemy.x += projectile.vx * .035;
          enemy.y += projectile.vy * .035;
        }
        if (projectile.piercing) continue;
        return false;
      }
    }
    return true;
  });

  state.drops.forEach(drop => {
    drop.life -= dt * 1000;
    drop.pulse = (drop.pulse || 0) + dt * 4;
    const dx = state.player.x - drop.x;
    const dy = state.player.y - drop.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 260) {
      drop.x += dx * dt * 2.8;
      drop.y += dy * dt * 2.8;
    }
    if (distance < 82) {
      grantDrop(drop.type, drop.x, drop.y);
      drop.collected = true;
    }
  });
  state.drops = state.drops.filter(drop => drop.life > 0 && !drop.collected);

  state.enemies = state.enemies.filter(enemy => !enemy.dead);
  state.particles.forEach(particle => {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt * 1000;
  });
  state.particles = state.particles.filter(particle => particle.life > 0);
  updateHudIfChanged();
  renderEffects();
}

function pill(c, x, y, w, h) {
  const r = w / 2;
  c.beginPath();
  c.moveTo(x, y + r);
  c.arc(x + r, y + r, r, Math.PI, 0);
  c.lineTo(x + w, y + h - r);
  c.arc(x + r, y + h - r, r, 0, Math.PI);
  c.closePath();
  c.fill();
}

function paintCactus(c, x, y, s) {
  c.fillStyle = "rgba(52,72,44,.55)";
  pill(c, x - 6 * s, y - 64 * s, 12 * s, 64 * s);
  c.fillRect(x - 22 * s, y - 36 * s, 18 * s, 7 * s);
  pill(c, x - 26 * s, y - 52 * s, 9 * s, 24 * s);
  c.fillRect(x + 4 * s, y - 28 * s, 16 * s, 7 * s);
  pill(c, x + 14 * s, y - 42 * s, 9 * s, 20 * s);
}

function paintBackground(c, w, h) {
  if (state.zone === "forest") {
    const gradient = c.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#6d9a67");
    gradient.addColorStop(.5, "#3f7046");
    gradient.addColorStop(1, "#1f3d2a");
    c.fillStyle = gradient;
    c.fillRect(0, 0, w, h);
    c.fillStyle = "rgba(15,55,30,.42)";
    for (let i = 0; i < 24; i++) {
      const x = (i * 83) % w;
      const y = (i * 47) % h;
      c.beginPath();
      c.arc(x, y, 24 + (i % 5) * 7, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = "#2a5031";
    c.fillRect(0, h - 92, w, 92);
    c.fillStyle = "rgba(153,190,109,.18)";
    c.fillRect(0, h - 96, w, 4);
    for (let i = 0; i < 9; i++) {
      const x = (i * 151 + 35) % w;
      c.fillStyle = "#1b3d27";
      c.fillRect(x - 5, h * .18, 10, h * .55);
      c.fillStyle = "#315e38";
      c.beginPath();
      c.moveTo(x, h * .12);
      c.lineTo(x - 48, h * .38);
      c.lineTo(x + 48, h * .38);
      c.closePath();
      c.fill();
    }
    return;
  }
  const gradient = c.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, "#d9b26d");
  gradient.addColorStop(.48, "#b88449");
  gradient.addColorStop(1, "#6d4a2e");
  c.fillStyle = gradient;
  c.fillRect(0, 0, w, h);

  const sun = c.createRadialGradient(w * .78, h * .1, 4, w * .78, h * .1, Math.min(w, h) * .22);
  sun.addColorStop(0, "rgba(255,240,190,.75)");
  sun.addColorStop(1, "rgba(255,240,190,0)");
  c.fillStyle = sun;
  c.fillRect(0, 0, w, h);

  c.fillStyle = "rgba(78,51,31,.18)";
  for (let i = 0; i < 15; i++) {
    c.beginPath();
    c.arc((i * 137) % w, (i * 83) % h, 16 + (i % 4) * 8, 0, Math.PI * 2);
    c.fill();
  }

  c.fillStyle = "rgba(38,29,22,.55)";
  c.beginPath();
  c.moveTo(w * .12, h * .29);
  c.lineTo(w * .19, h * .12);
  c.lineTo(w * .21, h * .29);
  c.closePath();
  c.fill();
  c.beginPath();
  c.moveTo(w * .78, h * .32);
  c.lineTo(w * .84, h * .15);
  c.lineTo(w * .86, h * .32);
  c.closePath();
  c.fill();

  const scale = Math.max(.7, Math.min(1.3, w / 420));
  paintCactus(c, w * .08, h * .52, scale);
  paintCactus(c, w * .93, h * .64, scale * .85);
  paintCactus(c, w * .3, h * .78, scale * .7);

  c.fillStyle = "rgba(50,35,25,.72)";
  c.fillRect(0, h - 92, w, 92);
  c.fillStyle = "rgba(214,174,112,.22)";
  c.fillRect(0, h - 96, w, 4);
}

function drawBackground() {
  if (!bgCache || bgCache.w !== innerWidth || bgCache.h !== innerHeight || bgCache.zone !== state.zone) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const off = document.createElement("canvas");
    off.width = Math.round(innerWidth * dpr);
    off.height = Math.round(innerHeight * dpr);
    const c = off.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintBackground(c, innerWidth, innerHeight);
    bgCache = { canvas: off, w: innerWidth, h: innerHeight, zone: state.zone };
  }
  ctx.drawImage(bgCache.canvas, 0, 0, innerWidth, innerHeight);
}

function drawEnemy(enemy) {
  const r = enemy.radius;
  const hit = enemy.hit > 0;
  const step = Math.sin(performance.now() / 130 + enemy.zigzag * 2);
  const palette = enemy.type === "armored"
    ? { body: "#5f6a73", trim: "#2f363b", skin: "#c7936a", hat: "#3a4046" }
    : enemy.type === "runner"
      ? { body: "#a8453a", trim: "#5a1f1a", skin: "#d1a070", hat: "#3b2a1c" }
      : { body: "#6f4a35", trim: "#35241b", skin: "#c99763", hat: "#4a3524" };
  const flash = hit ? "#fff0c4" : null;

  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(Math.sin(enemy.zigzag) * .06);

  if (state.zone === "forest") {
    const animalColors = {
      wolf: "#77746e",
      boar: "#5a4637",
      bear: "#6f4d32",
      snake: "#66884a",
      boss: "#463b25"
    };
    ctx.fillStyle = "rgba(20,35,20,.28)";
    ctx.beginPath();
    ctx.ellipse(0, r + 12, r * .9, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hit ? "#fff0c4" : (animalColors[enemy.type] || "#6f4d32");
    if (enemy.type === "snake") {
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.5, r * .55, .2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(r, -r * .2, r * .65, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-r * .55, -r * .55);
      ctx.lineTo(-r * .25, -r * 1.25);
      ctx.lineTo(r * .05, -r * .55);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * .55, -r * .55);
      ctx.lineTo(r * .25, -r * 1.25);
      ctx.lineTo(-r * .05, -r * .55);
      ctx.fill();
    }
    ctx.fillStyle = "#e3c9a1";
    ctx.beginPath();
    ctx.arc(r * .18, -r * .15, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.fillStyle = "rgba(30,20,12,.26)";
  ctx.beginPath();
  ctx.ellipse(0, r + 14, r * .85, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.trim;
  ctx.fillRect(-r * .55, r * .55 + step * 3, r * .4, r * .75);
  ctx.fillRect(r * .15, r * .55 - step * 3, r * .4, r * .75);

  ctx.fillStyle = flash || palette.body;
  ctx.beginPath();
  ctx.moveTo(-r * .95, r * .75);
  ctx.lineTo(r * .95, r * .75);
  ctx.lineTo(r * .7, -r * .35);
  ctx.lineTo(-r * .7, -r * .35);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-r * 1.05, -r * .2 + step * 2, r * .3, r * .7);
  ctx.fillRect(r * .75, -r * .2 - step * 2, r * .3, r * .7);
  ctx.fillStyle = palette.trim;
  ctx.fillRect(-r * .8, r * .25, r * 1.6, r * .16);
  if (enemy.type === "armored") {
    ctx.fillStyle = flash || "#8a949c";
    ctx.fillRect(-r * .5, -r * .2, r, r * .45);
  }

  ctx.fillStyle = flash || palette.skin;
  ctx.beginPath();
  ctx.arc(0, -r * .62, r * .5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.trim;
  ctx.fillRect(-r * .5, -r * .5, r, r * .22);
  ctx.fillStyle = "#1c120c";
  ctx.fillRect(-r * .28, -r * .78, r * .14, r * .1);
  ctx.fillRect(r * .14, -r * .78, r * .14, r * .1);

  ctx.fillStyle = palette.hat;
  if (enemy.type === "armored") {
    ctx.beginPath();
    ctx.arc(0, -r * .85, r * .58, Math.PI, 0);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(0, -r * .98, r * .85, r * .2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-r * .45, -r * 1.42, r * .9, r * .48);
  }

  if (enemy.burning) {
    ctx.fillStyle = "rgba(255,146,54,.75)";
    ctx.beginPath();
    ctx.arc(0, -r * .2, r * .55, 0, Math.PI * 2);
    ctx.fill();
  }

  if (enemy.hp < enemy.maxHp) {
    ctx.fillStyle = "rgba(20,15,10,.8)";
    ctx.fillRect(-r, -r * 1.6 - 8, r * 2, 5);
    ctx.fillStyle = "#d55a43";
    ctx.fillRect(-r, -r * 1.6 - 8, r * 2 * Math.max(0, enemy.hp / enemy.maxHp), 5);
  }
  ctx.restore();
}

function drawProjectile(projectile) {
  ctx.save();
  ctx.translate(projectile.x, projectile.y);
  ctx.rotate(Math.atan2(projectile.vy, projectile.vx));
  if (projectile.sniper) {
    ctx.shadowColor = "#ffe8a6";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#fff1bc";
    ctx.fillRect(-18, -1.5, 36, 3);
    ctx.fillStyle = "#e9a84b";
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
    return;
  }
  if (projectile.explosive) {
    ctx.shadowColor = "#ff9f43";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#df5a3a";
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd26a";
    ctx.fillRect(-2, -10, 4, 7);
    ctx.restore();
    return;
  }
  if (projectile.laser) {
    ctx.shadowColor = "#58efff";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#8bf7ff";
    ctx.fillRect(-10, -2.5, 20, 5);
    ctx.fillStyle = "#eaffff";
    ctx.fillRect(-10, -.75, 20, 1.5);
    ctx.restore();
    return;
  }
  ctx.fillStyle = projectile.color;
  if (projectile.knife) {
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-8, 4);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-8, -4);
    ctx.closePath();
  } else {
    ctx.fillRect(-9, -1.5, 18, 3);
  }
  ctx.fill();
  if (projectile.fire) {
    ctx.fillStyle = "rgba(255,140,45,.55)";
    ctx.beginPath();
    ctx.arc(-10, 0, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawDrop(drop) {
  const style = DROP_STYLES[drop.type];
  ctx.save();
  ctx.translate(drop.x, drop.y);
  ctx.rotate(Math.sin(performance.now() / 180 + drop.x) * .12);
  ctx.shadowColor = style.color;
  ctx.shadowBlur = 24;
  ctx.fillStyle = "rgba(20,15,10,.86)";
  ctx.beginPath();
  ctx.arc(0, 0, drop.radius + 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = style.color;
  ctx.beginPath();
  ctx.arc(0, 0, drop.radius + Math.sin(drop.pulse || 0) * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#251a11";
  ctx.font = "900 18px Segoe UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(style.icon, 0, 0);
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#fff4c7";
  ctx.font = "800 10px Segoe UI";
  ctx.fillText(style.label, 0, drop.radius + 18);
  ctx.restore();
}

// ctx.roundRect غير مدعومة في المتصفحات الأقدم؛ بدونها كانت اللعبة تتجمد عند أول مكافأة.
function roundedRectPath(x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function draw() {
  ctx.save();
  if (state.shake > 0) {
    const amount = state.shake * .06;
    ctx.translate((Math.random() - .5) * amount, (Math.random() - .5) * amount);
  }
  drawBackground();

  state.particles.forEach(particle => {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  state.enemies.forEach(drawEnemy);
  state.drops.forEach(drawDrop);
  state.projectiles.forEach(drawProjectile);

  ctx.save();
  ctx.translate(state.player.x, state.player.y);
  ctx.fillStyle = "#32261b";
  ctx.beginPath();
  ctx.moveTo(-26, 30);
  ctx.lineTo(26, 30);
  ctx.lineTo(18, -18);
  ctx.lineTo(-18, -18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#b78a50";
  ctx.beginPath();
  ctx.arc(0, -24, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#281e16";
  ctx.beginPath();
  ctx.arc(0, -29, 14, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (state.effects.shield > 0) {
    // الدرع بيرمش في آخر ثانيتين عشان اللاعب ياخد باله إنه بيخلص
    const blink = state.effects.shield < 2000 && Math.floor(performance.now() / 120) % 2 === 0;
    if (!blink) {
      ctx.save();
      ctx.translate(state.player.x, state.player.y - 4);
      ctx.strokeStyle = DROP_STYLES.shield.color;
      ctx.fillStyle = "rgba(94,230,200,.12)";
      ctx.lineWidth = 3;
      ctx.shadowColor = DROP_STYLES.shield.color;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(0, 0, 46 + Math.sin(performance.now() / 160) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore();
  if (state.flash > 0) {
    ctx.fillStyle = `rgba(190,30,20,${Math.min(.35, state.flash * .35)})`;
    ctx.fillRect(0, 0, innerWidth, innerHeight);
  }

  crosshair.style.opacity = finePointer.matches ? "1" : "0";
  crosshair.style.left = `${state.aim.x}px`;
  crosshair.style.top = `${state.aim.y}px`;

  if (state.dropBanner && performance.now() < state.dropBannerEnd) {
    const bannerWidth = Math.min(280, innerWidth - 32);
    ctx.save();
    ctx.fillStyle = "rgba(28,20,14,.92)";
    ctx.strokeStyle = "rgba(242,184,75,.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    roundedRectPath(innerWidth / 2 - bannerWidth / 2, innerHeight * .23, bannerWidth, 46, 13);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f4d58a";
    ctx.font = "900 16px Segoe UI";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(state.dropBanner, innerWidth / 2, innerHeight * .23 + 23);
    ctx.restore();
  }

  if (state.running) {
    ctx.save();
    ctx.fillStyle = "rgba(255,245,211,.7)";
    ctx.font = "600 11px Segoe UI";
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`الموجة ${state.wave}`, innerWidth - 18, innerHeight - 18);
    ctx.restore();
  }
}

function loop(now) {
  requestAnimationFrame(loop); // نجدول الإطار التالي أولًا حتى لا يتوقف اللعب بسبب خطأ واحد
  const dt = Math.min(.033, (now - state.lastFrame) / 1000);
  state.lastFrame = now;
  try {
    update(dt);
    draw();
  } catch (error) {
    console.error(error);
  }
}
requestAnimationFrame(loop);

canvas.addEventListener("pointermove", event => {
  state.aim.x = event.clientX;
  state.aim.y = event.clientY;
});

canvas.addEventListener("pointerdown", event => {
  state.aim.x = event.clientX;
  state.aim.y = event.clientY;
  shoot();
  state.firing = true; // اضغط مطولًا للرمي المستمر
  try {
    canvas.setPointerCapture(event.pointerId);
  } catch (error) {
    // مش مهم
  }
});

const stopFiring = () => { state.firing = false; };
canvas.addEventListener("pointerup", stopFiring);
canvas.addEventListener("pointercancel", stopFiring);

window.addEventListener("keydown", event => {
  state.keys[event.code] = true;
  if (event.code === "Space") {
    event.preventDefault();
    shoot();
  }
  if (event.code === "KeyR") reload();
  if (event.code === "KeyP" || event.code === "Escape") (state.paused ? resumeGame() : pauseGame());
  if (event.code === "Digit1") setWeapon(0);
  if (event.code === "Digit2" && state.unlockedWeaponIndex >= 1) setWeapon(1);
  if (event.code === "Digit3" && state.unlockedWeaponIndex >= 2) setWeapon(2);
  if (event.code === "Digit4" && state.unlockedWeaponIndex >= 3) setWeapon(3);
  if (event.code === "Digit5" && state.unlockedWeaponIndex >= 4) setWeapon(4);
  if (event.code === "Digit6" && state.unlockedWeaponIndex >= 5) setWeapon(5);
  if (event.code === "Digit7" && state.unlockedWeaponIndex >= 6) setWeapon(6);
  if (event.code === "Digit8" && state.unlockedWeaponIndex >= 7) setWeapon(7);
});

window.addEventListener("keyup", event => {
  state.keys[event.code] = false;
});

startButton.onclick = startWave;
reloadButton.addEventListener("click", reload);
const musicButton = document.querySelector("#musicButton");
if (musicButton) musicButton.addEventListener("click", toggleMusic);
document.querySelector("#grenadeButton").addEventListener("click", throwGrenade);
document.querySelectorAll("#weaponSwitch button").forEach(button => {
  button.addEventListener("click", () => {
    const index = Number(button.dataset.weapon);
    if (!button.disabled) setWeapon(index);
  });
});

function pauseGame() {
  if (!state.running || state.paused) return;
  state.paused = true;
  state.firing = false;
  pauseButton.textContent = "▶";
  modalKicker.textContent = "توقف مؤقت";
  modalTitle.textContent = "خذ نفسًا";
  modalText.textContent = "اللعبة متوقفة مؤقتًا.";
  modalStats.textContent = statsLine();
  reviveButton.hidden = true;
  startButton.textContent = "متابعة";
  startButton.onclick = resumeGame;
  modal.classList.remove("hidden");
}

function resumeGame() {
  if (!state.paused) return;
  state.paused = false;
  pauseButton.textContent = "Ⅱ";
  startButton.onclick = startWave;
  modal.classList.add("hidden");
}

pauseButton.addEventListener("click", () => (state.paused ? resumeGame() : pauseGame()));

// المتاجر بتتوقع إن اللعبة توقف نفسها وتسكت لما المستخدم يطلع منها
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseGame();
    if (state.audioContext && state.audioContext.state === "running") state.audioContext.suspend();
  } else if (state.audioContext && state.audioContext.state === "suspended") {
    state.audioContext.resume();
  }
});

reviveButton.addEventListener("click", reviveWithAd);

function syncSettingsUi() {
  optSfx.checked = save.settings.sfx;
  optMusic.checked = state.musicEnabled;
  optVibrate.checked = save.settings.vibrate;
}

settingsButton.addEventListener("click", () => {
  syncSettingsUi();
  settingsModal.classList.remove("hidden");
});
settingsClose.addEventListener("click", () => settingsModal.classList.add("hidden"));
optSfx.addEventListener("change", () => {
  save.settings.sfx = optSfx.checked;
  persistSave();
});
optMusic.addEventListener("change", () => setMusic(optMusic.checked));
optVibrate.addEventListener("change", () => {
  save.settings.vibrate = optVibrate.checked;
  persistSave();
  vibrate(20);
});

function enterForest(newWeaponPath) {
  state.zone = "forest";
  state.zoneWave = 1;
  state.forestNewWeapons = newWeaponPath;
  state.weaponPath = newWeaponPath ? "forest" : "desert";
  state.enemies = [];
  state.projectiles = [];
  state.particles = [];
  state.drops = [];
  bgCache = null;
  if (newWeaponPath) {
    state.unlockedWeaponIndex = 0;
    state.weaponIndex = 0;
  }
  state.ammoStore = FOREST_WEAPONS.map(item => item.ammo);
  state.health = Math.min(100, state.health + 20);
  state.grenades = Math.min(5, state.grenades + 2);
  setWeapon(newWeaponPath ? 0 : Math.min(state.weaponIndex, FOREST_WEAPONS.length - 1), true);
  unlockWeapons();
  const zoneChoice = document.querySelector("#zoneChoice");
  zoneChoice.hidden = true;
  startButton.hidden = false;
  startButton.textContent = "ادخل الغابة";
  startButton.onclick = startWave;
  modal.classList.add("hidden");
  modalStats.textContent = "الغابة المفتوحة — الموجة " + state.wave;
  updateHud();
  startWave();
}

document.querySelector("#keepWeaponsButton").addEventListener("click", () => enterForest(false));
document.querySelector("#forestWeaponsButton").addEventListener("click", () => enterForest(true));

// الـ service worker للنسخة المنشورة على الويب فقط (التطبيق الأصلي مش محتاجه)
if ("serviceWorker" in navigator && !window.Capacitor && location.protocol.indexOf("http") === 0) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

setWeapon(0);
updateHud();
syncMusicButton();
modalStats.textContent = statsLine();
if (window.Ads) Ads.init();
window.__ironFrontierReady = true;
