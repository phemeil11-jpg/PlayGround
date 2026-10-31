/* POLARIS — the Arctic Echo. A compact, legible opponent AI. */

import { CARD_DEFS, cardDef, tributeCount } from './cards.js';
import { atkOf, defOf, emptyZone } from './engine.js';

const isFaceUp = (c) => c && !c.faceDown;

function estimateDef(card) {
  if (!card) return 0;
  if (card.hidden) return 1400;
  if (card.faceDown) return 1400;
  return defOf(card);
}

function bestMonsterInHand(hand) {
  const monsters = hand.filter((c) => cardDef(c).type === 'monster');
  const low = monsters.filter((c) => tributeCount(c) === 0).sort((a, b) => cardDef(b).atk - cardDef(a).atk);
  if (low.length) return { card: low[0], tribute: 0 };
  const high = monsters
    .filter((c) => tributeCount(c) > 0)
    .sort((a, b) => cardDef(b).atk - cardDef(a).atk);
  return high.length ? { card: high[0], tribute: tributeCount(high[0]) } : null;
}

function findInHand(state, predicate) {
  return state.players[1].hand.find((c) => predicate(cardDef(c))) || null;
}

function spellTargetForDestroy(state) {
  const enemy = state.players[0].monsters;
  let best = null;
  for (let z = 0; z < enemy.length; z++) {
    const c = enemy[z];
    if (!c) continue;
    const score = (c.hidden ? 1600 : atkOf(c)) + (c.position === 'def' ? 200 : 0);
    if (!best || score > best.score) best = { z, score };
  }
  return best;
}

function strongestOwn(state) {
  const own = state.players[1].monsters;
  let best = null;
  for (let z = 0; z < own.length; z++) {
    const c = own[z];
    if (!isFaceUp(c)) continue;
    if (!best || atkOf(c) > atkOf(own[best])) best = z;
  }
  return best;
}

function attackScore(state, attacker, target) {
  if (!target) return 0;
  const myAtk = atkOf(attacker);
  if (target.position === 'def' || target.faceDown || target.hidden) {
    const d = estimateDef(target);
    if (myAtk > d) return 60 + (cardDef(attacker).piercing ? myAtk - d : 0);
    return -80;
  }
  const t = atkOf(target);
  if (myAtk > t) return 100 + (myAtk - t);
  if (myAtk === t) return -30;
  return -(t - myAtk) - 60;
}

export function chooseAIAction(state, memory = {}) {
  const ai = state.players[1];
  const enemy = state.players[0];
  if (state.over || state.active !== 1) return null;

  if (!ai.hasSummoned) {
    const pick = bestMonsterInHand(ai.hand);
    if (pick) {
      const ownCount = ai.monsters.filter(Boolean).length;
      if (pick.tribute <= ownCount) {
        const zone = emptyZone(ai.monsters);
        const freeAfterTribute = zone >= 0 || ownCount >= pick.tribute;
        if (freeAfterTribute) {
          return { type: 'summon', uid: pick.card.uid, zone: zone >= 0 ? zone : 0 };
        }
      }
    }
  }

  if ((memory.spells || 0) < 2 && ai.backRowLocked !== true) {
    const burst = findInHand(state, (d) => d.spell === 'destroy');
    const target = spellTargetForDestroy(state);
    if (burst && target && target.score >= 1200) {
      return { type: 'activateSpell', uid: burst.uid, target: { p: 0, z: target.z } };
    }

    const supply = findInHand(state, (d) => d.spell === 'heal');
    if (supply && ai.lp <= 6200) return { type: 'activateSpell', uid: supply.uid };

    const gaze = findInHand(state, (d) => d.spell === 'draw');
    if (gaze && ai.hand.length <= 4 && ai.deck.length > 2) return { type: 'activateSpell', uid: gaze.uid };

    const bless = findInHand(state, (d) => d.spell === 'equip');
    const targetOwn = strongestOwn(state);
    if (bless && targetOwn !== null && emptyZone(ai.spells) >= 0) {
      return { type: 'activateSpell', uid: bless.uid, target: { p: 1, z: targetOwn } };
    }

    const bind = findInHand(state, (d) => d.spell === 'bind');
    const strongEnemy = enemy.monsters
      .map((c, z) => ({ c, z }))
      .filter((x) => x.c && isFaceUp(x.c) && atkOf(x.c) >= 1800)
      .sort((a, b) => atkOf(b.c) - atkOf(a.c))[0];
    if (bind && strongEnemy && targetOwn !== null && atkOf(ai.monsters[targetOwn]) < atkOf(strongEnemy.c)) {
      return { type: 'activateSpell', uid: bind.uid, target: { p: 0, z: strongEnemy.z } };
    }

    const thaw = findInHand(state, (d) => d.spell === 'revive');
    if (thaw && emptyZone(ai.monsters) >= 0 && ai.grave.some((c) => cardDef(c).type === 'monster')) {
      return { type: 'activateSpell', uid: thaw.uid };
    }
  }

  if ((memory.traps || 0) < 1) {
    const trap = ai.hand.find((c) => cardDef(c).type === 'trap');
    if (trap && emptyZone(ai.spells) >= 0) return { type: 'setTrap', uid: trap.uid };
  }

  const enemyMonsters = enemy.monsters.map((c, z) => ({ c, z })).filter((x) => x.c);
  const attackers = ai.monsters
    .map((c, z) => ({ c, z }))
    .filter((x) => isFaceUp(x.c) && x.c.position === 'atk' && !x.c.hasAttacked);

  if (enemyMonsters.length === 0) {
    const direct = attackers.find((x) => atkOf(x.c) > 0);
    if (direct) return { type: 'attack', zone: direct.z, target: null };
  } else {
    let best = null;
    for (const a of attackers) {
      for (const t of enemyMonsters) {
        const score = attackScore(state, a.c, t.c);
        if (!best || score > best.score) best = { score, a, t };
      }
    }
    if (best && best.score > 0) {
      return { type: 'attack', zone: best.a.z, target: { p: 0, z: best.t.z } };
    }
  }

  if (!ai.hasSummoned) {
    const onlyMalus = attackers.length === 0;
    const setPick = ai.hand
      .filter((c) => cardDef(c).type === 'monster' && tributeCount(c) === 0)
      .sort((a, b) => defOf(a) - defOf(b))[0];
    if (setPick && onlyMalus) return { type: 'setMonster', uid: setPick.uid };
  }

  if (attackers.length === 0) return { type: 'endTurn' };
  return { type: 'endTurn' };
}

export function aiSummary(state) {
  const ai = state.players[1];
  const monsters = ai.monsters.filter(Boolean).length;
  return `${monsters} MON / ${ai.hand.length} HAND`;
}
