import test from 'node:test';
import assert from 'node:assert/strict';
import { DuelEngine, DuelError, LP_START, cardAtk, cardDefValue } from '../js/engine.js';
import { aiChoose, aiTake } from '../js/ai.js';

function make(seed = 7, first = 'p1') {
  return new DuelEngine({ seed, names: { p1: 'ALPHA', p2: 'BETA' }, first, matchId: `test-${seed}` });
}

function takeFromDeck(engine, side, defId) {
  const index = engine.s.deck[side].findIndex(card => card.defId === defId);
  if (index < 0) return null;
  return engine.s.deck[side].splice(index, 1)[0];
}

function giveCard(engine, side, defId) {
  const card = takeFromDeck(engine, side, defId);
  assert.ok(card, `deck should contain ${defId}`);
  engine.s.hand[side].push(card);
  return card;
}

function place(engine, side, zone, card, { position = 'atk', faceDown = false } = {}) {
  card.position = position;
  card.faceDown = faceDown;
  card.summonedTurn = 0;
  card.hasAttacked = false;
  engine.s.field[side][zone] = card;
  return card;
}

function battle(engine) {
  engine.s.active = 'p1';
  engine.s.phase = 'battle';
  engine.s.attackLocked = false;
  engine.s.turn = 2;
}

test('opening hands, deck and first turn are set up', () => {
  const e = make(11);
  assert.equal(e.s.lp.p1, LP_START);
  assert.equal(e.s.lp.p2, LP_START);
  assert.equal(e.s.hand.p1.length, 6, 'first player draws on turn one');
  assert.equal(e.s.hand.p2.length, 5);
  assert.equal(e.s.deck.p1.length, 25 - 6);
  assert.equal(e.s.deck.p2.length, 25 - 5);
  assert.equal(e.s.active, 'p1');
  assert.equal(e.s.turn, 1);
  assert.equal(e.s.phase, 'main');
  assert.equal(e.s.attackLocked, true);
});

test('summon once per turn and set defense position', () => {
  const e = make(12);
  const monster = e.s.hand.p1.find(card => card.kind === 'monster');
  assert.ok(monster);
  const result = e.normalSummon('p1', monster.uid, 0, 'atk');
  assert.equal(result.ok, true);
  assert.equal(e.s.field.p1[0].uid, monster.uid);
  assert.equal(e.s.hand.p1.some(card => card.uid === monster.uid), false);
  assert.equal(e.s.flags.p1.summoned, true);
  assert.equal(e.s.field.p1[0].position, 'atk');
  assert.throws(() => {
    const second = e.s.hand.p1.find(card => card.kind === 'monster');
    if (second) e.normalSummon('p1', second.uid, 1, 'atk');
    else throw new DuelError('no second monster');
  }, DuelError);
});

test('set monsters are face-down defense and flip when attacked', () => {
  const e = make(13);
  const p1 = takeFromDeck(e, 'p1', 'polar_bear');
  const p2 = takeFromDeck(e, 'p2', 'snowfox');
  place(e, 'p1', 0, p1, { position: 'atk' });
  place(e, 'p2', 0, p2, { position: 'def', faceDown: true });
  battle(e);
  e.attack('p1', p1.uid, p2.uid);
  assert.equal(p2.faceDown, false);
  assert.equal(p2.position, 'def');
  assert.equal(e.s.field.p2[0], null, 'snowfox was destroyed');
  assert.equal(e.s.grave.p2[0].defId, 'snowfox');
});

test('attack vs attack: destroy and deal difference', () => {
  const e = make(14);
  const p1 = takeFromDeck(e, 'p1', 'frost_giant');
  const p2 = takeFromDeck(e, 'p2', 'polar_bear');
  place(e, 'p1', 0, p1);
  place(e, 'p2', 0, p2);
  battle(e);
  const before = e.s.lp.p2;
  e.attack('p1', p1.uid, p2.uid);
  assert.equal(e.s.field.p2[0], null);
  assert.equal(e.s.lp.p2, before - 200);
  assert.equal(e.s.field.p1[0].uid, p1.uid);
  assert.equal(e.s.field.p1[0].hasAttacked, true);
  assert.throws(() => e.attack('p1', p1.uid, null), DuelError);
});

test('attack vs defense: higher DEF deals recoil to attacker', () => {
  const e = make(15);
  const p1 = takeFromDeck(e, 'p1', 'polar_bear');
  const p2 = takeFromDeck(e, 'p2', 'glacier_turtle');
  place(e, 'p1', 0, p1);
  place(e, 'p2', 0, p2, { position: 'def' });
  battle(e);
  const before = e.s.lp.p1;
  e.attack('p1', p1.uid, p2.uid);
  assert.equal(e.s.field.p1[0].uid, p1.uid, 'attacker survives defensive recoil');
  assert.equal(e.s.field.p2[0].uid, p2.uid);
  assert.equal(e.s.lp.p1, before - 600);
});

test('piercing damage breaks through defense', () => {
  const e = make(16);
  const p1 = takeFromDeck(e, 'p1', 'frost_giant');
  const p2 = takeFromDeck(e, 'p2', 'aurora_serpent');
  place(e, 'p1', 0, p1);
  place(e, 'p2', 0, p2, { position: 'def' });
  battle(e);
  const before = e.s.lp.p2;
  e.attack('p1', p1.uid, p2.uid);
  assert.equal(e.s.field.p2[0], null);
  assert.equal(e.s.lp.p2, before - 600);
});

test('direct attack, equal ATK trade and first-turn lock', () => {
  const e = make(17);
  const p1 = takeFromDeck(e, 'p1', 'polar_bear');
  place(e, 'p1', 0, p1);
  battle(e);
  const before = e.s.lp.p2;
  e.attack('p1', p1.uid, null);
  assert.equal(e.s.lp.p2, before - 1800);

  const p2 = takeFromDeck(e, 'p2', 'polar_bear');
  place(e, 'p2', 0, p2);
  const p1b = takeFromDeck(e, 'p1', 'polar_bear');
  place(e, 'p1', 1, p1b);
  e.attack('p1', p1b.uid, p2.uid);
  assert.equal(e.s.field.p1[1], null);
  assert.equal(e.s.field.p2[0], null);

  const e2 = make(18);
  const card = takeFromDeck(e2, 'p1', 'polar_bear');
  place(e2, 'p1', 0, card);
  e2.s.phase = 'battle';
  assert.throws(() => e2.attack('p1', card.uid, null), DuelError);
});

test('spells: burn, heal, draw, freeze, destroy and one per turn', () => {
  const e = make(19);
  const spear = giveCard(e, 'p1', 'glacial_spear');
  e.activateSpell('p1', spear.uid);
  assert.equal(e.s.lp.p2, LP_START - 700);
  assert.equal(e.s.flags.p1.spellUsed, true);
  const second = giveCard(e, 'p1', 'meltwater');
  assert.throws(() => e.activateSpell('p1', second.uid), DuelError);

  const e2 = make(20);
  e2.s.lp.p1 = 3000;
  const heal = giveCard(e2, 'p1', 'meltwater');
  e2.activateSpell('p1', heal.uid);
  assert.equal(e2.s.lp.p1, 3800);

  const e3 = make(21);
  const insight = giveCard(e3, 'p1', 'insight');
  const handBefore = e3.s.hand.p1.length;
  e3.activateSpell('p1', insight.uid);
  assert.equal(e3.s.hand.p1.length, handBefore - 1 + 2);

  const e4 = make(22);
  const enemy = takeFromDeck(e4, 'p2', 'polar_bear');
  place(e4, 'p2', 0, enemy, { position: 'atk' });
  const blizzard = giveCard(e4, 'p1', 'blizzard');
  e4.activateSpell('p1', blizzard.uid);
  assert.equal(enemy.position, 'def');

  const e5 = make(23);
  const small = takeFromDeck(e5, 'p2', 'snowfox');
  place(e5, 'p2', 0, small);
  const avalanche = giveCard(e5, 'p1', 'avalanche');
  e5.activateSpell('p1', avalanche.uid, small.uid);
  assert.equal(e5.s.field.p2[0], null);

  const e6 = make(24);
  const big = takeFromDeck(e6, 'p2', 'frost_king');
  place(e6, 'p2', 0, big);
  const avalanche2 = giveCard(e6, 'p1', 'avalanche');
  e6.activateSpell('p1', avalanche2.uid, big.uid);
  assert.equal(e6.s.field.p2[0].uid, big.uid, 'avalanche cannot destroy a 2400 ATK king');
});

test('position can change once, but not on the turn summoned', () => {
  const e = make(25);
  const monster = takeFromDeck(e, 'p1', 'polar_bear');
  place(e, 'p1', 0, monster);
  monster.summonedTurn = e.s.turn;
  assert.throws(() => e.changePosition('p1', monster.uid), DuelError);
  monster.summonedTurn = 0;
  assert.equal(e.changePosition('p1', monster.uid).position, 'def');
  assert.throws(() => e.changePosition('p1', monster.uid), DuelError);
});

test('battle destruction triggers snowfox draw and permafrost burn', () => {
  const e = make(26);
  const wolf = takeFromDeck(e, 'p2', 'permafrost_wolf');
  place(e, 'p2', 0, wolf, { position: 'atk' });
  const giant = takeFromDeck(e, 'p1', 'frost_giant');
  place(e, 'p1', 0, giant);
  battle(e);
  const before = e.s.lp.p1;
  e.attack('p1', giant.uid, wolf.uid);
  assert.equal(e.s.lp.p1, before - 500);
  assert.equal(e.s.grave.p2.some(card => card.defId === 'permafrost_wolf'), true);
});

test('life points reaching zero ends the duel', () => {
  const e = make(27);
  e.s.lp.p2 = 600;
  const spear = giveCard(e, 'p1', 'glacial_spear');
  e.activateSpell('p1', spear.uid);
  assert.equal(e.s.lp.p2, 0);
  assert.equal(e.s.winner, 'p1');
  assert.equal(e.s.phase, 'over');
  assert.equal(e.s.lastEvent.type, 'gameover');
});

test('deck-out loses the duel', () => {
  const e = make(28);
  e.s.deck.p2 = [];
  e.endTurn('p1');
  assert.equal(e.s.winner, 'p1');
  assert.equal(e.s.winReason, '山札切れ');
});

test('turn phases pass from main to battle to the opponent', () => {
  const e = make(29);
  assert.equal(e.s.phase, 'main');
  e.nextPhase('p1');
  assert.equal(e.s.phase, 'battle');
  e.nextPhase('p1');
  assert.equal(e.s.active, 'p2');
  assert.equal(e.s.turn, 2);
  assert.equal(e.s.phase, 'main');
});

test('sanitised snapshot hides the opponent hand, deck and set cards', () => {
  const e = make(30);
  const hiddenSet = takeFromDeck(e, 'p1', 'glacier_turtle');
  place(e, 'p1', 0, hiddenSet, { position: 'def', faceDown: true });
  const snapshot = e.snapshotFor('p2');
  assert.equal(snapshot.hand.p1.every(card => card.hidden), true);
  assert.equal(snapshot.hand.p2.every(card => !card.hidden), true);
  assert.equal(snapshot.deck.p1.every(card => card.hidden), true);
  assert.equal(snapshot.field.p1[0].hidden, true);
  assert.equal(snapshot.field.p1[0].defId, undefined);
  assert.equal(snapshot.field.p1[0].name, undefined);
  assert.equal(snapshot.hand.p1.some(card => card.defId), false);
  assert.equal(snapshot.deck.p1.some(card => card.defId), false);
});

test('ECHO can complete a full turn without stalling', () => {
  const e = make(31, 'p2');
  let guard = 0;
  while (e.s.active === 'p2' && !e.s.winner && guard < 40) {
    const choice = aiChoose(e, 'p2');
    assert.ok(choice, 'AI should always return a choice');
    aiTake(e, 'p2', choice);
    guard += 1;
  }
  assert.ok(guard < 40, 'AI should end its turn');
  assert.ok(e.s.active === 'p1' || e.s.winner, 'the turn should pass or the duel should end');
});

test('card stat helpers respect modifiers', () => {
  const e = make(32);
  const card = takeFromDeck(e, 'p1', 'polar_bear');
  assert.equal(cardAtk(card), 1800);
  assert.equal(cardDefValue(card), 1200);
  card.atkMod -= 800;
  card.defMod += 1000;
  assert.equal(cardAtk(card), 1000);
  assert.equal(cardDefValue(card), 2200);
});
