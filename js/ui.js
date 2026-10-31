'use strict';

/* ============================================================
   Interaction, overlays and boot
   ============================================================ */

function canAct() {
  return !!S && !S.over && !S.busy && S.active === 'you';
}

function selectedHandCard() {
  if (!S || !S.selected) return null;
  return S.you.hand.find(c => c.uid === S.selected) || null;
}

function summonReady(card) {
  if (!card || card.kind !== 'monster') return { ok: false };
  if (S.you.normalSummoned) return { ok: false, why: 'このターンは既に召喚している' };
  if (!S.you.monsters.some(z => !z)) return { ok: false, why: 'モンスターゾーンが埋まっている' };
  const need = card.tribute || 0;
  if (S.you.monsters.filter(Boolean).length < need) return { ok: false, why: `生贄が${need}体必要` };
  return { ok: true };
}

function spellUsable(card) {
  if (!card || card.kind !== 'spell') return { ok: false };
  const you = S.you, foe = S.foe;
  switch (card.id) {
    case 'pot': return { ok: you.deck.length > 0 };
    case 'hole': return { ok: you.monsters.some(Boolean) || foe.monsters.some(Boolean) };
    case 'bolt': return { ok: foe.monsters.some(Boolean) };
    case 'storm': return { ok: you.spells.some(Boolean) || foe.spells.some(Boolean) };
    case 'cyclon': return { ok: foe.spells.some(Boolean) };
    case 'reborn': return { ok: !!findBestGraveMonster(you).card && you.monsters.some(z => !z) };
    case 'axe': return { ok: you.monsters.some(z => z && !z.set) };
  }
  return { ok: true };
}

function updateActions() {
  const bar = $('#action-bar');
  if (!bar) return;
  let html = '';
  if (S && !S.over && !S.busy && S.active === 'you') {
    if (S.pendingSummon) {
      const p = S.pendingSummon;
      const ready = S.tributes.length === p.need;
      html = `<span class="ab-title">生贄 ${S.tributes.length}/${p.need}</span>
        <button data-act="confirm" class="primary" ${ready ? '' : 'disabled'}>${p.mode === 'attack' ? '召喚' : 'セット'}</button>
        <button data-act="cancel">キャンセル</button>`;
    } else if (S.attacker !== null) {
      html = `<span class="ab-title">攻撃宣言</span>`;
      if (!S.foe.monsters.some(Boolean)) html += `<button data-act="direct" class="primary">ダイレクトアタック</button>`;
      html += `<button data-act="cancel">キャンセル</button>`;
    } else if (S.selected) {
      const card = selectedHandCard();
      if (card) {
        if (card.kind === 'monster') {
          const r = summonReady(card);
          const need = card.tribute || 0;
          html = `<span class="ab-title">${card.name}</span>
            <button data-act="summon" class="primary" ${r.ok ? '' : 'disabled'}>${need ? `召喚 (生贄${need})` : '召喚'}</button>
            <button data-act="setmon" ${r.ok ? '' : 'disabled'}>裏側守備</button>
            <button data-act="cancel">キャンセル</button>`;
        } else if (card.kind === 'spell') {
          const r = spellUsable(card);
          html = `<span class="ab-title">${card.name}</span>
            <button data-act="cast" class="primary" ${r.ok ? '' : 'disabled'}>発動</button>
            <button data-act="cancel">キャンセル</button>`;
        } else {
          const free = S.you.spells.some(z => !z);
          html = `<span class="ab-title">${card.name}</span>
            <button data-act="settrap" class="primary" ${free ? '' : 'disabled'}>セット</button>
            <button data-act="cancel">キャンセル</button>`;
        }
      }
    }
  }
  if (html) { bar.innerHTML = html; bar.classList.add('show'); }
  else { bar.classList.remove('show'); bar.innerHTML = ''; }
}

function selectHand(uid) {
  if (!canAct() || S.pendingSummon) return;
  if (S.selected === uid) { S.selected = null; }
  else { S.selected = uid; S.attacker = null; Sfx.click(); }
  render();
}

function clearSelection() {
  S.selected = null; S.attacker = null; S.pendingSummon = null; S.tributes = [];
  render();
}

function toggleTribute(idx) {
  const p = S.pendingSummon;
  if (!p || !S.you.monsters[idx]) return;
  const at = S.tributes.indexOf(idx);
  if (at >= 0) S.tributes.splice(at, 1);
  else if (S.tributes.length < p.need) S.tributes.push(idx);
  Sfx.click();
  render();
}

async function runAction(fn) {
  if (!canAct()) return;
  S.busy = true;
  S.selected = null;
  render();
  try { await fn(); } catch (err) { console.error(err); }
  S.busy = false;
  S.pendingSummon = null; S.tributes = []; S.attacker = null; S.selected = null;
  render();
  checkEnd();
}

function beginSummon(mode) {
  const card = selectedHandCard();
  if (!card || !canAct()) return;
  const r = summonReady(card);
  if (!r.ok) return;
  const need = card.tribute || 0;
  if (need === 0) {
    runAction(async () => { await summonCard('you', card, mode, []); });
  } else {
    S.pendingSummon = { uid: card.uid, need, mode };
    S.tributes = [];
    S.selected = null;
    Sfx.click();
    render();
  }
}

function confirmTribute() {
  const p = S.pendingSummon;
  if (!p || S.tributes.length !== p.need || !canAct()) return;
  const card = S.you.hand.find(c => c.uid === p.uid);
  if (!card) return;
  const tributes = [...S.tributes], mode = p.mode;
  runAction(async () => { await summonCard('you', card, mode, tributes); });
}

function castSelected() {
  const card = selectedHandCard();
  if (!card || !canAct() || !spellUsable(card).ok) return;
  runAction(async () => { await activateSpell('you', card); });
}

function setSelectedTrap() {
  const card = selectedHandCard();
  if (!card || !canAct() || !S.you.spells.some(z => !z)) return;
  runAction(async () => { setTrapCard('you', card); });
}

function armAttacker(idx) {
  if (!canAct()) return;
  if (S.turn === 1) { log('先攻1ターン目は攻撃できない', 'you'); return; }
  const z = S.you.monsters[idx];
  if (!z || z.set || z.pos !== 'attack' || z.attacked) return;
  S.attacker = idx; S.selected = null; S.pendingSummon = null; S.tributes = [];
  Sfx.click();
  render();
}

async function playerAttack(targetType, defIdx) {
  if (S.attacker === null || !canAct()) return;
  const idx = S.attacker;
  S.busy = true;
  S.attacker = null;
  render();
  await resolveAttack('you', 'foe', idx, targetType, defIdx);
  S.busy = false;
  render();
  checkEnd();
}

function onZoneClick(el) {
  if (!S || S.over) return;
  const side = el.dataset.side, kind = el.dataset.kind, idx = parseInt(el.dataset.idx, 10);
  if (side === 'you' && kind === 'monster' && S.pendingSummon) { toggleTribute(idx); return; }
  if (side === 'foe' && S.attacker !== null) {
    if (kind === 'monster') {
      if (S.foe.monsters[idx]) playerAttack('monster', idx);
      else if (!S.foe.monsters.some(Boolean)) playerAttack('direct');
    }
    return;
  }
  if (side === 'you' && kind === 'monster' && S.attacker === null && canAct()) {
    const z = S.you.monsters[idx];
    if (z) armAttacker(idx);
  }
}

function act(name) {
  switch (name) {
    case 'summon': beginSummon('attack'); break;
    case 'setmon': beginSummon('defense'); break;
    case 'confirm': confirmTribute(); break;
    case 'cast': castSelected(); break;
    case 'settrap': setSelectedTrap(); break;
    case 'direct': playerAttack('direct'); break;
    case 'cancel': clearSelection(); break;
  }
}

/* ---------------- tooltip ---------------- */
function showTooltip(card, x, y) {
  const tt = $('#tooltip');
  if (!tt || window.innerWidth < 620) return;
  const kind = card.kind === 'monster'
    ? `${card.attr}属性 · ${card.race} · ★${card.level}`
    : card.kind === 'spell' ? `魔法カード · ${card.type}` : '罠カード · NORMAL';
  const stats = card.kind === 'monster'
    ? `<div class="tt-stats"><span class="a">ATK ${card.atk}</span><span class="d">DEF ${card.def}</span></div>` : '';
  tt.innerHTML = `<div class="tt-name">${card.name}</div>
    <div class="tt-kind">${kind}<br>${card.en || ''}</div>
    ${stats}<div class="tt-text">${card.text}</div>`;
  tt.style.left = clamp(x + 18, 8, window.innerWidth - 266) + 'px';
  tt.style.top = clamp(y + 18, 8, window.innerHeight - 190) + 'px';
  tt.classList.add('show');
}

/* ---------------- duel lifecycle ---------------- */
function checkEnd() {
  if (!S || S.over) return;
  if (S.foe.lp <= 0) finishDuel('you');
  else if (S.you.lp <= 0) finishDuel('foe');
}

function finishDuel(winner) {
  if (!S || S.over) return;
  S.over = true;
  S.busy = true;
  S.attacker = null; S.selected = null; S.pendingSummon = null; S.tributes = [];
  render();
  if (winner === 'you') Sfx.win(); else Sfx.lose();
  setTimeout(() => showResult(winner), 850);
}

function startDuel() {
  Sfx.init();
  hideTooltip();
  S = freshState();
  document.body.classList.remove('title-mode');
  $('#overlay').hidden = true;
  $('#overlay').innerHTML = '';
  render();
  log('デュエル開始！', 'you');
  startTurn('you', true);
}

function showTitle() {
  const overlay = $('#overlay');
  if (!overlay) return;
  document.body.classList.add('title-mode');
  overlay.hidden = false;
  overlay.innerHTML = `<div class="overlay-inner">
    <div class="eyebrow">KING OF GAMES · DUEL ARENA</div>
    <h1 class="logo"><span class="logo-jp">遊戯王</span></h1>
    <div class="logo-en">DUEL ARENA</div>
    <div class="logo-rule"><span>☥</span></div>
    <p class="tagline">闇のゲーム、開幕。</p>
    <button class="start-btn" id="btn-start" aria-label="Start"><span>DUEL START</span></button>
    <div class="title-foot">30 CARDS · 8000 LP · 1 VS 1</div>
  </div>`;
  const startBtn = $('#btn-start');
  startBtn.disabled = true;
  setTimeout(() => { startBtn.disabled = false; }, 150);
  startBtn.addEventListener('click', startDuel);
}

function showHelp() {
  if (!S || S.over || S.busy || S.active !== 'you') return;
  const overlay = $('#overlay');
  overlay.hidden = false;
  overlay.innerHTML = `<div class="panel">
    <button class="close-x" id="help-close" aria-label="閉じる">✕</button>
    <h2>遊び方</h2>
    <p>8000 LPを削り合う1対1のデュエル。相手のLPを0にすれば勝利、デッキが尽きても敗北となる。</p>
    <h3>ターンの流れ</h3>
    <ul>
      <li>ドロー → メインフェイズ → バトルフェイズ → ターン終了。</li>
      <li>モンスターの召喚・セットは1ターンに1回。レベル5・6は生贄1体、レベル7以上は生贄2体が必要。</li>
      <li>魔法カードは手札から発動。罠カードはセットし、次のターン以降に自動で発動する。</li>
    </ul>
    <h3>バトル</h3>
    <ul>
      <li>自分の攻撃表示モンスターをクリックして攻撃対象を選択。</li>
      <li>攻撃表示同士なら攻撃力の差が相手LPにダメージ。守備表示を破壊してもLPダメージは発生しない。</li>
      <li>相手モンスターがいない場合はダイレクトアタックが可能。</li>
    </ul>
    <h3>操作</h3>
    <ul>
      <li>手札をタップ → 召喚 / セット / 発動を選択。</li>
      <li>カードにカーソルを合わせると詳細を表示。</li>
      <li>Escで選択解除、右下の「ターン終了」で相手にターンを渡す。</li>
    </ul>
    <div class="actions"><button class="start-btn" id="help-close2" aria-label="Close"><span>閉じる</span></button></div>
  </div>`;
  const close = () => { overlay.hidden = true; overlay.innerHTML = ''; };
  $('#help-close').addEventListener('click', close);
  $('#help-close2').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); }, { once: true });
}

function showResult(winner) {
  const win = winner === 'you';
  const overlay = $('#overlay');
  overlay.hidden = false;
  const dmg = S.stats.damage;
  overlay.innerHTML = `<div class="overlay-inner">
    <div class="result-kicker">DUEL COMPLETE</div>
    <h1 class="result-title ${win ? '' : 'lose'}">${win ? 'VICTORY' : 'DEFEAT'}</h1>
    <p class="result-sub">${win ? '闘いの果てに、勝利を掴んだ。' : '闇のゲームに敗北した…'}</p>
    <div class="result-stats">
      <div><b>${S.turn}</b><span>TURNS</span></div>
      <div><b>${dmg}</b><span>DAMAGE</span></div>
      <div><b>${S.you.lp}</b><span>LP LEFT</span></div>
    </div>
    <div class="result-buttons">
      <button class="start-btn" id="btn-again" aria-label="Start"><span>DUEL AGAIN</span></button>
      <button class="start-btn ghost" id="btn-title">TITLE</button>
    </div>
  </div>`;
  $('#btn-again').addEventListener('click', startDuel);
  $('#btn-title').addEventListener('click', showTitle);
}

/* ---------------- bindings and boot ---------------- */
function bindEvents() {
  $('#you-hand').addEventListener('click', e => {
    const el = e.target.closest('.card[data-uid]');
    if (el) selectHand(el.dataset.uid);
  });

  $('#arena').addEventListener('click', e => {
    const direct = e.target.closest('[data-direct]');
    if (direct) { playerAttack('direct'); return; }
    const zone = e.target.closest('.zone');
    if (zone) onZoneClick(zone);
  });

  $('#action-bar').addEventListener('click', e => {
    const b = e.target.closest('button[data-act]');
    if (b && !b.disabled) act(b.dataset.act);
  });

  $('#btn-end').addEventListener('click', endTurn);
  $('#btn-help').addEventListener('click', showHelp);
  $('#btn-sound').addEventListener('click', () => {
    Sfx.init();
    Sfx.on = !Sfx.on;
    updateControls();
    if (Sfx.on) Sfx.click();
  });

  document.addEventListener('pointerover', e => {
    const el = e.target.closest('.card[data-uid]');
    if (!el) return;
    const found = findCard(el.dataset.uid);
    if (found) {
      const pos = found.where === 'monster' && found.zone
        ? `<div class="tt-pos">${found.zone.set ? '裏側守備' : found.zone.pos === 'defense' ? '守備表示' : '攻撃表示'}</div>` : '';
      showTooltip(found.card, e.clientX, e.clientY);
      if (pos) $('#tooltip').insertAdjacentHTML('beforeend', pos);
    }
  });
  document.addEventListener('pointerout', e => {
    if (e.target.closest && e.target.closest('.card[data-uid]')) hideTooltip();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && S && !S.over && !S.busy) clearSelection();
  });
  window.addEventListener('resize', () => {
    if (S) renderHands();
    hideTooltip();
  });
}

function boot() {
  FX.init();
  S = freshState();
  bindEvents();
  render();
  showTitle();
}

boot();
