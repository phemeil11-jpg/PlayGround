// ARCTIC DUEL — boot, host authority, online room wiring, ECHO turns.

import { DuelEngine, DuelError } from './engine.js';
import { aiChoose, aiTake } from './ai.js';
import { Net } from './net.js';
import { GameUI } from './ui.js';

const ROOM_KEY = 'arcticduel.room.v1';
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

let ui = null;
let net = null;
let engine = null;
let guestState = null;
let role = 'host';
let mySide = 'p1';
let opponentKind = 'echo';
let humanConnected = false;
let guestName = 'ECHO';
let currentRoom = '';
let ownRoom = '';
let name = '';
let aiTimer = null;
let aiBusy = false;
let joinTimer = null;
let localNoticeShown = false;
let tiltOn = false;
let tiltSeen = false;
let snowFrame = null;

function safeLocalGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeLocalSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* private mode */ }
}

function makeRoom() {
  let code = '';
  for (let i = 0; i < 4; i += 1) code += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
  return code;
}

function loadRoom() {
  const existing = safeLocalGet(ROOM_KEY);
  if (existing && /^[A-Z0-9]{4,6}$/.test(existing)) return existing;
  const room = makeRoom();
  safeLocalSet(ROOM_KEY, room);
  return room;
}

function normalizeRoom(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function randomSeed() {
  return (Math.floor(Math.random() * 0xffffffff) ^ Date.now()) >>> 0;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function copyRoom() {
  const code = currentRoom || ownRoom;
  copyText(code).then(ok => {
    ui.toast(ok ? `ルームコード ${code} をコピーしました。` : `ルームコードは ${code} です。`);
  });
}

function setNetwork(info) {
  ui.setNetwork(info);
  if (info.state === 'local' && role === 'host' && !localNoticeShown) {
    localNoticeShown = true;
    ui.toast('P2Pシグナリングに接続できません。同じブラウザの別タブとはローカル通信で対戦できます。', 4300);
  }
}

function stopAi() {
  clearTimeout(aiTimer);
  aiTimer = null;
  aiBusy = false;
}

function scheduleAi(delay = 760) {
  clearTimeout(aiTimer);
  aiTimer = null;
  if (role !== 'host' || humanConnected || !engine || engine.s.winner) return;
  if (engine.s.active !== 'p2') return;
  aiTimer = setTimeout(runAiStep, delay);
}

function runAiStep() {
  aiTimer = null;
  if (aiBusy) return;
  if (role !== 'host' || humanConnected || !engine || engine.s.winner) return;
  if (engine.s.active !== 'p2') return;
  aiBusy = true;
  let choice = null;
  try {
    choice = aiChoose(engine, 'p2');
  } catch (error) {
    console.warn('ECHO could not choose', error);
  }
  if (!choice || choice.type === 'none') {
    aiBusy = false;
    return;
  }
  try {
    aiTake(engine, 'p2', choice);
  } catch (error) {
    console.warn('ECHO action rejected', error);
    try {
      if (engine.s.phase === 'main' || engine.s.phase === 'battle') engine.endTurn('p2');
    } catch { /* let the host resync */ }
  }
  aiBusy = false;
  renderHost();
  scheduleAi(720);
}

function renderHost(options = {}) {
  if (role !== 'host' || !engine) return;
  opponentKind = humanConnected ? 'human' : 'echo';
  ui.setContext({ mySide: 'p1', role: 'host', opponentKind });
  ui.render(engine.s, {
    mySide: 'p1',
    role: 'host',
    opponentKind,
    animate: options.animate !== false,
  });
  if (net) net.broadcastState(engine.snapshotFor('p2'));
}

function startNewDuel({ first = null, announce = false } = {}) {
  if (role !== 'host') return;
  stopAi();
  const firstSide = first || (humanConnected ? 'p1' : 'p2');
  engine = new DuelEngine({
    seed: randomSeed(),
    names: { p1: name, p2: humanConnected ? guestName : 'ECHO' },
    first: firstSide,
    matchId: `arctic-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
  });
  ui.hideGameOver();
  renderHost({ animate: false });
  setTimeout(() => ui.showTurnBanner(firstSide === 'p1' ? 'YOUR TURN' : 'ENEMY TURN'), 160);
  if (announce) ui.toast('新しいデュエルを開始しました。');
  scheduleAi(900);
}

function guestWelcome(payload) {
  if (!payload || role !== 'guest') return;
  clearTimeout(joinTimer);
  joinTimer = null;
  humanConnected = true;
  mySide = 'p2';
  opponentKind = 'human';
  ui.setContext({ mySide: 'p2', role: 'guest', opponentKind: 'human' });
  ui.setRoom(currentRoom);
  ui.setNetwork({ state: 'guest-live', detail: '', role: 'guest', room: currentRoom });
  ui.nodes.myRoom.hidden = false;
  ui.toast(payload.hostName ? `${payload.hostName} のルームに入室しました。` : 'ルームに入室しました。', 2500);
  if (payload.state) applyGuestState(payload.state, { transport: payload.transport });
}

function applyGuestState(state, meta) {
  if (!state || role !== 'guest') return;
  guestState = state;
  mySide = 'p2';
  opponentKind = 'human';
  ui.setContext({ mySide: 'p2', role: 'guest', opponentKind: 'human' });
  ui.setRoom(currentRoom);
  ui.render(state, { mySide: 'p2', role: 'guest', opponentKind: 'human' });
  ui.nodes.myRoom.hidden = false;
}

function handleGuestDisconnect(message) {
  if (role !== 'guest') return;
  ui.toast(message || '接続が切れました。自分の部屋に戻ります。', 3000);
  setTimeout(() => {
    if (role === 'guest') startHostRoom({ announce: true });
  }, 1300);
}

function handleAutoGuest() {
  if (role !== 'host') return;
  stopAi();
  role = 'guest';
  mySide = 'p2';
  opponentKind = 'human';
  guestState = null;
  humanConnected = true;
  currentRoom = ownRoom;
  ui.setContext({ mySide: 'p2', role: 'guest', opponentKind: 'human' });
  ui.setRoom(ownRoom);
  ui.setNetwork({ state: 'connecting', detail: 'existing room', role: 'guest', room: ownRoom });
  ui.nodes.myRoom.hidden = false;
  ui.toast('このブラウザで開いている既存の部屋に参加しています。', 2600);
}

function failJoin(message) {
  if (role !== 'guest') return;
  clearTimeout(joinTimer);
  joinTimer = null;
  if (net) {
    net.close();
    net = null;
  }
  role = 'host';
  startHostRoom();
  ui.openJoin();
  ui.showJoinError(message || '入室できませんでした。');
  ui.toast(message || '入室できませんでした。', 3000);
}

function hostCallbacks() {
  return {
    onState: (state, meta) => applyGuestState(state, meta),
    onWelcome: payload => guestWelcome(payload),
    onStatus: info => setNetwork(info),
    onAction: payload => handleRemoteAction(payload.action),
    onHumanJoin: ({ name: joined }) => {
      humanConnected = true;
      guestName = joined || 'CHALLENGER';
      opponentKind = 'human';
      stopAi();
      ui.toast(`${guestName} が入室しました。デュエルを開始します。`, 2800);
      startNewDuel({ first: 'p1' });
    },
    onHumanLeave: ({ name: left }) => {
      humanConnected = false;
      guestName = 'ECHO';
      opponentKind = 'echo';
      if (engine) engine.s.names.p2 = 'ECHO';
      renderHost({ animate: false });
      scheduleAi(620);
      ui.toast(`${left || '対戦相手'} が退室しました。エコーが引き継ぎます。`, 3000);
    },
    onJoinFailed: message => {
      if (role === 'guest') failJoin(message);
      else ui.toast(message);
    },
    onDisconnected: message => handleGuestDisconnect(message),
    onAutoGuest: () => handleAutoGuest(),
  };
}

function guestCallbacks() {
  return {
    onState: (state, meta) => applyGuestState(state, meta),
    onWelcome: payload => guestWelcome(payload),
    onStatus: info => setNetwork(info),
    onAction: () => {},
    onHumanJoin: () => {},
    onHumanLeave: () => {},
    onJoinFailed: message => failJoin(message),
    onDisconnected: message => handleGuestDisconnect(message),
    onAutoGuest: () => {},
  };
}

function startHostRoom({ announce = false } = {}) {
  stopAi();
  clearTimeout(joinTimer);
  joinTimer = null;
  guestState = null;
  if (net) {
    net.close();
    net = null;
  }
  role = 'host';
  mySide = 'p1';
  humanConnected = false;
  guestName = 'ECHO';
  opponentKind = 'echo';
  currentRoom = ownRoom;
  ui.setContext({ mySide: 'p1', role: 'host', opponentKind: 'echo' });
  ui.setRoom(ownRoom);
  ui.setNetwork({ state: 'connecting', detail: '', role: 'host', room: ownRoom });
  ui.nodes.myRoom.hidden = true;

  net = new Net({ room: ownRoom, name, role: 'host', ...hostCallbacks() });
  net.startHost();
  startNewDuel({ first: 'p2' });
  if (announce) ui.toast('自分の部屋に戻りました。', 2200);
}

function startGuestRoom(code) {
  stopAi();
  clearTimeout(joinTimer);
  if (net) {
    net.close();
    net = null;
  }
  role = 'guest';
  mySide = 'p2';
  opponentKind = 'human';
  guestState = null;
  currentRoom = code;
  ui.setContext({ mySide: 'p2', role: 'guest', opponentKind: 'human' });
  ui.setRoom(code);
  ui.setNetwork({ state: 'connecting', detail: '', role: 'guest', room: code });
  ui.nodes.myRoom.hidden = false;
  ui.toast(`ルーム ${code} に接続しています。`, 2400);

  net = new Net({ room: code, name, role: 'guest', ...guestCallbacks() });
  net.startGuest();
  joinTimer = setTimeout(() => {
    if (role === 'guest' && !guestState) failJoin('ホストから応答がありません。');
  }, 14000);
}

function handleRemoteAction(action) {
  if (!action || !engine) return;
  if (action.type === 'restart') {
    startNewDuel({ first: 'p1', announce: true });
    return;
  }
  if (engine.s.winner) {
    renderHost({ animate: false });
    return;
  }
  if (action.type === 'surrender') {
    try { engine.finish('p1', '投了'); } catch { /* ignore */ }
    renderHost();
    return;
  }
  if (engine.s.active !== 'p2') {
    renderHost({ animate: false });
    return;
  }
  try {
    switch (action.type) {
      case 'summon': engine.normalSummon('p2', action.handUid, action.zone, action.position); break;
      case 'spell': engine.activateSpell('p2', action.handUid, action.targetUid); break;
      case 'attack': engine.attack('p2', action.attackerUid, action.targetUid); break;
      case 'changePosition': engine.changePosition('p2', action.uid); break;
      case 'nextPhase': engine.nextPhase('p2'); break;
      case 'endTurn': engine.endTurn('p2'); break;
      default: break;
    }
  } catch (error) {
    if (error instanceof DuelError) ui.toast(error.message);
    else console.warn('Remote action failed', error);
  }
  renderHost();
  scheduleAi(620);
}

function applyLocalAction(action) {
  if (!engine || !action) return;
  if (action.type === 'restart') {
    startNewDuel({ first: humanConnected ? 'p1' : 'p2', announce: true });
    return;
  }
  if (action.type === 'home') {
    if (role === 'guest') startHostRoom({ announce: true });
    else startNewDuel({ first: humanConnected ? 'p1' : 'p2', announce: true });
    return;
  }
  if (engine.s.winner) return;
  try {
    switch (action.type) {
      case 'summon': engine.normalSummon('p1', action.handUid, action.zone, action.position); break;
      case 'spell': engine.activateSpell('p1', action.handUid, action.targetUid); break;
      case 'attack': engine.attack('p1', action.attackerUid, action.targetUid); break;
      case 'changePosition': engine.changePosition('p1', action.uid); break;
      case 'nextPhase': engine.nextPhase('p1'); break;
      case 'endTurn': engine.endTurn('p1'); break;
      case 'surrender': engine.finish('p2', '投了'); break;
      default: break;
    }
  } catch (error) {
    if (error instanceof DuelError) ui.toast(error.message);
    else console.warn('Local action failed', error);
    return;
  }
  renderHost();
  scheduleAi(620);
}

function intent(action) {
  if (role === 'guest') {
    if (action.type === 'home') {
      startHostRoom({ announce: true });
      return;
    }
    if (!net) {
      ui.toast('接続がありません。自分の部屋に戻ります。');
      startHostRoom();
      return;
    }
    if (action.type !== 'restart' && action.type !== 'surrender') {
      if (!guestState || guestState.winner) return;
      if (guestState.active !== 'p2') {
        ui.toast('相手のターンです。');
        return;
      }
    }
    if (net.sendAction(action)) {
      if (action.type === 'restart') ui.toast('再戦を要求しました。', 1900);
      if (action.type === 'surrender') ui.toast('投了を送信しました。', 1900);
    } else {
      ui.toast('送信できませんでした。接続を確認してください。');
    }
    return;
  }
  applyLocalAction(action);
}

function joinSubmit(raw) {
  const code = normalizeRoom(raw);
  if (code.length < 4) {
    ui.showJoinError('4文字以上のルームコードを入力してください。');
    return;
  }
  if (code === ownRoom) {
    ui.showJoinError('それは自分の部屋のコードです。');
    return;
  }
  if (code === currentRoom && role === 'guest') {
    ui.showJoinError('すでにこの部屋に参加しています。');
    return;
  }
  ui.closeJoin();
  startGuestRoom(code);
}

function returnToOwnRoom() {
  if (role === 'guest') startHostRoom({ announce: true });
  else ui.toast('すでに自分の部屋にいます。', 1800);
}

function bindInterface() {
  document.getElementById('copy-room').addEventListener('click', copyRoom);
  document.getElementById('side-copy').addEventListener('click', copyRoom);
  document.getElementById('open-join').addEventListener('click', () => ui.openJoin());
  document.getElementById('side-join').addEventListener('click', () => ui.openJoin());
  document.getElementById('my-room').addEventListener('click', returnToOwnRoom);
  document.getElementById('over-again').addEventListener('click', () => {
    ui.hideGameOver();
    intent({ type: 'restart' });
  });
  document.getElementById('over-room').addEventListener('click', () => {
    ui.hideGameOver();
    intent({ type: 'home' });
  });
  document.getElementById('tilt-btn').addEventListener('click', toggleTilt);
}

function resetTilt() {
  document.documentElement.style.setProperty('--tilt-x', '0');
  document.documentElement.style.setProperty('--tilt-y', '0');
}

function tiltHandler(event) {
  if (event.gamma == null && event.beta == null) return;
  tiltSeen = true;
  const x = Math.max(-1, Math.min(1, (event.gamma || 0) / 38));
  const y = Math.max(-1, Math.min(1, ((event.beta || 45) - 45) / 42));
  document.documentElement.style.setProperty('--tilt-x', x.toFixed(3));
  document.documentElement.style.setProperty('--tilt-y', y.toFixed(3));
}

async function toggleTilt() {
  if (tiltOn) {
    tiltOn = false;
    window.removeEventListener('deviceorientation', tiltHandler, true);
    resetTilt();
    ui.setTiltState('傾き', false);
    ui.toast('傾き操作をオフにしました。', 1600);
    return;
  }
  if (typeof window.DeviceOrientationEvent === 'undefined') {
    ui.toast('この端末は傾きセンサーに対応していません。', 2400);
    return;
  }
  try {
    if (typeof window.DeviceOrientationEvent.requestPermission === 'function') {
      const permission = await window.DeviceOrientationEvent.requestPermission();
      if (permission !== 'granted') {
        ui.toast('傾きの許可が必要です。', 2600);
        ui.setTiltState('傾き', false);
        return;
      }
    }
    tiltSeen = false;
    window.addEventListener('deviceorientation', tiltHandler, true);
    tiltOn = true;
    ui.setTiltState('傾き ON', true);
    ui.toast('端末を傾けると氷原が視差で動きます。', 2200);
    setTimeout(() => {
      if (tiltOn && !tiltSeen) ui.toast('この端末では傾き値を取得できませんでした。', 2800);
    }, 2200);
  } catch {
    ui.toast('傾きの許可を取得できませんでした。', 2600);
    ui.setTiltState('傾き', false);
  }
}

function initSnow() {
  const canvas = document.getElementById('snow');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let flakes = [];
  let last = 0;

  function makeFlake() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 0.5 + Math.random() * 1.9,
      vy: 8 + Math.random() * 24,
      drift: -8 + Math.random() * 16,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.18 + Math.random() * 0.55,
    };
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    flakes = Array.from({ length: width < 600 ? 52 : 112 }, makeFlake);
  }

  function frame(now) {
    snowFrame = requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const delta = Math.min(48, now - (last || now));
    last = now;
    ctx.clearRect(0, 0, width, height);
    const seconds = delta / 1000;
    const tilt = Number(document.documentElement.style.getPropertyValue('--tilt-x') || 0);
    for (const flake of flakes) {
      flake.phase += seconds * 0.7;
      flake.x += Math.sin(flake.phase) * 7 * seconds + (flake.drift + tilt * 18) * seconds;
      flake.y += flake.vy * seconds;
      if (flake.y > height + 8) { flake.y = -8; flake.x = Math.random() * width; }
      if (flake.x < -10) flake.x = width + 10;
      if (flake.x > width + 10) flake.x = -10;
      ctx.beginPath();
      ctx.fillStyle = `rgba(214, 247, 255, ${flake.alpha})`;
      ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  if (!reduced) snowFrame = requestAnimationFrame(frame);
  else {
    ctx.clearRect(0, 0, width, height);
    for (const flake of flakes) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(214, 247, 255, ${flake.alpha})`;
      ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  window.addEventListener('pagehide', () => {
    if (snowFrame) cancelAnimationFrame(snowFrame);
  }, { once: true });
}

function boot() {
  ownRoom = loadRoom();
  name = `DUELIST ${ownRoom.slice(0, 2)}`;
  currentRoom = ownRoom;

  ui = new GameUI({ intent, joinSubmit, copyRoom });
  bindInterface();
  initSnow();
  resetTilt();
  startHostRoom();

  window.addEventListener('beforeunload', () => {
    if (net) net.close();
  });
}

boot();
