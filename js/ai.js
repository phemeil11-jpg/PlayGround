// Heuristic opponent AI. Decisions are made only from public information:
// the AI never inspects the human player's hand or face-down card identities.

import {
  atkOf, defOf, emptyMonsterZones, emptySpellZones, canAttack, hasMonsters
} from './engine.js';
import { tributeCount } from './cards.js';

const ZONE_ORDER = [2, 1, 3, 0, 4];

function value(card) {
  if (!card) return 0;
  if (card.def.kind !== 'monster') return 0;
  return atkOf(card) + defOf(card) * 0.45 + (card.def.level || 0) * 25;
}

function pickTributes(state, p, need) {
  const player = state.players[p];
  if (need === 0) return [];
  const owned = player.monsters
    .map((card, zone) => ({ card, zone }))
    .filter(entry => entry.card)
    .sort((a, b) => value(a.card) - value(b.card));
  if (owned.length < need) return null;
  return owned.slice(0, need).map(entry => entry.zone);
}

export function chooseSummon(state, p = 1) {
  const player = state.players[p];
  if (player.normalSummoned || state.phase !== 'main' || state.winner !== null) return null;
  const spaces = emptyMonsterZones(state, p);
  if (!spaces.length) return null;
  const zone = ZONE_ORDER.find(z => spaces.includes(z)) ?? spaces[0];
  const candidates = [];

  for (const card of player.hand) {
    if (card.def.kind !== 'monster') continue;
    const need = tributeCount(card.def.level);
    const tributes = pickTributes(state, p, need);
    if (tributes === null) continue;
    const tributeValue = tributes.reduce((sum, z) => sum + value(player.monsters[z]), 0);
    const net = value(card) - tributeValue;
    const position = defOf(card) > atkOf(card) + 250 ? 'defense' : 'attack';
    candidates.push({
      card, zone, tributes, position, need, net,
      score: value(card) - tributeValue + (need === 0 ? 140 : 0)
    });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (best.need > 0 && best.net <= 0) {
    const free = candidates.find(c => c.need === 0);
    if (free) return free;
  }
  return best;
}

function strongestHumanMonster(state) {
  const monsters = state.players[1 - 1] ? state.players[1].monsters : [];
  let best = null;
  monsters.forEach((card, zone) => {
    if (!card) return;
    const threat = card.faceDown ? 1500 : atkOf(card) + defOf(card) * 0.5;
    if (!best || threat > best.threat) best = { card, zone, threat };
  });
  return best;
}

function chooseSpellTarget(state, p, card) {
  const opponent = state.players[1 - p];
  const player = state.players[p];
  const effect = card.def.effect;
  if (effect === 'destroyMonster' || effect === 'bounce') {
    let best = null;
    opponent.monsters.forEach((monster, zone) => {
      if (!monster) return;
      const threat = monster.faceDown ? 1600 : atkOf(monster) + defOf(monster) * 0.6;
      if (!best || threat > best.threat) best = { zone, threat };
    });
    if (!best) return undefined;
    if (effect === 'destroyMonster' && best.threat < 2100) return undefined;
    if (effect === 'bounce' && best.threat < 2200) return undefined;
    return best.zone;
  }
  if (effect === 'buff') {
    let best = null;
    player.monsters.forEach((monster, zone) => {
      if (!monster || monster.faceDown || monster.position !== 'attack') return;
      if (!best || atkOf(monster) > best.atk) best = { zone, atk: atkOf(monster) };
    });
    return best ? best.zone : undefined;
  }
  if (effect === 'destroySet') {
    const zone = opponent.spells.findIndex(card => card && card.faceDown);
    return zone >= 0 ? zone : undefined;
  }
  return undefined;
}

export function chooseSpell(state, p = 1) {
  const player = state.players[p];
  if (state.phase !== 'main' || state.winner !== null) return null;
  const spells = player.hand.filter(card => card.def.kind === 'spell');
  if (!spells.length) return null;
  const find = effect => spells.find(card => card.def.effect === effect) || null;
  const deckLow = player.deck.length < 4;
  const activeMonsters = player.monsters.filter(card => card && !card.faceDown);
  const opponentSets = state.players[1 - p].spells.filter(Boolean).length;

  const tryCard = (card) => {
    const target = chooseSpellTarget(state, p, card);
    if ((card.def.effect === 'destroyMonster' || card.def.effect === 'bounce' || card.def.effect === 'buff' || card.def.effect === 'destroySet') && target === undefined) {
      return null;
    }
    return { handUid: card.uid, target: target === undefined ? null : target, effect: card.def.effect };
  };

  // 1. Greed when the hand is running low.
  const greed = find('draw2');
  if (greed && !deckLow && player.hand.length <= 6) {
    const action = tryCard(greed);
    if (action) return action;
  }
  // 2. Mana spring while healthy.
  const mana = find('draw2pay');
  if (mana && !deckLow && player.lp > 3500) {
    const action = tryCard(mana);
    if (action) return action;
  }
  // 3. Emergency healing.
  const heal = find('heal');
  if (heal && player.lp < 5200) {
    const action = tryCard(heal);
    if (action) return action;
  }
  // 4. Remove the biggest threat.
  const bolt = find('destroyMonster');
  if (bolt) {
    const action = tryCard(bolt);
    if (action) return action;
  }
  // 5. Bounce a large monster.
  const bounce = find('bounce');
  if (bounce) {
    const action = tryCard(bounce);
    if (action) return action;
  }
  // 6. Clear a set card before the battle phase.
  const seal = find('destroySet');
  if (seal && opponentSets > 0) {
    const action = tryCard(seal);
    if (action) return action;
  }
  // 7. Power up before attacking.
  const buff = find('buff');
  if (buff && activeMonsters.length) {
    const action = tryCard(buff);
    if (action) return action;
  }
  // 8. Use leftover draw / heal cards.
  if (greed && !deckLow) {
    const action = tryCard(greed);
    if (action) return action;
  }
  if (heal && player.lp < 7600) {
    const action = tryCard(heal);
    if (action) return action;
  }
  return null;
}

export function chooseSetTrap(state, p = 1) {
  const player = state.players[p];
  if (state.phase !== 'main' || state.winner !== null) return null;
  const spaces = emptySpellZones(state, p);
  if (!spaces.length) return null;
  const trap = player.hand.find(card => card.def.kind === 'trap');
  if (!trap) return null;
  const zone = ZONE_ORDER.find(z => spaces.includes(z)) ?? spaces[0];
  return { handUid: trap.uid, zone };
}

export function chooseAttack(state, p = 1) {
  const player = state.players[p];
  const opponent = state.players[1 - p];
  if (state.phase !== 'battle' || state.winner !== null) return null;
  const humanMonsters = opponent.monsters;
  const anyMonsters = humanMonsters.some(Boolean);
  let best = null;

  player.monsters.forEach((attacker, attackerZone) => {
    if (!attacker || !canAttack(state, p, attackerZone)) return;
    const myAtk = atkOf(attacker);

    if (!anyMonsters) {
      const directScore = 900 + myAtk - (opponent.lp <= myAtk ? 1800 : 0);
      if (!best || directScore > best.score) {
        best = { attackerZone, targetZone: null, score: directScore, direct: true };
      }
      return;
    }

    humanMonsters.forEach((target, targetZone) => {
      if (!target) return;
      let score = -9999;
      if (target.faceDown) {
        // Unknown DEF: only swing with a reasonably large monster.
        if (myAtk >= 1900) score = 200 + myAtk * 0.4;
        else if (myAtk >= 1500) score = -100;
      } else if (target.position === 'attack') {
        const dAtk = atkOf(target);
        const diff = myAtk - dAtk;
        if (diff > 0) {
          score = 700 + diff * 1.4 + dAtk * 0.5;
          if (opponent.lp <= diff) score += 2500;
        } else if (diff === 0) {
          score = -400;
        } else {
          score = -4000 + diff;
        }
      } else {
        const dDef = defOf(target);
        const diff = myAtk - dDef;
        if (diff > 0) {
          score = 500 + dDef * 0.5;
          if (dDef >= 2600) score += 400;
        } else if (diff === 0) {
          score = -120;
        } else {
          score = -2500 + diff;
        }
      }
      if (score > -9000 && (!best || score > best.score)) {
        best = { attackerZone, targetZone, score, direct: false };
      }
    });
  });

  if (!best || best.score <= 0) return null;
  return { attackerZone: best.attackerZone, targetZone: best.targetZone };
}

export function choosePositionChange(state, p = 1) {
  const player = state.players[p];
  if (state.phase !== 'main' || state.winner !== null) return null;
  for (let zone = 0; zone < player.monsters.length; zone++) {
    const card = player.monsters[zone];
    if (!card || card.faceDown) continue;
    if (card.summonedTurn === state.turn || card.positionChanged) continue;
    if (card.position === 'attack' && defOf(card) > atkOf(card) + 400) return { zone, position: 'defense' };
  }
  return null;
}

export function chooseTrapResponse(state, pending) {
  if (!pending) return null;
  if (pending.kind === 'summonTrap') {
    const monster = pending.monster;
    if (monster && atkOf(monster) >= 1600) return pending.trapUid;
    return null;
  }
  if (pending.kind !== 'attack') return null;
  const attacker = state.players[pending.player].monsters[pending.attackerZone];
  if (!attacker) return null;
  const attackerAtk = atkOf(attacker);
  const defender = state.players[pending.defender];
  const attackers = state.players[pending.player].monsters.filter(card => card && !card.faceDown && card.position === 'attack').length;
  const options = pending.options || [];
  const has = effect => options.find(option => option.effect === effect);

  const barrier = has('barrier');
  if (barrier) {
    const lethal = pending.targetZone === null && attackerAtk >= defender.lp;
    if (attackers >= 2 || lethal || attackerAtk >= 2800) return barrier.uid;
  }
  const cylinder = has('cylinder');
  if (cylinder && pending.targetZone === null) {
    if (attackerAtk >= 1500 || attackerAtk >= defender.lp) return cylinder.uid;
  }
  const peace = has('peace');
  if (peace) {
    if (pending.targetZone === null && (attackerAtk >= 1500 || attackerAtk >= defender.lp)) return peace.uid;
    if (attackerAtk >= 3000) return peace.uid;
  }
  return null;
}

export function chooseDiscard(state, p = 1) {
  // Reserved for future hand-limit rules.
  return null;
}
