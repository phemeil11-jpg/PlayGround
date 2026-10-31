/* POLARIS — presentation layer. Touch-first, no iconography, no imagery. */

import { CARD_DEFS, ELEMENTS, cardDef, tributeCount } from './cards.js';
import { atkOf, defOf } from './engine.js';

const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const TYPE_LABEL = { monster: 'MONSTER', spell: 'MAGIC', trap: 'TRAP' };

function effectTag(def) {
  if (def.type === 'monster') {
    if (def.onSummon === 'heal600') return 'HEAL 600';
    if (def.onSummon === 'burn800') return 'BURN 800';
    if (def.onSummon === 'buff300') return 'ATK +300';
    if (def.onDestroyed === 'draw1') return 'DRAW 1';
    if (def.shield) return 'SHIELD';
    if (def.piercing) return 'PIERCE';
    if (def.level >= 5) return `TRIBUTE ${def.level >= 7 ? 2 : 1}`;
    return 'VANILLA';
  }
  if (def.type === 'spell') {
    return { equip: 'EQUIP +800', destroy: 'DESTROY', bind: 'FREEZE 2', draw: 'DRAW 2', heal: 'HEAL 1200', revive: 'REVIVE' }[def.spell] || 'MAGIC';
  }
  return { negateHeal: 'NEGATE / HEAL', weaken: 'ATK −1000', reflect: 'REFLECT 500', summonBurn: 'BURN 700', destroyAttacker: 'DESTROY ATK' }[def.trap] || 'TRAP';
}

function cardMarkup(card, options = {}) {
  const {
    context = 'hand', owner = 0, row = 'monsters', zone = 0,
    hidden = false, ownSet = false, selected = false, targetable = false,
  } = options;
  if (hidden) {
    return `<div class="card back ${context}${targetable ? ' targetable' : ''}" aria-hidden="true">
      <span class="back-word">POLARIS</span>
      <span class="back-rule"></span>
      <span class="back-caption">${TYPE_LABEL[cardDef(card)?.type] || 'CARD'}</span>
    </div>`;
  }
  const def = cardDef(card);
  if (!def) return '';
  const tone = ELEMENTS[def.element]?.color || '#8ee9ff';
  const isMonster = def.type === 'monster';
  const pos = card.position || (ownSet ? 'def' : 'atk');
  const rot = ((def.mark.charCodeAt(0) * 7) % 18) - 9;
  const posLabel = ownSet ? 'SET' : isMonster ? pos.toUpperCase() : (def.type === 'spell' ? 'MAGIC' : 'TRAP');
  const stats = isMonster
    ? `<span class="${pos === 'atk' ? 'on' : ''}">ATK <b>${atkOf(card)}</b></span>
       <span class="${pos === 'def' ? 'on' : ''}">DEF <b>${defOf(card)}</b></span>`
    : `<span class="on">${def.type === 'spell' ? 'MAGIC' : 'TRAP'}</span><span>${def.type === 'spell' ? (def.spell || '').toUpperCase() : (def.trap || '').toUpperCase()}</span>`;
  const level = isMonster ? `Lv ${def.level}` : TYPE_LABEL[def.type];
  const buffed = isMonster && (card.buff || 0) !== 0;
  return `<div class="card ${context}${selected ? ' selected' : ''}${targetable ? ' targetable' : ''}${ownSet ? ' setface' : ''}${card.frozen ? ' frozen' : ''}"
    data-uid="${card.uid}" data-owner="${owner}" data-row="${row}" data-zone="${zone}" data-type="${def.type}"
    style="--tone:${tone};--rot:${rot}deg">
    <div class="card-head">
      <span class="card-level">${level}</span>
      <span class="card-element">${ELEMENTS[def.element]?.label || ''}</span>
    </div>
    <div class="card-name">${def.name}</div>
    <div class="card-art">
      <span class="card-mark">${def.mark}</span>
      <span class="card-en">${def.en}</span>
      <span class="card-tag">${ownSet ? 'SET / ' : ''}${effectTag(def)}</span>
    </div>
    <div class="card-stats">${stats}</div>
    <span class="card-position">${card.frozen ? 'FROZEN' : posLabel}</span>
    ${buffed ? `<span class="card-buff">${card.buff > 0 ? '+' : ''}${card.buff}</span>` : ''}
  </div>`;
}

function backMarkup(context = 'mini') {
  return `<div class="card back ${context}" aria-hidden="true">
    <span class="back-word">POLARIS</span><span class="back-rule"></span>
  </div>`;
}

export class UI {
  constructor(options = {}) {
    this.onAction = options.onAction || (() => {});
    this.onInvite = options.onInvite || (() => {});
    this.onRematch = options.onRematch || (() => {});
    this.onName = options.onName || (() => {});
    this.onSfx = options.onSfx || (() => {});
    this.onSoundToggle = options.onSoundToggle || (async () => false);
    this.onTiltToggle = options.onTiltToggle || (async () => false);
    this.onReduceMotion = options.onReduceMotion || (() => {});
    this.onCopyRoom = options.onCopyRoom || (() => {});
    this.onRules = options.onRules || (() => {});
    this.getRoomUrl = options.getRoomUrl || (() => location.href);

    this.state = null;
    this.you = 0;
    this.room = '-----';
    this.network = { status: 'linking', detail: '回線を探索中' };
    this.options = { sound: false, tilt: false, reduceMotion: false };
    this.selectedHand = null;
    this.selectedMonster = null; // { p, z }
    this.pending = null; // { type: 'place'|'target'|'attack', ... }
    this.sending = false;
    this.lastEventId = 0;
    this.lastStartedAt = 0;
    this.prevLp = [8000, 8000];
    this.prevTurn = 0;
    this.prevActive = 0;
    this.resultShown = false;
    this.resultTimer = 0;
    this.handSize = null;
    this.logOpen = false;
    this.confirmSurrender = 0;
    this.modalView = '';
    this.bannerTimer = 0;
    this.toastTimer = 0;
    this.captionTimer = 0;

    this.bindStatic();
    this.renderShell();
  }

  setOptions(options) {
    Object.assign(this.options, options || {});
  }

  setNetwork(info) {
    this.network = { ...this.network, ...info };
    this.updateLinkDot();
    if (this.modalView === 'settings') this.renderModal();
  }

  setRoom(room) {
    this.room = String(room || '-----').toUpperCase();
    $('roomCode').textContent = this.room;
    $('roomCode').setAttribute('aria-label', `ルーム ${this.room}`);
  }

  update(state, meta = {}) {
    if (meta.you !== undefined) this.you = meta.you;
    if (meta.room) this.setRoom(meta.room);
    if (meta.options) this.setOptions(meta.options);
    if (meta.network) this.setNetwork(meta.network);
    this.state = state;
    if (!state) return;

    if (state.startedAt !== this.lastStartedAt) {
      const first = this.lastStartedAt === 0;
      this.lastStartedAt = state.startedAt;
      this.resultShown = false;
      this.handSize = null;
      this.clearSelection(false);
      $('result').hidden = true;
      this.lastEventId = first ? state.eventSeq : 0;
      this.prevLp = [state.players[0].lp, state.players[1].lp];
      this.prevTurn = state.turn;
      this.prevActive = state.active;
    }

    if (this.prevActive !== state.active || this.prevTurn !== state.turn) {
      const wasMyTurn = this.prevActive === this.you;
      this.prevActive = state.active;
      this.prevTurn = state.turn;
      if (wasMyTurn || !state.over) this.clearSelection(false);
    }

    this.sending = false;
    this.validateSelection();
    this.render();
    this.processEvents();
  }

  validateSelection() {
    if (!this.state) return;
    const me = this.state.players[this.you];
    if (this.selectedHand && !me.hand.some((c) => c.uid === this.selectedHand)) this.selectedHand = null;
    if (this.selectedMonster) {
      const p = this.state.players[this.selectedMonster.p];
      if (!p.monsters[this.selectedMonster.z]) this.selectedMonster = null;
    }
    if (this.pending && this.pending.type === 'place') {
      const card = me.hand.find((c) => c.uid === this.pending.uid);
      if (!card) this.pending = null;
    }
    if (this.pending && this.pending.type === 'target') {
      if (!me.hand.some((c) => c.uid === this.pending.uid)) this.pending = null;
    }
    if (this.pending && this.pending.type === 'attack') {
      const card = me.monsters[this.pending.zone];
      if (!card || card.hasAttacked) this.pending = null;
    }
  }

  clearSelection(render = true) {
    this.selectedHand = null;
    this.selectedMonster = null;
    this.pending = null;
    if (render) this.render();
  }

  dispatch(action) {
    if (this.sending) return;
    this.sending = true;
    this.clearSelection(false);
    this.render();
    this.onAction(action);
    clearTimeout(this.sendTimer);
    this.sendTimer = setTimeout(() => { this.sending = false; this.render(); }, 2600);
  }

  abortSend() {
    this.sending = false;
    clearTimeout(this.sendTimer);
    this.render();
  }

  /* ── shell ─────────────────────────────────────────────────── */

  bindStatic() {
    $('inviteBtn').addEventListener('click', () => this.onInvite());
    $('roomBtn').addEventListener('click', () => this.onInvite());
    $('brandBtn').addEventListener('click', () => this.showRules());
    $('logBtn').addEventListener('click', () => this.toggleLog());
    $('logClose').addEventListener('click', () => this.toggleLog(false));
    $('settingsBtn').addEventListener('click', () => this.openSettings());
    $('modalClose').addEventListener('click', () => this.closeModal());
    $('modal').addEventListener('click', (event) => {
      if (event.target === $('modal')) this.closeModal();
    });
    $('rematchBtn').addEventListener('click', () => this.onRematch());
    $('resultInviteBtn').addEventListener('click', () => this.onInvite());
    $('resultCloseBtn').addEventListener('click', () => { $('result').hidden = true; });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (!$('modal').hidden) this.closeModal();
      else if (this.logOpen) this.toggleLog(false);
      else this.clearSelection();
    });

    for (const id of ['myMonsters', 'mySpells', 'oppMonsters', 'oppSpells']) {
      const el = $(id);
      el.addEventListener('click', (event) => {
        const zone = event.target.closest('.zone');
        if (!zone) return;
        this.handleZoneClick(Number(zone.dataset.owner), zone.dataset.row, Number(zone.dataset.zone));
      });
    }
    $('hand').addEventListener('click', (event) => {
      const card = event.target.closest('.card');
      if (!card || card.classList.contains('back')) return;
      this.selectHand(card.dataset.uid);
    });
    $('actionbar').addEventListener('click', (event) => {
      const button = event.target.closest('[data-act]');
      if (!button || button.disabled) return;
      this.handleAction(button.dataset.act);
    });
  }

  renderShell() {
    this.updateLinkDot();
  }

  updateLinkDot() {
    const dot = $('linkDot');
    dot.className = `link-dot ${this.network.status === 'online' ? 'on' : this.network.status === 'lost' ? 'warn' : ''}`;
    dot.title = this.network.status === 'online' ? 'ルーム回線に接続済み' : 'ルーム回線を再接続中';
  }

  /* ── render ────────────────────────────────────────────────── */

  render() {
    const state = this.state;
    if (!state) return;
    const me = state.players[this.you];
    const opp = state.players[1 - this.you];
    const myTurn = state.active === this.you && !state.over;

    $('myName').textContent = me.name;
    $('oppName').textContent = opp.name;
    $('oppTag').textContent = opp.tag;
    $('myAvatar').firstElementChild.textContent = this.you === 0 ? '極' : '挑';
    $('oppAvatar').firstElementChild.textContent = state.mode === 'online' ? (this.you === 0 ? '挑' : '極') : '氷';
    $('myLP').textContent = me.lp;
    $('oppLP').textContent = opp.lp;
    $('myLPBar').style.width = `${Math.max(0, Math.min(100, me.lp / 80))}%`;
    $('oppLPBar').style.width = `${Math.max(0, Math.min(100, opp.lp / 80))}%`;
    $('myDeck').textContent = me.deck.length;
    $('oppDeck').textContent = opp.deck.length;
    $('myHand').textContent = me.hand.length;
    $('oppHand').textContent = opp.hand.length;
    $('myGY').textContent = me.grave.length;
    $('oppGY').textContent = opp.grave.length;
    $('myTag').textContent = state.mode === 'online'
      ? (this.you === 0 ? 'HOST / 極夜回線' : 'GUEST / 氷原回線')
      : 'HOST / 極夜回線';
    if (this.network.status !== 'online') {
      $('oppTag').textContent = state.mode === 'online' ? 'REMOTE / 再接続中' : 'HOLOGRAM / 訓練投影';
    } else {
      $('oppTag').textContent = state.mode === 'online' ? 'REMOTE / 通信対戦' : 'HOLOGRAM / 訓練投影';
    }

    if (this.prevLp[0] > me.lp) this.flashElement($('myLPBar'), 'lp-hit');
    if (this.prevLp[1] > opp.lp) this.flashElement($('oppLPBar'), 'lp-hit');
    this.prevLp = [me.lp, opp.lp];

    this.renderOpponentHand(opp);
    this.renderBoard();
    this.renderHand(me);
    this.renderInfo();
    this.renderActionbar();
    this.renderMidline();
    this.renderLog();

    $('phaseLabel').textContent = state.over
      ? (state.winner === this.you ? 'VICTORY' : 'DEFEAT')
      : myTurn ? 'YOUR TURN' : 'OPPONENT TURN';
    $('phaseLabel').classList.toggle('live', myTurn);

    if (state.over) this.maybeResult();
  }

  renderOpponentHand(opp) {
    const count = Math.min(8, opp.hand.length);
    const parts = [];
    for (let i = 0; i < count; i++) {
      const mid = (count - 1) / 2;
      parts.push(`<div class="mini-wrap" style="--i:${i - mid};--n:${count}">${backMarkup('mini')}</div>`);
    }
    if (!count) parts.push('<span class="empty-label">NO HAND</span>');
    $('oppHandRow').innerHTML = parts.join('');
  }

  viewerHidden(owner, card) {
    return Boolean(card && (card.hidden || (owner !== this.you && card.faceDown)));
  }

  renderBoard() {
    const state = this.state;
    for (const [owner, row, el] of [
      [0, 'monsters', $('myMonsters')],
      [0, 'spells', $('mySpells')],
      [1, 'monsters', $('oppMonsters')],
      [1, 'spells', $('oppSpells')],
    ]) {
      const cards = state.players[owner][row];
      const html = cards.map((card, zone) => {
        const targetable = this.zoneTargetable(owner, row, zone, card);
        let inner = '';
        if (card) {
          const hidden = this.viewerHidden(owner, card);
          const ownSet = owner === this.you && card.faceDown;
          const selected = Boolean(this.selectedMonster && this.selectedMonster.p === owner && this.selectedMonster.z === zone);
          inner = cardMarkup(card, { context: 'board', owner, row, zone, hidden, ownSet, selected, targetable });
        }
        const emptyGlow = this.pending?.type === 'place' && owner === this.you && this.pendingRow() === row && !card;
        const emptyLabel = emptyGlow ? 'PLACE' : row === 'monsters' ? 'MONSTER' : 'SPELL';
        const innerFinal = inner || `<span class="zone-empty">${emptyLabel}</span>`;
        return `<div class="zone${targetable ? ' targetable' : ''}${emptyGlow ? ' targetable' : ''}${card ? ' occupied' : ''}${selectedZone(this, owner, zone) ? ' selected' : ''}"
          id="zone-${owner}-${row}-${zone}" data-owner="${owner}" data-row="${row}" data-zone="${zone}"
          role="button" tabindex="${this.interactiveZone(owner, row, zone, card) ? '0' : '-1'}"
          aria-label="${card ? (this.viewerHidden(owner, card) ? '伏せられたカード' : esc(cardDef(card)?.name || 'カード')) : '空きマス'}">
          ${innerFinal}
        </div>`;
      }).join('');
      el.innerHTML = html;
    }
  }

  renderHand(me) {
    const handEl = $('hand');
    const state = this.state;
    const scroll = handEl.scrollLeft;
    const grew = this.handSize !== null && me.hand.length > this.handSize;
    this.handSize = me.hand.length;
    if (!me.hand.length) {
      handEl.innerHTML = '<div class="hand-empty">手札は空だ。山札の星に祈れ。</div>';
      return;
    }
    const mid = (me.hand.length - 1) / 2;
    handEl.innerHTML = me.hand.map((card, i) => {
      const def = cardDef(card);
      const selected = this.selectedHand === card.uid;
      const aimed = this.pending?.type === 'target' && this.pending.uid === card.uid;
      const can = state.active === this.you && !state.over;
      return `<div class="hand-item" style="--i:${i - mid};--n:${me.hand.length}">
        ${cardMarkup(card, { context: 'hand', owner: this.you, row: 'hand', zone: i, selected: selected || aimed })}
        ${selected ? `<span class="hand-caret">SELECTED</span>` : ''}
        ${!can ? '' : '<span class="hand-legal"></span>'}
      </div>`;
    }).join('');
    requestAnimationFrame(() => {
      // A newly drawn card sits at the far end of the strip on narrow screens.
      if (grew && handEl.scrollWidth > handEl.clientWidth) {
        handEl.scrollTo({ left: handEl.scrollWidth, behavior: this.options.reduceMotion ? 'auto' : 'smooth' });
      } else {
        handEl.scrollLeft = scroll;
      }
      const selected = handEl.querySelector('.card.selected');
      if (selected && this.selectedHand) selected.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    });
  }

  renderInfo() {
    const strip = $('infoStrip');
    if (this.pending) {
      const text = this.pending.type === 'place'
        ? '光る空きマスをタップして配置する。'
        : this.pending.type === 'target'
          ? '光るモンスターをタップして対象にする。'
          : '相手モンスターをタップして攻撃。相手の場が空なら「直接攻撃」。';
      strip.innerHTML = `<span class="info-kicker">TARGET</span><span class="info-text">${text}</span>`;
      return;
    }
    if (this.selectedMonster) {
      const { p, z } = this.selectedMonster;
      const card = this.state.players[p].monsters[z];
      if (this.viewerHidden(p, card)) {
        strip.innerHTML = `<span class="info-kicker">FACE DOWN <em>守備表示</em></span><span class="info-text">相手の伏せモンスター。攻撃するか、破壊するまで正体は分からない。</span>`;
        return;
      }
      if (card) {
        const def = cardDef(card);
        const stats = def.type === 'monster' ? `ATK ${atkOf(card)} / DEF ${defOf(card)}` : TYPE_LABEL[def.type];
        strip.innerHTML = `<span class="info-kicker">${esc(def.name)} <em>${stats}</em></span><span class="info-text">${esc(def.text)}</span>`;
        return;
      }
    }
    if (this.selectedHand) {
      const card = this.state.players[this.you].hand.find((c) => c.uid === this.selectedHand);
      if (card) {
        const def = cardDef(card);
        const stats = def.type === 'monster'
          ? `Lv ${def.level} / ${ELEMENTS[def.element]?.label} / ATK ${def.atk} / DEF ${def.def}`
          : `${TYPE_LABEL[def.type]} / ${effectTag(def)}`;
        strip.innerHTML = `<span class="info-kicker">${esc(def.name)} <em>${stats}</em></span><span class="info-text">${esc(def.text)}</span>`;
        return;
      }
    }
    const myTurn = this.state.active === this.you && !this.state.over;
    strip.innerHTML = `<span class="info-kicker">${this.state.over ? 'DUEL COMPLETE' : myTurn ? 'YOUR MOVE' : 'OPPONENT'}</span>
      <span class="info-text">${this.state.over ? '再戦するか、盤面を眺めて余韻に浸れ。' : myTurn
        ? '手札をタップ → 召喚・セット・発動。盤面のカードをタップすると詳細が見える。'
        : '相手の手番。伏せた罠は攻撃宣言時に自動で発動する。'}</span>`;
  }

  renderMidline() {
    const state = this.state;
    $('turnLabel').textContent = `TURN ${String(state.turn).padStart(2, '0')}`;
    $('modeLabel').textContent = state.over ? 'DUEL COMPLETE' : state.mode === 'online' ? 'LIVE LINK' : 'ECHO LINK';
    if (!state.over) {
      $('phaseLabel').textContent = state.active === this.you ? 'YOUR TURN' : 'OPPONENT TURN';
      $('phaseLabel').classList.toggle('live', state.active === this.you);
    }
  }

  renderLog() {
    const list = $('logList');
    if (!this.state) return;
    list.innerHTML = this.state.log.map((entry) => `
      <li class="log-entry tone-${esc(entry.tone)}">
        <span class="log-turn">T${String(entry.turn).padStart(2, '0')}</span>
        <span class="log-text">${esc(entry.text)}</span>
      </li>`).join('');
    if (this.logOpen) list.scrollTop = 0;
  }

  renderActionbar() {
    const state = this.state;
    const bar = $('actionbar');
    if (!state) { bar.innerHTML = ''; return; }
    const myTurn = state.active === this.you && !state.over;
    const buttons = [];
    let hint = '';

    if (state.over) {
      hint = state.winner === this.you ? '極夜はあなたのものだ。' : '氷は静かに還った。';
      buttons.push(['再戦', 'primary', 'rematch']);
      buttons.push(['共有', 'ghost', 'share']);
      return this.paintBar(bar, hint, buttons);
    }

    if (this.pending) {
      hint = this.pending.type === 'place' ? '配置先を選択' : this.pending.type === 'target' ? '対象を選択' : '攻撃対象を選択';
      if (this.pending.type === 'attack' && !state.players[1 - this.you].monsters.some(Boolean)) {
        buttons.push(['直接攻撃', 'primary', 'direct']);
      }
      buttons.push(['キャンセル', 'ghost', 'cancel']);
      return this.paintBar(bar, hint, buttons);
    }

    if (this.selectedHand) {
      const card = state.players[this.you].hand.find((c) => c.uid === this.selectedHand);
      if (card) {
        const def = cardDef(card);
        if (def.type === 'monster') {
          const need = tributeCount(card);
          const zoneFree = state.players[this.you].monsters.some((c) => !c);
          const tributeAvailable = state.players[this.you].monsters.filter(Boolean).length >= need;
          // Tribute monsters are mandatory. A free zone alone is not enough to
          // pay the cost, and an empty field must never enable a tribute summon.
          const can = myTurn && !state.players[this.you].hasSummoned && (need === 0 ? zoneFree : tributeAvailable);
          buttons.push([need ? `生贄召喚 ${need}` : '召喚', 'primary', 'summon', !can]);
          buttons.push([need ? `セット ${need}` : 'セット', '', 'set-monster', !can]);
        } else if (def.type === 'spell') {
          const targetZone = state.players[1 - this.you].monsters.some(Boolean);
          const ownZone = state.players[this.you].monsters.some((c) => c && !c.faceDown);
          const backFree = state.players[this.you].spells.some((c) => !c);
          const graveMon = state.players[this.you].grave.some((c) => cardDef(c).type === 'monster');
          const zoneFree = state.players[this.you].monsters.some((c) => !c);
          let can = myTurn;
          if (def.spell === 'destroy' || def.spell === 'bind') can = can && targetZone;
          if (def.spell === 'equip') can = can && ownZone && backFree;
          if (def.spell === 'revive') can = can && graveMon && zoneFree;
          buttons.push(['発動', 'primary', 'activate-spell', !can]);
        } else if (def.type === 'trap') {
          const backFree = state.players[this.you].spells.some((c) => !c);
          buttons.push(['セット', 'primary', 'set-trap', !(myTurn && backFree)]);
        }
        buttons.push(['キャンセル', 'ghost', 'cancel']);
        hint = def.name;
        return this.paintBar(bar, hint, buttons);
      }
    }

    if (this.selectedMonster) {
      const { p, z } = this.selectedMonster;
      const card = state.players[p].monsters[z];
      if (this.viewerHidden(p, card)) {
        hint = '伏せられたモンスター';
        buttons.push(['キャンセル', 'ghost', 'cancel']);
        return this.paintBar(bar, hint, buttons);
      }
      if (card) {
        const def = cardDef(card);
        hint = def.name;
        if (p === this.you) {
          const canAct = myTurn;
          const canAttack = canAct && !card.faceDown && card.position === 'atk' && !card.hasAttacked;
          const canChange = canAct && !card.frozen && !card.positionChanged && !card.hasAttacked && card.summonedTurn !== state.turn;
          if (def.type === 'monster' && canAttack) buttons.push(['攻撃', 'primary', 'attack-mode']);
          if (canChange) {
            buttons.push([card.faceDown ? '反転召喚' : card.position === 'atk' ? '守備へ' : '攻撃へ', '', 'position', false]);
          }
        }
        buttons.push(['キャンセル', 'ghost', 'cancel']);
        return this.paintBar(bar, hint, buttons);
      }
    }

    hint = myTurn ? '手札を選択するか、ターンを終える。' : '相手の手番。';
    if (myTurn) buttons.push(['ターン終了', 'primary', 'end-turn']);
    buttons.push([this.confirmSurrender ? '本当に降参' : '降参', this.confirmSurrender ? 'danger' : 'ghost', 'surrender']);
    this.paintBar(bar, hint, buttons);
  }

  paintBar(bar, hint, buttons) {
    const disabled = this.sending;
    bar.innerHTML = `<span class="action-hint">${esc(hint)}</span>
      <span class="action-buttons">
      ${buttons.map(([label, kind, act, off]) => `<button class="btn ${kind}${off ? ' disabled' : ''}" data-act="${act}" ${off || disabled ? 'disabled' : ''} type="button">${label}</button>`).join('')}
      </span>`;
  }

  /* ── interaction ───────────────────────────────────────────── */

  selectHand(uid) {
    if (this.sending) return;
    this.pending = null;
    this.selectedMonster = null;
    this.selectedHand = this.selectedHand === uid ? null : uid;
    this.onSfx('select');
    this.render();
  }

  handleZoneClick(owner, row, zone) {
    if (this.sending || !this.state) return;
    const state = this.state;
    const card = state.players[owner][row][zone];

    if (this.pending?.type === 'place') {
      if (owner !== this.you) return;
      const wantRow = this.pendingRow();
      if (row !== wantRow || (card && !this.zoneTargetable(owner, row, zone, card))) {
        this.toast(row === 'monsters' ? '光るマスを選んでください。' : '光る空きマスを選んでください。', 'warn');
        return;
      }
      const type = this.pending.action;
      // A full field can still tribute-summon. The chosen occupied zone is the
      // destination and one of the monsters paid as tribute.
      this.dispatch({ type, uid: this.pending.uid, zone, ...(card ? { tributes: [zone] } : {}) });
      return;
    }

    if (this.pending?.type === 'target') {
      if (!card) return;
      if (!this.zoneTargetable(owner, row, zone, card)) {
        this.toast('対象が不正です。', 'warn');
        return;
      }
      this.dispatch({
        type: 'activateSpell',
        uid: this.pending.uid,
        target: { p: owner, z: zone },
      });
      return;
    }

    if (this.pending?.type === 'attack') {
      if (owner !== 1 - this.you || row !== 'monsters' || !card) return;
      this.dispatch({ type: 'attack', zone: this.pending.zone, target: { p: owner, z: zone } });
      return;
    }

    if (card && row === 'monsters') {
      this.selectedHand = null;
      this.selectedMonster = this.selectedMonster?.p === owner && this.selectedMonster?.z === zone
        ? null
        : { p: owner, z: zone };
      this.onSfx('select');
      this.render();
      return;
    }
    if (row === 'spells' && card) {
      this.selectedHand = null;
      this.selectedMonster = null;
      this.toast(this.viewerHidden(owner, card) ? '伏せられたカード。' : `${cardDef(card).name}`, 'info');
      return;
    }
    this.selectedHand = null;
    this.selectedMonster = null;
    this.render();
  }

  pendingRow() {
    if (!this.pending) return '';
    if (this.pending.action === 'setTrap') return 'spells';
    return 'monsters';
  }

  zoneTargetable(owner, row, zone, card) {
    if (!this.pending || !this.state) return false;
    if (this.pending.type === 'place') {
      if (owner !== this.you || row !== this.pendingRow()) return false;
      if (!card) return true;
      // Only a tribute summon may replace an existing monster, and only when
      // the field has no free monster zone to place the new card.
      if (row !== 'monsters') return false;
      const hand = this.state.players[this.you].hand.find((c) => c.uid === this.pending.uid);
      if (!hand || tributeCount(hand) === 0) return false;
      return !this.state.players[this.you].monsters.some((c) => !c);
    }
    if (this.pending.type === 'attack') {
      return owner === 1 - this.you && row === 'monsters' && Boolean(card);
    }
    if (this.pending.type === 'target') {
      const hand = this.state.players[this.you].hand.find((c) => c.uid === this.pending.uid);
      if (!hand) return false;
      const def = cardDef(hand);
      if (def.spell === 'equip') return owner === this.you && row === 'monsters' && Boolean(card) && !card.faceDown;
      return owner === 1 - this.you && row === 'monsters' && Boolean(card);
    }
    return false;
  }

  interactiveZone(owner, row, zone, card) {
    if (this.pending) return this.zoneTargetable(owner, row, zone, card);
    if (card) return true;
    return false;
  }

  handleAction(act) {
    const state = this.state;
    if (!state) return;
    if (act === 'cancel') { this.clearSelection(); return; }
    if (act === 'rematch') { this.onRematch(); return; }
    if (act === 'share') { this.onInvite(); return; }
    if (act === 'surrender') {
      if (!this.confirmSurrender) {
        this.confirmSurrender = setTimeout(() => {
          this.confirmSurrender = 0;
          this.renderActionbar();
          if (this.modalView === 'settings') this.renderModal();
        }, 3200);
        this.toast('もう一度「降参」を押すと決着します。', 'warn');
        this.renderActionbar();
        return;
      }
      clearTimeout(this.confirmSurrender);
      this.confirmSurrender = 0;
      this.dispatch({ type: 'surrender' });
      return;
    }
    if (act === 'end-turn') { this.dispatch({ type: 'endTurn' }); return; }
    if (act === 'summon') { this.beginPlace('summon'); return; }
    if (act === 'set-monster') { this.beginPlace('setMonster'); return; }
    if (act === 'set-trap') { this.beginPlace('setTrap'); return; }
    if (act === 'activate-spell') { this.beginSpell(); return; }
    if (act === 'attack-mode') {
      if (!this.selectedMonster) return;
      this.pending = { type: 'attack', zone: this.selectedMonster.z };
      this.selectedHand = null;
      this.onSfx('select');
      this.render();
      return;
    }
    if (act === 'direct') {
      if (!this.pending || this.pending.type !== 'attack') return;
      this.dispatch({ type: 'attack', zone: this.pending.zone, target: null });
      return;
    }
    if (act === 'position') {
      if (!this.selectedMonster) return;
      const card = state.players[this.you].monsters[this.selectedMonster.z];
      if (!card) return;
      const to = card.faceDown ? 'atk' : card.position === 'atk' ? 'def' : 'atk';
      this.dispatch({ type: 'position', zone: this.selectedMonster.z, to });
      return;
    }
  }

  beginPlace(action) {
    const card = this.state.players[this.you].hand.find((c) => c.uid === this.selectedHand);
    if (!card) return;
    this.pending = { type: 'place', action, uid: card.uid };
    this.selectedMonster = null;
    this.onSfx('select');
    this.render();
  }

  beginSpell() {
    const card = this.state.players[this.you].hand.find((c) => c.uid === this.selectedHand);
    if (!card) return;
    const def = cardDef(card);
    if (def.spell === 'destroy' || def.spell === 'bind' || def.spell === 'equip') {
      this.pending = { type: 'target', uid: card.uid };
      this.onSfx('select');
      this.render();
      return;
    }
    this.dispatch({ type: 'activateSpell', uid: card.uid });
  }

  /* ── event animation ───────────────────────────────────────── */

  processEvents() {
    const events = this.state.events.filter((event) => event.id > this.lastEventId);
    if (!events.length) return;
    for (const event of events) {
      this.lastEventId = Math.max(this.lastEventId, event.id);
      this.animateEvent(event);
    }
  }

  animateEvent(event) {
    switch (event.kind) {
      case 'turn': {
        const mine = event.player === this.you;
        this.showBanner(`TURN ${String(event.turn).padStart(2, '0')}`, mine ? 'YOUR TURN' : 'OPPONENT TURN', mine ? '極夜があなたを照らす' : `${this.state.players[event.player].name} の手番`);
        this.onSfx('turn');
        break;
      }
      case 'draw':
        if (event.player === this.you) this.onSfx('draw');
        break;
      case 'summon':
        this.pulseZone(event.player, 'monsters', event.zone, 'summoned');
        this.caption(`SUMMON — ${event.name}`);
        this.onSfx('summon');
        break;
      case 'setMonster':
        this.pulseZone(event.player, 'monsters', event.zone, 'placed');
        this.onSfx('place');
        break;
      case 'setTrap':
        this.pulseZone(event.player, 'spells', event.zone, 'placed');
        this.onSfx('place');
        break;
      case 'position':
      case 'flip':
        this.pulseZone(event.player, 'monsters', event.zone, 'flipped');
        break;
      case 'attack':
        this.beam(event.player, event.zone, event.target, event.atk);
        this.onSfx('attack');
        break;
      case 'damage':
        this.floatNumber(event.player, `−${event.amount}`, 'damage');
        this.flashPlayer(event.player, 'hit');
        this.onSfx('hit');
        if (event.player === this.you) this.shake();
        break;
      case 'heal':
        this.floatNumber(event.player, `+${event.amount}`, 'heal');
        this.onSfx('heal');
        break;
      case 'destroy':
        this.pulseZone(event.player, 'monsters', event.zone, 'destroyed');
        this.caption(`DESTROYED — ${event.name}`, 'bad');
        break;
      case 'spell':
        this.caption(`MAGIC — ${event.name}`, 'magic');
        this.onSfx('spell');
        break;
      case 'trap':
        this.pulseZone(event.player, 'spells', event.zone, 'trapfired');
        this.caption(`TRAP — ${event.name}`, 'trap');
        this.onSfx('trap');
        break;
      case 'shield':
        this.pulseZone(event.player, 'monsters', event.zone, 'shielded');
        this.caption(`SHIELD — ${event.name}`);
        break;
      case 'freeze':
        this.pulseZone(event.player, 'monsters', event.zone, 'frozen');
        break;
      case 'effect':
        this.caption(event.text || 'EFFECT', 'magic');
        break;
      case 'revive':
        this.pulseZone(event.player, 'monsters', event.zone, 'summoned');
        this.caption(`REVIVE — ${event.name}`);
        break;
      case 'blocked':
        this.caption('BLOCKED', 'bad');
        break;
      case 'win':
        this.onSfx(event.winner === this.you ? 'win' : 'lose');
        clearTimeout(this.resultTimer);
        this.resultTimer = setTimeout(() => this.maybeResult(true), 650);
        break;
      default:
        break;
    }
  }

  pulseZone(player, row, zone, cls) {
    const el = $(`zone-${player}-${row}-${zone}`);
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 1000);
  }

  beam(fromPlayer, fromZone, target, atk) {
    const from = $(`zone-${fromPlayer}-monsters-${fromZone}`);
    const to = target ? $(`zone-${target.p}-monsters-${target.z}`) : (fromPlayer === this.you ? document.querySelector('.opp-duelist') : document.querySelector('.my-duelist'));
    if (!from || !to) return;
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    const x1 = a.left + a.width / 2;
    const y1 = a.top + a.height / 2;
    const x2 = b.left + b.width / 2;
    const y2 = b.top + b.height / 2;
    const length = Math.hypot(x2 - x1, y2 - y1);
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    const line = document.createElement('div');
    line.className = 'attack-beam';
    line.style.left = `${x1}px`;
    line.style.top = `${y1}px`;
    line.style.width = `${length}px`;
    line.style.transform = `rotate(${angle}deg)`;
    line.innerHTML = `<span class="beam-core"></span><span class="beam-atk">${atk}</span>`;
    document.body.appendChild(line);
    requestAnimationFrame(() => line.classList.add('fire'));
    setTimeout(() => line.remove(), 700);
  }

  floatNumber(player, text, tone) {
    const anchor = player === 0 ? $('myLP') : $('oppLP');
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const el = document.createElement('span');
    el.className = `float-number ${tone}`;
    el.textContent = text;
    el.style.left = `${rect.left + rect.width / 2}px`;
    el.style.top = `${rect.top + rect.height / 2}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  flashPlayer(player, cls) {
    const el = player === 0 ? document.querySelector('.my-duelist') : document.querySelector('.opp-duelist');
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 700);
  }

  flashElement(el, cls) {
    if (!el) return;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 650);
  }

  shake() {
    const app = $('app');
    app.classList.remove('shake');
    void app.offsetWidth;
    app.classList.add('shake');
    setTimeout(() => app.classList.remove('shake'), 450);
  }

  showBanner(kicker, title, sub) {
    const el = $('turnBanner');
    el.innerHTML = `<span>${esc(kicker)}</span><b>${esc(title)}</b><i>${esc(sub)}</i>`;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => el.classList.remove('show'), 1750);
  }

  caption(text, tone = '') {
    let el = document.querySelector('.duel-caption');
    if (!el) {
      el = document.createElement('div');
      el.className = 'duel-caption';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.className = `duel-caption show ${tone}`;
    clearTimeout(this.captionTimer);
    this.captionTimer = setTimeout(() => el.classList.remove('show'), 1250);
  }

  /* ── result / log / modal ──────────────────────────────────── */

  maybeResult(force = false) {
    if (!this.state?.over || this.resultShown) return;
    if (!force) {
      clearTimeout(this.resultTimer);
      this.resultTimer = setTimeout(() => this.maybeResult(true), 850);
      return;
    }
    this.resultShown = true;
    const state = this.state;
    const win = state.winner === this.you;
    $('resultKicker').textContent = `DUEL COMPLETE / TURN ${String(state.turn).padStart(2, '0')}`;
    $('resultTitle').textContent = win ? 'VICTORY' : 'DEFEAT';
    $('resultTitle').className = `result-title ${win ? 'win' : 'lose'}`;
    $('resultSub').textContent = state.winnerReason || (win ? '極夜はあなたのものだ。' : '氷は静かに還った。');
    const me = state.players[this.you];
    $('resultStats').innerHTML = `
      <div><span>LIFE</span><b>${me.lp}</b></div>
      <div><span>TURNS</span><b>${state.turn}</b></div>
      <div><span>DECK</span><b>${me.deck.length}</b></div>
      <div><span>GRAVE</span><b>${me.grave.length}</b></div>`;
    $('result').hidden = false;
    if (win) this.burstSnow();
  }

  burstSnow() {
    for (let i = 0; i < 26; i++) {
      const el = document.createElement('span');
      el.className = 'victory-flake';
      el.style.left = `${Math.random() * 100}vw`;
      el.style.animationDelay = `${Math.random() * 1.6}s`;
      el.style.animationDuration = `${2.4 + Math.random() * 2.4}s`;
      el.style.opacity = String(0.25 + Math.random() * 0.5);
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 5200);
    }
  }

  toggleLog(force) {
    this.logOpen = force === undefined ? !this.logOpen : force;
    $('logPanel').classList.toggle('open', this.logOpen);
    $('logPanel').setAttribute('aria-hidden', String(!this.logOpen));
    if (this.logOpen) this.renderLog();
  }

  openSettings() {
    this.modalView = 'settings';
    $('modalTitle').textContent = '設定';
    $('modalKicker').textContent = 'POLARIS / CONFIG';
    $('modal').hidden = false;
    this.renderModal();
  }

  closeModal() {
    $('modal').hidden = true;
    this.modalView = '';
  }

  renderModal() {
    if (this.modalView !== 'settings') return;
    const state = this.state;
    const online = this.network.status === 'online';
    const conn = online ? '接続済み' : this.network.status === 'lost' ? '再接続中' : '回線を探索中';
    const host = state ? state.mode !== 'online' || this.you === 0 : true;
    $('modalBody').innerHTML = `
      <div class="setting-list">
        <div class="setting-row">
          <div class="setting-copy"><b>サウンド</b><span>合成された風と氷の音</span></div>
          <button class="toggle ${this.options.sound ? 'on' : ''}" data-setting="sound" type="button">${this.options.sound ? 'ON' : 'OFF'}</button>
        </div>
        <div class="setting-row">
          <div class="setting-copy"><b>傾き視差</b><span>端末を傾けて極夜を覗く</span></div>
          <button class="toggle ${this.options.tilt ? 'on' : ''}" data-setting="tilt" type="button">${this.options.tilt ? 'ON' : 'OFF'}</button>
        </div>
        <div class="setting-row">
          <div class="setting-copy"><b>軽減モーション</b><span>雪と光の動きを静める</span></div>
          <button class="toggle ${this.options.reduceMotion ? 'on' : ''}" data-setting="reduce" type="button">${this.options.reduceMotion ? 'ON' : 'OFF'}</button>
        </div>
        <div class="setting-row name-row">
          <div class="setting-copy"><b>プレイヤー名</b><span>${host ? 'ホスト' : 'ゲスト'}として表示</span></div>
          <div class="name-edit">
            <input id="nameInput" maxlength="14" value="${esc(this.state?.players[this.you]?.name || '')}" aria-label="プレイヤー名">
            <button class="mini-btn" id="nameSave" type="button">変更</button>
          </div>
        </div>
        <div class="link-card">
          <div class="link-card-head"><span>ROOM ${esc(this.room)}</span><span class="link-state ${online ? 'on' : ''}">${conn}</span></div>
          <p>${this.state?.mode === 'online' ? 'フレンドが接続中。盤面はリアルタイムで同期される。' : 'このルームは常に開いている。リンクを送ればフレンドがこの盤面に接続する。'}</p>
          <div class="link-actions">
            <button class="mini-btn" data-setting="copy" type="button">招待リンクをコピー</button>
            <button class="mini-btn" data-setting="rules" type="button">遊び方</button>
          </div>
        </div>
        <button class="btn danger wide" data-setting="surrender" type="button">${this.confirmSurrender ? '本当に降参する' : '降参する'}</button>
      </div>`;

    $('modalBody').querySelectorAll('[data-setting]').forEach((button) => {
      button.addEventListener('click', async () => {
        const key = button.dataset.setting;
        if (key === 'sound') {
          const on = await this.onSoundToggle(!this.options.sound);
          this.options.sound = Boolean(on);
          this.renderModal();
        } else if (key === 'tilt') {
          const on = await this.onTiltToggle(!this.options.tilt);
          this.options.tilt = Boolean(on);
          this.renderModal();
        } else if (key === 'reduce') {
          this.options.reduceMotion = !this.options.reduceMotion;
          this.onReduceMotion(this.options.reduceMotion);
          this.renderModal();
        } else if (key === 'copy') {
          this.onCopyRoom();
        } else if (key === 'rules') {
          this.showRules();
        } else if (key === 'surrender') {
          if (!this.confirmSurrender) {
            this.confirmSurrender = setTimeout(() => { this.confirmSurrender = 0; if (this.modalView === 'settings') this.renderModal(); }, 3200);
            this.renderModal();
          } else {
            clearTimeout(this.confirmSurrender);
            this.confirmSurrender = 0;
            this.closeModal();
            this.dispatch({ type: 'surrender' });
          }
        }
      });
    });
    const save = $('nameSave');
    if (save) {
      save.addEventListener('click', () => {
        const value = $('nameInput')?.value.trim();
        if (!value) return;
        this.onName(value.slice(0, 14));
        this.renderModal();
      });
    }
  }

  showRules() {
    this.modalView = 'rules';
    $('modalTitle').textContent = '遊び方';
    $('modalKicker').textContent = 'POLARIS / FIELD MANUAL';
    $('modal').hidden = false;
    $('modalBody').innerHTML = `
      <div class="rules">
        <div class="rule"><span class="rule-no">01</span><div><b>極夜の盤面</b><p>互いに 4×2 のマスを持つ。前列4マスがモンスター、後列4マスが魔法・罠。LP 8000 から始まり、相手の LP を削り切るか山札を尽きさせれば勝ち。</p></div></div>
        <div class="rule"><span class="rule-no">02</span><div><b>手番</b><p>手札を1枚ドロー。召喚・セットは1ターンに1回。モンスターは攻撃表示で召喚、守備表示で伏せられる。Lv5〜6は生贄1体、Lv7は生贄2体。</p></div></div>
        <div class="rule"><span class="rule-no">03</span><div><b>攻守表</b><p>攻撃表示なら ATK で勝負。守備表示なら DEF を突破できれば破壊。攻撃表示同士の差は LP へ。貫通持ちは守備を抜いた差も通す。</p></div></div>
        <div class="rule"><span class="rule-no">04</span><div><b>魔法と罠</b><p>魔法は手札から発動。装備は後列に残り、攻撃力を上げる。罠は後列に伏せ、次の相手ターンの攻撃・召喚時に自動発動する。</p></div></div>
        <div class="rule"><span class="rule-no">05</span><div><b>操作</b><p>手札をタップして選択 → 光るボタンで召喚・発動・セット → 光るマスをタップして配置。盤面のカードをタップすると全文と数値が見える。</p></div></div>
        <div class="rule"><span class="rule-no">06</span><div><b>通信と傾き</b><p>起動と同時に自分のルームが立ち、常に接続されている。招待リンクを送れば同じ盤面で対戦。設定の「傾き視差」をオンにすると、iOS ではモーション許可を求められる。</p></div></div>
      </div>`;
  }

  toast(message, tone = '') {
    const el = $('toast');
    el.textContent = message;
    el.className = `toast show ${tone}`;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }
}

function selectedZone(ui, owner, zone) {
  return Boolean(ui.selectedMonster && ui.selectedMonster.p === owner && ui.selectedMonster.z === zone);
}
