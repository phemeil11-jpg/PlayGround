/* 極夜遊戯 / POLAR DUEL — UI, touch flow, effects, and room orchestration. */

import { CARDS, tributeCost, elementOf } from './data.js';
import { createDuel, applyAction, sanitizeState, sanitizeEvents, effectiveAtk } from './engine.js';
import { aiThink } from './ai.js';
import { createNet, makeRoomCode } from './net.js';

const $ = id => document.getElementById(id);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const el = {
  app: $('app'),
  board: $('board'),
  rivalField: $('rivalField'),
  playerField: $('playerField'),
  hand: $('hand'),
  handCount: $('handCount'),
  handHint: $('handHint'),
  ticker: $('tickerText'),
  turnNo: $('turnNo'),
  phaseName: $('phaseName'),
  phaseDots: $('phaseDots'),
  roomCode: $('roomCode'),
  roomDot: $('roomDot'),
  resultRoom: $('resultRoom'),
  rivalName: $('rivalName'),
  rivalTag: $('rivalTag'),
  rivalLp: $('rivalLp'),
  rivalLpBar: $('rivalLpBar'),
  rivalHand: $('rivalHand'),
  rivalDeck: $('rivalDeck'),
  rivalGrave: $('rivalGrave'),
  rivalHud: $('rivalHud'),
  playerName: $('playerName'),
  playerTag: $('playerTag'),
  playerLp: $('playerLp'),
  playerLpBar: $('playerLpBar'),
  playerHand: $('playerHand'),
  playerDeck: $('playerDeck'),
  playerGrave: $('playerGrave'),
  playerHud: $('playerHud'),
  modeBtn: $('modeBtn'),
  phaseBtn: $('phaseBtn'),
  directBtn: $('directBtn'),
  cancelBtn: $('cancelBtn'),
  endBtn: $('endBtn'),
  targetHint: $('targetHint'),
  banner: $('banner'),
  toast: $('toast'),
  fxLayer: $('fxLayer'),
  resultModal: $('resultModal'),
  resultCard: document.querySelector('.result-card'),
  resultKicker: $('resultKicker'),
  resultTitle: $('resultTitle'),
  resultText: $('resultText'),
  rematchBtn: $('rematchBtn'),
  closeResultBtn: $('closeResultBtn'),
  connectNote: $('connectNote'),
  connectText: $('connectText'),
  roomBtn: $('roomBtn'),
  shareBtn: $('shareBtn'),
  tiltBtn: $('tiltBtn'),
  snow: $('snow'),
};

let state = null;
let me = 0;
let role = 'host';
let room = '';
let net = null;
let aiSeat = true;
let selectedUid = null;
let selectedZone = null;
let attackZone = null;
let targeting = null;
let summonMode = 'attack';
let aiTimer = 0;
let noteTimer = 0;
let toastTimer = 0;
let resultTimer = 0;
let pendingTimer = 0;
let pending = false;
let resultShown = false;
let tickerId = -1;
let lastTacticRect = null;
let displayedLp = [4000, 4000];
let targetLp = [4000, 4000];
let lpRaf = [0, 0];
let tiltOn = false;
let orientationHandler = null;
let pointer = { x: 0, y: 0 };
let snow = { flakes: [], w: 0, h: 0, dpr: 1, ctx: null, raf: 0 };
let reducedMotion = false;

/* --------------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------------- */
function init() {
  reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
  readRoom();
  buildZones();
  wireUi();
  initSnow();
  initMotion();
  updateRoomLabels();

  const opening = createDuel({ first: 0 });
  state = opening.state;
  displayedLp = [state.players[0].lp, state.players[1].lp];
  targetLp = [...displayedLp];
  render(true);
  playEvents(opening.events, null);
  updateTicker(true);
  scheduleAI();

  bootNet();

  setTimeout(() => toast(`ROOM ${room} 開放中 — 対戦者待機`, 3200), 800);
  setTimeout(() => {
    if (canRequestTilt()) {
      toast('TILTで傾き操作を有効にできます', 4200);
    }
  }, 4800);
}

function readRoom() {
  const params = new URLSearchParams(location.search);
  const fromUrl = (params.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  let stored = '';
  try { stored = (localStorage.getItem('polar-duel-room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); } catch { /* private mode */ }
  if (fromUrl.length >= 4) room = fromUrl;
  else if (stored.length >= 4) room = stored;
  else {
    room = makeRoomCode();
    try { localStorage.setItem('polar-duel-room', room); } catch { /* noop */ }
  }
  updateRoomLabels();
}

function updateRoomLabels() {
  el.roomCode.textContent = room || '·····';
  el.resultRoom.textContent = room || '·····';
  document.title = `極夜遊戯 / POLAR DUEL — ${room || 'ONLINE'}`;
}

function bootNet() {
  net = createNet({
    room,
    onStatus: handleNetStatus,
    onMessage: handleNetMessage,
    onPeerChange: handlePeerChange,
    onFull: () => {
      const needLocal = role !== 'host' || me === 1;
      role = 'host';
      aiSeat = true;
      if (aiTimer) { clearTimeout(aiTimer); aiTimer = 0; }
      if (needLocal) startDuel({ first: 0 });
      updatePlayerTags();
      toast('ルームは満員です — ホログラム戦を続けます', 3600);
    },
    onRole: nextRole => {
      const previous = role;
      role = nextRole;
      if (nextRole === 'host' && previous === 'guest') {
        // The old host vanished. Rebuild this tab as the host of a fresh duel
        // so the room stays playable instead of freezing on a guest view.
        aiSeat = true;
        if (aiTimer) { clearTimeout(aiTimer); aiTimer = 0; }
        startDuel({ first: 0 });
        toast('ホスト権を引き継ぎました — ルーム開放', 3600);
      } else if (nextRole === 'guest' && previous === 'host') {
        aiSeat = false;
        if (aiTimer) { clearTimeout(aiTimer); aiTimer = 0; }
        pending = false;
        toast('ホストに接続しています', 2400);
      }
      updatePlayerTags();
    },
    onLog: (text, kind) => {
      if (kind === 'warn') toast(text, 3400);
    },
  });
  net.start();
}

/* --------------------------------------------------------------------------
   Room + network integration
   -------------------------------------------------------------------------- */
function handleNetStatus(info) {
  el.roomDot.classList.toggle('online', info.state === 'connected');
  el.roomDot.classList.toggle('retry', info.state === 'retry' || info.state === 'error');
  const labels = {
    starting: 'ルームを開いています',
    waiting: role === 'guest' ? 'ホストを探しています' : 'ルーム開放中 · 対戦者待機',
    connected: 'オンライン接続 · 2P DUEL',
    retry: 'シグナルを再接続中',
    error: 'オンライン停止 · ホログラム戦',
    full: 'ルーム満員 · ホログラム戦',
  };
  if (info.state === 'retry' || info.state === 'error') {
    setNote('offline', labels[info.state] || 'シグナルを再接続中');
  } else if (info.state === 'full') {
    setNote('offline', labels.full);
    if (noteTimer) clearTimeout(noteTimer);
    noteTimer = setTimeout(() => hideNote(), 4200);
  } else if (info.state === 'connected') {
    setNote('live', labels.connected);
    if (noteTimer) clearTimeout(noteTimer);
    noteTimer = setTimeout(() => hideNote(), 3800);
  } else {
    hideNote();
  }
}

function handlePeerChange(connected) {
  if (role === 'host') {
    if (connected) {
      aiSeat = false;
      if (aiTimer) { clearTimeout(aiTimer); aiTimer = 0; }
      const first = Math.random() < 0.5 ? 0 : 1;
      startDuel({ first, welcome: true });
      toast('対戦者が接続 — オンラインデュエル開始', 3600);
      updatePlayerTags();
    } else {
      aiSeat = true;
      updatePlayerTags();
      if (state?.active === 1 && state?.winner === null) scheduleAI();
    }
  } else if (connected) {
    updatePlayerTags();
  } else {
    updatePlayerTags();
  }
}

function handleNetMessage(message) {
  if (!message || typeof message !== 'object') return;
  if (role === 'host') {
    if (message.t === 'action' && message.action) {
      receiveGuestAction(message.action);
    } else if (message.t === 'rematch') {
      if (net?.isConnected()) {
        startDuel({ first: Math.random() < 0.5 ? 0 : 1, welcome: true });
        toast('再戦を開始しました', 2400);
      }
    } else if (message.t === 'leave') {
      aiSeat = true;
      updatePlayerTags();
    }
  } else {
    if (message.t === 'welcome' || message.t === 'state') {
      adoptOnlineState(message);
    } else if (message.t === 'refuse') {
      pending = false;
      if (pendingTimer) clearTimeout(pendingTimer);
      toast(message.message || 'その行動はできません', 2600);
      render();
    }
  }
}

function receiveGuestAction(action) {
  if (!net?.isConnected()) return;
  if (typeof action.type !== 'string') return;
  const res = hostApply({ ...action, player: 1 }, true);
  if (!res.ok) {
    net.send({ t: 'refuse', message: res.error || 'その行動はできません' });
  }
}

function adoptOnlineState(message) {
  if (!message.state || typeof message.state.rev !== 'number') return;
  const previous = state;
  const sameRev = previous && previous.rev === message.state.rev && message.t !== 'welcome';
  state = message.state;
  state.viewer = 1;
  me = 1;
  pending = false;
  if (pendingTimer) clearTimeout(pendingTimer);
  el.resultModal.hidden = true;
  resultShown = false;
  resetSelection();
  if (message.t === 'welcome') {
    displayedLp = [state.players[0].lp, state.players[1].lp];
    targetLp = [...displayedLp];
    render(true);
    playEvents(message.events || [], previous);
    toast('オンラインデュエルに参加しました', 3000);
  } else if (!sameRev) {
    render();
    playEvents(message.events || [], previous);
  } else {
    render();
  }
  updatePlayerTags();
  updateTicker();
  checkWinner();
}

function sendCurrentState(type = 'state', events = []) {
  if (!net?.isConnected()) return;
  net.send({
    t: type,
    room,
    state: sanitizeState(state, 1),
    events: sanitizeEvents(events, 1),
  });
}

/* --------------------------------------------------------------------------
   Duel lifecycle
   -------------------------------------------------------------------------- */
function startDuel({ first = 0, welcome = false } = {}) {
  if (aiTimer) { clearTimeout(aiTimer); aiTimer = 0; }
  if (resultTimer) { clearTimeout(resultTimer); resultTimer = 0; }
  resultShown = false;
  el.resultModal.hidden = true;
  resetSelection();
  const opening = createDuel({ first });
  state = opening.state;
  me = 0;
  state.viewer = undefined;
  targetLp = [state.players[0].lp, state.players[1].lp];
  displayedLp = [...targetLp];
  render(true);
  playEvents(opening.events, null);
  updatePlayerTags();
  updateTicker(true);
  if (role === 'host' && net?.isConnected()) {
    sendCurrentState(welcome ? 'welcome' : 'state', opening.events);
  }
  scheduleAI();
}

function hostApply(action, remote = false) {
  const previous = state;
  const res = applyAction(state, action);
  if (!res.ok) {
    if (!remote) toast(res.error || 'その行動はできません', 2500);
    return res;
  }
  resetSelection();
  state = res.state;
  render();
  playEvents(res.events, previous);
  updateTicker();
  if (role === 'host' && net?.isConnected()) sendCurrentState('state', res.events);
  scheduleAI();
  checkWinner();
  return res;
}

function act(action) {
  if (!state || state.winner !== null) return;
  if (state.active !== me) { toast('相手のターンです', 1800); return; }
  if (role === 'guest' && !net?.isConnected()) { toast('ホストに接続されていません', 2400); return; }
  if (action.type === 'activate') {
    const handEl = el.hand.querySelector(`[data-uid="${action.uid}"]`);
    if (handEl) lastTacticRect = handEl.getBoundingClientRect();
  }
  if (role === 'guest') {
    pending = true;
    net.send({ t: 'action', action: { ...action, player: 1 } });
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
      if (!pending) return;
      pending = false;
      toast('ホストの応答を待っています…', 2800);
      render();
    }, 6000);
    resetSelection();
    render();
    return;
  }
  hostApply({ ...action, player: 0 }, false);
}

function scheduleAI() {
  if (aiTimer) { clearTimeout(aiTimer); aiTimer = 0; }
  if (role !== 'host' || !aiSeat || !state || state.winner !== null) return;
  if (state.active !== 1) return;
  aiTimer = setTimeout(() => {
    aiTimer = 0;
    if (role !== 'host' || !aiSeat || !state || state.winner !== null || state.active !== 1) return;
    const action = aiThink(state, 1);
    if (!action) {
      hostApply({ type: 'end', player: 1 }, true);
      return;
    }
    const res = hostApply(action, true);
    if (!res.ok) hostApply({ type: 'end', player: 1 }, true);
  }, 820 + Math.random() * 420);
}

/* --------------------------------------------------------------------------
   Rendering
   -------------------------------------------------------------------------- */
function buildZones() {
  for (const row of [el.rivalField, el.playerField]) {
    row.innerHTML = '';
    for (let i = 0; i < 4; i += 1) {
      const zone = document.createElement('button');
      zone.type = 'button';
      zone.className = 'zone empty';
      zone.dataset.zone = String(i);
      zone.innerHTML = '<span class="slot-mark">ZONE</span>';
      zone.setAttribute('aria-label', `ゾーン ${i + 1}`);
      row.appendChild(zone);
    }
  }
}

function render(immediateLp = false) {
  if (!state) return;
  me = state.viewer === 1 ? 1 : 0;
  const foe = 1 - me;
  const own = state.players[me];
  const rival = state.players[foe];
  const myTurn = state.active === me && state.winner === null;

  el.turnNo.textContent = `TURN ${state.turn}`;
  const phaseLabel = state.phase === 'battle' ? 'BATTLE PHASE' : state.phase === 'end' ? 'END PHASE' : 'MAIN PHASE';
  el.phaseName.textContent = phaseLabel;
  const dots = [...el.phaseDots.children];
  dots.forEach((dot, index) => dot.classList.toggle('on', (state.phase === 'main' && index === 0) || (state.phase === 'battle' && index === 1) || (state.phase === 'end' && index === 2)));

  el.rivalHud.classList.toggle('active', state.active === foe && state.winner === null);
  el.playerHud.classList.toggle('active', state.active === me && state.winner === null);

  el.rivalLp.textContent = String(targetLp[foe] ?? rival.lp);
  el.playerLp.textContent = String(targetLp[me] ?? own.lp);
  animateLp(foe, rival.lp, immediateLp);
  animateLp(me, own.lp, immediateLp);
  el.rivalHand.textContent = String(rival.hand.length);
  el.playerHand.textContent = String(own.hand.length);
  el.rivalDeck.textContent = String(rival.deck.length);
  el.playerDeck.textContent = String(own.deck.length);
  el.rivalGrave.textContent = String(rival.grave.length);
  el.playerGrave.textContent = String(own.grave.length);

  updatePlayerTags();
  renderField(el.rivalField, foe, false);
  renderField(el.playerField, me, true);
  renderHand();
  el.handCount.textContent = String(own.hand.length);
  refreshControls();
  updateTicker();
  updateHint(myTurn);
}

function animateLp(player, value, immediate = false) {
  value = clamp(value, 0, 4000);
  const hud = player === me ? { num: el.playerLp, bar: el.playerLpBar } : { num: el.rivalLp, bar: el.rivalLpBar };
  const pct = `${(value / 4000) * 100}%`;
  if (immediate) {
    displayedLp[player] = value;
    targetLp[player] = value;
    if (lpRaf[player]) cancelAnimationFrame(lpRaf[player]);
    lpRaf[player] = 0;
    hud.num.textContent = String(value);
    hud.bar.style.width = pct;
    return;
  }
  if (targetLp[player] === value) return;
  const from = displayedLp[player] ?? value;
  targetLp[player] = value;
  if (lpRaf[player]) cancelAnimationFrame(lpRaf[player]);
  const start = performance.now();
  const duration = reducedMotion ? 1 : 560;
  const step = now => {
    const t = clamp((now - start) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const current = Math.round(from + (value - from) * eased);
    displayedLp[player] = current;
    hud.num.textContent = String(current);
    hud.bar.style.width = `${(current / 4000) * 100}%`;
    if (t < 1) lpRaf[player] = requestAnimationFrame(step);
    else {
      displayedLp[player] = value;
      hud.num.textContent = String(value);
      hud.bar.style.width = pct;
      lpRaf[player] = 0;
    }
  };
  lpRaf[player] = requestAnimationFrame(step);
}

function updatePlayerTags() {
  if (!state) return;
  const foe = 1 - me;
  const linked = !!net?.isConnected();
  const foeName = role === 'guest' ? (linked ? 'ホスト' : '接続待ち') : aiSeat ? '北極の守護者' : '対戦者';
  el.playerName.textContent = 'あなた';
  el.rivalName.textContent = foeName;
  el.playerTag.textContent = role === 'guest' ? 'ONLINE GUEST' : aiSeat ? 'ONLINE HOST · AI' : 'ONLINE HOST';
  el.rivalTag.textContent = role === 'guest'
    ? (linked ? 'HOST · ONLINE' : aiSeat ? 'HOLOGRAM · AI' : 'SIGNAL LOST')
    : (aiSeat ? 'HOLOGRAM · AI' : 'ONLINE RIVAL');
}

function renderField(row, player, isOwn) {
  const cards = state.players[player].field;
  const zones = [...row.children];
  const myTurn = state.active === me && state.winner === null;
  const selectedCard = selectedUid ? state.players[me].hand.find(card => card.uid === selectedUid) : null;

  zones.forEach((zone, index) => {
    const card = cards[index] || null;
    zone.dataset.player = String(player);
    zone.dataset.zone = String(index);
    const hidden = !!card && !!card.hidden;
    const key = card ? `${card.uid}|${hidden ? 'h' : 'v'}|${card.faceDown ? 's' : 'f'}|${card.mode}|${card.atkBoost || 0}|${card.frozen ? 1 : 0}` : '';
    const changed = zone.dataset.key !== key;
    zone.dataset.key = key;
    zone.classList.toggle('empty', !card);

    if (changed) {
      if (!card) {
        zone.innerHTML = '<span class="slot-mark">ZONE</span>';
      } else {
        zone.innerHTML = cardMarkup(card, { hidden, own: isOwn });
      }
    }
    if (!card) {
      const mark = zone.querySelector('.slot-mark');
      if (mark) mark.textContent = state.active === player && myTurn ? 'ZONE' : 'ZONE';
    }

    zone.classList.toggle('defense-zone', !!card && (card.faceDown || card.mode === 'defense'));

    const playable =
      isOwn &&
      myTurn &&
      state.phase === 'main' &&
      selectedCard &&
      selectedCard.kind === 'monster' &&
      !card &&
      !state.players[me].hasSummoned &&
      state.players[me].field.filter(Boolean).length >= tributeCost(selectedCard);

    const ownTarget = targeting && targeting.side === 'own' && isOwn && !!card;
    const enemyTarget = targeting && targeting.side === 'enemy' && !isOwn && !!card;
    const attackTarget = attackZone !== null && !isOwn && !!card;
    const directCandidate = attackZone !== null && isOwn && index === attackZone && state.phase === 'battle';

    zone.classList.toggle('playable', !!playable);
    zone.classList.toggle('targetable', !!(ownTarget || enemyTarget || attackTarget));
    zone.classList.toggle('own-target', !!ownTarget);
    zone.classList.toggle('selected', (selectedZone !== null && isOwn && selectedZone === index) || (attackZone !== null && isOwn && attackZone === index));
    zone.classList.toggle('direct-ready', !!directCandidate && !state.players[1 - me].field.some(Boolean));
    zone.disabled = state.winner !== null;

    const label = card
      ? `${isOwn ? '自分' : '相手'}の${hidden ? 'セットカード' : card.name}`
      : `空きゾーン ${index + 1}`;
    zone.setAttribute('aria-label', label);
  });
}

function cardMarkup(card, { hidden = false, own = false, hand = false } = {}) {
  if (hidden) {
    return `<div class="card back" data-el="frost">
      <span class="card-tag">SET</span>
      <div class="back-ring"><span class="back-mark">極夜</span></div>
      <span class="back-set">FACEDOWN</span>
    </div>`;
  }
  const element = elementOf(card);
  const isTactic = card.kind === 'tactic';
  const isDefense = card.mode === 'defense' || card.faceDown;
  const atk = effectiveAtk(card);
  const boost = card.atkBoost || 0;
  const classes = ['card'];
  if (isDefense) classes.push('defense');
  if (own && card.faceDown) classes.push('own-set');
  if (hand) classes.push('in-hand');
  return `<div class="${classes.join(' ')}" data-el="${card.el || 'frost'}">
    ${card.frozen ? '<span class="frozen-badge">FROZEN</span>' : ''}
    <div class="card-el">
      <span>${element.en}</span>
      <span class="card-lv">${isTactic ? 'TACTIC' : `Lv ${card.level}`}</span>
    </div>
    <div class="card-name">${escapeHtml(card.name).replaceAll('・', '・<wbr>')}</div>
    <div class="card-sub">${escapeHtml(card.sub || '')}</div>
    <div class="card-mid"><span class="sigil-art"></span></div>
    ${isTactic ? `<div class="card-effect">${escapeHtml(card.text || '')}</div>` : ''}
    ${isTactic
      ? `<div class="card-stats tactic-stats">
          <span class="stat"><small>TYPE</small><b class="tactic-word">作戦</b></span>
          <span class="stat def"><small>USE</small><b class="tactic-word">MAIN</b></span>
        </div>`
      : `<div class="card-stats">
          <span class="stat atk"><small>ATK</small><b>${atk}${boost ? `<em>+${boost}</em>` : ''}</b></span>
          <span class="stat def"><small>DEF</small><b>${card.def}</b></span>
        </div>`}
  </div>`;
}

function renderHand() {
  const hand = state.players[me].hand;
  const existing = new Map([...el.hand.children].map(node => [node.dataset.uid, node]));
  const keep = new Set();
  for (const card of hand) {
    let node = existing.get(card.uid);
    if (!node) {
      node = document.createElement('button');
      node.type = 'button';
      node.className = 'hand-card';
      node.dataset.uid = card.uid;
      node.innerHTML = cardMarkup(card, { hand: true, own: true });
    }
    node.classList.toggle('tactic', card.kind === 'tactic');
    node.classList.toggle('selected', card.uid === selectedUid);
    node.classList.toggle('disabled', pending);
    node.setAttribute('aria-label', card.kind === 'tactic'
      ? `${card.name}。作戦カード。${card.text || ''}`
      : `${card.name}。ATK ${effectiveAtk(card)}、DEF ${card.def}`);
    el.hand.appendChild(node);
    keep.add(card.uid);
  }
  for (const [uid, node] of existing) {
    if (!keep.has(uid)) node.remove();
  }
  if (!hand.length) {
    const empty = document.createElement('div');
    empty.className = 'hand-empty';
    empty.textContent = 'NO CARDS IN HAND';
    empty.dataset.empty = '1';
    el.hand.appendChild(empty);
  } else {
    const empty = el.hand.querySelector('.hand-empty');
    if (empty) empty.remove();
  }
}

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

/* --------------------------------------------------------------------------
   Controls
   -------------------------------------------------------------------------- */
function wireUi() {
  el.hand.addEventListener('click', event => {
    const node = event.target.closest('.hand-card');
    if (!node) return;
    handleHandTap(node.dataset.uid);
  });
  el.board.addEventListener('click', event => {
    const zone = event.target.closest('.zone');
    if (!zone) return;
    handleZoneTap(Number(zone.dataset.player), Number(zone.dataset.zone), zone);
  });
  el.modeBtn.addEventListener('click', handleModeButton);
  el.phaseBtn.addEventListener('click', () => act({ type: 'battle' }));
  el.directBtn.addEventListener('click', () => {
    if (attackZone === null) return;
    act({ type: 'attack', zone: attackZone, targetZone: null });
    resetSelection();
    render();
  });
  el.cancelBtn.addEventListener('click', () => {
    resetSelection();
    render();
  });
  el.endBtn.addEventListener('click', () => {
    act({ type: 'end' });
    resetSelection();
    render();
  });
  el.roomBtn.addEventListener('click', copyRoomCode);
  el.shareBtn.addEventListener('click', shareRoom);
  el.tiltBtn.addEventListener('click', toggleTilt);
  el.rematchBtn.addEventListener('click', requestRematch);
  el.closeResultBtn.addEventListener('click', () => { el.resultModal.hidden = true; });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      resetSelection();
      render();
    }
  });
}

function handleHandTap(uid) {
  if (!state || state.winner !== null) return;
  const card = state.players[me].hand.find(item => item.uid === uid);
  if (!card) return;
  if (selectedUid === uid) {
    selectedUid = null;
    selectedZone = null;
    targeting = null;
    render();
    return;
  }
  selectedUid = uid;
  selectedZone = null;
  attackZone = null;
  targeting = null;
  summonMode = 'attack';
  render();
  if (state.active !== me) toast('相手のターンです。カードを確認できます', 2200);
  else if (state.phase !== 'main') toast('作戦と召喚はメインフェイズのみ', 2200);
}

function handleZoneTap(player, zoneIndex, zoneNode) {
  if (!state || state.winner !== null) return;
  const card = state.players[player].field[zoneIndex];
  const myTurn = state.active === me;

  if (targeting) {
    const side = player === me ? 'own' : 'enemy';
    if (side !== targeting.side) {
      toast(targeting.side === 'own' ? '自分のモンスターを選んでください' : '相手モンスターを選んでください', 2000);
      return;
    }
    if (!card) {
      toast('カードがあるマスを選んでください', 2000);
      return;
    }
    if (!myTurn) { toast('相手のターンです', 1800); return; }
    const uid = targeting.uid;
    targeting = null;
    act({ type: 'activate', uid, targetZone: zoneIndex });
    resetSelection();
    render();
    return;
  }

  if (attackZone !== null) {
    if (player === me) {
      if (!card) return;
      if (state.phase !== 'battle') { toast('攻撃はバトルフェイズのみ', 1800); return; }
      attackZone = zoneIndex;
      selectedZone = null;
      render();
      return;
    }
    if (!myTurn) { toast('相手のターンです', 1800); return; }
    if (!card) {
      toast('攻撃対象がいません。直接攻撃は下のボタンから', 2200);
      return;
    }
    const attacker = attackZone;
    act({ type: 'attack', zone: attacker, targetZone: zoneIndex });
    resetSelection();
    render();
    return;
  }

  if (selectedUid) {
    const handCard = state.players[me].hand.find(item => item.uid === selectedUid);
    if (!handCard) { resetSelection(); render(); return; }
    if (!myTurn) { toast('相手のターンです', 1800); return; }
    if (state.phase !== 'main') { toast('召喚・発動はメインフェイズのみ', 2000); return; }
    if (handCard.kind === 'monster') {
      if (player !== me) { toast('自分のゾーンに召喚してください', 2000); return; }
      if (card) { toast('空いているマスを選んでください', 2000); return; }
      if (state.players[me].hasSummoned) { toast('このターンはもう召喚・セットしています', 2400); return; }
      const needed = tributeCost(handCard);
      if (state.players[me].field.filter(Boolean).length < needed) {
        toast(`生贄が足りません（${needed}体必要）`, 2400);
        return;
      }
      act({ type: 'summon', uid: handCard.uid, zone: zoneIndex, mode: summonMode });
      resetSelection();
      render();
      return;
    }
    if (handCard.kind === 'tactic') {
      if (handCard.target) {
        const neededSide = handCard.target === 'ownMonster' ? 'own' : 'enemy';
        const side = player === me ? 'own' : 'enemy';
        if (side !== neededSide) { toast(neededSide === 'own' ? '自分のモンスターを選んでください' : '相手モンスターを選んでください', 2200); return; }
        if (!card) { toast('カードがあるマスを選んでください', 2000); return; }
        act({ type: 'activate', uid: handCard.uid, targetZone: zoneIndex });
      } else {
        act({ type: 'activate', uid: handCard.uid });
      }
      resetSelection();
      render();
      return;
    }
  }

  if (player === me && card) {
    if (state.phase === 'battle') {
      const attacker = card;
      if (attacker.mode === 'attack' && !attacker.faceDown && !attacker.hasAttacked && !attacker.frozen && attacker.uid) {
        attackZone = zoneIndex;
        selectedZone = null;
        selectedUid = null;
        targeting = null;
        render();
        return;
      }
      if (attacker.hasAttacked) toast('このモンスターはもう攻撃しました', 2000);
      else if (attacker.mode !== 'attack') toast('守備表示のモンスターは攻撃できません', 2200);
      else toast('このモンスターは攻撃できません', 2000);
      return;
    }
    selectedZone = zoneIndex;
    selectedUid = null;
    attackZone = null;
    targeting = null;
    render();
    return;
  }

  if (player !== me && card) {
    if (card.hidden) {
      toast(state.phase === 'battle' && attackZone !== null ? 'セットカードを攻撃対象に選べます' : 'セットされたカード', 2200);
    } else {
      toast(`${card.name} — ATK ${effectiveAtk(card)} / DEF ${card.def}${card.frozen ? ' / 凍結' : ''}`, 3000);
    }
    return;
  }

  if (player === me && !card) {
    toast('手札のカードを選んでからマスをタップ', 2400);
  }
}

function handleModeButton() {
  if (!state || state.winner !== null) return;
  if (selectedUid) {
    const card = state.players[me].hand.find(item => item.uid === selectedUid);
    if (!card) return;
    if (card.kind === 'monster') {
      summonMode = summonMode === 'attack' ? 'defense' : 'attack';
      render();
      return;
    }
    if (state.active !== me) { toast('相手のターンです', 1800); return; }
    if (state.phase !== 'main') { toast('作戦カードはメインフェイズのみ', 2000); return; }
    if (state.players[me].usedTactic) { toast('このターンはもう作戦カードを使っています', 2200); return; }
    if (card.target) {
      const side = card.target === 'ownMonster' ? 'own' : 'enemy';
      const hasTarget = state.players[side === 'own' ? me : 1 - me].field.some(Boolean);
      if (!hasTarget) { toast('対象がいません', 2000); return; }
      targeting = { uid: card.uid, side };
      toast(side === 'own' ? '自分のモンスターを選んでください' : '相手モンスターを選んでください', 2200);
      render();
    } else {
      act({ type: 'activate', uid: card.uid });
      resetSelection();
      render();
    }
    return;
  }
  if (selectedZone !== null) {
    if (state.active !== me) { toast('相手のターンです', 1800); return; }
    if (state.phase !== 'main') { toast('表示形式の変更はメインフェイズのみ', 2200); return; }
    const card = state.players[me].field[selectedZone];
    if (!card) return;
    if (card.switched) { toast('このカードはこのターン表示形式を変更しています', 2400); return; }
    if (card.justSet) { toast('セットしたターンは表示形式を変更できません', 2400); return; }
    if (card.frozen) { toast('このカードは凍結しています', 2200); return; }
    act({ type: 'switch', zone: selectedZone });
    resetSelection();
    render();
  }
}

function refreshControls() {
  if (!state) return;
  const myTurn = state.active === me && state.winner === null;
  const handCard = selectedUid ? state.players[me].hand.find(card => card.uid === selectedUid) : null;
  const fieldCard = selectedZone !== null ? state.players[me].field[selectedZone] : null;
  const inMain = state.phase === 'main';
  const foeField = state.players[1 - me].field;
  const anyEnemy = foeField.some(Boolean);
  const attacker = attackZone !== null ? state.players[me].field[attackZone] : null;

  el.modeBtn.hidden = true;
  el.modeBtn.classList.remove('def');
  el.directBtn.hidden = true;
  el.cancelBtn.hidden = !(selectedUid || selectedZone !== null || attackZone !== null || targeting);

  if (handCard) {
    el.modeBtn.hidden = false;
    if (handCard.kind === 'monster') {
      el.modeBtn.querySelector('small').textContent = summonMode === 'attack' ? 'SUMMON' : 'SET';
      el.modeBtn.querySelector('span').textContent = summonMode === 'attack' ? '攻撃召喚' : '守備セット';
      el.modeBtn.classList.toggle('def', summonMode === 'defense');
      el.modeBtn.disabled = !myTurn || !inMain || state.players[me].hasSummoned;
    } else {
      el.modeBtn.querySelector('small').textContent = targeting ? 'TARGET' : 'ACTIVATE';
      el.modeBtn.querySelector('span').textContent = targeting ? '対象を選択' : '発動';
      el.modeBtn.disabled = !myTurn || !inMain || state.players[me].usedTactic;
    }
  } else if (fieldCard) {
    el.modeBtn.hidden = false;
    el.modeBtn.querySelector('small').textContent = 'POSITION';
    el.modeBtn.querySelector('span').textContent = '守備変更';
    el.modeBtn.disabled = !myTurn || !inMain || fieldCard.switched || fieldCard.justSet || fieldCard.frozen;
  }

  if (attackZone !== null && state.phase === 'battle' && attacker && !anyEnemy && !attacker.hasAttacked && attacker.mode === 'attack' && !attacker.faceDown && !attacker.frozen) {
    el.directBtn.hidden = false;
  }

  el.phaseBtn.disabled = !myTurn || !inMain;
  el.phaseBtn.classList.toggle('live', myTurn && inMain);
  el.phaseBtn.querySelector('span').textContent = inMain ? 'バトルへ' : 'バトル中';
  el.endBtn.disabled = !myTurn;
  el.endBtn.querySelector('span').textContent = pending ? '送信中…' : 'ターン終了';

  if (targeting) {
    el.targetHint.textContent = targeting.side === 'own' ? '自分の対象を選択' : '相手の対象を選択';
    el.targetHint.classList.add('show');
  } else if (attackZone !== null && state.phase === 'battle') {
    el.targetHint.textContent = anyEnemy ? '攻撃対象を選択' : '直接攻撃できます';
    el.targetHint.classList.add('show');
  } else {
    el.targetHint.classList.remove('show');
  }
  el.modeBtn.setAttribute('aria-pressed', summonMode === 'defense' ? 'true' : 'false');
}

function updateHint(myTurn) {
  let text = 'カードを選択 → 光るマスへ';
  let warn = false;
  if (state.winner !== null) {
    text = 'デュエル終了';
  } else if (!myTurn) {
    text = role === 'guest' ? 'ホストのターン — 北極の風を待つ' : '相手のターン — 北極の風を待つ';
    warn = true;
  } else if (pending) {
    text = 'ホストに行動を送信中…';
    warn = true;
  } else if (targeting) {
    text = '光る対象をタップ';
  } else if (attackZone !== null) {
    text = state.players[1 - me].field.some(Boolean) ? '敵モンスターをタップして攻撃' : '直接攻撃ボタンで攻撃';
  } else if (selectedUid) {
    const card = state.players[me].hand.find(item => item.uid === selectedUid);
    if (!card) text = 'カードを選択';
    else if (state.phase !== 'main') { text = 'メインフェイズではありません'; warn = true; }
    else if (card.kind === 'monster') {
      const need = tributeCost(card);
      const have = state.players[me].field.filter(Boolean).length;
      if (state.players[me].hasSummoned) { text = 'このターンは召喚済み'; warn = true; }
      else if (have < need) { text = `生贄が足りません（${need}体必要）`; warn = true; }
      else text = summonMode === 'attack' ? '空きマスをタップして攻撃召喚' : '空きマスをタップして守備セット';
    }
    else text = card.target ? '発動 → 対象をタップ' : '発動ボタンをタップ';
  } else if (selectedZone !== null) {
    text = '守備変更するか、バトルへ';
  } else if (state.phase === 'battle') {
    text = '攻撃モンスターをタップ';
  }
  el.handHint.textContent = text;
  el.handHint.classList.toggle('warn', warn);
}

function resetSelection() {
  selectedUid = null;
  selectedZone = null;
  attackZone = null;
  targeting = null;
  summonMode = 'attack';
}

/* --------------------------------------------------------------------------
   Ticker + toast
   -------------------------------------------------------------------------- */
function updateTicker(force = false) {
  if (!state?.log?.length) return;
  const last = state.log[state.log.length - 1];
  if (!force && last.id === tickerId) return;
  tickerId = last.id;
  el.ticker.textContent = last.text;
  el.ticker.style.animation = 'none';
  void el.ticker.offsetWidth;
  el.ticker.style.animation = '';
}

function toast(message, duration = 2600) {
  if (!message) return;
  el.toast.textContent = message;
  el.toast.classList.add('show');
  el.toast.classList.toggle('rose', /できません|足りません|失敗|満員|切れ/.test(message));
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), duration);
}

function setNote(kind, text) {
  el.connectNote.hidden = false;
  el.connectNote.classList.remove('hide', 'waiting', 'offline');
  if (kind === 'waiting') el.connectNote.classList.add('waiting');
  if (kind === 'offline') el.connectNote.classList.add('offline');
  el.connectText.textContent = text;
}

function hideNote() {
  el.connectNote.classList.add('hide');
}

/* --------------------------------------------------------------------------
   Online room buttons
   -------------------------------------------------------------------------- */
function inviteUrl() {
  const url = new URL(location.href);
  url.searchParams.set('room', room);
  return url.toString();
}

async function copyRoomCode() {
  const text = room;
  try {
    await navigator.clipboard.writeText(text);
    toast(`ルーム ${room} をコピーしました`, 2200);
  } catch {
    toast(`ルームコード: ${room}`, 4200);
  }
}

async function shareRoom() {
  const url = inviteUrl();
  try {
    if (navigator.share) {
      await navigator.share({
        title: '極夜遊戯 / POLAR DUEL',
        text: `ルーム ${room} で北極デュエルに挑戦しよう。`,
        url,
      });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast('招待リンクをコピーしました', 2400);
  } catch {
    toast(`招待コード: ${room}`, 4200);
  }
}

/* --------------------------------------------------------------------------
   Result + rematch
   -------------------------------------------------------------------------- */
function checkWinner() {
  if (!state || state.winner === null || resultShown || resultTimer) return;
  resultTimer = setTimeout(() => {
    resultTimer = 0;
    showResult();
  }, reducedMotion ? 200 : 1100);
}

function showResult() {
  if (!state || state.winner === null || resultShown) return;
  resultShown = true;
  const won = state.winner === me;
  el.resultCard.classList.toggle('lose', !won);
  el.resultKicker.textContent = won ? 'DUEL COMPLETE' : 'DUEL LOST';
  el.resultTitle.textContent = won ? 'VICTORY' : 'DEFEAT';
  const reason = state.winReason || '決着';
  el.resultText.textContent = won
    ? `${reason}。氷原に、あなたの勝利が響いた。`
    : `${reason}。北極の夜に、静かに敗北が降りた。`;
  el.resultRoom.textContent = room;
  el.resultModal.hidden = false;
  playBanner(won ? 'VICTORY' : 'DEFEAT');
}

function requestRematch() {
  el.resultModal.hidden = true;
  if (role === 'guest') {
    if (!net?.isConnected()) { toast('ホストに接続されていません', 2400); return; }
    net.send({ t: 'rematch' });
    toast('ホストに再戦を要求しました', 2600);
    return;
  }
  if (aiSeat) startDuel({ first: 0 });
  else startDuel({ first: Math.random() < 0.5 ? 0 : 1, welcome: true });
}

/* --------------------------------------------------------------------------
   Effects
   -------------------------------------------------------------------------- */
function playBanner(text) {
  const b = el.banner.querySelector('b');
  b.textContent = text;
  el.banner.classList.remove('show');
  void el.banner.offsetWidth;
  el.banner.classList.add('show');
}

function sweep() {
  const line = document.createElement('div');
  line.className = 'turn-sweep';
  el.fxLayer.appendChild(line);
  setTimeout(() => line.remove(), 1250);
}

function zoneEl(player, zone) {
  if (!state) return null;
  const isOwn = player === me;
  const row = isOwn ? el.playerField : el.rivalField;
  return row.children[zone] || null;
}

function rectCenter(rect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function playEvents(events, previous) {
  if (!events || !events.length) return;
  for (const event of events) {
    const delay = event.t === 'attack' ? 0 : event.t === 'destroy' ? 230 : event.t === 'damage' ? 330 : event.t === 'win' ? 850 : 0;
    setTimeout(() => playEvent(event), reducedMotion ? 0 : delay);
  }
}

function playEvent(event) {
  switch (event.t) {
    case 'start':
      sweep();
      break;
    case 'turn':
      if (event.turn === 1) playBanner('DUEL START');
      else playBanner(event.player === me ? 'YOUR TURN' : 'RIVAL TURN');
      sweep();
      break;
    case 'phase':
      if (event.phase === 'battle') {
        el.phaseName.animate?.(
          [{ color: '#ffd27a' }, { color: '#eaf9ff' }],
          { duration: 700, easing: 'ease-out' },
        );
      }
      break;
    case 'summon': {
      const zone = zoneEl(event.player, event.zone);
      if (!zone) break;
      const rect = zone.getBoundingClientRect();
      pulse(rect, event.faceDown ? 'rgba(89,216,255,.7)' : 'rgba(121,255,199,.75)');
      snowBurst(rect, event.faceDown ? 7 : 10);
      break;
    }
    case 'position':
    case 'flip': {
      const zone = zoneEl(event.player, event.zone);
      if (!zone) break;
      const rect = zone.getBoundingClientRect();
      pulse(rect, 'rgba(255,210,122,.65)');
      break;
    }
    case 'tribute': {
      for (const zoneIndex of event.zones || []) {
        const zone = zoneEl(event.player, zoneIndex);
        if (zone) pulse(zone.getBoundingClientRect(), 'rgba(255,130,150,.6)');
      }
      break;
    }
    case 'attack': {
      const zone = zoneEl(event.player, event.zone);
      if (!zone) break;
      const fromRect = zone.getBoundingClientRect();
      const targetEl = event.target ? zoneEl(event.target.player, event.target.zone) : (event.player === me ? el.rivalHud : el.playerHud);
      const toRect = targetEl ? targetEl.getBoundingClientRect() : fromRect;
      const hadCard = !!zone.querySelector('.card');
      if (hadCard) {
        zone.classList.remove('attacking-up', 'attacking-down');
        void zone.offsetWidth;
        zone.classList.add(event.player === me ? 'attacking-up' : 'attacking-down');
        setTimeout(() => zone.classList.remove('attacking-up', 'attacking-down'), 520);
      }
      const a = rectCenter(fromRect);
      const b = rectCenter(toRect);
      slash(a, b);
      setTimeout(() => {
        impact(b);
        shake();
      }, reducedMotion ? 30 : 170);
      break;
    }
    case 'destroy': {
      const zone = zoneEl(event.player, event.zone);
      if (!zone) break;
      const rect = zone.getBoundingClientRect();
      spawnGhost(rect, event.card, 'shatter');
      snowBurst(rect, 12);
      break;
    }
    case 'damage': {
      if (!event.amount && !event.blocked) break;
      const hud = event.player === me ? el.playerHud : el.rivalHud;
      const rect = hud.getBoundingClientRect();
      damageText(rect, event.blocked ? 0 : event.amount, event.blocked ? 'block' : 'damage');
      if (event.player === me) shake();
      if (event.amount > 0) flashDamage(event.player === me);
      break;
    }
    case 'heal': {
      const hud = event.player === me ? el.playerHud : el.rivalHud;
      damageText(hud.getBoundingClientRect(), event.amount, 'heal');
      break;
    }
    case 'tactic': {
      const rect = lastTacticRect || el.board.getBoundingClientRect();
      spawnGhost(rect, event.card, 'tactic');
      flashTactic();
      toast(`作戦発動 — ${event.card?.name || ''}`, 2600);
      break;
    }
    case 'buff': {
      const zone = zoneEl(event.player, event.zone);
      if (!zone) break;
      const rect = zone.getBoundingClientRect();
      pulse(rect, 'rgba(255,210,122,.85)');
      damageText(rect, 1000, 'buff');
      break;
    }
    case 'freeze': {
      const zone = zoneEl(event.player, event.zone);
      if (!zone) break;
      const rect = zone.getBoundingClientRect();
      pulse(rect, 'rgba(89,216,255,.9)');
      damageText(rect, 0, 'freeze');
      snowBurst(rect, 9);
      break;
    }
    case 'win':
      playBanner(event.player === me ? 'VICTORY' : 'DEFEAT');
      checkWinner();
      break;
    case 'draw':
      break;
    default:
      break;
  }
}

function slash(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const line = document.createElement('div');
  line.className = 'slash';
  line.style.left = `${from.x}px`;
  line.style.top = `${from.y}px`;
  line.style.width = `${length}px`;
  line.style.setProperty('--ang', `${angle}deg`);
  el.fxLayer.appendChild(line);
  setTimeout(() => line.remove(), 420);
}

function impact(center) {
  const ring = document.createElement('div');
  ring.className = 'impact';
  ring.style.left = `${center.x}px`;
  ring.style.top = `${center.y}px`;
  const size = Math.max(58, Math.min(130, window.innerWidth * 0.13));
  ring.style.width = `${size}px`;
  ring.style.height = `${size}px`;
  el.fxLayer.appendChild(ring);
  setTimeout(() => ring.remove(), 560);
}

function pulse(rect, color) {
  const ring = document.createElement('div');
  ring.className = 'impact';
  ring.style.left = `${rect.left + rect.width / 2}px`;
  ring.style.top = `${rect.top + rect.height / 2}px`;
  ring.style.width = `${Math.min(rect.width, 110)}px`;
  ring.style.height = `${Math.min(rect.height, 110)}px`;
  ring.style.borderColor = color;
  ring.style.boxShadow = `0 0 34px ${color}, inset 0 0 22px ${color}`;
  el.fxLayer.appendChild(ring);
  setTimeout(() => ring.remove(), 560);
}

function spawnGhost(rect, card, mode = 'shatter') {
  if (!rect) return;
  const ghost = document.createElement('div');
  ghost.className = `ghost-card ${mode === 'tactic' ? 'tactic' : ''}`;
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  if (mode === 'tactic') {
    const boardRect = el.board.getBoundingClientRect();
    ghost.style.setProperty('--dx', `${boardRect.left + boardRect.width / 2 - (rect.left + rect.width / 2)}px`);
    ghost.style.setProperty('--dy', `${boardRect.top + boardRect.height / 2 - (rect.top + rect.height / 2)}px`);
  }
  if (card && !card.hidden) ghost.innerHTML = cardMarkup(card, { own: true });
  el.fxLayer.appendChild(ghost);
  setTimeout(() => ghost.remove(), mode === 'tactic' ? 850 : 700);
}

function snowBurst(rect, count) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < count; i += 1) {
    const shard = document.createElement('i');
    shard.className = 'shard';
    shard.style.left = `${cx}px`;
    shard.style.top = `${cy}px`;
    shard.style.setProperty('--dx', `${(Math.random() - 0.5) * 110}px`);
    shard.style.setProperty('--dy', `${(Math.random() - 0.5) * 110 + 18}px`);
    shard.style.setProperty('--rot', `${Math.random() * 300 - 150}deg`);
    shard.style.animationDelay = `${Math.random() * 90}ms`;
    el.fxLayer.appendChild(shard);
    setTimeout(() => shard.remove(), 850);
  }
}

function damageText(rect, amount, kind) {
  const node = document.createElement('div');
  node.className = `dmg-num ${kind === 'heal' ? 'heal' : kind === 'block' ? 'block' : ''}`;
  node.style.left = `${rect.left + rect.width * 0.72}px`;
  node.style.top = `${rect.top + rect.height * 0.28}px`;
  if (kind === 'damage') node.textContent = `-${amount}`;
  else if (kind === 'heal') node.textContent = `+${amount}`;
  else if (kind === 'block') node.textContent = 'BLOCK';
  else if (kind === 'buff') node.textContent = '+1000';
  else if (kind === 'freeze') node.textContent = 'FROZEN';
  el.fxLayer.appendChild(node);
  setTimeout(() => node.remove(), 1050);
}

function shake() {
  if (reducedMotion) return;
  el.app.classList.remove('screen-shake');
  void el.app.offsetWidth;
  el.app.classList.add('screen-shake');
  setTimeout(() => el.app.classList.remove('screen-shake'), 470);
}

function flashDamage(own) {
  const flash = document.createElement('div');
  flash.className = 'damage-flash';
  flash.style.background = own
    ? 'radial-gradient(ellipse at 50% 78%,rgba(255,80,110,.28),transparent 62%)'
    : 'radial-gradient(ellipse at 50% 22%,rgba(255,80,110,.2),transparent 62%)';
  el.fxLayer.appendChild(flash);
  setTimeout(() => flash.remove(), 520);
}

function flashTactic() {
  const flash = document.createElement('div');
  flash.className = 'damage-flash';
  flash.style.background = 'radial-gradient(ellipse at 50% 52%,rgba(255,210,122,.2),transparent 68%)';
  el.fxLayer.appendChild(flash);
  setTimeout(() => flash.remove(), 650);
}

/* --------------------------------------------------------------------------
   Tilt / parallax
   -------------------------------------------------------------------------- */
function canRequestTilt() {
  return typeof DeviceOrientationEvent !== 'undefined';
}

async function toggleTilt() {
  if (tiltOn) {
    tiltOn = false;
    el.tiltBtn.setAttribute('aria-pressed', 'false');
    if (orientationHandler) {
      window.removeEventListener('deviceorientation', orientationHandler, true);
      orientationHandler = null;
    }
    document.documentElement.style.setProperty('--tilt-x', '0');
    document.documentElement.style.setProperty('--tilt-y', '0');
    toast('傾き操作をオフにしました', 2200);
    return;
  }
  if (!canRequestTilt()) {
    toast('この端末は傾きセンサー非対応です', 2600);
    return;
  }
  try {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== 'granted') {
        toast('モーション権限が許可されませんでした', 3000);
        return;
      }
    }
    orientationHandler = event => {
      const beta = typeof event.beta === 'number' ? event.beta : 45;
      const gamma = typeof event.gamma === 'number' ? event.gamma : 0;
      const x = clamp((beta - 45) / 34, -1, 1);
      const y = clamp(gamma / 32, -1, 1);
      document.documentElement.style.setProperty('--tilt-x', x.toFixed(3));
      document.documentElement.style.setProperty('--tilt-y', y.toFixed(3));
      document.documentElement.style.setProperty('--mx', (-y).toFixed(3));
      document.documentElement.style.setProperty('--my', x.toFixed(3));
      pointer.x = -y;
      pointer.y = x;
    };
    window.addEventListener('deviceorientation', orientationHandler, true);
    tiltOn = true;
    el.tiltBtn.setAttribute('aria-pressed', 'true');
    toast('端末を傾けて視点を動かせます', 3000);
  } catch {
    toast('傾き操作を開始できませんでした', 3000);
  }
}

function initMotion() {
  window.addEventListener('pointermove', event => {
    if (tiltOn) return;
    const x = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
    const y = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
    pointer.x = x;
    pointer.y = y;
    document.documentElement.style.setProperty('--mx', x.toFixed(3));
    document.documentElement.style.setProperty('--my', y.toFixed(3));
    document.documentElement.style.setProperty('--tilt-x', (-y * 0.75).toFixed(3));
    document.documentElement.style.setProperty('--tilt-y', (x * 0.9).toFixed(3));
  }, { passive: true });
  window.addEventListener('pointerleave', () => {
    if (tiltOn) return;
    pointer = { x: 0, y: 0 };
    document.documentElement.style.setProperty('--mx', '0');
    document.documentElement.style.setProperty('--my', '0');
    document.documentElement.style.setProperty('--tilt-x', '0');
    document.documentElement.style.setProperty('--tilt-y', '0');
  });
}

/* --------------------------------------------------------------------------
   Snow canvas
   -------------------------------------------------------------------------- */
function initSnow() {
  const overlay = el.snow;
  if (!overlay) return;
  const ctx = overlay.getContext('2d', { alpha: true });
  snow.ctx = ctx;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  snow.dpr = dpr;

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    snow.w = w;
    snow.h = h;
    overlay.width = Math.round(w * dpr);
    overlay.height = Math.round(h * dpr);
    overlay.style.width = `${w}px`;
    overlay.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = reducedMotion ? 28 : clamp(Math.round((w * h) / 15000), 42, 150);
    snow.flakes = Array.from({ length: count }, () => makeFlake(w, h, true));
  };
  window.addEventListener('resize', resize, { passive: true });
  resize();

  let last = performance.now();
  const tick = now => {
    const dt = Math.min(48, now - last);
    last = now;
    if (!snow.ctx || !snow.w) {
      snow.raf = requestAnimationFrame(tick);
      return;
    }
    ctx.clearRect(0, 0, snow.w, snow.h);
    const drift = Math.sin(now / 2600) * 0.35 + pointer.x * 0.9;
    for (const flake of snow.flakes) {
      flake.y += flake.vy * dt * (reducedMotion ? 0.32 : 1);
      flake.x += (flake.vx + drift * flake.depth) * dt * (reducedMotion ? 0.32 : 1);
      flake.spin += flake.spinSpeed * dt;
      if (flake.y > snow.h + 8) { flake.y = -8; flake.x = Math.random() * snow.w; }
      if (flake.x > snow.w + 12) flake.x = -12;
      if (flake.x < -12) flake.x = snow.w + 12;
      const alpha = flake.alpha * (0.72 + Math.sin(now / 900 + flake.phase) * 0.28);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = flake.depth > 0.8 ? '#f4feff' : '#c8f2ff';
      if (flake.r > 1.5) {
        ctx.beginPath();
        ctx.ellipse(flake.x, flake.y, flake.r, flake.r * 0.72, flake.spin, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(flake.x, flake.y, flake.r * 1.6, flake.r * 1.6);
      }
    }
    ctx.globalAlpha = 1;
    snow.raf = requestAnimationFrame(tick);
  };
  snow.raf = requestAnimationFrame(tick);
}

function makeFlake(w, h, initial = false) {
  const depth = 0.35 + Math.random() * 0.75;
  return {
    x: Math.random() * w,
    y: initial ? Math.random() * h : -8,
    r: 0.5 + depth * 1.7,
    vx: -5 + Math.random() * 12,
    vy: 8 + depth * 33,
    alpha: 0.2 + depth * 0.5,
    spin: Math.random() * Math.PI,
    spinSpeed: (Math.random() - 0.5) * 0.0014,
    phase: Math.random() * Math.PI * 2,
    depth,
  };
}

/* --------------------------------------------------------------------------
   Go
   -------------------------------------------------------------------------- */
window.__polarDuel = {
  get state() { return state; },
  get me() { return me; },
  get role() { return role; },
  get room() { return room; },
  get aiSeat() { return aiSeat; },
  get net() { return net; },
  tapCard: handleHandTap,
  tapZone: (player, zone) => handleZoneTap(player, zone, zoneEl(player, zone)),
  act,
  tilt: toggleTilt,
};

init();
