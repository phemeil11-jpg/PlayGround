'use strict';

/* =========================================================
 *  遊戯王 — DUEL ARENA
 *  A self-contained, original card-duel engine.
 * ========================================================= */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = n => Math.floor(Math.random() * n);
function shuffle(a){ for (let i = a.length - 1; i > 0; i--){ const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const otherKey = k => (k === 'p' ? 'o' : 'p');
const sideName = k => (k === 'p' ? 'あなた' : 'カオス');

const PHASE_LABEL = { DP: 'ドロー', SP: 'スタンバイ', M1: 'メイン', BP: 'バトル', EP: 'エンド' };

let uidc = 0;
function mk(id){
  const def = CARDS[id];
  return { uid: 'c' + (++uidc), def, boost: 0, atkUsed: false, pos: null, setAt: -99, flipped: false };
}

function newSide(key){
  return { key, lp: 8000, deck: [], hand: [], mon: [null, null, null], st: [null, null, null], grave: [], normalSummons: 0, extraSummons: 0 };
}

const S = { turnNo: 0, owner: 'p', phase: 'DP', busy: true, over: false, modal: false, p: null, o: null };

/* Bumped whenever a new duel starts, so abandoned async AI flows stop. */
let epoch = 0;

const ui = {
  mode: 'idle', selected: null, pending: null, faceDown: false, placeRow: null,
  need: 0, tributes: [], targetSpec: null, source: null, attacker: null,
};

const ATTR_FALLBACK = ['#9ec8ff', '#16213d'];

/* ---------------------------------------------------------
 *  CARD / ZONE RENDERING
 * ------------------------------------------------------- */
function cardEl(card, opts = {}){
  const d = card.def;
  const el = document.createElement('div');
  el.className = 'card ' + d.kind;
  if (opts.faceDown || card.pos === 'set'){
    el.classList.add('facedown');
    el.innerHTML = '<div class="back"><span>◆</span></div>';
    return el;
  }
  const [c1, c2] = ATTR_COLORS[d.attr] || ATTR_FALLBACK;
  el.style.setProperty('--c1', c1);
  el.style.setProperty('--c2', c2);

  let stats = '';
  if (d.kind === 'monster'){
    const boost = card.boost ? `<span class="boost">+${card.boost}</span>` : '';
    stats = `<span>ATK <b>${d.atk + (card.boost || 0)}</b>${boost}</span><span>DEF <b>${d.def}</b></span>`;
  } else {
    stats = `<span class="type">${d.kind === 'spell' ? '魔法' : '罠'}</span>`;
  }
  const stars = d.kind === 'monster' ? '★'.repeat(Math.min(d.level, 8)) : '';
  const posBadge = (d.kind === 'monster' && card.pos === 'def') ? '<span class="posbadge">守</span>' : '';
  el.innerHTML = `
    <div class="inner">
      <div class="art"><div class="lv">${stars}</div>${posBadge}<i class="glyph">${d.art}</i></div>
      <div class="cname">${d.name}</div>
      <div class="stats">${stats}</div>
    </div>`;
  el.title = d.name + (d.text ? '\n' + d.text : '');
  return el;
}

function backEl(){
  const el = document.createElement('div');
  el.className = 'card monster facedown';
  el.innerHTML = '<div class="back"><span>◆</span></div>';
  return el;
}

function zoneHighlight(k, row, i, card){
  if (ui.mode === 'place'){
    if (k !== 'p' || row !== ui.placeRow) return null;
    if (!card) return 'drop';
    if (row === 'mon' && ui.tributes.includes(i)) return 'drop';
    return null;
  }
  if (ui.mode === 'tribute'){
    return (k === 'p' && row === 'mon' && card) ? 'selectable' : null;
  }
  if (ui.mode === 'target'){
    const spec = ui.targetSpec;
    if (!spec || !card) return null;
    const tk = spec.enemy ? otherKey('p') : 'p';
    return (k === tk && row === spec.row) ? 'target' : null;
  }
  if (ui.mode === 'attack'){
    return (k === 'o' && row === 'mon' && card) ? 'target' : null;
  }
  if (S.owner !== 'p' || S.busy || S.over) return null;
  if (k === 'p' && row === 'mon' && card && card.pos === 'atk' && S.phase === 'BP' && !card.atkUsed) return 'selectable';
  if (k === 'p' && row === 'mon' && card && card.pos === 'set' && S.phase === 'M1' && (S.p.flipUsed || 0) < 1) return 'selectable';
  if (k === 'p' && row === 'st' && card && card.pos === 'set' && S.phase === 'M1') return 'selectable';
  return null;
}

function zoneEl(k, row, i){
  const card = S[k][row][i];
  const z = document.createElement('div');
  z.className = 'zone' + (card ? '' : ' empty');
  z.dataset.zone = `${k}-${row}-${i}`;
  z.dataset.idx = i;
  const hl = zoneHighlight(k, row, i, card);
  if (hl) z.classList.add(hl);
  if (card){
    const ce = cardEl(card);
    if (card.pos === 'set') ce.classList.add('facedown');
    z.appendChild(ce);
    if (ui.mode === 'tribute' && k === 'p' && ui.tributes.includes(i)) z.classList.add('tributed');
    if (ui.mode === 'attack' && k === 'p' && ui.attacker === i) z.classList.add('attacker');
  }
  return z;
}

function renderBoards(){
  for (const k of ['p', 'o']){
    for (const row of ['mon', 'st']){
      const box = $('#' + k + '-' + row);
      box.innerHTML = '';
      for (let i = 0; i < 3; i++) box.appendChild(zoneEl(k, row, i));
    }
  }
  const hud = $('#opp-hud');
  const direct = ui.mode === 'attack' && !S.o.mon.some(Boolean);
  hud.classList.toggle('directable', direct);
}

function renderHands(){
  const ph = $('#p-hand');
  ph.innerHTML = '';
  S.p.hand.forEach(card => {
    const el = cardEl(card);
    el.dataset.hand = card.uid;
    if (ui.selected === card) el.classList.add('selected');
    if (S.owner === 'p' && S.phase === 'M1' && !S.busy && !S.over){
      const acts = handActions(card);
      if (!acts.length) el.classList.add('unaffordable');
    }
    ph.appendChild(el);
  });

  const oh = $('#o-hand');
  oh.innerHTML = '';
  for (let i = 0; i < S.o.hand.length; i++) oh.appendChild(backEl());
}

function renderHUD(){
  for (const k of ['p', 'o']){
    const s = S[k], p = k;
    $('#' + p + '-lp').textContent = s.lp;
    const pct = Math.max(0, Math.min(100, s.lp / 8000 * 100));
    $('#' + p + '-lpfill').style.width = pct + '%';
    $('#' + p + '-deckn').textContent = s.deck.length;
    $('#' + p + '-graven').textContent = s.grave.length;
    $('#' + p + '-handn').textContent = s.hand.length;
  }
  $('#turnno').textContent = S.turnNo;
  $('#phase').textContent = PHASE_LABEL[S.phase] || '—';

  const owner = $('#turnowner');
  if (S.over){ owner.textContent = 'デュエル終了'; owner.classList.remove('enemy'); }
  else {
    owner.textContent = S.owner === 'p' ? 'あなたのターン' : '相手のターン';
    owner.classList.toggle('enemy', S.owner === 'o');
  }

  const st = $('#statusline');
  if (S.over){ st.textContent = 'デュエル終了'; st.classList.remove('thinking'); }
  else if (S.owner === 'o' && S.busy){ st.textContent = 'カオスが思考中…'; st.classList.add('thinking'); }
  else {
    st.textContent = (S.owner === 'p' ? 'あなた' : 'カオス') + ' — ' + (PHASE_LABEL[S.phase] || '');
    st.classList.remove('thinking');
  }

  const myTurn = S.owner === 'p' && !S.busy && !S.over;
  $('#btnBattle').disabled = !(myTurn && S.phase === 'M1');
  $('#btnBattle').textContent = S.phase === 'BP' ? 'バトル中' : 'バトルフェイズ';
  $('#btnEnd').disabled = !myTurn;
}

function renderActionBar(){
  const bar = $('#actionbar');
  if (S.over || S.busy || S.owner !== 'p' || S.modal || ui.mode === 'idle' && !ui.selected){
    bar.classList.add('hidden');
    bar.innerHTML = '';
    return;
  }

  let html = '';
  if (ui.mode === 'idle' && ui.selected){
    const d = ui.selected.def;
    const acts = handActions(ui.selected);
    html = `<div class="inspect"><b>${d.name}</b><span>${d.text || ''}</span></div>
      <div class="acts">${acts.map(a => `<button data-act="${a.id}">${a.label}</button>`).join('')}
      <button data-act="cancel" class="ghost">キャンセル</button></div>`;
  } else if (ui.mode === 'tribute'){
    html = `<div class="inspect"><b>リリースを選択</b><span>${ui.pending.def.name} を召喚するには ${ui.need} 体のリリースが必要（${ui.tributes.length}/${ui.need}）</span></div>
      <div class="acts"><button data-act="confirmTribute" ${ui.tributes.length === ui.need ? '' : 'disabled'}>決定</button>
      <button data-act="cancel" class="ghost">キャンセル</button></div>`;
  } else if (ui.mode === 'place'){
    html = `<div class="inspect"><b>設置場所を選択</b><span>${ui.pending.def.name} を${ui.faceDown ? 'セット' : '召喚'}します</span></div>
      <div class="acts"><button data-act="cancel" class="ghost">キャンセル</button></div>`;
  } else if (ui.mode === 'target'){
    html = `<div class="inspect"><b>対象を選択</b><span>${ui.pending.def.name} の対象を選んでください</span></div>
      <div class="acts"><button data-act="cancel" class="ghost">キャンセル</button></div>`;
  } else if (ui.mode === 'attack'){
    const a = S.p.mon[ui.attacker];
    html = `<div class="inspect"><b>攻撃宣言</b><span>${a ? a.def.name : ''} の攻撃対象を選んでください${S.o.mon.some(Boolean) ? '' : '（相手のLPをタップで直接攻撃）'}</span></div>
      <div class="acts"><button data-act="cancel" class="ghost">キャンセル</button></div>`;
  }
  if (!html){ bar.classList.add('hidden'); return; }
  bar.innerHTML = html;
  bar.classList.remove('hidden');
}

function render(){
  renderHUD();
  renderBoards();
  renderHands();
  renderActionBar();
}

/* ---------------------------------------------------------
 *  RULES HELPERS
 * ------------------------------------------------------- */
function tributeCount(level){ return level >= 7 ? 2 : level >= 5 ? 1 : 0; }
function canNormalSummon(){ return S.p.normalSummons < 1 + S.p.extraSummons; }
function canPlaceMonster(card){
  const need = tributeCount(card.def.level);
  const onField = S.p.mon.filter(Boolean).length;
  const free = 3 - onField;
  if (need === 0) return free > 0;
  return onField >= need;
}

function targetSpecFor(def){
  return def.target ? (TARGET_SPEC[def.target] || null) : null;
}
function hasValidTarget(spec){
  if (!spec) return true;
  if (spec.grave) return S.p.grave.some(c => c.def.kind === 'monster') && S.p.mon.includes(null);
  const side = spec.enemy ? S.o : S.p;
  return side[spec.row].some(Boolean);
}

function handActions(card){
  const acts = [];
  if (S.owner !== 'p' || S.busy || S.over || S.phase !== 'M1' || S.modal) return acts;
  const d = card.def;
  if (d.kind === 'monster'){
    if (canNormalSummon() && canPlaceMonster(card)){
      acts.push({ id: 'summon', label: '召喚' }, { id: 'setmon', label: '守備セット' });
    }
  } else if (d.kind === 'spell'){
    const spec = targetSpecFor(d);
    if (!spec || hasValidTarget(spec)) acts.push({ id: 'cast', label: '発動' });
    if (S.p.st.includes(null)) acts.push({ id: 'setst', label: 'セット' });
  } else {
    if (S.p.st.includes(null)) acts.push({ id: 'setst', label: 'セット' });
  }
  return acts;
}

/* ---------------------------------------------------------
 *  DIALOG / FEEDBACK
 * ------------------------------------------------------- */
let asking = false;
function ask(html, options, opts = {}){
  asking = true;
  S.modal = true;
  return new Promise(resolve => {
    const ov = $('#overlay'), dlg = $('#dialog');
    dlg.innerHTML = `${opts.plain ? `<p>${html}</p>` : `<div class="msg">${html}</div>`}
      <div class="acts${opts.list ? ' list' : ''}"></div>`;
    const box = dlg.querySelector('.acts');
    options.forEach(o => {
      const b = document.createElement('button');
      b.textContent = o.label;
      if (o.primary) b.classList.add('primary');
      if (o.ghost) b.classList.add('ghost');
      b.onclick = () => {
        asking = false; S.modal = false;
        ov.classList.add('hidden');
        resolve(o.value);
      };
      box.appendChild(b);
    });
    ov.classList.remove('hidden');
  });
}

function toast(msg){
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1700);
}

function showFloat(k, text, heal = false){
  const hud = document.getElementById(k === 'p' ? 'me-hud' : 'opp-hud');
  if (!hud) return;
  const r = hud.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'floatdmg' + (heal ? ' heal' : '');
  el.textContent = text;
  el.style.left = (r.left + r.width * 0.62) + 'px';
  el.style.top = (r.top + r.height / 2) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
  hud.classList.remove('hit');
  void hud.offsetWidth;
  hud.classList.add('hit');
}

function log(html, cls = ''){
  const box = $('#log');
  if (!box) return;
  const line = document.createElement('div');
  line.className = 'logline ' + cls;
  line.innerHTML = html;
  box.appendChild(line);
  while (box.children.length > 220) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
}

/* ---------------------------------------------------------
 *  SOUND
 * ------------------------------------------------------- */
let muted = false, actx = null;
const SFX_MAP = {
  draw: [520, .06, 'triangle'], summon: [300, .2, 'triangle'], set: [240, .06, 'triangle'],
  attack: [150, .12, 'sawtooth'], damage: [90, .2, 'sawtooth'], destroy: [70, .22, 'sawtooth'],
  heal: [620, .16, 'sine'], trap: [400, .14, 'square'], spell: [560, .14, 'triangle'],
  turn: [280, .12, 'triangle'], phase: [460, .07, 'triangle'],
};
function sfx(type){
  if (muted) return;
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const [f, dur, wave] = SFX_MAP[type] || [400, .08, 'triangle'];
    const t = actx.currentTime;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, f * 0.55), t + dur);
    g.gain.setValueAtTime(0.035, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination);
    o.start(t); o.stop(t + dur + 0.03);
  } catch (e) { /* audio is optional */ }
}

/* ---------------------------------------------------------
 *  CORE ACTIONS
 * ------------------------------------------------------- */
function removeFromHand(side, card){
  const i = side.hand.indexOf(card);
  if (i >= 0) side.hand.splice(i, 1);
}

async function draw(k, n = 1){
  const side = S[k];
  const ep = epoch;
  for (let i = 0; i < n; i++){
    if (!side.deck.length){
      log(`${sideName(k)} のデッキが尽きた！`, 'dmg');
      endGame(otherKey(k));
      return false;
    }
    const c = side.deck.pop();
    side.hand.push(c);
    log(`${sideName(k)} はカードを1枚ドロー`, k === 'p' ? 'me' : 'ai');
    sfx('draw');
    render();
    await sleep(220);
    if (ep !== epoch) return false;
  }
  return true;
}

async function summonMonster(k, card, idx, faceDown, tribs = []){
  const side = S[k];
  const ep = epoch;
  for (const t of tribs){
    const c = side.mon[t];
    if (!c) continue;
    side.mon[t] = null;
    side.grave.push(c);
    log(`${sideName(k)} は <b>${c.def.name}</b> をリリース`, k === 'p' ? 'me' : 'ai');
  }
  removeFromHand(side, card);
  const nc = { ...card, pos: faceDown ? 'set' : 'atk', setAt: S.turnNo, atkUsed: false, boost: 0, flipped: false };
  side.mon[idx] = nc;
  side.normalSummons++;
  log(`${sideName(k)} は <b>${nc.def.name}</b> を${faceDown ? 'セット' : '召喚'}した`, k === 'p' ? 'me' : 'ai');
  sfx(faceDown ? 'set' : 'summon');
  render();
  const el = $(`.zone[data-zone="${k}-mon-${idx}"] .card`);
  if (el) el.classList.add('summoned');
  await sleep(430);
  if (S.over || ep !== epoch) return;

  if (!faceDown && nc.def.summonEffect) await runSummonEffect(k, nc);
  if (S.over || ep !== epoch) return;
  if (!faceDown) await summonTrapWindow(k, idx, nc);
  render();
}

async function runSummonEffect(k, card){
  const e = card.def.summonEffect;
  if (e === 'draw1'){ log(`<b>${card.def.name}</b> の効果で1枚ドロー`); await draw(k, 1); }
  else if (e === 'heal500'){ heal(k, 500); }
  else if (e === 'burn500'){ damage(otherKey(k), 500); }
}

async function setSTCard(k, card, idx){
  const side = S[k];
  removeFromHand(side, card);
  side.st[idx] = { ...card, pos: 'set', setAt: S.turnNo };
  log(`${sideName(k)} はカードを1枚セットした`, k === 'p' ? 'me' : 'ai');
  sfx('set');
  render();
  await sleep(320);
}

async function castSpell(k, card, target){
  resetUI();
  S.busy = true;
  const side = S[k];
  const ep = epoch;
  removeFromHand(side, card);
  log(`${sideName(k)} は魔法「<b>${card.def.name}</b>」を発動！`, k === 'p' ? 'me' : 'ai');
  sfx('spell');
  render();
  await sleep(380);
  if (ep !== epoch) return;
  side.grave.push(card);
  await resolveSpell(card, side, target);
  if (ep !== epoch) return;
  if (k === 'p') S.busy = false;
  render();
}

async function resolveSpell(card, side, target){
  const k = side.key, ok = otherKey(k), opp = S[ok];
  switch (card.def.effect){
    case 'draw2':
      await draw(k, 2);
      break;
    case 'destroyMonster':
      if (target && target.card && S[target.sideKey].mon[target.idx] === target.card){
        await destroyMonster(target.sideKey, target.idx);
      }
      break;
    case 'buff':
      if (target && target.card && S[target.sideKey].mon[target.idx] === target.card){
        target.card.boost = (target.card.boost || 0) + 700;
        log(`<b>${target.card.def.name}</b> のATKが700アップ`, k === 'p' ? 'me' : 'ai');
        sfx('spell');
      }
      break;
    case 'heal':
      heal(k, 1200);
      break;
    case 'revive': {
      if (!target || !target.card) break;
      const gi = side.grave.indexOf(target.card);
      const zi = side.mon.indexOf(null);
      if (gi >= 0 && zi >= 0){
        side.grave.splice(gi, 1);
        const c = { ...target.card, pos: 'atk', setAt: S.turnNo, atkUsed: false, boost: 0, flipped: false };
        side.mon[zi] = c;
        log(`<b>${c.def.name}</b> を特殊召喚！`, k === 'p' ? 'me' : 'ai');
        sfx('summon');
      }
      break;
    }
    case 'destroyST':
      if (target && target.card && S[target.sideKey].st[target.idx] === target.card){
        const c = S[target.sideKey].st[target.idx];
        S[target.sideKey].st[target.idx] = null;
        S[target.sideKey].grave.push(c);
        log(`<b>${c.def.name}</b> を破壊`, 'gold');
        sfx('destroy');
      }
      break;
    case 'extraSummon':
      side.extraSummons++;
      log(`${sideName(k)} はこのターンもう1度召喚できる`, k === 'p' ? 'me' : 'ai');
      break;
  }
  render();
  await sleep(220);
}

async function destroyMonster(k, idx){
  const side = S[k];
  const c = side.mon[idx];
  if (!c) return;
  const el = $(`.zone[data-zone="${k}-mon-${idx}"] .card`);
  if (el){ el.classList.add('dying'); sfx('destroy'); await sleep(300); }
  if (side.mon[idx] !== c) return;
  side.mon[idx] = null;
  side.grave.push(c);
  log(`<b>${c.def.name}</b> は破壊された`, 'gold');
  render();
}

function damage(k, amount){
  if (amount <= 0 || S.over) return;
  const side = S[k];
  side.lp = Math.max(0, side.lp - amount);
  log(`${sideName(k)} に <b>${amount}</b> のダメージ`, 'dmg');
  sfx('damage');
  renderHUD();
  showFloat(k, '-' + amount);
  if (side.lp <= 0) endGame(otherKey(k));
}

function heal(k, amount){
  if (S.over) return;
  const side = S[k];
  side.lp += amount;
  log(`${sideName(k)} のLPが <b>${amount}</b> 回復`, 'heal');
  sfx('heal');
  renderHUD();
  showFloat(k, '+' + amount, true);
}

function endGame(winner, reason = ''){
  if (S.over) return;
  S.over = true;
  S.busy = true;
  S.modal = false;
  resetUI({ silent: true });
  log(`${sideName(winner)} の勝利！${reason ? '（' + reason + '）' : ''}`, 'gold');
  render();
  sfx(winner === 'p' ? 'heal' : 'damage');
  const ep = epoch;
  setTimeout(() => { if (ep === epoch) showResult(winner, reason); }, 550);
}

function showResult(winner, reason){
  const win = winner === 'p';
  const html = `<h2>${win ? 'VICTORY' : 'DEFEAT'}</h2>
    <div class="big">${win ? '勝利' : '敗北'}</div>
    <p>${win ? '冥界の王 カオスを打ち破った。' : 'カオスの策略に敗れた。'}${reason ? '<br><small>' + reason + '</small>' : ''}</p>`;
  ask(html, [{ label: 'もう一度デュエル', value: 1, primary: true }]).then(() => newDuel());
}

/* ---------------------------------------------------------
 *  TARGETING / UI FLOW
 * ------------------------------------------------------- */
function resetUI(opts = {}){
  ui.mode = 'idle'; ui.selected = null; ui.pending = null; ui.faceDown = false;
  ui.placeRow = null; ui.need = 0; ui.tributes = []; ui.targetSpec = null;
  ui.source = null; ui.attacker = null;
  if (!opts.silent) render();
}

function beginSummon(faceDown){
  const card = ui.selected;
  if (!card) return;
  const need = tributeCount(card.def.level);
  if (need > 0){
    ui.mode = 'tribute';
    ui.pending = card; ui.faceDown = faceDown; ui.need = need; ui.tributes = [];
    render();
    return;
  }
  ui.mode = 'place';
  ui.pending = card; ui.placeRow = 'mon'; ui.faceDown = faceDown;
  render();
}

function toggleTribute(i){
  const arr = ui.tributes;
  const at = arr.indexOf(i);
  if (at >= 0) arr.splice(at, 1);
  else if (arr.length < ui.need) arr.push(i);
  render();
}

async function beginCast(){
  const card = ui.selected;
  if (!card) return;
  const spec = targetSpecFor(card.def);
  if (!spec){ await castSpell('p', card, null); return; }
  if (spec.grave){
    S.busy = true;
    render();
    const t = await chooseGraveMonster('p');
    S.busy = false;
    if (!t){ render(); return; }
    await castSpell('p', card, { card: t });
    return;
  }
  ui.mode = 'target'; ui.pending = card; ui.source = { kind: 'hand' }; ui.targetSpec = spec;
  render();
}

async function chooseGraveMonster(k){
  const opts = S[k].grave.filter(c => c.def.kind === 'monster');
  if (!opts.length){ toast('墓地にモンスターがいません'); return null; }
  const pick = await ask('特殊召喚するモンスターを選択', opts.map(c => ({
    label: `${c.def.name}（ATK ${c.def.atk}）`, value: c.uid,
  })), { list: true });
  return opts.find(c => c.uid === pick) || null;
}

async function beginSetST(){
  const card = ui.selected;
  if (!card) return;
  if (!S.p.st.includes(null)){ toast('魔法・罠ゾーンが空いていません'); return; }
  ui.mode = 'place'; ui.pending = card; ui.placeRow = 'st'; ui.faceDown = true;
  render();
}

async function doPlace(i){
  const card = ui.pending, row = ui.placeRow, fd = ui.faceDown;
  const tribs = row === 'mon' ? [...ui.tributes] : [];
  if (!card) return;
  resetUI({ silent: true });
  S.busy = true;
  render();
  if (row === 'mon') await summonMonster('p', card, i, fd, tribs);
  else await setSTCard('p', card, i);
  S.busy = false;
  render();
}

function isTargetZone(k, row, card){
  const spec = ui.targetSpec;
  if (!spec || !card) return false;
  const tk = spec.enemy ? otherKey('p') : 'p';
  return k === tk && row === spec.row;
}

async function resolveTargetPick(k, row, i, card){
  const target = { sideKey: k, row, idx: i, card };
  const pending = ui.pending, source = ui.source;
  resetUI({ silent: true });
  if (!pending || !source) return;
  if (source.kind === 'hand') await castSpell('p', pending, target);
  else await activateSetCard(source.idx, target);
}

async function activateSetCard(idx, target){
  const card = S.p.st[idx];
  if (!card) return;
  resetUI({ silent: true });
  S.busy = true;
  S.p.st[idx] = null;
  S.p.grave.push(card);
  log(`あなたは「<b>${card.def.name}</b>」を発動！`, 'me');
  sfx(card.def.kind === 'trap' ? 'trap' : 'spell');
  render();
  await sleep(340);
  if (card.def.kind === 'trap') await resolveTrap(card, S.p, { type: 'manual', target });
  else await resolveSpell(card, S.p, target);
  S.busy = false;
  render();
}

async function tryActivateSet(idx){
  const card = S.p.st[idx];
  if (!card || card.pos !== 'set') return;
  if (card.setAt >= S.turnNo){ toast('セットしたターンは発動できません'); return; }
  if (card.def.kind === 'trap' && card.def.trigger){
    toast('このカードは相手の攻撃・召喚時にしか発動できません');
    return;
  }
  const yes = await ask(`「${card.def.name}」を発動しますか？<br><small>${card.def.text || ''}</small>`, [
    { label: '発動する', value: true, primary: true },
    { label: 'やめる', value: false, ghost: true },
  ]);
  if (!yes) return;
  const spec = targetSpecFor(card.def);
  if (spec && !hasValidTarget(spec)){ toast('有効な対象がありません'); return; }
  if (spec && spec.grave){
    S.busy = true; render();
    const t = await chooseGraveMonster('p');
    S.busy = false;
    if (!t){ render(); return; }
    await activateSetCard(idx, { card: t });
    return;
  }
  if (spec){
    ui.mode = 'target'; ui.pending = card; ui.source = { kind: 'set', idx }; ui.targetSpec = spec;
    render();
    return;
  }
  await activateSetCard(idx, null);
}

/* ---------------------------------------------------------
 *  BATTLE
 * ------------------------------------------------------- */
function zoneCardEl(k, row, i){
  return $(`.zone[data-zone="${k}-${row}-${i}"] .card`);
}

async function executeAttack(aIdx, tIdx){
  const atk = S.p.mon[aIdx];
  if (!atk) return;
  resetUI({ silent: true });
  S.busy = true;
  render();
  await performAttack('p', aIdx, tIdx);
  S.busy = false;
  render();
}

async function performAttack(k, aIdx, tIdx){
  if (S.over) return;
  const ep = epoch;
  const side = S[k], ok = otherKey(k), opp = S[ok];
  const attacker = side.mon[aIdx];
  if (!attacker || attacker.pos !== 'atk') return;
  attacker.atkUsed = true;

  const direct = tIdx === null || tIdx === undefined || !opp.mon[tIdx];
  log(`${sideName(k)} の <b>${attacker.def.name}</b> が${direct ? '直接攻撃！' : '攻撃！'}`, k === 'p' ? 'me' : 'ai');
  render();
  const el = zoneCardEl(k, 'mon', aIdx);
  if (el){ el.classList.add('strike'); sfx('attack'); }
  await sleep(380);
  if (S.over || ep !== epoch) return;

  const stopped = await trapWindow(ok, { type: 'attack', attackerKey: k, attackerIdx: aIdx, targetIdx: tIdx, attacker });
  if (stopped || S.over || ep !== epoch) return;

  const a2 = side.mon[aIdx];
  if (!a2) return;
  const t2 = direct ? null : opp.mon[tIdx];
  if (!direct && !t2) return;

  if (t2 && t2.pos === 'set'){
    t2.pos = 'def';
    t2.flipped = true;
    log(`セットモンスター <b>${t2.def.name}</b> を確認`, 'gold');
    render();
    await sleep(340);
    if (S.over || ep !== epoch) return;
  }

  const av = a2.def.atk + (a2.boost || 0);

  if (!t2){
    damage(ok, av);
  } else if (t2.pos === 'def'){
    const dv = t2.def.def;
    if (av > dv){
      await destroyMonster(ok, tIdx, { silent: true });
      if (a2.def.pierce && !S.over) damage(ok, av - dv);
    } else if (av < dv){
      await destroyMonster(k, aIdx, { silent: true });
      if (!S.over) damage(k, dv - av);
    } else {
      log('攻撃は防がれた');
    }
  } else {
    const tv = t2.def.atk + (t2.boost || 0);
    if (av > tv){
      await destroyMonster(ok, tIdx, { silent: true });
      if (!S.over) damage(ok, av - tv);
    } else if (av < tv){
      await destroyMonster(k, aIdx, { silent: true });
      if (!S.over) damage(k, tv - av);
    } else {
      log('<b>相打ち！</b>', 'gold');
      await destroyMonster(k, aIdx, { silent: true });
      await destroyMonster(ok, tIdx, { silent: true });
    }
  }
  render();
}

/* ---------------------------------------------------------
 *  TRAPS
 * ------------------------------------------------------- */
async function trapWindow(defKey, ev){
  const def = S[defKey];
  const traps = def.st
    .map((c, i) => ({ c, i }))
    .filter(x => x.c && x.c.pos === 'set' && x.c.def.kind === 'trap' && x.c.def.trigger === 'attack');

  for (const tr of traps){
    if (S.over) return true;
    if (S[defKey].st[tr.i] !== tr.c) continue;
    let want;
    if (defKey === 'p'){
      const att = ev.attacker || (S[ev.attackerKey] && S[ev.attackerKey].mon[ev.attackerIdx]);
      want = await ask(`${sideName(ev.attackerKey)}の <b>${att ? att.def.name : 'モンスター'}</b> の攻撃！<br>「${tr.c.def.name}」を発動しますか？<br><small>${tr.c.def.text || ''}</small>`, [
        { label: '発動する', value: true, primary: true },
        { label: '発動しない', value: false, ghost: true },
      ]);
    } else {
      want = aiWantsTrap(tr.c, ev);
    }
    if (!want) continue;
    const stop = await activateTrap(defKey, tr.i, ev);
    if (stop) return true;
  }
  return false;
}

function aiWantsTrap(card, ev){
  const a = ev.attacker;
  const av = a.def.atk + (a.boost || 0);
  if (card.def.effect === 'negateAttack') return av >= 1500 || ev.targetIdx === null;
  if (card.def.effect === 'destroyAttacker') return av >= 1200;
  return false;
}

async function activateTrap(k, idx, ev){
  const side = S[k];
  const card = side.st[idx];
  if (!card) return false;
  side.st[idx] = null;
  side.grave.push(card);
  log(`${sideName(k)} は罠「<b>${card.def.name}</b>」を発動！`, k === 'p' ? 'me' : 'ai');
  sfx('trap');
  render();
  await sleep(340);
  return await resolveTrap(card, side, ev);
}

async function resolveTrap(card, side, ev){
  const k = side.key, ok = otherKey(k), opp = S[ok];
  switch (card.def.effect){
    case 'negateAttack':
      log('攻撃を無効化した！', 'gold');
      return true;

    case 'destroyAttacker': {
      if (ev.type === 'attack'){
        const a = S[ev.attackerKey].mon[ev.attackerIdx];
        if (a){
          const av = a.def.atk + (a.boost || 0);
          log(`攻撃モンスターを破壊し、${av}のダメージ！`, 'gold');
          await destroyMonster(ev.attackerKey, ev.attackerIdx);
          if (!S.over) damage(ev.attackerKey, av);
        }
      }
      return true;
    }

    case 'hole': {
      if (ev.type === 'summon' && S[ev.sideKey].mon[ev.idx] === ev.card){
        log(`<b>${ev.card.def.name}</b> は穴に落ちた！`, 'gold');
        await destroyMonster(ev.sideKey, ev.idx);
      }
      return false;
    }

    case 'destroyST': {
      const t = ev.target;
      if (t && t.card && S[t.sideKey].st[t.idx] === t.card){
        const c = S[t.sideKey].st[t.idx];
        S[t.sideKey].st[t.idx] = null;
        S[t.sideKey].grave.push(c);
        log(`<b>${c.def.name}</b> を破壊`, 'gold');
        sfx('destroy');
        render();
      }
      return false;
    }

    case 'bounce': {
      const t = ev.target;
      if (t && t.card && S[t.sideKey].mon[t.idx] === t.card){
        const c = S[t.sideKey].mon[t.idx];
        S[t.sideKey].mon[t.idx] = null;
        S[t.sideKey].hand.push(c);
        log(`<b>${c.def.name}</b> は手札に戻った`, 'gold');
        render();
      }
      return ev.type === 'attack';
    }
  }
  return false;
}

async function summonTrapWindow(k, idx, card){
  if (card.def.atk < 1500) return;
  const ok = otherKey(k), opp = S[ok];
  const traps = opp.st
    .map((c, i) => ({ c, i }))
    .filter(x => x.c && x.c.pos === 'set' && x.c.def.effect === 'hole');
  for (const tr of traps){
    if (S.over) return;
    if (S[ok].st[tr.i] !== tr.c) continue;
    let want;
    if (ok === 'p'){
      want = await ask(`相手が <b>${card.def.name}</b>（ATK ${card.def.atk}）を召喚！<br>「${tr.c.def.name}」を発動しますか？`, [
        { label: '発動する', value: true, primary: true },
        { label: '発動しない', value: false, ghost: true },
      ]);
    } else {
      want = card.def.atk >= 1800;
    }
    if (!want) continue;
    await activateTrap(ok, tr.i, { type: 'summon', sideKey: k, idx, card });
    if (S[k].mon[idx] !== card) break;
  }
}

/* ---------------------------------------------------------
 *  ATTACK TRAP (attack declaration hook is inside performAttack)
 * ------------------------------------------------------- */

/* ---------------------------------------------------------
 *  TURN FLOW
 * ------------------------------------------------------- */
async function startTurn(k){
  if (S.over) return;
  const ep = epoch;
  S.owner = k;
  S.turnNo++;
  const side = S[k];
  side.normalSummons = 0;
  side.extraSummons = 0;
  side.flipUsed = 0;
  side.mon.forEach(c => { if (c) c.atkUsed = false; });
  S.phase = 'DP';
  S.busy = true;
  resetUI({ silent: true });
  log(`── ${sideName(k)}のターン（TURN ${S.turnNo}）──`, 'sys');
  render();
  sfx('turn');
  await sleep(480);
  if (ep !== epoch || S.over) return;

  S.phase = 'SP';
  render();
  await sleep(220);
  if (ep !== epoch || S.over) return;

  const ok = await draw(k, 1);
  if (!ok || ep !== epoch) return;

  S.phase = 'M1';
  S.busy = (k === 'o');
  render();
  if (k === 'o') aiTurn();
}

async function endTurn(){
  if (S.over) return;
  const ep = epoch;
  S.busy = true;
  S.phase = 'EP';
  const k = S.owner;
  resetUI({ silent: true });
  S[k].mon.forEach(c => { if (c) c.boost = 0; });
  log(`${sideName(k)}のターン終了`, 'sys');
  render();
  await sleep(520);
  if (S.over || ep !== epoch) return;
  await startTurn(otherKey(k));
}

/* ---------------------------------------------------------
 *  OPPONENT AI
 * ------------------------------------------------------- */
async function aiTurn(){
  if (S.over) return;
  const ep = epoch;
  const alive = () => ep === epoch && !S.over;
  S.busy = true;
  render();
  await sleep(650);
  if (!alive()) return;

  /* 1. simple setup spells */
  for (const card of [...S.o.hand]){
    if (!alive()) return;
    if (card.def.kind !== 'spell') continue;
    const e = card.def.effect;
    if (e === 'draw2' || e === 'extraSummon' || (e === 'heal' && S.o.lp <= 7000)){
      await castSpell('o', card, null);
      await sleep(380);
      if (!alive()) return;
    }
  }
  if (!alive()) return;

  /* 2. summon (twice with extra summon) */
  let guard = 0;
  while (guard++ < 2){
    const did = await aiSummon();
    if (!alive()) return;
    if (!did) break;
    await sleep(450);
    if (!alive()) return;
  }
  if (!alive()) return;

  /* 3. offensive / utility spells */
  await aiSpells();
  if (!alive()) return;

  /* 4. set traps, then use previously set utility traps */
  await aiSetTraps();
  if (!alive()) return;
  await aiUseSetTraps();
  if (!alive()) return;

  /* 5. battle */
  await sleep(350);
  if (!alive()) return;
  await aiBattle();
  if (!alive()) return;

  S.busy = false;
  render();
  await sleep(450);
  if (!alive()) return;
  await endTurn();
}

async function aiSummon(){
  const side = S.o;
  if (!side.deck) return false;
  if (side.normalSummons >= 1 + side.extraSummons) return false;

  const monsters = side.hand.filter(c => c.def.kind === 'monster');
  let best = null;
  for (const m of monsters){
    const need = tributeCount(m.def.level);
    const onField = side.mon.filter(Boolean).length;
    if (need > 0 && onField < need) continue;
    if (need === 0 && onField >= 3) continue;
    let score = m.def.atk + m.def.def * 0.35 + m.def.level * 15;
    if (m.def.summonEffect) score += 120;
    if (!best || score > best.score) best = { card: m, need, score };
  }
  if (!best) return false;

  let tribs = [];
  if (best.need > 0){
    const own = side.mon.map((c, i) => c ? { c, i } : null).filter(Boolean).sort((a, b) => a.c.def.atk - b.c.def.atk);
    if (own.length < best.need) return false;
    tribs = own.slice(0, best.need).map(x => x.i);
    if (best.need === 1 && best.card.def.atk < own[0].c.def.atk + 300) return false;
  }

  const avail = [0, 1, 2].filter(i => !side.mon[i] || tribs.includes(i));
  if (!avail.length) return false;
  const zone = avail[rnd(avail.length)];
  const faceDown = best.card.def.atk < 1200 && best.card.def.def > best.card.def.atk;
  await summonMonster('o', best.card, zone, faceDown, tribs);
  return true;
}

async function aiSpells(){
  const side = S.o;
  for (const card of [...side.hand]){
    if (S.over) return;
    if (card.def.kind !== 'spell') continue;
    const e = card.def.effect;
    if (e === 'destroyMonster'){
      const idx = bestEnemyMonsterIdx();
      if (idx >= 0 && S.p.mon[idx]){
        await castSpell('o', card, { sideKey: 'p', row: 'mon', idx, card: S.p.mon[idx] });
        await sleep(300);
      }
    } else if (e === 'buff'){
      const idx = side.mon.findIndex(c => c && c.pos !== 'set');
      if (idx >= 0){
        await castSpell('o', card, { sideKey: 'o', row: 'mon', idx, card: side.mon[idx] });
        await sleep(300);
      }
    } else if (e === 'revive'){
      const gi = side.grave.findIndex(c => c.def.kind === 'monster');
      const zi = side.mon.indexOf(null);
      if (gi >= 0 && zi >= 0){
        await castSpell('o', card, { card: side.grave[gi] });
        await sleep(300);
      }
    } else if (e === 'destroyST'){
      const idx = S.p.st.findIndex(Boolean);
      if (idx >= 0){
        await castSpell('o', card, { sideKey: 'p', row: 'st', idx, card: S.p.st[idx] });
        await sleep(300);
      }
    }
  }
}

function bestEnemyMonsterIdx(){
  let best = -1, score = -1;
  S.p.mon.forEach((c, i) => {
    if (!c) return;
    const v = c.pos === 'set' ? 1200 : (c.pos === 'def' ? c.def.def : c.def.atk + (c.boost || 0));
    if (v > score){ score = v; best = i; }
  });
  return best;
}

async function aiSetTraps(){
  const side = S.o;
  let placed = 0;
  for (const card of [...side.hand]){
    if (S.over || placed >= 2) return;
    if (card.def.kind !== 'trap') continue;
    const idx = side.st.indexOf(null);
    if (idx < 0) return;
    if (Math.random() < 0.12) continue;
    await setSTCard('o', card, idx);
    placed++;
    await sleep(320);
  }
}

async function aiUseSetTraps(){
  const side = S.o;
  for (let i = 0; i < 3; i++){
    if (S.over) return;
    const c = side.st[i];
    if (!c || c.pos !== 'set' || c.setAt >= S.turnNo) continue;
    if (c.def.effect === 'destroyST'){
      const t = S.p.st.findIndex(Boolean);
      if (t >= 0){
        await activateTrap('o', i, { type: 'manual', target: { sideKey: 'p', row: 'st', idx: t, card: S.p.st[t] } });
        await sleep(320);
      }
    } else if (c.def.effect === 'bounce'){
      const t = bestEnemyMonsterIdx();
      if (t >= 0){
        await activateTrap('o', i, { type: 'manual', target: { sideKey: 'p', row: 'mon', idx: t, card: S.p.mon[t] } });
        await sleep(320);
      }
    }
  }
}

async function aiBattle(){
  const side = S.o;
  // Flip Summon a set wall when the way is open.
  if (!S.p.mon.some(Boolean)){
    const si = side.mon.findIndex(c => c && c.pos === 'set');
    if (si >= 0 && side.mon[si].def.atk >= 1000){
      side.mon[si].pos = 'atk';
      side.mon[si].flipped = true;
      side.flipUsed = 1;
      log(`<b>${side.mon[si].def.name}</b> を反転召喚！`, 'ai');
      sfx('summon');
      render();
      await sleep(360);
      if (S.over) return;
    }
  }
  for (let i = 0; i < 3; i++){
    if (S.over) return;
    const m = side.mon[i];
    if (!m || m.pos !== 'atk' || m.atkUsed) continue;

    const av = m.def.atk + (m.boost || 0);
    const targets = [];
    S.p.mon.forEach((c, j) => {
      if (!c) return;
      const v = c.pos === 'set' ? 1400 : (c.pos === 'def' ? c.def.def : c.def.atk + (c.boost || 0));
      targets.push({ j, v });
    });

    let tIdx = null;
    if (targets.length){
      const killable = targets.filter(t => av > t.v).sort((a, b) => b.v - a.v);
      if (killable.length) tIdx = killable[0].j;
      else if (av >= 2200 && Math.random() < 0.4) tIdx = targets.sort((a, b) => a.v - b.v)[0].j;
      else continue;
    }
    await performAttack('o', i, tIdx);
    await sleep(620);
  }
}

/* ---------------------------------------------------------
 *  PLAYER ENTRY POINTS
 * ------------------------------------------------------- */
function onHandClick(uid){
  if (S.busy || S.over || S.modal || S.owner !== 'p') return;
  if (S.phase !== 'M1'){ toast('メインフェイズでのみカードを使用できます'); return; }
  const card = S.p.hand.find(c => c.uid === uid);
  if (!card) return;
  if (ui.mode !== 'idle') resetUI({ silent: true });
  if (ui.selected === card){ ui.selected = null; render(); return; }
  ui.selected = card;
  ui.mode = 'idle';
  render();
}

async function onZoneClick(k, row, i){
  if (S.busy || S.over || S.modal) return;
  const card = S[k][row][i];

  if (ui.mode === 'place'){
    const usable = k === 'p' && row === ui.placeRow && (!card || (row === 'mon' && ui.tributes.includes(i)));
    if (usable) await doPlace(i);
    return;
  }
  if (ui.mode === 'tribute'){
    if (k === 'p' && row === 'mon' && card) toggleTribute(i);
    return;
  }
  if (ui.mode === 'target'){
    if (isTargetZone(k, row, card)) await resolveTargetPick(k, row, i, card);
    return;
  }
  if (ui.mode === 'attack'){
    if (k === 'o' && row === 'mon' && card) await executeAttack(ui.attacker, i);
    return;
  }

  if (S.owner !== 'p') return;
  if (k === 'p' && row === 'mon' && card && card.pos === 'atk' && S.phase === 'BP' && !card.atkUsed){
    ui.mode = 'attack'; ui.attacker = i; render();
    return;
  }
  if (k === 'p' && row === 'mon' && card && card.pos === 'set' && S.phase === 'M1'){
    if ((S.p.flipUsed || 0) >= 1){ toast('反転召喚は1ターンに1回まで'); return; }
    card.pos = 'atk';
    card.flipped = true;
    S.p.flipUsed = 1;
    log(`<b>${card.def.name}</b> を反転召喚！`, 'me');
    sfx('summon');
    render();
    return;
  }
  if (k === 'p' && row === 'st' && card && card.pos === 'set' && S.phase === 'M1'){
    await tryActivateSet(i);
  }
}

function actionBarClick(e){
  const btn = e.target.closest('[data-act]');
  if (!btn || S.busy || S.over || S.modal) return;
  const act = btn.dataset.act;
  if (act === 'cancel'){ resetUI(); return; }
  if (act === 'summon') beginSummon(false);
  else if (act === 'setmon') beginSummon(true);
  else if (act === 'cast') beginCast();
  else if (act === 'setst') beginSetST();
  else if (act === 'confirmTribute'){
    if (ui.tributes.length !== ui.need) return;
    ui.mode = 'place';
    ui.placeRow = 'mon';
    render();
  }
}

/* ---------------------------------------------------------
 *  BOOT / WIRING
 * ------------------------------------------------------- */
function buildDeck(){
  const out = [];
  for (const [id, n] of DECKLIST){
    for (let i = 0; i < n; i++) out.push(mk(id));
  }
  return out;
}

function newDuel(){
  epoch++;
  uidc = 0;
  S.turnNo = 0; S.owner = 'p'; S.phase = 'DP';
  S.busy = true; S.over = false; S.modal = false;
  asking = false;
  S.p = newSide('p');
  S.o = newSide('o');
  S.p.deck = shuffle(buildDeck());
  S.o.deck = shuffle(buildDeck());
  for (let i = 0; i < 5; i++){
    S.p.hand.push(S.p.deck.pop());
    S.o.hand.push(S.o.deck.pop());
  }
  $('#log').innerHTML = '';
  $('#overlay').classList.add('hidden');
  resetUI({ silent: true });
  log('デュエル開始！', 'sys');
  log('あなた vs 冥界の王 カオス', 'sys');
  log('手札をクリックしてカードを選択。「バトルフェイズ」で攻撃できます。', 'sys');
  render();
  startTurn('p');
}

function showHelp(){
  ask(`
    <h2>デュエルのルール</h2>
    <div class="rules">
      <h3>勝利条件</h3>
      <ul>
        <li>相手のLPを0にする</li>
        <li>相手のデッキを0にしてドローさせる</li>
      </ul>
      <h3>ターンの流れ</h3>
      <ul>
        <li>ドロー → メイン → バトル → エンド</li>
        <li>メインでカードの召喚・発動・セットができる</li>
      </ul>
      <h3>召喚</h3>
      <ul>
        <li>1ターンに1体まで通常召喚できる</li>
        <li>レベル5・6は1体、レベル7以上は2体のリリース（生贄）が必要</li>
        <li>守備セットすると裏向きになり、攻撃された時に表になる</li>
        <li>裏向きのモンスターはメインでクリックすると反転召喚できる（1ターンに1回）</li>
      </ul>
      <h3>バトル</h3>
      <ul>
        <li>攻撃表示のモンスターで相手モンスターかLPを攻撃</li>
        <li>攻撃力が高い方が相手を破壊し、差額がダメージになる</li>
        <li>守備表示への攻撃はDEFと比較。攻撃力がDEFを下回ると自分がダメージ</li>
        <li>相手モンスターがいなければ直接攻撃</li>
      </ul>
      <h3>魔法・罠</h3>
      <ul>
        <li>魔法は手札からすぐ発動、またはセットできる</li>
        <li>罠はセットしてから発動。攻撃・召喚時に自動で発動を促される</li>
        <li>セットしたカードは次の自分のターンから発動できる</li>
        <li>裏向きモンスターはクリックで反転召喚、セットカードはクリックで発動</li>
      </ul>
    </div>`, [{ label: '閉じる', value: 1, primary: true }]);
}

function wire(){
  $('#arena').addEventListener('click', e => {
    if (S.busy || S.over || S.modal) return;
    const hand = e.target.closest('[data-hand]');
    if (hand){ onHandClick(hand.dataset.hand); return; }
    const zone = e.target.closest('[data-zone]');
    if (zone){
      const [k, row, i] = zone.dataset.zone.split('-');
      onZoneClick(k, row, Number(i));
    }
  });

  $('#opp-hud').addEventListener('click', () => {
    if (S.busy || S.over || S.modal) return;
    if (ui.mode !== 'attack' || ui.attacker === null) return;
    if (S.o.mon.some(Boolean)) return;
    executeAttack(ui.attacker, null);
  });

  $('#actionbar').addEventListener('click', actionBarClick);

  $('#btnBattle').addEventListener('click', () => {
    if (S.owner !== 'p' || S.busy || S.over || S.phase !== 'M1' || S.modal) return;
    S.phase = 'BP';
    resetUI({ silent: true });
    log('バトルフェイズ', 'sys');
    sfx('phase');
    render();
  });

  $('#btnEnd').addEventListener('click', () => {
    if (S.owner !== 'p' || S.busy || S.over || S.modal) return;
    endTurn();
  });

  $('#btnRestart').addEventListener('click', async () => {
    if (S.modal) return;
    const yes = await ask('デュエルを最初からやり直しますか？', [
      { label: 'やり直す', value: true, primary: true },
      { label: 'キャンセル', value: false, ghost: true },
    ]);
    if (yes) newDuel();
  });

  $('#btnHelp').addEventListener('click', () => { if (!S.modal) showHelp(); });

  $('#btnSound').addEventListener('click', () => {
    muted = !muted;
    $('#btnSound').textContent = muted ? '×' : '♪';
    if (!muted) sfx('phase');
  });

  $('#btnLogToggle').addEventListener('click', () => {
    const open = $('#logpanel').classList.toggle('open');
    $('#btnLogToggle').classList.toggle('hidden', open);
  });
  $('#btnLogClose').addEventListener('click', () => {
    $('#logpanel').classList.remove('open');
    $('#btnLogToggle').classList.remove('hidden');
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !S.modal && ui.mode !== 'idle') resetUI();
    if (e.key === ' ' && S.owner === 'p' && !S.busy && S.phase === 'M1' && !S.modal){
      e.preventDefault();
      $('#btnBattle').click();
    }
  });
}

wire();
newDuel();
