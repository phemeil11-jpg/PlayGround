import { AudioEngine } from './audio.js';
import { FX } from './fx.js';
import { DuelEngine } from './engine.js';
import { DuelUI } from './ui.js';
import { cardBackSVG, avatarSVG, eyeSVG } from './art.js';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const hasMotionPermissionApi = () => typeof DeviceOrientationEvent !== 'undefined'
  && typeof DeviceOrientationEvent.requestPermission === 'function';

const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const store = {
  get(key, fallback = null) {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
  },
};

class MotionController {
  constructor() {
    this.enabled = false;
    this.sensorSeen = false;
    this.baseline = null;
    this.fallback = false;
    this.boundOrient = this.onOrient.bind(this);
    this.boundPointer = this.onPointer.bind(this);
    this.listeners = new Set();
  }

  onChange(fn) { this.listeners.add(fn); }
  emit() { for (const fn of this.listeners) fn(this.enabled); }

  async enable() {
    if (this.enabled) return { ok: true };
    if (hasMotionPermissionApi()) {
      try {
        const result = await DeviceOrientationEvent.requestPermission();
        if (result !== 'granted') {
          this.enabled = false;
          this.emit();
          return { ok: false, reason: 'denied' };
        }
      } catch {
        this.enabled = false;
        this.emit();
        return { ok: false, reason: 'denied' };
      }
    }
    window.addEventListener('deviceorientation', this.boundOrient, true);
    window.addEventListener('pointermove', this.boundPointer, { passive: true });
    this.enabled = true;
    this.sensorSeen = false;
    this.baseline = null;
    this.fallback = false;
    document.documentElement.classList.add('tilt-on');
    setTimeout(() => {
      if (!this.sensorSeen && this.enabled) {
        this.fallback = true;
        this.setScene(0, 0);
      }
    }, 1600);
    this.emit();
    return { ok: true };
  }

  disable() {
    window.removeEventListener('deviceorientation', this.boundOrient, true);
    window.removeEventListener('pointermove', this.boundPointer);
    this.enabled = false;
    this.sensorSeen = false;
    this.fallback = false;
    this.baseline = null;
    document.documentElement.classList.remove('tilt-on');
    document.documentElement.style.setProperty('--tilt-x', '0deg');
    document.documentElement.style.setProperty('--tilt-y', '0deg');
    document.documentElement.style.setProperty('--tilt-px', '0px');
    document.documentElement.style.setProperty('--tilt-py', '0px');
    this.emit();
  }

  setScene(x, y) {
    document.documentElement.style.setProperty('--tilt-x', `${x.toFixed(2)}deg`);
    document.documentElement.style.setProperty('--tilt-y', `${y.toFixed(2)}deg`);
    document.documentElement.style.setProperty('--tilt-px', `${(y * -1.6).toFixed(2)}px`);
    document.documentElement.style.setProperty('--tilt-py', `${(x * 1.2).toFixed(2)}px`);
  }

  onOrient(event) {
    if (!this.enabled) return;
    if (event.beta == null && event.gamma == null) return;
    this.sensorSeen = true;
    this.fallback = false;
    if (!this.baseline) {
      this.baseline = { beta: event.beta || 0, gamma: event.gamma || 0 };
      return;
    }
    const dy = clamp((event.gamma || 0) - this.baseline.gamma, -24, 24);
    const dx = clamp((event.beta || 0) - this.baseline.beta, -20, 20);
    this.setScene(dx * -0.24, dy * 0.28);
  }

  onPointer(event) {
    if (!this.enabled || !this.fallback) return;
    const nx = (event.clientX / window.innerWidth - 0.5) * 2;
    const ny = (event.clientY / window.innerHeight - 0.5) * 2;
    this.setScene(ny * -1.6, nx * 2.4);
  }
}

const audio = new AudioEngine();
const engine = new DuelEngine();
const fx = new FX(document.getElementById('fx'), document.getElementById('fx-layer'));
const motion = new MotionController();

const title = document.getElementById('title-screen');
const helpModal = document.getElementById('help-modal');
const helpButtons = [document.getElementById('help-btn'), document.getElementById('help-title-btn')];
const soundButtons = [document.getElementById('sound-btn'), document.getElementById('title-sound')];
const tiltButtons = [document.getElementById('tilt-btn'), document.getElementById('title-tilt')];
const tiltNote = document.getElementById('tilt-note');
const playBtn = document.getElementById('play-btn');
const shell = document.getElementById('duel-shell');

let tiltPref = store.get('duel-tilt', '0') === '1';
let wakeLock = null;

const ui = new DuelUI({
  engine,
  fx,
  audio,
  motion,
  onExit: () => showTitle(),
  onRematch: () => {
    if (!audio.muted) audio.startAmbient();
  },
});

/* -------------------------------------------------------------------- */
/* Decorative bits                                                       */
/* -------------------------------------------------------------------- */

document.querySelectorAll('.float-card').forEach((el, i) => {
  el.innerHTML = cardBackSVG(`float${i}`);
});
document.getElementById('title-eye').innerHTML = eyeSVG('title');
document.getElementById('mid-eye').innerHTML = eyeSVG('boardEye', 'mid');
const playerAvatar = document.getElementById('avatar-player');
const aiAvatar = document.getElementById('avatar-ai');
if (playerAvatar) playerAvatar.innerHTML = avatarSVG('player', 'player');
if (aiAvatar) aiAvatar.innerHTML = avatarSVG('ai', 'ai');

/* -------------------------------------------------------------------- */
/* Audio / tilt / help UI                                                */
/* -------------------------------------------------------------------- */

function syncSound() {
  for (const btn of soundButtons) {
    if (!btn) continue;
    btn.classList.toggle('on', !audio.muted);
    btn.setAttribute('aria-pressed', String(!audio.muted));
    const label = btn.querySelector('.tool-label') || btn;
    if (btn.id === 'title-sound') btn.textContent = audio.muted ? 'SOUND OFF' : 'SOUND ON';
  }
}

function syncTilt() {
  for (const btn of tiltButtons) {
    if (!btn) continue;
    btn.classList.toggle('on', motion.enabled);
    btn.setAttribute('aria-pressed', String(motion.enabled));
    if (btn.id === 'title-tilt') btn.textContent = motion.enabled ? 'TILT ON' : 'TILT OFF';
    btn.title = motion.enabled ? 'Motion tilt enabled' : 'Enable motion tilt';
  }
}

async function toggleTilt() {
  audio.resume();
  audio.play('ui');
  if (motion.enabled) {
    motion.disable();
    tiltPref = false;
    store.set('duel-tilt', '0');
    syncTilt();
    ui.toast('Motion tilt disabled.');
    return;
  }
  const result = await motion.enable();
  if (result.ok) {
    tiltPref = true;
    store.set('duel-tilt', '1');
    syncTilt();
    ui.toast(motion.sensorSeen ? 'Tilt enabled \u2014 move your device.' : 'Tilt enabled. On a phone, tilt to look around.');
  } else {
    tiltPref = false;
    store.set('duel-tilt', '0');
    syncTilt();
    ui.toast(result.reason === 'denied' ? 'Motion access was not granted. Tilt stays off.' : 'Tilt is unavailable on this device.');
  }
}

function toggleSound() {
  audio.resume();
  const muted = audio.toggle();
  syncSound();
  if (!muted) {
    audio.play('ui');
    if (shell.classList.contains('on')) audio.startAmbient();
  }
  ui.toast(muted ? 'Sound off.' : 'Sound on.');
}

for (const btn of soundButtons) btn?.addEventListener('click', toggleSound);
for (const btn of tiltButtons) btn?.addEventListener('click', toggleTilt);

function openHelp() {
  audio.play('ui');
  helpModal.hidden = false;
}
function closeHelp() {
  helpModal.hidden = true;
  audio.play('ui');
}
for (const btn of helpButtons) btn?.addEventListener('click', openHelp);
document.getElementById('help-close')?.addEventListener('click', closeHelp);
helpModal?.addEventListener('click', (event) => {
  if (event.target === helpModal) closeHelp();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (!helpModal.hidden) closeHelp();
    else if (ui.sel || ui.pending) ui.clearSelection();
  }
});

/* -------------------------------------------------------------------- */
/* Screens                                                               */
/* -------------------------------------------------------------------- */

async function startDuel() {
  audio.resume();
  audio.play('ui');
  if (!audio.muted) audio.startAmbient();
  if (hasMotionPermissionApi()) {
    tiltNote.textContent = 'iOS requests motion access when you turn on Tilt.';
  } else if (IS_IOS) {
    tiltNote.textContent = 'Tilt uses your device orientation when available.';
  }
  title.classList.add('hide');
  shell.classList.add('on');
  document.body.classList.add('in-duel');
  ui.start();
  requestWakeLock();
  if (tiltPref && !motion.enabled) {
    const pending = motion.enable();
    pending.then((result) => {
      if (result.ok) syncTilt();
      else {
        tiltPref = false;
        store.set('duel-tilt', '0');
        syncTilt();
        ui.toast('Motion access was not granted. Tilt stays off.');
      }
    });
  }
}

function showTitle() {
  shell.classList.remove('on');
  title.classList.remove('hide');
  document.body.classList.remove('in-duel', 'ai-turn');
  ui.showHint('');
  audio.stopAmbient();
  releaseWakeLock();
  syncTilt();
}

playBtn?.addEventListener('click', () => {
  startDuel();
});

/* Wake lock keeps the duel visible on phones while you think. */
async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch { /* ignore */ }
}
function releaseWakeLock() {
  try { wakeLock?.release(); } catch { /* ignore */ }
  wakeLock = null;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && shell.classList.contains('on') && !audio.muted) audio.startAmbient();
  if (document.visibilityState === 'visible' && shell.classList.contains('on')) requestWakeLock();
});

/* -------------------------------------------------------------------- */
/* Boot                                                                  */
/* -------------------------------------------------------------------- */

syncSound();
syncTilt();
if (IS_IOS && hasMotionPermissionApi()) {
  tiltNote.textContent = 'iOS will ask for motion access when you enable Tilt.';
}
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.body.classList.add('reduced-motion');
}

/* Signal that the title screen has painted, so capture tooling can wait for a
   stable frame before acting. Purely additive; it changes no visible state. */
requestAnimationFrame(() => {
  requestAnimationFrame(() => document.documentElement.classList.add('ui-ready'));
});

// Lightweight debug surface used by automated visual checks.
window.__DUEL__ = {
  engine,
  ui,
  motion,
  audio,
  start: startDuel,
  state: () => engine.state,
  showcase: () => {
    startDuel();
    const st = engine.state;
    const take = (side, id) => {
      const p = st.players[side];
      let idx = p.deck.findIndex((c) => c.id === id);
      if (idx >= 0) return p.deck.splice(idx, 1)[0];
      idx = p.hand.findIndex((c) => c.id === id);
      if (idx >= 0) return p.hand.splice(idx, 1)[0];
      return null;
    };
    const place = (side, zone, ids) => {
      st.players[side][zone] = Array(5).fill(null).map((_, i) => take(side, ids[i]) || null);
    };
    place('player', 'monsters', ['solar-paladin', 'azure-serpent', 'obsidian-mage', 'sandstone-golem', 'celestial-anubis']);
    place('ai', 'monsters', ['crimson-warlord', 'night-panther', 'iron-colossus', 'void-sorcerer', 'colossus-titan']);
    place('player', 'spells', ['mirror-barrier', 'karmic-reflector', 'rune-war', null, null]);
    place('ai', 'spells', ['mirror-barrier', 'abyss-trap-hole', 'aegis-prayer', null, null]);
    st.players.player.monsters[4].position = 'defense';
    st.players.ai.monsters[3].position = 'defense';
    st.players.player.spells[0].faceDown = true;
    st.players.player.spells[1].faceDown = true;
    st.players.ai.spells[0].faceDown = true;
    st.players.ai.spells[1].faceDown = true;
    st.players.player.lp = 6400;
    st.players.ai.lp = 3200;
    st.turn = 7;
    st.phase = 'battle';
    st.active = 'player';
    ui.renderAll();
    ui.showBanner('BATTLE PHASE', 'SHOWCASE', 'violet', 2000);
  },
};
