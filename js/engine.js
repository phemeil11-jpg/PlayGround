import { CARDS, PLAYER_DECK, AI_DECK, expandDeck, tributesNeeded } from './data.js';

let uidSeq = 0;
const ZONES = ['monsters', 'spells'];
const other = (side) => (side === 'player' ? 'ai' : 'player');
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function makeCard(id) {
  const def = CARDS[id];
  return {
    ...def,
    uid: `c${++uidSeq}`,
    faceDown: false,
    position: 'attack',
    summonedTurn: 0,
    hasAttacked: false,
    positionChanged: false,
    atkBoost: 0,
    defBoost: 0,
  };
}

function snapshot(card) {
  if (!card) return null;
  return {
    uid: card.uid, id: card.id, name: card.name, kind: card.kind, attribute: card.attribute,
    race: card.race, level: card.level, atk: card.atk, def: card.def, art: card.art,
    rarity: card.rarity, position: card.position, faceDown: card.faceDown,
    trap: card.trap, spell: card.spell, effect: card.effect,
  };
}

function blankPlayer(side) {
  return {
    side,
    lp: 8000,
    deck: [],
    hand: [],
    monsters: Array(5).fill(null),
    spells: Array(5).fill(null),
    grave: [],
    normalSummoned: false,
  };
}

export class DuelEngine {
  constructor() {
    this.state = null;
  }

  get p() { return this.state?.players; }

  create() {
    this.state = {
      turn: 1,
      active: 'player',
      phase: 'main',
      over: false,
      winner: null,
      reason: '',
      players: { player: blankPlayer('player'), ai: blankPlayer('ai') },
      log: [],
    };
    const player = this.state.players.player;
    const ai = this.state.players.ai;
    player.deck = shuffle(expandDeck(PLAYER_DECK)).map(makeCard);
    ai.deck = shuffle(expandDeck(AI_DECK)).map(makeCard);
    const events = [];
    this._draw('player', 5, events, 'opening');
    this._draw('ai', 5, events, 'opening');
    player.normalSummoned = false;
    ai.normalSummoned = false;
    return { ok: true, events };
  }

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  _fail(message) { return { ok: false, message, events: [] }; }
  _ok(events = []) { return { ok: true, events }; }

  _zone(side, zone, index) {
    const arr = this.p?.[side]?.[zone];
    if (!Array.isArray(arr) || index < 0 || index >= arr.length) return undefined;
    return arr[index];
  }

  _handCard(side, uid) {
    return this.p?.[side]?.hand.find((card) => card.uid === uid);
  }

  _handIndex(side, uid) {
    return this.p?.[side]?.hand.findIndex((card) => card.uid === uid) ?? -1;
  }

  _removeFromHand(side, uid) {
    const index = this._handIndex(side, uid);
    if (index < 0) return null;
    return this.p[side].hand.splice(index, 1)[0];
  }

  _firstOpenZone(side, zone) {
    return this.p[side][zone].findIndex((slot) => !slot);
  }

  _openZones(side, zone) {
    return this.p[side][zone].map((slot, index) => (slot ? -1 : index)).filter((i) => i >= 0);
  }

  _hasOpenZone(side, zone) { return this._firstOpenZone(side, zone) >= 0; }

  _countField(side, zone) { return this.p[side][zone].filter(Boolean).length; }

  currentAtk(card) { return card ? Math.max(0, card.atk + (card.atkBoost || 0)) : 0; }
  currentDef(card) { return card ? Math.max(0, card.def + (card.defBoost || 0)) : 0; }

  canSummon(side, card) {
    if (!card || card.kind !== 'monster') return false;
    return this._countField(side, 'monsters') >= this.tributesFor(card);
  }

  tributesFor(card) { return tributesNeeded(card.level); }

  _draw(side, count, events, source = 'effect') {
    const p = this.p[side];
    const drawn = [];
    for (let i = 0; i < count; i++) {
      if (!p.deck.length) break;
      const card = p.deck.shift();
      p.hand.push(card);
      drawn.push(card);
    }
    if (drawn.length) events.push({ type: 'draw', side, cards: drawn.map(snapshot), source });
    return drawn;
  }

  _dealDamage(side, amount, events, reason = 'battle') {
    if (amount <= 0) return;
    const p = this.p[side];
    const actual = Math.min(amount, p.lp);
    p.lp = Math.max(0, p.lp - amount);
    events.push({ type: 'damage', side, amount, actual, lp: p.lp, reason });
    if (p.lp <= 0) this._win(other(side), `${side === 'player' ? 'Your' : 'Kaiba\u2019s'} Life Points were reduced to zero.`, events);
  }

  _heal(side, amount, events) {
    if (amount <= 0) return;
    const p = this.p[side];
    p.lp = Math.min(99999, p.lp + amount);
    events.push({ type: 'heal', side, amount, lp: p.lp });
  }

  _win(winner, reason, events) {
    if (this.state.over) return;
    this.state.over = true;
    this.state.winner = winner;
    this.state.reason = reason;
    events.push({ type: 'gameover', winner, reason });
  }

  _sendToGrave(side, zone, index, events, cause = 'effect') {
    const card = this._zone(side, zone, index);
    if (!card) return null;
    this.p[side][zone][index] = null;
    this.p[side].grave.push(card);
    events.push({ type: 'destroy', side, zone, index, card: snapshot(card), cause });
    if (card.kind === 'monster' && card.onDestroyed?.heal) {
      this._heal(side, card.onDestroyed.heal, events);
    }
    return card;
  }

  _reveal(side, index, events) {
    const card = this.p[side].monsters[index];
    if (!card || !card.faceDown) return;
    card.faceDown = false;
    card.position = card.position || 'defense';
    events.push({ type: 'reveal', side, index, card: snapshot(card) });
  }

  _trapIndex(side, trapName) {
    return this.p[side].spells.findIndex((card) => card && card.faceDown && card.kind === 'trap' && card.trap === trapName);
  }

  _consumeTrap(side, index, events) {
    const card = this.p[side].spells[index];
    if (!card) return null;
    this.p[side].spells[index] = null;
    this.p[side].grave.push(card);
    events.push({ type: 'trap', side, index, card: snapshot(card), trap: card.trap });
    return card;
  }

  _triggerSummonEffects(side, card, events) {
    if (!card) return;
    if (card.onSummon?.draw) this._draw(side, card.onSummon.draw, events, 'effect');
    if (card.onSummon?.damage) this._dealDamage(other(side), card.onSummon.damage, events, 'effect');
    if (card.onSummon?.heal) this._heal(side, card.onSummon.heal, events);
    if (card.onSummon?.destroySet) {
      const enemy = other(side);
      for (let i = 0; i < 5; i++) {
        const target = this.p[enemy].spells[i];
        if (target && target.faceDown) {
          this._sendToGrave(enemy, 'spells', i, events, 'effect');
        }
      }
    }
  }

  _triggerTrapHole(summonerSide, summonedCard, events) {
    if (!summonedCard || summonedCard.faceDown) return;
    if (summonedCard.atk < 1500) return;
    const trapSide = other(summonerSide);
    const index = this._trapIndex(trapSide, 'trapHole');
    if (index < 0) return;
    this._consumeTrap(trapSide, index, events);
    const zoneIndex = this.p[summonerSide].monsters.findIndex((card) => card?.uid === summonedCard.uid);
    if (zoneIndex >= 0) this._sendToGrave(summonerSide, 'monsters', zoneIndex, events, 'trap');
  }

  /* ------------------------------------------------------------------ */
  /* Turn flow                                                           */
  /* ------------------------------------------------------------------ */

  endTurn(side) {
    if (!this.state || this.state.over) return this._fail('The duel is over.');
    if (this.state.active !== side) return this._fail('It is not your turn.');
    if (this.state.busy) return this._fail('Please wait.');

    const events = [];
    for (const zone of ZONES) {
      for (const card of this.p[side][zone]) {
        if (!card) continue;
        card.atkBoost = 0;
        card.defBoost = 0;
        card.hasAttacked = false;
        card.positionChanged = false;
      }
    }
    events.push({ type: 'endturn', side });

    const next = other(side);
    this.state.active = next;
    this.state.phase = 'main';
    this.state.turn += 1;
    this.p[next].normalSummoned = false;
    for (const zone of ZONES) {
      for (const card of this.p[next][zone]) {
        if (!card) continue;
        card.hasAttacked = false;
        card.positionChanged = false;
      }
    }

    if (!this.p[next].deck.length) {
      this._win(side, `${next === 'player' ? 'Your' : 'Kaiba\u2019s'} Deck has run out of cards.`, events);
      return this._ok(events);
    }
    this._draw(next, 1, events, 'turn');
    events.push({ type: 'turnstart', side: next, turn: this.state.turn });
    return this._ok(events);
  }

  startBattle(side) {
    if (!this.state || this.state.over) return this._fail('The duel is over.');
    if (this.state.active !== side) return this._fail('It is not your turn.');
    if (this.state.phase !== 'main') return this._fail('Battle Phase has already begun.');
    if (this.state.turn === 1) return this._fail('No attacks are allowed on the first turn.');
    this.state.phase = 'battle';
    return this._ok([{ type: 'phase', phase: 'battle', side }]);
  }

  /* ------------------------------------------------------------------ */
  /* Summoning                                                           */
  /* ------------------------------------------------------------------ */

  summon(side, uid, zoneIndex, { faceDown = false, tributes = [] } = {}) {
    if (!this.state || this.state.over) return this._fail('The duel is over.');
    if (this.state.active !== side) return this._fail('It is not your turn.');
    if (this.state.phase !== 'main') return this._fail('Summons happen during the Main Phase.');
    const p = this.p[side];
    if (p.normalSummoned) return this._fail('You already Normal Summoned this turn.');
    const card = this._handCard(side, uid);
    if (!card) return this._fail('That card is not in your hand.');
    if (card.kind !== 'monster') return this._fail('That card cannot be Summoned.');
    if (zoneIndex < 0 || zoneIndex > 4) return this._fail('Choose a Monster Zone.');
    if (this.p[side].monsters[zoneIndex]) return this._fail('That Monster Zone is occupied.');

    const need = this.tributesFor(card);
    if (tributes.length !== need) return this._fail(`This monster requires ${need} Tribute${need === 1 ? '' : 's'}.`);
    const unique = [...new Set(tributes)];
    if (unique.length !== need) return this._fail('Choose different Tributes.');
    for (const index of unique) {
      if (!this.p[side].monsters[index]) return this._fail('Invalid Tribute.');
    }
    if (need && this.p[side].monsters.filter(Boolean).length < need) return this._fail('Not enough monsters to Tribute.');

    const events = [];
    this._removeFromHand(side, uid);
    for (const index of unique) {
      const tribute = this.p[side].monsters[index];
      if (!tribute) continue;
      this.p[side].monsters[index] = null;
      this.p[side].grave.push(tribute);
      events.push({ type: 'tribute', side, zone: 'monsters', index, card: snapshot(tribute) });
    }
    card.faceDown = faceDown;
    card.position = faceDown ? 'defense' : 'attack';
    card.summonedTurn = this.state.turn;
    card.hasAttacked = false;
    card.positionChanged = false;
    card.atkBoost = 0;
    card.defBoost = 0;
    this.p[side].monsters[zoneIndex] = card;
    p.normalSummoned = true;
    events.push({ type: 'summon', side, index: zoneIndex, card: snapshot(card), faceDown, special: false });

    if (!faceDown) {
      this._triggerSummonEffects(side, card, events);
      this._triggerTrapHole(side, card, events);
    }
    return this._ok(events);
  }

  setSpellTrap(side, uid, zoneIndex) {
    if (!this.state || this.state.over) return this._fail('The duel is over.');
    if (this.state.active !== side) return this._fail('It is not your turn.');
    if (this.state.phase !== 'main') return this._fail('Set cards during the Main Phase.');
    const card = this._handCard(side, uid);
    if (!card) return this._fail('That card is not in your hand.');
    if (card.kind === 'monster') return this._fail('Set monsters by choosing Set Monster.');
    if (zoneIndex < 0 || zoneIndex > 4) return this._fail('Choose a Spell/Trap Zone.');
    if (this.p[side].spells[zoneIndex]) return this._fail('That Spell/Trap Zone is occupied.');

    const events = [];
    this._removeFromHand(side, uid);
    card.faceDown = true;
    this.p[side].spells[zoneIndex] = card;
    events.push({ type: 'set', side, index: zoneIndex, card: snapshot(card), zone: 'spells' });
    return this._ok(events);
  }

  /* ------------------------------------------------------------------ */
  /* Spells                                                              */
  /* ------------------------------------------------------------------ */

  _spellTargets(side, spell) {
    if (spell !== 'cyclone') return { required: false, any: true };
    const enemy = other(side);
    const targets = this.p[enemy].spells.map((card, index) => (card && card.faceDown ? index : -1)).filter((i) => i >= 0);
    return { required: true, any: targets.length > 0, targets, side: enemy };
  }

  spellPlayable(side, card) {
    if (!card || card.kind !== 'spell') return false;
    if (card.spell === 'cyclone') return this._spellTargets(side, 'cyclone').any;
    if (card.spell === 'reborn') {
      return this.p[side].grave.some((c) => c.kind === 'monster') && this._hasOpenZone(side, 'monsters');
    }
    return true;
  }

  activateSpell(side, uid, target = null) {
    if (!this.state || this.state.over) return this._fail('The duel is over.');
    if (this.state.active !== side) return this._fail('It is not your turn.');
    if (this.state.phase !== 'main') return this._fail('Activate Spells during the Main Phase.');
    const card = this._handCard(side, uid);
    if (!card || card.kind !== 'spell') return this._fail('That card cannot be activated.');
    if (!this.spellPlayable(side, card)) return this._fail('There is no valid target for that card.');

    const events = [];
    this._removeFromHand(side, uid);
    this.p[side].grave.push(card);
    events.push({ type: 'activate', side, card: snapshot(card), spell: card.spell });

    this._resolveSpell(side, card, events, target);
    return this._ok(events);
  }

  activateSetSpell(side, zoneIndex) {
    if (!this.state || this.state.over) return this._fail('The duel is over.');
    if (this.state.active !== side) return this._fail('It is not your turn.');
    if (this.state.phase !== 'main') return this._fail('Activate Spells during the Main Phase.');
    const card = this.p[side].spells[zoneIndex];
    if (!card || !card.faceDown || card.kind !== 'spell') return this._fail('No Set Spell there.');
    if (!this.spellPlayable(side, card)) return this._fail('There is no valid target for that card.');
    const events = [];
    this.p[side].spells[zoneIndex] = null;
    card.faceDown = false;
    this.p[side].grave.push(card);
    events.push({ type: 'activate', side, card: snapshot(card), spell: card.spell, fromField: true, index: zoneIndex });
    this._resolveSpell(side, card, events, null);
    return this._ok(events);
  }

  _resolveSpell(side, card, events, target) {
    switch (card.spell) {
      case 'draw2':
        this._draw(side, 2, events, 'effect');
        break;
      case 'cyclone': {
        const enemy = other(side);
        let index = -1;
        if (target && Number.isInteger(target.index)) index = target.index;
        else index = this._spellTargets(side, 'cyclone').targets[0] ?? -1;
        const victim = this.p[enemy].spells[index];
        if (victim && victim.faceDown) this._sendToGrave(enemy, 'spells', index, events, 'spell');
        break;
      }
      case 'reborn': {
        const monsters = this.p[side].grave.filter((c) => c.kind === 'monster');
        if (!monsters.length) break;
        monsters.sort((a, b) => this.currentAtk(b) - this.currentAtk(a));
        const revived = monsters[0];
        const zone = this._firstOpenZone(side, 'monsters');
        if (zone < 0) break;
        this.p[side].grave = this.p[side].grave.filter((c) => c.uid !== revived.uid);
        revived.faceDown = false;
        revived.position = 'attack';
        revived.summonedTurn = this.state.turn;
        revived.hasAttacked = false;
        revived.atkBoost = 0;
        revived.defBoost = 0;
        this.p[side].monsters[zone] = revived;
        events.push({ type: 'summon', side, index: zone, card: snapshot(revived), faceDown: false, special: true });
        this._triggerSummonEffects(side, revived, events);
        this._triggerTrapHole(side, revived, events);
        break;
      }
      case 'burn800':
        this._dealDamage(other(side), 800, events, 'spell');
        break;
      case 'atkBoost400':
      case 'defBoost700': {
        const isAtk = card.spell === 'atkBoost400';
        const amount = isAtk ? 400 : 700;
        let count = 0;
        for (const monster of this.p[side].monsters) {
          if (!monster || monster.faceDown) continue;
          if (isAtk) monster.atkBoost = (monster.atkBoost || 0) + amount;
          else monster.defBoost = (monster.defBoost || 0) + amount;
          count += 1;
        }
        events.push({ type: 'buff', side, stat: isAtk ? 'atk' : 'def', amount, count });
        break;
      }
      default:
        break;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Position                                                            */
  /* ------------------------------------------------------------------ */

  togglePosition(side, index) {
    if (!this.state || this.state.over) return this._fail('The duel is over.');
    if (this.state.active !== side) return this._fail('It is not your turn.');
    if (this.state.phase !== 'main') return this._fail('Change position during the Main Phase.');
    const card = this.p[side].monsters[index];
    if (!card) return this._fail('No monster there.');
    if (card.faceDown) return this._fail('That monster is Set.');
    if (card.summonedTurn === this.state.turn) return this._fail('That monster was Summoned this turn.');
    if (card.positionChanged) return this._fail('That monster already changed position this turn.');
    card.position = card.position === 'attack' ? 'defense' : 'attack';
    card.positionChanged = true;
    return this._ok([{ type: 'position', side, index, card: snapshot(card) }]);
  }

  /* ------------------------------------------------------------------ */
  /* Battle                                                              */
  /* ------------------------------------------------------------------ */

  attack(side, attackerIndex, targetIndex = null) {
    if (!this.state || this.state.over) return this._fail('The duel is over.');
    if (this.state.active !== side) return this._fail('It is not your turn.');
    if (this.state.phase !== 'battle') return this._fail('Attacks happen during the Battle Phase.');
    const attacker = this.p[side].monsters[attackerIndex];
    if (!attacker) return this._fail('No monster there.');
    if (attacker.position !== 'attack' || attacker.faceDown) return this._fail('That monster cannot attack.');
    if (attacker.hasAttacked) return this._fail('That monster already attacked this turn.');
    if (attacker.summonedTurn === this.state.turn) return this._fail('That monster was Summoned this turn.');

    const enemy = other(side);
    const enemies = this.p[enemy].monsters;
    const occupied = enemies.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
    if (targetIndex === null) {
      if (occupied.length) return this._fail('Choose an enemy monster to attack.');
    } else {
      if (targetIndex < 0 || targetIndex > 4 || !enemies[targetIndex]) return this._fail('No monster there.');
    }

    const events = [];
    attacker.hasAttacked = true;
    const attackerAtk = this.currentAtk(attacker);
    const target = targetIndex === null ? null : enemies[targetIndex];
    const targetCard = target ? snapshot(target) : null;

    // Defender's Set Traps trigger when an attack is declared.
    const trapIndex = this.p[enemy].spells.findIndex((c) => c && c.faceDown && c.kind === 'trap' && ['mirror', 'reflect', 'waboku'].includes(c.trap));
    let negateDamage = false;
    if (trapIndex >= 0) {
      const trap = this._consumeTrap(enemy, trapIndex, events);
      if (trap?.trap === 'mirror') {
        this._sendToGrave(side, 'monsters', attackerIndex, events, 'trap');
        events.push({
          type: 'attack', side, index: attackerIndex, targetIndex, direct: targetIndex === null,
          attacker: snapshot(attacker), target: targetCard, attackerAtk, targetStat: 0, destroyed: 'attacker', trap: trap.trap,
        });
        return this._ok(events);
      }
      if (trap?.trap === 'reflect') {
        this._dealDamage(side, attackerAtk, events, 'trap');
        events.push({
          type: 'attack', side, index: attackerIndex, targetIndex, direct: targetIndex === null,
          attacker: snapshot(attacker), target: targetCard, attackerAtk, targetStat: 0, destroyed: null, trap: trap.trap,
        });
        return this._ok(events);
      }
      if (trap?.trap === 'waboku') negateDamage = true;
    }

    if (targetIndex === null) {
      events.push({
        type: 'attack', side, index: attackerIndex, targetIndex: null, direct: true,
        attacker: snapshot(attacker), target: null, attackerAtk, targetStat: 0, destroyed: null, trap: null,
      });
      if (!negateDamage && attackerAtk > 0) {
        this._dealDamage(enemy, attackerAtk, events, 'battle');
      }
      return this._ok(events);
    }

    this._reveal(enemy, targetIndex, events);
    const defender = this.p[enemy].monsters[targetIndex];
    if (!defender) return this._ok(events);
    const defense = defender.position === 'defense' || defender.faceDown;
    const defenderStat = defense ? this.currentDef(defender) : this.currentAtk(defender);
    const result = {
      type: 'attack', side, index: attackerIndex, targetIndex, direct: false,
      attacker: snapshot(attacker), target: snapshot(defender), attackerAtk,
      targetStat: defenderStat, targetPosition: defense ? 'defense' : 'attack',
      destroyed: null, trap: negateDamage ? 'waboku' : null,
    };

    if (defense) {
      if (attackerAtk > defenderStat) {
        this._sendToGrave(enemy, 'monsters', targetIndex, events, 'battle');
        result.destroyed = 'target';
        if (attacker.onBattleDestroy?.draw) this._draw(side, attacker.onBattleDestroy.draw, events, 'effect');
      } else if (attackerAtk === defenderStat) {
        // Nothing is destroyed in a stalemate with a Defense Position monster.
      } else {
        this._sendToGrave(side, 'monsters', attackerIndex, events, 'battle');
        result.destroyed = 'attacker';
        if (!negateDamage) this._dealDamage(side, defenderStat - attackerAtk, events, 'battle');
      }
    } else {
      if (attackerAtk > defenderStat) {
        this._sendToGrave(enemy, 'monsters', targetIndex, events, 'battle');
        result.destroyed = 'target';
        if (attacker.onBattleDestroy?.draw) this._draw(side, attacker.onBattleDestroy.draw, events, 'effect');
        if (!negateDamage) this._dealDamage(enemy, attackerAtk - defenderStat, events, 'battle');
      } else if (attackerAtk === defenderStat) {
        this._sendToGrave(enemy, 'monsters', targetIndex, events, 'battle');
        this._sendToGrave(side, 'monsters', attackerIndex, events, 'battle');
        result.destroyed = 'both';
      } else {
        this._sendToGrave(side, 'monsters', attackerIndex, events, 'battle');
        result.destroyed = 'attacker';
        if (!negateDamage) this._dealDamage(side, defenderStat - attackerAtk, events, 'battle');
      }
    }

    events.push(result);
    return this._ok(events);
  }

  /* ------------------------------------------------------------------ */
  /* AI helpers                                                          */
  /* ------------------------------------------------------------------ */

  aiSummonPlan(side) {
    if (this.p[side].normalSummoned) return null;
    const open = this._openZones(side, 'monsters');
    if (!open.length) return null;
    const field = this.p[side].monsters.filter(Boolean);
    if (!field.length && !this.p[side].hand.some((c) => c.kind === 'monster')) return null;

    const candidates = this.p[side].hand.filter((c) => c.kind === 'monster' && this.tributesFor(c) <= field.length);
    if (!candidates.length) return null;
    const evalCard = (card) => {
      const need = this.tributesFor(card);
      if (need === 0) return card.atk;
      const tributes = [...field].sort((a, b) => this.currentAtk(a) - this.currentAtk(b)).slice(0, need);
      if (tributes.length < need) return -1;
      const cost = tributes.reduce((sum, c) => sum + this.currentAtk(c), 0);
      return card.atk + (card.def || 0) * 0.1 - cost * 0.55 + need * 200;
    };
    candidates.sort((a, b) => evalCard(b) - evalCard(a));
    const chosen = candidates[0];
    if (!chosen) return null;
    const need = this.tributesFor(chosen);
    if (need) {
      const tributes = [...field]
        .map((card, index) => ({ card, index }))
        .filter(({ card }) => card)
        .sort((a, b) => this.currentAtk(a.card) - this.currentAtk(b.card))
        .slice(0, need)
        .map(({ index }) => index);
      if (tributes.length < need) return null;
      const cost = tributes.reduce((sum, i) => sum + this.currentAtk(this.p[side].monsters[i]), 0);
      if (chosen.atk + 300 < cost) return null;
      return { uid: chosen.uid, zone: open[0], tributes };
    }
    return { uid: chosen.uid, zone: open[0], tributes: [] };
  }

  aiSetPlan(side) {
    const open = this._openZones(side, 'spells');
    if (!open.length) return null;
    const trap = this.p[side].hand.find((c) => c.kind === 'trap');
    if (!trap) return null;
    return { uid: trap.uid, zone: open[0] };
  }

  aiSpellPlan(side) {
    const spells = this.p[side].hand.filter((c) => c.kind === 'spell' && this.spellPlayable(side, c));
    if (!spells.length) return null;
    const priority = ['draw2', 'burn800', 'cyclone', 'reborn', 'atkBoost400', 'defBoost700'];
    spells.sort((a, b) => priority.indexOf(a.spell) - priority.indexOf(b.spell));
    const card = spells[0];
    let target = null;
    if (card.spell === 'cyclone') {
      const targets = this._spellTargets(side, 'cyclone').targets;
      target = { index: targets[0] };
    }
    return { uid: card.uid, target };
  }

  aiAttackPlan(side) {
    const enemy = other(side);
    const enemyMonsters = this.p[enemy].monsters;
    const occupied = enemyMonsters.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
    const attacks = [];
    for (let i = 0; i < 5; i++) {
      const attacker = this.p[side].monsters[i];
      if (!attacker || attacker.faceDown || attacker.position !== 'attack') continue;
      if (attacker.hasAttacked || attacker.summonedTurn === this.state.turn) continue;
      const atk = this.currentAtk(attacker);
      if (atk <= 0) continue;
      if (!occupied.length) {
        attacks.push({ index: i, target: null });
        continue;
      }
      const options = occupied.map((index) => {
        const target = enemyMonsters[index];
        const stat = target.faceDown || target.position === 'defense' ? this.currentDef(target) : this.currentAtk(target);
        return { index, stat, target };
      }).filter(({ stat }) => atk > stat);
      options.sort((a, b) => a.stat - b.stat);
      if (options.length) attacks.push({ index: i, target: options[0].index });
    }
    return attacks;
  }
}
