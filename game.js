/* ============================================================
   遊戯王 — DUEL MONSTERS
   A fan-made, original browser card duel.
   ============================================================ */

'use strict';

/* ------------------------------------------------------------
   CARD DATA
   ------------------------------------------------------------ */

const CARD_DATA = {
  blueeyes: {
    name: '青眼の白龍', type: 'monster', level: 8, atk: 3000, def: 2500,
    race: 'ドラゴン族', art: '🐉', rarity: 'holo',
    colors: ['#f2fbff', '#3f9bff', '#061a3f'],
    desc: '滅びの爆裂疾風弾。'
  },
  darkmagician: {
    name: 'ブラック・マジシャン', type: 'monster', level: 7, atk: 2500, def: 2100,
    race: '魔法使い族', art: '🧙', rarity: 'holo',
    colors: ['#f3eaff', '#7b5cff', '#1a0b33'],
    desc: '闇の魔法の最高峰。'
  },
  redEyes: {
    name: '真紅眼の黒竜', type: 'monster', level: 7, atk: 2400, def: 2000,
    race: 'ドラゴン族', art: '🐲', rarity: 'holo',
    colors: ['#ffe9e9', '#ff4d4d', '#2a0505'],
    desc: '真紅の眼を持つ黒き竜。'
  },
  gaia: {
    name: '暗黒騎士ガイア', type: 'monster', level: 7, atk: 2300, def: 2100,
    race: '戦士族', art: '⚔️',
    colors: ['#fff0d8', '#d08a3a', '#2a1505'],
    desc: '疾風のごとく駆ける騎士。'
  },
  summonedSkull: {
    name: 'デーモンの召喚', type: 'monster', level: 6, atk: 2500, def: 1200,
    race: '悪魔族', art: '💀',
    colors: ['#ffe6f7', '#c04aff', '#20002a'],
    desc: '闇より現れし悪魔。'
  },
  cyberDragon: {
    name: 'サイバー・ドラゴン', type: 'monster', level: 5, atk: 2100, def: 1600,
    race: '機械族', art: '⚡',
    colors: ['#e6fbff', '#38c6ff', '#001a2a'],
    desc: '未来の力を持つ機械竜。'
  },
  jinzo: {
    name: '人造人間－サイコ・ショッカー', short: 'サイコ・ショッカー',
    type: 'monster', level: 6, atk: 2400, def: 1500,
    race: '機械族', art: '🤖',
    colors: ['#eaf0ff', '#6b7dff', '#0a0f33'],
    desc: '罠を憎む人造人間。'
  },
  dmGirl: {
    name: 'ブラック・マジシャン・ガール', short: 'BMG',
    type: 'monster', level: 6, atk: 2000, def: 1700,
    race: '魔法使い族', art: '🧝‍♀️', rarity: 'holo',
    colors: ['#ffeaf7', '#ff7ac8', '#2a0a22'],
    desc: '師匠譲りの魔法を操る。'
  },
  axeRaider: {
    name: 'アックス・レイダー', type: 'monster', level: 4, atk: 1700, def: 1150,
    race: '戦士族', art: '🪓',
    colors: ['#ffedd8', '#c47a3a', '#2a1205'],
    desc: '斧を振るう戦士。'
  },
  rock: {
    name: '岩石の巨兵', type: 'monster', level: 4, atk: 1300, def: 2000,
    race: '岩石族', art: '🗿',
    colors: ['#f0eee8', '#9a8f78', '#241f18'],
    desc: '堅牢な岩の巨人。'
  },
  geminiElf: {
    name: 'ヂェミナイ・エルフ', type: 'monster', level: 4, atk: 1900, def: 900,
    race: '魔法使い族', art: '🧝',
    colors: ['#eafff3', '#4fd08a', '#062a18'],
    desc: '双子のエルフの魔術師。'
  },
  gazelle: {
    name: '幻獣王ガゼル', type: 'monster', level: 4, atk: 1500, def: 1200,
    race: '獣族', art: '🦌',
    colors: ['#fff5dd', '#d8a84a', '#2a1c05'],
    desc: '幻の獣の王。'
  },
  kuriboh: {
    name: 'クリボー', type: 'monster', level: 1, atk: 300, def: 200,
    race: '悪魔族', art: '🧸',
    colors: ['#ffe9d6', '#b07a4a', '#2a1408'],
    desc: '直接攻撃を無効にする。'
  },
  raigeki: {
    name: 'サンダー・ボルト', type: 'spell', art: '⚡', rarity: 'holo',
    colors: ['#fffbe0', '#ffd84a', '#3a2a00'],
    desc: '相手モンスターを全て破壊する。'
  },
  darkHole: {
    name: 'ブラック・ホール', type: 'spell', art: '🕳️',
    colors: ['#efe6ff', '#7b4aff', '#0c0320'],
    desc: '全てのモンスターを破壊する。'
  },
  harpie: {
    name: 'ハーピィの羽根帚', short: '羽根帚', type: 'spell', art: '🪶',
    colors: ['#eafff7', '#4fd0b0', '#03251d'],
    desc: '相手の魔法・罠を全て破壊する。'
  },
  cyclone: {
    name: 'サイクロン', type: 'spell', art: '🌀',
    colors: ['#e6fff7', '#38d0a8', '#00251d'],
    desc: '相手の魔法・罠を1枚破壊する。'
  },
  reborn: {
    name: '死者蘇生', type: 'spell', art: '✨', rarity: 'holo',
    colors: ['#fff7e0', '#e8c46a', '#2a1c00'],
    desc: '墓地のモンスターを特殊召喚する。'
  },
  pot: {
    name: '強欲な壺', type: 'spell', art: '🏺',
    colors: ['#fff3d6', '#e0a04a', '#2a1400'],
    desc: 'カードを2枚ドローする。'
  },
  fissure: {
    name: '地割れ', type: 'spell', art: '🌋',
    colors: ['#ffe8d6', '#e06a3a', '#2a0a00'],
    desc: '相手の攻撃力が最も低いモンスターを破壊する。'
  },
  bigBang: {
    name: '巨大化', type: 'spell', art: '💥',
    colors: ['#fff0d0', '#ff9a3a', '#2a0e00'],
    desc: '自分のモンスター1体の攻撃力を1000アップする。'
  },
  trapHole: {
    name: '落とし穴', type: 'trap', art: '🕳️',
    colors: ['#f2e6ff', '#a45aff', '#1a032a'],
    desc: '攻撃力1000以上の召喚モンスターを破壊する。'
  },
  mirrorForce: {
    name: '聖なるバリア -ミラーフォース-', short: 'ミラーフォース', type: 'trap', art: '🪞', rarity: 'holo',
    colors: ['#eef4ff', '#7aa8ff', '#04102a'],
    desc: '相手の攻撃表示モンスターを全て破壊する。'
  },
  magicCylinder: {
    name: '魔法の筒', type: 'trap', art: '🌀',
    colors: ['#f0e6ff', '#b06aff', '#16002a'],
    desc: '直接攻撃を無効にし、ダメージを反射する。'
  },
  greymoya: {
    name: '万能地雷グレイモヤ', short: 'グレイモヤ', type: 'trap', art: '💣',
    colors: ['#ffe9e6', '#e05a4a', '#2a0500'],
    desc: '攻撃モンスターを破壊する。'
  },
  torrential: {
    name: '激流葬', type: 'trap', art: '🌊',
    colors: ['#e6f7ff', '#3a9ae0', '#00162a'],
    desc: 'モンスターが召喚された時、全て破壊する。'
  },
  sakuretsu: {
    name: '炸裂装甲', type: 'trap', art: '🛡️',
    colors: ['#fff0e6', '#e08a4a', '#2a0e00'],
    desc: '攻撃モンスターを破壊する。'
  }
};

const DECK_LIST = [
  ['blueeyes', 1],
  ['darkmagician', 1],
  ['redEyes', 1],
  ['gaia', 1],
  ['summonedSkull', 1],
  ['cyberDragon', 2],
  ['jinzo', 1],
  ['dmGirl', 1],
  ['axeRaider', 2],
  ['rock', 1],
  ['geminiElf', 2],
  ['gazelle', 1],
  ['kuriboh', 1],
  ['raigeki', 1],
  ['darkHole', 1],
  ['harpie', 1],
  ['cyclone', 2],
  ['reborn', 1],
  ['pot', 2],
  ['fissure', 1],
  ['bigBang', 1],
  ['trapHole', 2],
  ['mirrorForce', 1],
  ['magicCylinder', 1],
  ['greymoya', 1],
  ['torrential', 1],
  ['sakuretsu', 1]
];

const SIDE_NAME = { player: 'あなた', ai: 'AI' };
const LP_MAX = 4000;

/* ------------------------------------------------------------
   UTILITIES
   ------------------------------------------------------------ */

const $ = (sel, root = document) => root.querySelector(sel);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const other = (side) => (side === 'player' ? 'ai' : 'player');
const effAtk = (card) => (card ? (card.atk || 0) + (card.atkBoost || 0) : 0);
const effDef = (card) => (card ? card.def || 0 : 0);
const tributesNeeded = (level) => (level >= 7 ? 2 : level >= 5 ? 1 : 0);

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildDeck() {
  const deck = [];
  for (const [key, count] of DECK_LIST) {
    for (let i = 0; i < count; i++) deck.push(makeCard(key));
  }
  return shuffle(deck);
}

let uidCounter = 0;
function makeCard(key) {
  const data = CARD_DATA[key];
  return {
    uid: 'c' + (++uidCounter),
    key,
    ...data,
    position: 'attack',
    faceDown: false,
    hasAttacked: false,
    atkBoost: 0
  };
}

function createPlayer(side) {
  return {
    side,
    lp: LP_MAX,
    deck: buildDeck(),
    hand: [],
    monsters: Array(5).fill(null),
    spells: Array(5).fill(null),
    grave: [],
    hasSummoned: false
  };
}

function firstEmptyAfter(player, cards) {
  const freed = new Set(
    cards.map((card) => player.monsters.indexOf(card)).filter((i) => i >= 0)
  );
  for (let i = 0; i < player.monsters.length; i++) {
    if (!player.monsters[i] || freed.has(i)) return i;
  }
  return -1;
}

/* ------------------------------------------------------------
   AUDIO
   ------------------------------------------------------------ */

let audioCtx = null;
let muted = false;

function ensureAudio() {
  if (muted) return;
  if (!audioCtx) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    } catch (err) {
      audioCtx = null;
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
}

function tone(freq, dur, type = 'sine', vol = 0.05, slideTo = null, delay = 0) {
  if (!audioCtx || muted) return;
  try {
    const t0 = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  } catch (err) {
    /* ignore */
  }
}

function noise(dur = 0.15, vol = 0.05, delay = 0) {
  if (!audioCtx || muted) return;
  try {
    const t0 = audioCtx.currentTime + delay;
    const length = Math.max(1, Math.floor(audioCtx.sampleRate * dur));
    const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const src = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    gain.gain.value = vol;
    src.buffer = buffer;
    src.connect(filter).connect(gain).connect(audioCtx.destination);
    src.start(t0);
  } catch (err) {
    /* ignore */
  }
}

function sound(name) {
  if (muted) return;
  ensureAudio();
  if (!audioCtx) return;
  switch (name) {
    case 'click':
      tone(760, 0.05, 'triangle', 0.025);
      break;
    case 'draw':
      noise(0.07, 0.025);
      tone(520, 0.09, 'sine', 0.025, null, 0.04);
      break;
    case 'summon':
      tone(180, 0.4, 'sawtooth', 0.045, 380);
      tone(380, 0.3, 'sine', 0.035, null, 0.14);
      break;
    case 'set':
      tone(300, 0.07, 'square', 0.025);
      break;
    case 'attack':
      noise(0.18, 0.05);
      tone(170, 0.22, 'sawtooth', 0.045, 70);
      break;
    case 'damage':
      tone(110, 0.32, 'square', 0.06, 50);
      noise(0.14, 0.045);
      break;
    case 'destroy':
      noise(0.24, 0.055);
      tone(90, 0.26, 'sawtooth', 0.04, 40);
      break;
    case 'spell':
      [523, 659, 784].forEach((f, i) => tone(f, 0.26, 'sine', 0.035, null, i * 0.055));
      break;
    case 'trap':
      [784, 587, 392].forEach((f, i) => tone(f, 0.18, 'triangle', 0.04, null, i * 0.05));
      break;
    case 'reflect':
      tone(1300, 0.22, 'sine', 0.045, 320);
      break;
    case 'win':
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.42, 'triangle', 0.045, null, i * 0.12));
      break;
    case 'lose':
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.48, 'sine', 0.045, null, i * 0.14));
      break;
    case 'shuffle':
      noise(0.3, 0.035);
      break;
    default:
      break;
  }
}

/* ------------------------------------------------------------
   STATE
   ------------------------------------------------------------ */

let state = null;
let session = 0;
let busy = false;
let selection = null;
let attackerUid = null;
let pendingTribute = null;
let logEntries = [];

const alive = () => !!state && !state.over;

function addLog(text, kind = 'system') {
  logEntries.push({ text, kind, turn: state ? state.turn : 0 });
  if (logEntries.length > 80) logEntries.shift();
}

function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  $('#fx-layer').appendChild(el);
  setTimeout(() => el.remove(), 1850);
}

/* ------------------------------------------------------------
   RENDERING
   ------------------------------------------------------------ */

function makeCardEl(card, opts = {}) {
  const {
    size = 'field',
    hidden = false,
    owner = 'player',
    area = 'field',
    showPosition = false
  } = opts;

  const el = document.createElement('div');
  el.dataset.uid = card.uid;
  el.dataset.owner = owner;
  el.dataset.area = area;

  if (size === 'field' || size === 'hand') {
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
  }

  if (hidden) {
    el.className = `card back ${size}`;
    el.setAttribute('aria-label', '裏向きのカード');
    el.innerHTML = '<div class="back-inner"><span class="glyph">遊</span></div>';
    return el;
  }

  const isMonster = card.type === 'monster';
  const holo = card.rarity === 'holo' ? ' holo' : '';
  const defense = isMonster && card.position === 'defense' && !card.faceDown ? ' defense' : '';
  el.className = `card ${card.type} ${size}${holo}${defense}`;
  if (el.getAttribute('role')) {
    el.setAttribute('aria-label', isMonster
      ? `${card.name} 攻撃力${effAtk(card)} 守備力${effDef(card)}`
      : card.name);
  }
  el.style.setProperty('--a', card.colors[0]);
  el.style.setProperty('--b', card.colors[1]);
  el.style.setProperty('--c', card.colors[2]);

  const stars = isMonster
    ? `<div class="stars">${'★'.repeat(card.level)}</div>`
    : `<div class="type-tag">${card.type === 'spell' ? '魔法' : '罠'}</div>`;

  const stats = isMonster
    ? `<div class="stats"><span class="atk">ATK ${effAtk(card)}</span><span class="def">DEF ${effDef(card)}</span></div>`
    : `<div class="stats spell-stats"><span>${card.type === 'spell' ? 'SPELL' : 'TRAP'}</span></div>`;

  const badge = showPosition && isMonster
    ? `<span class="pos-badge">${card.position === 'attack' ? '攻' : '守'}</span>`
    : '';

  el.innerHTML = `
    <div class="frame">
      <div class="name">${card.short || card.name}</div>
      <div class="art"><span class="emoji">${card.art}</span></div>
      ${stars}
      ${stats}
    </div>
    ${badge}
  `;

  return el;
}

function locateCard(uid) {
  if (!state) return null;
  for (const side of ['player', 'ai']) {
    const p = state[side];
    let index = p.hand.findIndex((c) => c.uid === uid);
    if (index >= 0) return { side, area: 'hand', card: p.hand[index], index };
    index = p.monsters.findIndex((c) => c && c.uid === uid);
    if (index >= 0) return { side, area: 'monsters', card: p.monsters[index], index };
    index = p.spells.findIndex((c) => c && c.uid === uid);
    if (index >= 0) return { side, area: 'spells', card: p.spells[index], index };
    index = p.grave.findIndex((c) => c.uid === uid);
    if (index >= 0) return { side, area: 'grave', card: p.grave[index], index };
  }
  return null;
}

function renderHud() {
  for (const side of ['player', 'ai']) {
    const p = state[side];
    const lpEl = $(`#lp-${side}`);
    lpEl.textContent = String(p.lp);
    lpEl.classList.toggle('low', p.lp <= 1000);

    const pct = Math.max(0, Math.min(100, (p.lp / LP_MAX) * 100));
    const bar = $(`#lpbar-${side}`);
    bar.style.width = pct + '%';
    bar.classList.toggle('mid', pct <= 55 && pct > 25);
    bar.classList.toggle('low', pct <= 25);

    $(`#handcount-${side}`).textContent = String(p.hand.length);
    $(`#deckcount-${side}`).textContent = String(p.deck.length);
    $(`#gravecount-${side}`).textContent = String(p.grave.length);
  }

  $('#turn-num').textContent = `TURN ${state.turn}`;
  const isPlayer = state.active === 'player';
  $('#turn-side').textContent = state.over ? 'DUEL OVER' : isPlayer ? 'YOUR TURN' : 'ENEMY TURN';
  $('#turn-pill').classList.toggle('ai', !isPlayer && !state.over);
}

function renderZoneRow(selector, side, area) {
  const row = $(selector);
  const p = state[side];
  row.innerHTML = '';

  p[area].forEach((card) => {
    const zone = document.createElement('div');
    zone.className = 'zone';

    if (card) {
      zone.classList.add('filled');
      const el = makeCardEl(card, {
        size: 'field',
        hidden: !!card.faceDown,
        owner: side,
        area,
        showPosition: area === 'monsters' && !card.faceDown
      });
      if (attackerUid === card.uid) el.classList.add('is-attacker');
      if (selection && selection.uid === card.uid) el.classList.add('is-selected-field');
      if (pendingTribute && pendingTribute.chosen.some((c) => c.uid === card.uid)) {
        el.classList.add('is-tribute');
      }
      zone.appendChild(el);
    } else {
      zone.innerHTML = '<span class="zone-mark">＋</span>';
    }

    row.appendChild(zone);
  });
}

function renderOppHand() {
  const wrap = $('#opp-hand');
  wrap.innerHTML = '';
  const count = Math.min(state.ai.hand.length, 7);
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'card back';
    el.innerHTML = '<div class="back-inner"><span class="glyph">遊</span></div>';
    wrap.appendChild(el);
  }
}

function renderHand() {
  const hand = $('#you-hand');
  hand.innerHTML = '';
  const cards = state.player.hand;

  if (!cards.length) {
    hand.innerHTML = '<div class="hand-empty">手札なし</div>';
    return;
  }

  const middle = (cards.length - 1) / 2;
  cards.forEach((card, i) => {
    const el = makeCardEl(card, { size: 'hand', owner: 'player', area: 'hand' });
    const offset = i - middle;
    el.style.setProperty('--rot', `${offset * 2.1}deg`);
    el.style.setProperty('--lift', `${Math.abs(offset) * 1.4}px`);
    if (selection && selection.uid === card.uid) el.classList.add('is-selected');
    hand.appendChild(el);
  });
}

function renderLog() {
  const log = $('#log');
  log.innerHTML = '';
  for (const entry of logEntries.slice(-16)) {
    const el = document.createElement('div');
    el.className = `log-entry ${entry.kind}`;
    el.textContent = entry.text;
    log.appendChild(el);
  }
  log.scrollTop = log.scrollHeight;

  const ticker = $('#ticker');
  if (ticker) ticker.textContent = logEntries.length ? logEntries[logEntries.length - 1].text : '';
}

function btn(action, label, cls = '', disabled = false) {
  return `<button class="btn ${cls}" data-action="${action}" ${disabled ? 'disabled' : ''}>${label}</button>`;
}

function renderActions() {
  const bar = $('#action-bar');
  if (!state || state.over) {
    bar.innerHTML = '';
    return;
  }

  if (state.active === 'ai') {
    bar.innerHTML = '<div class="thinking"><span class="orb"></span>相手が思考中…</div>';
    return;
  }

  if (busy) {
    bar.innerHTML = '<div class="hint">処理中…</div>';
    return;
  }

  if (pendingTribute) {
    const { card, need, chosen } = pendingTribute;
    bar.innerHTML = `
      <div class="hint">「${card.short || card.name}」の生け贄を選択 <b>${chosen.length} / ${need}</b></div>
      ${btn('tribute-cancel', 'キャンセル', 'ghost')}
    `;
    return;
  }

  if (attackerUid) {
    const attacker = state.player.monsters.find((c) => c && c.uid === attackerUid);
    if (!attacker) {
      attackerUid = null;
      render();
      return;
    }
    const hasEnemy = state.ai.monsters.some(Boolean);
    bar.innerHTML = `
      <div class="hint"><span class="name">「${attacker.short || attacker.name}」</span> で攻撃 — ${hasEnemy ? '相手モンスターを選択' : '直接攻撃できる'}</div>
      ${btn('direct', '直接攻撃', 'primary', hasEnemy)}
      ${btn('cancel', 'キャンセル', 'ghost')}
    `;
    return;
  }

  if (selection) {
    const loc = locateCard(selection.uid);
    if (loc && loc.side === 'player') {
      const card = loc.card;

      if (loc.area === 'hand' && card.type === 'monster') {
        const canPlace = canPlaceMonster(state.player, card);
        const need = tributesNeeded(card.level);
        const label = need > 0 ? `生け贄召喚 (${need})` : '召喚';
        const note = state.player.hasSummoned ? ' — このターンは召喚済み' : '';
        bar.innerHTML = `
          <div class="hint"><span class="name">「${card.short || card.name}」</span> ATK ${effAtk(card)} / DEF ${effDef(card)}${note}</div>
          ${btn('summon', label, 'primary', !canPlace)}
          ${btn('set-monster', 'セット', '', !canPlace)}
          ${btn('cancel', 'キャンセル', 'ghost')}
        `;
        return;
      }

      if (loc.area === 'hand' && card.type === 'spell') {
        const canCast = canActivateSpell(state.player, card);
        const canSet = state.player.spells.some((x) => !x);
        bar.innerHTML = `
          <div class="hint"><span class="name">「${card.short || card.name}」</span> ${card.desc}</div>
          ${btn('activate', '発動', 'primary', !canCast)}
          ${btn('set-spell', 'セット', '', !canSet)}
          ${btn('cancel', 'キャンセル', 'ghost')}
        `;
        return;
      }

      if (loc.area === 'hand' && card.type === 'trap') {
        const canSet = state.player.spells.some((x) => !x);
        bar.innerHTML = `
          <div class="hint"><span class="name">「${card.short || card.name}」</span> ${card.desc}</div>
          ${btn('set-spell', 'セット', 'primary', !canSet)}
          ${btn('cancel', 'キャンセル', 'ghost')}
        `;
        return;
      }

      if (loc.area === 'spells' && card.type === 'spell' && card.faceDown) {
        const sameTurn = card.setTurn === state.turn;
        const canCast = !sameTurn && canActivateSpell(state.player, card);
        bar.innerHTML = `
          <div class="hint">セットした魔法 <span class="name">「${card.short || card.name}」</span>${sameTurn ? ' — セットしたターンは発動できない' : ''}</div>
          ${btn('activate', '発動', 'primary', !canCast)}
          ${btn('cancel', 'キャンセル', 'ghost')}
        `;
        return;
      }

      if (loc.area === 'monsters') {
        const canAttack = !card.faceDown && card.position === 'attack' && !card.hasAttacked;
        bar.innerHTML = `
          <div class="hint"><span class="name">「${card.short || card.name}」</span> ${card.faceDown ? 'セットモンスター' : card.position === 'attack' ? `ATK ${effAtk(card)}` : `DEF ${effDef(card)}`}${canAttack ? ' — 攻撃可能' : ''}</div>
          ${btn('cancel', 'キャンセル', 'ghost')}
          ${btn('end', 'ターン終了', 'primary')}
        `;
        return;
      }
    }
  }

  bar.innerHTML = `
    <div class="hint">カードを選択して行動。攻撃表示モンスターを選ぶと攻撃できます。</div>
    ${btn('end', 'ターン終了', 'primary')}
  `;
}

function render() {
  if (!state) return;
  renderHud();
  renderZoneRow('#opp-spells', 'ai', 'spells');
  renderZoneRow('#opp-monsters', 'ai', 'monsters');
  renderZoneRow('#you-monsters', 'player', 'monsters');
  renderZoneRow('#you-spells', 'player', 'spells');
  renderHand();
  renderOppHand();
  renderLog();
  renderActions();
}

function flashDamage(side, amount) {
  const lpEl = document.getElementById(`lp-${side}`);
  if (lpEl) {
    const rect = lpEl.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'dmg-float';
    el.textContent = `-${amount}`;
    el.style.left = `${rect.left + rect.width / 2}px`;
    el.style.top = `${rect.top + rect.height / 2}px`;
    $('#fx-layer').appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  document.body.classList.remove('shake');
  void document.body.offsetWidth;
  document.body.classList.add('shake');
  setTimeout(() => document.body.classList.remove('shake'), 380);
}
/* ------------------------------------------------------------
   GAME FLOW
   ------------------------------------------------------------ */

async function startDuel() {
  session++;
  const sid = session;
  ensureAudio();

  $('#title').classList.add('hidden');
  $('#game').classList.remove('hidden');
  $('#result').classList.remove('show');
  $('#how').classList.remove('show');

  state = {
    turn: 0,
    active: 'player',
    over: false,
    winner: null
  };
  state.player = createPlayer('player');
  state.ai = createPlayer('ai');

  logEntries = [];
  selection = null;
  attackerUid = null;
  pendingTribute = null;
  busy = true;

  for (let i = 0; i < 5; i++) {
    state.player.hand.push(state.player.deck.pop());
    state.ai.hand.push(state.ai.deck.pop());
  }

  addLog('デュエル開始！ 先攻はあなた。', 'turn');
  render();
  sound('shuffle');

  await sleep(420);
  if (sid !== session) return;
  await beginTurn('player');
}

async function beginTurn(side) {
  if (!state || state.over) return;
  const sid = session;

  busy = true;
  state.active = side;
  if (side === 'player') state.turn++;

  const p = state[side];
  p.hasSummoned = false;
  p.monsters.forEach((card) => {
    if (card) card.hasAttacked = false;
  });

  selection = null;
  attackerUid = null;
  pendingTribute = null;

  addLog(`── ${SIDE_NAME[side]}のターン ──`, 'turn');
  render();
  await sleep(400);
  if (sid !== session || !state || state.over) return;

  const drew = drawCards(p, 1);
  render();
  if (!drew || state.over) return;

  await sleep(240);
  if (sid !== session || !state || state.over) return;

  if (side === 'ai') {
    await runAiTurn();
  } else {
    busy = false;
    render();
  }
}

async function endTurn() {
  if (!state || state.over || busy || state.active !== 'player') return;
  const sid = session;
  busy = true;
  selection = null;
  attackerUid = null;
  pendingTribute = null;
  addLog('あなたはターンを終了した。', 'system');
  render();
  await sleep(320);
  if (sid !== session) return;
  await beginTurn('ai');
}

function drawCards(player, count = 1) {
  for (let i = 0; i < count; i++) {
    if (!player.deck.length) {
      addLog(`${SIDE_NAME[player.side]}のデッキが尽きた！`, 'bad');
      endGame(other(player.side), 'deckout');
      return false;
    }
    player.hand.push(player.deck.pop());
    addLog(`${SIDE_NAME[player.side]}はカードを1枚ドローした。`, player.side);
  }
  sound('draw');
  return true;
}

/* ------------------------------------------------------------
   SELECTION / PLAYER ACTIONS
   ------------------------------------------------------------ */

function canPlaceMonster(player, card) {
  if (player.hasSummoned) return false;
  const need = tributesNeeded(card.level);
  const field = player.monsters.filter(Boolean).length;
  const empty = player.monsters.filter((x) => !x).length;
  if (need > field) return false;
  if (need === 0 && empty === 0) return false;
  return true;
}

function attemptPlace(mode) {
  if (!selection || busy || !state || state.over) return;
  const loc = locateCard(selection.uid);
  if (!loc || loc.side !== 'player' || loc.area !== 'hand' || loc.card.type !== 'monster') return;

  const card = loc.card;
  if (state.player.hasSummoned) {
    toast('このターンはすでに召喚している');
    return;
  }
  if (!canPlaceMonster(state.player, card)) {
    toast('モンスターゾーンがいっぱい、または生け贄が足りない');
    return;
  }

  const need = tributesNeeded(card.level);
  if (need > 0) {
    pendingTribute = { card, mode, need, chosen: [] };
    sound('click');
    render();
    return;
  }

  const zone = state.player.monsters.findIndex((x) => !x);
  selection = null;
  placeMonster('player', card, zone, [], mode);
}

function executePendingTribute() {
  if (!pendingTribute || !state || state.over) return;
  const pt = pendingTribute;
  if (pt.chosen.length !== pt.need) return;
  pendingTribute = null;
  const zone = firstEmptyAfter(state.player, pt.chosen);
  selection = null;
  placeMonster('player', pt.card, zone, pt.chosen, pt.mode);
}

async function placeMonster(side, card, zoneIndex, tributes, mode) {
  if (!state || state.over) return;
  const sid = session;
  const wasBusy = busy;
  busy = true;

  const p = state[side];
  const handIndex = p.hand.findIndex((c) => c.uid === card.uid);
  if (handIndex < 0) {
    busy = wasBusy;
    return;
  }

  let zone = zoneIndex;
  if (zone == null || zone < 0 || p.monsters[zone]) {
    zone = firstEmptyAfter(p, tributes);
  }
  if (zone < 0) {
    toast('モンスターゾーンがいっぱい');
    busy = wasBusy;
    render();
    return;
  }

  p.hand.splice(handIndex, 1);

  for (const tribute of tributes) {
    const ti = p.monsters.findIndex((c) => c && c.uid === tribute.uid);
    if (ti >= 0) {
      p.monsters[ti] = null;
      p.grave.push(tribute);
      addLog(`${SIDE_NAME[side]}は「${tribute.name}」を生け贄に捧げた。`, side);
    }
  }

  card.position = mode === 'set' ? 'defense' : 'attack';
  card.faceDown = mode === 'set';
  card.hasAttacked = false;
  p.monsters[zone] = card;
  p.hasSummoned = true;

  if (mode === 'set') {
    addLog(`${SIDE_NAME[side]}はモンスターをセットした。`, side);
  } else {
    addLog(`${SIDE_NAME[side]}は「${card.name}」を召喚した！`, side);
  }

  sound(mode === 'set' ? 'set' : 'summon');
  render();

  const rowSelector = side === 'player' ? '#you-monsters' : '#opp-monsters';
  const el = document.querySelector(`${rowSelector} .card[data-uid="${card.uid}"]`);
  if (el) el.classList.add('summon-pop');

  await sleep(420);
  if (sid !== session || !state || state.over) return;

  await tryTraps(other(side), 'summon', { monster: card, side });
  if (sid !== session) return;

  busy = wasBusy || (state ? state.over : true);
  render();
}

function setSpellSelection() {
  if (!selection || busy || !state || state.over) return;
  const loc = locateCard(selection.uid);
  if (!loc || loc.side !== 'player' || loc.area !== 'hand') return;
  if (loc.card.type !== 'spell' && loc.card.type !== 'trap') return;

  const zone = state.player.spells.findIndex((x) => !x);
  if (zone < 0) {
    toast('魔法・罠ゾーンがいっぱい');
    return;
  }

  const card = loc.card;
  state.player.hand.splice(state.player.hand.indexOf(card), 1);
  card.faceDown = true;
  card.setTurn = state.turn;
  state.player.spells[zone] = card;
  selection = null;
  addLog(`${SIDE_NAME.player}はカードを1枚セットした。`, 'player');
  sound('set');
  render();
}

async function activateSelection() {
  if (!selection || busy || !state || state.over) return;
  const loc = locateCard(selection.uid);
  if (!loc || loc.side !== 'player') return;

  if (loc.area === 'hand' && loc.card.type === 'spell') {
    if (!canActivateSpell(state.player, loc.card)) {
      toast('発動条件を満たしていない');
      return;
    }
    const card = loc.card;
    selection = null;
    await castSpell('player', card, null);
    return;
  }

  if (loc.area === 'spells' && loc.card.type === 'spell' && loc.card.faceDown) {
    if (loc.card.setTurn === state.turn) {
      toast('セットしたターンは発動できない');
      return;
    }
    if (!canActivateSpell(state.player, loc.card)) {
      toast('発動条件を満たしていない');
      return;
    }
    const card = loc.card;
    const index = loc.index;
    selection = null;
    card.faceDown = false;
    await castSpell('player', card, index);
    return;
  }

  if (loc.area === 'spells' && loc.card.type === 'trap') {
    toast('罠は相手の行動に自動で発動します');
  }
}

function canActivateSpell(player, card) {
  if (!state) return false;
  const opp = state[other(player.side)];
  switch (card.key) {
    case 'cyclone':
    case 'harpie':
      return opp.spells.some(Boolean);
    case 'reborn':
      return player.grave.some((c) => c.type === 'monster') && player.monsters.some((x) => !x);
    case 'bigBang':
      return player.monsters.some((c) => c && c.position === 'attack');
    case 'fissure':
    case 'raigeki':
      return opp.monsters.some(Boolean);
    case 'darkHole':
      return player.monsters.some(Boolean) || opp.monsters.some(Boolean);
    default:
      return true;
  }
}

async function castSpell(side, card, zoneIndex) {
  if (!state || state.over) return;
  const sid = session;
  const wasBusy = busy;
  busy = true;

  const p = state[side];
  const opp = state[other(side)];

  if (zoneIndex != null) {
    p.spells[zoneIndex] = null;
  } else {
    const index = p.hand.findIndex((c) => c.uid === card.uid);
    if (index >= 0) p.hand.splice(index, 1);
  }

  selection = null;
  attackerUid = null;
  addLog(`${SIDE_NAME[side]}は魔法「${card.name}」を発動！`, side);
  sound('spell');
  render();

  await showCast(card);
  if (sid !== session || !state || state.over) return;

  switch (card.key) {
    case 'pot': {
      drawCards(p, 2);
      break;
    }
    case 'raigeki': {
      for (const target of [...opp.monsters]) {
        if (target) destroyMonster(opp, target);
      }
      break;
    }
    case 'darkHole': {
      for (const s of ['player', 'ai']) {
        for (const target of [...state[s].monsters]) {
          if (target) destroyMonster(state[s], target);
        }
      }
      break;
    }
    case 'harpie': {
      opp.spells.forEach((c, i) => {
        if (c) destroySpell(opp, i);
      });
      break;
    }
    case 'cyclone': {
      const index = opp.spells.findIndex(Boolean);
      if (index >= 0) destroySpell(opp, index);
      break;
    }
    case 'reborn': {
      const monsters = p.grave.filter((c) => c.type === 'monster');
      if (monsters.length) {
        monsters.sort((a, b) => b.atk - a.atk);
        const target = monsters[0];
        const zone = p.monsters.findIndex((x) => !x);
        if (zone >= 0) {
          p.grave.splice(p.grave.indexOf(target), 1);
          target.position = 'attack';
          target.faceDown = false;
          target.hasAttacked = false;
          target.atkBoost = 0;
          p.monsters[zone] = target;
          addLog(`${SIDE_NAME[side]}は「${target.name}」を特殊召喚した！`, side);
          sound('summon');
        }
      }
      break;
    }
    case 'fissure': {
      const monsters = opp.monsters.filter(Boolean);
      if (monsters.length) {
        monsters.sort((a, b) => a.atk - b.atk);
        destroyMonster(opp, monsters[0]);
      }
      break;
    }
    case 'bigBang': {
      const monsters = p.monsters.filter((c) => c && c.position === 'attack');
      if (monsters.length) {
        monsters.sort((a, b) => effAtk(b) - effAtk(a));
        const target = monsters[0];
        target.atkBoost = (target.atkBoost || 0) + 1000;
        addLog(`「${target.name}」の攻撃力が1000アップした！`, side);
      }
      break;
    }
    default:
      break;
  }

  if (state.over) {
    p.grave.push(card);
    render();
    return;
  }

  p.grave.push(card);
  render();
  await sleep(280);
  if (sid !== session || !state) return;
  busy = wasBusy || state.over;
  render();
}

async function showCast(card) {
  const layer = $('#fx-layer');
  const el = makeCardEl(card, { size: 'cast' });
  layer.appendChild(el);
  await sleep(800);
  el.classList.add('cast-out');
  await sleep(240);
  el.remove();
}

/* ------------------------------------------------------------
   DAMAGE / DESTRUCTION
   ------------------------------------------------------------ */

function damage(player, amount) {
  if (!state || state.over || amount <= 0) return;
  player.lp = Math.max(0, player.lp - amount);
  addLog(`${SIDE_NAME[player.side]}に ${amount} のダメージ！`, player.side === 'player' ? 'bad' : 'good');
  sound('damage');
  flashDamage(player.side, amount);
  if (player.lp <= 0) {
    endGame(other(player.side), 'lp');
  }
}

function destroyMonster(player, card) {
  if (!card) return;
  const index = player.monsters.findIndex((c) => c && c.uid === card.uid);
  if (index < 0) return;
  player.monsters[index] = null;
  player.grave.push(card);
  card.atkBoost = 0;
  addLog(`${SIDE_NAME[player.side]}の「${card.name}」が破壊された。`, player.side);
  sound('destroy');
}

function destroySpell(player, index) {
  const card = player.spells[index];
  if (!card) return;
  player.spells[index] = null;
  player.grave.push(card);
  addLog(`${SIDE_NAME[player.side]}の「${card.name}」が破壊された。`, player.side);
}

function endGame(winner, reason) {
  if (!state || state.over) return;
  state.over = true;
  state.winner = winner;
  busy = true;
  addLog(winner === 'player' ? 'あなたの勝利！' : 'AIの勝利…', 'turn');
  render();
  sound(winner === 'player' ? 'win' : 'lose');
  const sid = session;
  setTimeout(() => {
    if (sid === session) showResult(winner, reason);
  }, 900);
}

function showResult(winner, reason) {
  if (!state) return;
  const won = winner === 'player';
  const overlay = $('#result');
  overlay.classList.toggle('lose', !won);
  $('#result-title').textContent = won ? 'VICTORY' : 'DEFEAT';
  $('#result-jp').textContent = won ? '勝利' : '敗北';
  $('#result-emblem').textContent = won ? '✦' : '☠';
  $('#result-sub').textContent = reason === 'deckout'
    ? (won ? '相手のデッキを尽きさせた。' : 'あなたのデッキが尽きた。')
    : (won ? '相手のライフポイントを0にした。' : 'あなたのライフポイントが0になった。');
  $('#result-stats').innerHTML = `
    <div class="stat"><b>${state.turn}</b><span>TURNS</span></div>
    <div class="stat"><b>${state.player.lp}</b><span>YOUR LP</span></div>
    <div class="stat"><b>${state.ai.lp}</b><span>ENEMY LP</span></div>
  `;
  overlay.classList.add('show');
}

function quitToTitle(force = false) {
  if (!force && busy) {
    toast('処理中です。少し待ってから戻ってください。');
    return;
  }
  session++;
  state = null;
  busy = false;
  selection = null;
  attackerUid = null;
  pendingTribute = null;
  logEntries = [];
  $('#game').classList.add('hidden');
  $('#title').classList.remove('hidden');
  $('#result').classList.remove('show');
  $('#how').classList.remove('show');
}

/* ------------------------------------------------------------
   TRAPS
   ------------------------------------------------------------ */

function trapCondition(key, ctx, defenderSide) {
  const defender = state[defenderSide];
  const attacker = state[other(defenderSide)];

  switch (key) {
    case 'magicCylinder':
      return !!ctx.direct;
    case 'mirrorForce':
    case 'greymoya':
    case 'sakuretsu':
      return !ctx.direct;
    case 'trapHole':
      return !!ctx.monster && ctx.monster.atk >= 1000;
    case 'torrential': {
      const own = defender.monsters.filter(Boolean).length;
      const foes = attacker.monsters.filter(Boolean).length;
      return foes >= 1 && own <= foes;
    }
    default:
      return false;
  }
}

async function tryTraps(defenderSide, trigger, ctx) {
  if (!state || state.over) return false;
  const sid = session;
  const defender = state[defenderSide];

  const traps = defender.spells
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => card && card.faceDown && card.type === 'trap');

  if (!traps.length) return false;

  const order = trigger === 'attack'
    ? ['magicCylinder', 'mirrorForce', 'greymoya', 'sakuretsu']
    : ['trapHole', 'torrential'];

  for (const key of order) {
    const hit = traps.find(({ card }) => card.key === key);
    if (!hit) continue;
    if (!trapCondition(key, ctx, defenderSide)) continue;

    await activateTrap(defenderSide, hit.card, hit.index, ctx);
    if (sid !== session || !state) return true;
    if (trigger === 'attack') return true;
  }

  return false;
}

async function activateTrap(side, card, index, ctx) {
  if (!state) return;
  const sid = session;
  const p = state[side];
  const attackerSide = other(side);

  card.faceDown = false;
  addLog(`${SIDE_NAME[side]}は罠「${card.name}」を発動！`, side);
  sound('trap');
  render();

  await sleep(460);
  if (sid !== session || !state) return;

  switch (card.key) {
    case 'magicCylinder': {
      const attacker = ctx.attacker;
      const amount = effAtk(attacker);
      addLog(`攻撃を無効にし、${amount}のダメージを反射する！`, side);
      sound('reflect');
      damage(state[attackerSide], amount);
      break;
    }
    case 'mirrorForce': {
      const foes = state[attackerSide].monsters.filter((c) => c && c.position === 'attack');
      for (const target of foes) destroyMonster(state[attackerSide], target);
      addLog('相手の攻撃表示モンスターを全て破壊した！', side);
      break;
    }
    case 'greymoya':
    case 'sakuretsu': {
      if (ctx.attacker) destroyMonster(state[attackerSide], ctx.attacker);
      addLog('攻撃モンスターを破壊した！', side);
      break;
    }
    case 'trapHole': {
      if (ctx.monster) destroyMonster(state[attackerSide], ctx.monster);
      addLog('召喚されたモンスターを破壊した！', side);
      break;
    }
    case 'torrential': {
      for (const s of ['player', 'ai']) {
        for (const target of [...state[s].monsters]) {
          if (target) destroyMonster(state[s], target);
        }
      }
      addLog('フィールド上のモンスターを全て破壊した！', side);
      break;
    }
    default:
      break;
  }

  const idx = p.spells.findIndex((c) => c && c.uid === card.uid);
  if (idx >= 0) p.spells[idx] = null;
  p.grave.push(card);
  render();
  await sleep(240);
}

/* ------------------------------------------------------------
   BATTLE
   ------------------------------------------------------------ */

async function performAttack(side, attacker, target) {
  if (!state || state.over) return;
  const sid = session;
  const wasBusy = busy;
  busy = true;

  const p = state[side];
  const opp = state[other(side)];

  if (!p.monsters.some((c) => c && c.uid === attacker.uid)) {
    busy = wasBusy;
    render();
    return;
  }

  const direct = !target;
  if (!direct && !opp.monsters.some((c) => c && c.uid === target.uid)) {
    busy = wasBusy;
    render();
    return;
  }

  addLog(
    `${SIDE_NAME[side]}の「${attacker.name}」が${direct ? '直接攻撃' : `「${target.name}」に攻撃`}！`,
    side
  );
  sound('attack');

  const attackerEl = document.querySelector(`.card[data-uid="${attacker.uid}"]`);
  if (attackerEl) attackerEl.classList.add('attacking');

  await sleep(340);
  if (sid !== session || !state || state.over) return;

  const stopped = await tryTraps(other(side), 'attack', { attacker, direct, side });
  if (sid !== session || !state) return;

  if (stopped || state.over) {
    if (p.monsters.some((c) => c && c.uid === attacker.uid)) attacker.hasAttacked = true;
    busy = wasBusy || state.over;
    render();
    return;
  }

  if (target && target.faceDown) {
    target.faceDown = false;
    addLog(`セットモンスターは「${target.name}」だった！`, other(side));
    render();
    await sleep(300);
    if (sid !== session || !state) return;
  }

  const atk = effAtk(attacker);

  if (direct) {
    const kuriboh = opp.hand.find((c) => c.key === 'kuriboh');
    if (kuriboh) {
      opp.hand.splice(opp.hand.indexOf(kuriboh), 1);
      opp.grave.push(kuriboh);
      addLog(`${SIDE_NAME[other(side)]}は「クリボー」を捨て、攻撃を無効にした！`, other(side));
      sound('trap');
      render();
      await sleep(460);
    } else {
      damage(opp, atk);
    }
  } else {
    const targetValue = target.position === 'attack' ? effAtk(target) : effDef(target);

    if (target.position === 'attack') {
      if (atk > targetValue) {
        damage(opp, atk - targetValue);
        destroyMonster(opp, target);
      } else if (atk < targetValue) {
        damage(p, targetValue - atk);
        destroyMonster(p, attacker);
      } else {
        destroyMonster(opp, target);
        destroyMonster(p, attacker);
        addLog('相打ちとなった！', 'system');
      }
    } else {
      if (atk > targetValue) {
        destroyMonster(opp, target);
      } else if (atk < targetValue) {
        damage(p, targetValue - atk);
      } else {
        addLog('攻撃は防がれた。', 'system');
      }
    }
  }

  if (p.monsters.some((c) => c && c.uid === attacker.uid)) attacker.hasAttacked = true;
  busy = wasBusy || state.over;
  render();
  await sleep(240);
}

function doDirectAttack() {
  if (!state || state.over || busy || state.active !== 'player') return;
  if (state.ai.monsters.some(Boolean)) {
    toast('相手モンスターがいるため直接攻撃できない');
    return;
  }
  const attacker = state.player.monsters.find((c) => c && c.uid === attackerUid);
  if (!attacker) {
    attackerUid = null;
    render();
    return;
  }
  attackerUid = null;
  performAttack('player', attacker, null);
}

function attackWith(target) {
  if (!state || state.over || busy || state.active !== 'player') return;
  const attacker = state.player.monsters.find((c) => c && c.uid === attackerUid);
  if (!attacker) return;
  attackerUid = null;
  performAttack('player', attacker, target);
}

function onCardClick(uid) {
  if (!state || state.over || busy || state.active !== 'player') return;
  const loc = locateCard(uid);
  if (!loc) return;

  if (pendingTribute) {
    if (loc.side === 'player' && loc.area === 'monsters') {
      const chosenIndex = pendingTribute.chosen.findIndex((c) => c.uid === uid);
      if (chosenIndex >= 0) {
        pendingTribute.chosen.splice(chosenIndex, 1);
      } else if (pendingTribute.chosen.length < pendingTribute.need) {
        pendingTribute.chosen.push(loc.card);
      }
      sound('click');
      render();
      if (pendingTribute && pendingTribute.chosen.length === pendingTribute.need) {
        const pt = pendingTribute;
        setTimeout(() => {
          if (pendingTribute === pt && pt.chosen.length === pt.need) executePendingTribute();
        }, 260);
      }
    }
    return;
  }

  if (attackerUid) {
    if (loc.side === 'ai' && loc.area === 'monsters') {
      attackWith(loc.card);
      return;
    }
    if (loc.side === 'player' && loc.area === 'monsters') {
      if (!loc.card.faceDown && loc.card.position === 'attack' && !loc.card.hasAttacked) {
        attackerUid = loc.card.uid;
        selection = null;
        sound('click');
        render();
      } else {
        toast('このモンスターは攻撃できない');
      }
      return;
    }
    if (loc.side === 'player' && loc.area === 'hand') {
      attackerUid = null;
      selection = { kind: 'hand', uid };
      sound('click');
      render();
      return;
    }
    return;
  }

  if (loc.side === 'ai' && loc.area === 'monsters') {
    if (loc.card.faceDown) toast('セットモンスター');
    else toast(`${loc.card.name} / ATK ${effAtk(loc.card)} DEF ${effDef(loc.card)}`);
    return;
  }

  if (loc.side === 'ai' && loc.area === 'spells') {
    if (!loc.card.faceDown) toast(`「${loc.card.name}」`);
    return;
  }

  if (loc.side !== 'player') return;

  if (loc.area === 'hand') {
    selection = { kind: 'hand', uid };
    attackerUid = null;
    sound('click');
    render();
    return;
  }

  if (loc.area === 'monsters') {
    const card = loc.card;
    if (!card.faceDown && card.position === 'attack' && !card.hasAttacked) {
      attackerUid = uid;
      selection = null;
      sound('click');
      render();
    } else {
      selection = { kind: 'monster', uid };
      attackerUid = null;
      render();
    }
    return;
  }

  if (loc.area === 'spells') {
    selection = { kind: 'spell', uid };
    attackerUid = null;
    sound('click');
    render();
  }
}

function clearSelection() {
  selection = null;
  attackerUid = null;
  pendingTribute = null;
  render();
}

function toggleSound() {
  muted = !muted;
  try {
    localStorage.setItem('ygo-muted', muted ? '1' : '0');
  } catch (err) {
    /* ignore */
  }
  const button = $('#sound-btn');
  if (button) button.textContent = muted ? '🔇' : '🔊';
  if (!muted) {
    ensureAudio();
    sound('click');
  }
}

function handleAction(action) {
  switch (action) {
    case 'start':
      startDuel();
      break;
    case 'how':
      $('#how').classList.add('show');
      break;
    case 'close-how':
      $('#how').classList.remove('show');
      break;
    case 'sound':
      toggleSound();
      break;
    case 'quit':
      quitToTitle();
      break;
    case 'rematch':
      $('#result').classList.remove('show');
      startDuel();
      break;
    case 'to-title':
      $('#result').classList.remove('show');
      quitToTitle(true);
      break;
    case 'end':
      endTurn();
      break;
    case 'summon':
      attemptPlace('summon');
      break;
    case 'set-monster':
      attemptPlace('set');
      break;
    case 'activate':
      activateSelection();
      break;
    case 'set-spell':
      setSpellSelection();
      break;
    case 'cancel':
      clearSelection();
      break;
    case 'direct':
      doDirectAttack();
      break;
    case 'tribute-cancel':
      pendingTribute = null;
      render();
      break;
    default:
      break;
  }
}
/* ------------------------------------------------------------
   AI
   ------------------------------------------------------------ */

async function runAiTurn() {
  if (!state || state.over) return;
  const sid = session;

  await aiSpells();
  if (sid !== session || !state || state.over) return;

  await aiSummon();
  if (sid !== session || !state || state.over) return;

  aiSetTraps();
  render();
  await sleep(340);
  if (sid !== session || !state || state.over) return;

  await aiBattle();
  if (sid !== session || !state || state.over) return;

  addLog('AIはターンを終了した。', 'system');
  render();
  await sleep(420);
  if (sid !== session || !state || state.over) return;

  await beginTurn('player');
}

function maxAtk(monsters) {
  return monsters.reduce((best, card) => Math.max(best, effAtk(card)), 0);
}

function minAtk(monsters) {
  return monsters.reduce((best, card) => Math.min(best, card.atk), Infinity);
}

async function aiSpells() {
  if (!state || state.over) return;
  const sid = session;
  const p = state.ai;
  const opp = state.player;
  let plays = 0;

  const cast = async (key) => {
    if (!state || state.over || plays >= 4) return false;
    const card = p.hand.find((c) => c.key === key);
    if (!card || !canActivateSpell(p, card)) return false;
    await castSpell('ai', card, null);
    plays++;
    await sleep(260);
    return true;
  };

  const oppMons = () => opp.monsters.filter(Boolean);
  const aiMons = () => p.monsters.filter(Boolean);

  if (p.deck.length > 4 && p.hand.length < 7 && p.hand.some((c) => c.key === 'pot')) {
    await cast('pot');
    if (sid !== session || !state || state.over) return;
  }

  if (
    p.hand.some((c) => c.key === 'darkHole') &&
    oppMons().length >= 2 &&
    aiMons().length <= 1
  ) {
    await cast('darkHole');
    if (sid !== session || !state || state.over) return;
  }

  if (p.hand.some((c) => c.key === 'raigeki') && oppMons().length) {
    const bestFoe = maxAtk(oppMons());
    const bestOwn = maxAtk(aiMons());
    if (aiMons().length === 0 || bestFoe > bestOwn) {
      await cast('raigeki');
      if (sid !== session || !state || state.over) return;
    }
  }

  if (p.hand.some((c) => c.key === 'fissure') && oppMons().length && aiMons().length) {
    if (minAtk(oppMons()) <= maxAtk(aiMons()) + 300) {
      await cast('fissure');
      if (sid !== session || !state || state.over) return;
    }
  }

  if (p.hand.some((c) => c.key === 'harpie') && opp.spells.filter(Boolean).length >= 2) {
    await cast('harpie');
    if (sid !== session || !state || state.over) return;
  } else if (
    p.hand.some((c) => c.key === 'cyclone') &&
    opp.spells.some(Boolean) &&
    Math.random() < 0.7
  ) {
    await cast('cyclone');
    if (sid !== session || !state || state.over) return;
  }

  if (
    p.hand.some((c) => c.key === 'reborn') &&
    p.grave.some((c) => c.type === 'monster') &&
    p.monsters.some((x) => !x)
  ) {
    await cast('reborn');
    if (sid !== session || !state || state.over) return;
  }

  if (p.hand.some((c) => c.key === 'bigBang')) {
    const attackers = p.monsters.filter((c) => c && c.position === 'attack');
    if (attackers.length) {
      const best = maxAtk(attackers);
      if (best + 1000 >= opp.lp || best >= 2200) {
        await cast('bigBang');
      }
    }
  }
}

async function aiSummon() {
  if (!state || state.over) return;
  const sid = session;
  const p = state.ai;
  const handMonsters = p.hand.filter((c) => c.type === 'monster');
  if (!handMonsters.length) return;

  const fieldMonsters = p.monsters.filter(Boolean);
  const empties = p.monsters.filter((x) => !x).length;
  const candidates = [];

  for (const card of handMonsters) {
    const need = tributesNeeded(card.level);
    if (need > fieldMonsters.length) continue;
    if (need === 0 && empties === 0) continue;

    const tributes = fieldMonsters
      .slice()
      .sort((a, b) => effAtk(a) - effAtk(b))
      .slice(0, need);

    const lost = tributes.reduce((sum, t) => sum + effAtk(t), 0);
    if (need > 0 && card.atk <= lost) continue;

    const score = card.atk + card.def * 0.25 + (need > 0 ? 380 : 0);
    candidates.push({ card, need, tributes, score });
  }

  if (!candidates.length) return;
  candidates.sort((a, b) => b.score - a.score);
  const pick = candidates[0];

  const zone = firstEmptyAfter(p, pick.tributes);
  if (zone < 0) return;

  await placeMonster('ai', pick.card, zone, pick.tributes, 'attack');
  if (sid !== session) return;
}

function aiSetTraps() {
  if (!state || state.over) return;
  const p = state.ai;
  const traps = p.hand.filter((c) => c.type === 'trap');
  if (!traps.length) return;

  const zone = p.spells.findIndex((x) => !x);
  if (zone < 0) return;

  const card = traps[0];
  p.hand.splice(p.hand.indexOf(card), 1);
  card.faceDown = true;
  p.spells[zone] = card;
  addLog('AIはカードを1枚セットした。', 'ai');
  sound('set');
  render();
}

async function aiBattle() {
  let guard = 0;

  while (guard++ < 6) {
    if (!state || state.over) return;
    const sid = session;
    const p = state.ai;
    const opp = state.player;

    const attackers = p.monsters.filter(
      (c) => c && !c.faceDown && c.position === 'attack' && !c.hasAttacked
    );
    if (!attackers.length) return;

    const attacker = attackers[0];
    const targets = opp.monsters.filter(Boolean);

    if (!targets.length) {
      await performAttack('ai', attacker, null);
      if (sid !== session) return;
      await sleep(300);
      continue;
    }

    let best = null;
    for (const target of targets) {
      let score = -1;

      if (target.faceDown) {
        if (effAtk(attacker) >= 1900) score = 80 + Math.random() * 40;
      } else if (target.position === 'attack') {
        if (effAtk(attacker) > effAtk(target)) {
          score = effAtk(attacker) - effAtk(target) + effAtk(target) * 0.6;
        }
      } else if (effAtk(attacker) > effDef(target)) {
        score = effDef(target) * 0.7;
      }

      if (score >= 0 && (!best || score > best.score)) {
        best = { card: target, score };
      }
    }

    if (!best) return;

    await performAttack('ai', attacker, best.card);
    if (sid !== session) return;
    await sleep(300);
  }
}

/* ------------------------------------------------------------
   AMBIENCE / INIT
   ------------------------------------------------------------ */

function makeStars() {
  const wrap = $('#stars');
  if (!wrap) return;
  for (let i = 0; i < 72; i++) {
    const star = document.createElement('i');
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.setProperty('--dur', `${4 + Math.random() * 7}s`);
    star.style.setProperty('--delay', `${-Math.random() * 10}s`);
    const size = Math.random() < 0.18 ? 3 : 2;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    wrap.appendChild(star);
  }
}

function decorateTitle() {
  const wrap = $('#title-cards');
  if (!wrap) return;
  ['blueeyes', 'darkmagician', 'kuriboh'].forEach((key) => {
    const card = makeCard(key);
    const el = makeCardEl(card, { size: 'title' });
    el.style.pointerEvents = 'none';
    wrap.appendChild(el);
  });
}

function init() {
  makeStars();
  decorateTitle();

  try {
    muted = localStorage.getItem('ygo-muted') === '1';
  } catch (err) {
    muted = false;
  }
  const soundBtn = $('#sound-btn');
  if (soundBtn) soundBtn.textContent = muted ? '🔇' : '🔊';

  document.addEventListener('click', (event) => {
    const actionEl = event.target.closest('[data-action]');
    if (actionEl) {
      event.preventDefault();
      handleAction(actionEl.dataset.action);
      return;
    }
    const cardEl = event.target.closest('.card[data-uid]');
    if (cardEl) {
      event.preventDefault();
      onCardClick(cardEl.dataset.uid);
    }
  });

  const oppMonsters = $('#opp-monsters');
  if (oppMonsters) {
    oppMonsters.addEventListener('click', (event) => {
      if (event.target.closest('.card')) return;
      if (!state || state.over || busy || state.active !== 'player') return;
      if (attackerUid && !state.ai.monsters.some(Boolean)) doDirectAttack();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if ($('#how').classList.contains('show')) {
        $('#how').classList.remove('show');
      } else if (state && !state.over) {
        clearSelection();
      }
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      if (event.repeat) return;
      const cardEl = event.target.closest('.card[data-uid]');
      if (cardEl) {
        event.preventDefault();
        onCardClick(cardEl.dataset.uid);
      }
    }
  });
}

init();
