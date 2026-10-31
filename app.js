/* ARCTIC DUEL — 北極攻守表
   Online-only, host-authoritative card duel. No images, no icons, no offline mode. */
(() => {
'use strict';

/* ================================ helpers ================================ */
const $ = (s, r = document) => r.querySelector(s);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const rand = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rand(a.length)];
const other = (side) => side === 'host' ? 'guest' : 'host';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const now = () => Date.now();
const codeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(n = 6) {
  let out = '';
  const buf = new Uint8Array(n);
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(buf);
  for (let i = 0; i < n; i++) out += codeAlphabet[(buf[i] || rand(32)) % codeAlphabet.length];
  return out;
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function storeGet(store, key, fallback) {
  try { const v = store.getItem(key); return v === null ? fallback : v; } catch { return fallback; }
}
function storeSet(store, key, value) {
  try { store.setItem(key, value); } catch { /* private mode */ }
}
const local = window.localStorage;
const session = window.sessionStorage;

/* ================================ identity ================================ */
const playerId = storeGet(local, 'arcticduel.player', '') || (() => {
  const id = randomCode(10); storeSet(local, 'arcticduel.player', id); return id;
})();
const tabId = storeGet(session, 'arcticduel.tab', '') || (() => {
  const id = randomCode(10); storeSet(session, 'arcticduel.tab', id); return id;
})();
let ownRoom = (storeGet(local, 'arcticduel.room', '') || '').toUpperCase();
if (!/^[A-Z2-9]{6}$/.test(ownRoom)) {
  ownRoom = randomCode(6);
  storeSet(local, 'arcticduel.room', ownRoom);
}
const callsigns = ['FROST', 'GLACIER', 'AURORA', 'POLAR', 'TUNDRA', 'BLIZZARD', 'CRYSTAL', 'NORTH', 'HALO', 'SHARD'];
const nameFromId = (id) => `${pick(callsigns)}-${id.slice(0, 3).toUpperCase()}`;
const myName = storeGet(session, 'arcticduel.name', '') || (() => {
  const n = nameFromId(tabId); storeSet(session, 'arcticduel.name', n); return n;
})();

/* ================================ cards ================================ */
const CARD_POOL = [
  { name: 'FROST WOLF', jp: '霜狼', atk: 1800, def: 1200, lv: 4, el: 'BEAST', flavor: '氷原を駆ける白い狼。群れで吹雪を呼ぶ。' },
  { name: 'GLACIER GOLEM', jp: '氷河のゴーレム', atk: 1500, def: 2100, lv: 4, el: 'ROCK', flavor: '氷河を削って生まれた守護像。決して退かない。' },
  { name: 'AURORA SERPENT', jp: '極光の蛇', atk: 1900, def: 900, lv: 4, el: 'DRAGON', flavor: '夜空の光を鱗に宿す蛇。尾は星になる。' },
  { name: 'SNOW OWL', jp: '雪梟', atk: 1200, def: 1600, lv: 3, el: 'WING', flavor: '音もなく舞い降り、霜の羽を落とす。' },
  { name: 'ICEBERG TITAN', jp: '氷山の巨人', atk: 2400, def: 2000, lv: 6, el: 'ROCK', flavor: '海面下の九割が怒り。近づく者を砕く。' },
  { name: 'POLAR BEAR', jp: '北極熊', atk: 1700, def: 1400, lv: 4, el: 'BEAST', flavor: '氷を割り、海を渡る白き狩人。' },
  { name: 'CRYSTAL FOX', jp: '晶氷の狐', atk: 1000, def: 1000, lv: 2, el: 'BEAST', flavor: '結晶の尾を揺らし、春を探して走る。' },
  { name: 'BLIZZARD HAWK', jp: '吹雪の鷹', atk: 1400, def: 1100, lv: 3, el: 'WING', flavor: '翼の一振りで視界を白く塗りつぶす。' },
  { name: 'PERMAFROST WYRM', jp: '永久凍土の竜', atk: 2200, def: 1800, lv: 5, el: 'DRAGON', flavor: '凍った大地の底で眠る、古き竜。' },
  { name: 'FROZEN SENTINEL', jp: '凍てつく番人', atk: 900, def: 2000, lv: 4, el: 'ROCK', flavor: '門を守る氷像。その盾は千年融けない。' },
  { name: 'NORTH WIND', jp: '北風の精', atk: 1600, def: 1200, lv: 4, el: 'AQUA', flavor: '北から来た風の精霊。声はオーロラに溶ける。' },
  { name: 'SHARD DANCER', jp: '氷晶の舞姫', atk: 1300, def: 1500, lv: 3, el: 'AQUA', flavor: '氷の欠片を纏って舞う。踏むたび結晶が咲く。' },
  { name: 'HALO OF ICE', jp: '氷の光輪', atk: 2000, def: 1600, lv: 5, el: 'WING', flavor: '空に浮かぶ光の輪。触れたものを凍らせる。' },
  { name: 'TUNDRA STALKER', jp: 'ツンドラの追跡者', atk: 1800, def: 1500, lv: 4, el: 'BEAST', flavor: '足跡を残さず、吹雪の向こうから迫る。' }
];
const DECK_RECIPE = [0,0,0,1,1,2,2,3,3,4,5,5,5,6,6,7,7,8,9,9,10,10,11,11,12,13,13];
const START_LP = 4000;
const START_HAND = 4;
const ZONE_COUNT = 4;
const MQTT_URL = 'wss://broker.emqx.io:8084/mqtt';
const TOPIC_BASE = (room) => `arcticduel/v1/room/${room}`;
const SAVE_PREFIX = 'arcticduel.table.';

/* ================================ app state ================================ */
const app = {
  role: null, room: null, ownRoom,
  connected: false, hostOnline: false, hostName: null,
  guestId: null, guestName: null, guestOnline: false,
  lastGuestSeen: 0, lastHostSeen: 0,
  state: null, view: null, viewSeq: -1, viewMatch: 0,
  sel: null, summonMode: 'atk',
  lastFxId: 0, lastLogId: 0, lastHandSig: '', handUids: [],
  overShown: false, rematchRequested: false,
  actionN: 0, lastGuestN: 0, pending: false,
  tilt: false, sound: true,
  surrenderArm: 0, restored: false,
  timers: [], client: null, topics: null,
  lobbyState: 'host', lobbyErrorTimer: null,
  lastTurnShown: '', justBooted: true
};

/* ================================ dom ================================ */
const ui = {};
const ids = ['hudLink','hudRoom','netBox','netText','netDot','oppName','oppTag','oppLp','oppLpFill','oppDeck','oppHand','oppGrave','oppFan','logfeed',
  'meName','meTag','meLp','meLpFill','meDeck','meHand','meGrave','turnbar','turnState','turnMeta','board','boardMid','boardHint',
  'rowOpp','rowMine','ticker','preview','modebar','modeAtk','modeSet','hand','handCount','handHint','btnEnd','btnPosition',
  'btnSurrender','btnTilt','btnSound','toast','banner','splash','offline','offlineText','btnOfflineAction','lobby','lobbyEyebrow',
  'lobbyTitle','lobbySub','lobbyCodeWrap','lobbyCode','lobbyStatus','btnCopy','btnRetry','btnOwnRoom','joinBox','joinInput','btnJoin',
  'lobbyNet','ssTurn','ssPhase','ssNote','result','resultEyebrow','resultTitle','resultSub','resultTurns','resultLp','btnRematch','btnClose','btnHome','resultNote',
  'dock','shell','sky'];
ids.forEach((id) => { ui[id] = document.getElementById(id); });

/* ================================ duel engine ================================ */
let cardUidN = 0;
function makeCard(poolIndex) {
  const c = CARD_POOL[poolIndex];
  return {
    uid: `c${++cardUidN}`, key: poolIndex, name: c.name, jp: c.jp,
    atk: c.atk, def: c.def, lv: c.lv, el: c.el,
    pos: 'atk', faceDown: false, attacked: false, changed: false
  };
}
function buildDeck() {
  const bag = shuffle(DECK_RECIPE.slice()).slice(0, 20);
  return shuffle(bag.map(makeCard));
}
function makePlayer(name, id) {
  return { id, name, lp: START_LP, deck: [], hand: [], zones: Array(ZONE_COUNT).fill(null), grave: [], summonUsed: false };
}
function addLogRaw(s, text, kind = 'info') {
  s.logId = (s.logId || 0) + 1;
  s.log.push({ id: s.logId, text, kind });
  if (s.log.length > 40) s.log = s.log.slice(-30);
}
function addLog(s, text, kind) { addLogRaw(s, text, kind); }
function doFx(s, fx) {
  s.fxId = (s.fxId || 0) + 1;
  s.fx = Object.assign({ id: s.fxId, ts: now() }, fx);
  return s.fx;
}
function bump(s) { s.seq = (s.seq || 0) + 1; }

function createDuel(firstSide) {
  const s = {
    v: 1, room: app.room, matchId: 'm' + now().toString(36) + randomCode(3), seq: (app.state?.seq || 0) + 1,
    phase: 'duel', turn: firstSide, turnCount: 1, firstSide,
    players: {
      host: makePlayer(myName, tabId),
      guest: makePlayer(app.guestName || 'CHALLENGER', app.guestId || 'guest')
    },
    online: { host: true, guest: true },
    winner: null, reason: null, log: [], logId: 0, fx: null, fxId: 0
  };
  s.players.host.deck = buildDeck();
  s.players.guest.deck = buildDeck();
  for (const side of ['host', 'guest']) {
    const p = s.players[side];
    for (let i = 0; i < START_HAND; i++) p.hand.push(p.deck.pop());
  }
  addLogRaw(s, `ARCTIC DUEL — ${s.players.host.name} vs ${s.players.guest.name}`, 'start');
  addLogRaw(s, `${s.players[firstSide].name} が先攻。攻撃は2ターン目から。`, 'turn');
  addLogRaw(s, `TURN 1 — ${s.players[firstSide].name}`, 'turn');
  s.fx = { id: ++s.fxId, kind: 'start', matchId: s.matchId, ts: now() };
  return s;
}

function drawOne(s, side) {
  const p = s.players[side];
  if (!p.deck.length) {
    addLogRaw(s, `${p.name} は山札からドローできない`, 'damage');
    endGame(s, other(side), 'deck');
    return false;
  }
  p.hand.push(p.deck.pop());
  return true;
}

function startTurn(s, side, first) {
  s.turn = side;
  s.turnCount = first ? 1 : s.turnCount + 1;
  const p = s.players[side];
  p.summonUsed = false;
  for (const c of p.zones) if (c) { c.attacked = false; c.changed = false; }
  addLogRaw(s, `TURN ${s.turnCount} — ${p.name}`, 'turn');
  if (!first) {
    if (!drawOne(s, side)) return false;
    addLogRaw(s, `${p.name} は1枚ドロー`, 'draw');
  }
  doFx(s, { kind: 'turn', side });
  return true;
}

function endGame(s, winner, reason) {
  if (s.phase === 'over') return;
  s.phase = 'over';
  s.winner = winner;
  s.reason = reason;
  const wn = s.players[winner].name;
  addLogRaw(s, reason === 'deck' ? `${wn} の勝利 — 山札切れ` : reason === 'surrender' ? `${wn} の勝利 — 降参` : `${wn} の勝利 — LP 0`, 'win');
  doFx(s, { kind: 'win', winner, reason });
  bump(s);
}

function destroyCard(s, side, zone, fx) {
  const p = s.players[side];
  const c = p.zones[zone];
  if (!c) return;
  p.zones[zone] = null;
  p.grave.push(c);
  fx.destroyed.push({ side, zone, name: c.name, atk: c.atk, def: c.def, el: c.el });
}

function applyAction(s, side, a) {
  const no = (reason) => ({ ok: false, reason });
  if (!s || s.phase !== 'duel') return no('対戦中ではありません');
  if (!a || !a.type) return no('操作が不正です');
  const p = s.players[side];
  const o = s.players[other(side)];

  if (a.type === 'surrender') {
    addLogRaw(s, `${p.name} は降参した`, 'surrender');
    endGame(s, other(side), 'surrender');
    return { ok: true };
  }
  if (s.turn !== side) return no('あなたのターンではありません');
  if (s.online && s.online[other(side)] === false) return no('相手の接続を待っています');

  if (a.type === 'summon') {
    if (p.summonUsed) return no('召喚は1ターンに1回まで');
    const z = Number(a.zone);
    if (!Number.isInteger(z) || z < 0 || z >= ZONE_COUNT) return no('ゾーンが不正です');
    if (p.zones[z]) return no('そのゾーンは使用中です');
    const hi = p.hand.findIndex((c) => c.uid === a.uid);
    if (hi < 0) return no('そのカードは手札にありません');
    const c = p.hand.splice(hi, 1)[0];
    const set = a.mode === 'set';
    c.pos = set ? 'def' : 'atk';
    c.faceDown = set;
    c.attacked = false;
    c.changed = false;
    p.zones[z] = c;
    p.summonUsed = true;
    addLogRaw(s, set ? `${p.name} はカードを1枚セットした` : `${p.name} は ${c.name} を召喚 — ATK ${c.atk} / DEF ${c.def}`, 'summon');
    doFx(s, { kind: 'summon', side, zone: z, mode: c.pos, card: { name: c.name, atk: c.atk, def: c.def, el: c.el, lv: c.lv } });
    bump(s);
    return { ok: true };
  }

  if (a.type === 'switch') {
    const z = Number(a.zone);
    const c = p.zones[z];
    if (!c) return no('モンスターがいません');
    if (c.faceDown) return no('裏側のカードは変更できません');
    if (c.changed) return no('このターンは表示形式を変更済みです');
    if (c.attacked) return no('攻撃したモンスターは変更できません');
    c.pos = c.pos === 'atk' ? 'def' : 'atk';
    c.changed = true;
    addLogRaw(s, `${p.name} の ${c.name} を ${c.pos.toUpperCase()} 表示に変更`, 'position');
    doFx(s, { kind: 'position', side, zone: z, pos: c.pos });
    bump(s);
    return { ok: true };
  }

  if (a.type === 'attack') {
    if (s.turnCount === 1) return no('先攻1ターン目は攻撃できません');
    const from = Number(a.from);
    const atk = p.zones[from];
    if (!atk) return no('攻撃するモンスターがいません');
    if (atk.faceDown || atk.pos !== 'atk') return no('攻撃できるのは表側攻撃表示のみです');
    if (atk.attacked) return no('このモンスターは攻撃済みです');
    const hasTargets = o.zones.some(Boolean);
    let targetZone = null;
    let target = null;
    if (a.target !== null && a.target !== undefined) {
      targetZone = Number(a.target);
      if (!Number.isInteger(targetZone) || targetZone < 0 || targetZone >= ZONE_COUNT) return no('対象が不正です');
      target = o.zones[targetZone];
      if (!target) return no('対象がいません');
    } else if (hasTargets) {
      return no('相手モンスターを対象にしてください');
    }
    atk.attacked = true;
    const fx = {
      kind: 'attack', side, from, target: targetZone, direct: !target,
      damage: 0, damageTo: null, destroyed: [], flipped: null, winner: null,
      attacker: { name: atk.name, atk: atk.atk, def: atk.def, el: atk.el, lv: atk.lv },
      targetCard: target ? { name: target.name, atk: target.atk, def: target.def, el: target.el, lv: target.lv } : null
    };
    addLogRaw(s, `${p.name} の ${atk.name} (ATK ${atk.atk}) が${target ? ' 攻撃' : ' ダイレクトアタック'}`, 'attack');

    if (target && target.faceDown) {
      target.faceDown = false;
      target.pos = 'def';
      fx.flipped = { side: other(side), zone: targetZone, name: target.name, atk: target.atk, def: target.def, el: target.el, lv: target.lv };
      addLogRaw(s, `${target.name} をリバース — DEF ${target.def}`, 'flip');
    }

    let damageTo = null;
    let damage = 0;
    if (!target) {
      damage = atk.atk; damageTo = other(side); o.lp -= damage;
    } else if (target.pos === 'atk') {
      if (atk.atk > target.atk) {
        damage = atk.atk - target.atk; damageTo = other(side); o.lp -= damage;
        destroyCard(s, other(side), targetZone, fx);
        addLogRaw(s, `${target.name} を破壊 — ${damage} ダメージ`, 'destroy');
      } else if (atk.atk < target.atk) {
        damage = target.atk - atk.atk; damageTo = side; p.lp -= damage;
        destroyCard(s, side, from, fx);
        addLogRaw(s, `${atk.name} を破壊 — ${damage} ダメージ`, 'destroy');
      } else {
        destroyCard(s, side, from, fx);
        destroyCard(s, other(side), targetZone, fx);
        addLogRaw(s, '相打ち — 両モンスターを破壊', 'destroy');
      }
    } else {
      if (atk.atk > target.def) {
        destroyCard(s, other(side), targetZone, fx);
        addLogRaw(s, `${target.name} を破壊 — 貫通ダメージなし`, 'destroy');
      } else if (atk.atk < target.def) {
        damage = target.def - atk.atk; damageTo = side; p.lp -= damage;
        destroyCard(s, side, from, fx);
        addLogRaw(s, `${atk.name} を破壊 — ${damage} ダメージ`, 'destroy');
      } else {
        addLogRaw(s, '攻撃は弾かれた', 'block');
      }
    }
    p.lp = Math.max(0, p.lp);
    o.lp = Math.max(0, o.lp);
    fx.damage = damage;
    fx.damageTo = damageTo;
    fx.lp = { host: s.players.host.lp, guest: s.players.guest.lp };
    if (damage && damageTo) addLogRaw(s, damageTo === side ? `${p.name} に ${damage} ダメージ` : `${o.name} に ${damage} ダメージ`, 'damage');

    if (p.lp <= 0 || o.lp <= 0) {
      s.phase = 'over';
      s.winner = p.lp <= 0 ? other(side) : side;
      s.reason = 'lp';
      fx.winner = s.winner;
      addLogRaw(s, `${s.players[s.winner].name} の勝利 — LP 0`, 'win');
    }
    doFx(s, fx);
    bump(s);
    return { ok: true };
  }

  if (a.type === 'end') {
    if (!startTurn(s, other(side), false)) return { ok: true };
    bump(s);
    return { ok: true };
  }

  return no('不明な操作です');
}

function playerView(p, own, reveal) {
  return {
    name: p.name,
    lp: p.lp,
    deckCount: p.deck.length,
    handCount: p.hand.length,
    graveCount: p.grave.length,
    hand: (own || reveal) ? p.hand.map(cardView) : null,
    zones: p.zones.map((z) => {
      if (!z) return null;
      if (!own && !reveal && z.faceDown) return { hidden: true, pos: 'set' };
      const v = cardView(z);
      v.pos = z.pos;
      v.faceDown = z.faceDown;
      if (own) { v.attacked = !!z.attacked; v.changed = !!z.changed; }
      return v;
    })
  };
}
function cardView(c) {
  return { uid: c.uid, name: c.name, jp: c.jp, atk: c.atk, def: c.def, lv: c.lv, el: c.el };
}
function makeView(s, side) {
  const o = other(side);
  const p = s.players[side];
  const opp = s.players[o];
  const reveal = s.phase === 'over';
  return {
    v: 1, room: s.room, matchId: s.matchId, seq: s.seq, phase: s.phase, you: side,
    turn: s.turn === side ? 'me' : 'opp', turnCount: s.turnCount, firstTurn: s.turnCount === 1,
    me: playerView(p, true, reveal),
    opp: playerView(opp, false, reveal),
    summonUsed: !!p.summonUsed,
    canAct: s.phase === 'duel' && s.turn === side && s.online[o] !== false,
    online: { me: true, opp: s.online[o] !== false },
    winner: s.winner ? (s.winner === side ? 'me' : 'opp') : null,
    reason: s.reason,
    log: s.log.slice(-12),
    fx: s.fx
  };
}

/* ================================ networking ================================ */
function publish(topic, obj, opts) {
  const c = app.client;
  if (!c || !c.connected) return false;
  try { c.publish(topic, JSON.stringify(obj), Object.assign({ qos: 0, retain: false }, opts || {})); return true; }
  catch { return false; }
}
function clearTimers() {
  for (const t of app.timers) clearInterval(t);
  app.timers = [];
}
function teardownClient(announce) {
  clearTimers();
  const c = app.client;
  if (c) {
    try {
      if (announce && c.connected) {
        if (app.role === 'host' && app.topics) publish(app.topics.lobby, { t: 'hostbye', room: app.room, host: tabId, ts: now() }, { retain: true });
        if (app.role === 'guest' && app.topics) publish(app.topics.bus, { t: 'bye', room: app.room, id: tabId, ts: now() });
      }
      c.end(true);
    } catch { /* noop */ }
  }
  app.client = null;
  app.connected = false;
  updateNet();
}
function connectMqtt() {
  teardownClient(false);
  if (!window.mqtt) {
    toast('通信ライブラリを読み込めません。再読み込みしてください。');
    return;
  }
  const base = TOPIC_BASE(app.room);
  app.topics = { bus: base + '/bus', lobby: base + '/lobby' };
  const clientId = `ad_${app.role === 'host' ? 'h' : 'g'}_${tabId}_${randomCode(4)}`;
  const opts = {
    clientId, clean: true, connectTimeout: 12000, reconnectPeriod: 2500,
    keepalive: 25, resubscribe: true, protocolVersion: 4
  };
  if (app.role === 'host') {
    opts.will = { topic: app.topics.lobby, payload: JSON.stringify({ t: 'hostbye', room: app.room, host: tabId, ts: now() }), qos: 0, retain: true };
  } else {
    opts.will = { topic: app.topics.bus, payload: JSON.stringify({ t: 'bye', room: app.room, id: tabId, ts: now() }), qos: 0, retain: false };
  }
  let c;
  try { c = window.mqtt.connect(MQTT_URL, opts); } catch (e) { toast('接続を開始できません'); return; }
  app.client = c;
  c.on('connect', () => {
    app.connected = true;
    app.everConnected = true;
    updateNet();
    c.subscribe([app.topics.bus, app.topics.lobby], { qos: 0 });
    startTimers();
    if (app.role === 'host') {
      publishLobby();
      if (app.state && app.guestId) publishState();
    } else {
      sendHello();
      if (app.view) sendPing();
    }
  });
  c.on('reconnect', () => { app.connected = false; updateNet(); });
  c.on('close', () => { app.connected = false; updateNet(); });
  c.on('offline', () => { app.connected = false; updateNet(); });
  c.on('error', (err) => { console.warn('[mqtt]', err?.message || err); });
  c.on('message', (topic, payload) => {
    let msg;
    try { msg = JSON.parse(payload.toString()); } catch { return; }
    if (!msg || msg.room !== app.room) return;
    if (topic === app.topics.lobby) handleLobby(msg);
    else if (topic === app.topics.bus) handleBus(msg);
  });
}
function startTimers() {
  clearTimers();
  if (app.role === 'host') {
    app.timers.push(setInterval(publishLobby, 3000));
    app.timers.push(setInterval(() => { if (app.state && app.guestId && app.connected) publishState(); }, 4000));
    app.timers.push(setInterval(hostPresenceTick, 2000));
  } else {
    app.timers.push(setInterval(() => { if (!app.connected) return; if (!app.view) sendHello(); else sendPing(); }, 3000));
    app.timers.push(setInterval(guestPresenceTick, 2000));
  }
}
function sendHello() {
  publish(app.topics?.bus, { t: 'hello', room: app.room, id: tabId, name: myName, ts: now() });
}
function sendPing() {
  publish(app.topics?.bus, { t: 'ping', room: app.room, id: tabId, name: myName, ts: now() });
}
function sendToGuest(obj) {
  if (!app.guestId) return;
  publish(app.topics?.bus, Object.assign({ room: app.room, to: app.guestId, ts: now() }, obj));
}
function publishLobby() {
  if (app.role !== 'host' || !app.connected) return;
  publish(app.topics?.lobby, {
    t: 'lobby', room: app.room, host: tabId, hostName: myName,
    phase: app.state?.phase || 'lobby', guestName: app.guestName || null,
    guestOnline: !!app.guestOnline, matchId: app.state?.matchId || 0, ts: now()
  }, { retain: true });
}
function publishState() {
  if (app.role !== 'host' || !app.state || !app.guestId || !app.connected) return;
  sendToGuest({ t: 'state', to: app.guestId, view: makeView(app.state, 'guest') });
}

function handleLobby(msg) {
  if (app.role !== 'guest') return;
  if (msg.t === 'hostbye') {
    if (app.view) { app.hostOnline = false; updateOfflineBar(); }
    return;
  }
  if (msg.t !== 'lobby') return;
  app.hostName = msg.hostName || app.hostName;
  app.lastHostSeen = now();
  if (!app.hostOnline) app.hostOnline = true;
  if (!app.view && app.lobbyState !== 'error') {
    app.lobbyState = 'found';
    setLobbyStatus('ホストを検出 — 入室しています', 'found');
  }
  if (app.view && app.view.phase === 'duel' && msg.phase === 'lobby' && !app.closedNotified) {
    app.closedNotified = true;
    guestClosed();
  }
  updateOfflineBar();
}
function handleBus(msg) {
  if (app.role === 'host') {
    if (msg.id === tabId) return;
    if (msg.t === 'hello') hostOnHello(msg);
    else if (msg.t === 'ping') hostOnPing(msg);
    else if (msg.t === 'action') hostOnAction(msg);
    else if (msg.t === 'rematch') hostOnRematch(msg);
    else if (msg.t === 'bye' || msg.t === 'leave') hostOnLeave(msg);
    return;
  }
  if (msg.to && msg.to !== tabId) return;
  if (msg.t === 'state') guestOnState(msg);
  else if (msg.t === 'nack') { toast(msg.reason || '操作できませんでした'); app.pending = false; }
  else if (msg.t === 'busy') guestBusy();
  else if (msg.t === 'closed') guestClosed();
}

function hostOnPing(msg) {
  if (!msg.id || msg.id !== app.guestId) return;
  app.lastGuestSeen = now();
  if (!app.guestOnline) {
    app.guestOnline = true;
    if (app.state) {
      app.state.online.guest = true;
      bump(app.state);
      afterHostMutation();
    }
  }
}
function hostOnHello(msg) {
  if (!msg.id || msg.id === tabId) return;
  app.lastGuestSeen = now();
  if (app.state && app.state.phase !== 'lobby') {
    if (msg.id !== app.guestId) {
      sendToGuest({ t: 'busy', to: msg.id, reason: 'このルームは対戦中です' });
      return;
    }
    if (!app.guestOnline || app.state.online.guest === false) {
      app.guestOnline = true;
      app.state.online.guest = true;
      bump(app.state);
      afterHostMutation();
    } else {
      publishState();
    }
    return;
  }
  if (app.guestId && app.guestId !== msg.id && app.state) {
    sendToGuest({ t: 'busy', to: msg.id, reason: 'このルームは使用中です' });
    return;
  }
  app.guestId = msg.id;
  app.guestName = msg.name || nameFromId(msg.id);
  app.guestOnline = true;
  app.lastGuestSeen = now();
  startHostDuel();
}
function startHostDuel() {
  if (!app.guestId) return;
  app.state = createDuel('host');
  app.state.online.guest = true;
  app.guestOnline = true;
  app.lastGuestSeen = now();
  app.restored = false;
  app.rematchRequested = false;
  afterHostMutation();
}
function hostOnAction(msg) {
  if (!app.state || msg.from !== app.guestId) return;
  if (msg.n) {
    if (msg.n <= app.lastGuestN) return;
    app.lastGuestN = msg.n;
  }
  app.lastGuestSeen = now();
  if (!app.guestOnline) {
    app.guestOnline = true;
    app.state.online.guest = true;
  }
  const res = applyAction(app.state, 'guest', msg.action);
  if (!res.ok) { sendToGuest({ t: 'nack', to: app.guestId, reason: res.reason }); publishState(); return; }
  afterHostMutation();
}
function hostOnRematch(msg) {
  if (!app.state || msg.from !== app.guestId) return;
  app.rematchRequested = true;
  ui.resultNote.classList.remove('hidden');
  toast('相手が再戦を希望しています');
  showBanner('REMATCH REQUEST');
}
function hostOnLeave(msg) {
  if (!app.state || msg.id !== app.guestId) {
    if (msg.id === app.guestId && !app.state) { app.guestId = null; app.guestOnline = false; publishLobby(); }
    return;
  }
  if (app.state.phase === 'duel' || app.state.phase === 'over') {
    app.guestOnline = false;
    app.state.online.guest = false;
    addLogRaw(app.state, `${app.state.players.guest.name} が退出した`, 'info');
    bump(app.state);
    saveTable(); publishState(); publishLobby(); applyHostView();
  } else {
    app.guestId = null; app.guestOnline = false;
    publishLobby(); showLobbyHost();
  }
}
function afterHostMutation() {
  if (!app.state) return;
  saveTable();
  publishState();
  publishLobby();
  applyHostView();
}
function hostPresenceTick() {
  if (!app.guestId) return;
  if (app.guestOnline && now() - app.lastGuestSeen > 12000) {
    app.guestOnline = false;
    if (app.state) {
      app.state.online.guest = false;
      saveTable();
      publishState();
      publishLobby();
      applyHostView();
    }
  }
}
function guestPresenceTick() {
  if (!app.view) return;
  if (app.hostOnline && now() - app.lastHostSeen > 12000) {
    app.hostOnline = false;
    updateOfflineBar();
  }
  updateOfflineBar();
}
function guestOnState(msg) {
  if (!msg.view || msg.to !== tabId) return;
  app.lastHostSeen = now();
  app.hostOnline = true;
  app.lobbyState = 'duel';
  app.pending = false;
  applyView(msg.view);
  updateOfflineBar();
}
function guestBusy() {
  app.lobbyState = 'error';
  showLobbyGuest();
  setLobbyStatus('このルームは対戦中です', 'error');
  ui.btnRetry.classList.remove('hidden');
  ui.btnOwnRoom.classList.remove('hidden');
  ui.btnCopy.classList.add('hidden');
  ui.joinBox.classList.add('hidden');
}
function guestClosed() {
  toast('ホストがテーブルを閉じました');
  setTimeout(() => goOwnRoom(), 900);
}

/* ================================ persistence ================================ */
function saveTable() {
  if (app.role !== 'host' || !app.state) return;
  try { storeSet(local, SAVE_PREFIX + app.room, JSON.stringify({ t: now(), s: app.state })); } catch { }
}
function loadTable(room) {
  const raw = storeGet(local, SAVE_PREFIX + room, '');
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (!obj || !obj.s || obj.s.room !== room) return null;
    if (now() - obj.t > 3 * 3600 * 1000) return null;
    if (obj.s.phase !== 'duel' && obj.s.phase !== 'over') return null;
    return obj.s;
  } catch { return null; }
}
function clearTable(room) {
  try { local.removeItem(SAVE_PREFIX + room); } catch { }
}
function restoreTable(room) {
  const s = loadTable(room);
  if (!s) return false;
  s.online = { host: true, guest: false };
  app.state = s;
  app.guestId = s.players.guest.id || null;
  app.guestName = s.players.guest.name || null;
  app.guestOnline = false;
  app.restored = true;
  app.view = null;
  app.viewSeq = -1;
  app.viewMatch = 0;
  applyView(makeView(s, 'host'), { noSplash: true });
  updateOfflineBar();
  return true;
}

/* ================================ rendering ================================ */
const zoneEls = { opp: [], me: [] };

function buildZones() {
  for (const side of ['opp', 'me']) {
    const row = side === 'opp' ? ui.rowOpp : ui.rowMine;
    row.innerHTML = '';
    zoneEls[side] = [];
    for (let i = 0; i < ZONE_COUNT; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'zone empty';
      b.dataset.side = side;
      b.dataset.i = String(i);
      b.innerHTML = '<span class="zone-tag">OPEN</span>';
      b.setAttribute('aria-label', `${side === 'opp' ? '相手' : '自分'}ゾーン${i + 1} 空き`);
      b.addEventListener('click', () => onZoneClick(side, i));
      row.appendChild(b);
      zoneEls[side].push(b);
    }
  }
}

function cardHTML(c, hidden) {
  if (!c) return '';
  if (hidden || c.hidden) {
    return '<div class="card back"><span class="back-word">SET</span><span class="back-sub">DEFENSE</span></div>';
  }
  const el = String(c.el || 'beast').toLowerCase();
  const pos = c.pos === 'def' ? 'def' : 'atk';
  return `<div class="card el-${esc(el)} pos-${pos}${c.attacked ? ' attacked' : ''}">
    <div class="cname">${esc(c.name)}</div>
    <div class="cart"><span class="cel">${esc(c.el)}</span><span class="clv">LV${c.lv}</span></div>
    <div class="cstats"><span class="atk">ATK ${c.atk}</span><span class="def">DEF ${c.def}</span></div>
    <span class="cpos">${pos.toUpperCase()}</span>
  </div>`;
}

function canAct() {
  const v = app.view;
  if (!v || v.phase !== 'duel' || v.turn !== 'me' || !v.online.opp || !app.connected) return false;
  if (app.role === 'guest' && !app.hostOnline) return false;
  return true;
}
function handSelectedCard() {
  if (!app.sel || app.sel.kind !== 'hand' || !app.view) return null;
  return (app.view.me.hand || []).find((c) => c.uid === app.sel.uid) || null;
}
function selectedOwnCard() {
  if (!app.sel || app.sel.kind !== 'zone' || !app.view) return null;
  return app.view.me.zones[app.sel.i] || null;
}
function selectedAttacker() {
  const c = selectedOwnCard();
  if (!c || c.hidden || c.pos !== 'atk' || c.faceDown || c.attacked) return null;
  return c;
}

function renderAll() {
  const v = app.view;
  const my = v?.me;
  const op = v?.opp;
  const lobby = v?.phase === 'lobby' || !v;

  ui.meName.textContent = my?.name || myName;
  ui.oppName.textContent = op?.name || (app.role === 'host' ? 'WAITING FOR CHALLENGER' : (app.hostName || 'HOST'));
  ui.meLp.textContent = my?.lp ?? START_LP;
  ui.oppLp.textContent = op?.lp ?? START_LP;
  ui.meDeck.textContent = my?.deckCount ?? 0;
  ui.oppDeck.textContent = op?.deckCount ?? 0;
  ui.meHand.textContent = my?.handCount ?? 0;
  ui.oppHand.textContent = op?.handCount ?? 0;
  ui.meGrave.textContent = my?.graveCount ?? 0;
  ui.oppGrave.textContent = op?.graveCount ?? 0;
  setLp(ui.meLpFill, my?.lp ?? START_LP);
  setLp(ui.oppLpFill, op?.lp ?? START_LP);
  ui.meName.title = ui.meName.textContent;
  ui.oppName.title = ui.oppName.textContent;

  const act = canAct();
  const first = v?.firstTurn;
  ui.meTag.textContent = v?.phase === 'over' ? 'FINISHED' : v?.turn === 'me' ? 'YOUR TURN' : (v ? 'STANDBY' : (app.connected ? 'ONLINE' : 'CONNECTING'));
  ui.meTag.classList.toggle('turn', v?.turn === 'me' && v?.phase === 'duel');
  ui.oppTag.textContent = !v ? 'WAITING' : !v.online.opp ? 'OFFLINE' : v.turn === 'opp' ? 'THEIR TURN' : 'STANDBY';
  ui.oppTag.classList.toggle('turn', v?.turn === 'opp' && v?.phase === 'duel');
  ui.oppTag.classList.toggle('offline', !!v && !v.online.opp);

  if (lobby) {
    ui.turnState.textContent = app.connected ? 'WAITING FOR CHALLENGER' : 'CONNECTING';
    ui.turnMeta.textContent = `ROOM ${app.room || '------'}`;
    ui.turnbar.classList.remove('mine', 'theirs');
  } else if (v.phase === 'over') {
    ui.turnState.textContent = 'DUEL COMPLETE';
    ui.turnMeta.textContent = `TURN ${v.turnCount}`;
    ui.turnbar.classList.remove('mine', 'theirs');
  } else {
    ui.turnState.textContent = v.turn === 'me' ? 'YOUR TURN / あなたのターン' : 'OPPONENT TURN / 相手のターン';
    ui.turnMeta.textContent = `TURN ${v.turnCount}${first ? ' / NO ATTACK' : ''}`;
    ui.turnbar.classList.toggle('mine', v.turn === 'me');
    ui.turnbar.classList.toggle('theirs', v.turn === 'opp');
  }

  if (ui.ssTurn) {
    ui.ssTurn.textContent = !v ? '--' : String(v.turnCount).padStart(2, '0');
    ui.ssPhase.textContent = !v ? 'WAITING' : v.phase === 'over' ? 'COMPLETE' : v.turn === 'me' ? 'YOUR TURN' : 'OPPONENT';
    ui.ssPhase.classList.toggle('mine', !!v && v.turn === 'me' && v.phase === 'duel');
    ui.ssNote.textContent = !v ? 'ONLINE TABLE' : v.phase === 'over' ? (v.winner === 'me' ? 'VICTORY' : 'DEFEAT') : v.firstTurn ? '先攻1ターン目 / 攻撃不可' : v.turn === 'me' ? '手札から召喚 / 攻撃' : '相手のターン / 待機';
  }

  renderZones();
  renderHand();
  renderFan(op);
  renderTicker();
  renderLogFeed();
  renderPreview();
  renderModes();
  renderActions();

  ui.btnEnd.disabled = !act;
  ui.handHint.textContent = !v ? 'タップで選択' : v.phase === 'duel' ? (act ? (v.summonUsed ? '召喚済み' : 'タップで選択') : '相手のターン') : '';
  ui.boardHint.textContent = boardHintText();
  updateOfflineBar();
}
function setLp(el, lp) {
  const pct = clamp((lp / START_LP) * 100, 0, 100);
  el.style.width = pct + '%';
  el.classList.toggle('low', lp <= 1000);
}
function boardHintText() {
  const v = app.view;
  if (!v) return 'ONLINE DUEL / 対戦相手を待っています';
  if (v.phase === 'over') return 'DUEL COMPLETE';
  if (!v.online.opp) return 'PAUSED / 再接続を待っています';
  if (!canAct()) return 'OPPONENT TURN / 相手のターン';
  const hc = handSelectedCard();
  if (hc) {
    if (v.summonUsed) return 'SUMMON USED / このターンの召喚は終了';
    return 'SELECT ZONE / 自分の空きゾーンへ';
  }
  const atk = selectedAttacker();
  if (atk) {
    if (v.firstTurn) return 'FIRST TURN / 先攻は攻撃できません';
    const oppHas = v.opp.zones.some(Boolean);
    return oppHas ? 'SELECT TARGET / 攻撃対象をタップ' : 'DIRECT ATTACK / 相手ゾーンをタップ';
  }
  if (selectedOwnCard()) return 'ATTACK / 表示形式変更';
  return 'SELECT A CARD / カードを選択';
}
function renderZones() {
  const v = app.view;
  const act = canAct();
  const hc = handSelectedCard();
  const attacker = selectedAttacker();
  const oppHas = !!v && v.opp.zones.some(Boolean);

  for (const side of ['opp', 'me']) {
    for (let i = 0; i < ZONE_COUNT; i++) {
      const el = zoneEls[side][i];
      const z = !v ? null : (side === 'me' ? v.me.zones[i] : v.opp.zones[i]);
      const sig = !z ? '' : (z.hidden ? 'HIDDEN' : `${z.uid}:${z.pos}:${z.attacked ? 1 : 0}`);
      if (el.dataset.sig !== sig) {
        el.dataset.sig = sig;
        el.innerHTML = z ? cardHTML(z) : '<span class="zone-tag">OPEN</span>';
      }
      el.classList.toggle('empty', !z);
      el.classList.toggle('attacked', !!z && !z.hidden && !!z.attacked);
      el.classList.toggle('selected', !!app.sel && app.sel.kind === 'zone' && side === 'me' && app.sel.i === i);
      const playable = !!hc && act && side === 'me' && !z && !v.summonUsed;
      el.classList.toggle('playable', playable);
      let targetable = false;
      if (attacker && act && !v.firstTurn && side === 'opp') {
        targetable = oppHas ? !!z : !z;
      }
      el.classList.toggle('targetable', targetable);
      el.classList.toggle('direct-row', side === 'opp' && !!attacker && act && !oppHas && !v?.firstTurn);
      el.setAttribute('aria-label', `${side === 'opp' ? '相手' : '自分'}ゾーン${i + 1} ${z ? (z.hidden ? 'セットカード' : z.name) : '空き'}`);
    }
  }
}
function renderHand() {
  const v = app.view;
  const hand = v?.me.hand || [];
  const sig = hand.map((c) => c.uid).join(',');
  if (sig !== app.lastHandSig) {
    const prev = new Set(app.handUids);
    app.lastHandSig = sig;
    if (!hand.length) ui.hand.innerHTML = '';
    else {
      ui.hand.innerHTML = hand.map((c) => `<button type="button" class="hand-card el-${esc(String(c.el).toLowerCase())}" data-uid="${esc(c.uid)}" aria-label="${esc(c.name)} ATK ${c.atk} DEF ${c.def}">${cardHTML(c, false)}</button>`).join('');
    }
    app.handUids = hand.map((c) => c.uid);
    if (hand.length > prev.size) {
      const added = hand.filter((c) => !prev.has(c.uid));
      for (const c of added) {
        const el = ui.hand.querySelector(`[data-uid="${c.uid}"]`);
        if (el) el.classList.add('drawn');
      }
    }
  }
  ui.handCount.textContent = hand.length;
  const buttons = ui.hand.querySelectorAll('.hand-card');
  for (const b of buttons) {
    const uid = b.dataset.uid;
    b.classList.toggle('selected', !!app.sel && app.sel.kind === 'hand' && app.sel.uid === uid);
    b.classList.toggle('disabled', !v || v.phase !== 'duel');
  }
}
function renderFan(op) {
  const count = op?.handCount || 0;
  const sig = String(count);
  if (ui.oppFan.dataset.sig !== sig) {
    ui.oppFan.dataset.sig = sig;
    ui.oppFan.innerHTML = Array.from({ length: count }, () => '<span class="fan-card"></span>').join('');
  }
}
function renderTicker() {
  const v = app.view;
  let text = 'ARCTIC DUEL — ルームを立てています';
  let id = 0;
  if (v && v.log && v.log.length) {
    const last = v.log[v.log.length - 1];
    text = last.text;
    id = last.id;
  }
  if (id !== app.lastLogId) {
    app.lastLogId = id;
    ui.ticker.textContent = text;
    ui.ticker.classList.remove('flash');
    void ui.ticker.offsetWidth;
    ui.ticker.classList.add('flash');
  } else if (ui.ticker.textContent !== text) ui.ticker.textContent = text;
}
function renderLogFeed() {
  const logs = app.view?.log || [];
  const sig = logs.map((l) => l.id).join(',');
  if (sig === app.lastFeedSig) return;
  app.lastFeedSig = sig;
  if (!logs.length) { ui.logfeed.innerHTML = '<div class="logempty">NO LOG / 待機中</div>'; return; }
  ui.logfeed.innerHTML = logs.map((l) => `<div class="logline k-${esc(l.kind || 'info')}">${esc(l.text)}</div>`).join('');
  ui.logfeed.scrollTop = ui.logfeed.scrollHeight;
}
function renderPreview() {
  const v = app.view;
  const hc = handSelectedCard();
  const zc = selectedOwnCard();
  if (hc) {
    const mode = app.summonMode === 'set' ? '裏守備でセット' : '表側攻撃表示で召喚';
    const blocked = !canAct() ? ' / 相手のターン' : v.summonUsed ? ' / 召喚済み' : '';
    ui.preview.innerHTML = `<b>${esc(hc.name)}</b> <span class="pv-tag">LV${hc.lv} ${esc(hc.el)}</span> <span class="pv-atk">ATK ${hc.atk}</span> <span class="pv-def">DEF ${hc.def}</span> <span class="pv-tag">${mode}${blocked}</span>`;
    return;
  }
  if (zc) {
    if (zc.hidden) {
      ui.preview.innerHTML = `<b>SET CARD</b> <span class="pv-tag">裏守備</span> <span class="pv-tag">攻撃されるまで非公開</span>`;
    } else {
      const act = selectedAttacker();
      const extra = act ? (v.firstTurn ? ' / 先攻は攻撃不可' : ' / 攻撃対象を選択') : zc.pos === 'atk' ? ' / 攻撃可能' : ' / 守備表示';
      ui.preview.innerHTML = `<b>${esc(zc.name)}</b> <span class="pv-tag">LV${zc.lv} ${esc(zc.el)}</span> <span class="pv-atk">ATK ${zc.atk}</span> <span class="pv-def">DEF ${zc.def}</span> <span class="pv-tag">${zc.pos.toUpperCase()}${zc.attacked ? ' / 攻撃済み' : ''}${extra}</span>`;
    }
    return;
  }
  if (!v) { ui.preview.textContent = '対戦相手を待っています'; return; }
  if (v.phase === 'over') { ui.preview.textContent = v.winner === 'me' ? '勝利 — 再戦できます' : '敗北 — 再戦を申し込めます'; return; }
  if (!v.online.opp) { ui.preview.textContent = '相手の再接続を待っています'; return; }
  if (v.phase === 'lobby') { ui.preview.textContent = '対戦相手を待っています'; return; }
  if (!canAct()) { ui.preview.textContent = '相手のターン — 手札はタップで閲覧できます'; return; }
  if (v.firstTurn) { ui.preview.textContent = '先攻1ターン目 — 召喚できます。攻撃は次のターンから'; return; }
  ui.preview.textContent = v.summonUsed ? 'このターンの召喚は済んでいます — 攻撃かターン終了' : '手札をタップ → 召喚するゾーンをタップ';
}
function renderModes() {
  const show = !!handSelectedCard() && app.view?.phase === 'duel';
  ui.modebar.classList.toggle('show', show);
  ui.modeAtk.classList.toggle('active', app.summonMode === 'atk');
  ui.modeSet.classList.toggle('active', app.summonMode === 'set');
  ui.modeAtk.disabled = !show;
  ui.modeSet.disabled = !show;
}
function renderActions() {
  const v = app.view;
  const zc = selectedOwnCard();
  const posOk = !!zc && !zc.hidden && canAct() && !zc.changed && !zc.attacked;
  ui.btnPosition.disabled = !posOk;
  ui.btnSurrender.disabled = !v || v.phase !== 'duel';
  ui.btnSurrender.textContent = app.surrenderArm && now() - app.surrenderArm < 3000 ? '本当に降参' : '降参';
  ui.btnTilt.textContent = app.tilt ? '傾き ON' : '傾き OFF';
  ui.btnSound.textContent = app.sound ? '音 ON' : '音 OFF';
}
function updateOfflineBar() {
  if (!ui.offline) return;
  const v = app.view;
  let show = false, text = '', action = '', flag = '';
  if (app.role === 'host' && v && v.phase !== 'lobby' && v.online.opp === false) {
    show = true; text = '相手の接続を待っています / PAUSED'; action = 'テーブルを閉じる'; flag = 'close';
  } else if (app.role === 'guest' && v && !app.hostOnline) {
    show = true; text = 'ホストの接続を待っています / RECONNECTING'; action = '自分のルームへ'; flag = 'home';
  } else if (app.everConnected && !app.connected) {
    show = true; text = 'サーバーに再接続中 / RECONNECTING'; action = app.role === 'guest' ? '自分のルームへ' : ''; flag = app.role === 'guest' ? 'home' : '';
  }
  ui.offline.classList.toggle('hidden', !show);
  if (show) {
    ui.offlineText.textContent = text;
    ui.btnOfflineAction.textContent = action;
    ui.btnOfflineAction.classList.toggle('hidden', !action);
    app.offlineAction = flag;
  }
}
function updateNet() {
  if (!ui.netBox) return;
  ui.netBox.classList.toggle('online', app.connected);
  ui.netBox.classList.toggle('offline', !app.connected && app.everConnected);
  const text = app.connected ? 'ONLINE' : app.everConnected ? 'RECONNECTING' : 'CONNECTING';
  ui.netText.textContent = text;
  ui.lobbyNet.textContent = app.connected ? 'ONLINE / 通信専用' : text;
  ui.lobbyNet.classList.toggle('off', !app.connected);
  updateOfflineBar();
}
function applyHostView() {
  if (!app.state) return;
  applyView(makeView(app.state, 'host'));
}
function applyView(view, opts) {
  opts = opts || {};
  if (!view || view.room !== app.room) return;
  if (view.matchId === app.viewMatch && view.seq < app.viewSeq) return;
  const newMatch = view.matchId !== app.viewMatch;
  app.view = view;
  app.viewSeq = view.seq;
  if (newMatch) {
    app.viewMatch = view.matchId;
    app.overShown = false;
    app.lastFeedSig = '';
    app.lastLogId = 0;
    app.closedNotified = false;
    app.rematchRequested = false;
    app.sel = null;
    app.surrenderArm = 0;
    ui.result.classList.add('hidden');
    ui.resultNote.classList.add('hidden');
    ui.resultTitle.textContent = 'DUEL';
    closeLobby();
    if (view.phase === 'duel' && !opts.noSplash) showSplash();
  }
  if (view.phase === 'duel' || view.phase === 'over') closeLobby();
  if (app.sel && app.sel.kind === 'hand' && !(view.me.hand || []).some((c) => c.uid === app.sel.uid)) app.sel = null;
  if (app.sel && app.sel.kind === 'zone' && (!view.me.zones[app.sel.i] || view.me.zones[app.sel.i].hidden)) app.sel = null;
  renderAll();
  if (view.fx) {
    if (view.fx.id !== app.lastFxId) {
      app.lastFxId = view.fx.id;
      playFx(view.fx);
    }
  }
  if (view.phase === 'over' && !app.overShown) {
    app.overShown = true;
    const match = view.matchId;
    setTimeout(() => { if (app.view?.phase === 'over' && app.view.matchId === match) showResult(); }, 950);
  }
  updateOfflineBar();
}

/* ================================ actions / interaction ================================ */
function act(action) {
  if (!app.view) return;
  if (action.type !== 'surrender' && !canAct()) {
    toast(app.view.phase !== 'duel' ? '対戦中ではありません' : app.view.turn !== 'me' ? '相手のターンです' : '接続を待っています');
    return;
  }
  if (app.role === 'host') {
    const r = applyAction(app.state, 'host', action);
    if (!r.ok) { toast(r.reason); sfx('deny'); return; }
    if (action.type !== 'switch') app.sel = null;
    app.surrenderArm = 0;
    afterHostMutation();
  } else {
    if (!app.connected) { toast('サーバーに接続していません'); return; }
    app.actionN += 1;
    publish(app.topics?.bus, { t: 'action', room: app.room, from: tabId, n: app.actionN, action, ts: now() });
    app.pending = true;
    if (action.type !== 'switch') app.sel = null;
    app.surrenderArm = 0;
    renderAll();
    setTimeout(() => { if (app.pending) { app.pending = false; renderAll(); } }, 4000);
  }
}
function onZoneClick(side, i) {
  const v = app.view;
  if (!v || v.phase !== 'duel') return;
  if (side === 'me') {
    const z = v.me.zones[i];
    const hc = handSelectedCard();
    if (hc) {
      if (!canAct()) { toast('相手のターンです'); return; }
      if (v.summonUsed) { toast('召喚は1ターンに1回まで'); return; }
      if (z) { toast('そのゾーンは使用中です'); return; }
      act({ type: 'summon', uid: hc.uid, zone: i, mode: app.summonMode });
      return;
    }
    if (z) {
      app.sel = { kind: 'zone', i };
      sfx('select');
      renderAll();
    } else {
      app.sel = null;
      toast('手札からカードを選択してください');
      renderAll();
    }
    return;
  }
  const attacker = selectedAttacker();
  if (!attacker) { toast('自分の攻撃モンスターを選択してください'); return; }
  if (!canAct()) { toast('相手のターンです'); return; }
  if (v.firstTurn) { toast('先攻1ターン目は攻撃できません'); return; }
  const oppHas = v.opp.zones.some(Boolean);
  if (oppHas && !v.opp.zones[i]) { toast('モンスターがいるゾーンを対象にしてください'); return; }
  if (!oppHas && v.opp.zones[i]) return;
  act({ type: 'attack', from: app.sel.i, target: oppHas ? i : null });
}
function currentSelectableHand(uid) {
  return (app.view?.me.hand || []).find((c) => c.uid === uid) || null;
}
function onHandClick(uid) {
  const v = app.view;
  if (!v || v.phase !== 'duel') return;
  const card = currentSelectableHand(uid);
  if (!card) return;
  if (app.sel?.kind === 'hand' && app.sel.uid === uid) app.sel = null;
  else app.sel = { kind: 'hand', uid };
  sfx('select');
  renderAll();
}
function onPositionClick() {
  const zc = selectedOwnCard();
  if (!zc || zc.hidden) { toast('表示形式を変更するモンスターを選択してください'); return; }
  if (!canAct()) { toast('相手のターンです'); return; }
  if (zc.changed) { toast('このターンは変更済みです'); return; }
  if (zc.attacked) { toast('攻撃したモンスターは変更できません'); return; }
  act({ type: 'switch', zone: app.sel.i });
}
function onEndClick() {
  if (!canAct()) { toast('相手のターンです'); return; }
  act({ type: 'end' });
}
function onSurrenderClick() {
  const v = app.view;
  if (!v || v.phase !== 'duel') return;
  if (app.surrenderArm && now() - app.surrenderArm < 3000) {
    app.surrenderArm = 0;
    act({ type: 'surrender' });
    return;
  }
  app.surrenderArm = now();
  toast('もう一度タップすると降参します');
  renderAll();
  setTimeout(() => { if (app.surrenderArm) { app.surrenderArm = 0; renderAll(); } }, 3100);
}

/* ================================ lobby / rooms ================================ */
function roomLink() {
  return `${location.origin}${location.pathname}?room=${encodeURIComponent(app.room || ownRoom)}`;
}
function normalizeRoom(v) {
  return String(v || '').toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 8);
}
async function copyRoom() {
  const link = roomLink();
  let ok = false;
  try { await navigator.clipboard.writeText(link); ok = true; }
  catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = link; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); ok = true;
    } catch { ok = false; }
  }
  toast(ok ? '招待リンクをコピーしました' : `リンク: ${link}`, 2600);
}
function setLobbyStatus(text, cls) {
  ui.lobbyStatus.className = 'lobby-status' + (cls ? ' ' + cls : '');
  ui.lobbyStatus.innerHTML = '<span class="wait-pulse"></span>' + esc(text);
}
function showLobbyHost() {
  app.lobbyState = 'host';
  ui.lobby.classList.remove('hidden');
  ui.result.classList.add('hidden');
  ui.lobbyEyebrow.textContent = 'ONLINE TABLE / 2 PLAYERS';
  ui.lobbyTitle.textContent = 'ARCTIC DUEL';
  ui.lobbySub.textContent = '北極の攻守表で、いま決闘を。';
  ui.lobbyCodeWrap.classList.remove('hidden');
  ui.lobbyCode.textContent = app.room;
  ui.btnCopy.classList.remove('hidden');
  ui.btnCopy.textContent = '招待リンクをコピー';
  ui.joinBox.classList.remove('hidden');
  ui.btnRetry.classList.add('hidden');
  ui.btnOwnRoom.classList.add('hidden');
  setLobbyStatus('対戦相手を待っています');
  ui.lobbyNet.textContent = app.connected ? 'ONLINE / 通信専用' : 'CONNECTING';
  updateNet();
}
function showLobbyGuest() {
  ui.lobby.classList.remove('hidden');
  ui.result.classList.add('hidden');
  ui.lobbyEyebrow.textContent = 'CHALLENGER / JOINING TABLE';
  ui.lobbyTitle.textContent = 'CONNECTING';
  ui.lobbySub.textContent = 'ルームコードで接続しています。';
  ui.lobbyCodeWrap.classList.remove('hidden');
  ui.lobbyCode.textContent = app.room;
  ui.btnCopy.classList.add('hidden');
  ui.joinBox.classList.add('hidden');
  ui.btnRetry.classList.add('hidden');
  ui.btnOwnRoom.classList.add('hidden');
  setLobbyStatus('ホストを探しています');
  updateNet();
}
function showLobbyError(text) {
  app.lobbyState = 'error';
  showLobbyGuest();
  ui.lobbyTitle.textContent = 'NOT FOUND';
  ui.lobbySub.textContent = 'ホストが見つかりません。コードを確認してください。';
  setLobbyStatus(text || 'ホストが見つかりません', 'error');
  ui.btnRetry.classList.remove('hidden');
  ui.btnOwnRoom.classList.remove('hidden');
}
function closeLobby() { ui.lobby.classList.add('hidden'); }
function scheduleGuestFindError() {
  clearTimeout(app.lobbyErrorTimer);
  app.lobbyErrorTimer = setTimeout(() => {
    if (app.role === 'guest' && !app.view && app.lobbyState !== 'error') {
      if (!app.connected) showLobbyError('サーバーに接続できません');
      else if (!app.hostOnline) showLobbyError('ホストが見つかりません');
    }
  }, 9000);
}
function retryGuest() {
  app.lobbyState = 'searching';
  showLobbyGuest();
  app.lastHostSeen = now();
  if (!app.connected) connectMqtt();
  else sendHello();
  scheduleGuestFindError();
}
function goGuest(room, force) {
  room = normalizeRoom(room);
  if (room.length < 4) { toast('ルームコードを入力してください'); return; }
  if (room === app.ownRoom && !force) { goOwnRoom(); return; }
  teardownClient(true);
  app.role = 'guest';
  app.room = room;
  app.state = null;
  app.view = null;
  app.viewSeq = -1;
  app.viewMatch = 0;
  app.lastFxId = 0;
  app.lastLogId = 0;
  app.lastHandSig = '';
  app.handUids = [];
  app.sel = null;
  app.guestId = null;
  app.guestOnline = false;
  app.hostOnline = false;
  app.hostName = null;
  app.lastHostSeen = 0;
  app.overShown = false;
  app.restored = false;
  app.lobbyState = 'searching';
  ui.hudRoom.textContent = room;
  document.title = `ARCTIC DUEL — ROOM ${room}`;
  history.replaceState(null, '', `${location.pathname}?room=${encodeURIComponent(room)}`);
  renderAll();
  showLobbyGuest();
  connectMqtt();
  scheduleGuestFindError();
}
function goOwnRoom() {
  if (app.role === 'guest' && app.connected) {
    publish(app.topics?.bus, { t: 'leave', room: app.room, id: tabId, ts: now() });
  }
  history.replaceState(null, '', location.pathname);
  initHost();
}
function initHost() {
  teardownClient(true);
  clearTimeout(app.lobbyErrorTimer);
  app.role = 'host';
  app.room = ownRoom;
  app.state = null;
  app.view = null;
  app.viewSeq = -1;
  app.viewMatch = 0;
  app.lastFxId = 0;
  app.lastLogId = 0;
  app.lastHandSig = '';
  app.handUids = [];
  app.sel = null;
  app.guestId = null;
  app.guestName = null;
  app.guestOnline = false;
  app.lastGuestSeen = 0;
  app.lastGuestN = 0;
  app.hostOnline = true;
  app.lastHostSeen = now();
  app.hostName = null;
  app.overShown = false;
  app.rematchRequested = false;
  app.restored = false;
  app.surrenderArm = 0;
  app.closedNotified = false;
  ui.hudRoom.textContent = app.room;
  document.title = `ARCTIC DUEL — ROOM ${app.room}`;
  renderAll();
  showLobbyHost();
  const restored = restoreTable(app.room);
  if (restored) {
    closeLobby();
    ui.result.classList.add('hidden');
    toast('前回のテーブルを復元しました。相手の再接続を待っています', 3200);
  }
  connectMqtt();
}
function hostCloseTable() {
  if (app.guestId) sendToGuest({ t: 'closed', to: app.guestId });
  clearTable(app.room);
  app.state = null;
  app.view = null;
  app.viewSeq = -1;
  app.viewMatch = 0;
  app.guestId = null;
  app.guestName = null;
  app.guestOnline = false;
  app.lastGuestN = 0;
  app.lastFxId = 0;
  app.lastLogId = 0;
  app.lastHandSig = '';
  app.handUids = [];
  app.sel = null;
  app.overShown = false;
  app.rematchRequested = false;
  app.restored = false;
  ui.result.classList.add('hidden');
  ui.resultNote.classList.add('hidden');
  ui.offline.classList.add('hidden');
  renderAll();
  showLobbyHost();
  publishLobby();
}
function startRematch() {
  if (!app.state || !app.guestId) return;
  if (!app.guestOnline) { toast('相手の再接続を待っています'); return; }
  const first = app.state.firstSide === 'host' ? 'guest' : 'host';
  app.state = createDuel(first);
  app.state.online.guest = true;
  app.guestOnline = true;
  app.rematchRequested = false;
  app.lastGuestN = 0;
  app.lastFxId = 0;
  app.overShown = false;
  ui.result.classList.add('hidden');
  ui.resultNote.classList.add('hidden');
  afterHostMutation();
}
function requestRematch() {
  if (app.role === 'host') { startRematch(); return; }
  if (!app.connected) { toast('接続を待っています'); return; }
  publish(app.topics?.bus, { t: 'rematch', room: app.room, from: tabId, ts: now() });
  ui.btnRematch.disabled = true;
  ui.btnRematch.textContent = '申し込み済み';
  ui.resultNote.textContent = 'ホストの応答を待っています';
  ui.resultNote.classList.remove('hidden');
}
function showResult() {
  const v = app.view;
  if (!v || v.phase !== 'over') return;
  const win = v.winner === 'me';
  const slab = ui.result.querySelector('.slab');
  slab.classList.toggle('win', win);
  slab.classList.toggle('lose', !win);
  ui.resultEyebrow.textContent = win ? 'DUEL COMPLETE / WINNER' : 'DUEL COMPLETE / DEFEATED';
  ui.resultTitle.textContent = win ? 'VICTORY' : 'DEFEAT';
  ui.resultSub.textContent = win ? '勝利 — 北極の頂点に立った' : '敗北 — もう一度挑め';
  ui.resultTurns.textContent = v.turnCount;
  ui.resultLp.textContent = v.me.lp;
  ui.resultNote.classList.toggle('hidden', !app.rematchRequested);
  if (app.rematchRequested) ui.resultNote.textContent = '相手が再戦を希望しています';
  const host = app.role === 'host';
  ui.btnRematch.classList.remove('hidden');
  ui.btnRematch.disabled = false;
  ui.btnRematch.textContent = host ? '再戦' : '再戦を申し込む';
  ui.btnClose.classList.toggle('hidden', !host);
  ui.btnHome.classList.toggle('hidden', host);
  ui.result.classList.remove('hidden');
}
function showSplash() {
  ui.splash.classList.remove('show');
  void ui.splash.offsetWidth;
  ui.splash.classList.add('show');
  sfx('start');
  setTimeout(() => ui.splash.classList.remove('show'), 1750);
}
function showBanner(text) {
  ui.banner.textContent = text;
  ui.banner.classList.remove('show');
  void ui.banner.offsetWidth;
  ui.banner.classList.add('show');
}
let toastTimer = null;
function toast(text, ms = 1900) {
  ui.toast.textContent = text;
  ui.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('show'), ms);
}

/* ================================ effects ================================ */
const sideRel = (raw) => raw === app.view?.you ? 'me' : 'opp';
function zoneRect(rel, i) {
  const el = zoneEls[rel]?.[i];
  return el ? el.getBoundingClientRect() : null;
}
function makeGhost(card, rect) {
  const g = document.createElement('div');
  g.className = 'ghost-card';
  g.style.left = `${rect.left}px`;
  g.style.top = `${rect.top}px`;
  g.style.width = `${rect.width}px`;
  g.style.height = `${rect.height}px`;
  g.innerHTML = cardHTML({ name: card.name, atk: card.atk, def: card.def, el: card.el, lv: card.lv, pos: 'atk' }, false);
  document.body.appendChild(g);
  return g;
}
function ringAt(el, color) {
  if (!el) return;
  const r = document.createElement('span');
  r.className = 'fx-ring';
  if (color) r.style.borderColor = color;
  el.appendChild(r);
  setTimeout(() => r.remove(), 900);
}
function shatterAt(el, count = 10) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.className = 'shard-fx';
    s.style.left = `${r.left + Math.random() * r.width}px`;
    s.style.top = `${r.top + Math.random() * r.height}px`;
    s.style.setProperty('--dx', `${(Math.random() - 0.5) * 150}px`);
    s.style.setProperty('--dy', `${(Math.random() - 0.65) * 130}px`);
    s.style.setProperty('--rot', `${(Math.random() - 0.5) * 540}deg`);
    s.style.animationDelay = `${Math.random() * 80}ms`;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1000);
  }
}
function floatAt(text, x, y, good) {
  const f = document.createElement('div');
  f.className = 'float-dmg' + (good ? ' heal' : '');
  f.textContent = text;
  f.style.left = `${x}px`;
  f.style.top = `${y}px`;
  f.style.transform = 'translate(-50%,-50%)';
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 1100);
}
function shakeScreen() {
  document.body.classList.remove('shake');
  void document.body.offsetWidth;
  document.body.classList.add('shake');
  setTimeout(() => document.body.classList.remove('shake'), 380);
}
function playFx(fx) {
  if (!fx) return;
  const rel = sideRel(fx.side);
  if (fx.kind === 'summon') {
    const z = zoneEls[rel][fx.zone];
    if (z) {
      z.classList.remove('fx-summon');
      void z.offsetWidth;
      z.classList.add('fx-summon');
      ringAt(z, fx.mode === 'def' ? 'rgba(179,157,255,.85)' : 'rgba(87,245,200,.9)');
      setTimeout(() => z.classList.remove('fx-summon'), 800);
    }
    sfx('summon');
    return;
  }
  if (fx.kind === 'position') {
    const z = zoneEls[rel][fx.zone];
    if (z) {
      z.classList.remove('fx-summon');
      void z.offsetWidth;
      z.classList.add('fx-summon');
      setTimeout(() => z.classList.remove('fx-summon'), 600);
    }
    sfx('position');
    return;
  }
  if (fx.kind === 'turn') {
    showBanner(fx.side === app.view.you ? 'YOUR TURN' : 'OPPONENT TURN');
    sfx('turn');
    return;
  }
  if (fx.kind === 'win') {
    showBanner(fx.winner === app.view.you ? 'YOU WIN' : 'YOU LOSE');
    sfx(fx.winner === app.view.you ? 'win' : 'lose');
    return;
  }
  if (fx.kind !== 'attack') return;

  const actorZone = zoneEls[rel][fx.from];
  const foeRel = rel === 'me' ? 'opp' : 'me';
  const targetZone = fx.target !== null && fx.target !== undefined ? zoneEls[foeRel][fx.target] : null;
  const panel = (foeRel === 'opp' ? ui.oppLpFill : ui.meLpFill).closest('.duelist');
  const targetRect = targetZone ? targetZone.getBoundingClientRect() : panel.getBoundingClientRect();
  const startRect = actorZone ? actorZone.getBoundingClientRect() : targetRect;
  const g = makeGhost(fx.attacker, startRect);
  sfx('attack');
  if (actorZone) {
    actorZone.style.zIndex = '6';
    actorZone.classList.add('selected');
  }
  requestAnimationFrame(() => {
    g.style.left = `${targetRect.left + targetRect.width / 2 - startRect.width / 2}px`;
    g.style.top = `${targetRect.top + targetRect.height / 2 - startRect.height / 2}px`;
    g.style.transform = 'rotate(10deg) scale(.92)';
  });
  setTimeout(() => {
    if (targetZone) {
      targetZone.classList.remove('fx-hit');
      void targetZone.offsetWidth;
      targetZone.classList.add('fx-hit');
      setTimeout(() => targetZone.classList.remove('fx-hit'), 480);
    }
    const cx = targetRect.left + targetRect.width / 2;
    const cy = targetRect.top + targetRect.height / 2;
    if (fx.damage > 0) {
      floatAt(`-${fx.damage}`, cx, cy - 6, false);
      shakeScreen();
      const lpEl = foeRel === 'opp' ? ui.oppLpFill : ui.meLpFill;
      lpEl.classList.remove('lp-hit'); void lpEl.offsetWidth; lpEl.classList.add('lp-hit');
      setTimeout(() => lpEl.classList.remove('lp-hit'), 520);
      sfx('damage');
    }
    if (fx.destroyed && fx.destroyed.length) {
      for (const d of fx.destroyed) shatterAt(zoneEls[sideRel(d.side)]?.[d.zone], 12);
      sfx('destroy');
    }
    const ring = document.createElement('span');
    ring.className = 'flash-ring';
    ring.style.left = `${cx - 26}px`;
    ring.style.top = `${cy - 26}px`;
    ring.style.width = '52px';
    ring.style.height = '52px';
    ring.style.borderColor = fx.damage > 0 ? 'rgba(255,127,159,.9)' : 'rgba(99,230,255,.9)';
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 750);
  }, 290);
  setTimeout(() => {
    g.style.opacity = '0';
    g.style.transform += ' scale(.55)';
    setTimeout(() => g.remove(), 240);
  }, 470);
  setTimeout(() => {
    if (actorZone) { actorZone.style.zIndex = ''; actorZone.classList.remove('selected'); }
  }, 900);
}

/* ================================ audio ================================ */
let audioCtx = null;
let audioUnlocked = false;
function ensureAudio() {
  if (audioCtx) { if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {}); return; }
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return;
  try { audioCtx = new C(); } catch { audioCtx = null; }
}
function tone(freq, dur, type = 'sine', vol = 0.03, slideTo = null, delay = 0) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime + delay;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(t); o.stop(t + dur + 0.03);
}
function noise(dur = 0.18, vol = 0.035) {
  if (!audioCtx) return;
  const len = Math.floor(audioCtx.sampleRate * dur);
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = audioCtx.createBufferSource();
  const f = audioCtx.createBiquadFilter();
  const g = audioCtx.createGain();
  f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 0.8;
  g.gain.value = vol;
  src.buffer = buf; src.connect(f); f.connect(g); g.connect(audioCtx.destination);
  src.start();
}
function sfx(kind) {
  if (!app.sound || !audioUnlocked) return;
  ensureAudio();
  if (!audioCtx) return;
  switch (kind) {
    case 'select': tone(760, 0.045, 'sine', 0.018); break;
    case 'deny': tone(150, 0.12, 'square', 0.018, 110); break;
    case 'summon':
      tone(190, 0.28, 'triangle', 0.035, 520);
      tone(520, 0.2, 'sine', 0.02, 780, 0.1);
      break;
    case 'position': tone(430, 0.12, 'triangle', 0.022, 300); break;
    case 'attack':
      noise(0.1, 0.03);
      tone(240, 0.22, 'sawtooth', 0.03, 80);
      break;
    case 'damage':
      tone(90, 0.3, 'sine', 0.06, 48);
      noise(0.16, 0.045);
      break;
    case 'destroy': noise(0.28, 0.05); tone(130, 0.24, 'square', 0.025, 60); break;
    case 'turn': tone(640, 0.1, 'sine', 0.022); tone(880, 0.16, 'sine', 0.02, 940, 0.09); break;
    case 'start':
      tone(330, 0.18, 'triangle', 0.03, 660);
      tone(660, 0.3, 'sine', 0.028, 990, 0.12);
      noise(0.3, 0.02);
      break;
    case 'win':
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.03, null, i * 0.11));
      break;
    case 'lose':
      [440, 349, 293, 220].forEach((f, i) => tone(f, 0.36, 'sine', 0.028, null, i * 0.12));
      break;
  }
}

/* ================================ background canvas ================================ */
const parallax = { x: 0, y: 0 };
function initBackground() {
  const canvas = ui.sky;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1;
  let stars = [], snow = [];
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = clamp(Math.floor(w / 24), 26, 60);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h * 0.72,
      r: Math.random() * 1.2 + 0.25, p: Math.random() * Math.PI * 2,
      s: 0.4 + Math.random() * 1.6
    }));
    const flakes = clamp(Math.floor(w / 20), 32, 72);
    snow = Array.from({ length: flakes }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 1.9 + 0.5, vy: 6 + Math.random() * 24,
      vx: -4 + Math.random() * 8, p: Math.random() * Math.PI * 2,
      a: 0.16 + Math.random() * 0.55
    }));
  }
  let last = performance.now(), t = 0, lastDraw = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    if (document.hidden || ts - lastDraw < 32) return;
    lastDraw = ts;
    const dt = Math.min(0.06, (ts - last) / 1000); last = ts; t += dt;
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      const a = 0.2 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.s + s.p));
      const ox = parallax.x * 7, oy = parallax.y * 4;
      ctx.beginPath();
      ctx.fillStyle = `rgba(210,245,255,${a})`;
      ctx.arc(s.x + ox, s.y + oy, s.r, 0, Math.PI * 2);
      ctx.fill();
      if (s.r > 0.95) {
        ctx.fillStyle = `rgba(150,230,255,${a * 0.16})`;
        ctx.beginPath(); ctx.arc(s.x + ox, s.y + oy, s.r * 4, 0, Math.PI * 2); ctx.fill();
      }
    }
    for (const f of snow) {
      f.y += f.vy * dt;
      f.x += (f.vx + Math.sin(t * 0.7 + f.p) * 9) * dt;
      if (f.y > h + 8) { f.y = -8; f.x = Math.random() * w; }
      if (f.x < -8) f.x = w + 8; else if (f.x > w + 8) f.x = -8;
      ctx.beginPath();
      ctx.fillStyle = `rgba(225,250,255,${f.a})`;
      ctx.arc(f.x + parallax.x * 12, f.y + parallax.y * 6, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);
}

/* ================================ tilt ================================ */
function setParallax(x, y) {
  parallax.x = x; parallax.y = y;
  document.documentElement.style.setProperty('--px', x.toFixed(3));
  document.documentElement.style.setProperty('--py', y.toFixed(3));
}
function onOrient(e) {
  const g = clamp(e.gamma || 0, -42, 42) / 42;
  const b = clamp((e.beta || 0) - 42, -42, 42) / 42;
  setParallax(g * 0.9, b * 0.9);
}
async function toggleTilt() {
  if (app.tilt) {
    app.tilt = false;
    window.removeEventListener('deviceorientation', onOrient, true);
    setParallax(0, 0);
    toast('傾き連動をオフにしました');
    renderActions();
    return;
  }
  if (typeof window.DeviceOrientationEvent === 'undefined') {
    toast('この端末は傾きセンサーに対応していません');
    return;
  }
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const res = await DeviceOrientationEvent.requestPermission();
      if (res !== 'granted') { toast('傾きセンサーの許可が必要です'); return; }
    } catch { toast('傾きセンサーを利用できません'); return; }
  }
  app.tilt = true;
  window.addEventListener('deviceorientation', onOrient, true);
  toast('傾き連動 ON — 端末を傾けてください', 2400);
  renderActions();
}

/* ================================ events ================================ */
function bindEvents() {
  ui.hand.addEventListener('click', (e) => {
    const c = e.target.closest('.hand-card');
    if (c && c.dataset.uid) onHandClick(c.dataset.uid);
  });
  ui.modeAtk.addEventListener('click', () => { app.summonMode = 'atk'; sfx('select'); renderAll(); });
  ui.modeSet.addEventListener('click', () => { app.summonMode = 'set'; sfx('select'); renderAll(); });
  ui.btnEnd.addEventListener('click', onEndClick);
  ui.btnPosition.addEventListener('click', onPositionClick);
  ui.btnSurrender.addEventListener('click', onSurrenderClick);
  ui.btnTilt.addEventListener('click', toggleTilt);
  ui.btnSound.addEventListener('click', () => {
    app.sound = !app.sound;
    if (app.sound) { ensureAudio(); sfx('select'); }
    toast(app.sound ? 'サウンド ON' : 'サウンド OFF');
    renderActions();
  });
  ui.hudLink.addEventListener('click', copyRoom);
  ui.lobbyCode.addEventListener('click', copyRoom);
  ui.btnCopy.addEventListener('click', copyRoom);

  ui.joinInput.addEventListener('input', () => {
    ui.joinInput.value = normalizeRoom(ui.joinInput.value).slice(0, 6);
  });
  ui.joinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); ui.btnJoin.click(); }
  });
  ui.btnJoin.addEventListener('click', () => {
    const code = normalizeRoom(ui.joinInput.value);
    if (code.length < 4) { toast('ルームコードを入力してください'); ui.joinInput.focus(); return; }
    goGuest(code);
  });
  ui.btnRetry.addEventListener('click', retryGuest);
  ui.btnOwnRoom.addEventListener('click', goOwnRoom);

  ui.btnRematch.addEventListener('click', requestRematch);
  ui.btnClose.addEventListener('click', hostCloseTable);
  ui.btnHome.addEventListener('click', goOwnRoom);

  ui.btnOfflineAction.addEventListener('click', () => {
    if (app.offlineAction === 'close') hostCloseTable();
    else if (app.offlineAction === 'home') goOwnRoom();
  });

  window.addEventListener('pointerdown', () => { audioUnlocked = true; ensureAudio(); }, { once: true });
  window.addEventListener('pointermove', (e) => {
    if (app.tilt) return;
    setParallax((e.clientX / window.innerWidth - 0.5) * 0.5, (e.clientY / window.innerHeight - 0.5) * 0.5);
  }, { passive: true });
  window.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.card,.zone')) e.preventDefault();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && app.connected) {
      if (app.role === 'host') { publishLobby(); if (app.state && app.guestId) publishState(); }
      else { sendHello(); }
    }
  });
}

/* ================================ boot ================================ */
function boot() {
  buildZones();
  bindEvents();
  initBackground();
  updateNet();
  app.lastHostSeen = now();
  const params = new URLSearchParams(location.search);
  const urlRoom = normalizeRoom(params.get('room'));
  if (urlRoom) goGuest(urlRoom, true);
  else initHost();
  window.__arctic = {
    get role() { return app.role; },
    get room() { return app.room; },
    view: () => app.view,
    raw: () => app,
    act: (a) => act(a),
    join: (code) => goGuest(code),
    home: () => goOwnRoom(),
    copy: () => copyRoom(),
    version: '1.0.0'
  };
}
boot();

})();
