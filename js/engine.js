// Pure(ish) duel engine. All state transitions mutate the state object passed in
// and return a list of events the presentation layer can animate.

import { CARD_POOL, tributeCount } from './cards.js';

export const START_LP = 8000;
export const HAND_START = 5;
export const MAX_ZONES = 5;

let uidCounter = 1;

export function resetUid(value = 1) {
  uidCounter = value;
}

export function createInstance(def) {
  return {
    uid: uidCounter++,
    def,
    position: 'attack',
    faceDown: false,
    atkMod: 0,
    defMod: 0,
    hasAttacked: false,
    summonedTurn: -1,
    positionChanged: false,
    setTurn: -1
  };
}

export function atkOf(card) {
  return Math.max(0, card.def.atk + (card.atkMod || 0));
}

export function defOf(card) {
  return Math.max(0, card.def.def + (card.defMod || 0));
}

export const isFaceUpMonster = card => !!card && !card.faceDown && card.def.kind === 'monster';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rng) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function makePlayer(id, name, isAI, deckIds, rng) {
  const deck = shuffle(deckIds.map(cardId => createInstance(CARD_POOL[cardId])), rng);
  return {
    id,
    name,
    isAI,
    lp: START_LP,
    deck,
    hand: [],
    monsters: new Array(MAX_ZONES).fill(null),
    spells: new Array(MAX_ZONES).fill(null),
    graveyard: [],
    normalSummoned: false
  };
}

function log(state, text, tone = 'sys') {
  state.log.push({ id: state.log.length + 1, turn: state.turn, text, tone });
  if (state.log.length > 120) state.log.splice(0, state.log.length - 120);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function checkWin(state, events, reason = 'lp') {
  if (state.winner !== null) return;
  for (const player of state.players) {
    if (player.lp <= 0) {
      state.winner = 1 - player.id;
      state.phase = 'over';
      log(state, `${state.players[state.winner].name} の勝利！`, 'sys');
      events.push({ type: 'win', winner: state.winner, reason });
      return;
    }
  }
}

export function createDuel(playerDeck, aiDeck, seed = Date.now()) {
  const rng = mulberry32((seed >>> 0) || 1);
  const state = {
    turn: 1,
    active: 0,
    phase: 'main',
    winner: null,
    pending: null,
    players: [
      makePlayer(0, 'あなた', false, playerDeck, rng),
      makePlayer(1, '闇の決闘者', true, aiDeck, rng)
    ],
    log: [],
    stats: {
      damageDealt: [0, 0],
      monstersLost: [0, 0],
      summons: [0, 0],
      spells: [0, 0],
      traps: [0, 0]
    },
    rng
  };

  const events = [];
  for (const player of state.players) {
    for (let i = 0; i < HAND_START; i++) {
      const card = player.deck.pop();
      if (card) player.hand.push(card);
    }
  }
  log(state, 'デュエル開始！', 'sys');
  events.push(...beginTurn(state, 0, { initial: true }));
  return { state, events };
}

function drawCards(state, p, count, events) {
  const player = state.players[p];
  let drawn = 0;
  for (let i = 0; i < count; i++) {
    if (!player.deck.length) {
      state.winner = 1 - p;
      state.phase = 'over';
      log(state, `${player.name} はデッキ切れで敗北した…`, 'sys');
      events.push({ type: 'deckout', player: p });
      events.push({ type: 'win', winner: 1 - p, reason: 'deckout' });
      break;
    }
    const card = player.deck.pop();
    player.hand.push(card);
    drawn += 1;
  }
  if (drawn) {
    events.push({ type: 'draw', player: p, count: drawn });
    log(state, `${player.name} は ${drawn} 枚ドローした`, `p${p}`);
  }
  return drawn;
}

function beginTurn(state, p, { initial = false } = {}) {
  const events = [];
  const player = state.players[p];
  state.active = p;
  state.phase = 'main';
  state.pending = null;
  player.normalSummoned = false;
  for (const monster of player.monsters) {
    if (!monster) continue;
    monster.hasAttacked = false;
    monster.positionChanged = false;
  }
  events.push({ type: 'turn', player: p, turn: state.turn, initial });
  log(state, `ターン ${state.turn} — ${player.name}`, `p${p}`);
  drawCards(state, p, 1, events);
  return events;
}

export function startTurn(state) {
  return beginTurn(state, state.active);
}

export function endTurn(state) {
  assert(!state.winner, 'デュエルは終了しています');
  const events = [];
  const p = state.active;
  log(state, `${state.players[p].name} はターンを終了した`, `p${p}`);
  events.push({ type: 'endTurn', player: p });
  state.turn += 1;
  state.active = 1 - p;
  state.pending = null;
  events.push(...beginTurn(state, state.active));
  return { events };
}

export function enterBattle(state) {
  assert(!state.winner, 'デュエルは終了しています');
  assert(state.phase === 'main', 'メインフェイズではありません');
  state.phase = 'battle';
  log(state, `${state.players[state.active].name} はバトルフェイズに移行した`, `p${state.active}`);
  return { events: [{ type: 'phase', phase: 'battle', player: state.active }] };
}

export function canSummon(state, p = state.active) {
  return !state.winner && state.active === p && state.phase === 'main' && !state.players[p].normalSummoned;
}

export function findCardInHand(state, p, uid) {
  return state.players[p].hand.find(card => card.uid === uid) || null;
}

export function summonMonster(state, p, handUid, zone, { tributes = [], position = 'attack', triggerTraps = true } = {}) {
  assert(!state.winner, 'デュエルは終了しています');
  assert(state.active === p, 'あなたのターンではありません');
  assert(state.phase === 'main', 'メインフェイズではありません');
  const player = state.players[p];
  const card = findCardInHand(state, p, handUid);
  assert(card, 'そのカードは手札にありません');
  assert(card.def.kind === 'monster', 'モンスターカードではありません');
  assert(!player.normalSummoned, '召喚権はもう使いました');
  assert(Number.isInteger(zone) && zone >= 0 && zone < MAX_ZONES, 'ゾーンが不正です');
  assert(!player.monsters[zone], 'そのモンスターゾーンは埋まっています');

  const need = tributeCount(card.def.level);
  assert(tributes.length === need, need === 0 ? 'このモンスターは生贄なしで出せます' : `生贄が ${need} 体必要です`);
  const tributeCards = [];
  for (const tz of tributes) {
    assert(Number.isInteger(tz) && tz >= 0 && tz < MAX_ZONES, '生贄ゾーンが不正です');
    assert(player.monsters[tz], '生贄にするモンスターがいません');
    assert(!tributeCards.some(c => c.zone === tz), '同じモンスターを二重に生贄にできません');
    tributeCards.push({ zone: tz, card: player.monsters[tz] });
  }

  const events = [];
  for (const tribute of tributeCards) {
    player.monsters[tribute.zone] = null;
    tribute.card.faceDown = false;
    player.graveyard.push(tribute.card);
    events.push({ type: 'tribute', player: p, zone: tribute.zone, card: tribute.card });
  }
  player.hand.splice(player.hand.indexOf(card), 1);
  card.faceDown = false;
  card.position = position === 'defense' ? 'defense' : 'attack';
  card.summonedTurn = state.turn;
  card.positionChanged = false;
  card.hasAttacked = false;
  player.monsters[zone] = card;
  player.normalSummoned = true;
  state.stats.summons[p] += 1;

  events.push({ type: 'summon', player: p, zone, card, tributes: tributeCards });
  log(state, `${player.name} は「${card.def.name}」を${card.position === 'attack' ? '攻撃表示' : '守備表示'}で召喚した`, `p${p}`);

  const pitfall = triggerTraps && card.def.atk >= 1500 ? findTriggerTrap(state, 1 - p, 'pitfall') : null;
  if (pitfall) {
    state.pending = {
      kind: 'summonTrap',
      defender: 1 - p,
      summoner: p,
      targetZone: zone,
      trapUid: pitfall.uid,
      trapZone: pitfall.zone,
      card: pitfall.card,
      monster: card
    };
    events.push({ type: 'trapWindow', player: 1 - p, reason: 'summon', card: pitfall.card });
  }
  return { events, pending: state.pending };
}

function findTriggerTrap(state, p, effect) {
  const player = state.players[p];
  if (!player) return null;
  for (let zone = 0; zone < MAX_ZONES; zone++) {
    const card = player.spells[zone];
    if (card && card.def.kind === 'trap' && card.faceDown && card.setTurn < state.turn && card.def.effect === effect) {
      return { uid: card.uid, zone, card };
    }
  }
  return null;
}

export function setMonster(state, p, handUid, zone, { tributes = [] } = {}) {
  const result = summonMonster(state, p, handUid, zone, { tributes, position: 'defense', triggerTraps: false });
  const player = state.players[p];
  const card = player.monsters[zone];
  if (card) {
    card.faceDown = true;
    card.hasAttacked = false;
  }
  // Rewrite the summon event/log so the opponent cannot see the card.
  for (const ev of result.events) {
    if (ev.type === 'summon') {
      ev.faceDown = true;
      ev.card = card;
    }
  }
  state.log[state.log.length - 1].text = `${player.name} はモンスター１体をセットした`;
  return result;
}

export function setSpellTrap(state, p, handUid, zone) {
  assert(!state.winner, 'デュエルは終了しています');
  assert(state.active === p, 'あなたのターンではありません');
  assert(state.phase === 'main', 'メインフェイズではありません');
  const player = state.players[p];
  const card = findCardInHand(state, p, handUid);
  assert(card, 'そのカードは手札にありません');
  assert(card.def.kind === 'trap', 'セットできるのは罠カードだけです');
  assert(Number.isInteger(zone) && zone >= 0 && zone < MAX_ZONES, 'ゾーンが不正です');
  assert(!player.spells[zone], 'その魔法・罠ゾーンは埋まっています');

  player.hand.splice(player.hand.indexOf(card), 1);
  card.faceDown = true;
  card.setTurn = state.turn;
  player.spells[zone] = card;
  log(state, `${player.name} は魔法・罠カードを１枚セットした`, `p${p}`);
  return {
    events: [{ type: 'setSpell', player: p, zone, card }],
    pending: null
  };
}

function activateTrapCard(state, p, zone, events, reason) {
  const player = state.players[p];
  const card = player.spells[zone];
  if (!card) return null;
  assert(card.def.kind === 'trap', '罠カードではありません');
  assert(card.setTurn < state.turn, 'セットしたターンには発動できません');
  player.spells[zone] = null;
  card.faceDown = false;
  player.graveyard.push(card);
  state.stats.traps[p] += 1;
  events.push({ type: 'trap', player: p, zone, card, reason });
  log(state, `${player.name} は罠「${card.def.name}」を発動した！`, `p${p}`);
  return card;
}

export function getAttackTrapOptions(state, defender, { direct }) {
  const player = state.players[defender];
  const options = [];
  player.spells.forEach((card, zone) => {
    if (!card || card.def.kind !== 'trap' || !card.faceDown) return;
    if (card.setTurn >= state.turn) return;
    const effect = card.def.effect;
    if (effect === 'barrier' || effect === 'peace') options.push({ zone, card, effect });
    if (effect === 'cylinder' && direct) options.push({ zone, card, effect });
  });
  return options;
}

export function declareAttack(state, p, attackerZone, targetZone = null) {
  assert(!state.winner, 'デュエルは終了しています');
  assert(state.active === p, 'あなたのターンではありません');
  assert(state.phase === 'battle', 'バトルフェイズではありません');
  const player = state.players[p];
  const attacker = player.monsters[attackerZone];
  assert(attacker, '攻撃するモンスターがいません');
  assert(!attacker.faceDown && attacker.position === 'attack', '攻撃表示のモンスターでなければ攻撃できません');
  assert(!attacker.hasAttacked, 'そのモンスターはすでに攻撃しました');
  const defender = 1 - p;
  const direct = targetZone === null || targetZone === undefined;

  if (direct) {
    assert(!hasMonsters(state, defender), '相手モンスターがいる場合は直接攻撃できません');
  } else {
    assert(Number.isInteger(targetZone) && targetZone >= 0 && targetZone < MAX_ZONES, '対象が不正です');
    assert(state.players[defender].monsters[targetZone], '対象のモンスターがいません');
  }

  attacker.hasAttacked = true;
  const options = getAttackTrapOptions(state, defender, { direct });
  state.pending = {
    kind: 'attack',
    player: p,
    defender,
    attackerZone,
    targetZone: direct ? null : targetZone,
    options: options.map(o => ({ zone: o.zone, effect: o.effect, uid: o.card.uid, name: o.card.def.name }))
  };
  if (options.length) {
    return { events: [], pending: state.pending };
  }
  return { ...resolveAttack(state, null), pending: state.pending };
}

export function resolveAttack(state, trapUid = null) {
  const pending = state.pending;
  assert(pending && pending.kind === 'attack', '攻撃待ちがありません');
  const events = [];
  const p = pending.player;
  const defenderP = pending.defender;
  const player = state.players[p];
  const defender = state.players[defenderP];
  const attacker = player.monsters[pending.attackerZone];
  const attackerAtk = attacker ? atkOf(attacker) : 0;
  const target = pending.targetZone === null ? null : defender.monsters[pending.targetZone];

  events.push({
    type: 'attack',
    player: p,
    attacker: attacker || null,
    attackerZone: pending.attackerZone,
    target: target || null,
    targetZone: pending.targetZone,
    direct: pending.targetZone === null
  });

  let negated = false;
  if (trapUid !== null && trapUid !== undefined) {
    const option = pending.options.find(o => o.uid === trapUid);
    assert(option, 'その罠は発動できません');
    const trapCard = activateTrapCard(state, defenderP, option.zone, events, 'attack');
    if (trapCard) {
      if (trapCard.def.effect === 'barrier') {
        negated = true;
        log(state, '攻撃表示モンスターが全て砕け散る！', 'sys');
        for (let z = 0; z < MAX_ZONES; z++) {
          const monster = player.monsters[z];
          if (monster && !monster.faceDown && monster.position === 'attack') {
            destroyMonster(state, p, z, events, 'barrier');
          }
        }
      } else if (trapCard.def.effect === 'cylinder') {
        negated = true;
        events.push({ type: 'negate', player: p });
        log(state, '攻撃は魔力の筒に吸い込まれた！', 'sys');
        dealDamage(state, p, attackerAtk, events, 'cylinder');
      } else if (trapCard.def.effect === 'peace') {
        negated = true;
        events.push({ type: 'negate', player: p });
        log(state, '攻撃は和睦の使者によって無効化された', 'sys');
      }
    }
  }

  if (!negated && !state.winner) {
    if (pending.targetZone === null) {
      log(state, `${player.name} の「${attacker.def.name}」が直接攻撃！ ${attackerAtk} ダメージ`, `p${p}`);
      dealDamage(state, defenderP, attackerAtk, events, 'direct');
    } else if (target) {
      if (target.faceDown) {
        target.faceDown = false;
        target.position = 'defense';
        events.push({ type: 'reveal', player: defenderP, zone: pending.targetZone, card: target });
      }
      const dAtk = atkOf(target);
      const dDef = defOf(target);
      if (target.position === 'attack') {
        log(state, `「${attacker.def.name}」(${attackerAtk}) VS 「${target.def.name}」(${dAtk})`, `p${p}`);
        if (attackerAtk > dAtk) {
          destroyMonster(state, defenderP, pending.targetZone, events, 'battle');
          dealDamage(state, defenderP, attackerAtk - dAtk, events, 'battle');
        } else if (attackerAtk < dAtk) {
          destroyMonster(state, p, pending.attackerZone, events, 'battle');
          dealDamage(state, p, dAtk - attackerAtk, events, 'battle');
        } else {
          destroyMonster(state, defenderP, pending.targetZone, events, 'battle');
          destroyMonster(state, p, pending.attackerZone, events, 'battle');
          log(state, '相打ち！ 両者のモンスターが破壊された', 'sys');
        }
      } else {
        log(state, `「${attacker.def.name}」(${attackerAtk}) が守備表示「${target.def.name}」(${dDef}) を攻撃`, `p${p}`);
        if (attackerAtk > dDef) {
          destroyMonster(state, defenderP, pending.targetZone, events, 'battle');
        } else if (attackerAtk < dDef) {
          destroyMonster(state, p, pending.attackerZone, events, 'battle');
          dealDamage(state, p, dDef - attackerAtk, events, 'battle');
        } else {
          log(state, '攻撃は防がれた', 'sys');
        }
      }
    }
  }

  state.pending = null;
  checkWin(state, events);
  return { events, pending: null };
}

export function resolveSummonTrap(state, trapUid = null) {
  const pending = state.pending;
  assert(pending && pending.kind === 'summonTrap', '召喚への罠待ちがありません');
  const events = [];
  if (trapUid !== null && trapUid !== undefined) {
    const player = state.players[pending.defender];
    const card = player.spells[pending.trapZone];
    assert(card && card.uid === trapUid, 'その罠は発動できません');
    activateTrapCard(state, pending.defender, pending.trapZone, events, 'summon');
    const monster = state.players[pending.summoner].monsters[pending.targetZone];
    if (monster && monster.uid === pending.monster.uid) {
      destroyMonster(state, pending.summoner, pending.targetZone, events, 'pitfall');
    }
  }
  state.pending = null;
  checkWin(state, events);
  return { events, pending: null };
}

function destroyMonster(state, p, zone, events, reason) {
  const player = state.players[p];
  const card = player.monsters[zone];
  if (!card) return;
  player.monsters[zone] = null;
  card.faceDown = false;
  player.graveyard.push(card);
  state.stats.monstersLost[p] += 1;
  events.push({ type: 'destroy', player: p, zone, card, reason });
  log(state, `「${card.def.name}」が破壊された`, `p${p}`);
}

function dealDamage(state, p, amount, events, reason) {
  if (amount <= 0 || state.winner !== null) return;
  const player = state.players[p];
  player.lp = Math.max(0, player.lp - amount);
  state.stats.damageDealt[1 - p] += amount;
  events.push({ type: 'damage', player: p, amount, lp: player.lp, reason });
  log(state, `${player.name} に ${amount} のダメージ！`, `p${p}`);
  checkWin(state, events);
}

export function changePosition(state, p, zone) {
  assert(!state.winner, 'デュエルは終了しています');
  assert(state.active === p, 'あなたのターンではありません');
  assert(state.phase === 'main', 'メインフェイズではありません');
  const card = state.players[p].monsters[zone];
  assert(card, 'モンスターがいません');
  assert(card.summonedTurn !== state.turn, '召喚したターンは表示形式を変更できません');
  assert(!card.positionChanged, 'このモンスターはすでに表示形式を変更しました');
  const events = [];
  if (card.faceDown) {
    card.faceDown = false;
    card.position = 'attack';
    log(state, `セットされていた「${card.def.name}」を反転召喚した`, `p${p}`);
  } else {
    card.position = card.position === 'attack' ? 'defense' : 'attack';
    log(state, `「${card.def.name}」を${card.position === 'attack' ? '攻撃表示' : '守備表示'}に変更した`, `p${p}`);
  }
  card.positionChanged = true;
  events.push({ type: 'position', player: p, zone, card });
  return { events };
}

export function activateSpell(state, p, handUid, target = null) {
  assert(!state.winner, 'デュエルは終了しています');
  assert(state.active === p, 'あなたのターンではありません');
  assert(state.phase === 'main', 'メインフェイズではありません');
  const player = state.players[p];
  const card = findCardInHand(state, p, handUid);
  assert(card, 'そのカードは手札にありません');
  assert(card.def.kind === 'spell', '魔法カードではありません');
  const effect = card.def.effect;
  const events = [];
  const opponent = state.players[1 - p];

  // Validate targets before spending the card.
  if (effect === 'destroyMonster' || effect === 'bounce') {
    assert(target !== null && Number.isInteger(target), '対象のモンスターを選択してください');
    assert(opponent.monsters[target], '対象のモンスターがいません');
  }
  if (effect === 'buff') {
    assert(target !== null && Number.isInteger(target), '対象のモンスターを選択してください');
    assert(player.monsters[target] && !player.monsters[target].faceDown, '対象のモンスターがいません');
  }
  if (effect === 'destroySet') {
    assert(target !== null && Number.isInteger(target), '対象のカードを選択してください');
    assert(opponent.spells[target] && opponent.spells[target].faceDown, '対象のセットカードがありません');
  }
  if (effect === 'draw2pay') {
    assert(player.lp > 1000, 'ライフが足りません');
  }

  player.hand.splice(player.hand.indexOf(card), 1);
  player.graveyard.push(card);
  state.stats.spells[p] += 1;
  events.push({ type: 'spell', player: p, card, effect, target });
  log(state, `${player.name} は魔法「${card.def.name}」を発動した`, `p${p}`);

  switch (effect) {
    case 'draw2': {
      drawCards(state, p, 2, events);
      break;
    }
    case 'draw2pay': {
      player.lp -= 1000;
      events.push({ type: 'damage', player: p, amount: 1000, lp: player.lp, reason: 'cost' });
      log(state, `${player.name} は 1000 ライフを支払った`, `p${p}`);
      drawCards(state, p, 2, events);
      break;
    }
    case 'heal': {
      player.lp += 1500;
      events.push({ type: 'heal', player: p, amount: 1500, lp: player.lp });
      log(state, `${player.name} は 1500 ライフを回復した`, `p${p}`);
      break;
    }
    case 'destroyMonster': {
      destroyMonster(state, 1 - p, target, events, 'spell');
      break;
    }
    case 'buff': {
      const monster = player.monsters[target];
      monster.atkMod += 700;
      events.push({ type: 'buff', player: p, zone: target, card: monster, amount: 700 });
      log(state, `「${monster.def.name}」の攻撃力が 700 アップした`, `p${p}`);
      break;
    }
    case 'destroySet': {
      const setCard = opponent.spells[target];
      opponent.spells[target] = null;
      setCard.faceDown = false;
      opponent.graveyard.push(setCard);
      events.push({ type: 'destroySet', player: 1 - p, zone: target, card: setCard });
      log(state, `セットされていた「${setCard.def.name}」を破壊した`, `p${p}`);
      break;
    }
    case 'bounce': {
      const monster = opponent.monsters[target];
      opponent.monsters[target] = null;
      monster.faceDown = false;
      opponent.hand.push(monster);
      events.push({ type: 'bounce', player: 1 - p, zone: target, card: monster });
      log(state, `「${monster.def.name}」を持ち主の手札に戻した`, `p${p}`);
      break;
    }
    default:
      break;
  }

  checkWin(state, events);
  return { events, pending: null };
}

export function hasMonsters(state, p) {
  return state.players[p].monsters.some(Boolean);
}

export function monsterCount(state, p) {
  return state.players[p].monsters.filter(Boolean).length;
}

export function emptyMonsterZones(state, p) {
  return state.players[p].monsters.map((c, i) => (c ? -1 : i)).filter(i => i >= 0);
}

export function emptySpellZones(state, p) {
  return state.players[p].spells.map((c, i) => (c ? -1 : i)).filter(i => i >= 0);
}

export function canAttack(state, p, zone) {
  const player = state.players[p];
  const monster = player.monsters[zone];
  return !!monster && !monster.faceDown && monster.position === 'attack' && !monster.hasAttacked;
}

export function attackTargets(state, p, attackerZone) {
  const attacker = state.players[p].monsters[attackerZone];
  if (!attacker || !canAttack(state, p, attackerZone)) return { zones: [], direct: false };
  const targets = state.players[1 - p].monsters.map(Boolean);
  const direct = !targets.some(Boolean);
  return { zones: targets, direct };
}

export function summonRequirements(card) {
  return tributeCount(card.def.level);
}

export function describeCard(card) {
  return card.def.name;
}
