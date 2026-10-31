// ARCTIC DUEL — deterministic duel engine.
// The host runs the authoritative copy; guests send intents and render snapshots.

import { cardDef, DECK_RECIPE } from './cards.js';

export const LP_START = 4000;
export const ZONES = 4;
export const HAND_START = 5;
export const PHASE_LABEL = { main: 'MAIN', battle: 'BATTLE', end: 'END', over: 'OVER' };

let instanceCounter = 0;

export class DuelError extends Error {}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeInstance(defId, owner) {
  const def = cardDef(defId);
  instanceCounter += 1;
  return {
    uid: `${owner}-${instanceCounter}`,
    defId,
    owner,
    name: def.name,
    jp: def.jp,
    kind: def.kind,
    element: def.element,
    level: def.level || 0,
    baseAtk: def.atk || 0,
    baseDef: def.def || 0,
    effect: def.effect || null,
    text: def.text || '',
    target: def.target || null,
    atkMod: 0,
    defMod: 0,
    position: 'atk',
    faceDown: false,
    summonedTurn: 0,
    hasAttacked: false,
    changedPosition: false,
    shieldUsed: false,
    battleImmuneTurn: -1,
  };
}

export function cardAtk(card) {
  if (!card) return 0;
  return Math.max(0, (card.baseAtk || 0) + (card.atkMod || 0));
}

export function cardDefValue(card) {
  if (!card) return 0;
  return Math.max(0, (card.baseDef || 0) + (card.defMod || 0));
}

function shuffle(cards, rng) {
  const out = cards.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hideCard(card) {
  return {
    uid: card.uid,
    owner: card.owner,
    hidden: true,
    kind: 'hidden',
    position: card.position,
    faceDown: card.faceDown,
  };
}

export class DuelEngine {
  constructor({ seed = Date.now(), names = {}, first = 'p1', matchId = null } = {}) {
    this.rng = mulberry32(seed);
    this.state = {
      version: 2,
      matchId: matchId || `duel-${seed}`,
      seq: 0,
      turn: 0,
      active: first,
      first,
      phase: 'main',
      lp: { p1: LP_START, p2: LP_START },
      deck: { p1: [], p2: [] },
      hand: { p1: [], p2: [] },
      field: { p1: Array(ZONES).fill(null), p2: Array(ZONES).fill(null) },
      grave: { p1: [], p2: [] },
      names: { p1: names.p1 || 'DUELIST', p2: names.p2 || 'ECHO' },
      flags: {
        p1: { summoned: false, spellUsed: false, positionChanged: [] },
        p2: { summoned: false, spellUsed: false, positionChanged: [] },
      },
      attackLocked: true,
      winner: null,
      winReason: '',
      log: [],
      lastEvent: null,
    };
    // Keep the RNG out of snapshots but allow deterministic continuation.
    Object.defineProperty(this, 'seed', { value: seed, enumerable: false });
    this.state._rngState = undefined;
    this.beginDuel(first);
  }

  get s() { return this.state; }

  beginDuel(first) {
    for (const side of ['p1', 'p2']) {
      this.s.deck[side] = shuffle(DECK_RECIPE.map(id => makeInstance(id, side)), this.rng);
      this.s.hand[side] = [];
      this.s.field[side] = Array(ZONES).fill(null);
      this.s.grave[side] = [];
      this.drawCards(side, HAND_START, { silent: true });
      // A single friendly mulligan when a hand contains no monsters.
      if (!this.s.hand[side].some(card => card.kind === 'monster')) {
        this.s.deck[side] = shuffle(this.s.deck[side].concat(this.s.hand[side]), this.rng);
        this.s.hand[side] = [];
        this.drawCards(side, HAND_START, { silent: true });
      }
    }
    this.beginTurn(first, { firstTurn: true });
  }

  beginTurn(side, { firstTurn = false } = {}) {
    if (this.s.winner) return;
    this.s.turn += 1;
    this.s.active = side;
    this.s.phase = 'main';
    this.s.attackLocked = this.s.turn === 1;
    this.s.flags[side] = { summoned: false, spellUsed: false, positionChanged: [] };
    for (const card of this.s.field[side]) {
      if (card) card.hasAttacked = false;
    }
    this.addLog(side, `TURN ${this.s.turn} — ${this.s.names[side]} のターン`);
    const drawn = this.drawCards(side, 1, { silent: true });
    if (!drawn.ok) {
      this.finish(side === 'p1' ? 'p2' : 'p1', '山札切れ');
      return;
    }
    this.event('turn', {
      side,
      turn: this.s.turn,
      firstTurn: Boolean(firstTurn),
      attackLocked: this.s.attackLocked,
    });
  }

  addLog(side, text) {
    this.s.log.push({ n: this.s.log.length + 1, turn: this.s.turn, side, text });
    if (this.s.log.length > 60) this.s.log.shift();
  }

  event(type, data = {}) {
    this.s.seq += 1;
    this.s.lastEvent = { seq: this.s.seq, type, ...data };
    return this.s.lastEvent;
  }

  assertActive(side) {
    if (this.s.winner) throw new DuelError('デュエルは終了しています。');
    if (this.s.active !== side) throw new DuelError('相手のターンです。');
  }

  drawCards(side, count, { silent = false } = {}) {
    for (let i = 0; i < count; i += 1) {
      const card = this.s.deck[side].shift();
      if (!card) {
        if (!silent) this.finish(side === 'p1' ? 'p2' : 'p1', '山札切れ');
        return { ok: false, drawn: i };
      }
      this.s.hand[side].push(card);
      if (!silent) this.addLog(side, `${this.s.names[side]} は1枚ドローした`);
    }
    return { ok: true, drawn: count };
  }

  finish(winner, reason) {
    if (this.s.winner) return;
    this.s.winner = winner;
    this.s.winReason = reason;
    this.s.phase = 'over';
    const text = winner === 'draw'
      ? 'デュエルは引き分けに終わった'
      : `${this.s.names[winner]} の勝利 — ${reason}`;
    this.addLog(winner === 'draw' ? 'p1' : winner, text);
    this.event('gameover', { winner, reason, text });
  }

  applyDamage(side, amount, source = 'battle') {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    const before = this.s.lp[side];
    this.s.lp[side] = Math.max(0, before - Math.round(amount));
    const dealt = before - this.s.lp[side];
    this.addLog(side, `${this.s.names[side]} は ${dealt} ダメージを受けた`);
    this.event('damage', { side, amount: dealt, source, lp: this.s.lp[side] });
    if (this.s.lp[side] <= 0) this.finish(side === 'p1' ? 'p2' : 'p1', 'ライフポイント0');
    return dealt;
  }

  heal(side, amount) {
    const before = this.s.lp[side];
    this.s.lp[side] = Math.min(9999, before + Math.round(amount));
    this.addLog(side, `${this.s.names[side]} は ${this.s.lp[side] - before} 回復した`);
    this.event('heal', { side, amount: this.s.lp[side] - before, lp: this.s.lp[side] });
  }

  destroyCard(side, zone, reason = 'effect') {
    const card = this.s.field[side][zone];
    if (!card) return null;
    this.s.field[side][zone] = null;
    this.s.grave[side].push(card);
    this.addLog(side, `${card.jp} は破壊された`);
    this.event('destroy', { side, zone, uid: card.uid, card: { name: card.name, jp: card.jp }, reason });
    this.triggerDestroy(side, card);
    return card;
  }

  triggerDestroy(side, card) {
    if (card.effect === 'destroy_draw') {
      this.addLog(side, `${card.jp} の効果で1枚ドロー`);
      this.drawCards(side, 1);
    }
    if (card.effect === 'destroy_burn') {
      this.addLog(side, `${card.jp} の効果で反撃の500ダメージ`);
      this.applyDamage(side === 'p1' ? 'p2' : 'p1', 500, 'effect');
    }
  }

  nextPhase(side) {
    this.assertActive(side);
    if (this.s.phase === 'main') {
      this.s.phase = 'battle';
      this.event('phase', { phase: 'battle', side });
      this.addLog(side, 'バトルフェイズ');
      return { ok: true, phase: 'battle' };
    }
    if (this.s.phase === 'battle') return this.endTurn(side);
    return { ok: true, phase: this.s.phase };
  }

  endTurn(side) {
    this.assertActive(side);
    if (this.s.winner) return { ok: true };
    this.addLog(side, `ターン終了`);
    this.s.phase = 'end';
    this.event('phase', { phase: 'end', side });
    this.beginTurn(side === 'p1' ? 'p2' : 'p1');
    return { ok: true, phase: this.s.phase };
  }

  requireMain(side) {
    this.assertActive(side);
    if (this.s.phase !== 'main') throw new DuelError('メインフェイズではありません。');
  }

  normalSummon(side, handUid, zone, position = 'atk') {
    this.requireMain(side);
    const flags = this.s.flags[side];
    if (flags.summoned) throw new DuelError('このターンの召喚はもう使いました。');
    if (!Number.isInteger(zone) || zone < 0 || zone >= ZONES) throw new DuelError('そのゾーンには置けません。');
    if (this.s.field[side][zone]) throw new DuelError('そのゾーンは埋まっています。');
    const index = this.s.hand[side].findIndex(card => card.uid === handUid);
    if (index < 0) throw new DuelError('そのカードは手札にありません。');
    const card = this.s.hand[side][index];
    if (card.kind !== 'monster') throw new DuelError('モンスター以外は召喚できません。');
    if (!['atk', 'def'].includes(position)) throw new DuelError('表示形式が不正です。');

    this.s.hand[side].splice(index, 1);
    card.position = position;
    card.faceDown = position === 'def';
    card.summonedTurn = this.s.turn;
    card.changedPosition = false;
    card.hasAttacked = false;
    this.s.field[side][zone] = card;
    flags.summoned = true;
    this.addLog(side, `${card.jp} を${position === 'atk' ? '攻撃表示' : '守備表示（セット）'}で召喚`);
    this.event('summon', {
      side, zone, uid: card.uid, position, faceDown: card.faceDown,
      card: { name: card.name, jp: card.jp, atk: cardAtk(card), def: cardDefValue(card), element: card.element },
    });
    this.resolveSummonEffect(side, card);
    return { ok: true, card };
  }

  resolveSummonEffect(side, card) {
    const opponent = side === 'p1' ? 'p2' : 'p1';
    if (card.effect === 'summon_draw') {
      this.addLog(side, `${card.jp} の効果で1枚ドロー`);
      this.drawCards(side, 1);
      this.event('effect', { effect: 'draw', side, uid: card.uid });
    }
    if (card.effect === 'summon_burn') {
      this.addLog(side, `${card.jp} の効果で300ダメージ`);
      this.event('effect', { effect: 'burn', side, uid: card.uid, amount: 300 });
      this.applyDamage(opponent, 300, 'effect');
    }
    if (card.effect === 'summon_chill') {
      let hit = 0;
      for (let z = 0; z < ZONES; z += 1) {
        const enemy = this.s.field[opponent][z];
        if (enemy && !enemy.faceDown && enemy.position === 'atk') {
          enemy.atkMod -= 300;
          hit += 1;
        }
      }
      this.addLog(side, `${card.jp} の効果で相手の攻撃力を${hit ? '300下げた' : '乱した'}`);
      this.event('effect', { effect: 'chill', side, uid: card.uid, hit });
    }
  }

  changePosition(side, uid) {
    this.requireMain(side);
    const found = this.findField(side, uid);
    if (!found) throw new DuelError('そのモンスターは場にいません。');
    const card = found.card;
    if (card.faceDown) throw new DuelError('セットしたカードは攻撃されるまで表にできません。');
    if (card.summonedTurn === this.s.turn) throw new DuelError('召喚したターンは表示形式を変えられません。');
    if (this.s.flags[side].positionChanged.includes(uid)) throw new DuelError('このターンはもう変更しました。');
    card.position = card.position === 'atk' ? 'def' : 'atk';
    card.changedPosition = true;
    this.s.flags[side].positionChanged.push(uid);
    this.addLog(side, `${card.jp} を${card.position === 'atk' ? '攻撃表示' : '守備表示'}に変更`);
    this.event('position', { side, zone: found.zone, uid, position: card.position });
    return { ok: true, position: card.position };
  }

  activateSpell(side, handUid, targetUid = null) {
    this.requireMain(side);
    if (this.s.flags[side].spellUsed) throw new DuelError('このターンの魔法はもう使いました。');
    const index = this.s.hand[side].findIndex(card => card.uid === handUid);
    if (index < 0) throw new DuelError('そのカードは手札にありません。');
    const spell = this.s.hand[side][index];
    if (spell.kind !== 'spell') throw new DuelError('魔法カードではありません。');
    const opponent = side === 'p1' ? 'p2' : 'p1';
    let target = null;
    if (spell.target === 'ownMonster') {
      const found = targetUid ? this.findField(side, targetUid) : null;
      if (!found) throw new DuelError('対象の自分モンスターを選んでください。');
      target = found;
    }
    if (spell.target === 'enemyMonster') {
      const found = targetUid ? this.findField(opponent, targetUid) : null;
      if (!found) throw new DuelError('対象の相手モンスターを選んでください。');
      target = found;
    }

    this.s.hand[side].splice(index, 1);
    this.s.grave[side].push(spell);
    this.s.flags[side].spellUsed = true;
    this.addLog(side, `魔法カード「${spell.jp}」を発動`);
    this.event('spell', {
      side, uid: spell.uid, name: spell.name, jp: spell.jp,
      targetSide: target ? target.card.owner : null,
      targetUid: target ? target.card.uid : null,
      targetZone: target ? target.zone : null,
      effect: spell.effect,
    });

    switch (spell.effect) {
      case 'burn_700':
        this.applyDamage(opponent, 700, 'spell');
        break;
      case 'heal_800':
        this.heal(side, 800);
        break;
      case 'draw_2':
        this.drawCards(side, 2);
        break;
      case 'enemy_atk_down':
        target.card.atkMod -= 800;
        this.addLog(side, `${target.card.jp} の攻撃力が800下がった`);
        break;
      case 'own_def_up':
        target.card.defMod += 1000;
        this.addLog(side, `${target.card.jp} の守備力が1000上がった`);
        break;
      case 'battle_immune':
        target.card.defMod += 1200;
        target.card.battleImmuneTurn = this.s.turn;
        this.addLog(side, `${target.card.jp} は氷殻に包まれた`);
        break;
      case 'enemy_to_def': {
        let changed = 0;
        for (let z = 0; z < ZONES; z += 1) {
          const enemy = this.s.field[opponent][z];
          if (enemy && !enemy.faceDown && enemy.position === 'atk') {
            enemy.position = 'def';
            changed += 1;
          }
        }
        this.addLog(side, `相手の攻撃表示モンスター${changed}体を守備表示にした`);
        break;
      }
      case 'destroy_small': {
        if (target.card.faceDown) {
          target.card.faceDown = false;
          target.card.position = 'def';
        }
        if (cardAtk(target.card) <= 1800) {
          this.destroyCard(opponent, target.zone, 'spell');
        } else {
          this.addLog(side, `${target.card.jp} は雪崩に耐えた`);
          this.event('effect', { effect: 'resist', side, uid: target.card.uid });
        }
        break;
      }
      default:
        break;
    }
    return { ok: true, spell };
  }

  attack(side, attackerUid, targetUid = null) {
    this.assertActive(side);
    if (this.s.phase !== 'battle') throw new DuelError('バトルフェイズではありません。');
    if (this.s.attackLocked) throw new DuelError('先攻1ターン目は攻撃できません。');
    const attacker = this.findField(side, attackerUid);
    if (!attacker) throw new DuelError('攻撃するモンスターを選んでください。');
    if (attacker.card.faceDown) throw new DuelError('セットしたモンスターは攻撃できません。');
    if (attacker.card.position !== 'atk') throw new DuelError('守備表示のモンスターは攻撃できません。');
    if (attacker.card.hasAttacked) throw new DuelError('そのモンスターはもう攻撃しました。');

    const opponent = side === 'p1' ? 'p2' : 'p1';
    const enemyCount = this.s.field[opponent].filter(Boolean).length;
    let target = null;
    if (targetUid) {
      target = this.findField(opponent, targetUid);
      if (!target) throw new DuelError('その相手モンスターは場にいません。');
    } else if (enemyCount > 0) {
      throw new DuelError('相手モンスターを選んで攻撃してください。');
    }

    attacker.card.hasAttacked = true;

    const atk = cardAtk(attacker.card);
    const event = {
      side, attackerUid, attackerZone: attacker.zone,
      targetUid: target ? target.card.uid : null,
      targetSide: target ? opponent : null,
      targetZone: target ? target.zone : null,
      direct: !target,
      damage: 0,
      attackerDestroyed: false,
      targetDestroyed: false,
      revealed: false,
      atkBefore: atk,
      targetDefBefore: target ? cardDefValue(target.card) : 0,
      targetAtkBefore: target ? cardAtk(target.card) : 0,
    };

    if (!target) {
      this.addLog(side, `${attacker.card.jp} の直接攻撃`);
      event.damage = this.applyDamage(opponent, atk, 'battle');
      this.event('attack', event);
      return { ok: true, event };
    }

    if (target.card.faceDown) {
      target.card.faceDown = false;
      target.card.position = 'def';
      event.revealed = true;
      event.targetDefBefore = cardDefValue(target.card);
      event.targetAtkBefore = cardAtk(target.card);
      this.addLog(side, `${target.card.jp} をリバース`);
    }

    const defender = target.card;
    const def = cardDefValue(defender);
    this.addLog(side, `${attacker.card.jp} (${atk}) → ${defender.jp} (${defender.position === 'atk' ? cardAtk(defender) : def})`);

    let targetDestroyed = false;
    let attackerDestroyed = false;
    let damageToDefender = 0;
    let damageToAttacker = 0;

    if (defender.position === 'atk') {
      const defenderAtk = cardAtk(defender);
      if (atk > defenderAtk) {
        targetDestroyed = true;
        damageToDefender = atk - defenderAtk;
      } else if (atk < defenderAtk) {
        attackerDestroyed = true;
        damageToAttacker = defenderAtk - atk;
      } else {
        targetDestroyed = true;
        attackerDestroyed = true;
      }
    } else {
      if (atk > def) {
        targetDestroyed = true;
        if (attacker.card.effect === 'pierce') damageToDefender = atk - def;
        else damageToDefender = 0;
      } else if (atk < def) {
        damageToAttacker = def - atk;
      }
    }

    const protectedByShield = card => card.effect === 'first_shield' && !card.shieldUsed;
    const protectedByArmor = card => card.battleImmuneTurn === this.s.turn;

    if (targetDestroyed && protectedByArmor(defender)) {
      targetDestroyed = false;
      event.armorSaved = 'target';
      this.addLog(side, `${defender.jp} は氷殻に守られた`);
    }
    if (targetDestroyed && protectedByShield(defender)) {
      defender.shieldUsed = true;
      targetDestroyed = false;
      event.shieldSaved = 'target';
      this.addLog(side, `${defender.jp} は水晶の盾で耐えた`);
    }
    if (attackerDestroyed && protectedByArmor(attacker.card)) {
      attackerDestroyed = false;
      event.armorSaved = 'attacker';
      this.addLog(side, `${attacker.card.jp} は氷殻に守られた`);
    }
    if (attackerDestroyed && protectedByShield(attacker.card)) {
      attacker.card.shieldUsed = true;
      attackerDestroyed = false;
      event.shieldSaved = 'attacker';
      this.addLog(side, `${attacker.card.jp} は水晶の盾で耐えた`);
    }

    event.damage = damageToDefender + damageToAttacker;
    event.damageToDefender = damageToDefender;
    event.damageToAttacker = damageToAttacker;
    event.attackerDestroyed = attackerDestroyed;
    event.targetDestroyed = targetDestroyed;

    if (targetDestroyed) {
      this.destroyCard(opponent, target.zone, 'battle');
      if (attacker.card.effect === 'kill_burn' && this.s.field[side][attacker.zone]) {
        this.addLog(side, `${attacker.card.jp} の効果で300ダメージ`);
        this.applyDamage(opponent, 300, 'effect');
      }
    }
    if (attackerDestroyed) this.destroyCard(side, attacker.zone, 'battle');

    if (damageToDefender > 0) this.applyDamage(opponent, damageToDefender, 'battle');
    if (damageToAttacker > 0) this.applyDamage(side, damageToAttacker, 'battle');

    event.winner = this.s.winner;
    this.event('attack', event);
    return { ok: true, event };
  }

  findField(side, uid) {
    for (let zone = 0; zone < ZONES; zone += 1) {
      const card = this.s.field[side][zone];
      if (card && card.uid === uid) return { card, zone };
    }
    return null;
  }

  findHand(side, uid) {
    return this.s.hand[side].find(card => card.uid === uid) || null;
  }

  legalMoves(side) {
    const opponent = side === 'p1' ? 'p2' : 'p1';
    const emptyZones = [];
    for (let z = 0; z < ZONES; z += 1) if (!this.s.field[side][z]) emptyZones.push(z);
    return {
      canSummon: this.s.phase === 'main' && !this.s.flags[side].summoned && emptyZones.length > 0,
      canSpell: this.s.phase === 'main' && !this.s.flags[side].spellUsed,
      monsters: this.s.hand[side].filter(card => card.kind === 'monster'),
      spells: this.s.hand[side].filter(card => card.kind === 'spell'),
      emptyZones,
      enemies: this.s.field[opponent].filter(Boolean),
      attackers: this.s.field[side].filter(card => card && !card.faceDown && card.position === 'atk' && !card.hasAttacked),
      canAttack: this.s.phase === 'battle' && !this.s.attackLocked,
      enemyCount: this.s.field[opponent].filter(Boolean).length,
    };
  }

  // Sanitised snapshot for a network guest. Hidden information stays hidden.
  snapshotFor(viewer = 'p2') {
    const snapshot = clone(this.s);
    const opponent = viewer === 'p1' ? 'p2' : 'p1';
    for (const side of ['p1', 'p2']) {
      snapshot.deck[side] = snapshot.deck[side].map(card => ({ uid: card.uid, hidden: true }));
    }
    snapshot.hand[opponent] = snapshot.hand[opponent].map(hideCard);
    snapshot.field[opponent] = snapshot.field[opponent].map(card => (card && card.faceDown ? hideCard(card) : card));
    return snapshot;
  }
}
