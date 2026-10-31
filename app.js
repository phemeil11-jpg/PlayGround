/* ==========================================================================
   MILLENNIUM DUEL — game engine, UI and AI
   ========================================================================== */
(function () {
  'use strict';

  const MD = window.MD;
  const CARDS = MD.CARDS;
  const DECK_LIST = MD.DECK_LIST;
  const ATTR = MD.ATTR;
  const artSvg = MD.artSvg;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const other = (k) => (k === 'player' ? 'ai' : 'player');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rand = (n) => Math.floor(Math.random() * n);
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = rand(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  let uidSeq = 0;
  function makeCard(id) {
    const d = CARDS[id];
    if (!d) throw new Error('Unknown card: ' + id);
    return {
      uid: 'u' + (++uidSeq),
      id,
      name: d.name,
      jp: d.jp,
      type: d.type,
      attribute: d.attribute || null,
      race: d.race || null,
      level: d.level || 0,
      atk: d.atk || 0,
      def: d.def || 0,
      text: d.text || '',
      art: d.art,
      faceUp: true,
      position: 'atk',
      hasAttacked: false,
      changedPosition: false,
      atkMod: 0,
      tempAtk: 0,
      tempDef: 0,
      set: false,
      setTurn: -1,
      summonedTurn: -1,
    };
  }

  function makeDuelist(key, name) {
    return {
      key,
      name,
      lp: 4000,
      deck: [],
      hand: [],
      monster: Array(5).fill(null),
      spell: Array(5).fill(null),
      grave: [],
      normalSummoned: false,
    };
  }

  const state = {
    screen: 'title',
    turn: 0,
    active: null,
    busy: true,
    over: false,
    selected: null,
    pending: null,
    revealUid: null,
    log: [],
    hint: '',
    stats: { player: { dmg: 0, destroyed: 0, summons: 0 }, ai: { dmg: 0, destroyed: 0, summons: 0 } },
    startedAt: 0,
    runId: 0,
  };
  const duel = { player: null, ai: null };

  const sideOf = (key) => duel[key];
  const nameOf = (key) => (key === 'player' ? 'あなた' : 'ファラオの影');

  /* ================================ AUDIO ================================= */
  const Sound = {
    ctx: null,
    enabled: true,
    master: null,
    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.18;
        this.master.connect(this.ctx.destination);
      } catch (e) { this.ctx = null; }
    },
    tone(freq, dur, type = 'sine', vol = 0.5, slide = 0, delay = 0) {
      if (!this.enabled || !this.ctx) return;
      const t = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + 0.02);
    },
    noise(dur = 0.18, vol = 0.35, delay = 0) {
      if (!this.enabled || !this.ctx) return;
      const t = this.ctx.currentTime + delay;
      const n = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = this.ctx.createBufferSource();
      const g = this.ctx.createGain();
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1800;
      g.gain.value = vol;
      src.buffer = buf;
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t);
    },
    play(name) {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      switch (name) {
        case 'select': this.tone(680, 0.06, 'triangle', 0.25); break;
        case 'draw': this.noise(0.16, 0.18); this.tone(320, 0.12, 'sine', 0.12, 180); break;
        case 'summon': this.tone(110, 0.3, 'sawtooth', 0.28, -30); this.tone(440, 0.28, 'triangle', 0.16, 60, 0.04); break;
        case 'set': this.tone(180, 0.2, 'sine', 0.22, -40); break;
        case 'attack': this.noise(0.14, 0.3); this.tone(200, 0.18, 'sawtooth', 0.2, 300); break;
        case 'hit': this.tone(90, 0.35, 'sine', 0.5, -50); this.noise(0.24, 0.4); break;
        case 'destroy': this.noise(0.3, 0.25); this.tone(150, 0.4, 'sawtooth', 0.2, -100); break;
        case 'spell': this.tone(520, 0.4, 'sine', 0.18, 420); this.tone(780, 0.35, 'triangle', 0.1, 300, 0.05); break;
        case 'trap': this.tone(180, 0.4, 'square', 0.16, -80); this.tone(270, 0.5, 'sine', 0.14, 160, 0.08); break;
        case 'win': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.7, 'triangle', 0.2, 0, i * 0.13)); break;
        case 'lose': [330, 262, 196, 147].forEach((f, i) => this.tone(f, 0.8, 'sine', 0.22, 0, i * 0.15)); break;
      }
    },
  };

  /* =============================== RENDER ================================ */
  const el = {};

  function cacheEls() {
    el.title = $('#titleScreen');
    el.game = $('#gameScreen');
    el.arena = $('#arena');
    el.aiHand = $('#aiHand');
    el.playerHand = $('#playerHand');
    el.aiMonster = $('#aiMonster');
    el.aiSpell = $('#aiSpell');
    el.playerMonster = $('#playerMonster');
    el.playerSpell = $('#playerSpell');
    el.aiHead = $('#aiHead');
    el.playerHead = $('#playerHead');
    el.aiLpBar = $('#aiLpBar');
    el.playerLpBar = $('#playerLpBar');
    el.aiLpNum = $('#aiLpNum');
    el.playerLpNum = $('#playerLpNum');
    el.turnLabel = $('#turnLabel');
    el.phaseLabel = $('#phaseLabel');
    el.logList = $('#logList');
    el.selectionInfo = $('#selectionInfo');
    el.actionButtons = $('#actionButtons');
    el.toast = $('#toast');
    el.modalRoot = $('#modalRoot');
    el.fx = $('#fxLayer');
    el.sidebar = $('#sidebar');
  }

  function kindLabel(card) {
    if (card.type === 'spell') return '魔法';
    if (card.type === 'trap') return '罠';
    return `${ATTR[card.attribute] ? ATTR[card.attribute].label : '無'}・${card.race}`;
  }

  function effAtk(card) { return Math.max(0, card.atk + card.atkMod + card.tempAtk); }
  function effDef(card) { return Math.max(0, card.def + card.tempDef); }

  function cardHTML(card, opt = {}) {
    const faceDown = !!opt.faceDown;
    if (faceDown) {
      const own = opt.owner === 'player';
      const title = own ? `${card.name}｜${card.text}` : 'セットされたカード';
      return `<div class="card card-back ${opt.cls || ''}" data-uid="${card.uid}" title="${esc(title)}">
        <div class="back-emblem"><span class="be-ankh">☥</span><span class="back-label">MILLENNIUM</span></div>
      </div>`;
    }
    const atk = card.type === 'monster' ? effAtk(card) : 0;
    const def = card.type === 'monster' ? effDef(card) : 0;
    const atkCls = atk > card.atk ? 'hi' : atk < card.atk ? 'lo' : '';
    const stars = card.type === 'monster' ? `<div class="card-stars">${'★'.repeat(card.level)}</div>` : '';
    const stats = card.type === 'monster'
      ? `<div class="card-stats"><span class="atk ${atkCls}">ATK ${atk}</span><span>DEF ${def}</span></div>`
      : `<div class="card-stats"><span class="spell-kind">${card.type === 'spell' ? 'MAGIC' : 'TRAP'}</span><span>${card.type === 'spell' ? '魔法' : '罠'}</span></div>`;
    return `<div class="card ${card.type} ${card.attribute ? 'attr-' + card.attribute : ''} ${opt.cls || ''}" data-uid="${card.uid}" title="${esc(card.name)}｜${esc(card.text)}">
      <div class="card-inner">
        <div class="card-name">${esc(card.name)}</div>
        <div class="card-art">${artSvg(card.art)}</div>
        ${stars}
        <div class="card-kind">${kindLabel(card)}</div>
        ${stats}
      </div>
    </div>`;
  }

  function setText(node, text) { if (node && node.textContent !== String(text)) node.textContent = text; }

  function lpWidth(lp) { return clamp((lp / 4000) * 100, 0, 100); }

  function renderHUD() {
    if (!duel.player) return;
    const p = duel.player, a = duel.ai;
    setText(el.playerLpNum, p.lp);
    setText(el.aiLpNum, a.lp);
    el.playerLpBar.style.width = lpWidth(p.lp) + '%';
    el.aiLpBar.style.width = lpWidth(a.lp) + '%';
    el.playerLpBar.classList.toggle('low', p.lp <= 1200);
    el.aiLpBar.classList.toggle('low', a.lp <= 1200);
    setText($('#playerHandCount'), p.hand.length);
    setText($('#aiHandCount'), a.hand.length);
    setText($('#playerDeckCount'), p.deck.length);
    setText($('#aiDeckCount'), a.deck.length);
    setText($('#playerGraveCount'), p.grave.length);
    setText($('#aiGraveCount'), a.grave.length);
    setText($('#playerDeckCount2'), p.deck.length);
    setText($('#aiDeckCount2'), a.deck.length);
    setText($('#playerGraveCount2'), p.grave.length);
    setText($('#aiGraveCount2'), a.grave.length);
    setText(el.turnLabel, `TURN ${state.turn}`);
    let phase = '';
    if (state.over) phase = state.winner === 'player' ? 'デュエル終了・勝利' : 'デュエル終了・敗北';
    else if (state.active === 'ai') phase = 'ファラオの影のターン';
    else phase = state.busy ? '処理中…' : 'あなたのメインフェイズ';
    setText(el.phaseLabel, phase);
    el.playerHead.classList.toggle('active', state.active === 'player' && !state.over);
    el.aiHead.classList.toggle('active', state.active === 'ai' && !state.over);
    el.aiHead.classList.toggle('attackable', isDirectAvailable());
    renderPile(el.aiGraveTop, a.grave);
    renderPile(el.playerGraveTop, p.grave);
  }

  function renderPile(node, grave) {
    if (!node) return;
    if (!grave.length) { node.innerHTML = '<span class="grave-empty">☥</span>'; return; }
    const c = grave[grave.length - 1];
    node.innerHTML = `<div class="grave-card">${artSvg(c.art)}<span>${esc(c.name)}</span></div>`;
  }

  function renderBoard() {
    if (!duel.player) return;
    el.aiHand.innerHTML = Array.from({ length: duel.ai.hand.length }, (_, i) =>
      `<span class="hand-back-mini" style="transform:rotate(${(i - (duel.ai.hand.length - 1) / 2) * 3}deg) translateY(${Math.abs(i - (duel.ai.hand.length - 1) / 2) * 0.7}px)">☥</span>`
    ).join('');

    renderZones('ai', 'spell');
    renderZones('ai', 'monster');
    renderZones('player', 'monster');
    renderZones('player', 'spell');
  }

  function isDirectAvailable() {
    if (!duel.player || state.screen !== 'game') return false;
    if (state.active !== 'player' || state.busy || state.over) return false;
    const sel = state.selected;
    if (!sel || sel.type !== 'monster') return false;
    const m = duel.player.monster[sel.idx];
    if (!m || !m.faceUp || m.position !== 'atk' || m.hasAttacked) return false;
    return duel.ai.monster.every((x) => !x);
  }

  function isTributeCandidate(side, row, idx) {
    const p = state.pending;
    if (!p || p.type !== 'tribute') return false;
    if (side !== 'player' || row !== 'monster') return false;
    const m = duel.player.monster[idx];
    return !!m && m.faceUp;
  }

  function isAttackTarget(side, row, idx) {
    if (side !== 'ai' || row !== 'monster') return false;
    if (state.active !== 'player' || state.busy || state.over) return false;
    const sel = state.selected;
    if (!sel || sel.type !== 'monster') return false;
    const m = duel.player.monster[sel.idx];
    if (!m || !m.faceUp || m.position !== 'atk' || m.hasAttacked) return false;
    return !!duel.ai.monster[idx];
  }

  function pendingTargetMatch(side, row, idx) {
    const p = state.pending;
    if (!p || p.type !== 'target') return false;
    if (p.target === 'enemyMonster') return side === 'ai' && row === 'monster' && !!duel.ai.monster[idx];
    if (p.target === 'ownMonster') return side === 'player' && row === 'monster' && duel.player.monster[idx] && duel.player.monster[idx].faceUp;
    if (p.target === 'enemySpell') return side === 'ai' && row === 'spell' && !!duel.ai.spell[idx] && duel.ai.spell[idx].set;
    return false;
  }

  function renderZones(side, row) {
    const d = duel[side];
    const arr = row === 'monster' ? d.monster : d.spell;
    const node = side === 'player'
      ? (row === 'monster' ? el.playerMonster : el.playerSpell)
      : (row === 'monster' ? el.aiMonster : el.aiSpell);
    if (!node) return;
    node.innerHTML = arr.map((card, i) => {
      const classes = ['zone'];
      if (!card) classes.push('empty-zone');
      if (card && isTributeCandidate(side, row, i)) classes.push('tribute-pick');
      if (card && state.pending && state.pending.type === 'tribute' && state.pending.chosen.includes(i)) classes.push('tribute-chosen');
      if (card && isAttackTarget(side, row, i)) classes.push('attackable');
      if (card && pendingTargetMatch(side, row, i)) classes.push('legal');
      let inner = '<span class="zone-rune">☥</span>';
      if (card) {
        const revealed = card.uid === state.revealUid;
        const faceDown = !revealed && (row === 'monster' ? !card.faceUp : card.set);
        inner = cardHTML(card, { faceDown, owner: side, cls: revealed ? 'revealed' : '' });
      }
      const aria = card ? `${nameOf(side)}の${card.name}` : `${nameOf(side)}の空きゾーン`;
      return `<div class="${classes.join(' ')}" data-side="${side}" data-row="${row}" data-idx="${i}" role="button" tabindex="0" aria-label="${esc(aria)}">${inner}</div>`;
    }).join('');
  }

  function renderHand() {
    if (!duel.player) return;
    const hand = duel.player.hand;
    const n = hand.length;
    const rootStyle = getComputedStyle(document.documentElement);
    const sample = el.playerHand.querySelector('.hand-card');
    const cardW = sample ? sample.offsetWidth : (parseFloat(rootStyle.getPropertyValue('--hand-w')) || 104);
    const arenaW = (el.arena ? el.arena.clientWidth : 900) - 48;
    const gap = 6;
    let overlap = n > 1 ? Math.ceil((n * cardW + (n - 1) * gap - arenaW) / (n - 1)) : 0;
    overlap = clamp(overlap, 0, cardW * 0.58);
    const total = n * cardW + (n - 1) * gap - (n - 1) * overlap;
    el.playerHand.classList.toggle('scroll', total > arenaW + 4);
    el.playerHand.style.setProperty('--overlap', overlap + 'px');
    el.playerHand.innerHTML = hand.map((card, i) => {
      const mid = (n - 1) / 2;
      const off = i - mid;
      const rot = clamp(off * 4.2, -17, 17);
      const lift = Math.pow(Math.abs(off), 1.55) * 2.4;
      const selected = state.selected && state.selected.type === 'hand' && state.selected.idx === i;
      const disabled = state.active !== 'player' || state.busy || state.over;
      const tag = card.type === 'monster' ? `Lv${card.level}` : card.type === 'spell' ? '魔法' : '罠';
      return `<div class="hand-card ${card.type} ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}" data-hand-idx="${i}" data-uid="${card.uid}" role="button" tabindex="0"
        style="--rot:${rot}deg;--lift:${lift}px;z-index:${10 + i}" title="${esc(card.name)}｜${esc(card.text)}">
        ${cardHTML(card)}
        <span class="hand-tag">${tag}</span>
      </div>`;
    }).join('');
    if (n) {
      const last = el.playerHand.lastElementChild;
      if (el.playerHand.classList.contains('scroll') && last) el.playerHand.scrollLeft = el.playerHand.scrollWidth;
    }
  }

  function renderLog() {
    if (!el.logList) return;
    el.logList.innerHTML = state.log.map((e) =>
      `<li class="log-entry ${e.tone}"><span class="log-turn">T${e.turn}</span><span>${e.text}</span></li>`
    ).join('');
    el.logList.scrollTop = el.logList.scrollHeight;
  }

  function selectionHTML() {
    const p = state.pending;
    if (p && p.type === 'tribute') {
      return `<span class="si-name">${esc(p.card.name)}</span><span class="si-stats">生贄 ${p.chosen.length}/${p.need}</span><span class="si-text">生贄にするモンスターを選択してください。</span>`;
    }
    if (p && p.type === 'target') {
      const hint = p.target === 'enemyMonster' ? '相手モンスターを選択' : p.target === 'ownMonster' ? '自分のモンスターを選択' : '相手のセットカードを選択';
      return `<span class="si-name">${esc(p.card.name)}</span><span class="si-stats">対象選択</span><span class="si-text">${hint}してください。${p.optional ? '（対象なしで発動できます）' : ''}</span>`;
    }
    const s = state.selected;
    if (!s) {
      if (state.over) return '<span class="si-text">デュエルは終了しました。</span>';
      if (state.active === 'ai') return '<span class="si-text">ファラオの影が動いています…</span>';
      return '<span class="si-text">手札のカードを選択するか、自分のモンスターを選んで攻撃。</span>';
    }
    if (s.type === 'hand') {
      const c = s.card;
      const stats = c.type === 'monster' ? `ATK ${c.atk} / DEF ${c.def} · Lv${c.level}` : c.type === 'spell' ? '魔法カード' : '罠カード';
      const warn = c.type === 'monster' && duel.player.normalSummoned ? '<span class="si-warn"> このターンの召喚権は使用済みです。</span>' : '';
      return `<span class="si-name">${esc(c.name)}</span><span class="si-stats">${stats}</span>${warn}<span class="si-text">${esc(c.text)}</span>`;
    }
    if (s.type === 'monster') {
      const m = duel.player.monster[s.idx];
      if (!m) return '<span class="si-text">カードを選択してください。</span>';
      return `<span class="si-name">${esc(m.name)}</span><span class="si-stats">ATK ${effAtk(m)} / DEF ${effDef(m)} · ${m.position === 'atk' ? '攻撃表示' : '守備表示'}</span><span class="si-text">攻撃する相手をタップ。表示形式の変更もできます。</span>`;
    }
    if (s.type === 'fieldSpell') {
      const c = duel.player.spell[s.idx];
      if (!c) return '<span class="si-text">カードを選択してください。</span>';
      return `<span class="si-name">${esc(c.name)}</span><span class="si-stats">セットカード</span><span class="si-text">${esc(c.text)}</span>`;
    }
    return '<span class="si-text">カードを選択してください。</span>';
  }

  function btn(act, label, cls = '', disabled = false) {
    return `<button class="btn ${cls}" data-act="${act}" ${disabled ? 'disabled' : ''}>${label}</button>`;
  }

  function canActivate(card) {
    if (!card || card.type === 'trap') return false;
    switch (card.id) {
      case 'pyramid-shield': return duel.player.monster.some((m) => m && m.faceUp);
      case 'sandstorm': return duel.ai.monster.some((m) => m && m.faceUp);
      case 'offering-ra':
      case 'eclipse-veil': return duel.ai.monster.some(Boolean);
      case 'book-afterlife': return duel.player.grave.some((c) => c.type === 'monster') && duel.player.monster.includes(null);
      default: return true;
    }
  }

  function renderActions() {
    if (!duel.player) return;
    const p = state.pending;
    const s = state.selected;
    const myTurn = state.active === 'player' && !state.busy && !state.over;
    const out = [];
    const endBtn = btn('end', 'ターン終了', 'end', !myTurn);
    if (p && p.type === 'tribute') {
      out.push(btn('cancel', 'キャンセル', 'ghost'));
    } else if (p && p.type === 'target') {
      if (p.optional) out.push(btn('play-no-target', '対象なしで発動', 'good'));
      out.push(btn('cancel', 'キャンセル', 'ghost'));
    } else if (s && s.type === 'hand') {
      const c = s.card;
      if (c.type === 'monster') {
        const empty = duel.player.monster.indexOf(null);
        const need = tributesNeeded(c);
        const enough = duel.player.monster.filter(Boolean).length >= need;
        const can = myTurn && !duel.player.normalSummoned && empty >= 0 && enough;
        out.push(btn('summon', need ? `召喚（生贄${need}）` : '召喚', 'primary', !can));
        out.push(btn('set-monster', need ? `セット（生贄${need}）` : '守備セット', '', !can));
      } else if (c.type === 'spell') {
        out.push(btn('activate', '発動', 'primary', !myTurn || !canActivate(c)));
        const empty = duel.player.spell.indexOf(null);
        out.push(btn('set-spell', 'セット', '', !myTurn || empty < 0));
      } else {
        const empty = duel.player.spell.indexOf(null);
        out.push(btn('set-spell', 'セット', 'primary', !myTurn || empty < 0));
      }
      out.push(btn('cancel', 'キャンセル', 'ghost'));
    } else if (s && s.type === 'monster') {
      const m = duel.player.monster[s.idx];
      if (m) {
        if (isDirectAvailable()) out.push(btn('direct', 'ダイレクトアタック', 'primary'));
        if (!m.changedPosition && !m.hasAttacked) {
          out.push(btn('position', m.position === 'atk' ? '守備表示へ' : '攻撃表示へ', ''));
        }
      }
      out.push(btn('cancel', 'キャンセル', 'ghost'));
    } else if (s && s.type === 'fieldSpell') {
      const c = duel.player.spell[s.idx];
      if (c && c.type === 'spell' && myTurn && c.setTurn < state.turn) out.push(btn('activate-field', '発動', 'primary'));
      out.push(btn('cancel', 'キャンセル', 'ghost'));
    }
    out.push(endBtn);
    el.actionButtons.innerHTML = out.join('');
    el.selectionInfo.innerHTML = selectionHTML();
  }

  function render() {
    if (state.screen !== 'game' || !duel.player) return;
    renderHUD();
    renderBoard();
    renderHand();
    renderLog();
    renderActions();
  }

  function addLog(text, tone = '') {
    state.log.push({ turn: Math.max(1, state.turn), text, tone });
    if (state.log.length > 120) state.log.shift();
  }

  let toastTimer = 0;
  function toast(text) {
    if (!el.toast) return;
    el.toast.textContent = text;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2100);
  }

  function tributesNeeded(card) {
    if (!card || card.type !== 'monster') return 0;
    if (card.level >= 7) return 2;
    if (card.level >= 5) return 1;
    return 0;
  }

  /* =============================== GAME FLOW ============================== */
  function buildDeck() {
    const cards = [];
    for (const [id, n] of DECK_LIST) for (let i = 0; i < n; i++) cards.push(makeCard(id));
    return shuffle(cards);
  }

  function showScreen(name) {
    state.screen = name;
    el.title.classList.toggle('hidden', name !== 'title');
    el.game.classList.toggle('hidden', name !== 'game');
    $('#logBtn').classList.toggle('hidden', name !== 'game');
  }

  function startDuel() {
    Sound.init();
    state.runId++;
    state.turn = 0;
    state.active = null;
    state.busy = true;
    state.over = false;
    state.winner = null;
    state.selected = null;
    state.pending = null;
    state.revealUid = null;
    state.log = [];
    state.hint = '';
    state.stats = { player: { dmg: 0, destroyed: 0, summons: 0 }, ai: { dmg: 0, destroyed: 0, summons: 0 } };
    state.startedAt = Date.now();
    duel.player = makeDuelist('player', 'あなた');
    duel.ai = makeDuelist('ai', 'ファラオの影');
    duel.player.deck = buildDeck();
    duel.ai.deck = buildDeck();
    for (let i = 0; i < 5; i++) { drawCard(duel.player, 1, true); drawCard(duel.ai, 1, true); }
    showScreen('game');
    closeModal();
    render();
    addLog('デュエル開始。千年の闘いが幕を開ける。', 'gold');
    Sound.play('draw');
    startTurn('player');
    resizeHandSoon();
  }

  async function startTurn(key) {
    if (state.over) return;
    const rid = state.runId;
    state.turn++;
    state.active = key;
    state.busy = true;
    state.selected = null;
    state.pending = null;
    const d = sideOf(key);
    d.normalSummoned = false;
    for (const m of d.monster) {
      if (!m) continue;
      m.hasAttacked = false;
      m.changedPosition = false;
    }
    addLog(`―― ターン${state.turn}：${nameOf(key)}のターン`, 'turn');
    render();
    await sleep(240);
    if (state.over || rid !== state.runId) return;
    const drew = drawCard(d, 1, false);
    render();
    if (!drew || state.over || rid !== state.runId) return;
    if (key === 'ai') {
      await sleep(620);
      if (state.over || rid !== state.runId) return;
      await aiTurn();
    } else {
      state.busy = false;
      render();
    }
  }

  function drawCard(d, n = 1, silent = false) {
    for (let i = 0; i < n; i++) {
      if (!d.deck.length) {
        addLog(`${nameOf(d.key)}のデッキが尽きた。`, 'damage');
        endGame(other(d.key), 'deck');
        return false;
      }
      const c = d.deck.pop();
      c.faceUp = true;
      c.position = 'atk';
      c.hasAttacked = false;
      d.hand.push(c);
      if (!silent) {
        addLog(`${nameOf(d.key)}はカードを1枚ドローした。`, 'draw');
        Sound.play('draw');
      }
    }
    return true;
  }

  function clearTemp(key) {
    const d = sideOf(key);
    for (const m of d.monster) if (m) m.tempAtk = 0;
  }

  async function endPlayerTurn() {
    if (state.active !== 'player' || state.busy || state.over) return;
    state.busy = true;
    state.selected = null;
    state.pending = null;
    clearTemp('player');
    addLog('あなたはターンを終了した。', '');
    render();
    await sleep(300);
    startTurn('ai');
  }

  async function endAiTurn() {
    if (state.over) return;
    const rid = state.runId;
    clearTemp('ai');
    addLog('ファラオの影はターンを終了した。', '');
    state.busy = true;
    render();
    await sleep(420);
    if (state.over || rid !== state.runId) return;
    startTurn('player');
  }

  function damage(key, amount) {
    if (state.over || amount <= 0) return;
    const d = sideOf(key);
    if (!d) return;
    d.lp = Math.max(0, d.lp - amount);
    state.stats[other(key)].dmg += amount;
    addLog(`${nameOf(key)}に ${amount} ダメージ。`, 'damage');
    Sound.play('hit');
    render();
    fxFloat(key, '-' + amount, '');
    fxHeadHit(key);
    if (d.lp <= 0) endGame(other(key), 'lp');
  }

  function heal(key, amount) {
    if (state.over || amount <= 0) return;
    const d = sideOf(key);
    d.lp = Math.min(9999, d.lp + amount);
    addLog(`${nameOf(key)}は ${amount} ライフポイント回復。`, 'heal');
    Sound.play('spell');
    render();
    fxFloat(key, '+' + amount, 'heal');
  }

  function endGame(winner, reason) {
    if (state.over) return;
    state.over = true;
    state.winner = winner;
    state.busy = true;
    state.selected = null;
    state.pending = null;
    addLog(winner === 'player' ? 'あなたの勝利！' : 'あなたの敗北…', winner === 'player' ? 'gold' : 'damage');
    if (reason === 'deck') addLog('デッキ切れによりデュエルは終了した。', '');
    render();
    Sound.play(winner === 'player' ? 'win' : 'lose');
    setTimeout(() => showEnd(winner, reason), 820);
  }

  /* ============================ INTERACTIONS ============================= */
  function handleHandClick(idx) {
    if (state.screen !== 'game' || state.busy || state.over || state.active !== 'player') return;
    if (state.pending) return;
    const card = duel.player.hand[idx];
    if (!card) return;
    if (state.selected && state.selected.type === 'hand' && state.selected.idx === idx) {
      state.selected = null;
    } else {
      state.selected = { type: 'hand', idx, card };
      Sound.play('select');
    }
    render();
  }

  function selectMonster(idx) {
    const m = duel.player.monster[idx];
    if (!m || !m.faceUp) return;
    if (state.selected && state.selected.type === 'monster' && state.selected.idx === idx) {
      state.selected = null;
    } else {
      state.selected = { type: 'monster', idx };
      Sound.play('select');
    }
    render();
  }

  function selectFieldSpell(idx) {
    const c = duel.player.spell[idx];
    if (!c || !c.set) return;
    state.selected = { type: 'fieldSpell', idx };
    Sound.play('select');
    render();
  }

  function clearSelection() {
    state.selected = null;
    state.pending = null;
    render();
  }

  function handleZoneClick(side, row, idx) {
    if (state.screen !== 'game' || state.busy || state.over) return;
    const p = state.pending;
    if (p && p.type === 'tribute') {
      if (side === 'player' && row === 'monster') toggleTribute(idx);
      return;
    }
    if (p && p.type === 'target') {
      if (pendingTargetMatch(side, row, idx)) resolveTarget(side, row, idx);
      return;
    }
    const s = state.selected;
    if (s && s.type === 'monster') {
      if (side === 'ai' && row === 'monster' && duel.ai.monster[idx]) {
        playerAttack(s.idx, idx);
      } else if (side === 'player' && row === 'monster' && duel.player.monster[idx]) {
        selectMonster(idx);
      } else if (side === 'player' && row === 'spell' && duel.player.spell[idx]) {
        selectFieldSpell(idx);
      }
      return;
    }
    if (s && s.type === 'fieldSpell') {
      if (side === 'player' && row === 'monster' && duel.player.monster[idx]) selectMonster(idx);
      else if (side === 'ai' && row === 'monster' && duel.ai.monster[idx]) return;
      return;
    }
    if (side === 'player' && row === 'monster' && duel.player.monster[idx]) selectMonster(idx);
    else if (side === 'player' && row === 'spell' && duel.player.spell[idx]) selectFieldSpell(idx);
  }

  function handleDirect() {
    if (!isDirectAvailable()) return;
    playerAttack(state.selected.idx, null);
  }

  function beginSummon(mode) {
    const s = state.selected;
    if (!s || s.type !== 'hand' || s.card.type !== 'monster') return;
    if (state.active !== 'player' || state.busy || state.over) return;
    const d = duel.player;
    if (d.normalSummoned) { toast('このターンの召喚権はすでに使用しました'); return; }
    const empty = d.monster.indexOf(null);
    if (empty < 0) { toast('モンスターゾーンが埋まっています'); return; }
    const need = tributesNeeded(s.card);
    if (need > 0) {
      if (d.monster.filter(Boolean).length < need) { toast(`生贄が${need}体必要です`); return; }
      state.pending = { type: 'tribute', card: s.card, idx: s.idx, mode, need, chosen: [] };
      state.selected = null;
      render();
      return;
    }
    performSummon('player', s.card.uid, mode);
  }

  function toggleTribute(idx) {
    const p = state.pending;
    if (!p || p.type !== 'tribute') return;
    const candidate = duel.player.monster[idx];
    if (!candidate || !candidate.faceUp) return;
    const at = p.chosen.indexOf(idx);
    if (at >= 0) p.chosen.splice(at, 1);
    else if (p.chosen.length < p.need) p.chosen.push(idx);
    if (p.chosen.length === p.need) {
      const empty = duel.player.monster.findIndex((m, i) => !m && !p.chosen.includes(i));
      if (empty < 0) { toast('空きゾーンがありません'); clearSelection(); return; }
      const card = p.card, mode = p.mode, tributes = [...p.chosen];
      state.pending = null;
      performSummon('player', card.uid, mode, tributes);
      return;
    }
    render();
  }

  function removeFromHand(d, card) {
    const i = d.hand.findIndex((c) => c.uid === card.uid);
    if (i >= 0) d.hand.splice(i, 1);
    return i;
  }

  async function performSummon(key, cardUid, mode, tributes = [], opts = {}) {
    const d = sideOf(key);
    const card = d.hand.find((c) => c.uid === cardUid);
    if (!card) return;
    state.busy = true;
    state.pending = null;
    state.selected = null;
    removeFromHand(d, card);
    const zone = d.monster.findIndex((m, i) => !m && !tributes.includes(i));
    if (zone < 0) { d.hand.push(card); state.busy = state.active === 'player' ? false : true; render(); return; }
    for (const ti of tributes.slice().sort((a, b) => b - a)) {
      const m = d.monster[ti];
      if (!m) continue;
      d.monster[ti] = null;
      d.grave.push(m);
      addLog(`${nameOf(key)}は「${m.name}」を生贄に捧げた。`, 'destroy');
    }
    card.faceUp = mode !== 'set';
    card.position = mode === 'set' ? 'set' : 'atk';
    card.summonedTurn = state.turn;
    card.hasAttacked = false;
    card.changedPosition = false;
    d.monster[zone] = card;
    if (!opts.special) d.normalSummoned = true;
    state.stats[key].summons++;
    addLog(`${nameOf(key)}は「${card.name}」を${opts.special ? '特殊召喚' : mode === 'set' ? 'セット' : '召喚'}した。`, mode === 'set' ? 'set' : 'summon');
    Sound.play(mode === 'set' ? 'set' : 'summon');
    render();
    const node = document.querySelector(`[data-uid="${card.uid}"]`);
    if (node) fxSummon(node, mode === 'set');
    await sleep(340);
    if (state.over) return;
    if (card.faceUp) await onSummonEffect(key, card);
    if (state.over) return;
    await checkSummonTraps(key, card, zone);
    if (state.active === 'player' && !state.over) state.busy = false;
    render();
  }

  async function onSummonEffect(key, card) {
    if (card.id === 'nile-serpent') {
      addLog(`「${card.name}」の効果：砂塵が相手を襲う。`, 'spell');
      await sleep(180);
      damage(other(key), 300);
    } else if (card.id === 'sphinx-eclipse') {
      addLog(`「${card.name}」の効果：月蝕の光がLPを癒す。`, 'heal');
      await sleep(180);
      heal(key, 500);
    }
  }

  function findTrap(key, event) {
    const d = sideOf(key);
    for (let i = 0; i < d.spell.length; i++) {
      const t = d.spell[i];
      if (!t || !t.set || t.setTurn >= state.turn) continue;
      if (event === 'attack' && ['mirror-tablet', 'sand-pit', 'curse-sphinx'].includes(t.id)) return { card: t, idx: i };
      if (event === 'summon' && t.id === 'wrath-desert') return { card: t, idx: i };
    }
    return null;
  }

  async function revealTrapAndSend(key, trap, idx) {
    state.revealUid = trap.uid;
    render();
    await sleep(680);
    if (duel[key].spell[idx] && duel[key].spell[idx].uid === trap.uid) {
      duel[key].spell[idx] = null;
      duel[key].grave.push(trap);
    }
    state.revealUid = null;
    render();
  }

  async function resolveAttackTrap(defKey, trap, idx, ctx) {
    const owner = nameOf(defKey);
    addLog(`${owner}は罠「${trap.card.name}」を発動！`, 'trap');
    Sound.play('trap');
    await revealTrapAndSend(defKey, trap.card, idx);
    let negated = false;
    if (trap.card.id === 'mirror-tablet') {
      negated = true;
      addLog('攻撃は鏡の石板に吸い込まれた！', 'trap');
      await sleep(180);
      damage(other(defKey), effAtk(ctx.attacker));
    } else if (trap.card.id === 'sand-pit') {
      negated = true;
      addLog('流砂が攻撃モンスターを飲み込む！', 'trap');
      await sleep(180);
      const dead = destroyMonster(ctx.atkKey, ctx.atkIdx);
      if (dead) {
        const node = document.querySelector(`[data-uid="${ctx.attacker.uid}"]`);
        if (node) fxDestroy(node);
        await sleep(320);
      }
      render();
    } else if (trap.card.id === 'curse-sphinx') {
      negated = false;
      addLog(`「${ctx.attacker.name}」の攻撃力が800ダウンした。`, 'trap');
      ctx.attacker.atkMod -= 800;
      render();
      await sleep(300);
    }
    return negated;
  }

  async function checkSummonTraps(key, card, zone) {
    const enemy = other(key);
    const trap = findTrap(enemy, 'summon');
    if (!trap) return;
    addLog(`${nameOf(enemy)}は罠「${trap.card.name}」を発動！`, 'trap');
    Sound.play('trap');
    await revealTrapAndSend(enemy, trap.card, trap.idx);
    const d = sideOf(key);
    if (!d.monster[zone] || d.monster[zone].uid !== card.uid) return;
    addLog('砂漠の怒りが召喚を打ち消す！', 'trap');
    await sleep(160);
    const node = document.querySelector(`[data-uid="${card.uid}"]`);
    if (node) fxDestroy(node);
    destroyMonster(key, zone);
    render();
    await sleep(300);
  }

  function destroyMonster(key, idx) {
    const d = sideOf(key);
    const m = d.monster[idx];
    if (!m) return null;
    d.monster[idx] = null;
    m.faceUp = true;
    d.grave.push(m);
    state.stats[other(key)].destroyed++;
    addLog(`${nameOf(key)}の「${m.name}」が破壊された。`, 'destroy');
    if (m.id === 'golden-scarab' && !state.over) {
      addLog('「Golden Scarab」の効果：カードを1枚ドロー。', 'spell');
      drawCard(d, 1, false);
    }
    return m;
  }

  function sendFieldSpellToGrave(key, idx) {
    const d = sideOf(key);
    const c = d.spell[idx];
    if (!c) return;
    d.spell[idx] = null;
    d.grave.push(c);
  }

  function calcAttack(attacker, defender) {
    const a = effAtk(attacker);
    if (!defender) return { direct: true, dmg: a };
    if (defender.position === 'atk') {
      const d = effAtk(defender);
      if (a > d) return { destroyDef: true, damage: a - d };
      if (a < d) return { destroyAtk: true, damage: d - a };
      return { destroyDef: true, destroyAtk: true, damage: 0 };
    }
    const df = effDef(defender);
    if (a > df) return { destroyDef: true, damage: attacker.id === 'dune-assassin' ? a - df : 0 };
    if (a < df) return { destroyAtk: true, damage: df - a };
    return { damage: 0 };
  }

  async function playerAttack(atkIdx, targetIdx) {
    if (state.active !== 'player' || state.busy || state.over) return;
    const m = duel.player.monster[atkIdx];
    if (!m || !m.faceUp || m.position !== 'atk' || m.hasAttacked) return;
    if (targetIdx === null && duel.ai.monster.some(Boolean)) return;
    await performAttack('player', atkIdx, targetIdx);
    if (!state.over && state.active === 'player') state.busy = false;
    render();
  }

  async function performAttack(atkKey, atkIdx, targetIdx) {
    const A = sideOf(atkKey), D = sideOf(other(atkKey));
    const attacker = A.monster[atkIdx];
    if (!attacker) return;
    const defender = targetIdx === null ? null : D.monster[targetIdx];
    state.busy = true;
    state.selected = null;
    state.pending = null;
    addLog(defender
      ? `${nameOf(atkKey)}の「${attacker.name}」が「${defender.name}」に攻撃！`
      : `${nameOf(atkKey)}の「${attacker.name}」がダイレクトアタック！`, 'summon');
    Sound.play('attack');
    render();
    await sleep(260);
    if (state.over) return;

    const trap = findTrap(other(atkKey), 'attack');
    if (trap) {
      const negated = await resolveAttackTrap(other(atkKey), trap, trap.idx, { attacker, atkKey, atkIdx });
      if (negated || state.over) {
        attacker.hasAttacked = true;
        render();
        return;
      }
      if (!attacker || !A.monster[atkIdx]) return;
    }

    if (defender && !defender.faceUp) {
      defender.faceUp = true;
      defender.position = 'def';
      defender.set = false;
      addLog(`セットされていた「${defender.name}」がリバースした。`, 'summon');
      render();
      await sleep(380);
      if (defender.id === 'shadow-priestess') {
        addLog('「Shadow Priestess」のリバース効果：カードを1枚ドロー。', 'spell');
        drawCard(D, 1, false);
        render();
        await sleep(240);
      }
    }

    const outcome = calcAttack(attacker, defender);
    const atkNode = document.querySelector(`[data-side="${atkKey}"] [data-uid="${attacker.uid}"]`) || document.querySelector(`[data-uid="${attacker.uid}"]`);
    const defNode = defender ? document.querySelector(`[data-uid="${defender.uid}"]`) : null;
    await fxAttack(atkNode, defNode, atkKey, outcome);

    attacker.hasAttacked = true;

    if (outcome.destroyAtk) destroyMonster(atkKey, atkIdx);
    if (outcome.destroyDef && defender) {
      const idx = D.monster.findIndex((m) => m && m.uid === defender.uid);
      if (idx >= 0) destroyMonster(other(atkKey), idx);
    }
    render();
    if (outcome.damage > 0) {
      if (outcome.destroyAtk) damage(atkKey, outcome.damage);
      else if (outcome.destroyDef) damage(other(atkKey), outcome.damage);
      else if (outcome.direct) damage(other(atkKey), outcome.damage);
    } else if (outcome.direct) {
      damage(other(atkKey), outcome.dmg);
    }
    if (outcome.direct) {
      // direct attacks carry their damage in `dmg`
      // (handled above via the extra branch)
    }
    render();
    await sleep(340);
  }

  function resolveTarget(side, row, idx) {
    const p = state.pending;
    if (!p || p.type !== 'target') return;
    const target = side === 'player' ? duel.player[row][idx] : duel.ai[row][idx];
    if (!target) return;
    state.pending = null;
    state.selected = null;
    executeSpell(p.from === 'field' ? 'player' : 'player', p.card, { side, row, idx, card: target }, p.from);
  }

  function beginActivate() {
    const s = state.selected;
    if (!s || s.type !== 'hand' || s.card.type !== 'spell') return;
    if (state.active !== 'player' || state.busy || state.over) return;
    if (!canActivate(s.card)) { toast('発動条件を満たしていません'); return; }
    const card = s.card;
    if (card.id === 'book-afterlife') { openGravePicker(card, 'hand'); return; }
    let target = null;
    if (card.id === 'pyramid-shield') target = 'ownMonster';
    else if (['offering-ra', 'eclipse-veil'].includes(card.id)) target = 'enemyMonster';
    else if (card.id === 'golden-edict') {
      const hasSet = duel.ai.spell.some((c) => c && c.set);
      if (hasSet) target = 'enemySpell';
    }
    if (target) {
      state.pending = { type: 'target', card, from: 'hand', target };
      state.selected = null;
      render();
      return;
    }
    state.selected = null;
    executeSpell('player', card, null, 'hand');
  }

  function beginActivateField() {
    const s = state.selected;
    if (!s || s.type !== 'fieldSpell') return;
    const card = duel.player.spell[s.idx];
    if (!card || card.type !== 'spell' || card.setTurn >= state.turn) return;
    if (state.busy || state.over || state.active !== 'player') return;
    if (card.id === 'book-afterlife') { openGravePicker(card, 'field', s.idx); return; }
    let target = null;
    if (card.id === 'pyramid-shield') target = 'ownMonster';
    else if (['offering-ra', 'eclipse-veil'].includes(card.id)) target = 'enemyMonster';
    else if (card.id === 'golden-edict') {
      const hasSet = duel.ai.spell.some((c) => c && c.set);
      if (hasSet) target = 'enemySpell';
    }
    if (target) {
      state.pending = { type: 'target', card, from: 'field', fieldIdx: s.idx, target };
      state.selected = null;
      render();
      return;
    }
    state.selected = null;
    executeSpell('player', card, null, 'field');
  }

  function setSpellFromHand() {
    const s = state.selected;
    if (!s || s.type !== 'hand' || (s.card.type !== 'spell' && s.card.type !== 'trap')) return;
    if (state.active !== 'player' || state.busy || state.over) return;
    const d = duel.player;
    const empty = d.spell.indexOf(null);
    if (empty < 0) { toast('魔法・罠ゾーンが埋まっています'); return; }
    removeFromHand(d, s.card);
    s.card.set = true;
    s.card.faceUp = false;
    s.card.setTurn = state.turn;
    d.spell[empty] = s.card;
    state.selected = null;
    addLog(`あなたはカードを1枚セットした。`, 'set');
    Sound.play('set');
    render();
    const node = document.querySelector(`[data-uid="${s.card.uid}"]`);
    if (node) fxSummon(node, true);
  }

  async function executeSpell(key, card, target, from = 'hand') {
    const d = sideOf(key);
    state.busy = true;
    state.selected = null;
    state.pending = null;
    if (from === 'hand') removeFromHand(d, card);
    else {
      const i = d.spell.findIndex((c) => c.uid === card.uid);
      if (i >= 0) d.spell[i] = null;
    }
    card.faceUp = true;
    addLog(`${nameOf(key)}は魔法「${card.name}」を発動！`, 'spell');
    Sound.play('spell');
    const anchor = target && target.card ? document.querySelector(`[data-uid="${target.card.uid}"]`) : null;
    fxSpell(anchor);
    render();
    await sleep(380);
    if (state.over) return;

    switch (card.id) {
      case 'solar-flare':
        addLog('太陽の閃光が相手を焼く！', 'spell');
        await sleep(160);
        damage(other(key), 800);
        break;
      case 'relic-recovery':
        addLog('遺物が手札へと還る。', 'spell');
        drawCard(d, 2, false);
        break;
      case 'pyramid-shield':
        if (target && target.card) {
          target.card.tempAtk += 700;
          addLog(`「${target.card.name}」の攻撃力が700アップした。`, 'spell');
          render();
          await sleep(260);
        }
        break;
      case 'sandstorm': {
        const e = sideOf(other(key));
        let n = 0;
        for (const m of e.monster) if (m && m.faceUp) { m.tempAtk -= 500; n++; }
        addLog(`砂嵐が相手モンスター${n}体の攻撃力を下げた。`, 'spell');
        render();
        await sleep(300);
        break;
      }
      case 'offering-ra':
        if (target && target.card) {
          addLog(`「${target.card.name}」が太陽神へ捧げられた。`, 'spell');
          const idx = sideOf(target.side).monster.findIndex((m) => m && m.uid === target.card.uid);
          const half = Math.floor(target.card.atk / 2);
          if (idx >= 0) destroyMonster(target.side, idx);
          render();
          await sleep(300);
          heal(key, half);
        }
        break;
      case 'eclipse-veil':
        if (target && target.card) {
          addLog(`蝕の帳が「${target.card.name}」を呑み込む。`, 'spell');
          const idx = sideOf(target.side).monster.findIndex((m) => m && m.uid === target.card.uid);
          if (idx >= 0) destroyMonster(target.side, idx);
          render();
          await sleep(280);
          damage(key, 500);
        }
        break;
      case 'golden-edict':
        if (target && target.card) {
          addLog(`黄金の勅令がセットカードを破壊する。`, 'spell');
          const idx = sideOf(target.side).spell.findIndex((c) => c && c.uid === target.card.uid);
          if (idx >= 0) sendFieldSpellToGrave(target.side, idx);
          render();
          await sleep(300);
        } else {
          addLog('対象がないため、黄金の光が相手を貫く。', 'spell');
          await sleep(180);
          damage(other(key), 500);
        }
        break;
      default:
        break;
    }
    d.grave.push(card);
    render();
    await sleep(300);
    if (state.active === 'player' && !state.over) state.busy = false;
    render();
  }

  function openGravePicker(card, from, fieldIdx) {
    const grave = duel.player.grave.filter((c) => c.type === 'monster');
    if (!grave.length) { toast('墓地にモンスターがいません'); return; }
    const empty = duel.player.monster.indexOf(null);
    if (empty < 0) { toast('モンスターゾーンが埋まっています'); return; }
    Sound.play('select');
    openModal(`
      <div class="modal-head"><div><h2>冥界の書<span class="mh-jp">特殊召喚するモンスターを選択</span></h2></div>
      <button class="modal-close" data-modal="close">✕</button></div>
      <div class="modal-body">
        <p>墓地からモンスター1体を守備表示で特殊召喚します。</p>
        <div class="gy-grid">${grave.map((c) => `
          <button class="gy-tile selectable" data-book="${c.uid}" title="${esc(c.text)}">
            ${artSvg(c.art)}<span class="gy-name">${esc(c.name)}</span><span class="gy-stat">ATK ${c.atk} / DEF ${c.def}</span>
          </button>`).join('')}</div>
        <div class="modal-actions"><button class="btn ghost" data-modal="close">キャンセル</button></div>
      </div>
    `);
    state.bookPending = { card, from, fieldIdx };
  }

  async function playBook(targetUid) {
    const ctx = state.bookPending;
    if (!ctx) return;
    const d = duel.player;
    const target = d.grave.find((c) => c.uid === targetUid);
    if (!target) return;
    const zone = d.monster.indexOf(null);
    if (zone < 0) { toast('モンスターゾーンが埋まっています'); return; }
    closeModal();
    state.bookPending = null;
    state.busy = true;
    state.selected = null;
    state.pending = null;
    const gi = d.grave.findIndex((c) => c.uid === targetUid);
    if (gi >= 0) d.grave.splice(gi, 1);
    if (ctx.from === 'hand') removeFromHand(d, ctx.card);
    else {
      const fi = d.spell.findIndex((c) => c.uid === ctx.card.uid);
      if (fi >= 0) d.spell[fi] = null;
    }
    target.faceUp = true;
    target.position = 'def';
    target.hasAttacked = false;
    target.changedPosition = true;
    d.monster[zone] = target;
    state.stats.player.summons++;
    addLog(`冥界の書の効果で「${target.name}」が守備表示で特殊召喚された。`, 'summon');
    Sound.play('summon');
    render();
    const node = document.querySelector(`[data-uid="${target.uid}"]`);
    if (node) fxSummon(node, false);
    await sleep(420);
    d.grave.push(ctx.card);
    render();
    state.busy = false;
  }

  /* ================================== AI ================================== */
  async function aiTurn() {
    const rid = state.runId;
    state.busy = true;
    state.selected = null;
    state.pending = null;
    try {
      await sleep(420);
      if (rid !== state.runId || state.over) return;
      await aiSpellPhase();
      if (state.over || rid !== state.runId) return;
      await aiSummonPhase();
      if (state.over || rid !== state.runId) return;
      await aiSetPhase();
      if (state.over || rid !== state.runId) return;
      await aiBattlePhase();
    } finally {
      if (!state.over && rid === state.runId) await endAiTurn();
    }
  }

  function aiTargetEnemyMonster(strongest = true) {
    const P = duel.player;
    const list = P.monster.map((m, i) => ({ m, i })).filter((x) => x.m);
    if (!list.length) return null;
    list.sort((a, b) => (strongest ? effAtk(b.m) - effAtk(a.m) : effAtk(a.m) - effAtk(b.m)));
    const pick = list[0];
    return { side: 'player', row: 'monster', idx: pick.i, card: pick.m };
  }

  function aiStrongestOwn() {
    const list = duel.ai.monster.map((m, i) => ({ m, i })).filter((x) => x.m && x.m.faceUp);
    list.sort((a, b) => effAtk(b.m) - effAtk(a.m));
    return list[0] ? { m: list[0].m, i: list[0].i } : null;
  }

  function chooseAiSpell() {
    const A = duel.ai, P = duel.player;
    const spells = A.hand.filter((c) => c.type === 'spell');
    if (!spells.length) return null;
    const has = (id) => spells.find((c) => c.id === id);

    const flare = has('solar-flare');
    if (flare && (P.lp <= 800 || (P.lp <= 1300 && P.monster.every((m) => !m)))) return { card: flare };

    const offering = has('offering-ra');
    if (offering) {
      const target = aiTargetEnemyMonster(true);
      if (target && (target.card.faceUp ? effAtk(target.card) >= 1900 : true)) return { card: offering, target };
    }
    const eclipse = has('eclipse-veil');
    if (eclipse && A.lp > 600) {
      const target = aiTargetEnemyMonster(true);
      if (target && target.card.faceUp && effAtk(target.card) >= 2300) return { card: eclipse, target };
    }
    const edict = has('golden-edict');
    if (edict) {
      const si = P.spell.findIndex((c) => c && c.set);
      if (si >= 0) return { card: edict, target: { side: 'player', row: 'spell', idx: si, card: P.spell[si] } };
    }
    const relic = has('relic-recovery');
    if (relic && A.hand.length <= 4) return { card: relic };

    const shield = has('pyramid-shield');
    if (shield) {
      const own = aiStrongestOwn();
      const enemy = aiTargetEnemyMonster(true);
      if (own && (!enemy || effAtk(own.m) <= effAtk(enemy.card))) {
        return { card: shield, target: { side: 'ai', row: 'monster', idx: own.i, card: own.m } };
      }
    }
    const storm = has('sandstorm');
    if (storm && P.monster.filter((m) => m && m.faceUp).length >= 2) return { card: storm };
    const book = has('book-afterlife');
    if (book && A.monster.every((m) => !m) && A.grave.some((c) => c.type === 'monster')) return { card: book };
    if (flare && A.hand.length >= 6) return { card: flare };
    if (relic) return { card: relic };
    return null;
  }

  async function aiSpellPhase() {
    let casts = 0;
    while (casts < 3 && !state.over) {
      const pick = chooseAiSpell();
      if (!pick) break;
      await aiCastSpell(pick.card, pick.target);
      casts++;
      await sleep(520);
    }
  }

  async function aiCastSpell(card, target) {
    if (card.id === 'book-afterlife') { await aiBook(card); return; }
    await executeSpell('ai', card, target || null, 'hand');
  }

  async function aiBook(card) {
    const A = duel.ai;
    const zone = A.monster.indexOf(null);
    const monsters = A.grave.filter((c) => c.type === 'monster').sort((a, b) => b.atk - a.atk);
    if (zone < 0 || !monsters.length) return;
    state.busy = true;
    removeFromHand(A, card);
    const target = monsters[0];
    const gi = A.grave.findIndex((c) => c.uid === target.uid);
    if (gi >= 0) A.grave.splice(gi, 1);
    target.faceUp = true;
    target.position = 'def';
    target.hasAttacked = false;
    target.changedPosition = true;
    A.monster[zone] = target;
    state.stats.ai.summons++;
    addLog(`ファラオの影は「Book of the Afterlife」を発動。「${target.name}」を守備表示で特殊召喚した。`, 'summon');
    Sound.play('summon');
    render();
    const node = document.querySelector(`[data-uid="${target.uid}"]`);
    if (node) fxSummon(node, false);
    await sleep(380);
    A.grave.push(card);
    render();
  }

  function aiPickTributes(need) {
    const list = duel.ai.monster.map((m, i) => ({ m, i })).filter((x) => x.m);
    list.sort((a, b) => effAtk(a.m) - effAtk(b.m));
    return list.slice(0, need).map((x) => x.i);
  }

  async function aiSummonPhase() {
    const A = duel.ai, P = duel.player;
    if (A.normalSummoned) return;
    if (A.monster.indexOf(null) < 0) return;
    const handMonsters = A.hand.filter((c) => c.type === 'monster');
    if (!handMonsters.length) return;
    const fieldCount = A.monster.filter(Boolean).length;
    const ownMax = Math.max(0, ...A.monster.filter(Boolean).map((m) => effAtk(m)));
    const enemyMax = Math.max(0, ...P.monster.filter((m) => m && m.faceUp).map((m) => effAtk(m)));
    const playerHasMonsters = P.monster.some(Boolean);

    const tributeOptions = handMonsters.filter((c) => tributesNeeded(c) > 0 && fieldCount >= tributesNeeded(c));
    tributeOptions.sort((a, b) => b.atk - a.atk);
    for (const c of tributeOptions) {
      const need = tributesNeeded(c);
      if (!(c.atk >= ownMax + 600 || (enemyMax > ownMax && c.atk >= enemyMax - 200))) continue;
      if (A.monster.filter(Boolean).length <= need && !playerHasMonsters) break;
      const tributes = aiPickTributes(need);
      addLog('ファラオの影は生贄召喚を狙う。', '');
      await performSummon('ai', c.uid, 'atk', tributes);
      await sleep(420);
      return;
    }

    const small = handMonsters.filter((c) => tributesNeeded(c) === 0).sort((a, b) => b.atk - a.atk);
    if (small.length) {
      let pick = small[0];
      let mode = 'atk';
      const enemyFace = P.monster.map((m) => m).filter((m) => m && m.faceUp);
      const biggest = enemyFace.sort((a, b) => effAtk(b) - effAtk(a))[0];
      if (biggest && effAtk(biggest) > pick.atk && pick.def > pick.atk && !playerHasMonsters) mode = 'set';
      else if (biggest && effAtk(biggest) > pick.atk + 400 && pick.def > pick.atk) mode = 'set';
      await performSummon('ai', pick.uid, mode);
      await sleep(440);
      return;
    }

    if (tributeOptions.length && fieldCount >= tributesNeeded(tributeOptions[0])) {
      const c = tributeOptions[0];
      await performSummon('ai', c.uid, 'atk', aiPickTributes(tributesNeeded(c)));
      await sleep(440);
    }
  }

  function aiSetPhase() {
    const A = duel.ai;
    const traps = A.hand.filter((c) => c.type === 'trap');
    let sets = 0;
    for (const t of traps) {
      if (sets >= 2) break;
      const zone = A.spell.indexOf(null);
      if (zone < 0) break;
      removeFromHand(A, t);
      t.set = true;
      t.faceUp = false;
      t.setTurn = state.turn;
      A.spell[zone] = t;
      sets++;
      addLog('ファラオの影はカードを1枚セットした。', 'set');
      Sound.play('set');
      render();
    }
  }

  function aiChooseTarget(attacker) {
    const P = duel.player;
    const a = effAtk(attacker);
    let best = null;
    P.monster.forEach((m, i) => {
      if (!m) return;
      let score = -1;
      if (!m.faceUp) {
        if (a >= 2000) score = 1.2;
        else if (a >= 1600) score = 0.5;
      } else if (m.position === 'atk') {
        const d = effAtk(m);
        if (a > d) score = a - d + 2;
      } else {
        const d = effDef(m);
        if (a > d) score = attacker.id === 'dune-assassin' ? a - d + 1 : 0.8;
      }
      if (score > -1 && (!best || score > best.score)) best = { idx: i, score };
    });
    return best ? best.idx : null;
  }

  async function aiBattlePhase() {
    const A = duel.ai, P = duel.player;
    for (let i = 0; i < 5; i++) {
      if (state.over) return;
      const m = A.monster[i];
      if (!m || !m.faceUp || m.position !== 'atk' || m.hasAttacked) continue;
      if (P.monster.every((x) => !x)) {
        await performAttack('ai', i, null);
        await sleep(480);
        continue;
      }
      const target = aiChooseTarget(m);
      if (target === null) continue;
      await performAttack('ai', i, target);
      await sleep(480);
    }
  }

  /* ================================== FX ================================== */
  function fxAnchor(key) {
    return key === 'ai' ? el.aiHead : el.playerHead;
  }

  function rectCenter(node) {
    const r = node.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, r };
  }

  function fxFloat(key, text, cls) {
    const node = fxAnchor(key);
    if (!node) return;
    const c = rectCenter(node);
    const d = document.createElement('div');
    d.className = 'fx-dmg ' + cls;
    d.textContent = text;
    d.style.left = c.x + 'px';
    d.style.top = c.y + 'px';
    el.fx.appendChild(d);
    setTimeout(() => d.remove(), 1250);
  }

  function fxHeadHit(key) {
    const node = fxAnchor(key);
    if (!node) return;
    node.classList.remove('hit');
    void node.offsetWidth;
    node.classList.add('hit');
    setTimeout(() => node.classList.remove('hit'), 450);
  }

  function fxRing(x, y, color) {
    const d = document.createElement('div');
    d.className = 'fx-ring';
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    if (color) d.style.borderColor = color;
    el.fx.appendChild(d);
    setTimeout(() => d.remove(), 700);
  }

  function fxSparks(x, y, n = 8) {
    for (let i = 0; i < n; i++) {
      const s = document.createElement('div');
      s.className = 'fx-spark';
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      const dist = 26 + Math.random() * 34;
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      s.style.setProperty('--dx', Math.cos(a) * dist + 'px');
      s.style.setProperty('--dy', Math.sin(a) * dist + 'px');
      el.fx.appendChild(s);
      setTimeout(() => s.remove(), 700);
    }
  }

  async function fxSummon(node, isSet) {
    if (!node) return;
    node.classList.remove('fx-card-in', 'fx-set');
    void node.offsetWidth;
    node.classList.add(isSet ? 'fx-set' : 'fx-card-in');
    const c = rectCenter(node);
    fxRing(c.x, c.y);
    fxSparks(c.x, c.y, 7);
  }

  function fxDestroy(node) {
    if (!node) return;
    const c = rectCenter(node);
    fxSparks(c.x, c.y, 12);
    try {
      node.animate(
        [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.55) rotate(8deg)', filter: 'brightness(2)' }],
        { duration: 360, easing: 'ease-in', fill: 'forwards' }
      );
    } catch (e) { /* noop */ }
  }

  async function fxAttack(atkNode, defNode, atkKey, outcome) {
    if (!atkNode) { await sleep(280); return; }
    const a = rectCenter(atkNode);
    let target = null;
    if (defNode) target = rectCenter(defNode);
    else {
      const head = fxAnchor(other(atkKey));
      if (head) target = rectCenter(head);
    }
    if (!target) { await sleep(280); return; }
    const ghost = atkNode.cloneNode(true);
    ghost.classList.add('fx-ghost');
    ghost.style.left = a.r.left + 'px';
    ghost.style.top = a.r.top + 'px';
    ghost.style.width = a.r.width + 'px';
    ghost.style.height = a.r.height + 'px';
    ghost.style.margin = '0';
    el.fx.appendChild(ghost);
    const dx = target.x - a.x;
    const dy = target.y - a.y;
    const rot = clamp(dx / 12, -18, 18);
    const anim = ghost.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 14}px) scale(1.14) rotate(${rot * 0.5}deg)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(.92) rotate(${rot}deg)`, opacity: 0.9 },
    ], { duration: 430, easing: 'cubic-bezier(.3,.1,.2,1)' });
    const lunge = atkNode.animate([
      { transform: 'translate(0,0)' },
      { transform: `translate(${dx * 0.1}px, ${dy * 0.1 - 8}px) scale(1.04)` },
      { transform: 'translate(0,0)' },
    ], { duration: 520, easing: 'ease-out' });
    await anim.finished.catch(() => {});
    ghost.remove();
    fxRing(target.x, target.y, 'rgba(255,190,120,.9)');
    fxSparks(target.x, target.y, 10);
    const impact = document.createElement('div');
    impact.className = 'fx-impact';
    impact.style.left = target.x + 'px';
    impact.style.top = target.y + 'px';
    el.fx.appendChild(impact);
    setTimeout(() => impact.remove(), 500);
    el.arena.classList.remove('shake');
    void el.arena.offsetWidth;
    el.arena.classList.add('shake');
    setTimeout(() => el.arena.classList.remove('shake'), 400);
    Sound.play('hit');
    await sleep(180);
  }

  function fxSpell(anchor) {
    const node = anchor || el.arena;
    if (!node) return;
    const c = rectCenter(node);
    const b = document.createElement('div');
    b.className = 'fx-spell-burst';
    b.style.left = c.x + 'px';
    b.style.top = c.y + 'px';
    el.fx.appendChild(b);
    setTimeout(() => b.remove(), 800);
    fxSparks(c.x, c.y, 8);
  }

  /* ================================ MODALS ================================ */
  function openModal(inner) {
    el.modalRoot.innerHTML = `<div class="modal-backdrop"><div class="modal">${inner}</div></div>`;
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    el.modalRoot.innerHTML = '';
    state.bookPending = null;
    document.body.classList.remove('modal-open');
  }

  function openRules() {
    openModal(`
      <div class="modal-head"><div><h2>デュエルルール<span class="mh-jp">QUICK RULES</span></h2></div>
      <button class="modal-close" data-modal="close" aria-label="閉じる">✕</button></div>
      <div class="modal-body">
        <p>このデュエルは遊戯王風の簡略ルールで進行します。LPを0にするか、相手のデッキを尽きさせれば勝利です。</p>
        <h3>ターンの流れ</h3>
        <ul class="rules-list">
          <li>手番開始時に1枚ドロー。モンスターの攻撃済み状態がリセットされます。</li>
          <li>メインフェイズに召喚・セット・魔法・罠のセット・攻撃ができます。</li>
          <li>「ターン終了」で相手に手番を渡します。</li>
        </ul>
        <h3>召喚と生贄</h3>
        <ul class="rules-list">
          <li>通常召喚・セットは1ターンに1回。<b>Lv5〜6は生贄1体、Lv7以上は生贄2体</b>が必要です。</li>
          <li>手札のモンスターを選び「召喚」または「守備セット」。生贄が必要な場合は自分のモンスターを選択します。</li>
        </ul>
        <h3>攻撃</h3>
        <ul class="rules-list">
          <li>自分の攻撃表示モンスターを選び、相手モンスターをタップして攻撃。相手にモンスターがいなければダイレクトアタック。</li>
          <li>攻撃表示同士はATKの差がダメージ。守備表示はDEFを参照し、DEFを超えれば破壊（貫通持ちは差額ダメージ）。</li>
          <li>セットされたモンスターは攻撃された時にリバースし、守備表示になります。</li>
        </ul>
        <h3>魔法・罠</h3>
        <ul class="rules-list">
          <li>魔法は手札から発動するか、セットして次のターン以降に発動できます。</li>
          <li>罠はセットした次のターン以降、条件を満たすと自動で発動します。</li>
          <li>セットしたカードは相手から見えません。ブラフも戦略のうちです。</li>
        </ul>
        <div class="modal-actions"><button class="btn primary" data-modal="close">わかった</button></div>
      </div>
    `);
  }

  function openGrave(key) {
    const d = sideOf(key);
    const grave = d.grave.slice().reverse();
    openModal(`
      <div class="modal-head"><div><h2>${nameOf(key)}の墓地<span class="mh-jp">GRAVEYARD · ${grave.length} CARDS</span></h2></div>
      <button class="modal-close" data-modal="close" aria-label="閉じる">✕</button></div>
      <div class="modal-body">
        ${grave.length ? `<div class="gy-grid">${grave.map((c) => `
          <div class="gy-tile" title="${esc(c.text)}">
            ${artSvg(c.art)}<span class="gy-name">${esc(c.name)}</span>
            <span class="gy-stat">${c.type === 'monster' ? `ATK ${c.atk} / DEF ${c.def}` : c.type === 'spell' ? '魔法' : '罠'}</span>
          </div>`).join('')}</div>` : '<div class="gy-empty">墓地は空です。</div>'}
        <div class="modal-actions"><button class="btn ghost" data-modal="close">閉じる</button></div>
      </div>
    `);
  }

  function openLogModal() {
    openModal(`
      <div class="modal-head"><div><h2>デュエルログ<span class="mh-jp">DUEL LOG</span></h2></div>
      <button class="modal-close" data-modal="close" aria-label="閉じる">✕</button></div>
      <div class="modal-body"><ol class="log-list" style="max-height:60dvh">${state.log.map((e) => `<li class="log-entry ${e.tone}"><span class="log-turn">T${e.turn}</span><span>${e.text}</span></li>`).join('')}</ol></div>
    `);
  }

  function showEnd(winner, reason) {
    const won = winner === 'player';
    const p = duel.player, a = duel.ai;
    el.modalRoot.innerHTML = `<div class="modal-backdrop">
      <div class="end-card">
        <p class="end-eyebrow">${won ? 'THE MILLENNIUM IS YOURS' : 'THE SHADOW PREVAILS'}</p>
        <h2 class="end-title ${won ? '' : 'lose'}">${won ? 'VICTORY' : 'DEFEAT'}</h2>
        <p class="end-jp">${won ? '千年の闘いを制した。' : 'ファラオの影に敗れた…'}</p>
        <div class="end-stats">
          <div><b>${state.turn}</b><span>TURNS</span></div>
          <div><b>${state.stats.player.dmg}</b><span>DAMAGE DEALT</span></div>
          <div><b>${state.stats.player.destroyed}</b><span>MONSTERS DESTROYED</span></div>
          <div><b>${p.lp}</b><span>YOUR LP</span></div>
        </div>
        <div class="end-actions">
          <button class="btn primary" data-act="again">もう一度デュエル</button>
          <button class="btn ghost" data-act="title">タイトルへ</button>
        </div>
      </div>
    </div>`;
    if (reason === 'deck') {
      const jp = $('.end-jp');
      if (jp) jp.textContent = won ? '相手のデッキが尽きた。' : 'あなたのデッキが尽きた…';
    }
  }

  function confirmRestart() {
    openModal(`
      <div class="modal-head"><div><h2>デュエルをやり直す<span class="mh-jp">RESTART</span></h2></div>
      <button class="modal-close" data-modal="close" aria-label="閉じる">✕</button></div>
      <div class="modal-body">
        <p>現在のデュエルを破棄して、最初からやり直しますか？</p>
        <div class="modal-actions">
          <button class="btn ghost" data-modal="close">キャンセル</button>
          <button class="btn primary" data-act="restart-confirm">やり直す</button>
        </div>
      </div>
    `);
  }

  function returnToTitle() {
    closeModal();
    state.over = false;
    state.busy = true;
    state.screen = 'title';
    showScreen('title');
    $('#logBtn').classList.add('hidden');
  }

  /* ============================== ACTIONS ================================= */
  function handleAction(act) {
    switch (act) {
      case 'play': startDuel(); break;
      case 'summon': beginSummon('atk'); break;
      case 'set-monster': beginSummon('set'); break;
      case 'activate': beginActivate(); break;
      case 'activate-field': beginActivateField(); break;
      case 'set-spell': if (state.selected && state.selected.type === 'hand') setSpellFromHand(); break;
      case 'cancel': clearSelection(); break;
      case 'direct': handleDirect(); break;
      case 'position': changePosition(); break;
      case 'end': endPlayerTurn(); break;
      case 'sound': toggleSound(); break;
      case 'rules': openRules(); break;
      case 'log': openLogModal(); break;
      case 'restart': confirmRestart(); break;
      case 'restart-confirm': startDuel(); break;
      case 'again': startDuel(); break;
      case 'title': returnToTitle(); break;
      case 'play-no-target': playNoTarget(); break;
      default: break;
    }
  }

  function playNoTarget() {
    const p = state.pending;
    if (!p || p.type !== 'target') return;
    state.pending = null;
    state.selected = null;
    executeSpell('player', p.card, null, p.from);
  }

  function changePosition() {
    const s = state.selected;
    if (!s || s.type !== 'monster') return;
    if (state.active !== 'player' || state.busy || state.over) return;
    const m = duel.player.monster[s.idx];
    if (!m || m.changedPosition || m.hasAttacked) return;
    m.position = m.position === 'atk' ? 'def' : 'atk';
    m.changedPosition = true;
    addLog(`「${m.name}」を${m.position === 'atk' ? '攻撃表示' : '守備表示'}に変更した。`, '');
    Sound.play('set');
    render();
  }

  function toggleSound() {
    Sound.enabled = !Sound.enabled;
    if (Sound.enabled) { Sound.init(); Sound.play('select'); }
    $('#soundBtn').classList.toggle('off', !Sound.enabled);
    toast(Sound.enabled ? 'サウンド ON' : 'サウンド OFF');
  }

  /* ============================== EVENTS ================================== */
  function bindEvents() {
    document.addEventListener('click', (e) => {
      const close = e.target.closest('[data-modal="close"]');
      if (close) { closeModal(); return; }
      if (e.target.classList.contains('modal-backdrop')) {
        if (!e.target.querySelector('.end-card')) closeModal();
        return;
      }
      const book = e.target.closest('[data-book]');
      if (book) { playBook(book.dataset.book); return; }
      const actBtn = e.target.closest('[data-act]');
      if (actBtn) { handleAction(actBtn.dataset.act); return; }
      const hand = e.target.closest('.hand-card');
      if (hand) { handleHandClick(Number(hand.dataset.handIdx)); return; }
      const zone = e.target.closest('.zone');
      if (zone) { handleZoneClick(zone.dataset.side, zone.dataset.row, Number(zone.dataset.idx)); return; }
      const pile = e.target.closest('[data-pile]');
      if (pile) { openGrave(pile.dataset.pile); return; }
      const aiHead = e.target.closest('.duelist-head[data-side="ai"]');
      if (aiHead) { handleDirect(); return; }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const target = e.target.closest('.hand-card, .zone');
      if (!target) return;
      e.preventDefault();
      target.click();
    });

    window.addEventListener('resize', () => {
      if (state.screen === 'game') {
        renderHand();
        renderHUD();
      }
    });

    const playBtn = $('#playBtn');
    if (playBtn) playBtn.addEventListener('click', (e) => { e.preventDefault(); startDuel(); });
  }

  function resizeHandSoon() {
    if (state.screen !== 'game') return;
    renderHand();
    setTimeout(() => { if (state.screen === 'game') renderHand(); }, 60);
  }

  /* =============================== SAND FX ================================ */
  function startSand() {
    const canvas = $('#sand');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let w = 0, h = 0, dpr = 1, parts = [];
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = reduced ? 24 : clamp(Math.round((w * h) / 24000), 36, 96);
      parts = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.4 + Math.random() * 1.5,
        vx: -0.12 + Math.random() * 0.24,
        vy: -0.08 - Math.random() * 0.3,
        a: 0.12 + Math.random() * 0.4,
        tw: Math.random() * Math.PI * 2,
      }));
    }
    let raf = 0;
    function frame(t) {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.tw += 0.02;
        if (p.y < -8) { p.y = h + 8; p.x = Math.random() * w; }
        if (p.x < -8) p.x = w + 8;
        if (p.x > w + 8) p.x = -8;
        const alpha = p.a * (0.65 + 0.35 * Math.sin(p.tw));
        ctx.beginPath();
        ctx.fillStyle = `rgba(232,195,106,${alpha.toFixed(3)})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(frame);
    });
    if (!reduced) raf = requestAnimationFrame(frame);
  }

  /* ================================ BOOT ================================== */
  function boot() {
    cacheEls();
    bindEvents();
    showScreen('title');
    $('#logBtn').classList.add('hidden');
    $('#soundBtn').classList.remove('off');
    startSand();
    // Public hook for automated verification and curious duelists.
    window.MD.debug = {
      state, duel, render,
      start: startDuel,
      summon: (...a) => performSummon(...a),
      attack: (...a) => performAttack(...a),
      spell: (...a) => executeSpell(...a),
      damage, heal, drawCard, endGame,
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();


