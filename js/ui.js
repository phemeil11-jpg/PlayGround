import {
  createDuel, summonMonster, setMonster, setSpellTrap, activateSpell,
  changePosition, enterBattle, endTurn, declareAttack, resolveAttack,
  resolveSummonTrap, canSummon, emptyMonsterZones, emptySpellZones,
  attackTargets, canAttack, monsterCount, atkOf, defOf
} from './engine.js';
import {
  chooseSummon, chooseSpell, chooseSetTrap, chooseAttack,
  choosePositionChange, chooseTrapResponse
} from './ai.js';
import {
  cardElement, cardMarkup, faceDownElement, cardText
} from './render.js';
import { tributeCount, KIND_LABEL, PLAYER_DECK, AI_DECK } from './cards.js';
import { DuelAudio } from './audio.js';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));

const $ = id => document.getElementById(id);

export class DuelUI {
  constructor() {
    this.el = {
      title: $('title-screen'),
      duel: $('duel-screen'),
      board: $('board'),
      hand: $('hand'),
      humanMonsters: $('human-monsters'),
      humanSpells: $('human-spells'),
      aiMonsters: $('ai-monsters'),
      aiSpells: $('ai-spells'),
      humanPlate: $('human-plate'),
      aiPlate: $('ai-plate'),
      humanLp: $('human-lp'),
      aiLp: $('ai-lp'),
      humanLpFill: $('human-lp-fill'),
      aiLpFill: $('ai-lp-fill'),
      humanDeck: $('human-deck'),
      humanGrave: $('human-grave'),
      aiDeck: $('ai-deck'),
      aiHand: $('ai-hand'),
      aiGrave: $('ai-grave'),
      turnLabel: $('turn-label'),
      turnOwner: $('turn-owner'),
      phaseSteps: $('phase-steps'),
      phaseBanner: $('phase-banner'),
      humanTurnChip: $('human-turn-chip'),
      battleBtn: $('battle-btn'),
      endBtn: $('end-btn'),
      hintBar: $('hint-bar'),
      hintText: $('hint-text'),
      actionPanel: $('action-panel'),
      logPanel: $('log-panel'),
      logBody: $('log-body'),
      logToggle: $('log-toggle'),
      logClose: $('log-close'),
      soundBtn: $('sound-btn'),
      modalLayer: $('modal-layer'),
      toasts: $('toasts'),
      fx: $('fx-layer'),
      aiThinking: $('ai-thinking')
    };

    this.sound = new DuelAudio();
    this.state = null;
    this.mode = 'idle';
    this.selection = null;
    this.busy = false;
    this.gameOver = false;
    this.prevHand = new Set();
    this.activeTrapSkip = null;
    this.resultShown = false;

    this.bind();
    this.syncSoundButton();
  }

  /* ------------------------------------------------ setup / lifecycle */

  bind() {
    $('battle-btn').addEventListener('click', () => this.enterBattleAction());
    $('end-btn').addEventListener('click', () => this.endTurnAction());
    $('hint-cancel').addEventListener('click', () => this.cancelMode());
    $('log-toggle').addEventListener('click', () => this.toggleLog(true));
    $('log-close').addEventListener('click', () => this.toggleLog(false));
    $('sound-btn').addEventListener('click', () => {
      this.sound.init();
      const on = this.sound.toggle();
      this.syncSoundButton();
      if (on) this.sound.play('click');
      this.showToast(on ? 'サウンド ON' : 'サウンド OFF');
    });
    $('rules-btn').addEventListener('click', () => this.showRules());
    $('surrender-btn').addEventListener('click', () => this.confirmSurrender());
    this.el.aiPlate.addEventListener('click', () => {
      if (this.mode === 'targetAttack' && this.selection?.direct) {
        this.performAttack(null);
      }
    });
    this.el.hand.addEventListener('click', event => {
      const cardEl = event.target.closest('.hand-card');
      if (!cardEl) return;
      this.onHandClick(Number(cardEl.dataset.uid));
    });
    this.el.hand.addEventListener('pointermove', event => this.tiltCard(event));
    this.el.hand.addEventListener('pointerleave', () => this.resetTilt());
    window.addEventListener('resize', () => this.layoutHand());
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        if (!this.el.modalLayer.classList.contains('hidden')) {
          if (this.activeTrapSkip) this.activeTrapSkip();
          else this.closeModal();
          return;
        }
        if (this.mode !== 'idle') this.cancelMode();
        else this.toggleLog(false);
      }
    });
  }

  start() {
    this.sound.init();
    this.sound.play('click');
    const { state } = createDuel(PLAYER_DECK, AI_DECK, (Date.now() ^ (Math.random() * 1e9)) >>> 0);
    this.state = state;
    this.mode = 'idle';
    this.selection = null;
    this.busy = false;
    this.gameOver = false;
    this.resultShown = false;
    this.prevHand = new Set();
    this.activeTrapSkip = null;
    this.closeModal();
    this.closeActionPanel();
    this.clearHint();
    this.toggleLog(false);
    const overlay = document.getElementById('result-overlay');
    if (overlay) overlay.remove();

    this.el.title.classList.add('hidden');
    this.el.duel.classList.remove('hidden');
    this.renderAll();
    this.showBanner('DUEL START', 'gold', 1000);
  }

  returnToTitle() {
    const overlay = document.getElementById('result-overlay');
    if (overlay) overlay.remove();
    this.closeModal();
    this.closeActionPanel();
    this.clearHint();
    this.busy = false;
    this.gameOver = false;
    this.el.duel.classList.add('hidden');
    this.el.title.classList.remove('hidden');
    this.toggleLog(false);
  }

  /* ------------------------------------------------ rendering */

  renderAll() {
    if (!this.state) return;
    this.renderField(0);
    this.renderField(1);
    this.renderHand();
    this.updateTopbar();
    this.updatePhase();
    this.updateLog();
    this.updateControls();
  }

  renderField(p) {
    const monsterRow = p === 0 ? this.el.humanMonsters : this.el.aiMonsters;
    const spellRow = p === 0 ? this.el.humanSpells : this.el.aiSpells;
    monsterRow.textContent = '';
    spellRow.textContent = '';
    for (let zone = 0; zone < 5; zone++) monsterRow.append(this.buildZone(p, zone, 'monster'));
    for (let zone = 0; zone < 5; zone++) spellRow.append(this.buildZone(p, zone, 'spell'));
  }

  buildZone(p, zone, kind) {
    const player = this.state.players[p];
    const card = kind === 'monster' ? player.monsters[zone] : player.spells[zone];
    const el = document.createElement('div');
    el.className = 'zone';
    el.dataset.side = p === 0 ? 'human' : 'ai';
    el.dataset.kind = kind;
    el.dataset.zone = String(zone);

    if (card) {
      if (card.faceDown) {
        el.append(faceDownElement('field'));
        const badge = document.createElement('span');
        badge.className = 'zone-badge set';
        badge.textContent = 'SET';
        el.append(badge);
      } else {
        el.append(cardElement(card, { variant: 'field' }));
        if (kind === 'monster') {
          const badge = document.createElement('span');
          badge.className = `zone-badge ${card.position === 'attack' ? 'atk' : 'def'}`;
          badge.textContent = card.position === 'attack' ? 'ATK' : 'DEF';
          el.append(badge);
        }
      }
    }

    if (this.isValidPlacement(p, zone, kind)) el.classList.add('valid');
    if (this.isTargetable(p, zone, kind)) {
      el.classList.add(this.mode === 'targetAttack' && p === 1 ? 'attackable' : 'selectable');
    }
    if (this.isTributeSelectable(p, zone, kind)) {
      el.classList.add('tribute-mode');
      if (this.selection?.chosen?.includes(zone)) el.classList.add('tribute-selected');
    }
    if (this.mode === 'targetAttack' && p === 0 && kind === 'monster' && this.selection?.attackerZone === zone) {
      el.classList.add('attacker-selected');
    }

    el.addEventListener('click', () => this.onZoneClick(p, zone, kind));
    return el;
  }

  isValidPlacement(p, zone, kind) {
    if (p !== 0 || this.busy || this.state.winner !== null) return false;
    if (this.mode === 'placeMonster' && kind === 'monster') return !this.state.players[0].monsters[zone];
    if (this.mode === 'placeTrap' && kind === 'spell') return !this.state.players[0].spells[zone];
    return false;
  }

  isTargetable(p, zone, kind) {
    if (this.busy) return false;
    if (this.mode === 'targetSpell') {
      const effect = this.selection?.effect;
      const card = kind === 'monster' ? this.state.players[p].monsters[zone] : this.state.players[p].spells[zone];
      if (!card) return false;
      if ((effect === 'destroyMonster' || effect === 'bounce') && p === 1 && kind === 'monster') return true;
      if (effect === 'buff' && p === 0 && kind === 'monster') return !card.faceDown;
      if (effect === 'destroySet' && p === 1 && kind === 'spell') return card.faceDown;
      return false;
    }
    if (this.mode === 'targetAttack' && p === 1 && kind === 'monster') return !!cardAt(this.state, p, zone);
    return false;
  }

  isTributeSelectable(p, zone, kind) {
    if (p !== 0 || kind !== 'monster' || this.busy) return false;
    if (this.mode !== 'tribute' && !(this.mode === 'placeMonster' && this.selection?.need > 0)) return false;
    return !!this.state.players[0].monsters[zone];
  }

  renderHand() {
    const hand = this.state.players[0].hand;
    this.el.hand.textContent = '';
    if (!hand.length) {
      const empty = document.createElement('div');
      empty.className = 'hand-empty';
      empty.textContent = '手札なし';
      this.el.hand.append(empty);
      return;
    }
    const fragment = document.createDocumentFragment();
    const canPlay = this.state.active === 0 && this.state.phase === 'main' && !this.busy && this.state.winner === null;
    hand.forEach((card, index) => {
      const el = cardElement(card, { variant: 'hand' });
      if (!this.prevHand.has(card.uid)) el.classList.add('deal-in');
      if (this.selection?.cardUid === card.uid) el.classList.add('selected');
      if (!canPlay) el.classList.add('disabled');
      el.style.zIndex = String(index + 1);
      fragment.append(el);
    });
    this.el.hand.append(fragment);
    this.prevHand = new Set(hand.map(card => card.uid));
    requestAnimationFrame(() => this.layoutHand());
  }

  layoutHand() {
    const cards = this.el.hand.querySelectorAll('.hand-card');
    if (!cards.length) {
      this.el.hand.style.setProperty('--hand-gap', '4px');
      return;
    }
    const first = cards[0].getBoundingClientRect();
    if (!first.width) return;
    const available = this.el.hand.clientWidth - 8;
    const count = cards.length;
    let gap = count > 1 ? (available - count * first.width) / (count - 1) : 0;
    gap = Math.max(-first.width * 0.62, Math.min(6, gap));
    this.el.hand.style.setProperty('--hand-gap', `${gap.toFixed(2)}px`);
  }

  updateTopbar() {
    const { players, active, turn, phase, winner } = this.state;
    const human = players[0];
    const ai = players[1];
    this.el.humanLp.textContent = String(human.lp);
    this.el.aiLp.textContent = String(ai.lp);
    this.el.humanLpFill.style.width = `${Math.max(0, Math.min(100, (human.lp / 8000) * 100))}%`;
    this.el.aiLpFill.style.width = `${Math.max(0, Math.min(100, (ai.lp / 8000) * 100))}%`;
    this.el.humanDeck.textContent = String(human.deck.length);
    this.el.humanGrave.textContent = String(human.graveyard.length);
    this.el.aiDeck.textContent = String(ai.deck.length);
    this.el.aiHand.textContent = String(ai.hand.length);
    this.el.aiGrave.textContent = String(ai.graveyard.length);
    this.el.turnLabel.textContent = `TURN ${turn}`;
    const humanTurn = active === 0 && winner === null;
    this.el.turnOwner.textContent = humanTurn ? 'YOUR TURN' : (winner === null ? 'ENEMY TURN' : 'DUEL OVER');
    this.el.turnOwner.classList.toggle('enemy', !humanTurn);
    this.el.humanTurnChip.textContent = humanTurn ? 'YOUR TURN' : (winner === null ? 'ENEMY TURN' : 'FINISH');
    this.el.humanTurnChip.style.opacity = humanTurn ? '1' : '0.45';
    this.el.aiThinking.classList.toggle('active', this.busy && active === 1 && winner === null);

    const steps = this.el.phaseSteps.querySelectorAll('span');
    steps.forEach(step => {
      const key = step.dataset.phase;
      step.classList.toggle('active', (key === 'main' && phase === 'main') || (key === 'battle' && phase === 'battle'));
      step.classList.toggle('done', key === 'main' && phase === 'battle');
    });
  }

  updatePhase() {
    const { active, phase, winner } = this.state;
    const human = active === 0;
    let text = human ? 'YOUR TURN' : 'ENEMY TURN';
    if (winner !== null) text = 'DUEL OVER';
    else if (phase === 'battle') text = human ? 'BATTLE PHASE' : 'ENEMY BATTLE';
    this.el.phaseBanner.querySelector('.pb-text').textContent = text;
    this.el.phaseBanner.classList.toggle('enemy', !human && winner === null);
    this.el.phaseBanner.classList.toggle('battle', phase === 'battle' && winner === null);
    const direct = this.mode === 'targetAttack' && this.selection?.direct && !this.busy;
    this.el.aiPlate.classList.toggle('direct-target', direct);
  }

  updateLog() {
    const entries = this.state.log.slice(-70);
    this.el.logBody.innerHTML = entries.map(entry =>
      `<div class="log-entry ${entry.tone}">${escapeHtml(entry.text)}</div>`
    ).join('');
    this.el.logBody.scrollTop = this.el.logBody.scrollHeight;
  }

  updateControls() {
    const { active, phase, winner } = this.state;
    const humanCanAct = active === 0 && winner === null && !this.busy && !this.gameOver;
    this.el.battleBtn.disabled = !humanCanAct || phase !== 'main';
    this.el.endBtn.disabled = !humanCanAct;
  }

  /* ------------------------------------------------ interaction helpers */

  onHandClick(uid) {
    if (this.busy) return;
    const card = this.state.players[0].hand.find(c => c.uid === uid);
    if (!card) return;
    if (this.state.winner !== null) return;
    if (this.state.active !== 0 || this.state.phase !== 'main') {
      this.showToast('カードを使えるのは自分のメインフェイズだけです', 'error');
      this.sound.play('error');
      return;
    }
    this.sound.play('select');
    this.openCardMenu(card);
  }

  onZoneClick(p, zone, kind) {
    if (this.busy || this.state.winner !== null) return;
    if (this.mode === 'placeMonster' && p === 0 && kind === 'monster') {
      if (this.selection?.need > 0 && this.selection.chosen?.includes(zone)) {
        this.selection.chosen = this.selection.chosen.filter(z => z !== zone);
        this.mode = 'tribute';
        this.setHint(this.tributeHint());
        this.renderAll();
        return;
      }
      if (this.isValidPlacement(p, zone, kind)) this.performSummon(zone);
      return;
    }
    if (this.mode === 'placeTrap' && p === 0 && kind === 'spell') {
      if (this.isValidPlacement(p, zone, kind)) this.performTrapSet(zone);
      return;
    }
    if (this.mode === 'tribute' && p === 0 && kind === 'monster' && this.state.players[0].monsters[zone]) {
      const chosen = this.selection.chosen;
      const index = chosen.indexOf(zone);
      if (index >= 0) chosen.splice(index, 1);
      else if (chosen.length < this.selection.need) chosen.push(zone);
      if (chosen.length === this.selection.need) {
        this.mode = 'placeMonster';
        this.setHint('生贄を捧げるモンスターゾーンを選択');
      } else {
        this.setHint(this.tributeHint());
      }
      this.sound.play('select');
      this.renderAll();
      return;
    }
    if (this.mode === 'targetSpell' && this.isTargetable(p, zone, kind)) {
      this.castSpell(zone);
      return;
    }
    if (this.mode === 'targetAttack' && p === 1 && kind === 'monster' && this.state.players[1].monsters[zone]) {
      this.performAttack(zone);
      return;
    }
    if (this.mode === 'handMenu') {
      this.cancelMode();
      return;
    }
    if (this.mode === 'idle' && p === 0 && kind === 'monster') {
      this.onOwnMonsterClick(zone);
      return;
    }
    if (this.mode === 'idle' && this.state.active === 0 && this.state.phase === 'main') {
      this.cancelMode();
    }
  }

  onOwnMonsterClick(zone) {
    if (this.state.active !== 0 || this.state.winner !== null) return;
    if (this.state.phase === 'battle') {
      const card = this.state.players[0].monsters[zone];
      if (!card) return;
      if (!canAttack(this.state, 0, zone)) {
        if (card.faceDown) this.showToast('セットされたモンスターは攻撃できません');
        else if (card.position !== 'attack') this.showToast('守備表示のモンスターは攻撃できません');
        else if (card.hasAttacked) this.showToast('このモンスターはすでに攻撃しました');
        this.sound.play('error');
        return;
      }
      const targets = attackTargets(this.state, 0, zone);
      this.mode = 'targetAttack';
      this.selection = { attackerZone: zone, direct: targets.direct };
      this.setHint(targets.direct ? '相手プレイヤーを直接攻撃 — 相手のライフをタップ' : '攻撃する相手モンスターを選択');
      this.sound.play('select');
      this.renderAll();
      return;
    }
    if (this.state.phase === 'main') {
      const card = this.state.players[0].monsters[zone];
      if (!card) return;
      if (card.summonedTurn === this.state.turn) {
        this.showToast('召喚したターンは表示形式を変更できません');
        this.sound.play('error');
        return;
      }
      if (card.positionChanged) {
        this.showToast('このモンスターはすでに表示形式を変更しました');
        this.sound.play('error');
        return;
      }
      this.busy = true;
      this.updateControls();
      try {
        const res = changePosition(this.state, 0, zone);
        this.renderAll();
        this.animateEvents(res.events).finally(() => {
          this.busy = false;
          this.renderAll();
        });
      } catch (error) {
        this.busy = false;
        this.showToast(error.message, 'error');
        this.renderAll();
      }
    }
  }

  /* ------------------------------------------------ card menu */

  openCardMenu(card) {
    this.mode = 'handMenu';
    this.selection = { cardUid: card.uid };
    this.renderAll();

    const def = card.def;
    const need = def.kind === 'monster' ? tributeCount(def.level) : 0;
    const summonReady = canSummon(this.state, 0);
    const freeMonster = emptyMonsterZones(this.state, 0).length > 0;
    const enoughTributes = monsterCount(this.state, 0) >= need;
    const freeSpell = emptySpellZones(this.state, 0).length > 0;
    const reasons = [];
    if (!summonReady) reasons.push('召喚権はもう使いました');
    if (!freeMonster) reasons.push('モンスターゾーンが埋まっています');
    if (!enoughTributes) reasons.push(`生贄が ${need} 体必要です`);

    let buttons = '';
    let hint = def.text || '';
    if (def.kind === 'monster') {
      hint += need ? `\n生贄が ${need} 体必要です。` : '\n生贄なしで召喚できます。';
      buttons = `
        <button class="ap-btn" data-action="summon" ${reasons.length ? 'disabled' : ''}>召喚</button>
        <button class="ap-btn secondary" data-action="set" ${reasons.length ? 'disabled' : ''}>守備セット</button>`;
    } else if (def.kind === 'spell') {
      const cast = this.spellUsable(card);
      if (!cast.ok) reasons.push(cast.reason);
      buttons = `<button class="ap-btn" data-action="cast" ${cast.ok ? '' : 'disabled'}>発動</button>`;
    } else {
      if (!freeSpell) reasons.push('魔法・罠ゾーンが埋まっています');
      buttons = `<button class="ap-btn" data-action="set-trap" ${freeSpell ? '' : 'disabled'}>セット</button>`;
    }

    const note = reasons.length
      ? `<div class="ap-status">${reasons.map(escapeHtml).join(' / ')}</div>`
      : `<div class="ap-status ready">${def.kind === 'monster' ? '召喚権が残っています' : '発動できます'}</div>`;

    this.el.actionPanel.innerHTML = `
      <div class="ap-preview">${cardMarkup(card, { variant: 'preview' })}</div>
      <div class="ap-body">
        <div class="ap-kicker">${KIND_LABEL[def.kind]} // ${def.rarity.toUpperCase()}</div>
        <div class="ap-name">${escapeHtml(def.name)}</div>
        <div class="ap-hint">${escapeHtml(def.text || '').replace(/\n/g, '<br>')}</div>
        ${note}
        <div class="ap-actions">
          ${buttons}
          <button class="ap-btn secondary" data-action="cancel">キャンセル</button>
        </div>
      </div>
      <button class="ap-close" data-action="cancel" aria-label="閉じる">×</button>
    `;
    this.el.actionPanel.classList.remove('hidden');
    this.el.actionPanel.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'summon') this.beginSummonFlow(card, 'attack');
        else if (action === 'set') this.beginSummonFlow(card, 'set');
        else if (action === 'cast') this.beginSpellFlow(card);
        else if (action === 'set-trap') this.beginTrapSet(card);
        else this.cancelMode();
      });
    });
  }

  spellUsable(card) {
    const effect = card.def.effect;
    const opponent = this.state.players[1];
    const me = this.state.players[0];
    if (card.def.kind !== 'spell') return { ok: false, reason: '魔法カードではありません' };
    if (effect === 'destroyMonster' || effect === 'bounce') {
      return opponent.monsters.some(Boolean) ? { ok: true } : { ok: false, reason: '対象となる相手モンスターがいません' };
    }
    if (effect === 'buff') {
      return me.monsters.some(m => m && !m.faceDown) ? { ok: true } : { ok: false, reason: '対象となる自分のモンスターがいません' };
    }
    if (effect === 'destroySet') {
      return opponent.spells.some(c => c && c.faceDown) ? { ok: true } : { ok: false, reason: '相手のセットカードがありません' };
    }
    if (effect === 'draw2' || effect === 'draw2pay') {
      if (!me.deck.length) return { ok: false, reason: 'デッキにカードがありません' };
    }
    if (effect === 'draw2pay' && me.lp <= 1000) {
      return { ok: false, reason: 'ライフが足りません' };
    }
    return { ok: true };
  }

  beginSummonFlow(card, position) {
    const need = tributeCount(card.def.level);
    this.closeActionPanel();
    if (need > 0) {
      if (monsterCount(this.state, 0) < need) {
        this.showToast(`生贄が ${need} 体必要です`, 'error');
        this.sound.play('error');
        this.cancelMode();
        return;
      }
      this.mode = 'tribute';
      this.selection = { cardUid: card.uid, action: 'summon', position, need, chosen: [] };
      this.setHint(this.tributeHint());
    } else {
      this.mode = 'placeMonster';
      this.selection = { cardUid: card.uid, action: 'summon', position, need: 0, chosen: [] };
      this.setHint('モンスターを出すゾーンを選択');
    }
    this.renderAll();
  }

  tributeHint() {
    const chosen = this.selection?.chosen?.length || 0;
    const need = this.selection?.need || 0;
    return `生贄にするモンスターを選択（${chosen} / ${need}）`;
  }

  beginSpellFlow(card) {
    this.closeActionPanel();
    const effect = card.def.effect;
    const needsTarget = ['destroyMonster', 'bounce', 'buff', 'destroySet'].includes(effect);
    if (!needsTarget) {
      this.castSpell(null, card.uid);
      return;
    }
    const usable = this.spellUsable(card);
    if (!usable.ok) {
      this.showToast(usable.reason, 'error');
      this.sound.play('error');
      this.cancelMode();
      return;
    }
    this.mode = 'targetSpell';
    this.selection = { cardUid: card.uid, effect };
    const hints = {
      destroyMonster: '破壊する相手モンスターを選択',
      bounce: '手札に戻す相手モンスターを選択',
      buff: '攻撃力を上げる自分のモンスターを選択',
      destroySet: '破壊する相手のセットカードを選択'
    };
    this.setHint(hints[effect] || '対象を選択');
    this.renderAll();
  }

  beginTrapSet(card) {
    this.closeActionPanel();
    if (!emptySpellZones(this.state, 0).length) {
      this.showToast('魔法・罠ゾーンが埋まっています', 'error');
      this.cancelMode();
      return;
    }
    this.mode = 'placeTrap';
    this.selection = { cardUid: card.uid };
    this.setHint('セットする魔法・罠ゾーンを選択');
    this.renderAll();
  }

  /* ------------------------------------------------ actions */

  performSummon(zone) {
    const sel = this.selection;
    if (!sel) return;
    this.busy = true;
    this.resetModes();
    this.renderAll();
    try {
      const card = this.state.players[0].hand.find(c => c.uid === sel.cardUid);
      const options = { tributes: sel.chosen || [] };
      const res = sel.position === 'set'
        ? setMonster(this.state, 0, sel.cardUid, zone, options)
        : summonMonster(this.state, 0, sel.cardUid, zone, { ...options, position: 'attack' });
      this.sound.play(sel.position === 'set' ? 'click' : 'summon');
      this.handleResult(res).finally(() => {
        this.busy = false;
        this.renderAll();
      });
    } catch (error) {
      this.busy = false;
      this.showToast(error.message, 'error');
      this.sound.play('error');
      this.renderAll();
    }
  }

  performTrapSet(zone) {
    const sel = this.selection;
    if (!sel) return;
    this.busy = true;
    this.resetModes();
    this.renderAll();
    try {
      const res = setSpellTrap(this.state, 0, sel.cardUid, zone);
      this.sound.play('click');
      this.handleResult(res).finally(() => {
        this.busy = false;
        this.renderAll();
      });
    } catch (error) {
      this.busy = false;
      this.showToast(error.message, 'error');
      this.sound.play('error');
      this.renderAll();
    }
  }

  castSpell(targetZone, forcedUid = null) {
    const uid = forcedUid ?? this.selection?.cardUid;
    if (!uid) return;
    this.busy = true;
    this.resetModes();
    this.renderAll();
    try {
      const res = activateSpell(this.state, 0, uid, targetZone);
      this.sound.play('spell');
      this.handleResult(res).finally(() => {
        this.busy = false;
        this.renderAll();
      });
    } catch (error) {
      this.busy = false;
      this.showToast(error.message, 'error');
      this.sound.play('error');
      this.renderAll();
    }
  }

  performAttack(targetZone) {
    const sel = this.selection;
    if (!sel) return;
    const attackerZone = sel.attackerZone;
    this.busy = true;
    this.resetModes();
    this.renderAll();
    try {
      const res = declareAttack(this.state, 0, attackerZone, targetZone);
      this.handleResult(res).finally(() => {
        this.busy = false;
        this.renderAll();
      });
    } catch (error) {
      this.busy = false;
      this.showToast(error.message, 'error');
      this.sound.play('error');
      this.renderAll();
    }
  }

  enterBattleAction() {
    if (this.busy || this.state.active !== 0 || this.state.phase !== 'main' || this.state.winner !== null) return;
    this.busy = true;
    this.resetModes();
    try {
      const res = enterBattle(this.state);
      this.sound.play('click');
      this.renderAll();
      this.animateEvents(res.events).finally(() => {
        this.busy = false;
        this.renderAll();
      });
    } catch (error) {
      this.busy = false;
      this.showToast(error.message, 'error');
      this.renderAll();
    }
  }

  endTurnAction() {
    if (this.busy || this.state.active !== 0 || this.state.winner !== null) return;
    this.busy = true;
    this.resetModes();
    this.renderAll();
    try {
      const res = endTurn(this.state);
      this.sound.play('click');
      this.handleResult(res).finally(async () => {
        this.busy = false;
        this.renderAll();
        if (this.state.winner === null && this.state.active === 1) {
          await sleep(320);
          this.runAITurn();
        }
      });
    } catch (error) {
      this.busy = false;
      this.showToast(error.message, 'error');
      this.renderAll();
    }
  }

  /* ------------------------------------------------ AI turn */

  async runAITurn() {
    if (!this.state || this.state.active !== 1 || this.state.winner !== null || this.gameOver) return;
    this.busy = true;
    this.closeActionPanel();
    this.clearHint();
    this.renderAll();
    await sleep(600);
    this.showBanner('ENEMY TURN', 'enemy', 800);
    await sleep(450);

    try {
      // Main phase: spells
      let guard = 0;
      while (!this.state.winner && guard++ < 8) {
        const spell = chooseSpell(this.state, 1);
        if (!spell) break;
        const res = activateSpell(this.state, 1, spell.handUid, spell.target);
        await this.handleResult(res);
        await sleep(320);
      }

      // Tribute / normal summon
      if (!this.state.winner) {
        const summon = chooseSummon(this.state, 1);
        if (summon) {
          const res = summonMonster(this.state, 1, summon.card.uid, summon.zone, {
            tributes: summon.tributes,
            position: summon.position
          });
          this.sound.play('summon');
          await this.handleResult(res);
          await sleep(420);
        }
      }

      // Flip weak monsters to defense.
      if (!this.state.winner) {
        let changes = 0;
        let change;
        while (!this.state.winner && changes++ < 2 && (change = choosePositionChange(this.state, 1))) {
          const res = changePosition(this.state, 1, change.zone);
          await this.handleResult(res);
          await sleep(220);
        }
      }

      // Set traps.
      if (!this.state.winner) {
        let sets = 0;
        let set;
        while (!this.state.winner && sets++ < 3 && (set = chooseSetTrap(this.state, 1))) {
          const res = setSpellTrap(this.state, 1, set.handUid, set.zone);
          this.sound.play('click');
          await this.handleResult(res);
          await sleep(240);
        }
      }

      // Battle phase.
      if (!this.state.winner) {
        const phaseRes = enterBattle(this.state);
        await this.handleResult(phaseRes);
        await sleep(380);
        let attacks = 0;
        while (!this.state.winner && attacks++ < 8) {
          const attack = chooseAttack(this.state, 1);
          if (!attack) break;
          const res = declareAttack(this.state, 1, attack.attackerZone, attack.targetZone);
          await this.handleResult(res);
          await sleep(380);
        }
      }

      // End turn.
      if (!this.state.winner) {
        await sleep(300);
        const res = endTurn(this.state);
        await this.handleResult(res);
      }
    } catch (error) {
      console.error(error);
      this.showToast('AIの行動でエラーが発生しました', 'error');
    } finally {
      this.busy = false;
      this.el.aiThinking.classList.remove('active');
      if (!this.gameOver) {
        this.renderAll();
        if (this.state.winner === null && this.state.active === 0) {
          this.sound.play('turn');
        }
      }
    }
  }

  /* ------------------------------------------------ results & trap windows */

  async handleResult(res) {
    this.renderAll();
    if (res.events && res.events.length) await this.animateEvents(res.events);
    if (res.pending) {
      await sleep(180);
      const pending = res.pending;
      let trapUid = null;
      if (pending.defender === 0) {
        trapUid = await this.askTrap(pending);
      } else {
        trapUid = chooseTrapResponse(this.state, pending);
        if (trapUid) {
          this.showToast('闇の決闘者が罠を発動！', 'gold');
          await sleep(360);
        }
      }
      const fin = pending.kind === 'attack'
        ? resolveAttack(this.state, trapUid)
        : resolveSummonTrap(this.state, trapUid);
      this.renderAll();
      await this.animateEvents(fin.events);
    }
    if (this.state.winner !== null) {
      await this.finishDuel();
    }
  }

  askTrap(pending) {
    return new Promise(resolve => {
      let done = false;
      const finish = uid => {
        if (done) return;
        done = true;
        this.activeTrapSkip = null;
        this.closeModal();
        resolve(uid);
      };
      this.activeTrapSkip = () => finish(null);

      const myTraps = this.state.players[0].spells;
      let intro = '';
      if (pending.kind === 'attack') {
        const attacker = this.state.players[pending.player].monsters[pending.attackerZone];
        const atk = attacker ? atkOf(attacker) : 0;
        const targetText = pending.targetZone === null
          ? '直接攻撃'
          : `「${escapeHtml(this.state.players[pending.defender].monsters[pending.targetZone]?.def.name || 'モンスター')}」への攻撃`;
        intro = `<p>「<b>${escapeHtml(attacker?.def.name || 'モンスター')}</b>」の${targetText}（ATK ${atk}）。<br>発動できる罠カードがあります。</p>`;
      } else {
        const monster = pending.monster;
        intro = `<p>相手が「<b>${escapeHtml(monster?.def.name || 'モンスター')}</b>」（ATK ${monster ? atkOf(monster) : 0}）を召喚しました。<br>「落とし穴」を発動できます。</p>`;
      }

      let optionsHtml = '';
      if (pending.kind === 'attack') {
        optionsHtml = pending.options.map(option => {
          const card = myTraps[option.zone];
          if (!card) return '';
          return `<button class="trap-option" data-uid="${option.uid}">
            <span><b>${escapeHtml(card.def.name)}</b><small>${escapeHtml(card.def.text)}</small></span>
            <span class="trap-option-use">発動</span>
          </button>`;
        }).join('');
      } else {
        const card = myTraps[pending.trapZone];
        optionsHtml = `<button class="trap-option" data-uid="${pending.trapUid}">
          <span><b>${escapeHtml(card?.def.name || '罠カード')}</b><small>${escapeHtml(card?.def.text || '')}</small></span>
          <span class="trap-option-use">発動</span>
        </button>`;
      }

      this.openModal(`
        <div class="modal-kicker">REACTION WINDOW</div>
        <h2>罠カードを発動しますか？</h2>
        ${intro}
        <div class="trap-options">${optionsHtml}</div>
        <div class="modal-actions">
          <button class="modal-btn ghost" data-skip>発動しない</button>
        </div>
      `);
      this.sound.play('select');

      this.el.modalLayer.querySelectorAll('[data-uid]').forEach(btn => {
        btn.addEventListener('click', () => finish(Number(btn.dataset.uid)));
      });
      this.el.modalLayer.querySelector('[data-skip]').addEventListener('click', () => finish(null));
    });
  }

  async finishDuel() {
    if (this.resultShown) return;
    this.resultShown = true;
    this.gameOver = true;
    this.busy = true;
    this.resetModes();
    this.renderAll();
    const victory = this.state.winner === 0;
    this.sound.play(victory ? 'win' : 'lose');
    await sleep(950);
    const stats = this.state.stats;
    const overlay = document.createElement('div');
    overlay.className = 'result-overlay';
    overlay.id = 'result-overlay';
    overlay.innerHTML = `
      <div class="result-eyebrow">DUEL COMPLETE // TURN ${this.state.turn}</div>
      <h1 class="result-title ${victory ? '' : 'lose'}">${victory ? 'VICTORY' : 'DEFEAT'}</h1>
      <p class="result-sub">${victory ? '闇の決闘者を打ち破った' : '闇の決闘者に敗北した'}</p>
      <div class="result-stats">
        <div class="result-stat"><span>TURNS</span><b>${this.state.turn}</b></div>
        <div class="result-stat"><span>DAMAGE DEALT</span><b>${stats.damageDealt[0]}</b></div>
        <div class="result-stat"><span>MONSTERS LOST</span><b>${stats.monstersLost[0]}</b></div>
        <div class="result-stat"><span>LIFE LEFT</span><b>${Math.max(0, this.state.players[0].lp)}</b></div>
      </div>
      <div class="result-actions">
        <button class="modal-btn gold" id="retry-btn">再戦する</button>
        <button class="modal-btn ghost" id="title-return-btn">タイトルへ</button>
      </div>
    `;
    document.body.append(overlay);
    document.getElementById('retry-btn').addEventListener('click', () => {
      overlay.remove();
      this.start();
    });
    document.getElementById('title-return-btn').addEventListener('click', () => {
      overlay.remove();
      this.returnToTitle();
    });
  }

  /* ------------------------------------------------ animation */

  async animateEvents(events) {
    for (const event of events) {
      switch (event.type) {
        case 'turn': {
          this.updatePhase();
          this.showBanner(event.player === 0 ? 'YOUR TURN' : 'ENEMY TURN', event.player === 0 ? '' : 'enemy', 760);
          this.sound.play('turn');
          await sleep(event.initial ? 80 : 380);
          break;
        }
        case 'draw': {
          if (event.player === 0) {
            this.sound.play('draw');
            await sleep(220);
          }
          break;
        }
        case 'summon': {
          const rect = this.zoneRect(event.player, 'monster', event.zone);
          if (rect) this.burst(rect, event.faceDown ? 'violet' : 'cyan');
          if (!event.faceDown) this.sound.play('summon');
          await sleep(event.faceDown ? 220 : 360);
          break;
        }
        case 'tribute': {
          const rect = this.zoneRect(event.player, 'monster', event.zone);
          if (rect) this.burst(rect, 'gold');
          await sleep(140);
          break;
        }
        case 'setSpell': {
          const rect = this.zoneRect(event.player, 'spell', event.zone);
          if (rect) this.burst(rect, 'violet');
          this.sound.play('click');
          await sleep(220);
          break;
        }
        case 'position': {
          const rect = this.zoneRect(event.player, 'monster', event.zone);
          if (rect) this.burst(rect, 'cyan');
          this.sound.play('select');
          await sleep(220);
          break;
        }
        case 'spell': {
          this.sound.play('spell');
          await this.showActivation(event.card, 'spell');
          break;
        }
        case 'trap': {
          this.sound.play('trap');
          await this.showActivation(event.card, 'trap');
          break;
        }
        case 'attack': {
          await this.animateAttack(event);
          break;
        }
        case 'damage': {
          this.animateDamage(event);
          if (event.reason !== 'cost') {
            this.sound.play('damage');
            this.shakeBoard();
            const rect = this.plateRect(event.player);
            if (rect) this.impact(rect, 'red');
          }
          await sleep(event.reason === 'cost' ? 260 : 420);
          break;
        }
        case 'heal': {
          this.sound.play('heal');
          const rect = this.plateRect(event.player);
          if (rect) this.floatText(`+${event.amount}`, rect, 'heal');
          await sleep(380);
          break;
        }
        case 'destroy': {
          const rect = this.zoneRect(event.player, 'monster', event.zone);
          if (rect) this.shatterGhost(event.card, rect);
          this.sound.play('destroy');
          await sleep(340);
          break;
        }
        case 'destroySet': {
          const rect = this.zoneRect(event.player, 'spell', event.zone);
          if (rect) this.shatterGhost(event.card, rect);
          this.sound.play('destroy');
          await sleep(300);
          break;
        }
        case 'bounce': {
          const rect = this.zoneRect(event.player, 'monster', event.zone);
          if (rect) this.floatText('RETURN', rect, 'gold');
          await sleep(280);
          break;
        }
        case 'reveal': {
          const rect = this.zoneRect(event.player, 'monster', event.zone);
          if (rect) this.burst(rect, 'cyan');
          await sleep(180);
          break;
        }
        case 'buff': {
          const rect = this.zoneRect(event.player, 'monster', event.zone);
          if (rect) this.floatText(`ATK +${event.amount}`, rect, 'gold');
          this.sound.play('heal');
          await sleep(320);
          break;
        }
        case 'negate': {
          const rect = this.plateRect(event.player);
          if (rect) this.floatText('NEGATED', rect, 'gold');
          await sleep(280);
          break;
        }
        case 'win': {
          this.showBanner('DUEL SET', 'gold', 800);
          await sleep(520);
          break;
        }
        case 'deckout': {
          this.showToast('デッキが尽きた！', 'error');
          await sleep(300);
          break;
        }
        case 'endTurn': {
          this.sound.play('click');
          await sleep(160);
          break;
        }
        default:
          break;
      }
    }
  }

  async animateAttack(event) {
    const source = this.zoneRect(event.player, 'monster', event.attackerZone);
    const target = event.direct
      ? this.plateRect(1 - event.player)
      : this.zoneRect(1 - event.player, 'monster', event.targetZone);
    this.sound.play('attack');
    if (source && target && event.attacker) {
      const ghost = document.createElement('div');
      ghost.className = 'ghost-card';
      ghost.style.left = `${source.left}px`;
      ghost.style.top = `${source.top}px`;
      ghost.style.width = `${source.width}px`;
      ghost.style.height = `${source.height}px`;
      ghost.innerHTML = cardMarkup(event.attacker, { variant: 'field' });
      this.el.fx.append(ghost);
      const dx = (target.left + target.width / 2) - (source.left + source.width / 2);
      const dy = (target.top + target.height / 2) - (source.top + source.height / 2);
      const animation = ghost.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.55}px, ${dy * 0.55}px) scale(1.1)`, opacity: 1, offset: 0.62 },
        { transform: `translate(${dx}px, ${dy}px) scale(1.02)`, opacity: 0.85 }
      ], { duration: 320, easing: 'cubic-bezier(.3,.7,.3,1)' });
      await animation.finished.catch(() => {});
      ghost.remove();
    }
    if (target) this.impact(target, event.direct ? 'red' : 'gold');
    await sleep(240);
  }

  animateDamage(event) {
    const rect = this.plateRect(event.player);
    if (!rect) return;
    this.floatText(`-${event.amount}`, rect, 'damage');
  }

  zoneRect(p, kind, zone) {
    const side = p === 0 ? 'human' : 'ai';
    const node = document.querySelector(`.zone[data-side="${side}"][data-kind="${kind}"][data-zone="${zone}"]`);
    return node ? node.getBoundingClientRect() : null;
  }

  plateRect(p) {
    const node = p === 0 ? this.el.humanPlate : this.el.aiPlate;
    return node ? node.getBoundingClientRect() : null;
  }

  burst(rect, color = 'cyan') {
    const el = document.createElement('div');
    el.className = `summon-burst ${color === 'gold' ? 'gold' : ''}`;
    el.style.left = `${rect.left + rect.width / 2}px`;
    el.style.top = `${rect.top + rect.height / 2}px`;
    if (color === 'violet') el.style.borderColor = 'rgba(200, 150, 255, 0.85)';
    if (color === 'gold') el.style.borderColor = 'rgba(255, 220, 140, 0.9)';
    this.el.fx.append(el);
    setTimeout(() => el.remove(), 900);
  }

  impact(rect, color = 'gold') {
    const el = document.createElement('div');
    el.className = `impact ${color === 'cyan' ? 'cyan' : color === 'violet' ? 'violet' : ''}`;
    el.style.left = `${rect.left + rect.width / 2}px`;
    el.style.top = `${rect.top + rect.height / 2}px`;
    if (color === 'red') el.style.background = 'radial-gradient(circle, rgba(255,255,255,.95) 0%, rgba(255,120,120,.6) 22%, rgba(255,30,60,.25) 45%, transparent 68%)';
    this.el.fx.append(el);
    setTimeout(() => el.remove(), 600);
  }

  floatText(text, rect, variant = '') {
    const el = document.createElement('div');
    el.className = `float-text ${variant}`;
    const offset = (Math.random() - 0.5) * 26;
    el.style.left = `${rect.left + rect.width / 2 + offset}px`;
    el.style.top = `${rect.top + rect.height * 0.35}px`;
    el.textContent = text;
    this.el.fx.append(el);
    setTimeout(() => el.remove(), 1100);
  }

  shatterGhost(card, rect) {
    const ghost = document.createElement('div');
    ghost.className = 'ghost-card ghost-shatter';
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.innerHTML = cardMarkup(card, { variant: 'field' });
    this.el.fx.append(ghost);
    setTimeout(() => ghost.remove(), 700);
  }

  async showActivation(card, kind) {
    this.el.fx.querySelectorAll('.activation').forEach(el => el.remove());
    const el = document.createElement('div');
    el.className = 'activation';
    el.innerHTML = cardMarkup(card, { variant: 'preview' });
    if (kind === 'trap') el.style.filter = 'drop-shadow(0 0 44px rgba(190, 120, 255, 0.65))';
    this.el.fx.append(el);
    await sleep(820);
    el.remove();
  }

  async showBanner(text, variant = '', duration = 900) {
    this.el.fx.querySelectorAll('.banner-text').forEach(el => el.remove());
    const el = document.createElement('div');
    el.className = `banner-text ${variant}`;
    el.textContent = text;
    this.el.fx.append(el);
    await sleep(duration);
    el.remove();
  }

  shakeBoard() {
    this.el.board.classList.remove('shake');
    void this.el.board.offsetWidth;
    this.el.board.classList.add('shake');
    setTimeout(() => this.el.board.classList.remove('shake'), 420);
  }

  /* ------------------------------------------------ misc UI */

  setHint(text) {
    this.el.hintText.textContent = text;
    this.el.hintBar.classList.remove('hidden');
  }

  clearHint() {
    this.el.hintBar.classList.add('hidden');
  }

  resetModes() {
    this.mode = 'idle';
    this.selection = null;
    this.closeActionPanel();
    this.clearHint();
  }

  cancelMode() {
    this.resetModes();
    this.sound.play('click');
    this.renderAll();
  }

  closeActionPanel() {
    this.el.actionPanel.classList.add('hidden');
    this.el.actionPanel.innerHTML = '';
  }

  toggleLog(open) {
    this.el.logPanel.classList.toggle('open', open);
    if (open) this.el.logPanel.scrollIntoView?.({ block: 'nearest' });
  }

  tiltCard(event) {
    if (!window.matchMedia('(hover: hover)').matches) return;
    const card = event.target.closest('.hand-card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.setProperty('--ry', `${(px * 12).toFixed(2)}deg`);
    card.style.setProperty('--rx', `${(-py * 9).toFixed(2)}deg`);
  }

  resetTilt() {
    this.el.hand.querySelectorAll('.hand-card').forEach(card => {
      card.style.removeProperty('--rx');
      card.style.removeProperty('--ry');
    });
  }

  showToast(message, variant = '') {
    const toast = document.createElement('div');
    toast.className = `toast ${variant}`;
    toast.textContent = message;
    this.el.toasts.append(toast);
    while (this.el.toasts.children.length > 3) this.el.toasts.firstElementChild.remove();
    setTimeout(() => toast.remove(), 2200);
  }

  syncSoundButton() {
    this.el.soundBtn.classList.toggle('muted', !this.sound.enabled);
  }

  openModal(html) {
    this.el.modalLayer.innerHTML = `<div class="modal">${html}</div>`;
    this.el.modalLayer.classList.remove('hidden');
    this.el.modalLayer.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => this.closeModal());
    });
    return this.el.modalLayer.querySelector('.modal');
  }

  closeModal() {
    this.el.modalLayer.classList.add('hidden');
    this.el.modalLayer.innerHTML = '';
    this.activeTrapSkip = null;
  }

  showRules() {
    this.sound.play('click');
    this.openModal(`
      <div class="modal-kicker">HOW TO DUEL</div>
      <h2>遊び方</h2>
      <p>光の軍勢を率いて、闇の決闘者との 1 対 1 のデュエルに挑みます。相手のライフを 0 にするか、相手のデッキを尽きさせれば勝利です。</p>
      <ul class="rules-list">
        <li><span class="rule-icon">LP</span><div><b>ライフは 8000。</b> モンスターの攻撃やカード効果で減り、0 になると敗北します。</div></li>
        <li><span class="rule-icon">01</span><div><b>召喚は 1 ターンに 1 回。</b> モンスターを攻撃表示で召喚するか、守備表示でセットできます。レベル 5・6 は生贄 1 体、レベル 7 以上は生贄 2 体が必要です。</div></li>
        <li><span class="rule-icon">02</span><div><b>バトルフェイズ。</b> 攻撃表示のモンスターで相手モンスターか相手プレイヤーを攻撃します。攻撃力が高いほど有利。守備表示モンスターを攻撃した場合、攻撃力が守備力を超えれば破壊できます。</div></li>
        <li><span class="rule-icon">03</span><div><b>魔法カードはメインフェイズに発動。</b> ドロー、除去、強化などで盤面を動かします。</div></li>
        <li><span class="rule-icon">04</span><div><b>罠カードはセットしてから。</b> セットした次のターン以降、相手の攻撃や召喚に反応して発動できます。</div></li>
        <li><span class="rule-icon">05</span><div><b>カードを選択して行動。</b> 手札のカードをタップ → 行動を選択 → 光るゾーンをタップ。攻撃は自分のモンスター → 相手のモンスターの順に選択します。</div></li>
      </ul>
      <div class="modal-actions">
        <button class="modal-btn" data-close>閉じる</button>
      </div>
    `);
  }

  confirmSurrender() {
    if (this.state?.winner !== null && this.state?.winner !== undefined) return;
    this.sound.play('click');
    this.openModal(`
      <div class="modal-kicker">SURRENDER</div>
      <h2>デュエルを降参しますか？</h2>
      <p>降参すると、このデュエルは敗北として記録されます。</p>
      <div class="modal-actions">
        <button class="modal-btn danger" data-confirm>降参する</button>
        <button class="modal-btn ghost" data-close>続ける</button>
      </div>
    `);
    this.el.modalLayer.querySelector('[data-confirm]').addEventListener('click', () => {
      this.closeModal();
      this.state.winner = 1;
      this.state.phase = 'over';
      this.state.log.push({ id: this.state.log.length + 1, turn: this.state.turn, text: 'あなたは降参した…', tone: 'p0' });
      this.renderAll();
      this.finishDuel();
    });
  }
}

function cardAt(state, p, zone) {
  return state.players[p]?.monsters?.[zone] || null;
}

/* Standalone rules modal for the title screen (no duel instance needed). */
export function showRulesModal() {
  const layer = document.getElementById('modal-layer');
  if (!layer) return;
  layer.innerHTML = `
    <div class="modal">
      <div class="modal-kicker">HOW TO DUEL</div>
      <h2>遊び方</h2>
      <p>光の軍勢を率いて、闇の決闘者との 1 対 1 のデュエルに挑みます。相手のライフを 0 にするか、相手のデッキを尽きさせれば勝利です。</p>
      <ul class="rules-list">
        <li><span class="rule-icon">LP</span><div><b>ライフは 8000。</b> モンスターの攻撃やカード効果で減り、0 になると敗北します。</div></li>
        <li><span class="rule-icon">01</span><div><b>召喚は 1 ターンに 1 回。</b> モンスターを攻撃表示で召喚するか、守備表示でセットできます。レベル 5・6 は生贄 1 体、レベル 7 以上は生贄 2 体が必要です。</div></li>
        <li><span class="rule-icon">02</span><div><b>バトルフェイズ。</b> 攻撃表示のモンスターで相手モンスターか相手プレイヤーを攻撃します。守備表示モンスターを攻撃した場合、攻撃力が守備力を超えれば破壊できます。</div></li>
        <li><span class="rule-icon">03</span><div><b>魔法カードはメインフェイズに発動。</b> ドロー、除去、強化などで盤面を動かします。</div></li>
        <li><span class="rule-icon">04</span><div><b>罠カードはセットしてから。</b> セットした次のターン以降、相手の攻撃や召喚に反応して発動できます。</div></li>
        <li><span class="rule-icon">05</span><div><b>カードを選択して行動。</b> 手札のカードをタップ → 行動を選択 → 光るゾーンをタップ。攻撃は自分のモンスター → 相手のモンスターの順に選択します。</div></li>
      </ul>
      <div class="modal-actions">
        <button class="modal-btn" data-close>閉じる</button>
      </div>
    </div>`;
  layer.classList.remove('hidden');
  layer.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      layer.classList.add('hidden');
      layer.innerHTML = '';
    });
  });
}
