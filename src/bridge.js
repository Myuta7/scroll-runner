// ============================================================
// Playables SDK bridge
// Wraps the global `ytgame` SDK so the game runs both inside
// YouTube Playables and standalone (local dev). Every call is
// guarded, so nothing breaks when the SDK is absent.
//
// Verified against the SDK reference (2026-06):
//   ytgame.game.firstFrameReady() / gameReady()
//   ytgame.game.saveData(str) / loadData(): Promise<string>
//   ytgame.engagement.sendScore({ value })
//   ytgame.system.onPause / onResume / isAudioEnabled / onAudioEnabledChange
//   ytgame.IN_PLAYABLES_ENV
// ============================================================

const yt = () => (typeof window !== 'undefined' ? window.ytgame : undefined);
const inEnv = () => {
  const g = yt();
  return !!(g && g.IN_PLAYABLES_ENV);
};

export const bridge = {
  get inPlayables() { return inEnv(); },
  paused: false,
  audioEnabled: true,

  // Register system callbacks. Call once at startup.
  init({ onPause, onResume, onAudio } = {}) {
    const g = yt();
    if (!inEnv() || !g) return;
    try {
      g.system?.onPause?.(() => { this.paused = true;  onPause && onPause(); });
      g.system?.onResume?.(() => { this.paused = false; onResume && onResume(); });
      if (typeof g.system?.isAudioEnabled === 'function') {
        this.audioEnabled = !!g.system.isAudioEnabled();
      }
      g.system?.onAudioEnabledChange?.((on) => {
        this.audioEnabled = !!on; onAudio && onAudio(!!on);
      });
    } catch (_) { /* best-effort */ }
  },

  // MUST be called once the first frame is on screen (before gameReady).
  firstFrameReady() { try { if (inEnv()) yt().game.firstFrameReady(); } catch (_) {} },

  // MUST be called only when the game is actually interactable (no loading screen).
  gameReady() { try { if (inEnv()) yt().game.gameReady(); } catch (_) {} },

  // Send a single-dimension score (integer). No-op standalone.
  sendScore(value) {
    try {
      if (inEnv()) yt().engagement.sendScore({ value: Math.max(0, Math.round(value)) });
    } catch (_) {}
  },

  // Persistent save/load. Falls back to localStorage standalone.
  async save(str) {
    try {
      if (inEnv()) return await yt().game.saveData(str);
      localStorage.setItem('SR_SAVE', str);
    } catch (_) {}
  },
  async load() {
    try {
      if (inEnv()) return await yt().game.loadData();
      return localStorage.getItem('SR_SAVE');
    } catch (_) { return null; }
  },

  // Optional health logging.
  logError()   { try { if (inEnv()) yt().health?.logError?.(); }   catch (_) {} },
  logWarning() { try { if (inEnv()) yt().health?.logWarning?.(); } catch (_) {} },
};
