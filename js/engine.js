/* Duel engine — deterministic, host-authoritative, serialisable state. */

import { CARDS, DECK_LIST, tributeCost } from './data.js';

export const START_LP = 4000;
export const START_HAND = 4;
export const ZONES = 4;
export const MAX_HAND = 8;

const clone = value => (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

function shuffle(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function newPlayer() {
  return {
    lp: START_LP,
    deck: [],
    hand: [],
    field: [null, null, null, null],
    grave: [],
    hasSummoned: false,
    usedTactic: false,
    wall: false,
  };
}

function newState() {
  return {
    rev: 0,
    turn: 1,
    active: 0,
    phase: 'main',
    winner: null,
    winReason: '',
    uidSeq: 1,
    logSeq: 1,
    log: [],
    players: [newPlayer(), newPlayer()],
  };
}

function makeCard(state, id) {
  const def = CARDS[id];
  return {
    ...def,
    id,
    uid: `u${state.uidSeq++}`,
    mode: 'attack',
    faceDown: false,
    atkBoost: 0,
    hasAttacked: false,
    switched: false,
    justSet: false,
    frozen: false,
  };
}

function log(state, text, tone = '') {
  state.log.push({ id: state.logSeq++, text, tone });
  if (state.log.length > 40) state.log.shift();
}

export function effectiveAtk(card) {
  return Math.max(0, (card?.atk || 0) + (card?.atkBoost || 0));
}

export function cardSnapshot(card) {
  if (!card) return null;
  return {
    uid: card.uid,
    id: card.id,
    kind: card.kind,
    name: card.name,
    sub: card.sub,
    el: card.el,
    level: card.level || 0,
    atk: card.atk || 0,
    def: card.def || 0,
    mode: card.mode,
    faceDown: !!card.faceDown,
    atkBoost: card.atkBoost || 0,
    frozen: !!card.frozen,
    hasAttacked: !!card.hasAttacked,
    justSet: !!card.justSet,
    text: card.text || '',
  };
}

export function createDuel({ first = 0 } = {}) {
  const state = newState();
  state.active = first === 1 ? 1 : 0;
  for (const player of state.players) {
    player.deck = shuffle(DECK_LIST).map(id => makeCard(state, id));
    for (let i = 0; i < START_HAND; i += 1) player.hand.push(player.deck.pop());
  }
  log(state, '北極圏の氷上に、デュエルフィールドが展開された。', 'system');
  log(state, `先攻は ${state.active === 0 ? 'あなた' : '相手'}。`, 'system');
  const events = [{ t: 'start', first: state.active }];
  drawCards(state, state.active, 1, events);
  log(state, `TURN 1 — ${state.active === 0 ? 'あなた' : '相手'}のターン。`, 'turn');
  return { state, events };
}

function drawCards(state, player, count, events) {
  const p = state.players[player];
  for (let i = 0; i < count; i += 1) {
    if (!p.deck.length) {
      if (!state.winner) {
        state.winner = 1 - player;
        state.winReason = '山札切れ';
        events.push({ t: 'win', player: state.winner, reason: state.winReason });
        log(state, `${player === 0 ? 'あなた' : '相手'}の山札が尽きた。`, 'bad');
      }
      return;
    }
    const card = p.deck.pop();
    if (p.hand.length < MAX_HAND) p.hand.push(card);
    else p.grave.push({ id: card.id, name: card.name, kind: card.kind });
  }
  events.push({ t: 'draw', player, count });
  log(state, `${player === 0 ? 'あなた' : '相手'}はカードを${count}枚ドローした。`, 'draw');
}

function fail(message) {
  return { ok: false, error: message };
}

function snapshotEvent(state, type, data) {
  return { t: type, ...data };
}

function destroy(state, player, zone, events, cause = 'battle') {
  const card = state.players[player].field[zone];
  if (!card) return null;
  state.players[player].field[zone] = null;
  state.players[player].grave.push({ id: card.id, name: card.name, kind: card.kind });
  const snap = cardSnapshot(card);
  events.push(snapshotEvent(state, 'destroy', { player, zone, card: snap, cause }));
  log(state, `${card.name} が破壊された。`, 'bad');
  return snap;
}

function dealDamage(state, player, amount, events, source = 'battle') {
  const p = state.players[player];
  let dealt = Math.max(0, Math.floor(amount));
  let blocked = false;
  if (dealt > 0 && p.wall) {
    p.wall = false;
    dealt = 0;
    blocked = true;
    log(state, 'ブリザード・ウォールがダメージを遮断した。', 'good');
  }
  p.lp = Math.max(0, p.lp - dealt);
  events.push({ t: 'damage', player, amount: dealt, blocked, lp: p.lp, source });
  if (dealt > 0) log(state, `${player === 0 ? 'あなた' : '相手'}に ${dealt} ダメージ。`, 'bad');
  if (p.lp <= 0 && !state.winner) {
    state.winner = 1 - player;
    state.winReason = 'ライフポイント0';
    events.push({ t: 'win', player: state.winner, reason: state.winReason });
    log(state, `${player === 0 ? 'あなた' : '相手'}のライフが尽きた。`, 'bad');
  }
}

function heal(state, player, amount, events) {
  const p = state.players[player];
  const before = p.lp;
  p.lp = Math.min(START_LP, p.lp + amount);
  const gained = p.lp - before;
  events.push({ t: 'heal', player, amount: gained, lp: p.lp });
  log(state, `${player === 0 ? 'あなた' : '相手'}は ${gained} LP回復した。`, 'good');
}

function pickTributes(state, player, count) {
  const field = state.players[player].field;
  return field
    .map((card, zone) => ({ card, zone }))
    .filter(entry => entry.card)
    .sort((a, b) => (a.card.mode === 'defense' ? a.card.def : effectiveAtk(a.card)) - (b.card.mode === 'defense' ? b.card.def : effectiveAtk(b.card)))
    .slice(0, count)
    .map(entry => entry.zone);
}

function summon(state, action, events) {
  const p = state.players[action.player];
  if (action.player !== state.active) return fail('自分のターンではありません');
  if (state.phase !== 'main') return fail('メインフェイズではありません');
  if (p.hasSummoned) return fail('このターンはもう召喚・セットしています');
  const index = p.hand.findIndex(card => card.uid === action.uid);
  if (index < 0) return fail('そのカードは手札にありません');
  const card = p.hand[index];
  if (card.kind !== 'monster') return fail('モンスターカードではありません');
  const zone = Number(action.zone);
  if (!Number.isInteger(zone) || zone < 0 || zone >= ZONES) return fail('召喚先が不正です');
  if (p.field[zone]) return fail('そのゾーンは埋まっています');
  const cost = tributeCost(card);
  const occupied = p.field.filter(Boolean).length;
  if (occupied < cost) return fail(`生贄が足りません（${cost}体必要）`);
  if (cost > 0) {
    let tributes = Array.isArray(action.tributes) ? action.tributes.filter(z => p.field[z]) : [];
    if (tributes.length < cost) tributes = pickTributes(state, action.player, cost);
    tributes = [...new Set(tributes)].slice(0, cost);
    if (tributes.length < cost) return fail('生贄を選んでください');
    for (const z of tributes) {
      const sacrificial = p.field[z];
      destroy(state, action.player, z, events, 'tribute');
      if (sacrificial) log(state, `${sacrificial.name} を生贄に捧げた。`, 'tribute');
    }
    events.push({ t: 'tribute', player: action.player, zones: tributes });
  }
  p.hand.splice(index, 1);
  const mode = action.mode === 'defense' ? 'defense' : 'attack';
  card.mode = mode;
  card.faceDown = mode === 'defense';
  card.justSet = mode === 'defense';
  card.hasAttacked = false;
  card.switched = false;
  card.frozen = false;
  p.field[zone] = card;
  p.hasSummoned = true;
  events.push({ t: 'summon', player: action.player, zone, card: cardSnapshot(card), mode, faceDown: card.faceDown });
  log(state, mode === 'defense'
    ? `${card.name} を守備表示でセットした。`
    : `${card.name} を攻撃表示で召喚した。`, 'summon');
  return { ok: true };
}

function activate(state, action, events) {
  const p = state.players[action.player];
  if (action.player !== state.active) return fail('自分のターンではありません');
  if (state.phase !== 'main') return fail('メインフェイズではありません');
  if (p.usedTactic) return fail('このターンはもう作戦カードを使っています');
  const index = p.hand.findIndex(card => card.uid === action.uid);
  if (index < 0) return fail('そのカードは手札にありません');
  const card = p.hand[index];
  if (card.kind !== 'tactic') return fail('作戦カードではありません');
  const foe = 1 - action.player;
  const enemyField = state.players[foe].field;
  const ownField = p.field;
  let target = null;
  if (card.target === 'ownMonster') {
    const zone = Number(action.targetZone);
    if (!Number.isInteger(zone) || !ownField[zone]) return fail('対象のモンスターを選んでください');
    target = { player: action.player, zone };
  } else if (card.target === 'enemyMonster') {
    const zone = Number(action.targetZone);
    if (!Number.isInteger(zone) || !enemyField[zone]) return fail('対象のモンスターを選んでください');
    target = { player: foe, zone };
  }

  p.hand.splice(index, 1);
  p.grave.push({ id: card.id, name: card.name, kind: card.kind });
  p.usedTactic = true;
  events.push({ t: 'tactic', player: action.player, card: cardSnapshot(card), effect: card.effect, target });
  log(state, `作戦カード「${card.name}」を発動した。`, 'tactic');

  switch (card.effect) {
    case 'boost': {
      const monster = state.players[target.player].field[target.zone];
      monster.atkBoost = (monster.atkBoost || 0) + 1000;
      events.push({ t: 'buff', player: target.player, zone: target.zone, amount: 1000, card: cardSnapshot(monster) });
      log(state, `${monster.name} の攻撃力が1000上がった。`, 'good');
      break;
    }
    case 'heal':
      heal(state, action.player, 1200, events);
      break;
    case 'judgment': {
      let best = null;
      enemyField.forEach((monster, zone) => {
        if (!monster) return;
        if (!best || effectiveAtk(monster) > effectiveAtk(best.card)) best = { card: monster, zone };
      });
      if (!best) return fail('破壊できる相手モンスターがいません');
      destroy(state, foe, best.zone, events, 'tactic');
      break;
    }
    case 'freeze': {
      const monster = enemyField[target.zone];
      monster.mode = 'defense';
      monster.faceDown = false;
      monster.frozen = true;
      monster.switched = true;
      events.push({ t: 'freeze', player: foe, zone: target.zone, card: cardSnapshot(monster) });
      log(state, `${monster.name} は氷結した。`, 'good');
      break;
    }
    case 'meteor':
      dealDamage(state, foe, 800, events, 'tactic');
      break;
    case 'draw2':
      drawCards(state, action.player, 2, events);
      break;
    case 'wall':
      p.wall = true;
      log(state, 'ブリザード・ウォールが展開された。', 'good');
      break;
    case 'spike':
      dealDamage(state, foe, 500, events, 'tactic');
      drawCards(state, action.player, 1, events);
      break;
    default:
      break;
  }
  events.push({ t: 'tactic-done', player: action.player, effect: card.effect, target });
  return { ok: true };
}

function switchPosition(state, action, events) {
  const p = state.players[action.player];
  if (action.player !== state.active) return fail('自分のターンではありません');
  if (state.phase !== 'main') return fail('表示形式の変更はメインフェイズのみです');
  const zone = Number(action.zone);
  const card = p.field[zone];
  if (!card) return fail('モンスターがいません');
  if (card.switched) return fail('このカードはこのターン表示形式を変更しています');
  if (card.justSet) return fail('セットしたターンは表示形式を変更できません');
  if (card.frozen) return fail('このカードは凍結しています');
  const from = card.faceDown ? 'set' : card.mode;
  if (card.faceDown) {
    card.faceDown = false;
    card.mode = 'attack';
    card.justSet = false;
    card.switched = true;
    events.push({ t: 'flip', player: action.player, zone, card: cardSnapshot(card), to: 'attack' });
    log(state, `${card.name} を反転召喚した。`, 'summon');
  } else {
    card.mode = card.mode === 'attack' ? 'defense' : 'attack';
    card.switched = true;
    events.push({ t: 'position', player: action.player, zone, card: cardSnapshot(card), mode: card.mode });
    log(state, `${card.name} を${card.mode === 'attack' ? '攻撃' : '守備'}表示に変更した。`, 'position');
  }
  return { ok: true, from };
}

function attack(state, action, events) {
  const p = state.players[action.player];
  const foe = 1 - action.player;
  if (action.player !== state.active) return fail('自分のターンではありません');
  if (state.phase !== 'battle') return fail('バトルフェイズではありません');
  if (state.turn === 1) return fail('先攻1ターン目は攻撃できません');
  const zone = Number(action.zone);
  const attacker = p.field[zone];
  if (!attacker) return fail('攻撃するモンスターがいません');
  if (attacker.mode !== 'attack' || attacker.faceDown) return fail('攻撃表示のモンスターしか攻撃できません');
  if (attacker.hasAttacked) return fail('このモンスターはもう攻撃しています');
  if (attacker.frozen) return fail('このモンスターは凍結しています');
  const enemyField = state.players[foe].field;
  const anyEnemy = enemyField.some(Boolean);
  let targetZone = action.targetZone === null || action.targetZone === undefined ? null : Number(action.targetZone);
  if (!anyEnemy) targetZone = null;
  if (targetZone === null && anyEnemy) return fail('攻撃対象を選んでください');
  if (targetZone !== null) {
    if (!Number.isInteger(targetZone) || !enemyField[targetZone]) return fail('攻撃対象がいません');
  }

  attacker.hasAttacked = true;
  const atk = effectiveAtk(attacker);
  const targetCard = targetZone === null ? null : enemyField[targetZone];
  const targetStats = targetCard ? (targetCard.faceDown || targetCard.mode === 'defense' ? targetCard.def : effectiveAtk(targetCard)) : 0;
  const targetMode = targetCard ? (targetCard.faceDown || targetCard.mode === 'defense' ? 'defense' : 'attack') : null;

  const event = {
    t: 'attack',
    player: action.player,
    zone,
    target: targetZone === null ? null : { player: foe, zone: targetZone },
    direct: targetZone === null,
    atk,
    def: targetStats,
    targetMode,
    attacker: cardSnapshot(attacker),
    targetCard: targetCard ? cardSnapshot(targetCard) : null,
    attackerDestroyed: false,
    targetDestroyed: false,
    damage: 0,
    damageTo: null,
  };

  events.push(event);
  if (targetZone === null) {
    event.damage = atk;
    event.damageTo = foe;
    log(state, `${attacker.name} のダイレクトアタック！`, 'attack');
    dealDamage(state, foe, atk, events, 'direct');
  } else if (targetMode === 'attack') {
    if (atk > targetStats) {
      event.targetDestroyed = true;
      event.damage = atk - targetStats;
      event.damageTo = foe;
      log(state, `${attacker.name} が ${targetCard.name} を打ち破った！`, 'attack');
      destroy(state, foe, targetZone, events, 'battle');
      dealDamage(state, foe, atk - targetStats, events, 'battle');
    } else if (atk < targetStats) {
      event.attackerDestroyed = true;
      event.damage = targetStats - atk;
      event.damageTo = action.player;
      log(state, `${attacker.name} は ${targetCard.name} に敗れた。`, 'bad');
      destroy(state, action.player, zone, events, 'battle');
      dealDamage(state, action.player, targetStats - atk, events, 'battle');
    } else {
      event.attackerDestroyed = true;
      event.targetDestroyed = true;
      log(state, `${attacker.name} と ${targetCard.name} は相打ちになった。`, 'attack');
      destroy(state, foe, targetZone, events, 'battle');
      destroy(state, action.player, zone, events, 'battle');
    }
  } else {
    if (atk > targetStats) {
      event.targetDestroyed = true;
      log(state, `${attacker.name} が守備モンスター ${targetCard.name} を砕いた。`, 'attack');
      destroy(state, foe, targetZone, events, 'battle');
    } else if (atk < targetStats) {
      event.damage = targetStats - atk;
      event.damageTo = action.player;
      log(state, `${attacker.name} は ${targetCard.name} の守りに弾かれた。`, 'bad');
      dealDamage(state, action.player, targetStats - atk, events, 'battle');
    } else {
      log(state, `${attacker.name} と ${targetCard.name} は拮抗した。`, 'position');
    }
  }

  if (state.winner !== null) {
    state.phase = 'end';
    events.push({ t: 'phase', phase: 'end' });
  }
  return { ok: true };
}

function beginBattle(state, action, events) {
  if (action.player !== state.active) return fail('自分のターンではありません');
  if (state.phase !== 'main') return fail('メインフェイズではありません');
  state.phase = 'battle';
  events.push({ t: 'phase', phase: 'battle' });
  log(state, 'バトルフェイズに移行した。', 'phase');
  return { ok: true };
}

function endTurn(state, action, events) {
  if (action.player !== state.active) return fail('自分のターンではありません');
  if (state.winner !== null) return fail('デュエルは終了しています');
  const p = state.players[action.player];
  for (const card of p.field) {
    if (!card) continue;
    card.atkBoost = 0;
    card.hasAttacked = false;
    card.switched = false;
    card.justSet = false;
    card.frozen = false;
  }
  state.active = 1 - state.active;
  state.turn += 1;
  state.phase = 'main';
  const next = state.players[state.active];
  next.hasSummoned = false;
  next.usedTactic = false;
  events.push({ t: 'turn', player: state.active, turn: state.turn });
  log(state, `TURN ${state.turn} — ${state.active === 0 ? 'あなた' : '相手'}のターン。`, 'turn');
  drawCards(state, state.active, 1, events);
  if (state.winner === null) events.push({ t: 'phase', phase: 'main' });
  return { ok: true };
}

export function applyAction(previous, action) {
  const state = clone(previous);
  const events = [];
  const player = Number(action.player);
  if (![0, 1].includes(player)) return { ok: false, error: 'プレイヤーが不正です', state: previous, events };
  if (state.winner !== null) return { ok: false, error: 'デュエルは終了しています', state: previous, events };
  if (player !== state.active) return { ok: false, error: '自分のターンではありません', state: previous, events };
  let result;
  switch (action.type) {
    case 'summon': result = summon(state, { ...action, player }, events); break;
    case 'activate': result = activate(state, { ...action, player }, events); break;
    case 'switch': result = switchPosition(state, { ...action, player }, events); break;
    case 'attack': result = attack(state, { ...action, player }, events); break;
    case 'battle': result = beginBattle(state, { ...action, player }, events); break;
    case 'end': result = endTurn(state, { ...action, player }, events); break;
    default: result = fail('不明なアクションです');
  }
  if (!result.ok) return { ok: false, error: result.error, state: previous, events: [] };
  state.rev += 1;
  return { ok: true, state, events, error: '' };
}

export function sanitizeState(state, viewer) {
  const view = clone(state);
  const foe = 1 - viewer;
  view.viewer = viewer;
  view.handCounts = [state.players[0].hand.length, state.players[1].hand.length];
  view.opponentHand = state.players[foe].hand.map(() => ({ hidden: true }));
  view.players[foe].hand = state.players[foe].hand.map(() => ({ hidden: true }));
  view.players[foe].deck = state.players[foe].deck.map(() => null);
  view.players[viewer].deck = state.players[viewer].deck.map(() => null);
  view.players[foe].field = state.players[foe].field.map(card => {
    if (!card) return null;
    if (!card.faceDown) return clone(card);
    return { uid: card.uid, hidden: true, kind: 'monster', mode: 'defense', faceDown: true, name: '', atk: 0, def: 0, level: 0 };
  });
  // The engine writes its log from player 0's point of view. Flip the
  // second-person wording for the guest so both sides read it naturally.
  if (viewer === 1) {
    view.log = view.log.map(entry => ({
      ...entry,
      text: String(entry.text || '').replace(/あなた|相手/g, who => (who === 'あなた' ? '相手' : 'あなた')),
    }));
  }
  return view;
}

export function sanitizeEvents(events, viewer) {
  return events.map(event => {
    const copy = clone(event);
    if ((copy.t === 'summon') && copy.player !== viewer && copy.faceDown) {
      copy.card = { hidden: true, uid: copy.card?.uid, mode: 'defense', faceDown: true, kind: 'monster', name: '', atk: 0, def: 0, level: 0 };
    }
    if (copy.t === 'flip' && copy.player !== viewer) {
      copy.card = { ...copy.card, hidden: false };
    }
    return copy;
  });
}
