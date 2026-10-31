/* Hologram opponent — a compact but competent heuristics engine. */

import { CARDS, tributeCost } from './data.js';
import { effectiveAtk } from './engine.js';

function sum(list, fn) {
  return list.reduce((total, item) => total + fn(item), 0);
}

function ownMonsters(state, player) {
  return state.players[player].field
    .map((card, zone) => ({ card, zone }))
    .filter(entry => entry.card);
}

function enemyMonsters(state, player) {
  return ownMonsters(state, 1 - player);
}

function findHand(state, player, effect) {
  return state.players[player].hand.find(card => card.kind === 'tactic' && card.effect === effect) || null;
}

function canSummon(state, player, card) {
  const p = state.players[player];
  const free = p.field.some(zone => !zone);
  return free && p.field.filter(Boolean).length >= tributeCost(card);
}

function bestMonster(state, player) {
  return ownMonsters(state, player)
    .map(entry => ({ ...entry, atk: effectiveAtk(entry.card) }))
    .sort((a, b) => b.atk - a.atk)[0] || null;
}

function tacticAction(state, player) {
  const p = state.players[player];
  const foe = 1 - player;
  const fp = state.players[foe];
  const enemies = enemyMonsters(state, player);
  const own = ownMonsters(state, player);
  if (p.usedTactic) return null;

  const meteor = findHand(state, player, 'meteor');
  if (meteor && fp.lp <= 800) return { type: 'activate', player, uid: meteor.uid };

  const spike = findHand(state, player, 'spike');
  if (spike && fp.lp <= 500) return { type: 'activate', player, uid: spike.uid };

  const heal = findHand(state, player, 'heal');
  if (heal && p.lp <= 1400) return { type: 'activate', player, uid: heal.uid };

  const judgment = findHand(state, player, 'judgment');
  if (judgment && enemies.length) {
    const biggest = enemies.map(e => ({ ...e, atk: effectiveAtk(e.card) })).sort((a, b) => b.atk - a.atk)[0];
    const mine = bestMonster(state, player);
    if (!mine || biggest.atk >= mine.atk + 400) return { type: 'activate', player, uid: judgment.uid };
  }

  const wall = findHand(state, player, 'wall');
  if (wall && enemies.length && p.lp <= 2400) return { type: 'activate', player, uid: wall.uid };

  const freeze = findHand(state, player, 'freeze');
  if (freeze && enemies.length) {
    const target = enemies
      .map(e => ({ ...e, atk: e.card.mode === 'attack' ? effectiveAtk(e.card) : 0 }))
      .sort((a, b) => b.atk - a.atk)[0];
    if (target && target.atk >= 1500) return { type: 'activate', player, uid: freeze.uid, targetZone: target.zone };
  }

  const boost = findHand(state, player, 'boost');
  if (boost && own.length && state.phase === 'main' && state.turn > 1) {
    const target = bestMonster(state, player);
    const victim = enemies
      .map(e => ({ ...e, def: e.card.mode === 'defense' || e.card.faceDown ? e.card.def : effectiveAtk(e.card) }))
      .sort((a, b) => a.def - b.def)[0];
    if (target && target.card.mode === 'attack' && victim && target.atk + 1000 > victim.def && target.atk <= victim.def) {
      return { type: 'activate', player, uid: boost.uid, targetZone: target.zone };
    }
  }

  const draw2 = findHand(state, player, 'draw2');
  if (draw2 && p.hand.length <= 4) return { type: 'activate', player, uid: draw2.uid };

  return null;
}

function summonAction(state, player) {
  const p = state.players[player];
  if (p.hasSummoned) return null;
  if (!p.field.some(zone => !zone)) return null;
  const candidates = p.hand
    .filter(card => card.kind === 'monster' && canSummon(state, player, card))
    .sort((a, b) => effectiveAtk(b) - effectiveAtk(a));
  if (!candidates.length) return null;
  const card = candidates[0];
  const freeZones = p.field.map((zone, index) => (zone ? null : index)).filter(index => index !== null);
  const zone = freeZones.includes(1) ? 1 : freeZones[0];
  const enemies = enemyMonsters(state, player);
  const dangerous = enemies.some(e => (e.card.mode === 'attack' ? effectiveAtk(e.card) : e.card.def) > effectiveAtk(card));
  const mode = card.level <= 2 || (dangerous && effectiveAtk(card) < 1200) ? 'defense' : 'attack';
  return { type: 'summon', player, uid: card.uid, zone, mode };
}

function attackAction(state, player) {
  const own = ownMonsters(state, player).filter(entry => entry.card.mode === 'attack' && !entry.card.faceDown && !entry.card.hasAttacked && !entry.card.frozen);
  if (!own.length) return null;
  const foe = 1 - player;
  const enemy = enemyMonsters(state, player);
  const fp = state.players[foe];

  const attackers = own
    .map(entry => ({ ...entry, atk: effectiveAtk(entry.card) }))
    .sort((a, b) => b.atk - a.atk);

  if (!enemy.length) {
    return { type: 'attack', player, zone: attackers[0].zone, targetZone: null };
  }

  let best = null;
  for (const attacker of attackers) {
    for (const target of enemy) {
      const targetAtk = target.card.mode === 'defense' || target.card.faceDown ? target.card.def : effectiveAtk(target.card);
      const targetMode = target.card.mode === 'defense' || target.card.faceDown ? 'defense' : 'attack';
      let score = 0;
      let damage = 0;
      if (targetMode === 'attack') {
        if (attacker.atk > targetAtk) {
          damage = attacker.atk - targetAtk;
          score = 60 + damage + effectiveAtk(target.card) * 0.35;
          if (damage >= fp.lp) score += 1000;
        } else if (attacker.atk < targetAtk) {
          score = -70 - (targetAtk - attacker.atk) - attacker.atk * 0.25;
        } else {
          score = targetAtk >= attacker.atk ? 16 : -20;
        }
      } else if (attacker.atk > targetAtk) {
        score = 32 + targetAtk * 0.2;
      } else if (attacker.atk < targetAtk) {
        score = -45 - (targetAtk - attacker.atk) * 0.5;
      } else {
        score = 2;
      }
      if (!best || score > best.score) best = { score, attacker, target, damage };
    }
  }
  if (best && best.score > 0) {
    return { type: 'attack', player, zone: best.attacker.zone, targetZone: best.target.zone };
  }
  return null;
}

export function aiThink(state, player = 1) {
  if (!state || state.winner !== null) return null;
  if (state.active !== player) return null;

  if (state.phase === 'main') {
    const tactic = tacticAction(state, player);
    if (tactic) return tactic;
    const summon = summonAction(state, player);
    if (summon) return summon;
    if (state.turn > 1 && ownMonsters(state, player).some(e => e.card.mode === 'attack')) {
      return { type: 'battle', player };
    }
    return { type: 'end', player };
  }

  if (state.phase === 'battle') {
    const attack = attackAction(state, player);
    if (attack) return attack;
    return { type: 'end', player };
  }

  return null;
}

export function aiLine(card) {
  if (!card) return '';
  const def = CARDS[card.id] || card;
  return def.name;
}
