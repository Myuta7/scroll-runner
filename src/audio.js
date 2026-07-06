// ============================================================
// Procedural sound effects (Web Audio, no assets).
// All playback is gated on bridge.audioEnabled — required by
// Playables (isAudioEnabled / onAudioEnabledChange).
// The AudioContext is created/resumed lazily on a user gesture.
// ============================================================
import { bridge } from './bridge.js';

let ctx = null, master = null;
let chargeOsc = null, chargeGain = null;
let volume = 0.22;   // user-selected master volume (0 = sound off)

function ensure() {
  if (!bridge.audioEnabled || volume <= 0) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') { try { ctx.resume(); } catch (_) {} }
  return ctx;
}

// One enveloped note. `at` seconds from now, optional pitch slide over `dur`.
function note(freq, at, dur, { type = 'square', vol = 0.4, slideTo = 0 } = {}) {
  const c = ensure(); if (!c) return;
  const t0 = c.currentTime + at;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

export const sfx = {
  // Call on the first user gesture so iOS/Chrome unlock the context.
  unlock() { ensure(); },

  // Rising drone while the jump charges; pitch follows charge level.
  chargeStart() {
    const c = ensure(); if (!c || chargeOsc) return;
    chargeOsc = c.createOscillator(); chargeGain = c.createGain();
    chargeOsc.type = 'triangle';
    chargeOsc.frequency.value = 160;
    chargeGain.gain.value = 0.10;
    chargeOsc.connect(chargeGain); chargeGain.connect(master);
    chargeOsc.start();
  },
  chargeLevel(t) {
    if (chargeOsc && ctx) chargeOsc.frequency.setTargetAtTime(160 + 520 * t, ctx.currentTime, 0.02);
  },
  chargeStop() {
    if (!chargeOsc) return;
    try { chargeOsc.stop(); } catch (_) {}
    try { chargeOsc.disconnect(); chargeGain.disconnect(); } catch (_) {}
    chargeOsc = chargeGain = null;
  },

  jump(t)  { this.chargeStop(); note(240 + 220 * t, 0, 0.12, { vol: 0.5, slideTo: 420 + 220 * t }); },
  land()   { note(150, 0, 0.06, { vol: 0.45, slideTo: 90 }); },
  perfect(){ note(660, 0, 0.06, { vol: 0.35 }); note(990, 0.06, 0.10, { vol: 0.35 }); },
  levelUp(){ note(523, 0, 0.08, { vol: 0.4 }); note(659, 0.09, 0.08, { vol: 0.4 }); note(784, 0.18, 0.16, { vol: 0.4 }); },
  die()    { this.chargeStop(); note(300, 0, 0.5, { type: 'sawtooth', vol: 0.35, slideTo: 40 }); },

  // Playables audio toggle (bridge.init onAudio).
  setEnabled(on) {
    if (!on) { this.chargeStop(); if (ctx) { try { ctx.suspend(); } catch (_) {} } }
    else if (ctx) { try { ctx.resume(); } catch (_) {} }
  },

  // User-selected master volume (title-screen selector). 0 mutes everything.
  setVolume(v) {
    volume = v;
    if (master) master.gain.value = v;
    if (v <= 0) this.chargeStop();
  },
};
