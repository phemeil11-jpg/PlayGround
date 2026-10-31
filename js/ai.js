// ARCTIC DUEL — ECHO opponent heuristic.
// ECHO reads the ice: it evaluates favourable trades, lethal pushes and utility spells.

import { cardAtk, cardDefValue, ZONES } from './engine.js';

function zoneOf(state, side, uid) {
  return state.field[side].findIndex(card => card && card.uid === uid);
}

function strongest(cards, stat = cardAtk) {
  return cards.slice().sort((a, b) => stat(b) - stat(a))[0] || null;
}

function valueOf(card) {
  return Math.max(cardAtk(card), cardDefValue(card)) + (card.level || 0) * 40;
}

function outcome(engine, attacker, defender) {
  const state = engine.s;
  const atk = cardAtk(attacker);
  const result = { killDefender: false, killAttacker: false, toEnemy: 0, toSelf: 0 };
  if (defender.position === 'atk') {
    const defAtk = cardAtk(defender);
    if (atk > defAtk) { result.killDefender = true; result.toEnemy = atk - defAtk; }
    else if (atk < defAtk) { result.killAttacker = true; result.toSelf = defAtk - atk; }
    else { result.killDefender = true; result.killAttacker = true; }
  } else {
    const def = cardDefValue(defender);
    if (atk > def) {
      result.killDefender = true;
      if (attacker.effect === 'pierce') result.toEnemy = atk - def;
    } else if (atk < def) {
      result.toSelf = def - atk;
    }
  }
  if (result.killDefender && defender.effect === 'first_shield' && !defender.shieldUsed) result.killDefender = false;
  if (result.killDefender && defender.battleImmuneTurn === state.turn) result.killDefender = false;
  if (result.killAttacker && attacker.effect === 'first_shield' && !attacker.shieldUsed) result.killAttacker = false;
  if (result.killAttacker && attacker.battleImmuneTurn === state.turn) result.killAttacker = false;
  return result;
}

function chooseSpell(engine, side, moves) {
  const state = engine.s;
  const enemy = side === 'p1' ? 'p2' : 'p1';
  const enemyLp = state.lp[enemy];
  const myLp = state.lp[side];
  const enemies = [];
  state.field[enemy].forEach((card, zone) => { if (card) enemies.push({ card, zone }); });
  const own = [];
  state.field[side].forEach((card, zone) => { if (card) own.push({ card, zone }); });
  const has = effect => moves.spells.find(card => card.effect === effect);

  const spear = has('burn_700');
  if (spear && enemyLp <= 700) return { type: 'spell', handUid: spear.uid, targetUid: null, reason: 'lethal' };

  const heal = has('heal_800');
  if (heal && myLp <= Math.max(1200, enemyLp - 700)) return { type: 'spell', handUid: heal.uid, targetUid: null, reason: 'heal' };

  const avalanche = has('destroy_small');
  if (avalanche) {
    const candidates = enemies.filter(({ card }) => !card.faceDown && cardAtk(card) <= 1800)
      .sort((a, b) => cardAtk(b.card) - cardAtk(a.card));
    if (candidates[0] && cardAtk(candidates[0].card) >= 1400) {
      return { type: 'spell', handUid: avalanche.uid, targetUid: candidates[0].card.uid, reason: 'remove' };
    }
  }

  const frostbite = has('enemy_atk_down');
  if (frostbite) {
    const target = strongest(enemies.filter(({ card }) => !card.faceDown && card.position === 'atk').map(({ card }) => card), cardAtk);
    if (target && cardAtk(target) >= 1800) {
      return { type: 'spell', handUid: frostbite.uid, targetUid: target.uid, reason: 'weaken' };
    }
  }

  const blizzard = has('enemy_to_def');
  if (blizzard) {
    const atkEnemies = enemies.filter(({ card }) => !card.faceDown && card.position === 'atk' && cardAtk(card) >= 1500);
    if (atkEnemies.length >= 2) return { type: 'spell', handUid: blizzard.uid, targetUid: null, reason: 'freeze' };
  }

  const insight = has('draw_2');
  if (insight && state.hand[side].length <= 3 && state.deck[side].length >= 2) {
    return { type: 'spell', handUid: insight.uid, targetUid: null, reason: 'draw' };
  }

  const armor = has('battle_immune');
  if (armor && own.length) {
    const mine = strongest(own.map(({ card }) => card), card => cardAtk(card) + cardDefValue(card));
    const threat = strongest(enemies.map(({ card }) => card), cardAtk);
    if (threat && cardAtk(threat) >= Math.max(cardAtk(mine), cardDefValue(mine))) {
      return { type: 'spell', handUid: armor.uid, targetUid: mine.uid, reason: 'protect' };
    }
  }

  const veil = has('own_def_up');
  if (veil && own.length) {
    const mine = strongest(own.map(({ card }) => card), cardDefValue);
    const threat = strongest(enemies.map(({ card }) => card), cardAtk);
    if (threat && cardAtk(threat) >= cardDefValue(mine) && cardAtk(threat) < cardDefValue(mine) + 1000) {
      return { type: 'spell', handUid: veil.uid, targetUid: mine.uid, reason: 'wall' };
    }
  }

  if (spear && enemyLp <= 1100) return { type: 'spell', handUid: spear.uid, targetUid: null, reason: 'pressure' };
  return null;
}

function chooseMonster(engine, side, moves) {
  const state = engine.s;
  if (!moves.canSummon || !moves.monsters.length) return null;
  const ownCount = state.field[side].filter(Boolean).length;
  const enemy = side === 'p1' ? 'p2' : 'p1';
  const enemyThreat = strongest(state.field[enemy].filter(Boolean), cardAtk);

  const ranked = moves.monsters.slice().sort((a, b) => {
    const aWall = enemyThreat && cardAtk(enemyThreat) > Math.max(cardAtk(a), cardDefValue(a)) ? 1 : 0;
    const bWall = enemyThreat && cardAtk(enemyThreat) > Math.max(cardAtk(b), cardDefValue(b)) ? 1 : 0;
    const aScore = cardAtk(a) + cardDefValue(a) * (ownCount === 0 ? 0.45 : 0.7) + aWall * 200;
    const bScore = cardAtk(b) + cardDefValue(b) * (ownCount === 0 ? 0.45 : 0.7) + bWall * 200;
    return bScore - aScore;
  });
  const card = ranked[0];
  if (!card) return null;
  const position = cardAtk(card) >= cardDefValue(card) ? 'atk' : 'def';
  const zone = moves.emptyZones[0];
  if (zone === undefined) return null;
  return { type: 'summon', handUid: card.uid, zone, position };
}

function chooseAttack(engine, side) {
  const state = engine.s;
  if (state.attackLocked) return null;
  const enemy = side === 'p1' ? 'p2' : 'p1';
  const attackers = [];
  state.field[side].forEach((card, zone) => {
    if (card && !card.faceDown && card.position === 'atk' && !card.hasAttacked) attackers.push({ card, zone });
  });
  const defenders = [];
  state.field[enemy].forEach((card, zone) => { if (card) defenders.push({ card, zone }); });
  if (!attackers.length) return null;
  if (!defenders.length) {
    const best = attackers.sort((a, b) => cardAtk(b.card) - cardAtk(a.card))[0];
    return { type: 'attack', attackerUid: best.card.uid, targetUid: null, direct: true };
  }

  let best = null;
  for (const attacker of attackers) {
    for (const defender of defenders) {
      const result = outcome(engine, attacker.card, defender.card);
      const lethal = result.toEnemy >= state.lp[enemy];
      const suicide = result.toSelf >= state.lp[side];
      let score = result.toEnemy * 0.7 - result.toSelf * 0.85;
      if (result.killDefender) score += valueOf(defender.card) + 350;
      if (result.killAttacker) score -= valueOf(attacker.card) + 450;
      if (lethal) score += 9000;
      if (suicide) score -= 9000;
      if (defender.card.faceDown) score -= 120;
      if (result.toSelf > 0 && result.toEnemy === 0 && !result.killDefender) score -= 200;
      if (!best || score > best.score) {
        best = {
          score,
          type: 'attack',
          attackerUid: attacker.card.uid,
          targetUid: defender.card.uid,
          direct: false,
        };
      }
    }
  }
  if (best && best.score > 0) return best;
  return null;
}

export function aiChoose(engine, side) {
  const state = engine.s;
  if (state.winner || state.active !== side) return { type: 'none' };
  const moves = engine.legalMoves(side);
  if (state.phase === 'main') {
    const spell = chooseSpell(engine, side, moves);
    if (spell) return spell;
    const summon = chooseMonster(engine, side, moves);
    if (summon) return summon;
    return { type: 'next' };
  }
  if (state.phase === 'battle') {
    const attack = chooseAttack(engine, side);
    if (attack) return attack;
    return { type: 'end' };
  }
  return { type: 'end' };
}

export function aiTake(engine, side, choice) {
  switch (choice.type) {
    case 'summon': return engine.normalSummon(side, choice.handUid, choice.zone, choice.position);
    case 'spell': return engine.activateSpell(side, choice.handUid, choice.targetUid);
    case 'attack': return engine.attack(side, choice.attackerUid, choice.targetUid);
    case 'next': return engine.nextPhase(side);
    case 'end': return engine.endTurn(side);
    default: return { ok: false };
  }
}

export { zoneOf };
