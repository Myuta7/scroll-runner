// ============================================================
// Scroll Runner — core game
// One-button charge-jump auto-runner. World is in "units";
// the view fills any viewport (portrait or landscape) while
// guaranteeing a minimum visible field, so difficulty stays fair.
// ============================================================
import { CONFIG as C, PAL } from './config.js';
import { bridge } from './bridge.js';
import { sfx } from './audio.js';

const cv  = document.getElementById('game');
const ctx = cv.getContext('2d');

// ---- responsive sizing -------------------------------------------------
let CW = 0, CH = 0;   // internal canvas px (low-res)
let U  = 12;          // px per unit (derived)
let VWU = 32, VHU = 18;

function resize() {
  const vpW = Math.max(1, window.innerWidth);
  const vpH = Math.max(1, window.innerHeight);
  const ar  = vpW / vpH;

  let iw, ih;
  if (ar >= 1) { ih = C.shortSide; iw = Math.round(C.shortSide * ar); }
  else         { iw = C.shortSide; ih = Math.round(C.shortSide / ar); }

  const long = Math.max(iw, ih);
  if (long > C.maxLongSide) { const s = C.maxLongSide / long; iw = Math.round(iw * s); ih = Math.round(ih * s); }

  cv.width = iw; cv.height = ih; CW = iw; CH = ih;
  ctx.imageSmoothingEnabled = false;

  // pick U so BOTH minimum fields are guaranteed; extra space becomes sky/runway
  U   = Math.min(ih / C.minFieldH, iw / C.minFieldW);
  VWU = iw / U;
  VHU = ih / U;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);

// ---- world state -------------------------------------------------------
let platforms = [], pool = [];
let player, cameraX, state, score, best = 0, combo, cleared, level, curV;
let shake = 0, flash = 0, dust = [];
let levelFlash = 0;      // level-up palette flash + label timer
let deadCooldown = 0;    // input lockout right after death (no accidental retry)
let loadProgress = 0;    // 0..1 for the loading screen

// sound volume selector (title screen): OFF / small / medium / large
const VOL_LEVELS = [0, 0.10, 0.22, 0.45];
const VOL_LABELS = ['OFF', 'LOW', 'MID', 'HIGH'];
let volIndex = 2;
let volBtns = [];        // hit rects in internal canvas px, rebuilt each title frame
const sprites = { idle: null, right: null, left: null, jump: null };

const lerp  = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function makePlat() { return { left: 0, right: 0, top: 0, scored: false, active: false }; }
function getPlat()  { return pool.pop() || makePlat(); }
function freePlat(p){ p.active = false; pool.push(p); }

function refreshLevel() {
  const nl = 1 + Math.floor(cleared / C.levelEvery);
  if (state === 'play' && level && nl > level) { levelFlash = 1.2; sfx.levelUp(); }
  level = nl;
  curV  = C.baseV * Math.min(C.speedCap, Math.pow(C.speedMul, level - 1));
}
const effWidthMax = () => Math.max(C.wFloor, C.wMax - (level - 1) * C.wDecay);

// time to descend back to height h2, launching at h1 with vy
function landTime(vy, h1, h2) {
  const disc = vy * vy - 2 * C.g * (h2 - h1);
  if (disc < 0) return null;
  return (vy + Math.sqrt(disc)) / C.g;
}
function reachAt(charge, h1, h2) {
  const vy = lerp(C.vyMin, C.vyMax, charge);
  const t = landTime(vy, h1, h2);
  return t === null ? -1 : curV * t;
}
// landable with a charge no higher than cMaxLand — full-charge demands are unfair
function reachable(h1, gap, h2, width) {
  for (let c = 0; c <= C.cMaxLand + 0.0001; c += 0.02) {
    const d = reachAt(c, h1, h2);
    if (d >= gap && d <= gap + width) return true;
  }
  return false;
}

function spawnNext() {
  const last = platforms[platforms.length - 1];
  const wMax = effWidthMax(), wMin = Math.min(C.wMin, wMax);
  // flat-landing jump distance for a given charge at the current speed
  const dAt = c => curV * 2 * lerp(C.vyMin, C.vyMax, c) / C.g;
  const wideP = Math.min(C.widePMax, C.wideP0 + (level - 1) * C.widePGrow);
  let gap, dy, w, top, tries = 0;
  do {
    // pick how much charge this gap should demand; wide hops mix in more with level
    const [cLo, cHi] = Math.random() < wideP ? C.gapCWide : C.gapCNorm;
    gap = Math.max(C.gapMin, dAt(lerp(cLo, cHi, Math.random())) * C.gapMargin);
    dy  = (Math.random() * 2 - 1) * C.dyMax;
    top = clamp(last.top + dy, C.baseTop - 2.5, C.baseTop + 3);
    w   = lerp(wMin, wMax, Math.random());
    tries++;
  } while (!reachable(last.top, gap, top, w) && tries < 40);
  if (!reachable(last.top, gap, top, w)) {
    for (let gg = C.gapMin; gg <= gap; gg += 0.1) { if (reachable(last.top, gg, top, w)) { gap = gg; break; } }
  }
  const p = getPlat();
  p.left = last.right + gap; p.right = p.left + w; p.top = top;
  p.scored = false; p.active = true; platforms.push(p);
}

function resetRun() {
  platforms.forEach(freePlat); platforms.length = 0;
  cleared = 0; refreshLevel();
  const p0 = getPlat();
  p0.left = -4; p0.right = C.playerX + 8; p0.top = C.baseTop; p0.scored = true; p0.active = true;
  platforms.push(p0);
  player = { worldX: C.playerX, y: C.baseTop, vy: 0, grounded: true, cur: p0, charge: 0, charging: false, squash: 0, jumped: false };
  cameraX = player.worldX - C.playerX;
  score = 0; combo = 0; state = 'play'; shake = 0; flash = 0; levelFlash = 0; dust.length = 0;
  while (platforms[platforms.length - 1].right < cameraX + VWU + 8) spawnNext();
}

const multiplier = () => clamp(1 + Math.floor(combo / 5), 1, 4);

// ---- input -------------------------------------------------------------
function press() {
  sfx.unlock();                                     // user gesture: unlock audio
  if (state === 'loading') return;
  if (state === 'title') { resetRun(); startCharge(); return; }
  if (state === 'dead')  { if (deadCooldown <= 0) { resetRun(); state = 'title'; } return; }  // back to title
  if (player.grounded) startCharge();
}
function startCharge() {
  player.charging = true;
  sfx.chargeStart();
}
function release() {
  if (state === 'play' && player.grounded && player.charging) {
    sfx.jump(player.charge);
    player.vy = lerp(C.vyMin, C.vyMax, player.charge);
    player.grounded = false; player.charging = false; player.cur = null; player.charge = 0;
    player.jumped = true;                    // only a real jump can land
  } else { if (player) player.charging = false; sfx.chargeStop(); }
}
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  // title screen: taps on the volume buttons change volume instead of starting
  if (state === 'title' && volBtns.length) {
    const r = cv.getBoundingClientRect();
    const px = (e.clientX - r.left) * (cv.width / r.width);
    const py = (e.clientY - r.top) * (cv.height / r.height);
    for (const b of volBtns) {
      if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) {
        volIndex = b.i;
        sfx.setVolume(VOL_LEVELS[volIndex]);
        sfx.unlock(); sfx.perfect();   // audible feedback at the new volume
        bridge.save(JSON.stringify({ best, vol: volIndex }));
        return;
      }
    }
  }
  press();
});
window.addEventListener('pointerup', release);
cv.addEventListener('pointercancel', release);
window.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) press(); } });
window.addEventListener('keyup',   e => { if (e.code === 'Space') { e.preventDefault(); release(); } });

// ---- update ------------------------------------------------------------
function step(dt) {
  deadCooldown = Math.max(0, deadCooldown - dt);
  if (state !== 'play') return;
  refreshLevel();

  if (player.grounded && player.charging) {
    player.charge = clamp(player.charge + dt / C.chargeT, 0, 1);
    sfx.chargeLevel(player.charge);
  }

  player.worldX += curV * dt;                 // constant auto-scroll
  cameraX = player.worldX - C.playerX;

  if (player.grounded && player.worldX > player.cur.right) {
    player.grounded = false; player.charging = false; player.cur = null; // walked off the edge
    player.jumped = false;                   // walk-off fall cannot land -> guaranteed drop
    sfx.chargeStop();
  }

  if (!player.grounded) {
    player.vy -= C.g * dt;
    player.y  += player.vy * dt;
    const feet = player.y;
    if (player.vy < 0 && player.jumped) {      // land only while descending, and only off a jump
      const pl = player.worldX - 0.5, pr = player.worldX + 0.5;
      for (const p of platforms) {
        if (!p.active) continue;
        if (pr > p.left && pl < p.right && feet <= p.top && feet > p.top - 1.4) {
          player.y = p.top; player.vy = 0; player.grounded = true; player.cur = p;
          player.squash = 1; onLand(p, player.worldX); break;
        }
      }
    }
    if (player.y < -C.spriteH) { die(); return; } // fell off the bottom edge
  }

  player.squash = Math.max(0, player.squash - dt * 6);
  shake = Math.max(0, shake - dt * 3);
  flash = Math.max(0, flash - dt * 3);
  levelFlash = Math.max(0, levelFlash - dt * 1.2);
  for (const d of dust) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy -= 20 * dt; d.life -= dt; }
  dust = dust.filter(d => d.life > 0);

  while (platforms.length && platforms[0].right < cameraX - 4) freePlat(platforms.shift());
  while (platforms[platforms.length - 1].right < cameraX + VWU + 8) spawnNext();
}

function onLand(p, cx) {
  if (p.scored) return;
  p.scored = true; cleared++;
  const center = (p.left + p.right) / 2, third = (p.right - p.left) / 6;
  const perfect = Math.abs(cx - center) <= third;
  if (perfect) { combo++; flash = 0.6; sfx.perfect(); } else { combo = 0; sfx.sparkle(); }
  score += multiplier();
  if (score > best) best = score;
  shake = Math.min(1, shake + 0.4);
  for (let i = 0; i < 6; i++) dust.push({ x: cx, y: p.top, vx: (Math.random() * 2 - 1) * 4, vy: Math.random() * 3, life: 0.3 + Math.random() * 0.2, c: perfect ? PAL.c04 : PAL.c12 });
}

function die() {
  state = 'dead';
  deadCooldown = 0.4;
  if (score > best) best = score;
  shake = 1;
  sfx.die();
  bridge.sendScore(score);                 // score of THIS play (Playables semantics)
  bridge.save(JSON.stringify({ best, vol: volIndex }));   // persist high score + volume
}

// ---- render ------------------------------------------------------------
const sx = wx => Math.round((wx - cameraX) * U);
const sy = wy => Math.round(CH - wy * U);

// Day-night cycle: sky shifts with level progress
// night -> dawn -> morning -> noon -> evening -> night (repeats every 6 levels)
const SKY_PHASES = [
  ['#1a1c2c', '#29366f', '#333c57'], // night
  ['#29366f', '#5d275d', '#b13e53'], // dawn (早朝)
  ['#3b5dc9', '#41a6f6', '#73eff7'], // morning (朝)
  ['#41a6f6', '#73eff7', '#94b0c2'], // noon (昼)
  ['#5d275d', '#b13e53', '#ef7d57'], // evening (夕方)
].map(ph => ph.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]));
const N_PHASES = SKY_PHASES.length;

function skyColors() {
  // continuous position: whole levels + progress inside the current level
  const prog = (level - 1) + (cleared % C.levelEvery) / C.levelEvery;
  const i = Math.floor(prog) % N_PHASES, j = (i + 1) % N_PHASES;
  const t = prog - Math.floor(prog);
  return SKY_PHASES[i].map((c, k) => {
    const d = SKY_PHASES[j][k];
    return `rgb(${Math.round(lerp(c[0], d[0], t))},${Math.round(lerp(c[1], d[1], t))},${Math.round(lerp(c[2], d[2], t))})`;
  });
}

function pickFrame() {
  if (state !== 'play') return sprites.idle;
  if (!player.grounded) return sprites.jump;
  return (Math.floor(player.worldX / C.runStep) % 2 === 0) ? sprites.right : sprites.left;
}

function render() {
  // sky: three flat bands, colors follow the day-night cycle
  const [skyTop, skyMid, skyLow] = skyColors();
  ctx.fillStyle = skyTop; ctx.fillRect(0, 0, CW, CH * 0.55);
  ctx.fillStyle = skyMid; ctx.fillRect(0, CH * 0.55, CW, CH * 0.20);
  ctx.fillStyle = skyLow; ctx.fillRect(0, CH * 0.75, CW, CH * 0.25);
  // far parallax blocks
  ctx.fillStyle = PAL.c15;
  const bw = Math.round(2.8 * U), by = sy(1.6);
  for (let i = 0; i < 10; i++) {
    const span = CW + bw * 2;
    const bx = ((i * (bw + 40) - cameraX * U * 0.3) % span + span) % span - bw;
    ctx.fillRect(Math.round(bx), by, bw, Math.round(2 * U));
  }

  // dedicated loading screen (before anything is playable)
  if (state === 'loading') { renderLoading(); return; }

  ctx.save();
  if (shake > 0) ctx.translate(Math.round((Math.random() * 2 - 1) * shake * 3), Math.round((Math.random() * 2 - 1) * shake * 3));

  // platforms: thin row of connected square blocks
  const TS = Math.max(3, Math.round(C.tileU * U));
  for (const p of platforms) {
    if (!p.active) continue;
    const x0 = sx(p.left), x1 = sx(p.right), top = sy(p.top);
    ctx.fillStyle = PAL.c15; ctx.fillRect(x0 + 1, top + TS, x1 - x0, 1);
    for (let tx = x0; tx < x1; tx += TS) {
      const tw = Math.min(TS, x1 - tx);
      ctx.fillStyle = PAL.c06; ctx.fillRect(tx, top, tw, TS);
      ctx.fillStyle = PAL.c05; ctx.fillRect(tx, top, tw, 2);
      ctx.fillStyle = PAL.c07; ctx.fillRect(tx, top, 1, TS);
      ctx.fillStyle = PAL.c07; ctx.fillRect(tx, top + TS - 1, tw, 1);
    }
    ctx.fillStyle = PAL.c07; ctx.fillRect(x1 - 1, top, 1, TS);
    const cz = (p.right - p.left) / 6;
    ctx.fillStyle = PAL.c04; ctx.fillRect(sx((p.left + p.right) / 2 - cz), top - 2, Math.max(2, Math.round(cz * 2 * U)), 1);
  }

  for (const d of dust) { ctx.fillStyle = d.c; ctx.fillRect(sx(d.x), sy(d.y), 2, 2); }

  // player
  const sq = player.squash;
  const footY = sy(player.y), midX = sx(player.worldX);
  let gaugeTop = footY - Math.round(C.spriteH * U);
  const img = pickFrame();
  if (img && img.__ready) {
    const h = Math.round(C.spriteH * U * (1 - sq * 0.20));
    const w = Math.round(h * (img.naturalWidth / img.naturalHeight) * (1 + sq * 0.20));
    const dx = Math.round(midX - w / 2), dy = Math.round(footY - h);
    ctx.drawImage(img, dx, dy, w, h);
    gaugeTop = dy;
  } else {
    const pw = 1 * U * (1 + sq * 0.4), ph = 1.4 * U * (1 - sq * 0.35);
    ctx.fillStyle = PAL.c04; ctx.fillRect(Math.round(midX - pw / 2), Math.round(footY - ph), Math.round(pw), Math.round(ph));
    gaugeTop = Math.round(footY - ph);
  }

  // charge gauge (wide bar with frame, above the player)
  if (player.charging) {
    const gw = Math.round(C.gaugeW * U), gh = 5;
    const gx = Math.round(midX - gw / 2), gy = gaugeTop - Math.round(0.7 * U);
    ctx.fillStyle = PAL.c00; ctx.fillRect(gx - 1, gy - 1, gw + 2, gh + 2); // frame
    ctx.fillStyle = PAL.c15; ctx.fillRect(gx, gy, gw, gh);
    const c = player.charge;
    ctx.fillStyle = c < 0.5 ? PAL.c11 : c < 0.85 ? PAL.c04 : PAL.c03;
    ctx.fillRect(gx, gy, Math.round(gw * c), gh);
  }

  ctx.restore();

  if (flash > 0) { ctx.fillStyle = `rgba(255,205,117,${flash * 0.25})`; ctx.fillRect(0, 0, CW, CH); }
  if (levelFlash > 0) { ctx.fillStyle = `rgba(115,239,247,${Math.min(1, levelFlash) * 0.18})`; ctx.fillRect(0, 0, CW, CH); }

  // HUD (scales with canvas)
  const fs = Math.max(7, Math.round(CH * 0.045));
  ctx.font = `${fs}px "PressStart2P", monospace`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = PAL.c12; ctx.fillText(`SCORE ${score}`, 6, 6);
  ctx.fillStyle = PAL.c11; ctx.fillText(`LV ${level}`, 6, 6 + fs + 4);
  const m = multiplier();
  if (m > 1 && state === 'play') { ctx.fillStyle = PAL.c04; ctx.fillText(`x${m}`, 6, 6 + (fs + 4) * 2); }
  ctx.textAlign = 'right'; ctx.fillStyle = PAL.c13; ctx.fillText(`BEST ${best}`, CW - 6, 6); ctx.textAlign = 'left';

  // level-up banner
  if (levelFlash > 0 && state === 'play') {
    ctx.textAlign = 'center';
    ctx.fillStyle = PAL.c11;
    ctx.font = `${fs}px "PressStart2P", monospace`;
    ctx.fillText(`LEVEL ${level}`, CW / 2, Math.round(CH * 0.18));
    ctx.textAlign = 'left';
  }

  if (state === 'title' || state === 'dead') {
    ctx.fillStyle = 'rgba(26,28,44,.72)'; ctx.fillRect(0, 0, CW, CH);
    ctx.textAlign = 'center';
    ctx.fillStyle = PAL.c04; ctx.font = `${Math.round(fs * 1.4)}px "PressStart2P", monospace`;
    ctx.fillText(state === 'dead' ? 'GAME OVER' : 'SCROLL RUNNER', CW / 2, CH * 0.36);
    ctx.font = `${Math.max(6, Math.round(fs * 0.8))}px "PressStart2P", monospace`;
    if (state === 'dead') {
      ctx.fillStyle = PAL.c12; ctx.fillText(`SCORE ${score}`, CW / 2, CH * 0.36 + fs * 2);
      ctx.fillStyle = PAL.c04; ctx.fillText(`HI SCORE ${best}`, CW / 2, CH * 0.36 + fs * 3.2);
      ctx.fillStyle = PAL.c11; ctx.fillText('TAP TO TITLE', CW / 2, CH * 0.36 + fs * 4.6);
    } else {
      ctx.fillStyle = PAL.c04; ctx.fillText(`HI SCORE ${best}`, CW / 2, CH * 0.36 + fs * 2);
      ctx.fillStyle = PAL.c11; ctx.fillText('TAP / SPACE TO START', CW / 2, CH * 0.36 + fs * 3.4);
      renderVolumeButtons(fs);
    }
    ctx.textAlign = 'left';
  }
}

// SOUND: [OFF] [LOW] [MID] [HIGH] — selected one highlighted
function renderVolumeButtons(fs) {
  const bw = Math.round(fs * 3.6), bh = Math.round(fs * 1.7);
  const gap = Math.max(2, Math.round(fs * 0.4));
  const totW = bw * 4 + gap * 3;
  let bx = Math.round((CW - totW) / 2);
  const by = Math.round(CH * 0.36 + fs * 5.4);
  volBtns.length = 0;
  ctx.font = `${Math.max(6, Math.round(fs * 0.6))}px "PressStart2P", monospace`;
  ctx.fillStyle = PAL.c13;
  ctx.fillText('SOUND', CW / 2, by - Math.round(fs * 1.0));
  for (let i = 0; i < 4; i++) {
    const sel = i === volIndex;
    ctx.fillStyle = sel ? PAL.c04 : PAL.c15;
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = sel ? PAL.c00 : PAL.c13;
    ctx.fillText(VOL_LABELS[i], bx + Math.round(bw / 2), by + Math.round(bh / 2 - fs * 0.3));
    volBtns.push({ x: bx, y: by, w: bw, h: bh, i });
    bx += bw + gap;
  }
}

function renderLoading() {
  const fs = Math.max(7, Math.round(CH * 0.045));
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = PAL.c04; ctx.font = `${Math.round(fs * 1.4)}px "PressStart2P", monospace`;
  ctx.fillText('SCROLL RUNNER', CW / 2, CH * 0.36);
  // progress bar
  const bw = Math.round(CW * 0.4), bh = 6;
  const bx = Math.round((CW - bw) / 2), byy = Math.round(CH * 0.36 + fs * 2.4);
  ctx.fillStyle = PAL.c15; ctx.fillRect(bx, byy, bw, bh);
  ctx.fillStyle = PAL.c11; ctx.fillRect(bx, byy, Math.round(bw * loadProgress), bh);
  ctx.fillStyle = PAL.c13; ctx.font = `${Math.max(6, Math.round(fs * 0.7))}px "PressStart2P", monospace`;
  ctx.fillText('LOADING...', CW / 2, byy + bh + 6);
  ctx.textAlign = 'left';
}

// ---- main loop (fixed timestep, pause-aware) ---------------------------
let acc = 0, prev = 0, firstFrameSent = false;
const FIXED = 1 / 120;
function frame(now) {
  if (!prev) prev = now;
  let dt = (now - prev) / 1000; prev = now; dt = Math.min(dt, 0.1);

  if (!bridge.paused) {
    acc += dt; let guard = 0;
    while (acc >= FIXED && guard++ < 8) { step(FIXED); acc -= FIXED; }
  }
  render();

  if (!firstFrameSent) { firstFrameSent = true; bridge.firstFrameReady(); }
  requestAnimationFrame(frame);
}

// ---- asset loading + boot ---------------------------------------------
const LOAD_STEPS = 6; // 4 sprites + save data + font
let loadedSteps = 0;
function stepLoaded() { loadedSteps++; loadProgress = loadedSteps / LOAD_STEPS; }

function loadSprite(name) {
  return new Promise(res => {
    const im = new Image();
    im.onload = () => { im.__ready = true; sprites[name] = im; stepLoaded(); res(); };
    im.onerror = () => { stepLoaded(); res(); }; // missing frame falls back to block
    im.src = `./assets/sprites/${name}.png`;
  });
}

async function boot() {
  resize();
  sfx.preload('./assets/sounds/jump.wav');   // bundled jump SFX (non-blocking)
  bridge.init({
    onPause:  () => { sfx.chargeStop(); bridge.save(JSON.stringify({ best, vol: volIndex })); },
    onResume: () => { prev = 0; },   // avoid a big dt spike after resume
    onAudio:  on => sfx.setEnabled(on),
  });

  resetRun(); state = 'loading';
  requestAnimationFrame(frame);     // loading screen is the first frame

  // restore best score + volume (shown/used on the title screen)
  try {
    const raw = await bridge.load();
    if (raw) {
      const d = JSON.parse(raw);
      if (d && typeof d.best === 'number') best = d.best;
      if (d && typeof d.vol === 'number') volIndex = clamp(Math.round(d.vol), 0, VOL_LEVELS.length - 1);
    }
  } catch (_) {}
  sfx.setVolume(VOL_LEVELS[volIndex]);
  stepLoaded();

  // wait for sprites + font, then signal interactable
  await Promise.all(['idle', 'right', 'left', 'jump'].map(loadSprite));
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (_) {}
  stepLoaded();
  loadProgress = 1;

  state = 'title';
  bridge.gameReady();               // interactable exactly now
}

boot();
