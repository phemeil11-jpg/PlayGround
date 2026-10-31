/* POLARIS — bootstrap, room lifecycle, host authority and the Arctic Echo AI. */

import { ArcticScene } from './scene.js';
import { SoundEngine } from './audio.js';
import { RoomLink, roomCode } from './net.js';
import { createDuel, applyAction, redact, appendLog } from './engine.js';
import { chooseAIAction } from './ai.js';
import { UI } from './ui.js';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/* ── room identity ───────────────────────────────────────────── */

const params = new URLSearchParams(location.search);
const joinToken = params.get('join') === '1';
let room = String(params.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
let storedHost = '';
try { storedHost = sessionStorage.getItem('polaris.hostRoom') || ''; } catch {}
let isHost = !joinToken && (!room || storedHost === room);
if (!room) { room = roomCode(); isHost = true; }
if (!isHost && room === storedHost) {
  // An explicit invite link always joins as the guest, even in a duplicated tab.
  isHost = false;
}
if (isHost) {
  try { sessionStorage.setItem('polaris.hostRoom', room); } catch {}
}
const url = new URL(location.href);
url.searchParams.set('room', room);
if (isHost) url.searchParams.delete('join');
else url.searchParams.set('join', '1');
history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);

const you = isHost ? 0 : 1;

function safeGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function safeSet(key, value) { try { localStorage.setItem(key, value); } catch {} }

let myName = (safeGet('polaris.name') || (isHost ? '極夜の主' : '北の挑戦者')).slice(0, 14);
const sanitizedName = (value) => String(value || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 14);

/* ── duel state ──────────────────────────────────────────────── */

function newHostDuel(mode = 'ai', guestName = 'ARCTIC ECHO') {
  return createDuel({
    room,
    mode,
    p0Name: myName,
    p1Name: mode === 'online' ? guestName : 'ARCTIC ECHO',
    p0Tag: 'HOST / 極夜回線',
    p1Tag: mode === 'online' ? 'REMOTE / 通信対戦' : 'HOLOGRAM / 訓練投影',
  });
}

let state = isHost
  ? newHostDuel('ai')
  : createDuel({
    room,
    mode: 'online',
    p0Name: '極夜の主',
    p1Name: myName,
    p0Tag: 'HOST / 極夜回線',
    p1Tag: 'GUEST / 氷原回線',
  });

if (!isHost) {
  state.active = 0;
  state.turn = 1;
}

/* ── presentation state ──────────────────────────────────────── */

const soundOnStored = safeGet('polaris.sound') === '1';
const reduceStored = safeGet('polaris.reduce') === '1' || matchMedia('(prefers-reduced-motion: reduce)').matches;
let soundOn = soundOnStored;
let reduceOn = reduceStored;
let tiltOn = false;
let tiltAttached = false;
let netInfo = { status: 'linking', detail: '回線を探索中' };

const scene = new ArcticScene($('scene'));
const sound = new SoundEngine();
scene.setReduceMotion(reduceOn);
document.documentElement.classList.toggle('reduce-motion', reduceOn);

const ui = new UI({
  onAction: (action) => localAction(action),
  onInvite: () => shareRoom(),
  onRematch: () => requestRematch(),
  onName: (name) => changeName(name),
  onSfx: (name) => sound.play(name),
  onSoundToggle: (next) => toggleSound(next),
  onTiltToggle: (next) => toggleTilt(next),
  onReduceMotion: (next) => setReduce(next),
  onCopyRoom: () => copyRoom(),
  getRoomUrl: () => inviteUrl(),
});

ui.setOptions({ sound: soundOn, tilt: tiltOn, reduceMotion: reduceOn });
ui.setRoom(room);
ui.setNetwork(netInfo);

function meta() {
  return {
    you,
    room,
    options: { sound: soundOn, tilt: tiltOn, reduceMotion: reduceOn },
    network: netInfo,
  };
}

ui.update(state, meta());

if (!isHost) {
  setTimeout(() => ui.toast(`ルーム ${room} のホストを探索しています…`, 'info'), 500);
}

/* ── audio / motion / preferences ────────────────────────────── */

addEventListener('pointerdown', async () => {
  if (soundOn && !sound.enabled) await sound.enable();
}, { capture: true, once: true });

async function toggleSound(next) {
  if (next) {
    soundOn = true;
    safeSet('polaris.sound', '1');
    await sound.enable();
    ui.toast('サウンドを有効にした。', 'info');
  } else {
    soundOn = false;
    safeSet('polaris.sound', '0');
    sound.disable();
    ui.toast('サウンドを停止した。', 'info');
  }
  ui.setOptions({ sound: soundOn });
  return soundOn;
}

function setReduce(next) {
  reduceOn = Boolean(next);
  safeSet('polaris.reduce', reduceOn ? '1' : '0');
  scene.setReduceMotion(reduceOn);
  document.documentElement.classList.toggle('reduce-motion', reduceOn);
  ui.setOptions({ reduceMotion: reduceOn });
}

function tiltHandler(event) {
  if (!tiltOn) return;
  const angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
  let beta = event.beta || 0;
  let gamma = event.gamma || 0;
  if (angle === 90) { const b = beta; beta = gamma; gamma = -b; }
  else if (angle === -90 || angle === 270) { const b = beta; beta = -gamma; gamma = b; }
  const x = clamp(gamma / 26, -1, 1);
  const y = clamp((beta - 42) / 34, -1, 1);
  scene.setTilt(x, y);
}

async function requestMotionPermission() {
  const requests = [];
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    requests.push(DeviceMotionEvent.requestPermission().catch(() => 'denied'));
  }
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    requests.push(DeviceOrientationEvent.requestPermission().catch(() => 'denied'));
  }
  if (!requests.length) return true;
  const results = await Promise.all(requests);
  return results.every((result) => result === 'granted');
}

function attachTilt() {
  if (tiltAttached) return;
  addEventListener('deviceorientation', tiltHandler, true);
  tiltAttached = true;
}

function detachTilt() {
  if (!tiltAttached) return;
  removeEventListener('deviceorientation', tiltHandler, true);
  tiltAttached = false;
  scene.setTilt(0, 0);
}

async function toggleTilt(next) {
  if (!next) {
    tiltOn = false;
    detachTilt();
    safeSet('polaris.tilt', '0');
    ui.toast('傾き視差をオフにした。', 'info');
    ui.setOptions({ tilt: tiltOn });
    return false;
  }
  if (typeof DeviceOrientationEvent === 'undefined') {
    ui.toast('この端末は傾きセンサーに対応していない。', 'warn');
    return false;
  }
  const granted = await requestMotionPermission();
  if (!granted) {
    ui.toast('モーションの許可が必要です。設定から許可してください。', 'warn');
    return false;
  }
  tiltOn = true;
  attachTilt();
  safeSet('polaris.tilt', '1');
  ui.toast('端末を傾けて極夜を覗け。', 'info');
  ui.setOptions({ tilt: tiltOn });
  return true;
}

if (safeGet('polaris.tilt') === '1') {
  const needsPrompt = typeof DeviceOrientationEvent !== 'undefined'
    && typeof DeviceOrientationEvent.requestPermission === 'function';
  if (!needsPrompt && typeof DeviceOrientationEvent !== 'undefined') {
    tiltOn = true;
    attachTilt();
    ui.setOptions({ tilt: tiltOn });
  }
}

/* ── invite / rematch / names ────────────────────────────────── */

function inviteUrl() {
  const link = new URL(location.href);
  link.searchParams.set('room', room);
  link.searchParams.set('join', '1');
  link.hash = '';
  return link.href;
}

async function copyRoom() {
  const text = inviteUrl();
  try {
    await navigator.clipboard.writeText(text);
    ui.toast('招待リンクをコピーした。', 'info');
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
      ui.toast('招待リンクをコピーした。', 'info');
      return true;
    } catch {
      ui.toast(`ルーム ${room} を共有してください。`, 'warn');
      return false;
    }
  }
}

async function shareRoom() {
  const url = inviteUrl();
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ title: 'POLARIS — 極北決闘', text: `ルーム ${room} で極夜の決闘を。`, url });
      return;
    } catch (error) {
      if (error && error.name === 'AbortError') return;
    }
  }
  await copyRoom();
}

function changeName(name) {
  const clean = sanitizedName(name);
  if (!clean) return;
  myName = clean;
  safeSet('polaris.name', clean);
  if (isHost) {
    state.players[0].name = clean;
    appendLog(state, `ホスト名を「${clean}」に変更した。`, 'system');
    if (link) link.name = clean;
    ui.update(state, meta());
    sendSnapshot();
  } else {
    state.players[1].name = clean;
    if (link) link.setName(clean);
    ui.update(state, meta());
    ui.toast('名前を変更した。ホストに同期します。', 'info');
  }
}

function requestRematch() {
  if (isHost) startRematch();
  else {
    if (!link) return;
    link.send({ t: 'requestRematch' });
    ui.toast('ホストに再戦をリクエストした。', 'info');
  }
}

function startRematch() {
  if (!isHost) return;
  aiToken++;
  const online = state.mode === 'online' && guestPeer;
  state = newHostDuel(online ? 'online' : 'ai', state.players[1].name);
  if (online) {
    state.players[1].name = state.players[1].name || '北の挑戦者';
    appendLog(state, '再戦 — 極夜の盤面が再構成された。', 'system');
  }
  ui.update(state, meta());
  sendSnapshot();
  if (state.mode === 'ai' && state.active === 1) scheduleAI();
}

/* ── local / guest actions ───────────────────────────────────── */

function localAction(action) {
  if (!isHost) {
    if (!guestWelcome) {
      ui.toast('ホストに接続中。盤面が届くまで待て。', 'warn');
      ui.abortSend();
      return;
    }
    if (!link || !link.sendAction(action)) {
      ui.toast('回線に再接続中。少し待て。', 'warn');
      ui.abortSend();
    }
    return;
  }
  if (action.type === 'rematch') { startRematch(); return; }
  const result = applyAction(state, 0, action);
  if (!result.ok) {
    ui.toast(result.error || 'その操作はできない。', 'warn');
    ui.abortSend();
    return;
  }
  afterAction();
}

function afterAction() {
  ui.update(state, meta());
  sendSnapshot();
  if (!state.over && state.mode === 'ai' && state.active === 1) scheduleAI();
}

/* ── Arctic Echo ─────────────────────────────────────────────── */

let aiToken = 0;

function scheduleAI() {
  if (!isHost || state.mode !== 'ai' || state.over || state.active !== 1) return;
  const token = ++aiToken;
  setTimeout(() => runAI(token), 820);
}

async function runAI(token) {
  let memory = { turn: 0, spells: 0, traps: 0 };
  while (token === aiToken && state.mode === 'ai' && !state.over && state.active === 1) {
    if (memory.turn !== state.turn) memory = { turn: state.turn, spells: 0, traps: 0 };
    await sleep(700);
    if (token !== aiToken || state.mode !== 'ai' || state.over || state.active !== 1) return;
    const action = chooseAIAction(state, memory);
    let result;
    if (!action || action.type === 'endTurn') {
      result = applyAction(state, 1, { type: 'endTurn' });
    } else {
      result = applyAction(state, 1, action);
      if (!result.ok) {
        result = applyAction(state, 1, { type: 'endTurn' });
      } else {
        if (action.type === 'activateSpell') memory.spells++;
        if (action.type === 'setTrap') memory.traps++;
      }
    }
    if (!result.ok) return;
    ui.update(state, meta());
    sendSnapshot();
    if (state.over) return;
  }
}

/* ── networking ──────────────────────────────────────────────── */

let link = null;
let guestPeer = null;
let lastGuestSeen = 0;
let lastHostAt = 0;
let guestWelcome = false;
let hostLost = false;
let welcomedToast = false;
let linkToast = false;
let reconnectToast = false;

function sendSnapshot() {
  if (!isHost || !link || !guestPeer) return;
  if (!state) return;
  link.sendState(redact(state, 1));
}

function setNet(info) {
  netInfo = { ...netInfo, ...info };
  ui.setNetwork(netInfo);
}

function onStatus(info) {
  setNet({ status: info.status, detail: info.detail || '' });
  if (info.status === 'online' && !linkToast) {
    linkToast = true;
    if (!isHost) ui.toast('ホストのルームを探索中…', 'info');
  }
  if (info.status === 'lost') {
    if (!reconnectToast) {
      reconnectToast = true;
      ui.toast('回線を再接続している…', 'warn');
    }
  }
  if (info.status === 'online') reconnectToast = false;
}

function onOnline() {
  if (!link) return;
  if (isHost) {
    link.presence();
    if (guestPeer) sendSnapshot();
  } else {
    link.join();
  }
}

link = new RoomLink({
  room,
  isHost,
  name: myName,
  onStatus,
  onOnline,
  onMessage: (message) => handleMessage(message),
});

function handleMessage(message) {
  if (isHost) hostMessage(message);
  else guestMessage(message);
}

function hostMessage(message) {
  if (message.t === 'join') {
    acceptGuest(message);
    return;
  }
  if (message.t === 'guestPresence') {
    if (!guestPeer) { acceptGuest(message); return; }
    if (message.from === guestPeer) {
      lastGuestSeen = Date.now();
      if (state.mode !== 'online') {
        state.mode = 'online';
        if (message.name) state.players[1].name = sanitizedName(message.name) || '北の挑戦者';
        ui.update(state, meta());
        sendSnapshot();
      }
    }
    return;
  }
  if (message.from !== guestPeer) return;
  if (message.t === 'action') {
    guestAction(message);
  } else if (message.t === 'requestRematch') {
    // A rematch request is only meaningful once the duel is finished.
    if (state.over) startRematch();
  } else if (message.t === 'name') {
    const clean = sanitizedName(message.name);
    if (!clean) return;
    state.players[1].name = clean;
    appendLog(state, `REMOTE DUELIST は「${clean}」と名乗った。`, 'system');
    ui.update(state, meta());
    sendSnapshot();
  } else if (message.t === 'leave') {
    dropGuest();
  }
}

function acceptGuest(message) {
  const from = message.from;
  if (!from) return;
  if (guestPeer && guestPeer !== from) {
    link.send({ t: 'busy', to: from });
    return;
  }
  const clean = sanitizedName(message.name) || '北の挑戦者';
  const wasHere = guestPeer === from;
  guestPeer = from;
  lastGuestSeen = Date.now();
  if (wasHere && state.mode === 'online') {
    sendSnapshot();
    return;
  }
  aiToken++;

  if (state.over) {
    state = newHostDuel('online', clean);
    appendLog(state, `${clean} がルーム ${room} に接続した。新しい決闘を開始する。`, 'system');
  } else {
    state.mode = 'online';
    state.players[1].name = clean;
    state.players[0].tag = 'HOST / 極夜回線';
    state.players[1].tag = 'REMOTE / 通信対戦';
    appendLog(state, `${clean} がルーム ${room} に接続した。`, 'system');
    appendLog(state, 'ARCTIC ECHO は傍らで静止した。', 'system');
  }
  link.send({ t: 'welcome', name: state.players[0].name });
  link.sendState(redact(state, 1));
  ui.update(state, meta());
  ui.toast(`${clean} が接続した。通信対戦を開始する。`, 'info');
  ui.caption('REMOTE LINK ESTABLISHED');
}

function guestAction(message) {
  if (!message.action) return;
  lastGuestSeen = Date.now();
  const result = applyAction(state, 1, message.action);
  if (!result.ok) {
    link.send({ t: 'error', to: message.from, message: result.error || 'その操作はできない。' });
    return;
  }
  ui.update(state, meta());
  sendSnapshot();
}

function dropGuest() {
  if (!guestPeer) return;
  const oldName = state.players[1].name;
  guestPeer = null;
  lastGuestSeen = 0;
  state.mode = 'ai';
  state.players[1].name = 'ARCTIC ECHO';
  state.players[1].tag = 'HOLOGRAM / 訓練投影';
  appendLog(state, `${oldName} の回線が切れた。ARCTIC ECHO が卓に戻る。`, 'system');
  ui.update(state, meta());
  ui.toast('フレンドの回線が切れた。ホログラムが引き継ぐ。', 'warn');
  if (!state.over && state.active === 1) scheduleAI();
}

function guestMessage(message) {
  if (message.t === 'state' && message.state) {
    adoptGuestState(message.state);
    return;
  }
  if (message.t === 'welcome') {
    guestWelcome = true;
    lastHostAt = Date.now();
    if (!welcomedToast) {
      welcomedToast = true;
      ui.toast('ホストと接続した。盤面を同期している。', 'info');
    }
    return;
  }
  if (message.t === 'error') {
    ui.toast(message.message || 'その操作はできない。', 'warn');
    ui.abortSend();
    return;
  }
  if (message.t === 'busy') {
    ui.toast('このルームはすでに対戦中だ。', 'warn');
  }
}

function adoptGuestState(next) {
  if (!next || !next.players) return;
  const first = !guestWelcome;
  if (first) ui.lastStartedAt = 0;
  state = next;
  guestWelcome = true;
  lastHostAt = Date.now();
  hostLost = false;
  if (!welcomedToast) {
    welcomedToast = true;
    setTimeout(() => ui.toast('ルームの盤面に接続した。', 'info'), 150);
  }
  ui.update(state, meta());
}

link.connect();

setInterval(() => {
  if (!link) return;
  if (isHost) {
    if (link.connected) link.presence();
    if (guestPeer && Date.now() - lastGuestSeen > 15000) dropGuest();
  } else {
    if (link.connected) {
      if (!guestWelcome || Date.now() - lastHostAt > 9000) link.join();
      else link.presence();
    }
    if (guestWelcome && Date.now() - lastHostAt > 13000 && !hostLost) {
      hostLost = true;
      setNet({ status: 'lost', detail: 'ホスト応答待ち' });
      ui.toast('ホストの応答を待っている。回線を再接続中。', 'warn');
    }
  }
}, 4200);

/* Soft presence ping for the guest as soon as the socket is live. */
setTimeout(() => {
  if (!isHost && link.connected && !guestWelcome) link.join();
}, 1200);

/* Expose a tiny debug surface for local verification. */
window.__polaris = {
  get state() { return state; },
  get room() { return room; },
  get isHost() { return isHost; },
  ui,
  link,
};
