'use strict';

/* ============================================================
   Core utilities, audio, state and rendering
   ============================================================ */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const sleep = ms => new Promise(res => setTimeout(res, ms));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const other = k => (k === 'you' ? 'foe' : 'you');
const sideLabel = k => (k === 'you' ? 'あなた' : '相手');

let UID = 0;

/* ---------------- audio ---------------- */
const Sfx = {
  on: true, ctx: null, master: null,
  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = .85;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(freq, dur = .15, type = 'sine', vol = .05, slide = null, delay = 0) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + .012);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + .02);
  },
  noise(dur = .25, vol = .05, freq = 1200, delay = 0) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = .7;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  },
  click() { this.tone(460, .05, 'square', .018, 560); },
  draw() { this.tone(720, .06, 'triangle', .026, 980); this.tone(1140, .07, 'sine', .018, 1420, .035); },
  summon() { this.noise(.3, .045, 620); this.tone(86, .4, 'sawtooth', .05, 40); this.tone(260, .5, 'triangle', .035, 540, .03); },
  attack() { this.noise(.18, .06, 2200); this.tone(190, .2, 'sawtooth', .04, 70); },
  hit() { this.noise(.2, .05, 420); this.tone(72, .32, 'sine', .075, 38); },
  trap() { this.tone(880, .13, 'triangle', .045, 660); this.tone(1320, .2, 'sine', .028, 880, .09); },
  destroy() { this.noise(.28, .055, 900); this.tone(130, .3, 'square', .028, 48); },
  win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, .4, 'triangle', .05, null, i * .13)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, .5, 'sine', .05, null, i * .15)); }
};

/* ---------------- particles ---------------- */
const FX = {
  canvas: null, ctx: null, W: 0, H: 0, dpr: 1, parts: [], dust: [],
  init() {
    this.canvas = $('#fx');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    const loop = () => { this.tick(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  },
  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = window.innerWidth; this.H = window.innerHeight;
    this.canvas.width = this.W * this.dpr; this.canvas.height = this.H * this.dpr;
    this.canvas.style.width = this.W + 'px'; this.canvas.style.height = this.H + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.dust = Array.from({ length: 42 }, () => ({
      x: Math.random() * this.W, y: Math.random() * this.H,
      r: Math.random() * 1.7 + .4, vx: (Math.random() - .5) * .12,
      vy: -(Math.random() * .18 + .04), a: Math.random() * .4 + .1,
      ph: Math.random() * 6.28
    }));
  },
  burst(x, y, hue = 45, count = 22, power = 3.4) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, s = Math.random() * power + .5;
      this.parts.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - .7,
        life: 1, decay: .012 + Math.random() * .022,
        r: Math.random() * 2.2 + .7, hue: hue + (Math.random() * 40 - 20)
      });
    }
  },
  tick() {
    const c = this.ctx;
    c.clearRect(0, 0, this.W, this.H);
    c.globalCompositeOperation = 'lighter';
    const t = performance.now() / 1000;
    for (const d of this.dust) {
      d.x += d.vx; d.y += d.vy;
      d.vx += Math.sin(t * .7 + d.ph) * .002;
      if (d.y < -10) { d.y = this.H + 10; d.x = Math.random() * this.W; }
      if (d.x < -10) d.x = this.W + 10; if (d.x > this.W + 10) d.x = -10;
      c.beginPath(); c.arc(d.x, d.y, d.r, 0, 6.283);
      c.fillStyle = `hsla(45,90%,72%,${d.a * (.55 + .45 * Math.sin(t + d.ph))})`;
      c.fill();
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.x += p.vx; p.y += p.vy; p.vy += .045; p.vx *= .985; p.vy *= .985;
      p.life -= p.decay;
      if (p.life <= 0) { this.parts.splice(i, 1); continue; }
      c.beginPath(); c.arc(p.x, p.y, p.r * p.life, 0, 6.283);
      c.fillStyle = `hsla(${p.hue},100%,72%,${p.life * .85})`;
      c.fill();
    }
    c.globalCompositeOperation = 'source-over';
  }
};

/* ---------------- state ---------------- */
let S = null;

function makeCard(id) { return { ...CARD_DB[id], uid: 'c' + (++UID) }; }

function newSide() {
  return {
    lp: 8000, deck: shuffle(DECK_IDS.map(makeCard)),
    hand: [], monsters: Array(5).fill(null), spells: Array(5).fill(null),
    grave: [], normalSummoned: false
  };
}

function rigOpening(side) {
  const picks = [];
  const take = pred => {
    const i = side.deck.findIndex(pred);
    if (i >= 0) picks.push(side.deck.splice(i, 1)[0]);
  };
  take(c => c.kind === 'monster' && c.level <= 4);
  take(c => c.kind === 'monster' && c.level <= 4);
  take(c => c.kind === 'monster' && c.level >= 5);
  take(c => c.kind === 'spell');
  take(c => c.kind === 'trap');
  while (picks.length < 5 && side.deck.length) picks.push(side.deck.pop());
  side.hand = picks;
}

function freshState() {
  const st = {
    turn: 0, active: 'you', over: false, busy: false,
    you: newSide(), foe: newSide(),
    selected: null, attacker: null, pendingSummon: null, tributes: [],
    log: [], stats: { damage: 0, summons: 0 }
  };
  rigOpening(st.you); rigOpening(st.foe);
  return st;
}

/* ---------------- lookups ---------------- */
function findCard(uid) {
  if (!S || !uid) return null;
  const groups = [['you', S.you], ['foe', S.foe]];
  for (const [key, side] of groups) {
    for (const c of side.hand) if (c.uid === uid) return { card: c, side: key, where: 'hand' };
    for (let i = 0; i < 5; i++) {
      const m = side.monsters[i];
      if (m && m.card.uid === uid) return { card: m.card, side: key, where: 'monster', zone: m, idx: i };
      const sp = side.spells[i];
      if (sp && sp.card.uid === uid) return { card: sp.card, side: key, where: 'spell', zone: sp, idx: i };
    }
    for (const c of side.grave) if (c.uid === uid) return { card: c, side: key, where: 'grave' };
  }
  return null;
}

function effAtk(z) { return z ? z.card.atk + (z.atkMod || 0) : 0; }
function effDef(z) { return z ? z.card.def + (z.defMod || 0) : 0; }
function zoneEl(sideKey, kind, idx) {
  return document.querySelector(`#${sideKey}-${kind}s .zone[data-idx="${idx}"]`);
}
function cardElAt(sideKey, kind, idx) {
  const z = zoneEl(sideKey, kind, idx);
  return z ? z.querySelector('.card') : null;
}

/* ---------------- card markup ---------------- */
function cardHTML(card, opts = {}) {
  const cls = ['card', 'kind-' + card.kind];
  if (opts.selected) cls.push('selected');
  if (opts.veiled) cls.push('veiled');
  if (opts.back) cls.push('back');
  if (opts.hand) cls.push('hand-card');
  if (opts.back) {
    return `<div class="${cls.join(' ')}"><div class="card-frame"><div class="back-art">${BACK_SVG}</div></div></div>`;
  }
  const lv = card.kind === 'monster'
    ? `<span class="c-lv">★${card.level}</span>`
    : `<span class="c-lv">${card.kind === 'spell' ? '魔' : '罠'}</span>`;
  const atk = opts.atk ?? card.atk;
  const def = opts.def ?? card.def;
  const bottom = card.kind === 'monster'
    ? `<div class="card-stats"><span class="atk${opts.atkMod ? ' up' : ''}">ATK ${atk}</span><span class="def">DEF ${def}</span></div>`
    : `<div class="card-type"><span>${card.kind === 'spell' ? (card.type === 'QUICK' ? '速攻魔法' : card.type === 'EQUIP' ? '装備魔法' : '魔法カード') : '罠カード'}</span><span>${card.kind === 'spell' ? 'SPELL' : 'TRAP'}</span></div>`;
  return `<div class="${cls.join(' ')}" data-uid="${card.uid}">
    <div class="card-frame">
      <div class="card-head"><span class="c-name">${card.name}</span></div>
      <div class="card-art">${artFor(card)}${lv}</div>
      ${bottom}
    </div>
    ${opts.veiled ? '<div class="veil"><span>SET</span></div>' : ''}
    <div class="holo"></div>
  </div>`;
}

function monsterZoneHTML(sideKey, z, i) {
  const isYou = sideKey === 'you';
  let cls = 'zone';
  if (!z) return `<div class="${cls} empty" data-side="${sideKey}" data-kind="monster" data-idx="${i}"></div>`;
  let html, extra = '';
  if (z.set) {
    html = isYou
      ? cardHTML(z.card, { veiled: true, atk: effAtk(z), def: effDef(z) })
      : cardHTML(z.card, { back: true });
    extra = `<div class="pos-ribbon set">${isYou ? '裏守備' : 'SET'}</div>`;
  } else {
    html = cardHTML(z.card, { atk: effAtk(z), def: effDef(z), atkMod: z.atkMod });
    if (z.pos === 'defense') extra = '<div class="pos-ribbon def">守備</div>';
  }
  if (z.atkMod) extra += `<div class="equip-chip">+${z.atkMod}</div>`;
  if (isYou && S.attacker === i) cls += ' attacker-armed';
  if (!isYou && S.attacker !== null) cls += ' targetable';
  if (S.tributes.includes(i) && isYou) cls += ' picked';
  if (S.pendingSummon && isYou) cls += ' tribute-pick';
  return `<div class="${cls}" data-side="${sideKey}" data-kind="monster" data-idx="${i}">${html}${extra}</div>`;
}

function spellZoneHTML(sideKey, z, i) {
  const isYou = sideKey === 'you';
  let cls = 'zone st';
  if (!z) return `<div class="${cls} empty" data-side="${sideKey}" data-kind="spell" data-idx="${i}"></div>`;
  let html, extra = '';
  if (z.set) {
    html = isYou ? cardHTML(z.card, { veiled: true }) : cardHTML(z.card, { back: true });
    extra = '<div class="pos-ribbon set">罠</div>';
  } else {
    html = cardHTML(z.card);
    cls += ' spell-live';
    extra = '<div class="pos-ribbon set">発動</div>';
  }
  return `<div class="${cls}" data-side="${sideKey}" data-kind="spell" data-idx="${i}">${html}${extra}</div>`;
}

/* ---------------- render ---------------- */
function render() {
  if (!S) return;
  hideTooltip();
  renderMonsters(); renderSpells(); renderHands();
  renderHUD(); renderLog(); updateHint(); updateActions(); updateControls();
}

function renderMonsters() {
  const you = $('#you-monsters'), foe = $('#foe-monsters');
  if (!you || !foe) return;
  you.innerHTML = S.you.monsters.map((z, i) => monsterZoneHTML('you', z, i)).join('');
  foe.innerHTML = S.foe.monsters.map((z, i) => monsterZoneHTML('foe', z, i)).join('');
  if (S.attacker !== null && !S.foe.monsters.some(Boolean)) {
    foe.insertAdjacentHTML('beforeend', '<div class="direct-lane" data-direct="1"></div>');
  }
}

function renderSpells() {
  const you = $('#you-spells'), foe = $('#foe-spells');
  if (!you || !foe) return;
  you.innerHTML = S.you.spells.map((z, i) => spellZoneHTML('you', z, i)).join('');
  foe.innerHTML = S.foe.spells.map((z, i) => spellZoneHTML('foe', z, i)).join('');
}

function renderHands() {
  const you = $('#you-hand'), foe = $('#foe-hand');
  if (!you || !foe) return;
  you.innerHTML = S.you.hand.map(c => cardHTML(c, { hand: true, selected: S.selected === c.uid })).join('');
  foe.innerHTML = S.foe.hand.map(() => cardHTML({ kind: 'monster' }, { back: true })).join('');

  if (you.children.length) {
    const n = you.children.length;
    const cw = you.children[0].getBoundingClientRect().width || 100;
    const avail = Math.min(window.innerWidth - 28, 1020);
    let overlap = n > 1 ? (avail - n * cw - 8) / (n - 1) : 0;
    overlap = Math.max(overlap, -cw * .52);
    overlap = Math.min(overlap, 2);
    [...you.children].forEach((el, i) => {
      const mid = (n - 1) / 2;
      el.style.setProperty('--rot', ((i - mid) * Math.min(2.6, 22 / n)).toFixed(2) + 'deg');
      el.style.setProperty('--ty', (Math.abs(i - mid) * 2.4).toFixed(1) + 'px');
      el.style.setProperty('--zi', String(n - i));
      if (i > 0) el.style.marginLeft = overlap.toFixed(1) + 'px';
    });
  }
  [...foe.children].forEach((el, i) => {
    el.style.setProperty('--rot', ((i - (foe.children.length - 1) / 2) * 3).toFixed(1) + 'deg');
  });
}

function renderHUD() {
  if (!S) return;
  $('#you-lp').textContent = S.you.lp;
  $('#foe-lp').textContent = S.foe.lp;
  $('#you-lpbar').style.width = clamp(S.you.lp / 8000 * 100, 0, 100) + '%';
  $('#foe-lpbar').style.width = clamp(S.foe.lp / 8000 * 100, 0, 100) + '%';
  $('#you-deck').textContent = S.you.deck.length;
  $('#foe-deck').textContent = S.foe.deck.length;
  $('#you-grave').textContent = S.you.grave.length;
  $('#foe-grave').textContent = S.foe.grave.length;
  $('#turnno').textContent = 'TURN ' + Math.max(1, S.turn);
  const who = $('#turnwho');
  who.textContent = S.over ? 'DUEL OVER' : S.active === 'you' ? 'YOUR TURN' : 'OPPONENT TURN';
  who.style.color = S.active === 'foe' ? '#ffc4d4' : '';
}

function log(text, who) {
  S.log.push({ text, who: who || S.active });
  if (S.log.length > 6) S.log.shift();
  renderLog();
}

function renderLog() {
  const box = $('#log');
  if (!box) return;
  box.innerHTML = S.log.slice(-5).map(l => `<div class="log-line ${l.who}">${l.text}</div>`).join('');
}

function updateHint() {
  const hint = $('#hint');
  if (!hint || !S) return;
  let text = '';
  if (!S.over) {
    if (S.active === 'foe') text = '相手のターン — 静観';
    else if (S.busy) text = '';
    else if (S.pendingSummon) text = `生贄にするモンスターを選択 (${S.tributes.length}/${S.pendingSummon.need})`;
    else if (S.attacker !== null) text = '攻撃対象を選択 — 相手モンスターをクリック';
    else if (S.selected) text = '手札のカードを選択中';
    else text = '手札をタップして行動';
  }
  hint.textContent = text;
  hint.classList.toggle('show', !!text);
}

function updateControls() {
  const end = $('#btn-end');
  if (end) end.disabled = !S || S.over || S.busy || S.active !== 'you';
  const help = $('#btn-help');
  if (help) help.disabled = !S || S.over || S.busy || S.active !== 'you';
  const snd = $('#btn-sound');
  if (snd) snd.textContent = Sfx.on ? '♪' : '×';
}

function banner(text, foe) {
  const b = $('#phase-banner');
  if (!b) return;
  b.textContent = text;
  b.classList.remove('show', 'foe');
  if (foe) b.classList.add('foe');
  void b.offsetWidth;
  b.classList.add('show');
}

/* ---------------- effects ---------------- */
function hideTooltip() {
  const tt = $('#tooltip');
  if (tt) tt.classList.remove('show');
}

function floatDamage(sideKey, amount, opts = {}) {
  const anchor = sideKey === 'you' ? $('#you-lp') : $('#foe-lp');
  const layer = $('#dmg-layer');
  if (!anchor || !layer) return;
  const r = anchor.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'dmg' + (opts.heal ? ' heal' : '');
  el.textContent = (amount >= 0 ? '-' : '+') + Math.abs(amount);
  el.style.left = (r.left + r.width / 2) + 'px';
  el.style.top = (r.top + r.height / 2) + 'px';
  layer.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function screenShake() {
  const app = $('#app');
  if (!app) return;
  app.classList.remove('screen-shake');
  void app.offsetWidth;
  app.classList.add('screen-shake');
  setTimeout(() => app.classList.remove('screen-shake'), 360);
}

function flashScreen() {
  const f = $('#flash');
  if (!f) return;
  f.classList.remove('on');
  void f.offsetWidth;
  f.classList.add('on');
  setTimeout(() => f.classList.remove('on'), 460);
}

function burstAt(sideKey, kind, idx, hue, count) {
  const el = zoneEl(sideKey, kind, idx);
  if (!el) return;
  const r = el.getBoundingClientRect();
  FX.burst(r.left + r.width / 2, r.top + r.height / 2, hue, count || 22);
}

function animateSummon(sideKey, idx, hue) {
  const z = zoneEl(sideKey, 'monster', idx);
  if (!z) return;
  z.classList.add('summon-ring');
  const c = z.querySelector('.card');
  if (c) c.classList.add('summoning');
  burstAt(sideKey, 'monster', idx, hue, 30);
  setTimeout(() => z.classList.remove('summon-ring'), 750);
}
