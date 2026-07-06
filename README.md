# Scroll Runner — YouTube Playables build scaffold

One-button charge-jump auto-runner. Pure HTML5 + Canvas (no engine, no build step).
This is the submission-oriented scaffold; continue development from here in Claude Code.

## Run locally

ES modules require a server (not `file://`):

```bash
cd scroll-runner
python -m http.server 8000
# open http://localhost:8000
```

Space / tap-hold to charge, release to jump. Resize the window (or rotate) — it fills any
viewport, portrait or landscape, and keeps game state.

## Structure

```
scroll-runner/
  index.html          entry; @font-face, full-screen canvas, SDK <script> slot
  src/
    config.js         all tunables (jump model, generation, difficulty, layout)
    bridge.js         Playables SDK wrapper + standalone fallback
    game.js           core: responsive render, physics, generation, loop, boot
  assets/
    sprites/          right/left/jump/idle PNG (trimmed, feet-at-bottom)
    fonts/            press-start-2p.woff2 (OFL, bundled — no external call)
```

Tuning lives in `src/config.js`. The values there are the ones dialed in with the
tuning rig (`d = v · 2·Vy / g`).

## Responsive model (how it stays fair)

Everything is in world **units**; `U` (px/unit) is derived each resize as
`U = min(canvasH / minFieldH, canvasW / minFieldW)`. That guarantees at least
`minFieldW` units of horizontal runway (reaction window) **and** `minFieldH` units
of vertical room on every aspect ratio — extra space becomes sky/runway, never less.
The canvas renders at a low internal resolution (`shortSide`) and CSS-scales up with
`image-rendering: pixelated`, so it fills the screen and stays crisp.

## Playables requirements — status in this scaffold

Met:
- Standards HTML5 / Canvas, no engine, no plugins.
- Self-contained: sprites + font bundled locally, **zero external network calls**.
- Tiny initial load (well under the 30 MB cap).
- Responsive to all aspect ratios; fills viewport; no orientation lock; **state kept on resize**.
- Touch **and** mouse input for all interactions.
- Pause/resume handled (loop halts on `onPause`, saves best; `dt` reset on resume).
- Score via `sendScore`, persistence via `saveData`/`loadData` (localStorage fallback).
- No exit/quit button, no external links, no extra agreement, no in-game sharing, no branding in-canvas.
- No monetization (ads/IAP) — not supported on Playables today.

TODO before submission:
- [ ] Paste the official **ytgame SDK `<script>`** into `index.html` (before the module).
      Get it from the Playables Developer Portal → Getting started. It MUST load before game code.
- [ ] Apply for developer access via the Playables interest form (early access; approval can take weeks).
- [ ] Provide thumbnails in the required aspect ratios + title/description (no branding/logos).
- [ ] Run the official **Test Suite** and test on desktop web, mobile web, Android, iOS.
- [ ] Bundle as a single ZIP for upload.
- [ ] (Optional) audio: gate any sound on `bridge.audioEnabled` / `onAudioEnabledChange`.

Regions at time of writing: US, UK, Canada, Australia, India, Malaysia, Turkey (subject to change).

## Notes

- SDK method names verified against the SDK reference (2026-06). If the SDK changes,
  the wrapper in `bridge.js` is the only place to update — every call is guarded.
- Sprites are anchored feet-at-bottom; `config.spriteH` sets on-canvas height in units.
