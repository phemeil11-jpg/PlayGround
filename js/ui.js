import { ATTRIBUTES, CARDS } from './data.js';
import { cardArt, cardBackSVG, attributeIcon, zoneGlyph } from './art.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const other = (side) => (side === 'player' ? 'ai' : 'player');
const roman = ['I', 'II', 'III', 'IV', 'V'];
const nameOf = { player: 'Yugi', ai: 'Kaiba' };

export class DuelUI {
  constructor({ engine, fx, audio, motion, onExit, onRematch }) {
    this.engine = engine;
    this.fx = fx;
    this.audio = audio;
    this.motion = motion;
    this.onExit = onExit;
    this.onRematch = onRematch;
    this.el = {
      shell: document.getElementById('duel-shell'),
      aiHand: document.getElementById('ai-hand'),
      aiMonsters: document.getElementById('ai-monsters'),
      aiSpells: document.getElementById('ai-spells'),
      playerMonsters: document.getElementById('player-monsters'),
      playerSpells: document.getElementById('player-spells'),
      hand: document.getElementById('hand'),
      handWrap: document.getElementById('hand-wrap'),
      tray: document.getElementById('tray'),
      trayInner: document.getElementById('tray-inner'),
      hint: document.getElementById('hint'),
      toast: document.getElementById('toast'),
      banner: document.getElementById('banner'),
      direct: document.getElementById('direct-btn'),
      battle: document.getElementById('battle-btn'),
      end: document.getElementById('end-btn'),
      phase: document.getElementById('phase-label'),
      phaseTop: document.getElementById('phase-top'),
      turn: document.getElementById('turn-num'),
      thinking: document.getElementById('thinking'),
      result: document.getElementById('result-modal'),
      resultTitle: document.getElementById('result-title'),
      resultSub: document.getElementById('result-sub'),
      resultStats: document.getElementById('result-stats'),
      rematch: document.getElementById('rematch-btn'),
      exit: document.getElementById('exit-btn'),
    };
    this.sel = null;
    this.pending = null;
    this.busy = false;
    this.hintTimer = null;
    this.toastTimer = null;
    this.bannerTimer = null;
    this.resultShown = false;
    this.drawPulse = new Set();
    this.artCache = new Map();
    this.backCache = new Map();
    this.lastWidth = 0;
    this.bind();
  }

  /* ------------------------------------------------------------------ */
  /* Boot / reset                                                        */
  /* ------------------------------------------------------------------ */

  start() {
    this.engine.create();
    this.sel = null;
    this.pending = null;
    this.busy = false;
    this.resultShown = false;
    this.drawPulse.clear();
    this.el.result.hidden = true;
    this.el.shell.classList.add('on');
    this.clearTray();
    this.renderAll();
    requestAnimationFrame(() => this.layoutHand());
    this.showBanner('DUEL START', 'YOUR TURN', 'gold', 1200);
    this.showHint('Tap a card in your hand to begin.');
    setTimeout(() => {
      document.querySelectorAll('.hand-card').forEach((el, i) => {
        el.style.setProperty('--deal-delay', `${i * 70}ms`);
        el.classList.add('deal-in');
      });
    }, 60);
  }

  reset() {
    this.start();
  }

  bind() {
    const board = document.getElementById('board');
    board.addEventListener('click', (event) => {
      const zone = event.target.closest('.zone');
      if (!zone) return;
      this.onZoneClick(zone.dataset.side, zone.dataset.zone, Number(zone.dataset.index));
    });
    this.el.hand.addEventListener('click', (event) => {
      const card = event.target.closest('.hand-card');
      if (!card) return;
      this.onHandClick(card.dataset.uid);
    });
    this.el.tray.addEventListener('click', (event) => {
      const button = event.target.closest('[data-act]');
      if (!button || button.disabled) return;
      this.onTrayAction(button.dataset.act);
    });
    this.el.battle.addEventListener('click', () => this.enterBattle());
    this.el.end.addEventListener('click', () => this.endPlayerTurn());
    this.el.direct.addEventListener('click', () => this.declareAttack(null, true));
    this.el.rematch.addEventListener('click', () => {
      this.el.result.hidden = true;
      this.audio.play('ui');
      this.onRematch?.();
      this.start();
    });
    this.el.exit.addEventListener('click', () => {
      this.el.result.hidden = true;
      this.audio.play('ui');
      this.onExit?.();
    });
    window.addEventListener('resize', () => {
      this.layoutHand();
      if (this.sel || this.pending) this.renderBoard();
    }, { passive: true });
  }

  /* ------------------------------------------------------------------ */
  /* Rendering helpers                                                   */
  /* ------------------------------------------------------------------ */

  art(card) {
    const key = `${card.id}|${card.uid}`;
    if (!this.artCache.has(key)) this.artCache.set(key, cardArt(card, key));
    return this.artCache.get(key);
  }

  back(uid) {
    if (!this.backCache.has(uid)) this.backCache.set(uid, cardBackSVG(uid));
    return this.backCache.get(uid);
  }

  cardMarkup(card, { size = 'hand', hidden = false, extra = '', current = false, index = 0 } = {}) {
    if (!card) return '';
    if (hidden) {
      return `<div class="game-card ${size} card-back ${extra}" data-uid="${card.uid}" data-index="${index}">
        <div class="gc-inner">${this.back(card.uid)}</div>
        <span class="fd-label">SET</span>
      </div>`;
    }
    const a = ATTRIBUTES[card.attribute] || ATTRIBUTES.SPELL;
    const atk = current ? this.engine.currentAtk(card) : card.atk;
    const def = current ? this.engine.currentDef(card) : card.def;
    const stars = card.kind === 'monster' ? `<div class="gc-stars" aria-label="Level ${card.level}">${'★'.repeat(card.level)}</div>` : '';
    const text = card.effect || card.flavor || '';
    const stats = card.kind === 'monster'
      ? `<div class="gc-stats"><span>ATK <b>${atk}</b></span><span>DEF <b>${def}</b></span></div>`
      : `<div class="gc-stats gc-cardtype"><span>${card.kind === 'spell' ? 'SPELL CARD' : 'TRAP CARD'}</span><span>${card.code}</span></div>`;
    return `<div class="game-card ${size} kind-${card.kind} rar-${card.rarity} ${extra}" data-uid="${card.uid}" style="--fmain:${a.color};--fdeep:${a.deep};--fglow:${a.glow};--fink:${a.ink}">
      <div class="gc-inner">
        <div class="gc-head"><span class="gc-name">${card.name}</span><span class="gc-attr">${attributeIcon(card.attribute)}</span></div>
        ${stars}
        <div class="gc-art">${this.art(card)}<span class="gc-attr-label">${a.label}</span></div>
        <div class="gc-type">${card.typeLabel || ''}</div>
        <div class="gc-text">${text}</div>
        ${stats}
        <span class="gc-gem">${card.rarity}</span>
      </div>
      <span class="gc-holo"></span>
    </div>`;
  }

  renderAll() {
    this.renderHud();
    this.renderOpponentHand();
    this.renderBoard();
    this.renderHand();
    this.renderControls();
    this.renderTray();
    requestAnimationFrame(() => this.layoutHand());
  }

  renderHud() {
    const st = this.engine.state;
    if (!st) return;
    for (const side of ['player', 'ai']) {
      const p = st.players[side];
      const lpEl = document.getElementById(`lp-${side}`);
      const bar = document.getElementById(`lpbar-${side}`);
      if (lpEl) lpEl.textContent = Math.max(0, Math.round(p.lp)).toLocaleString();
      if (bar) bar.style.width = `${Math.min(100, (p.lp / 8000) * 100)}%`;
      document.getElementById(`deck-${side}`).textContent = p.deck.length;
      document.getElementById(`handcount-${side}`).textContent = p.hand.length;
      document.getElementById(`gy-${side}`).textContent = p.grave.length;
      const hud = document.getElementById(`hud-${side}`);
      hud.classList.toggle('is-active', st.active === side);
      hud.classList.toggle('is-low', p.lp <= 2000);
    }
    this.el.turn.textContent = String(st.turn).padStart(2, '0');
    const phaseName = st.phase === 'battle' ? 'BATTLE' : 'MAIN';
    this.el.phaseTop.textContent = phaseName;
    this.el.phase.textContent = st.active === 'ai' ? 'KAIBA\u2019S TURN' : `${phaseName} PHASE`;
    document.body.classList.toggle('ai-turn', st.active === 'ai');
    this.el.thinking.classList.toggle('on', this.busy && st.active === 'ai');
  }

  renderOpponentHand() {
    const hand = this.engine.state?.players.ai.hand || [];
    const count = Math.min(hand.length, 8);
    let html = '';
    for (let i = 0; i < count; i++) {
      const mid = (count - 1) / 2;
      const x = (i - mid) * 22;
      const r = (i - mid) * 5;
      html += `<span class="opp-card" style="--x:${x}px;--r:${r}deg">${this.back(`opp${i}`)}</span>`;
    }
    if (hand.length > 8) html += `<span class="opp-more">+${hand.length - 8}</span>`;
    this.el.aiHand.innerHTML = html;
  }

  zoneState(side, zone, index, card) {
    const p = this.pending;
    let valid = false;
    let target = false;
    if (p) {
      if ((p.kind === 'summon' || p.kind === 'setMonster') && side === 'player' && zone === 'monsters' && !card) valid = true;
      if (p.kind === 'setSpell' && side === 'player' && zone === 'spells' && !card) valid = true;
      if (p.kind === 'tribute' && side === 'player' && zone === 'monsters' && card) valid = true;
      if (p.kind === 'spellTarget' && side === 'ai' && zone === 'spells' && card?.faceDown) target = true;
      if (p.kind === 'attack' && side === 'ai' && zone === 'monsters' && card) target = true;
    }
    const selected = this.sel && this.sel.kind !== 'hand' && this.sel.side === side && this.sel.zone === zone && this.sel.index === index;
    const tributePicked = p?.kind === 'tribute' && p.picks?.includes(index);
    const attacking = p?.kind === 'attack' && side === 'player' && zone === 'monsters' && p.index === index;
    return { valid, target, selected, tributePicked, attacking };
  }

  zoneMarkup(side, zone, index, card) {
    const state = this.zoneState(side, zone, index, card);
    const classes = [
      'zone',
      zone === 'monsters' ? 'monster-zone' : 'spell-zone',
      card ? 'filled' : 'empty',
      state.valid ? 'valid' : '',
      state.target ? 'targetable' : '',
      state.selected ? 'selected' : '',
      state.tributePicked ? 'tribute-picked' : '',
      state.attacking ? 'attacking' : '',
    ].filter(Boolean).join(' ');
    const hidden = Boolean(card?.faceDown);
    const cardHtml = card
      ? `<div class="slot-card ${card.position === 'defense' && !hidden ? 'defense' : ''}">
          ${this.cardMarkup(card, { size: 'mini', hidden, current: true, index })}
        </div>`
      : `<span class="zone-glyph">${zoneGlyph(zone === 'monsters' ? 'monster' : 'spell')}</span><span class="zone-num">${roman[index]}</span>`;
    return `<div class="${classes}" data-side="${side}" data-zone="${zone}" data-index="${index}" role="button" tabindex="0"
      aria-label="${side === 'player' ? 'Your' : 'Opponent'} ${zone === 'monsters' ? 'monster' : 'spell or trap'} zone ${index + 1}${card ? `, ${hidden ? 'set card' : card.name}` : ', empty'}">
      ${cardHtml}
    </div>`;
  }

  renderBoard() {
    const st = this.engine.state;
    if (!st) return;
    const map = [
      ['ai', 'spells', this.el.aiSpells],
      ['ai', 'monsters', this.el.aiMonsters],
      ['player', 'monsters', this.el.playerMonsters],
      ['player', 'spells', this.el.playerSpells],
    ];
    for (const [side, zone, el] of map) {
      el.innerHTML = st.players[side][zone].map((card, index) => this.zoneMarkup(side, zone, index, card)).join('');
    }
    const directVisible = this.pending?.kind === 'attack' && !st.players.ai.monsters.some(Boolean);
    this.el.direct.classList.toggle('on', Boolean(directVisible));
    this.el.shell.classList.toggle('targeting', Boolean(this.pending));
  }

  renderHand() {
    const hand = this.engine.state?.players.player.hand || [];
    if (!hand.length) {
      this.el.hand.innerHTML = '<span class="empty-hand">NO CARDS IN HAND</span>';
      return;
    }
    this.el.hand.innerHTML = hand.map((card, i) => {
      const selected = this.sel?.kind === 'hand' && this.sel.uid === card.uid;
      const draw = this.drawPulse.has(card.uid) ? 'draw-in' : '';
      return `<button class="hand-card ${selected ? 'selected' : ''} ${draw}" data-uid="${card.uid}" style="--i:${i};--n:${hand.length}"
        aria-label="${card.name}${card.kind === 'monster' ? `, ATK ${card.atk}, DEF ${card.def}` : ''}">
        ${this.cardMarkup(card, { size: 'hand', extra: selected ? 'selected' : '' })}
      </button>`;
    }).join('');
    this.drawPulse.clear();
  }

  layoutHand() {
    const hand = this.el.hand;
    if (!hand) return;
    const cards = [...hand.querySelectorAll('.hand-card')];
    if (!cards.length) return;
    const width = hand.clientWidth || window.innerWidth;
    const height = hand.clientHeight || 112;
    const n = cards.length;
    // Height is the real constraint: cards are rotated around their bottom
    // edge, so leave room for the fan and the corner sweep.
    const widthShare = n > 7 ? 0.155 : n > 5 ? 0.18 : 0.225;
    const cardW = Math.max(42, Math.min(120, width * widthShare, (height - 14) / 1.47));
    const spacing = n <= 1 ? 0 : Math.min(cardW * 0.74, (width - cardW - 10) / (n - 1));
    const mid = (n - 1) / 2;
    hand.style.setProperty('--cw', `${cardW}px`);
    cards.forEach((card, i) => {
      const offset = (i - mid) * spacing;
      const angle = (i - mid) * (n > 6 ? 2.2 : n > 4 ? 2.8 : 3.4);
      const y = Math.pow(Math.abs(i - mid), 1.5) * 1.6;
      card.style.setProperty('--x', `${offset}px`);
      card.style.setProperty('--y', `${y}px`);
      card.style.setProperty('--r', `${angle}deg`);
      card.style.setProperty('--z', String(10 + i));
    });
  }

  renderControls() {
    const st = this.engine.state;
    if (!st) return;
    const playerTurn = st.active === 'player' && !st.over && !this.busy;
    this.el.battle.disabled = !playerTurn || st.phase !== 'main' || st.turn === 1;
    this.el.end.disabled = !playerTurn;
    this.el.battle.classList.toggle('muted', st.phase !== 'main');
    this.el.phase.textContent = st.over ? 'DUEL OVER' : st.active === 'ai' ? 'KAIBA\u2019S TURN' : st.phase === 'battle' ? 'BATTLE PHASE' : 'MAIN PHASE';
    this.el.thinking.classList.toggle('on', Boolean(this.busy && st.active === 'ai'));
    this.el.shell.classList.toggle('busy', Boolean(this.busy));
  }

  /* ------------------------------------------------------------------ */
  /* Tray / selection                                                    */
  /* ------------------------------------------------------------------ */

  getSelectedCard() {
    if (!this.sel) return null;
    const st = this.engine.state;
    if (this.sel.kind === 'hand') return st.players.player.hand.find((c) => c.uid === this.sel.uid) || null;
    if (this.sel.kind === 'monster') return st.players[this.sel.side].monsters[this.sel.index];
    if (this.sel.kind === 'spell') return st.players[this.sel.side].spells[this.sel.index];
    return null;
  }

  selectHand(uid) {
    if (this.sel?.kind === 'hand' && this.sel.uid === uid) {
      this.clearSelection();
      return;
    }
    this.pending = null;
    this.sel = { kind: 'hand', uid };
    this.audio.play('select');
    this.renderAll();
    const card = this.getSelectedCard();
    if (card) this.showHint(card.kind === 'monster' ? 'Summon, Set, or inspect this card.' : card.kind === 'spell' ? 'Activate or Set this Spell.' : 'Set this Trap face-down.');
  }

  selectMonster(side, index) {
    const card = this.engine.state.players[side].monsters[index];
    if (!card) return;
    this.sel = { kind: 'monster', side, zone: 'monsters', index };
    this.pending = null;
    this.audio.play('select');
    this.renderAll();
    this.showHint(side === 'player' ? 'Monster selected.' : 'Opponent\u2019s monster.');
  }

  selectSpell(side, index) {
    const card = this.engine.state.players[side].spells[index];
    if (!card) return;
    this.sel = { kind: 'spell', side, zone: 'spells', index };
    this.pending = null;
    this.audio.play('select');
    this.renderAll();
    this.showHint(side === 'player' ? 'Set card selected.' : 'Opponent\u2019s Set card.');
  }

  clearSelection() {
    this.sel = null;
    this.pending = null;
    this.renderTray();
    this.renderBoard();
    this.renderHand();
  }

  clearTray() {
    this.el.tray.classList.remove('on');
    this.el.tray.setAttribute('aria-hidden', 'true');
    this.el.trayInner.innerHTML = '';
    document.body.classList.remove('tray-open');
  }

  actionState(kind, card) {
    const st = this.engine.state;
    const main = st.active === 'player' && st.phase === 'main' && !st.over && !this.busy;
    const p = st.players.player;
    const openMonster = p.monsters.some((c) => !c);
    const openSpell = p.spells.some((c) => !c);
    const need = card?.kind === 'monster' ? this.engine.tributesFor(card) : 0;
    const fieldMonsters = p.monsters.filter(Boolean).length;
    if (kind === 'summon' || kind === 'setMonster') {
      if (!main) return { ok: false, why: 'Main Phase only' };
      if (p.normalSummoned) return { ok: false, why: 'Already Normal Summoned' };
      if (!openMonster) return { ok: false, why: 'No open Monster Zone' };
      if (fieldMonsters < need) return { ok: false, why: `Needs ${need} Tribute${need === 1 ? '' : 's'}` };
      return { ok: true, why: '' };
    }
    if (kind === 'activate') {
      if (!main) return { ok: false, why: 'Main Phase only' };
      if (!this.engine.spellPlayable('player', card)) return { ok: false, why: 'No valid target' };
      return { ok: true, why: '' };
    }
    if (kind === 'setSpell') {
      if (!main) return { ok: false, why: 'Main Phase only' };
      if (!openSpell) return { ok: false, why: 'No open Spell/Trap Zone' };
      return { ok: true, why: '' };
    }
    return { ok: true, why: '' };
  }

  renderTray() {
    if (!this.sel) { this.clearTray(); return; }
    const card = this.getSelectedCard();
    if (!card) { this.clearSelection(); return; }
    const st = this.engine.state;
    const side = this.sel.side || 'player';
    const hidden = Boolean(card.faceDown && side !== 'player');
    const isOwnBoard = side === 'player' && this.sel.kind !== 'hand';
    const a = ATTRIBUTES[card.attribute] || ATTRIBUTES.SPELL;
    let actions = '';
    let note = '';

    if (this.pending?.kind === 'tribute') {
      note = `Choose ${this.pending.needed} Tribute${this.pending.needed === 1 ? '' : 's'} from your field \u2014 ${this.pending.picks.length}/${this.pending.needed} selected.`;
      actions = `<button class="tray-btn ghost" data-act="cancel">CANCEL</button>`;
    } else if (this.sel.kind === 'hand') {
      if (card.kind === 'monster') {
        const need = this.engine.tributesFor(card);
        const sum = this.actionState('summon', card);
        const set = this.actionState('setMonster', card);
        actions += `<button class="tray-btn gold" data-act="summon" ${sum.ok ? '' : 'disabled'} title="${sum.why}">SUMMON${need ? ` \u00b7 ${need} TRIBUTE${need > 1 ? 'S' : ''}` : ''}</button>`;
        actions += `<button class="tray-btn" data-act="setMonster" ${set.ok ? '' : 'disabled'} title="${set.why}">SET</button>`;
        if (!sum.ok) note = sum.why;
        if (!set.ok && sum.ok) note = set.why;
      } else if (card.kind === 'spell') {
        const act = this.actionState('activate', card);
        const set = this.actionState('setSpell', card);
        actions += `<button class="tray-btn gold" data-act="activate" ${act.ok ? '' : 'disabled'} title="${act.why}">ACTIVATE</button>`;
        actions += `<button class="tray-btn" data-act="setSpell" ${set.ok ? '' : 'disabled'} title="${set.why}">SET</button>`;
        if (!act.ok) note = act.why;
      } else {
        const set = this.actionState('setSpell', card);
        actions += `<button class="tray-btn gold" data-act="setSpell" ${set.ok ? '' : 'disabled'} title="${set.why}">SET TRAP</button>`;
        if (!set.ok) note = set.why;
      }
      actions += `<button class="tray-btn ghost" data-act="cancel">CANCEL</button>`;
    } else if (isOwnBoard) {
      if (card.kind === 'monster') {
        const canAct = card.position === 'attack' && !card.faceDown && !card.hasAttacked && card.summonedTurn !== st.turn;
        if (st.phase === 'battle' && canAct && st.active === 'player') {
          actions += `<button class="tray-btn gold" data-act="attack">DECLARE ATTACK</button>`;
        }
        const canPos = st.phase === 'main' && !card.faceDown && !card.positionChanged && card.summonedTurn !== st.turn && st.active === 'player';
        actions += `<button class="tray-btn" data-act="position" ${canPos ? '' : 'disabled'} title="${canPos ? '' : 'Cannot change position now'}">${card.position === 'attack' ? 'DEFENSE MODE' : 'ATTACK MODE'}</button>`;
        if (!canAct && st.phase === 'battle') note = card.summonedTurn === st.turn ? 'Summoned this turn.' : card.hasAttacked ? 'Already attacked.' : card.position === 'defense' ? 'Defense Position monsters cannot attack.' : '';
      } else if (card.kind === 'spell') {
        if (card.faceDown) {
          const act = this.actionState('activate', card);
          actions += `<button class="tray-btn gold" data-act="activateSet" ${act.ok ? '' : 'disabled'} title="${act.why}">ACTIVATE</button>`;
          if (!act.ok) note = act.why;
        } else {
          note = 'This Spell is already active.';
        }
      } else {
        note = card.faceDown ? 'Set Traps trigger automatically when your opponent attacks or Summons.' : 'Trap is active.';
      }
      actions += `<button class="tray-btn ghost" data-act="cancel">CLOSE</button>`;
    } else {
      note = hidden ? 'Your opponent\u2019s Set card. Its identity is hidden until it activates.' : 'Opponent card \u2014 inspect only.';
      actions = `<button class="tray-btn ghost" data-act="cancel">CLOSE</button>`;
    }

    const shownCard = hidden
      ? this.cardMarkup(card, { size: 'tray', hidden: true })
      : this.cardMarkup(card, { size: 'tray', current: side === 'player' || this.sel.kind !== 'hand' });
    const statLine = card.kind === 'monster'
      ? `<span class="tray-stat" style="--c:${a.color}">${a.label}</span><span class="tray-stat">LEVEL ${card.level}</span><span class="tray-stat">ATK ${this.engine.currentAtk(card)}</span><span class="tray-stat">DEF ${this.engine.currentDef(card)}</span>`
      : `<span class="tray-stat" style="--c:${a.color}">${a.label}</span><span class="tray-stat">${card.typeLabel || ''}</span>`;
    this.el.trayInner.innerHTML = `
      <div class="tray-card">${shownCard}</div>
      <div class="tray-info">
        <div class="tray-name">${card.name}</div>
        <div class="tray-stats">${statLine}</div>
        <p class="tray-text">${hidden ? 'Face-down card.' : (card.effect || card.flavor || '')}</p>
        ${note ? `<p class="tray-note">${note}</p>` : ''}
        <div class="tray-actions">${actions}</div>
      </div>
      <span class="tray-corner tl"></span><span class="tray-corner tr"></span>`;
    this.el.tray.classList.add('on');
    this.el.tray.setAttribute('aria-hidden', 'false');
    document.body.classList.add('tray-open');
  }

  /* ------------------------------------------------------------------ */
  /* Input                                                               */
  /* ------------------------------------------------------------------ */

  onHandClick(uid) {
    if (this.busy) return;
    if (this.engine.state.over) return;
    const card = this.engine.state.players.player.hand.find((c) => c.uid === uid);
    if (!card) return;
    if (this.engine.state.active !== 'player') {
      this.toast('Wait for your turn.');
      return;
    }
    if (this.pending) this.pending = null;
    this.selectHand(uid);
  }

  onZoneClick(side, zone, index) {
    if (this.busy || this.engine.state.over) return;
    const card = this.engine.state.players[side][zone][index];
    const p = this.pending;

    if (p?.kind === 'tribute') {
      if (side !== 'player' || zone !== 'monsters' || !card) return;
      const picks = p.picks.includes(index) ? p.picks.filter((i) => i !== index) : [...p.picks, index];
      if (picks.length > p.needed) return;
      p.picks = picks;
      this.audio.play('select');
      this.renderAll();
      if (picks.length === p.needed) {
        this.pending = { kind: 'summon', uid: p.uid, mode: p.mode, tributes: picks };
        this.showHint('Choose a Monster Zone.');
      } else {
        this.showHint(`Choose ${p.needed} Tribute${p.needed === 1 ? '' : 's'} (${picks.length}/${p.needed}).`);
      }
      return;
    }

    if (p?.kind === 'summon' || p?.kind === 'setMonster') {
      if (side !== 'player' || zone !== 'monsters' || card) return;
      this.finishSummon(index);
      return;
    }

    if (p?.kind === 'setSpell') {
      if (side !== 'player' || zone !== 'spells' || card) return;
      this.finishSetSpell(index);
      return;
    }

    if (p?.kind === 'spellTarget') {
      if (side !== 'ai' || zone !== 'spells' || !card?.faceDown) {
        this.toast('Choose one of Kaiba\u2019s Set cards.');
        return;
      }
      this.finishSpellTarget(index);
      return;
    }

    if (p?.kind === 'attack') {
      if (side === 'ai' && zone === 'monsters' && card) {
        this.declareAttack(index);
        return;
      }
      if (side === 'player' && zone === 'monsters' && card) {
        this.pending = null;
        this.renderBoard();
        this.showHint('Attack cancelled.');
        return;
      }
      return;
    }

    if (side === 'player') {
      if (zone === 'monsters' && card) {
        const st = this.engine.state;
        if (st.phase === 'battle' && st.active === 'player' && !card.faceDown && card.position === 'attack' && !card.hasAttacked && card.summonedTurn !== st.turn) {
          this.pending = { kind: 'attack', index };
          this.sel = null;
          this.audio.play('select');
          this.renderAll();
          this.showHint(st.players.ai.monsters.some(Boolean) ? 'Select an enemy monster to attack.' : 'Attack directly!');
          return;
        }
        this.selectMonster(side, index);
        return;
      }
      if (zone === 'spells' && card) {
        this.selectSpell(side, index);
        return;
      }
      if (!card) {
        this.toast(zone === 'monsters' ? 'Empty Monster Zone.' : 'Empty Spell/Trap Zone.');
      }
      return;
    }

    if (card) {
      if (zone === 'monsters') this.selectMonster(side, index);
      else this.selectSpell(side, index);
    } else {
      this.toast('No card there.');
    }
  }

  onTrayAction(act) {
    if (this.busy) return;
    if (act === 'cancel') {
      this.audio.play('ui');
      this.clearSelection();
      this.showHint('');
      return;
    }
    const card = this.getSelectedCard();
    if (!card) return;
    if (act === 'summon' || act === 'setMonster') {
      const need = this.engine.tributesFor(card);
      if (need > 0) {
        this.pending = { kind: 'tribute', uid: card.uid, mode: act, needed: need, picks: [] };
        this.renderAll();
        this.showHint(`Choose ${need} Tribute${need === 1 ? '' : 's'} from your field.`);
        return;
      }
      this.pending = { kind: act === 'summon' ? 'summon' : 'setMonster', uid: card.uid, mode: act, tributes: [] };
      this.renderAll();
      this.showHint('Choose a Monster Zone.');
      return;
    }
    if (act === 'setSpell') {
      this.pending = { kind: 'setSpell', uid: card.uid };
      this.renderAll();
      this.showHint('Choose a Spell/Trap Zone.');
      return;
    }
    if (act === 'activate') {
      if (!this.engine.spellPlayable('player', card)) { this.toast('No valid target.'); return; }
      if (card.spell === 'cyclone') {
        this.pending = { kind: 'spellTarget', uid: card.uid };
        this.renderAll();
        this.showHint('Select a Set Spell/Trap to destroy.');
        return;
      }
      this.playerAction(() => this.engine.activateSpell('player', card.uid));
      return;
    }
    if (act === 'activateSet') {
      if (this.sel?.kind === 'spell') {
        const idx = this.sel.index;
        this.playerAction(() => this.engine.activateSetSpell('player', idx));
      }
      return;
    }
    if (act === 'attack') {
      this.pending = { kind: 'attack', index: this.sel.index };
      this.sel = null;
      this.renderAll();
      this.showHint(this.engine.state.players.ai.monsters.some(Boolean) ? 'Select an enemy monster to attack.' : 'Attack directly!');
      return;
    }
    if (act === 'position') {
      this.playerAction(() => this.engine.togglePosition('player', this.sel.index));
    }
  }

  finishSummon(zone) {
    const p = this.pending;
    if (!p) return;
    const faceDown = p.mode === 'setMonster';
    this.playerAction(() => this.engine.summon('player', p.uid, zone, { faceDown, tributes: p.tributes || [] }));
  }

  finishSetSpell(zone) {
    const p = this.pending;
    if (!p) return;
    this.playerAction(() => this.engine.setSpellTrap('player', p.uid, zone));
  }

  finishSpellTarget(index) {
    const p = this.pending;
    if (!p) return;
    this.playerAction(() => this.engine.activateSpell('player', p.uid, { index }));
  }

  /* ------------------------------------------------------------------ */
  /* Actions                                                             */
  /* ------------------------------------------------------------------ */

  async playerAction(fn) {
    if (this.busy || this.engine.state.over) return;
    this.busy = true;
    this.renderControls();
    const before = this.captureRects();
    const result = fn();
    if (!result.ok) {
      this.busy = false;
      this.renderControls();
      this.toast(result.message);
      this.audio.play('ui');
      return;
    }
    this.sel = null;
    this.pending = null;
    await this.handleResult(result, before);
    this.busy = false;
    this.renderAll();
  }

  async enterBattle() {
    if (this.busy) return;
    this.busy = true;
    this.renderControls();
    const before = this.captureRects();
    const result = this.engine.startBattle('player');
    if (!result.ok) {
      this.busy = false;
      this.renderControls();
      this.toast(result.message);
      return;
    }
    this.audio.play('phase');
    await this.handleResult(result, before);
    this.busy = false;
    this.renderAll();
    this.showHint('Tap one of your monsters, then tap a target.');
  }

  async declareAttack(targetIndex, direct = false) {
    const p = this.pending;
    if (p?.kind !== 'attack') return;
    if (this.busy) return;
    const index = p.index;
    this.busy = true;
    this.renderControls();
    const before = this.captureRects();
    const result = this.engine.attack('player', index, targetIndex);
    if (!result.ok) {
      this.busy = false;
      this.pending = { kind: 'attack', index };
      this.renderControls();
      this.toast(result.message);
      return;
    }
    this.pending = null;
    this.sel = null;
    await this.handleResult(result, before);
    this.busy = false;
    this.renderAll();
    if (!this.engine.state.over && this.engine.state.phase === 'battle') {
      this.showHint('Select another monster or end your turn.');
    }
  }

  async endPlayerTurn() {
    if (this.busy || this.engine.state.over) return;
    this.busy = true;
    this.sel = null;
    this.pending = null;
    this.renderAll();
    const before = this.captureRects();
    const result = this.engine.endTurn('player');
    if (!result.ok) {
      this.busy = false;
      this.renderControls();
      this.toast(result.message);
      return;
    }
    this.audio.play('ui');
    await this.handleResult(result, before);
    if (this.engine.state.over) {
      this.busy = false;
      this.renderAll();
      return;
    }
    await sleep(420);
    await this.runAiTurn();
  }

  /* ------------------------------------------------------------------ */
  /* Result / events                                                     */
  /* ------------------------------------------------------------------ */

  captureRects() {
    const map = new Map();
    document.querySelectorAll('.game-card[data-uid]').forEach((el) => {
      if (el.closest('.tray')) return;
      const r = el.getBoundingClientRect();
      if (r.width && !map.has(el.dataset.uid)) map.set(el.dataset.uid, r);
    });
    ['lp-player', 'lp-ai'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) map.set(id, el.getBoundingClientRect());
    });
    return map;
  }

  async handleResult(result, before) {
    if (!result.ok) {
      this.toast(result.message);
      return false;
    }
    const events = result.events || [];
    const attackEvent = events.find((e) => e.type === 'attack');
    const interruptingTrap = events.find((e) => e.type === 'trap' && ['mirror', 'reflect'].includes(e.trap));
    if (attackEvent && !interruptingTrap) {
      await this.attackCinematic(attackEvent, before);
    }
    this.clearSelection();
    this.renderAll();
    await this.playEvents(events, before);
    if (this.engine.state.over) await this.finishGame();
    return true;
  }

  async attackCinematic(event, before) {
    const a = before.get(event.attacker.uid);
    const targetUid = event.direct ? (event.side === 'player' ? 'lp-ai' : 'lp-player') : event.target?.uid;
    const b = targetUid ? before.get(targetUid) : null;
    if (!a || !b) return;
    const attackerEl = document.querySelector(`.board .game-card[data-uid="${event.attacker.uid}"]`);
    const color = event.side === 'player' ? '#9fe9ff' : '#ff9b7a';
    this.audio.play('attack');
    if (attackerEl) attackerEl.classList.add('attacking');
    this.fx.ring(a.x, a.y, color, { radius: 8, max: 46, speed: 190, life: 0.25, width: 3 });
    await sleep(80);
    await this.fx.beamPoints(a.x, a.y, b.x, b.y, color, { width: event.side === 'player' ? 5 : 4.5, duration: 0.28 });
    if (attackerEl) attackerEl.classList.remove('attacking');
  }

  async playEvents(events, before, { skipAttack = false } = {}) {
    const st = this.engine.state;
    const ordered = [...events].sort((a, b) => {
      const priority = { trap: 0, reveal: 1, attack: 2, destroy: 3, damage: 4, heal: 5, draw: 6, buff: 7, tribute: 3, summon: 2, set: 2, activate: 0, position: 2 };
      return (priority[a.type] ?? 8) - (priority[b.type] ?? 8);
    });
    for (const ev of ordered) {
      if (ev.type === 'trap') {
        this.showBanner(ev.card.name, 'TRAP ACTIVATED', 'trap', 900);
        this.audio.play('trap');
        this.fx.flash(ATTRIBUTES[ev.card.attribute]?.color || '#e66dff', 0.24);
        const r = before.get(ev.card.uid);
        if (r) {
          this.fx.ring(r.x, r.y, '#e66dff', { radius: 12, max: 90, speed: 220, width: 4, life: 0.5 });
          this.fx.burst(r.x, r.y, '#f0a6ff', { count: 24, speed: 250, size: 2.4, life: 0.8 });
        }
        await sleep(520);
      } else if (ev.type === 'attack') {
        if (skipAttack) continue;
        if (ev.trap === 'mirror' || ev.trap === 'reflect') continue;
        const targetId = ev.direct ? (ev.side === 'player' ? 'lp-ai' : 'lp-player') : ev.target?.uid;
        const b = targetId ? before.get(targetId) : null;
        if (b) {
          this.audio.play('impact');
          this.fx.burst(b.x, b.y, ev.side === 'player' ? ['#ffd27a', '#fff3c4', '#ff9b4a'] : ['#ff6d6d', '#ffb36b', '#ffe0b0'], { count: 26, speed: 260, gravity: 90, size: 2.8, life: 0.75, shards: true });
          this.fx.ring(b.x, b.y, '#fff3c4', { radius: 6, max: 70, speed: 220, width: 4, life: 0.35 });
          this.fx.shake(document.getElementById('board-stage'), ev.direct ? 12 : 8);
        }
        await sleep(180);
      } else if (ev.type === 'destroy') {
        const r = before.get(ev.card.uid);
        if (r) {
          const color = ATTRIBUTES[ev.card.attribute]?.color || '#e8c36a';
          this.fx.burst(r.x, r.y, [color, '#ffffff', '#ffb36b'], { count: 30, speed: 320, gravity: 130, size: 2.6, life: 0.9, shards: true });
          this.fx.ring(r.x, r.y, color, { radius: 10, max: 74, speed: 230, width: 3, life: 0.4 });
        }
        this.audio.play('impact');
        await sleep(220);
      } else if (ev.type === 'damage') {
        const r = before.get(ev.side === 'player' ? 'lp-player' : 'lp-ai') || document.getElementById(ev.side === 'player' ? 'lp-player' : 'lp-ai').getBoundingClientRect();
        this.fx.text(r.x, r.y, `-${ev.amount}`, ev.side === 'player' ? '#ff6b7e' : '#ffd27a', { size: ev.amount >= 1000 ? 32 : 24, cls: 'damage' });
        this.audio.play('damage');
        this.fx.flash(ev.side === 'player' ? '#ff3b5c' : '#ffcc66', 0.2);
        const hud = document.getElementById(`hud-${ev.side}`);
        hud.classList.remove('hit');
        void hud.offsetWidth;
        hud.classList.add('hit');
        await sleep(300);
      } else if (ev.type === 'heal') {
        const r = before.get(ev.side === 'player' ? 'lp-player' : 'lp-ai') || document.getElementById(ev.side === 'player' ? 'lp-player' : 'lp-ai').getBoundingClientRect();
        this.fx.text(r.x, r.y, `+${ev.amount}`, '#6dffb0', { size: 24 });
        this.audio.play('heal');
        await sleep(220);
      } else if (ev.type === 'draw') {
        this.audio.play('draw');
        if (ev.side === 'player') {
          this.drawPulse = new Set(ev.cards.map((c) => c.uid));
          this.renderHand();
          requestAnimationFrame(() => this.layoutHand());
        }
        await sleep(ev.side === 'player' ? 280 : 140);
      } else if (ev.type === 'summon') {
        this.audio.play(ev.special ? 'special' : 'summon');
        const el = document.querySelector(`.board .game-card[data-uid="${ev.card.uid}"]`);
        if (el) {
          el.classList.add('summon-in');
          el.closest('.zone')?.classList.add('summon-flash');
          const r = el.getBoundingClientRect();
          const color = ATTRIBUTES[ev.card.attribute]?.color || '#e8c36a';
          this.fx.ring(r.x, r.y, color, { radius: 8, max: 100, speed: 250, width: 4, life: 0.6 });
          this.fx.burst(r.x, r.y, [color, '#fff7d6'], { count: 28, speed: 230, gravity: -30, size: 2.4, life: 0.9 });
          this.fx.text(r.x, r.y - r.height * 0.4, ev.special ? 'SPECIAL SUMMON' : 'SUMMON', color, { size: 18, cls: 'summon' });
        }
        await sleep(420);
      } else if (ev.type === 'set') {
        this.audio.play('set');
        const el = document.querySelector(`.board .game-card[data-uid="${ev.card.uid}"]`);
        if (el) {
          el.classList.add('set-in');
          el.closest('.zone')?.classList.add('summon-flash');
        }
        await sleep(260);
      } else if (ev.type === 'activate') {
        this.showBanner(ev.card.name, 'SPELL ACTIVATED', 'spell', 900);
        this.audio.play('special');
        this.fx.flash(ATTRIBUTES.SPELL.color, 0.18);
        await sleep(360);
      } else if (ev.type === 'tribute') {
        const r = before.get(ev.card.uid);
        if (r) {
          this.fx.burst(r.x, r.y, ['#e8c36a', '#fff3c4'], { count: 20, speed: 180, gravity: 80, size: 2, life: 0.7, shards: true });
          this.fx.text(r.x, r.y, 'TRIBUTE', '#e8c36a', { size: 16 });
        }
        await sleep(180);
      } else if (ev.type === 'reveal' || ev.type === 'position') {
        this.audio.play('set');
        const uid = ev.card?.uid;
        if (uid) {
          const el = document.querySelector(`.board .game-card[data-uid="${uid}"]`);
          if (el) el.classList.add('flip-in');
        }
        await sleep(240);
      } else if (ev.type === 'buff') {
        this.audio.play('heal');
        this.showBanner(ev.stat === 'atk' ? `ATK +${ev.amount}` : `DEF +${ev.amount}`, `${ev.count} MONSTER${ev.count === 1 ? '' : 'S'} EMPOWERED`, 'gold', 700);
        await sleep(300);
      } else if (ev.type === 'turnstart') {
        this.showBanner(ev.side === 'player' ? 'YOUR TURN' : 'KAIBA\u2019S TURN', `TURN ${String(ev.turn).padStart(2, '0')}`, ev.side === 'player' ? 'gold' : 'violet', 900);
        this.audio.play('turn');
        await sleep(420);
      } else if (ev.type === 'phase') {
        this.showBanner('BATTLE PHASE', ev.side === 'player' ? 'ATTACK NOW' : 'KAIBA ATTACKS', 'violet', 800);
        await sleep(360);
      } else if (ev.type === 'gameover') {
        await sleep(500);
      }
    }
    if (st.over) await this.finishGame();
  }

  async runAiTurn() {
    if (this.engine.state.over) return;
    this.busy = true;
    this.renderAll();
    this.showHint('Kaiba is taking his turn\u2026', { sticky: true });
    await sleep(520);

    for (let i = 0; i < 3; i++) {
      if (this.engine.state.over) break;
      const plan = this.engine.aiSpellPlan('ai');
      if (!plan) break;
      const before = this.captureRects();
      const result = this.engine.activateSpell('ai', plan.uid, plan.target);
      if (!result.ok) break;
      await this.handleResult(result, before);
      await sleep(380);
    }

    if (!this.engine.state.over) {
      const plan = this.engine.aiSummonPlan('ai');
      if (plan) {
        const before = this.captureRects();
        const result = this.engine.summon('ai', plan.uid, plan.zone, { faceDown: false, tributes: plan.tributes });
        if (result.ok) {
          await this.handleResult(result, before);
          await sleep(360);
        }
      }
    }

    for (let i = 0; i < 2; i++) {
      if (this.engine.state.over) break;
      const plan = this.engine.aiSetPlan('ai');
      if (!plan) break;
      const before = this.captureRects();
      const result = this.engine.setSpellTrap('ai', plan.uid, plan.zone);
      if (!result.ok) break;
      await this.handleResult(result, before);
      await sleep(300);
    }

    if (!this.engine.state.over) {
      const attacks = this.engine.aiAttackPlan('ai');
      if (attacks.length) {
        const before = this.captureRects();
        const phase = this.engine.startBattle('ai');
        if (phase.ok) {
          await this.handleResult(phase, before);
          await sleep(300);
        }
        for (let i = 0; i < 8; i++) {
          if (this.engine.state.over) break;
          const next = this.engine.aiAttackPlan('ai');
          if (!next.length) break;
          const attack = next[0];
          const before = this.captureRects();
          const result = this.engine.attack('ai', attack.index, attack.target);
          if (!result.ok) break;
          await this.handleResult(result, before);
          await sleep(280);
        }
      }
    }

    if (!this.engine.state.over) {
      const before = this.captureRects();
      const result = this.engine.endTurn('ai');
      if (result.ok) await this.handleResult(result, before);
    }

    this.busy = false;
    this.renderAll();
    if (!this.engine.state.over) {
      this.showHint('Your turn. Tap a card to begin.');
      this.audio.play('turn');
    }
  }

  async finishGame() {
    if (this.resultShown) return;
    this.resultShown = true;
    const st = this.engine.state;
    const won = st.winner === 'player';
    this.el.resultSub.textContent = st.reason || (won ? 'The heart of the cards was with you.' : 'The duel is over.');
    this.el.resultTitle.textContent = won ? 'VICTORY' : 'DEFEAT';
    this.el.resultTitle.className = `result-title ${won ? 'win' : 'lose'}`;
    this.el.resultStats.innerHTML = `<span>TURNS <b>${st.turn}</b></span><span>YOUR LP <b>${Math.max(0, st.players.player.lp)}</b></span><span>KAIBA LP <b>${Math.max(0, st.players.ai.lp)}</b></span>`;
    this.el.result.hidden = false;
    this.audio.play(won ? 'win' : 'lose');
    if (won) {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => this.fx.burst(window.innerWidth * (0.2 + Math.random() * 0.6), window.innerHeight * 0.3, ['#ffd77a', '#fff3c4', '#6df0d0', '#ff8ad8'], { count: 30, speed: 330, gravity: 120, size: 3, life: 1.4, shards: true }), i * 140);
      }
    }
    this.audio.stopAmbient();
  }

  /* ------------------------------------------------------------------ */
  /* Small UI helpers                                                    */
  /* ------------------------------------------------------------------ */

  showHint(text, { sticky = false } = {}) {
    clearTimeout(this.hintTimer);
    const el = this.el.hint;
    if (!text) {
      el.classList.remove('on');
      return;
    }
    el.innerHTML = `<span class="hint-mark"></span>${text}`;
    el.classList.add('on');
    if (!sticky) this.hintTimer = setTimeout(() => el.classList.remove('on'), 2800);
  }

  toast(text) {
    if (!text) return;
    clearTimeout(this.toastTimer);
    this.el.toast.textContent = text;
    this.el.toast.classList.add('on');
    this.toastTimer = setTimeout(() => this.el.toast.classList.remove('on'), 2200);
  }

  showBanner(title, sub = '', tone = 'gold', duration = 900) {
    clearTimeout(this.bannerTimer);
    const el = this.el.banner;
    const hold = Math.max(500, duration);
    el.style.setProperty('--banner-dur', `${hold}ms`);
    el.className = `banner on tone-${tone}`;
    el.innerHTML = `<span class="banner-kicker">${sub}</span><b>${title}</b>`;
    this.bannerTimer = setTimeout(() => el.classList.remove('on'), hold);
  }
}
