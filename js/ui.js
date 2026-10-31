// ARCTIC DUEL — rendering and touch interaction layer.

import { ELEMENTS } from './cards.js';
import { cardAtk, cardDefValue } from './engine.js';

const LP_MAX = 4000;
const el = (id) => document.getElementById(id);

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function monogram(name) {
  const cleaned = String(name || 'D').replace(/[^A-Za-z0-9]/g, '');
  return (cleaned.slice(0, 2) || 'DU').toUpperCase();
}

function cardBack(ownName = '') {
  return `
    <div class="card face-down${ownName ? ' own-set' : ''}">
      <div class="set-mark">
        <strong>SET</strong>
        <span>${ownName ? esc(ownName) : 'DEFENSE'}</span>
      </div>
    </div>`;
}

function cardFace(card, { hand = false } = {}) {
  const element = ELEMENTS[card.element] || ELEMENTS.frost;
  const isSpell = card.kind === 'spell';
  const position = card.position === 'def' ? 'def' : 'atk';
  const atk = cardAtk(card);
  const def = cardDefValue(card);
  const classes = ['card'];
  if (position === 'def') classes.push('position-def');
  if (hand) classes.push('hand-face');
  const title = `${card.jp} / ${card.name}${isSpell ? '' : ` / ATK ${atk} DEF ${def}`} — ${card.text}`;
  return `
    <div class="${classes.join(' ')}" data-element="${card.element}" data-uid="${esc(card.uid)}" data-position="${position}" title="${esc(title)}">
      <div class="card-top">
        <span class="card-element">${isSpell ? 'SPELL' : esc(element.label)}</span>
        <span class="card-position${isSpell ? ' spell-tag' : ''}">${isSpell ? 'MAGIC' : position === 'atk' ? 'ATK' : 'DEF'}</span>
        <span class="card-level">${isSpell ? '—' : `Lv.${card.level || 1}`}</span>
      </div>
      <div class="card-name">${esc(card.name)}</div>
      <div class="card-jp">${esc(card.jp)}</div>
      <div class="card-art"><span>${isSpell ? 'ARS' : esc(element.label)}</span></div>
      <div class="card-stats">
        ${isSpell
          ? `<span class="stat">対象 <b>${card.target === 'ownMonster' ? 'SELF' : card.target === 'enemyMonster' ? 'ENEMY' : 'FREE'}</b></span><span class="stat def">魔法 <b>1</b></span>`
          : `<span class="stat">ATK <b>${atk}</b></span><span class="stat def">DEF <b>${def}</b></span>`}
      </div>
      <div class="card-text">${esc(card.text)}</div>
    </div>`;
}

export class GameUI {
  constructor(handlers) {
    this.handlers = handlers;
    this.state = null;
    this.mySide = 'p1';
    this.role = 'host';
    this.opponentKind = 'echo';
    this.matchId = null;
    this.lastSeq = 0;
    this.selection = null; // { type: 'hand'|'field', uid, side }
    this.attackerUid = null;
    this.summonMode = 'atk';
    this.spellTargetUid = null;
    this.prevLp = { p1: LP_MAX, p2: LP_MAX };
    this.netInfo = { state: 'connecting', detail: '', role: 'host', room: '----' };
    this.overShown = false;
    this.toastTimer = null;
    this.inspect = null;

    this.nodes = {
      board: el('board'),
      hand: el('hand'),
      handCount: el('hand-count'),
      actions: el('actions'),
      hint: el('hint'),
      phase: el('phase-chip'),
      log: el('log'),
      ticker: el('ticker-text'),
      roomCode: el('room-code'),
      sideRoom: el('side-room-code'),
      net: el('net-status'),
      sideStatus: el('side-status'),
      sideOpponent: el('side-opponent'),
      roomNote: el('room-note'),
      myRoom: el('my-room'),
      turnBanner: el('turn-banner'),
      phaseBanner: el('phase-banner'),
      impacts: el('impact-layer'),
      joinSheet: el('join-sheet'),
      joinInput: el('join-code'),
      joinError: el('join-error'),
      overSheet: el('over-sheet'),
      overTitle: el('over-title'),
      overReason: el('over-reason'),
      overStats: el('over-stats'),
      toast: el('toast'),
    };

    this.bind();
  }

  bind() {
    this.nodes.board.addEventListener('click', event => {
      const card = event.target.closest('.card');
      if (card) {
        const side = card.closest('.cell')?.dataset.side;
        const zone = Number(card.closest('.cell')?.dataset.zone);
        if (side) this.onFieldCard(side, card.dataset.uid, zone);
        return;
      }
      const cell = event.target.closest('.cell');
      if (cell) this.onZone(cell.dataset.side, Number(cell.dataset.zone));
    });

    this.nodes.hand.addEventListener('click', event => {
      const slot = event.target.closest('.hand-card');
      if (!slot) return;
      this.onHandCard(slot.dataset.uid);
    });

    this.nodes.actions.addEventListener('click', event => {
      const button = event.target.closest('button[data-action]');
      if (!button || button.disabled) return;
      this.onAction(button.dataset.action, button.dataset.value || '');
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        if (!this.nodes.joinSheet.hidden) return this.closeJoin();
        this.clearSelection();
      }
    });

    this.nodes.joinInput.addEventListener('input', () => {
      this.nodes.joinInput.value = this.nodes.joinInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      this.nodes.joinError.textContent = '';
    });
    this.nodes.joinInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') this.handlers.joinSubmit(this.nodes.joinInput.value.trim());
    });
    el('join-cancel').addEventListener('click', () => this.closeJoin());
    el('join-go').addEventListener('click', () => this.handlers.joinSubmit(this.nodes.joinInput.value.trim()));
    this.nodes.joinSheet.addEventListener('click', event => {
      if (event.target === this.nodes.joinSheet) this.closeJoin();
    });
  }

  setContext({ mySide, role, opponentKind }) {
    this.mySide = mySide || this.mySide;
    this.role = role || this.role;
    if (opponentKind) this.opponentKind = opponentKind;
  }

  setRoom(room) {
    this.netInfo.room = room;
    this.nodes.roomCode.textContent = room;
    this.nodes.sideRoom.textContent = room;
  }

  setNetwork(info) {
    this.netInfo = { ...this.netInfo, ...info };
    const labels = {
      connecting: '接続中',
      waiting: '待機中',
      live: '対戦中',
      local: 'ローカル',
      'guest-live': '参加中',
      error: '切断',
      over: '終了',
    };
    const label = labels[this.netInfo.state] || this.netInfo.state || '接続中';
    this.nodes.net.textContent = label;
    this.nodes.net.dataset.state = this.netInfo.state || 'connecting';
    this.nodes.sideStatus.textContent = label;
    this.nodes.myRoom.hidden = this.role !== 'guest';
    this.updateRoomNote();
  }

  updateRoomNote() {
    if (!this.state) return;
    const human = this.opponentKind === 'human';
    const role = this.role;
    if (role === 'guest') {
      this.nodes.roomNote.textContent = 'ホストの部屋に参加しています。相手のターンを待つ間も、盤面はリアルタイムで同期されます。';
    } else if (human) {
      this.nodes.roomNote.textContent = '対戦相手が接続中です。この部屋のコードを共有すると、別の端末からも参加できます。';
    } else {
      this.nodes.roomNote.textContent = 'あなたの部屋を自動で開設し、参加しています。コードを共有すると人間の対戦相手が入室します。不在時はエコーが対戦相手を務めます。';
    }
    this.nodes.sideOpponent.textContent = this.state.names?.[this.mySide === 'p1' ? 'p2' : 'p1'] || 'ECHO';
  }

  toast(message, duration = 2300) {
    const node = this.nodes.toast;
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => node.classList.remove('show'), duration);
  }

  openJoin() {
    this.nodes.joinSheet.hidden = false;
    this.nodes.joinError.textContent = '';
    this.nodes.joinInput.value = '';
    setTimeout(() => this.nodes.joinInput.focus(), 60);
  }

  closeJoin() {
    this.nodes.joinSheet.hidden = true;
  }

  showJoinError(message) {
    this.nodes.joinError.textContent = message;
  }

  clearSelection() {
    this.selection = null;
    this.attackerUid = null;
    this.spellTargetUid = null;
    this.inspect = null;
    this.paintSelection();
    this.renderCommand();
  }

  canAct() {
    return Boolean(this.state && !this.state.winner && this.state.active === this.mySide);
  }

  handCard(uid) {
    if (!this.state) return null;
    return this.state.hand[this.mySide].find(card => card.uid === uid) || null;
  }

  fieldCard(uid) {
    if (!this.state) return null;
    for (const side of ['p1', 'p2']) {
      for (let zone = 0; zone < 4; zone += 1) {
        const card = this.state.field[side][zone];
        if (card && card.uid === uid) return { card, side, zone };
      }
    }
    return null;
  }

  onHandCard(uid) {
    const card = this.handCard(uid);
    if (!card) return;
    if (this.selection?.type === 'hand' && this.selection.uid === uid) {
      this.clearSelection();
      return;
    }
    this.selection = { type: 'hand', uid, side: this.mySide };
    this.attackerUid = null;
    this.spellTargetUid = null;
    this.inspect = card;
    this.paintSelection();
    this.renderCommand();
  }

  onFieldCard(side, uid, zone) {
    const card = this.state?.field[side]?.[zone];
    if (!card || card.uid !== uid) return;

    if (this.selection?.type === 'hand') {
      const handCard = this.handCard(this.selection.uid);
      if (handCard?.kind === 'spell') {
        const targetKind = handCard.target;
        if (targetKind === 'ownMonster' && side === this.mySide) {
          this.spellTargetUid = uid;
          this.inspect = card;
          this.paintSelection();
          this.renderCommand();
          return;
        }
        if (targetKind === 'enemyMonster' && side !== this.mySide) {
          this.spellTargetUid = uid;
          this.inspect = card;
          this.paintSelection();
          this.renderCommand();
          return;
        }
      }
    }

    if (this.attackerUid) {
      if (side !== this.mySide) {
        this.handlers.intent({ type: 'attack', attackerUid: this.attackerUid, targetUid: uid });
        return;
      }
      if (this.state.phase === 'battle') {
        this.selectAttacker(uid);
        return;
      }
    }

    if (side === this.mySide && this.canAct() && this.state.phase === 'battle' && !card.faceDown && card.position === 'atk' && !card.hasAttacked && this.state.attackLocked === false) {
      this.selectAttacker(uid);
      return;
    }

    if (side === this.mySide && this.canAct() && this.state.phase === 'main') {
      this.selection = { type: 'field', uid, side };
      this.attackerUid = null;
      this.spellTargetUid = null;
      this.inspect = card;
      this.paintSelection();
      this.renderCommand();
      return;
    }

    this.inspect = card;
    this.selection = { type: 'field', uid, side };
    this.attackerUid = null;
    this.spellTargetUid = null;
    this.paintSelection();
    this.renderCommand();
  }

  selectAttacker(uid) {
    if (this.attackerUid === uid) {
      this.attackerUid = null;
    } else {
      this.attackerUid = uid;
    }
    this.selection = null;
    this.spellTargetUid = null;
    this.paintSelection();
    this.renderCommand();
  }

  onZone(side, zone) {
    if (!this.state || side !== this.mySide) return;
    if (this.selection?.type !== 'hand') {
      this.toast('手札のモンスターを選んでから空きマスをタップしてください。');
      return;
    }
    const card = this.handCard(this.selection.uid);
    if (!card) { this.clearSelection(); return; }
    if (card.kind !== 'monster') {
      this.toast('魔法カードは「発動」ボタンで使います。');
      return;
    }
    if (this.state.phase !== 'main') {
      this.toast('召喚はメインフェイズで行います。');
      return;
    }
    if (this.state.flags[this.mySide].summoned) {
      this.toast('このターンの召喚はもう使いました。');
      return;
    }
    if (this.state.field[this.mySide][zone]) {
      this.toast('そのマスは埋まっています。');
      return;
    }
    this.handlers.intent({
      type: 'summon',
      handUid: this.selection.uid,
      zone,
      position: this.summonMode,
    });
    this.clearSelection();
  }

  onAction(action, value) {
    switch (action) {
      case 'cancel':
        this.clearSelection();
        break;
      case 'mode-atk':
        this.summonMode = 'atk';
        this.paintSelection();
        this.renderCommand();
        break;
      case 'mode-def':
        this.summonMode = 'def';
        this.paintSelection();
        this.renderCommand();
        break;
      case 'battle':
        this.handlers.intent({ type: 'nextPhase' });
        break;
      case 'end':
        this.handlers.intent({ type: 'endTurn' });
        break;
      case 'activate': {
        if (this.selection?.type !== 'hand') return;
        const card = this.handCard(this.selection.uid);
        if (!card || card.kind !== 'spell') return;
        this.handlers.intent({
          type: 'spell',
          handUid: card.uid,
          targetUid: card.target === 'none' ? null : this.spellTargetUid,
        });
        this.clearSelection();
        break;
      }
      case 'position': {
        if (this.selection?.type !== 'field') return;
        this.handlers.intent({ type: 'changePosition', uid: this.selection.uid });
        break;
      }
      case 'direct':
        if (!this.attackerUid) return;
        this.handlers.intent({ type: 'attack', attackerUid: this.attackerUid, targetUid: null });
        break;
      case 'surrender': {
        const ok = window.confirm('投了しますか？ このデュエルは敗北になります。');
        if (ok) this.handlers.intent({ type: 'surrender' });
        break;
      }
      case 'restart':
        this.hideGameOver();
        this.handlers.intent({ type: 'restart' });
        break;
      case 'home':
        this.hideGameOver();
        this.handlers.intent({ type: 'home' });
        break;
      case 'copy':
        this.handlers.copyRoom();
        break;
      case 'join':
        this.openJoin();
        break;
      default:
        break;
    }
  }

  paintSelection() {
    if (!this.state) return;
    const cards = this.nodes.board.querySelectorAll('.card');
    cards.forEach(card => card.classList.remove('selected', 'attacker-ready'));
    this.nodes.board.querySelectorAll('.cell').forEach(cell => cell.classList.remove('playable', 'target', 'def-target'));

    if (!this.selection) {
      if (this.attackerUid) {
        const attacker = this.cardElement(this.attackerUid);
        if (attacker) attacker.classList.add('attacker-ready');
        this.markTargets(this.attackerUid);
      }
      return;
    }

    if (this.selection.type === 'hand') {
      const card = this.handCard(this.selection.uid);
      if (!card) return;
      this.nodes.hand.querySelectorAll('.hand-card').forEach(slot => {
        slot.classList.toggle('selected', slot.dataset.uid === card.uid);
      });
      if (!this.canAct()) return;
      if (this.state.phase !== 'main') return;
      if (card.kind === 'monster') {
        if (!this.state.flags[this.mySide].summoned) {
          this.nodes.board.querySelectorAll(`.cell[data-side="${this.mySide}"]`).forEach(cell => {
            const zone = Number(cell.dataset.zone);
            if (!this.state.field[this.mySide][zone]) cell.classList.add('playable');
          });
        }
      } else if (card.target === 'enemyMonster') {
        this.nodes.board.querySelectorAll(`.cell[data-side="${this.opponentSide()}"]`).forEach(cell => {
          const zone = Number(cell.dataset.zone);
          if (this.state.field[this.opponentSide()][zone]) cell.classList.add('target');
        });
        this.markSpellTarget();
      } else if (card.target === 'ownMonster') {
        this.nodes.board.querySelectorAll(`.cell[data-side="${this.mySide}"]`).forEach(cell => {
          const zone = Number(cell.dataset.zone);
          if (this.state.field[this.mySide][zone]) cell.classList.add('target');
        });
        this.markSpellTarget();
      }
      return;
    }

    if (this.selection.type === 'field') {
      const found = this.fieldCard(this.selection.uid);
      if (!found) return;
      const node = this.cardElement(this.selection.uid);
      if (node) node.classList.add('selected');
      if (found.side === this.mySide && this.state.phase === 'battle') {
        this.markTargets(this.selection.uid);
      }
    }
  }

  markSpellTarget() {
    if (!this.spellTargetUid) return;
    const card = this.cardElement(this.spellTargetUid);
    const cell = card?.closest('.cell');
    if (cell) {
      cell.classList.remove('target');
      cell.classList.add('def-target');
    }
  }

  markTargets(attackerUid) {
    const enemySide = this.opponentSide();
    this.nodes.board.querySelectorAll(`.cell[data-side="${enemySide}"]`).forEach(cell => {
      const zone = Number(cell.dataset.zone);
      const card = this.state.field[enemySide][zone];
      if (card) {
        cell.classList.add('target');
        if (card.position === 'def') cell.classList.add('def-target');
      }
    });
  }

  opponentSide() {
    return this.mySide === 'p1' ? 'p2' : 'p1';
  }

  cardElement(uid) {
    return this.nodes.board.querySelector(`.card[data-uid="${CSS.escape(String(uid))}"]`);
  }

  render(state, options = {}) {
    if (!state) return;
    const newMatch = state.matchId !== this.matchId;
    if (newMatch) {
      this.matchId = state.matchId;
      this.selection = null;
      this.attackerUid = null;
      this.spellTargetUid = null;
      this.lastSeq = 0;
      this.overShown = false;
      this.prevLp = { ...state.lp };
      this.nodes.overSheet.hidden = true;
      this.summonMode = 'atk';
    }
    this.state = state;
    if (options.mySide) this.mySide = options.mySide;
    if (options.role) this.role = options.role;
    if (options.opponentKind) this.opponentKind = options.opponentKind;

    // Drop a selection that no longer exists.
    if (this.selection?.type === 'hand' && !this.handCard(this.selection.uid)) this.selection = null;
    if (this.selection?.type === 'field' && !this.fieldCard(this.selection.uid)) this.selection = null;
    if (this.attackerUid) {
      const found = this.fieldCard(this.attackerUid);
      if (!found || found.side !== this.mySide || found.card.faceDown || found.card.hasAttacked || found.card.position !== 'atk') this.attackerUid = null;
    }

    this.renderHud();
    this.renderBoard();
    this.renderHand();
    this.paintSelection();
    this.renderCommand();
    this.renderLog();
    this.updateRoomNote();
    this.nodes.myRoom.hidden = this.role !== 'guest';

    if (!newMatch && options.animate !== false) this.animate(state.lastEvent);
    this.prevLp = { ...state.lp };
  }

  renderHud() {
    const s = this.state;
    const opp = this.opponentSide();
    const mine = this.mySide;

    el('opp-name').textContent = s.names[opp] || 'ECHO';
    el('you-name').textContent = s.names[mine] || 'DUELIST';
    el('opp-monogram').textContent = monogram(s.names[opp]);
    el('you-monogram').textContent = monogram(s.names[mine]);

    const roleTag = this.role === 'guest' ? 'GUEST / 第2席' : 'HOST / 第1席';
    if (this.opponentKind === 'human') {
      el('opp-tag').textContent = this.role === 'guest' ? 'HOST / 第1席' : 'CHALLENGER / 第2席';
    } else {
      el('opp-tag').textContent = 'ECHO / 第2席';
    }
    el('you-tag').textContent = roleTag;

    for (const [side, prefix] of [[opp, 'opp'], [mine, 'you']]) {
      const lp = Math.max(0, Math.min(LP_MAX, s.lp[side]));
      const node = el(`${prefix}-lp`);
      node.textContent = String(s.lp[side]);
      const bar = el(`${prefix}-lp-bar`);
      bar.style.width = `${Math.max(0, Math.min(100, (lp / LP_MAX) * 100))}%`;
      const life = node.closest('.life');
      life?.classList.toggle('low', lp <= LP_MAX * 0.25);
    }
    el('opp-hand').textContent = s.hand[opp].length;
    el('opp-deck').textContent = s.deck[opp].length;
    el('opp-grave').textContent = s.grave[opp].length;
    el('you-hand').textContent = s.hand[mine].length;
    el('you-deck').textContent = s.deck[mine].length;
    el('you-grave').textContent = s.grave[mine].length;
  }

  renderBoard() {
    const s = this.state;
    const opp = this.opponentSide();
    const rows = [[opp, 'opponent'], [this.mySide, 'you']];
    let html = '';
    for (const [side, cls] of rows) {
      for (let zone = 0; zone < 4; zone += 1) {
        const card = s.field[side][zone];
        const own = side === this.mySide;
        let content = '';
        if (card) {
          const hidden = !own && card.faceDown;
          if (hidden) content = cardBack();
          else if (own && card.faceDown) content = cardBack(card.jp);
          else content = cardFace(card);
        }
        html += `<div class="cell ${cls}${card ? ' occupied' : ''}" data-side="${side}" data-zone="${zone}" aria-label="${card ? esc(card.jp) : '空きマス'}">${content}</div>`;
      }
    }
    this.nodes.board.innerHTML = html;
    if (s.phase === 'battle') this.nodes.board.classList.add('battle');
    else this.nodes.board.classList.remove('battle');
  }

  renderHand() {
    const s = this.state;
    const hand = s.hand[this.mySide] || [];
    this.nodes.handCount.textContent = hand.length;
    if (!hand.length) {
      this.nodes.hand.innerHTML = '<div class="hand-empty">手札はありません</div>';
      return;
    }
    this.nodes.hand.innerHTML = hand.map(card => (
      `<button type="button" class="hand-card" data-uid="${esc(card.uid)}" aria-label="${esc(card.jp)} ${esc(card.name)}">${cardFace(card, { hand: true })}</button>`
    )).join('');
    this.nodes.hand.querySelectorAll('.hand-card').forEach(slot => {
      slot.classList.toggle('selected', this.selection?.type === 'hand' && this.selection.uid === slot.dataset.uid);
    });
  }

  renderCommand() {
    const s = this.state;
    if (!s) return;
    const phase = el('phase-chip');
    phase.textContent = s.phase === 'over' ? 'OVER' : s.phase === 'battle' ? 'BATTLE' : s.phase === 'end' ? 'END' : 'MAIN';
    phase.className = `phase-chip${s.phase === 'battle' ? ' battle' : ''}${s.phase === 'over' ? ' over' : ''}`;

    const buttons = [];
    const myTurn = this.canAct();
    let hint = '';

    if (s.winner) {
      hint = s.winner === 'draw' ? '引き分けです。' : `${s.names[s.winner]} の勝利。`;
      buttons.push({ label: '再戦', action: 'restart', primary: true });
    } else if (!myTurn) {
      hint = `${s.names[s.active]} のターン。盤面を監視しています。`;
      buttons.push({ label: '投了', action: 'surrender', danger: true });
    } else if (s.phase === 'main') {
      if (this.selection?.type === 'hand') {
        const card = this.handCard(this.selection.uid);
        if (card?.kind === 'monster') {
          const canSummon = !s.flags[this.mySide].summoned && s.field[this.mySide].some(cardInZone => !cardInZone);
          hint = canSummon
            ? `${card.jp} — 空きマスをタップして召喚。表示形式を選択。`
            : `${card.jp} — このターンは召喚できません。`;
          buttons.push({ label: 'ATK 召喚', action: 'mode-atk', pressed: this.summonMode === 'atk', disabled: !canSummon });
          buttons.push({ label: 'SET 守備', action: 'mode-def', pressed: this.summonMode === 'def', disabled: !canSummon });
          buttons.push({ label: 'キャンセル', action: 'cancel', quiet: true });
        } else if (card) {
          const canSpell = !s.flags[this.mySide].spellUsed;
          const needsTarget = card.target !== 'none';
          const ready = canSpell && (!needsTarget || this.spellTargetUid);
          hint = needsTarget
            ? (this.spellTargetUid ? `対象を選択済み。${card.jp} を発動できます。` : `${card.jp} — 光る対象をタップ。`)
            : `${card.jp} — 発動できます。`;
          buttons.push({ label: '発動', action: 'activate', primary: true, disabled: !ready });
          buttons.push({ label: 'キャンセル', action: 'cancel', quiet: true });
        }
      } else if (this.selection?.type === 'field') {
        const found = this.fieldCard(this.selection.uid);
        if (found) {
          const card = found.card;
          const canChange = found.side === this.mySide && !card.faceDown && card.summonedTurn !== s.turn
            && !s.flags[this.mySide].positionChanged.includes(card.uid);
          hint = `${card.jp} — ${card.text}`;
          if (found.side === this.mySide) {
            buttons.push({
              label: card.position === 'atk' ? '守備へ' : '攻撃へ',
              action: 'position',
              disabled: !canChange,
            });
          }
          buttons.push({ label: 'キャンセル', action: 'cancel', quiet: true });
        }
      } else {
        hint = s.attackLocked ? '先攻1ターン目は攻撃できません。手札をタップして盤面を作ります。' : '手札をタップして召喚。準備ができたらバトルへ。';
        buttons.push({ label: 'バトルへ', action: 'battle', primary: true });
        buttons.push({ label: 'ターン終了', action: 'end' });
        buttons.push({ label: '投了', action: 'surrender', danger: true });
      }
    } else if (s.phase === 'battle') {
      if (this.attackerUid) {
        const enemyCount = s.field[this.opponentSide()].filter(Boolean).length;
        hint = enemyCount ? '光る相手モンスターをタップして攻撃。' : '相手の場は空です。直接攻撃できます。';
        if (!enemyCount) buttons.push({ label: '直接攻撃', action: 'direct', primary: true });
        buttons.push({ label: 'キャンセル', action: 'cancel', quiet: true });
        buttons.push({ label: 'ターン終了', action: 'end' });
      } else {
        hint = '攻撃する自分のモンスターをタップ。守備表示のモンスターは攻撃できません。';
        buttons.push({ label: 'ターン終了', action: 'end', primary: true });
      }
    } else {
      hint = 'フェイズ移行中...';
    }

    this.nodes.hint.textContent = hint;
    this.nodes.actions.innerHTML = buttons.map(button => (
      `<button type="button" data-action="${button.action}"${button.danger ? ' class="danger"' : button.quiet ? ' class="quiet"' : button.primary ? ' class="primary"' : ''}${button.disabled ? ' disabled' : ''}${button.pressed ? ' aria-pressed="true"' : button.pressed === false ? ' aria-pressed="false"' : ''}>${esc(button.label)}</button>`
    )).join('');
  }

  renderLog() {
    const s = this.state;
    const entries = s.log.slice(-30);
    this.nodes.log.innerHTML = entries.map(entry => (
      `<li class="${entry.side}"><b>TURN ${entry.turn} / ${entry.side === 'p1' ? 'P1' : 'P2'}</b>${esc(entry.text)}</li>`
    )).join('');
    this.nodes.log.scrollTop = this.nodes.log.scrollHeight;
    const last = s.log[s.log.length - 1];
    this.nodes.ticker.textContent = last ? last.text : '極北の氷原に接続しています。';
  }

  animate(event) {
    if (!event || !event.seq || event.seq === this.lastSeq) return;
    this.lastSeq = event.seq;
    const board = this.nodes.board;
    const opp = this.opponentSide();

    switch (event.type) {
      case 'turn': {
        const mine = event.side === this.mySide;
        this.showTurnBanner(mine ? 'YOUR TURN' : 'ENEMY TURN');
        break;
      }
      case 'phase': {
        if (event.phase === 'battle') this.showPhase('BATTLE PHASE');
        else if (event.phase === 'end') this.showPhase('END PHASE');
        break;
      }
      case 'summon': {
        const node = this.cardElement(event.uid);
        if (node) {
          node.classList.add('summoning');
          this.impactAt(event.side, event.zone, '');
        }
        break;
      }
      case 'position': {
        const node = this.cardElement(event.uid);
        if (node) node.classList.add('summoning');
        break;
      }
      case 'spell': {
        if (event.targetSide !== null && event.targetZone !== null) {
          this.impactAt(event.targetSide, event.targetZone, 'spell');
        } else {
          this.impactCenter('spell');
        }
        break;
      }
      case 'attack': {
        const attacker = this.cardElement(event.attackerUid);
        if (attacker) {
          this.setLunge(attacker, event.side);
          attacker.classList.add('lunging');
        }
        if (event.targetSide !== null && event.targetZone !== null) {
          const targetCell = this.cellAt(event.targetSide, event.targetZone);
          const target = targetCell?.querySelector('.card');
          if (target) target.classList.add('hit');
          this.impactAt(event.targetSide, event.targetZone, event.targetDestroyed ? 'damage' : '');
        }
        board.classList.add('shake');
        setTimeout(() => board.classList.remove('shake'), 440);
        if (event.damageToDefender > 0) this.floatDamage(event.targetSide || opp, event.damageToDefender, 'damage');
        if (event.damageToAttacker > 0) this.floatDamage(event.side, event.damageToAttacker, 'damage');
        break;
      }
      case 'damage':
        this.floatDamage(event.side, event.amount, 'damage');
        break;
      case 'heal':
        this.floatDamage(event.side, event.amount, 'heal');
        break;
      case 'effect': {
        if (event.effect === 'burn') this.floatDamage(event.side === 'p1' ? 'p2' : 'p1', event.amount || 300, 'damage');
        break;
      }
      case 'destroy': {
        this.impactAt(event.side, event.zone, 'damage');
        break;
      }
      case 'gameover': {
        setTimeout(() => this.showGameOver(this.state), 620);
        break;
      }
      default:
        break;
    }
    if (this.state.winner && !this.overShown) {
      setTimeout(() => this.showGameOver(this.state), 720);
    }
  }

  setLunge(node, side) {
    const fromTop = side === this.opponentSide();
    node.style.setProperty('--lunge-y', fromTop ? '22px' : '-22px');
  }

  cellAt(side, zone) {
    return this.nodes.board.querySelector(`.cell[data-side="${side}"][data-zone="${zone}"]`);
  }

  impactAt(side, zone, kind) {
    const cell = this.cellAt(side, zone);
    if (!cell) return;
    const rect = cell.getBoundingClientRect();
    const hostRect = this.nodes.impacts.getBoundingClientRect();
    const impact = document.createElement('div');
    impact.className = `impact${kind ? ` ${kind}` : ''}`;
    impact.style.left = `${rect.left - hostRect.left + rect.width / 2}px`;
    impact.style.top = `${rect.top - hostRect.top + rect.height / 2}px`;
    this.nodes.impacts.appendChild(impact);
    setTimeout(() => impact.remove(), 620);
  }

  impactCenter(kind) {
    const hostRect = this.nodes.impacts.getBoundingClientRect();
    const impact = document.createElement('div');
    impact.className = `impact${kind ? ` ${kind}` : ''}`;
    impact.style.left = `${hostRect.width / 2}px`;
    impact.style.top = `${hostRect.height / 2}px`;
    this.nodes.impacts.appendChild(impact);
    setTimeout(() => impact.remove(), 620);
  }

  floatDamage(side, amount, type) {
    if (!amount) return;
    const prefix = side === this.mySide ? 'you' : 'opp';
    const hud = el(`${prefix}-hud`);
    if (!hud) return;
    const float = document.createElement('div');
    float.className = `damage-float${type === 'heal' ? ' heal' : ''}`;
    float.textContent = `${type === 'heal' ? '+' : '-'}${Math.abs(amount)}`;
    hud.appendChild(float);
    setTimeout(() => float.remove(), 1150);
  }

  showTurnBanner(text) {
    const node = this.nodes.turnBanner;
    node.textContent = text;
    node.classList.remove('show');
    void node.offsetWidth;
    node.classList.add('show');
  }

  showPhase(text) {
    const node = this.nodes.phaseBanner;
    node.textContent = text;
    node.classList.remove('show');
    void node.offsetWidth;
    node.classList.add('show');
  }

  flash() {
    const app = el('app');
    app.classList.add('flash-white');
    setTimeout(() => app.classList.remove('flash-white'), 380);
  }

  showGameOver(state) {
    if (!state || !state.winner || this.overShown) return;
    this.overShown = true;
    const draw = state.winner === 'draw';
    const win = state.winner === this.mySide;
    this.nodes.overSheet.hidden = false;
    this.nodes.overSheet.classList.toggle('lose', !win && !draw);
    this.nodes.overTitle.textContent = draw ? 'DRAW' : win ? 'WIN' : 'LOSE';
    this.nodes.overReason.textContent = `${state.names.p1} ${state.lp.p1} LP / ${state.names.p2} ${state.lp.p2} LP — ${state.winReason}`;
    this.nodes.overStats.innerHTML = `
      <span>TURN<b>${state.turn}</b></span>
      <span>YOUR GRAVE<b>${state.grave[this.mySide].length}</b></span>
      <span>OPP GRAVE<b>${state.grave[this.opponentSide()].length}</b></span>`;
    if (win) this.flash();
  }

  hideGameOver() {
    this.nodes.overSheet.hidden = true;
    this.overShown = false;
  }

  setTiltState(label, pressed) {
    const node = el('tilt-btn');
    if (!node) return;
    node.textContent = label;
    node.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  }
}
