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

// bundled jump sample (assets/sounds/jump.wav); falls back to the
// procedural boing until it is fetched + decoded
let jumpRaw = null, jumpBuf = null;

function decodeJump() {
  if (!ctx || jumpBuf || !jumpRaw) return;
  const raw = jumpRaw; jumpRaw = null;          // decodeAudioData detaches the buffer
  try {
    ctx.decodeAudioData(raw, buf => { jumpBuf = buf; }, () => {});
  } catch (_) {}
}

function ensure() {
  if (!bridge.audioEnabled || volume <= 0) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    decodeJump();
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

  // Fetch the bundled jump sample. Call once at boot; failure is fine
  // (the procedural boing below stays as the fallback).
  async preload(url) {
    try {
      const res = await fetch(url);
      jumpRaw = await res.arrayBuffer();
      decodeJump();
    } catch (_) {}
  },

  // jump: play the bundled sample (slight pitch-up with charge);
  // fallback "boing" — pitch snaps up then wobbles down (decaying vibrato)
  jump(t) {
    this.chargeStop();
    const c = ensure(); if (!c) return;
    if (jumpBuf) {
      const src = c.createBufferSource(), g = c.createGain();
      src.buffer = jumpBuf;
      src.playbackRate.value = 0.95 + 0.2 * t;   // fuller charge = slightly higher
      g.gain.value = 0.9;
      src.connect(g); g.connect(master);
      src.start();
      return;
    }
    const t0 = c.currentTime, dur = 0.35;
    const f0 = 170 + 150 * t;                       // bigger charge = higher boing
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f0 * 2.2, t0);
    o.frequency.exponentialRampToValueAtTime(f0, t0 + 0.09);
    const lfo = c.createOscillator(), lg = c.createGain();  // spring wobble
    lfo.type = 'sine'; lfo.frequency.value = 16;
    lg.gain.setValueAtTime(f0 * 0.4, t0);
    lg.gain.exponentialRampToValueAtTime(1, t0 + dur);
    lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.5, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
    lfo.start(t0); lfo.stop(t0 + dur + 0.02);
  },
  land()   { note(150, 0, 0.06, { vol: 0.45, slideTo: 90 }); },
  // "キラーン" — bright ascending sparkle on a successful hop
  sparkle(){
    note(1568, 0,    0.05, { type: 'sine', vol: 0.30 });
    note(2093, 0.05, 0.06, { type: 'sine', vol: 0.28 });
    note(3136, 0.11, 0.24, { type: 'sine', vol: 0.25 });
  },
  // perfect landing = richer, longer sparkle
  perfect(){
    note(1568, 0,    0.05, { type: 'sine', vol: 0.32 });
    note(2093, 0.05, 0.05, { type: 'sine', vol: 0.30 });
    note(2637, 0.10, 0.06, { type: 'sine', vol: 0.28 });
    note(3951, 0.16, 0.30, { type: 'sine', vol: 0.26 });
  },
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
