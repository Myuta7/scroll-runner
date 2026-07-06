// ============================================================
// Scroll Runner — tunables
// All gameplay values live here so tuning stays in one place.
// Units are world "units"; U (px per unit) is derived at runtime.
// ============================================================
export const CONFIG = {
  // --- jump model ---
  g:      40,   // gravity (u/s^2), applied manually
  vyMin:  8,    // jump initial speed at charge 0 (tap)   -> d = v * 2*Vy/g
  vyMax:  24,   // jump initial speed at full charge (high arcs)
  chargeT:1.0,  // seconds to reach full charge (long, readable gauge)
  baseV:  5,    // scroll speed at level 1 (u/s)

  // --- platform generation (units) ---
  wMin:   2.2, wMax: 6.5,   // platform width range (generous at Lv1)
  gapMin: 1.5, gapMax: 2.8, // gap range at Lv1
  dyMax:  1.5,              // max height delta (+/- u)

  // --- difficulty progression (gentle: one level = a small step) ---
  levelEvery: 10,   // platforms cleared per level
  speedMul:   1.03, // scroll multiplier per level
  speedCap:   1.8,  // max multiplier over baseV
  wDecay:     0.12, // platform max width shrink per level
  wFloor:     2.4,  // platform max width never below this
  gapGrow:    0.05, // gap max growth per level
  gapCap:     4.2,  // gap max never above this

  // --- responsive layout (units) ---
  minFieldW: 24,  // guaranteed horizontal units visible (reaction window)
  minFieldH: 18,  // guaranteed vertical units visible (headroom for high arcs)
  playerX:   7,   // player's fixed on-screen X, units from left
  baseTop:   6,   // baseline platform top, units from bottom
  spriteH:   2.6, // player sprite height in units
  tileU:     0.5, // ground tile side in units
  runStep:   1.0, // distance (u) between walk-frame swaps -> cadence scales with speed
  gaugeW:    4.8, // charge gauge width in units (wide + readable)

  // --- internal render resolution (keeps chunky pixel look, then CSS-scales to fill) ---
  shortSide:   240, // low-res short side in px
  maxLongSide: 640, // cap the long side in px
};

// Sweetie-16 palette (shared identity for UI + game)
export const PAL = {
  c00:'#1a1c2c',c01:'#5d275d',c02:'#b13e53',c03:'#ef7d57',c04:'#ffcd75',
  c05:'#a7f070',c06:'#38b764',c07:'#257179',c08:'#29366f',c09:'#3b5dc9',
  c10:'#41a6f6',c11:'#73eff7',c12:'#f4f4f4',c13:'#94b0c2',c14:'#566c86',c15:'#333c57'
};
