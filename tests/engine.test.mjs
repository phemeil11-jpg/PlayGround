import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDuel, createInstance, summonMonster, setMonster, setSpellTrap,
  declareAttack, resolveAttack, resolveSummonTrap, activateSpell,
  changePosition, enterBattle, endTurn, attackTargets, canAttack,
  atkOf, defOf
} from '../js/engine.js';
import { CARD_POOL } from '../js/cards.js';

const P = 0;
const A = 1;

function freshDuel(seed = 42) {
  const playerDeck = [
    'storm_knight', 'storm_knight', 'storm_knight', 'storm_knight',
    'storm_knight', 'storm_knight', 'storm_knight', 'storm_knight'
  ];
  const aiDeck = [
    'dark_knight', 'dark_knight', 'dark_knight', 'dark_knight',
    'dark_knight', 'dark_knight', 'dark_knight', 'dark_knight'
  ];
  return createDuel(playerDeck, aiDeck, seed);
}

function give(state, p, cardId) {
  const card = createInstance(CARD_POOL[cardId]);
  state.players[p].hand.push(card);
  return card;
}

function put(state, p, cardId, zone, overrides = {}) {
  const card = createInstance(CARD_POOL[cardId]);
  Object.assign(card, {
    summonedTurn: -1,
    positionChanged: false,
    hasAttacked: false,
    setTurn: -1
  }, overrides);
  state.players[p].monsters[zone] = card;
  return card;
}

function putTrap(state, p, cardId, zone, setTurn = 0) {
  const card = createInstance(CARD_POOL[cardId]);
  card.faceDown = true;
  card.setTurn = setTurn;
  state.players[p].spells[zone] = card;
  return card;
}

test('createDuel starts with 8000 LP and a six card hand for the first player', () => {
  const { state } = freshDuel();
  assert.equal(state.players[P].lp, 8000);
  assert.equal(state.players[A].lp, 8000);
  assert.equal(state.players[P].hand.length, 6);
  assert.equal(state.players[A].hand.length, 5);
  assert.equal(state.active, P);
  assert.equal(state.turn, 1);
  assert.equal(state.phase, 'main');
});

test('normal summon, direct attack and one attack per monster', () => {
  const { state } = freshDuel();
  const card = give(state, P, 'storm_knight');
  const res = summonMonster(state, P, card.uid, 0);
  assert.equal(state.players[P].monsters[0].def.name, '疾風の騎士');
  assert.equal(res.pending, null);
  assert.equal(state.players[P].normalSummoned, true);
  assert.throws(() => summonMonster(state, P, give(state, P, 'storm_knight').uid, 1), /召喚権/);

  enterBattle(state);
  assert.deepEqual(attackTargets(state, P, 0), { zones: [false, false, false, false, false], direct: true });
  const attack = declareAttack(state, P, 0, null);
  const damage = attack.events.find(e => e.type === 'damage');
  assert.equal(damage.amount, 1800);
  assert.equal(state.players[A].lp, 6200);
  assert.equal(canAttack(state, P, 0), false);
  assert.throws(() => declareAttack(state, P, 0, null), /すでに攻撃/);
});

test('battle between attack monsters destroys the weaker one and deals difference', () => {
  const { state } = freshDuel();
  state.phase = 'battle';
  put(state, P, 'storm_knight', 0); // 1800
  put(state, A, 'dark_knight', 0); // 1750
  const res = declareAttack(state, P, 0, 0);
  assert.equal(state.players[A].monsters[0], null);
  assert.equal(state.players[P].monsters[0].def.name, '疾風の騎士');
  assert.equal(state.players[A].lp, 7950);
  assert.ok(res.events.some(e => e.type === 'destroy'));
});

test('attacking a defense position monster deals no damage when ATK is higher', () => {
  const { state } = freshDuel();
  state.phase = 'battle';
  put(state, P, 'storm_knight', 0); // 1800
  put(state, A, 'iron_guardian', 0, { position: 'defense', summonedTurn: -1 }); // 2200 DEF
  // 1800 < 2200 => attacker destroyed, 400 damage to attacker's controller
  declareAttack(state, P, 0, 0);
  assert.equal(state.players[P].monsters[0], null);
  assert.equal(state.players[P].lp, 7600);
  assert.notEqual(state.players[A].monsters[0], null);
});

test('higher ATK crushes a defense position monster without damage', () => {
  const { state } = freshDuel();
  state.phase = 'battle';
  put(state, P, 'storm_knight', 0);
  put(state, P, 'aurora_dragon', 1, { position: 'attack', atkMod: 0 });
  put(state, A, 'iron_guardian', 0, { position: 'defense' });
  declareAttack(state, P, 1, 0);
  assert.equal(state.players[A].monsters[0], null);
  assert.equal(state.players[A].lp, 8000);
});

test('level 7+ monsters require two tributes', () => {
  const { state } = freshDuel();
  const dragon = give(state, P, 'aurora_dragon');
  put(state, P, 'storm_knight', 0, { summonedTurn: -1 });
  put(state, P, 'twin_mercenary', 1, { summonedTurn: -1 });
  assert.throws(() => summonMonster(state, P, dragon.uid, 2), /生贄/);
  assert.throws(() => summonMonster(state, P, dragon.uid, 2, { tributes: [0] }), /生贄/);
  summonMonster(state, P, dragon.uid, 2, { tributes: [0, 1] });
  assert.equal(state.players[P].monsters[0], null);
  assert.equal(state.players[P].monsters[1], null);
  assert.equal(state.players[P].monsters[2].def.name, '蒼穹の白龍');
  assert.equal(state.players[P].graveyard.length, 2);
});

test('set monster is hidden, flips on attack and uses DEF', () => {
  const { state } = freshDuel();
  const card = give(state, P, 'iron_guardian');
  setMonster(state, P, card.uid, 0);
  const set = state.players[P].monsters[0];
  assert.equal(set.faceDown, true);
  assert.equal(set.position, 'defense');

  // Opponent attacks the set monster with 1750 ATK into 2200 DEF.
  state.active = A;
  state.phase = 'battle';
  put(state, A, 'dark_knight', 0);
  declareAttack(state, A, 0, 0);
  assert.equal(state.players[A].lp, 7550);
  assert.equal(state.players[A].monsters[0], null);
});

test('position changes are limited to once per turn and not on the summon turn', () => {
  const { state } = freshDuel();
  const card = give(state, P, 'storm_knight');
  summonMonster(state, P, card.uid, 0);
  assert.throws(() => changePosition(state, P, 0), /召喚したターン/);

  const old = put(state, P, 'twin_mercenary', 1, { summonedTurn: -1 });
  changePosition(state, P, 1);
  assert.equal(old.position, 'defense');
  assert.throws(() => changePosition(state, P, 1), /すでに/);
});

test('spell: thunder bolt destroys a monster and goes to the graveyard', () => {
  const { state } = freshDuel();
  const spell = give(state, P, 'thunder_bolt');
  put(state, A, 'aurora_dragon', 0);
  activateSpell(state, P, spell.uid, 0);
  assert.equal(state.players[A].monsters[0], null);
  assert.equal(state.players[P].graveyard[0].def.name, '破壊の雷撃');
});

test('spell: heal, draw and ATK buff', () => {
  const { state } = freshDuel();
  state.players[P].lp = 5000;
  const heal = give(state, P, 'holy_light');
  activateSpell(state, P, heal.uid);
  assert.equal(state.players[P].lp, 6500);

  const draw = give(state, P, 'greed_pot');
  const before = state.players[P].hand.length;
  activateSpell(state, P, draw.uid);
  // Greed Pot itself left the hand (-1) and two cards were drawn (+2)
  assert.equal(state.players[P].hand.length, before + 1);
  assert.equal(state.players[P].deck.length, 0);

  const buff = give(state, P, 'warrior_awaken');
  const knight = put(state, P, 'storm_knight', 0);
  activateSpell(state, P, buff.uid, 0);
  assert.equal(atkOf(knight), 2500);
  assert.equal(defOf(knight), 1200);
});

test('spell: mana spring costs 1000 LP and cannot be paid below the threshold', () => {
  const { state } = freshDuel();
  const spell = give(state, P, 'mana_spring');
  activateSpell(state, P, spell.uid);
  assert.equal(state.players[P].lp, 7000);

  state.players[P].lp = 900;
  const poor = give(state, P, 'mana_spring');
  assert.throws(() => activateSpell(state, P, poor.uid), /ライフ/);
});

test('pitfall trap destroys a summoned monster with 1500+ ATK', () => {
  const { state } = freshDuel();
  putTrap(state, A, 'pitfall', 0, 0);
  const card = give(state, P, 'storm_knight');
  const res = summonMonster(state, P, card.uid, 0);
  assert.ok(res.pending);
  assert.equal(res.pending.kind, 'summonTrap');
  const resolved = resolveSummonTrap(state, res.pending.trapUid);
  assert.equal(state.players[P].monsters[0], null);
  assert.equal(state.players[P].graveyard[0].def.name, '疾風の騎士');
  assert.ok(resolved.events.some(e => e.type === 'trap'));
});

test('set traps cannot activate on the turn they are set', () => {
  const { state } = freshDuel();
  putTrap(state, A, 'pitfall', 0, 1);
  const card = give(state, P, 'storm_knight');
  const res = summonMonster(state, P, card.uid, 0);
  assert.equal(res.pending, null);
});

test('holy barrier destroys every attack position attacker', () => {
  const { state } = freshDuel();
  state.phase = 'battle';
  put(state, P, 'storm_knight', 0);
  put(state, P, 'twin_mercenary', 1);
  putTrap(state, A, 'holy_barrier', 0, 0);
  const res = declareAttack(state, P, 0, null);
  // Declaration is intercepted by the trap window.
  assert.ok(res.pending);
  assert.equal(res.pending.options.length, 1);
  const uid = res.pending.options[0].uid;
  resolveAttack(state, uid);
  assert.equal(state.players[P].monsters[0], null);
  assert.equal(state.players[P].monsters[1], null);
});

test('magic cylinder only responds to direct attacks and reflects damage', () => {
  const { state } = freshDuel();
  state.phase = 'battle';
  put(state, P, 'storm_knight', 0);
  putTrap(state, A, 'magic_cylinder', 0, 0);

  const direct = declareAttack(state, P, 0, null);
  assert.ok(direct.pending);
  resolveAttack(state, direct.pending.options[0].uid);
  assert.equal(state.players[P].lp, 6200); // reflected 1800
  assert.equal(state.players[A].lp, 8000);

  // With a monster on the defending field, cylinder is not offered.
  state.phase = 'battle';
  state.turn = 3;
  put(state, P, 'storm_knight', 0);
  putTrap(state, A, 'magic_cylinder', 0, 0);
  put(state, A, 'iron_guardian', 0, { position: 'defense' });
  const targeted = declareAttack(state, P, 0, 0);
  assert.equal(targeted.pending, null);
});

test('peaceful envoy negates an attack without damage', () => {
  const { state } = freshDuel();
  state.phase = 'battle';
  put(state, P, 'storm_knight', 0);
  putTrap(state, A, 'peaceful_envoy', 0, 0);
  const res = declareAttack(state, P, 0, null);
  resolveAttack(state, res.pending.options[0].uid);
  assert.equal(state.players[A].lp, 8000);
  assert.equal(state.players[P].lp, 8000);
  assert.ok(state.players[P].monsters[0]);
});

test('ending the turn switches player and draws a card', () => {
  const { state } = freshDuel();
  const before = state.players[A].hand.length;
  const res = endTurn(state);
  assert.equal(state.active, A);
  assert.equal(state.turn, 2);
  assert.equal(state.players[A].hand.length, before + 1);
  assert.ok(res.events.some(e => e.type === 'turn'));
});

test('decking out loses the duel', () => {
  const { state } = freshDuel();
  state.players[P].deck = [];
  endTurn(state); // turn 2: AI draws normally
  const res = endTurn(state); // turn 3: human must draw from an empty deck
  assert.equal(state.winner, A);
  assert.ok(state.log.some(entry => entry.text.includes('デッキ切れ')));
  assert.ok(res.events.some(e => e.type === 'win'));
});

test('reducing LP to zero sets the winner', () => {
  const { state } = freshDuel();
  state.phase = 'battle';
  const dragon = put(state, P, 'aurora_dragon', 0);
  state.players[A].lp = 2000;
  declareAttack(state, P, 0, null);
  assert.equal(state.players[A].lp, 0);
  assert.equal(state.winner, P);
  assert.equal(state.phase, 'over');
});

test('a direct attack is illegal while the defender controls a monster', () => {
  const { state } = freshDuel();
  state.phase = 'battle';
  put(state, P, 'storm_knight', 0);
  put(state, A, 'dark_knight', 0);
  assert.throws(() => declareAttack(state, P, 0, null), /直接攻撃/);
});

test('bounce spell returns the target to its owner hand', () => {
  const { state } = freshDuel();
  const spell = give(state, P, 'dimension_gate');
  const target = put(state, A, 'aurora_dragon', 0);
  activateSpell(state, P, spell.uid, 0);
  assert.equal(state.players[A].monsters[0], null);
  assert.ok(state.players[A].hand.some(c => c.uid === target.uid));
});

test('destroy set spell removes a face-down trap', () => {
  const { state } = freshDuel();
  const spell = give(state, P, 'seal_wind');
  putTrap(state, A, 'holy_barrier', 0);
  activateSpell(state, P, spell.uid, 0);
  assert.equal(state.players[A].spells[0], null);
  assert.equal(state.players[A].graveyard[0].def.name, '聖光の結界');
});
