/* POLARIS — authoritative duel engine.
   Plain JSON state in, plain JSON state out. The host owns the only mutable
   copy; guests render redacted snapshots and send intents. */

import { CARD_DEFS, DECK_LIST, cardDef, tributeCount } from './cards.js';

let uidSeed = 0;

const nowStamp = () => Date.now();

export function atkOf(card) {
  if (!card) return 0;
  const def = cardDef(card);
  return Math.max(0, (def?.atk || 0) + (card.buff || 0));
}

export function defOf(card) {
  if (!card) return 0;
  const def = cardDef(card);
  return Math.max(0, def?.def || 0);
}

export function emptyZone(row) {
  const i = row.indexOf(null);
  return i < 0 ? -1 : i;
}

function makeCard(id, owner) {
  const def = CARD_DEFS[id];
  if (!def) throw new Error(`Unknown card ${id}`);
  return {
    uid: `c${(++uidSeed).toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    id,
    owner,
    buff: 0,
    position: 'atk',
    faceDown: false,
    hasAttacked: false,
    summonedTurn: 0,
    setTurn: 0,
    positionChanged: false,
    frozen: 0,
    shieldUsed: false,
    equipTarget: null,
  };
}

function buildDeck(owner) {
  const deck = [];
  for (const [id, count] of DECK_LIST) {
    for (let i = 0; i < count; i++) deck.push(makeCard(id, owner));
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function makePlayer(name, tag, index) {
  return {
    name: name || (index === 0 ? '極夜の主' : '北の挑戦者'),
    tag: tag || (index === 0 ? 'HOST / 北極点' : 'GUEST / 氷原'),
    lp: 8000,
    deck: buildDeck(index),
    hand: [],
    monsters: [null, null, null, null],
    spells: [null, null, null, null],
    grave: [],
    hasSummoned: false,
  };
}

export function createDuel({ room = 'POLAR', mode = 'ai', p0Name, p1Name, p0Tag, p1Tag } = {}) {
  uidSeed = 0;
  const state = {
    v: 1,
    room,
    mode,
    over: false,
    winner: null,
    turn: 1,
    active: 0,
    winnerReason: '',
    players: [makePlayer(p0Name, p0Tag, 0), makePlayer(p1Name, p1Tag, 1)],
    log: [],
    logSeq: 0,
    events: [],
    eventSeq: 0,
    startedAt: nowStamp(),
  };

  for (const p of [0, 1]) {
    for (let i = 0; i < 5; i++) {
      const card = state.players[p].deck.shift();
      if (card) state.players[p].hand.push(card);
    }
  }

  state.players[0].hasSummoned = false;
  state.players[1].hasSummoned = false;

  log(state, '極夜の決闘が始まった。', 'system');
  log(state, `${state.players[0].name} が先攻。`, 'system');
  log(state, 'TURN 01 — あなたのターン。', 'turn');
  emit(state, 'start', {});
  emit(state, 'turn', { player: 0, turn: 1, first: true });
  return state;
}

function log(state, text, tone = 'normal') {
  state.log.unshift({ id: ++state.logSeq, text, tone, turn: state.turn });
  if (state.log.length > 80) state.log.length = 80;
}

function emit(state, kind, data = {}) {
  state.events.push({ id: ++state.eventSeq, kind, ...data });
  if (state.events.length > 24) state.events.shift();
}

export function appendLog(state, text, tone = 'system') {
  log(state, text, tone);
}

function pl(state, p) { return state.players[p]; }

function finish(state, winner, reason) {
  if (state.over) return;
  state.over = true;
  state.winner = winner;
  state.winnerReason = reason;
  log(state, reason, 'result');
  emit(state, 'win', { winner, reason });
}

export function dealDamage(state, p, amount, source = '') {
  if (state.over || amount <= 0) return;
  const player = pl(state, p);
  player.lp = Math.max(0, player.lp - amount);
  log(state, `${player.name} に ${amount} ダメージ。`, 'bad');
  emit(state, 'damage', { player: p, amount, source });
  if (player.lp <= 0) finish(state, 1 - p, `${player.name} のライフポイントが尽きた。`);
}

function healPlayer(state, p, amount) {
  const player = pl(state, p);
  player.lp = Math.min(9999, player.lp + amount);
  log(state, `${player.name} は ${amount} 回復した。`, 'good');
  emit(state, 'heal', { player: p, amount });
}

export function drawCards(state, p, count = 1) {
  const player = pl(state, p);
  for (let i = 0; i < count; i++) {
    if (!player.deck.length) {
      finish(state, 1 - p, `${player.name} の山札が尽きた。`);
      return 0;
    }
    const card = player.deck.shift();
    player.hand.push(card);
    emit(state, 'draw', { player: p, uid: card.uid });
  }
  log(state, `${player.name} は ${count} 枚ドローした。`, 'draw');
  return count;
}

function beginTurn(state, p, { draw = true, first = false } = {}) {
  state.active = p;
  const player = pl(state, p);
  player.hasSummoned = false;
  for (const zone of player.monsters) {
    if (!zone) continue;
    zone.hasAttacked = false;
    zone.positionChanged = false;
    if (zone.frozen > 0) zone.frozen--;
  }
  if (draw) {
    drawCards(state, p, 1);
    if (state.over) return;
  }
  log(state, `TURN ${String(state.turn).padStart(2, '0')} — ${player.name} のターン。`, 'turn');
  emit(state, 'turn', { player: p, turn: state.turn, first });
}

function removeEquipsFor(state, p, zone) {
  const player = pl(state, p);
  for (let i = 0; i < player.spells.length; i++) {
    const spell = player.spells[i];
    if (!spell || !spell.equipTarget) continue;
    if (spell.equipTarget.p === p && spell.equipTarget.z === zone) {
      player.spells[i] = null;
      player.grave.push(spell);
      emit(state, 'equipLost', { player: p, zone: i, name: cardDef(spell).name });
    }
  }
}

function destroyMonster(state, p, zone, { battle = false, cause = 'battle', ignoreShield = false } = {}) {
  const player = pl(state, p);
  const card = player.monsters[zone];
  if (!card) return false;
  const def = cardDef(card);

  if (battle && card.shield && !card.shieldUsed && !ignoreShield) {
    card.shieldUsed = true;
    card.faceDown = false;
    card.position = 'def';
    log(state, `${def.name} の結晶の殻が破壊を防いだ。`, 'effect');
    emit(state, 'shield', { player: p, zone, name: def.name });
    return false;
  }

  removeEquipsFor(state, p, zone);
  card.faceDown = false;
  player.monsters[zone] = null;
  player.grave.push(card);
  log(state, `${def.name} が破壊された。`, 'bad');
  emit(state, 'destroy', { player: p, zone, cardId: card.id, name: def.name, cause });

  if (def.onDestroyed === 'draw1' && !state.over) drawCards(state, p, 1);
  return true;
}

function buffAll(state, p, amount) {
  const player = pl(state, p);
  let count = 0;
  for (const card of player.monsters) {
    if (!card || card.faceDown) continue;
    card.buff += amount;
    count++;
  }
  return count;
}

function onSummon(state, p, zone) {
  const card = pl(state, p).monsters[zone];
  if (!card) return;
  const def = cardDef(card);
  if (def.onSummon === 'heal600') {
    healPlayer(state, p, 600);
    emit(state, 'effect', { player: p, zone, text: '極光の祈り — 600回復' });
  }
  if (def.onSummon === 'burn800') {
    emit(state, 'effect', { player: p, zone, text: '凍てつく吐息 — 800ダメージ' });
    dealDamage(state, 1 - p, 800, 'frostDragon');
  }
  if (def.onSummon === 'buff300') {
    const n = buffAll(state, p, 300);
    log(state, `白夜の号令 — 自分のモンスター ${n} 体の攻撃力が300アップ。`, 'effect');
    emit(state, 'effect', { player: p, zone, text: '白夜の号令 — ATK +300' });
  }
}

function checkSummonBurn(state, owner, zone) {
  const defender = 1 - owner;
  const player = pl(state, defender);
  for (let i = 0; i < player.spells.length; i++) {
    const trap = player.spells[i];
    if (!trap || !trap.faceDown || trap.setTurn === state.turn) continue;
    const def = cardDef(trap);
    if (def.trap !== 'summonBurn') continue;
    trap.faceDown = false;
    player.spells[i] = null;
    player.grave.push(trap);
    log(state, `罠発動 — ${def.name}。`, 'trap');
    emit(state, 'trap', { player: defender, zone: i, name: def.name, trap: def.trap });
    dealDamage(state, owner, 700, 'fallingIce');
    return;
  }
}

function findAttackTrap(state, defender, attackerAtk) {
  const player = pl(state, defender);
  for (let i = 0; i < player.spells.length; i++) {
    const trap = player.spells[i];
    if (!trap || !trap.faceDown || trap.setTurn === state.turn) continue;
    const def = cardDef(trap);
    if (def.type !== 'trap') continue;
    if (def.trap === 'destroyAttacker' && attackerAtk > 2000) continue;
    if (def.trap === 'summonBurn') continue;
    return { zone: i, card: trap, def };
  }
  return null;
}

function triggerAttackTrap(state, defender, trapInfo, attackerPlayer, attackerZone) {
  const { zone, card, def } = trapInfo;
  const player = pl(state, defender);
  card.faceDown = false;
  player.spells[zone] = null;
  player.grave.push(card);
  log(state, `罠発動 — ${def.name}。`, 'trap');
  emit(state, 'trap', { player: defender, zone, name: def.name, trap: def.trap });
  let negate = false;

  if (def.trap === 'negateHeal') {
    healPlayer(state, defender, 500);
    negate = true;
  } else if (def.trap === 'weaken') {
    const attacker = pl(state, attackerPlayer).monsters[attackerZone];
    if (attacker) attacker.buff -= 1000;
    log(state, '氷の壁が攻撃モンスターの攻撃力を1000ダウン。', 'effect');
    emit(state, 'effect', { player: defender, zone, text: 'ATK −1000' });
  } else if (def.trap === 'reflect') {
    dealDamage(state, attackerPlayer, 500, 'mirrorIce');
    negate = true;
  } else if (def.trap === 'destroyAttacker') {
    destroyMonster(state, attackerPlayer, attackerZone, { battle: false, cause: 'trap' });
    negate = true;
  }
  return negate;
}

function spellTargetZone(state, action) {
  return action.target && Number.isInteger(action.target.z) ? action.target.z : -1;
}

function activateSpell(state, p, action) {
  const player = pl(state, p);
  const handCard = player.hand.find((c) => c.uid === action.uid);
  if (!handCard) return err('そのカードは手札にない。');
  const def = cardDef(handCard);
  if (def.type !== 'spell') return err('これは魔法カードではない。');
  const targetPlayer = action.target ? (action.target.p === 0 || action.target.p === 1 ? action.target.p : 1 - p) : null;
  const targetZone = spellTargetZone(state, action);
  const target = targetPlayer !== null && targetZone >= 0 ? pl(state, targetPlayer).monsters[targetZone] : null;

  if (def.spell === 'destroy' || def.spell === 'bind') {
    if (!target || targetPlayer !== 1 - p) return err('相手モンスターを対象に選んでください。');
  }
  if (def.spell === 'equip') {
    if (!target || targetPlayer !== p) return err('自分のモンスターを対象に選んでください。');
    if (emptyZone(player.spells) < 0) return err('魔法・罠ゾーンに空きがない。');
  }
  if (def.spell === 'revive') {
    if (emptyZone(player.monsters) < 0) return err('モンスターゾーンに空きがない。');
    if (!player.grave.some((c) => cardDef(c).type === 'monster')) return err('墓地にモンスターがいない。');
  }

  player.hand = player.hand.filter((c) => c.uid !== handCard.uid);
  emit(state, 'spell', { player: p, cardId: def.id, name: def.name, spell: def.spell });
  log(state, `${player.name} は魔法「${def.name}」を発動。`, 'spell');

  if (def.spell === 'equip') {
    const zone = emptyZone(player.spells);
    handCard.faceDown = false;
    handCard.setTurn = state.turn;
    handCard.equipTarget = { p, z: targetZone };
    player.spells[zone] = handCard;
    target.buff += 800;
    log(state, `${def.name} が ${cardDef(target).name} に装備され、攻撃力が800アップ。`, 'effect');
    emit(state, 'effect', { player: p, zone: targetZone, text: 'ATK +800' });
    return ok();
  }

  player.grave.push(handCard);

  if (def.spell === 'destroy') {
    destroyMonster(state, targetPlayer, targetZone, { battle: false, cause: 'spell' });
  } else if (def.spell === 'bind') {
    target.faceDown = false;
    target.position = 'def';
    target.frozen = 2;
    target.positionChanged = true;
    log(state, `${cardDef(target).name} は氷に縛られ、守備表示で凍結した。`, 'effect');
    emit(state, 'freeze', { player: targetPlayer, zone: targetZone, name: cardDef(target).name });
  } else if (def.spell === 'draw') {
    drawCards(state, p, 2);
  } else if (def.spell === 'heal') {
    healPlayer(state, p, 1200);
  } else if (def.spell === 'revive') {
    const candidates = player.grave
      .filter((c) => cardDef(c).type === 'monster')
      .sort((a, b) => cardDef(b).atk - cardDef(a).atk);
    const revived = candidates[0];
    if (revived) {
      player.grave = player.grave.filter((c) => c.uid !== revived.uid);
      revived.position = 'def';
      revived.faceDown = false;
      revived.hasAttacked = true;
      revived.summonedTurn = state.turn;
      revived.buff = 0;
      const zone = emptyZone(player.monsters);
      if (zone >= 0) {
        player.monsters[zone] = revived;
        log(state, `${cardDef(revived).name} が氷解し、守備表示で蘇った。`, 'effect');
        emit(state, 'revive', { player: p, zone, name: cardDef(revived).name });
      }
    }
  }
  return ok();
}

function summonMonster(state, p, action, { set = false } = {}) {
  const player = pl(state, p);
  const card = player.hand.find((c) => c.uid === action.uid);
  if (!card) return err('そのカードは手札にない。');
  const def = cardDef(card);
  if (def.type !== 'monster') return err('これはモンスターではない。');
  if (player.hasSummoned) return err('このターンはもう召喚・セットしている。');

  const needed = tributeCount(card);
  let tributes = [];
  if (Array.isArray(action.tributes)) {
    tributes = action.tributes.filter((z) => Number.isInteger(z) && player.monsters[z]);
  }
  if (tributes.length < needed) {
    const candidates = player.monsters
      .map((c, z) => ({ c, z }))
      .filter((x) => x.c && !tributes.includes(x.z))
      .sort((a, b) => atkOf(a.c) - atkOf(b.c) || (a.c.faceDown ? -1 : 1));
    if (tributes.length + candidates.length < needed) return err(`生贄が ${needed} 体必要だ。`);
    tributes.push(...candidates.slice(0, needed - tributes.length).map((x) => x.z));
  }
  tributes = [...new Set(tributes)].filter((z) => player.monsters[z]).slice(0, needed);

  for (const z of tributes) {
    const tribute = player.monsters[z];
    if (!tribute) continue;
    removeEquipsFor(state, p, z);
    player.monsters[z] = null;
    player.grave.push(tribute);
    log(state, `${cardDef(tribute).name} を生贄に捧げた。`, 'system');
    emit(state, 'tribute', { player: p, zone: z, name: cardDef(tribute).name });
  }

  let zone = Number.isInteger(action.zone) ? action.zone : -1;
  if (zone < 0 || zone > 3 || player.monsters[zone]) zone = emptyZone(player.monsters);
  if (zone < 0) return err('モンスターゾーンに空きがない。');

  player.hand = player.hand.filter((c) => c.uid !== card.uid);
  card.position = set ? 'def' : 'atk';
  card.faceDown = set;
  card.hasAttacked = false;
  card.positionChanged = false;
  card.summonedTurn = state.turn;
  card.setTurn = state.turn;
  card.frozen = 0;
  player.monsters[zone] = card;
  player.hasSummoned = true;

  if (set) {
    log(state, `${player.name} はモンスターをセットした。`, 'set');
    emit(state, 'setMonster', { player: p, zone });
  } else {
    log(state, `${player.name} は ${def.name} を召喚。`, 'summon');
    emit(state, 'summon', { player: p, zone, cardId: def.id, name: def.name, atk: atkOf(card), def: defOf(card) });
    onSummon(state, p, zone);
    if (!state.over) checkSummonBurn(state, p, zone);
  }
  return ok();
}

function setTrap(state, p, action) {
  const player = pl(state, p);
  const card = player.hand.find((c) => c.uid === action.uid);
  if (!card) return err('そのカードは手札にない。');
  const def = cardDef(card);
  if (def.type !== 'trap') return err('これは罠カードではない。');
  let zone = Number.isInteger(action.zone) ? action.zone : -1;
  if (zone < 0 || zone > 3 || player.spells[zone]) zone = emptyZone(player.spells);
  if (zone < 0) return err('魔法・罠ゾーンに空きがない。');
  player.hand = player.hand.filter((c) => c.uid !== card.uid);
  card.faceDown = true;
  card.setTurn = state.turn;
  card.equipTarget = null;
  player.spells[zone] = card;
  log(state, `${player.name} は罠カードをセットした。`, 'set');
  emit(state, 'setTrap', { player: p, zone });
  return ok();
}

function changePosition(state, p, action) {
  const player = pl(state, p);
  const zone = action.zone;
  const card = player.monsters[zone];
  if (!card) return err('モンスターがいない。');
  if (card.frozen > 0) return err('凍結していて表示形式を変更できない。');
  if (card.positionChanged) return err('このモンスターはこのターン表示形式を変更した。');
  if (card.hasAttacked) return err('攻撃したモンスターは表示形式を変更できない。');
  const to = action.to === 'def' ? 'def' : action.to === 'atk' ? 'atk' : (card.position === 'atk' ? 'def' : 'atk');
  const wasFaceDown = card.faceDown;
  if (!wasFaceDown && card.position === to) return err('すでにその表示形式だ。');
  card.faceDown = false;
  card.position = to;
  card.positionChanged = true;
  log(state, `${cardDef(card).name} を${to === 'atk' ? '攻撃' : '守備'}表示に変更。`, 'position');
  emit(state, 'position', { player: p, zone, position: to, flip: wasFaceDown, name: cardDef(card).name });
  return ok();
}

function resolveBattle(state, p, action) {
  const player = pl(state, p);
  const attacker = player.monsters[action.zone];
  if (!attacker) return err('攻撃するモンスターがいない。');
  if (attacker.faceDown || attacker.position !== 'atk') return err('攻撃表示のモンスターでなければ攻撃できない。');
  if (attacker.hasAttacked) return err('このモンスターはこのターン攻撃済みだ。');

  const defenderIdx = 1 - p;
  const defender = pl(state, defenderIdx);
  const living = defender.monsters.filter(Boolean).length;
  if (living > 0 && (!action.target || !defender.monsters[action.target.z])) {
    return err('攻撃対象のモンスターを選んでください。');
  }
  if (living === 0 && action.target) return err('相手モンスターがいない。ダイレクトアタックになる。');
  if (living > 0 && action.target && action.target.p !== undefined && action.target.p !== defenderIdx) {
    return err('攻撃対象が不正だ。');
  }

  const targetZone = living > 0 ? action.target.z : null;
  const attackValue = atkOf(attacker);
  emit(state, 'attack', {
    player: p,
    zone: action.zone,
    target: targetZone === null ? null : { p: defenderIdx, z: targetZone },
    atk: attackValue,
  });
  log(state, `${cardDef(attacker).name} の攻撃。`, 'attack');

  const trapInfo = findAttackTrap(state, defenderIdx, attackValue);
  if (trapInfo) {
    const negate = triggerAttackTrap(state, defenderIdx, trapInfo, p, action.zone);
    if (state.over) return ok();
    if (negate) {
      attacker.hasAttacked = true;
      emit(state, 'attackEnd', { player: p, zone: action.zone, negated: true });
      return ok();
    }
  }

  // Ice Wall may have reduced the attacker's ATK.
  const liveAttacker = player.monsters[action.zone];
  if (!liveAttacker) {
    log(state, '攻撃は中断された。', 'system');
    return ok();
  }
  const atk = atkOf(liveAttacker);

  if (targetZone === null) {
    log(state, 'ダイレクトアタック。', 'attack');
    dealDamage(state, defenderIdx, atk, 'direct');
    liveAttacker.hasAttacked = true;
    emit(state, 'attackEnd', { player: p, zone: action.zone, direct: true, damage: atk });
    return ok();
  }

  const target = defender.monsters[targetZone];
  if (!target) return ok();
  const targetDef = cardDef(target);
  const wasFaceDown = target.faceDown;
  if (wasFaceDown) {
    target.faceDown = false;
    emit(state, 'flip', { player: defenderIdx, zone: targetZone, name: targetDef.name });
    log(state, `${targetDef.name} がリバースされた。`, 'flip');
  }

  let damage = 0;
  let destroyAttacker = false;
  let destroyTarget = false;

  if (target.position === 'def') {
    const d = defOf(target);
    if (atk > d) {
      destroyTarget = true;
      if (targetDef.piercing) damage = atk - d;
      log(state, `${targetDef.name} を突破。`, 'attack');
    } else {
      log(state, `${targetDef.name} の守備力に阻まれた。`, 'attack');
      emit(state, 'blocked', { player: p, zone: action.zone, target: { p: defenderIdx, z: targetZone } });
    }
  } else {
    const t = atkOf(target);
    if (atk > t) {
      destroyTarget = true;
      damage = atk - t;
    } else if (atk === t) {
      destroyTarget = true;
      destroyAttacker = true;
    } else {
      destroyAttacker = true;
      damage = t - atk;
    }
  }

  if (destroyTarget) destroyMonster(state, defenderIdx, targetZone, { battle: true, cause: 'battle' });
  if (destroyAttacker) destroyMonster(state, p, action.zone, { battle: true, cause: 'battle' });
  if (damage > 0) dealDamage(state, destroyAttacker ? p : defenderIdx, damage, 'battle');

  const still = player.monsters[action.zone];
  if (still) still.hasAttacked = true;
  emit(state, 'attackEnd', {
    player: p,
    zone: action.zone,
    damage,
    destroyed: destroyTarget || destroyAttacker,
  });
  return ok();
}

const ok = (extra = {}) => ({ ok: true, ...extra });
const err = (error) => ({ ok: false, error });

export function applyAction(state, p, action) {
  if (!action || typeof action !== 'object') return err('不正な操作。');
  if (state.over) return err('決着はついている。');
  if (p !== 0 && p !== 1) return err('不正なプレイヤー。');
  if (action.type === 'surrender') {
    finish(state, 1 - p, `${pl(state, p).name} は降参した。`);
    return ok();
  }
  if (state.active !== p) return err('あなたのターンではない。');

  switch (action.type) {
    case 'summon': return summonMonster(state, p, action, { set: false });
    case 'setMonster': return summonMonster(state, p, action, { set: true });
    case 'activateSpell': return activateSpell(state, p, action);
    case 'setTrap': return setTrap(state, p, action);
    case 'position': return changePosition(state, p, action);
    case 'attack': return resolveBattle(state, p, action);
    case 'endTurn': {
      log(state, `${pl(state, p).name} はターンを終えた。`, 'system');
      state.turn++;
      beginTurn(state, 1 - p, { draw: true });
      return ok();
    }
    default: return err('未対応の操作。');
  }
}

/* Strip hidden information from a snapshot before sending it over the wire. */
export function redact(state, viewer) {
  const copy = structuredClone(state);
  const opponent = 1 - viewer;
  for (const idx of [0, 1]) {
    copy.players[idx].deck = copy.players[idx].deck.map((c) => ({ uid: c.uid, hidden: true }));
    if (idx !== opponent) continue;
    copy.players[idx].hand = copy.players[idx].hand.map((c) => ({ uid: c.uid, hidden: true }));
    copy.players[idx].monsters = copy.players[idx].monsters.map((c) =>
      c ? (c.faceDown ? { uid: c.uid, hidden: true, faceDown: true, position: 'def' } : c) : null);
    copy.players[idx].spells = copy.players[idx].spells.map((c) =>
      c ? (c.faceDown ? { uid: c.uid, hidden: true, faceDown: true } : c) : null);
  }
  return copy;
}

export function rematch(state, names) {
  return createDuel({
    room: state.room,
    mode: state.mode,
    p0Name: names?.[0] || state.players[0].name,
    p1Name: names?.[1] || state.players[1].name,
    p0Tag: state.players[0].tag,
    p1Tag: state.players[1].tag,
  });
}

export function turnLabel(state, viewer) {
  if (state.over) return state.winner === viewer ? 'VICTORY' : 'DEFEAT';
  return state.active === viewer ? 'YOUR TURN' : 'OPPONENT TURN';
}
