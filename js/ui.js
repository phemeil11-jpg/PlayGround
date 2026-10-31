// UI・演出・サウンド

import {
  activateSetSpell, activateSpell, addLog, beginTurn, changePosition, createGame, destroyMonster,
  endTurn, monsterIndex, performAttack, setSpellCard, summonMonster, tributeNeeded
} from './engine.js'
import { cardArt } from './art.js'
import { runAiTurn, chooseAiTrap } from './ai.js'

const $ = sel => document.querySelector(sel)
const sleep = ms => new Promise(r => setTimeout(r, ms))

const ATTR_TEXT = { LIGHT: '光', DARK: '闇', FIRE: '炎', WATER: '水', WIND: '風', EARTH: '地' }

let g = null
let busy = false
let selectedAttacker = null
let pending = null
let finished = false
let cardIndex = new Map()
let justSummoned = null
let previewEl = null

// ───────────────────────── サウンド ─────────────────────────
const Sfx = (() => {
  let ctx = null
  let muted = false
  const ensure = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  }
  function tone({ freq = 440, dur = 0.15, type = 'sine', vol = 0.12, slide = 0, delay = 0 }) {
    if (muted) return
    const c = ensure()
    if (!c) return
    const t0 = c.currentTime + delay
    const o = c.createOscillator()
    const gain = c.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t0)
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur)
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    o.connect(gain).connect(c.destination)
    o.start(t0)
    o.stop(t0 + dur + 0.03)
  }
  function noise({ dur = 0.2, vol = 0.1, delay = 0, cutoff = 1200 }) {
    if (muted) return
    const c = ensure()
    if (!c) return
    const t0 = c.currentTime + delay
    const len = Math.max(1, Math.floor(c.sampleRate * dur))
    const buf = c.createBuffer(1, len, c.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = c.createBufferSource()
    src.buffer = buf
    const filter = c.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = cutoff
    const gain = c.createGain()
    gain.gain.setValueAtTime(vol, t0)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    src.connect(filter).connect(gain).connect(c.destination)
    src.start(t0)
  }
  return {
    click: () => tone({ freq: 640, dur: 0.05, type: 'square', vol: 0.035 }),
    draw: () => {
      tone({ freq: 520, dur: 0.12, type: 'triangle', vol: 0.07 })
      tone({ freq: 780, dur: 0.14, type: 'triangle', vol: 0.045, delay: 0.06 })
    },
    summon: () => {
      tone({ freq: 196, dur: 0.45, type: 'sawtooth', vol: 0.06 })
      tone({ freq: 294, dur: 0.5, type: 'sine', vol: 0.07, delay: 0.04 })
      tone({ freq: 588, dur: 0.32, type: 'sine', vol: 0.05, delay: 0.12 })
    },
    attack: () => noise({ dur: 0.26, vol: 0.16, cutoff: 2200 }),
    hit: () => {
      tone({ freq: 130, dur: 0.3, type: 'sawtooth', vol: 0.16, slide: -70 })
      noise({ dur: 0.2, vol: 0.12, cutoff: 700 })
    },
    destroy: () => noise({ dur: 0.45, vol: 0.16, cutoff: 1000 }),
    trap: () => {
      tone({ freq: 880, dur: 0.1, type: 'square', vol: 0.05 })
      tone({ freq: 440, dur: 0.26, type: 'square', vol: 0.05, delay: 0.1 })
    },
    heal: () => {
      tone({ freq: 660, dur: 0.2, type: 'sine', vol: 0.06 })
      tone({ freq: 990, dur: 0.3, type: 'sine', vol: 0.05, delay: 0.09 })
    },
    spell: () => {
      tone({ freq: 392, dur: 0.18, type: 'triangle', vol: 0.06 })
      tone({ freq: 587, dur: 0.26, type: 'triangle', vol: 0.05, delay: 0.08 })
    },
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, dur: 0.5, type: 'triangle', vol: 0.08, delay: i * 0.12 })),
    lose: () => [440, 330, 262, 196].forEach((f, i) => tone({ freq: f, dur: 0.55, type: 'sawtooth', vol: 0.06, delay: i * 0.14 })),
    toggle() { muted = !muted; return muted }
  }
})()

// ───────────────────────── カード描画 ─────────────────────────
function typeLine(card) {
  if (card.type === 'monster') {
    return `【${ATTR_TEXT[card.attr]}属性／${card.race}／レベル${card.level}】`
  }
  return card.type === 'spell' ? '【魔法カード】' : '【罠カード】'
}

function statMarkup(card) {
  if (card.type !== 'monster') return ''
  return `<div class="card-stats"><span>ATK ${card.atk}</span><span>DEF ${card.def}</span></div>`
}

function cardFace(card) {
  const meta = card.type === 'monster'
    ? `<span class="stars">${'★'.repeat(card.level)}</span><span class="race">${ATTR_TEXT[card.attr]}・${card.race}</span>`
    : `<span class="race">${card.type === 'spell' ? '魔法カード' : '罠カード'}</span>`
  const attrClass = card.type === 'monster' ? `attr-${card.attr}` : `type-${card.type}`
  const orb = card.type === 'monster' ? ATTR_TEXT[card.attr] : (card.type === 'spell' ? '魔' : '罠')
  return `<div class="card-face ${attrClass}">
    <div class="card-art" style="background-image:${cardArt(card)}"></div>
    <span class="attr-orb">${orb}</span>
    <div class="card-sheen"></div>
    <div class="card-plate">
      <div class="card-name">${card.name}</div>
      <div class="card-meta">${meta}</div>
      ${statMarkup(card)}
    </div>
  </div>`
}

function cardMarkup(card, opts = {}) {
  const faceDown = !!opts.faceDown
  const cls = [
    'card',
    faceDown ? 'is-back' : '',
    opts.extra || ''
  ].filter(Boolean).join(' ')
  return `<div class="${cls}" data-uid="${card.uid}">
    ${faceDown
      ? `<div class="card-back"><div class="back-emblem">遊</div></div>`
      : cardFace(card)}
  </div>`
}

function zoneInner(card, opts) {
  if (!card) return `<div class="zone-empty"><span class="zone-rune">◇</span></div>`
  const faceDown = opts.faceDown
  const pos = card.type === 'monster' ? `pos-${card.position}` : ''
  const badge = card.type === 'monster' && !faceDown
    ? `<span class="pos-badge">${card.position === 'attack' ? 'ATK' : 'DEF'}</span>` : ''
  return `${badge}${cardMarkup(card, { faceDown })}${opts.overlay || ''}`
}

function detailMarkup(card) {
  return `<div class="detail">
    <div class="detail-art" style="background-image:${cardArt(card)}"></div>
    <div class="detail-text">
      <div class="detail-line">${typeLine(card)}</div>
      <p>${card.text || ''}</p>
      ${card.type === 'monster' ? `<div class="detail-atk"><span>ATK <b>${card.atk}</b></span><span>DEF <b>${card.def}</b></span></div>` : ''}
    </div>
  </div>`
}

// ───────────────────────── 状態描画 ─────────────────────────
function canAttackNow() {
  return g && g.active === 'p' && !busy && !g.winner
}

function attackable(card) {
  return canAttackNow() && card && !card.faceDown && card.position === 'attack' && !card.hasAttacked
}

function renderMonsters(container, side) {
  const p = g[side]
  const targeting = pending && (
    (pending.kind === 'enemyMonster' && side === 'a') ||
    (pending.kind === 'ownMonster' && side === 'p') ||
    (pending.kind === 'attackTarget' && side === 'a')
  )
  container.innerHTML = p.monsters.map((m, i) => {
    const classes = ['zone', 'monster-zone']
    let overlay = ''
    if (!m) {
      if (targeting && side === 'a') classes.push('targetable')
      if (pending && pending.kind === 'attackTarget' && side === 'a') classes.push('targetable')
      if (selectedAttacker && side === 'a' && !p.monsters.some(Boolean)) classes.push('targetable')
      return `<div class="${classes.join(' ')}" data-side="${side}" data-kind="monster" data-zone="${i}"><div class="zone-empty"><span class="zone-rune">◇</span></div></div>`
    }
    if (m.faceDown) classes.push('is-set')
    if (m.position === 'defense' && !m.faceDown) classes.push('is-defense')
    if (selectedAttacker === m.uid) classes.push('selected')
    if (side === 'p' && attackable(m) && !pending) classes.push('can-attack')
    if (side === 'p' && pending && pending.kind === 'tribute') {
      classes.push('targetable')
      if (pending.picked.includes(m.uid)) classes.push('picked')
    }
    if (targeting && side === 'a') classes.push('targetable')
    if (side === 'p' && pending && pending.kind === 'ownMonster' && !m.faceDown) classes.push('targetable')
    if (side === 'a' && selectedAttacker && !pending) classes.push('targetable')
    if (justSummoned && justSummoned.side === side && justSummoned.zone === i) classes.push('summoned')
    if (side === 'a' && m.hasAttacked) classes.push('done')
    const faceDown = m.faceDown
    return `<div class="${classes.join(' ')}" data-side="${side}" data-kind="monster" data-zone="${i}">
      ${zoneInner(m, { faceDown })}
    </div>`
  }).join('')
}

function renderSpells(container, side) {
  const p = g[side]
  container.innerHTML = p.spells.map((s, i) => {
    const classes = ['zone', 'spell-zone']
    if (!s) {
      return `<div class="${classes.join(' ')}" data-side="${side}" data-kind="spell" data-zone="${i}"><div class="zone-empty small"><span class="zone-rune">✧</span></div></div>`
    }
    if (s.faceDown) classes.push('is-set')
    if (side === 'p' && pending && pending.kind === 'tribute') classes.push('dimmed')
    const known = side === 'p'
    return `<div class="${classes.join(' ')}" data-side="${side}" data-kind="spell" data-zone="${i}">
      ${cardMarkup(s, { faceDown: s.faceDown, extra: known && s.faceDown ? 'own-set' : '' })}
      ${known && s.faceDown ? `<span class="set-tag">${s.type === 'trap' ? '罠' : '魔'}</span>` : ''}
    </div>`
  }).join('')
}

function renderHand() {
  const hand = g.p.hand
  const n = hand.length
  const mid = (n - 1) / 2
  const box = $('#hand')
  box.innerHTML = hand.map((c, i) => {
    const rot = (i - mid) * 2.2
    const lift = Math.abs(i - mid) * 2
    const selectable = canAttackNow()
    return `<div class="hand-card ${selectable ? 'selectable' : ''}" style="--rot:${rot}deg;--lift:${lift}px;z-index:${i}" data-uid="${c.uid}">
      ${cardMarkup(c)}
    </div>`
  }).join('')
  // 手札が横に溢れないよう重なり量を自動調整
  const first = box.querySelector('.hand-card')
  if (first && n > 1) {
    const cardW = first.offsetWidth || 1
    const avail = box.clientWidth - 8
    const fit = (avail - cardW) / ((n - 1) * cardW) - 1
    const ov = Math.max(-0.62, Math.min(-0.05, fit))
    box.style.setProperty('--hand-ov', ov.toFixed(3))
  } else {
    box.style.setProperty('--hand-ov', '-0.05')
  }
  $('#my-hand-count').textContent = n
}

function renderBars() {
  const setLp = (side, fill, num) => {
    const lp = g[side].lp
    $(fill).style.width = `${Math.max(0, Math.min(100, (lp / 8000) * 100))}%`
    $(fill).classList.toggle('low', lp <= 2000)
    $(num).textContent = lp
  }
  setLp('a', '#ai-lp-fill', '#ai-lp')
  setLp('p', '#my-lp-fill', '#my-lp')
  $('#ai-hand-count').textContent = g.a.hand.length
  $('#ai-deck-count').textContent = g.a.deck.length
  $('#ai-grave-count').textContent = g.a.grave.length
  const fan = $('#ai-hand-strip')
  if (fan) {
    const n = Math.min(5, g.a.hand.length)
    fan.innerHTML = Array.from({ length: n }, (_, i) => `<i class="ai-back" style="--i:${i}"></i>`).join('')
  }
  $('#my-deck-count').textContent = g.p.deck.length
  $('#my-grave-count').textContent = g.p.grave.length
  $('#turn-num').textContent = g.turn
}

function renderPhase() {
  const chip = $('#phase-chip')
  let label = 'メインフェイズ'
  let cls = ''
  if (g.winner) { label = 'デュエル終了'; cls = 'end' }
  else if (g.active === 'a') { label = '相手のターン'; cls = 'enemy' }
  else if (g.battleMode) { label = 'バトルフェイズ'; cls = 'battle' }
  chip.textContent = label
  chip.className = `phase-chip ${cls}`
}

function renderButtons() {
  const mine = g.active === 'p' && !busy && !g.winner
  $('#btn-end').disabled = !mine
  $('#btn-battle').disabled = !mine
  $('#btn-battle').textContent = g.battleMode ? '◆ メインに戻る' : '⚔ バトル'
  $('#btn-battle').classList.toggle('active', g.battleMode)
  const direct = selectedAttacker && !pending && !g.a.monsters.some(Boolean) && g.active === 'p' && !busy
  $('#btn-direct').classList.toggle('hidden', !direct)
  $('#btn-cancel').classList.toggle('hidden', !pending && !selectedAttacker)
  $('#my-field').classList.toggle('active-turn', g.active === 'p' && !g.winner)
  $('#ai-field').classList.toggle('active-turn', g.active === 'a' && !g.winner)
  $('#duel').dataset.turn = g.active
}

function renderLog() {
  const box = $('#log')
  box.innerHTML = g.log.slice(-70).map(entry => `<div class="log-line ${entry.kind}">${entry.text}</div>`).join('')
  box.scrollTop = box.scrollHeight
}

function buildIndex() {
  cardIndex = new Map()
  for (const c of g.p.hand) cardIndex.set(c.uid, c)
  for (const side of ['p', 'a']) {
    for (const c of g[side].monsters) if (c && !c.faceDown) cardIndex.set(c.uid, c)
    for (const c of g[side].spells) if (c && (!c.faceDown || side === 'p')) cardIndex.set(c.uid, c)
  }
}

function renderAll() {
  if (!g) return
  renderBars()
  renderMonsters($('#ai-monsters'), 'a')
  renderMonsters($('#my-monsters'), 'p')
  renderSpells($('#ai-spells'), 'a')
  renderSpells($('#my-spells'), 'p')
  renderHand()
  renderLog()
  renderPhase()
  renderButtons()
  buildIndex()
}

function setHint(text) {
  $('#hint').textContent = text
}

function toast(text, ms = 1500) {
  const el = $('#toast')
  el.textContent = text
  el.classList.remove('hidden')
  el.classList.add('show')
  clearTimeout(el._t)
  el._t = setTimeout(() => {
    el.classList.remove('show')
    setTimeout(() => el.classList.add('hidden'), 220)
  }, ms)
}

function turnBanner(main, sub = '', kind = '') {
  const el = $('#turn-banner')
  if (!el) return
  $('#turn-banner-main').textContent = main
  $('#turn-banner-sub').textContent = sub
  el.className = `turn-banner show ${kind}`.trim()
  clearTimeout(el._t)
  el._t = setTimeout(() => el.classList.remove('show'), 1350)
}

// ───────────────────────── モーダル ─────────────────────────
function openModal({ title, sub = '', body = '', actions = [], picks = null }) {
  $('#modal-title').textContent = title
  $('#modal-sub').textContent = sub
  $('#modal-body').innerHTML = body
  $('#modal-actions').innerHTML = actions.map((a, i) =>
    `<button class="btn ${a.cls || ''}" data-idx="${i}" ${a.disabled ? 'disabled' : ''}>${a.label}</button>`
  ).join('')
  const modal = $('#modal')
  modal.classList.remove('hidden')
  return new Promise(resolve => {
    const finish = value => {
      modal.classList.add('hidden')
      modal.onclick = null
      document.removeEventListener('keydown', onKey)
      resolve(value)
    }
    const onKey = e => { if (e.key === 'Escape') finish(null) }
    modal.onclick = e => {
      const btn = e.target.closest('[data-idx]')
      if (btn) {
        const act = actions[Number(btn.dataset.idx)]
        if (act && !act.disabled) { Sfx.click(); finish(act.value) }
        return
      }
      const pick = e.target.closest('[data-pick]')
      if (pick && picks) { Sfx.click(); finish(picks[Number(pick.dataset.pick)]); return }
      if (e.target.closest('[data-close]')) { Sfx.click(); finish(null) }
    }
    document.addEventListener('keydown', onKey)
  })
}

// ───────────────────────── 選択 ─────────────────────────
function resolvePending(value) {
  if (!pending) return
  const { resolve } = pending
  pending = null
  setHint('')
  renderAll()
  resolve(value)
}

function cancelSelection() {
  if (pending) return resolvePending(null)
  if (selectedAttacker) {
    selectedAttacker = null
    setHint('選択を解除しました。')
    renderAll()
  }
}

function pickTarget(kind, prompt) {
  return new Promise(resolve => {
    pending = { kind, resolve }
    setHint(prompt + ' — 選択できない場合はキャンセル。')
    renderAll()
  })
}

function chooseTributes(card, need) {
  return new Promise(resolve => {
    pending = { kind: 'tribute', need, picked: [], resolve, card }
    setHint(`リリースするモンスターを ${need} 体選択（0/${need}）`)
    renderAll()
  })
}

function toggleTribute(uid) {
  const p = pending
  if (!p || p.kind !== 'tribute') return
  if (p.picked.includes(uid)) p.picked = p.picked.filter(x => x !== uid)
  else if (p.picked.length < p.need) p.picked.push(uid)
  setHint(`リリースするモンスターを選択（${p.picked.length}/${p.need}）`)
  if (p.picked.length === p.need) {
    const picked = p.picked.slice()
    pending = null
    setHint('')
    renderAll()
    p.resolve(picked)
    return
  }
  renderAll()
}

// ───────────────────────── プレイヤーの行動 ─────────────────────────
function spellUsable(card, ownSetZone = false) {
  const freeSpellSlot = g.p.spells.some(z => !z) ||
    (ownSetZone && g.p.spells.some(s => s && s.uid === card.uid))
  if (card.id === 'destructionStorm') return g.a.monsters.some(Boolean)
  if (card.id === 'magicSword') return g.p.monsters.some(m => m && !m.faceDown) && freeSpellSlot
  if (card.id === 'revivalRite') return g.p.grave.some(c => c.type === 'monster') && g.p.monsters.some(z => !z)
  return true
}

async function onHandClick(uid) {
  if (!g || busy || g.winner || g.active !== 'p' || pending) return
  const card = g.p.hand.find(c => c.uid === uid)
  if (!card) return
  Sfx.click()

  if (card.type === 'monster') {
    const need = tributeNeeded(card.level)
    const placeable = !g.normalSummoned && g.p.monsters.some(z => !z)
    const v = await openModal({
      title: card.name,
      sub: typeLine(card),
      body: detailMarkup(card) + (need ? `<div class="note">リリース：${need} 体必要</div>` : ''),
      actions: [
        { label: '召喚（攻撃表示）', value: 'summon', cls: 'primary', disabled: !placeable },
        { label: 'セット（守備表示）', value: 'set', disabled: !placeable },
        { label: 'キャンセル', value: null, cls: 'ghost' }
      ]
    })
    if (v === 'summon') await doSummon(card, false)
    if (v === 'set') await doSummon(card, true)
    return
  }

  if (card.type === 'spell') {
    const canUse = spellUsable(card)
    const v = await openModal({
      title: card.name,
      sub: '【魔法カード】',
      body: detailMarkup(card),
      actions: [
        { label: '発動する', value: 'use', cls: 'primary', disabled: !canUse },
        { label: 'セットする', value: 'set' },
        { label: 'キャンセル', value: null, cls: 'ghost' }
      ]
    })
    if (v === 'use') await playSpell(card)
    if (v === 'set') doSet(card)
    return
  }

  const v = await openModal({
    title: card.name,
    sub: '【罠カード】',
    body: detailMarkup(card),
    actions: [
      { label: 'セットする', value: 'set', cls: 'primary' },
      { label: 'キャンセル', value: null, cls: 'ghost' }
    ]
  })
  if (v === 'set') doSet(card)
}

async function doSummon(card, set) {
  if (g.normalSummoned) return toast('このターンはすでに召喚しています。')
  if (!g.p.monsters.some(z => !z)) return toast('モンスターゾーンが埋まっています。')
  const need = tributeNeeded(card.level)
  let tributes = []
  if (need) {
    tributes = await chooseTributes(card, need)
    if (!tributes) return
  }
  busy = true
  selectedAttacker = null
  const res = summonMonster(g, 'p', card.uid, { tributes, set })
  if (!res.ok) {
    busy = false
    renderAll()
    toast(res.msg || '召喚できません。')
    return
  }
  justSummoned = { side: 'p', zone: res.zone }
  renderAll()
  Sfx.summon()
  await sleep(650)
  justSummoned = null
  busy = false
  renderAll()
  setHint(set ? 'セットしました。相手のターンに備えましょう。' : '召喚しました。攻撃する場合はモンスターを選択。')
  if (g.winner) finishGame()
}

function doSet(card) {
  const res = setSpellCard(g, 'p', card.uid)
  if (!res.ok) return toast(res.msg || 'セットできません。')
  Sfx.click()
  renderAll()
  toast('カードをセットしました。')
}

async function playSpell(card, fromSet = false) {
  const cast = targetUid => fromSet
    ? activateSetSpell(g, 'p', card.uid, targetUid)
    : activateSpell(g, 'p', card.uid, targetUid)
  let target = null
  if (card.id === 'destructionStorm') {
    target = await pickTarget('enemyMonster', '破壊する相手モンスターを選択')
    if (!target) return
    const zi = monsterIndex(g, 'a', target)
    busy = true
    const res = cast(target)
    busy = false
    if (!res.ok) { renderAll(); return toast(res.msg) }
    Sfx.spell()
    renderAll()
    await burstZone('a', zi, '#ff8a52')
    Sfx.destroy()
    renderAll()
  } else if (card.id === 'magicSword') {
    target = await pickTarget('ownMonster', '装備する自分モンスターを選択')
    if (!target) return
    busy = true
    const res = cast(target)
    busy = false
    if (!res.ok) { renderAll(); return toast(res.msg) }
    Sfx.spell()
    renderAll()
    toast('攻撃力が1000アップ！')
  } else if (card.id === 'revivalRite') {
    const monsters = g.p.grave.filter(c => c.type === 'monster')
    if (!monsters.length) return toast('墓地にモンスターがいません。')
    const body = `<p class="note">守備表示で特殊召喚するモンスターを選択</p><div class="pick-list">${monsters.map((c, i) => `
      <button class="pick-item" data-pick="${i}">
        <span class="pick-name">${c.name}</span>
        <span class="pick-stat">ATK ${c.atk} / DEF ${c.def}</span>
      </button>`).join('')}</div>`
    const chosen = await openModal({ title: '蘇生の儀', sub: '墓地から特殊召喚', body, actions: [{ label: 'キャンセル', value: null, cls: 'ghost' }], picks: monsters })
    if (!chosen) return
    busy = true
    const res = cast(chosen.uid)
    busy = false
    if (!res.ok) { renderAll(); return toast(res.msg) }
    Sfx.summon()
    renderAll()
    toast(`${chosen.name} を蘇生しました。`)
  } else {
    busy = true
    const res = cast(null)
    busy = false
    if (!res.ok) { renderAll(); return toast(res.msg) }
    if (card.id === 'healingLight') Sfx.heal()
    else Sfx.spell()
    renderAll()
  }
  if (g.winner) finishGame()
}

async function onFieldClick(side, kind, zone) {
  if (!g || g.winner) return
  const card = kind === 'monster' ? g[side].monsters[zone] : g[side].spells[zone]

  if (pending) {
    if (!card) {
      if (pending.kind === 'attackTarget' && side === 'a' && !g.a.monsters.some(Boolean)) {
        return resolvePending('direct')
      }
      return
    }
    if (pending.kind === 'tribute' && side === 'p' && kind === 'monster') return toggleTribute(card.uid)
    if (pending.kind === 'enemyMonster' && side === 'a' && kind === 'monster') return resolvePending(card.uid)
    if (pending.kind === 'ownMonster' && side === 'p' && kind === 'monster' && !card.faceDown) return resolvePending(card.uid)
    if (pending.kind === 'attackTarget' && side === 'a' && kind === 'monster') return resolvePending(card.uid)
    return
  }

  if (busy || g.active !== 'p') {
    if (card) showInfo(card, side, kind)
    return
  }

  if (kind === 'spell') {
    if (side === 'p' && card) {
      if (card.faceDown && card.type === 'spell' && g.active === 'p' && !busy) {
        const canActivate = card.setTurn < g.turn && spellUsable(card, true)
        const v = await openModal({
          title: card.name,
          sub: '【魔法カード】／セット中',
          body: detailMarkup(card) + (card.setTurn >= g.turn
            ? '<div class="note">セットしたターンは発動できません。次のターン以降に発動できます。</div>'
            : ''),
          actions: [
            { label: '発動する', value: 'use', cls: 'primary', disabled: !canActivate },
            { label: '閉じる', value: null, cls: 'ghost' }
          ]
        })
        if (v === 'use') await playSpell(card, true)
        return
      }
      showInfo(card, side, kind, true)
      return
    }
    if (side === 'a' && card) showInfo(card, side, kind)
    return
  }

  if (side === 'a') {
    if (selectedAttacker && card) return doAttack(card.uid)
    if (card) showInfo(card, side, kind)
    return
  }

  // 自分のモンスター
  if (!card) return
  if (selectedAttacker && selectedAttacker !== card.uid) {
    selectedAttacker = null
  }
  if (selectedAttacker === card.uid) {
    selectedAttacker = null
    setHint('攻撃をキャンセルしました。')
    renderAll()
    return
  }
  if (attackable(card)) {
    selectedAttacker = card.uid
    g.battleMode = true
    setHint(!g.a.monsters.some(Boolean)
      ? '相手フィールドは空。直接攻撃が可能！'
      : '攻撃対象の相手モンスターを選択。')
    renderAll()
    return
  }
  if (card.faceDown) {
    const canFlip = card.summonedTurn < g.turn && card.changedTurn !== g.turn
    const v = await openModal({
      title: 'セットモンスター',
      sub: '守備表示',
      body: `<div class="note">${canFlip ? '反転召喚できます。' : 'このターンは表示形式を変更できません。'}</div>`,
      actions: [
        { label: '反転召喚（攻撃表示）', value: 'flip', cls: 'primary', disabled: !canFlip },
        { label: 'キャンセル', value: null, cls: 'ghost' }
      ]
    })
    if (v === 'flip') {
      const res = changePosition(g, 'p', card.uid)
      if (res.ok) { Sfx.summon(); renderAll(); } else toast(res.msg)
    }
    return
  }

  const canChange = card.summonedTurn < g.turn && card.changedTurn !== g.turn
  const v = await openModal({
    title: card.name,
    sub: typeLine(card) + '／' + (card.position === 'attack' ? '攻撃表示' : '守備表示'),
    body: detailMarkup(card),
    actions: [
      { label: card.position === 'attack' ? '守備表示にする' : '攻撃表示にする', value: 'pos', disabled: !canChange },
      { label: '攻撃する', value: 'attack', cls: 'primary', disabled: !attackable(card) },
      { label: 'キャンセル', value: null, cls: 'ghost' }
    ]
  })
  if (v === 'pos') {
    const res = changePosition(g, 'p', card.uid)
    if (res.ok) { Sfx.click(); renderAll() } else toast(res.msg)
  }
  if (v === 'attack') {
    selectedAttacker = card.uid
    g.battleMode = true
    setHint(g.a.monsters.some(Boolean) ? '攻撃対象を選択。' : '直接攻撃が可能！')
    renderAll()
  }
}

function showInfo(card, side, kind, ownSet = false) {
  if (card.faceDown && !ownSet) {
    openModal({
      title: 'セットカード',
      sub: side === 'a' ? '相手フィールド' : '自分フィールド',
      body: `<div class="note">伏せられたカード。正体は攻撃時に明らかになる。</div>`,
      actions: [{ label: '閉じる', value: null, cls: 'ghost' }]
    })
    return
  }
  openModal({
    title: card.name,
    sub: `${typeLine(card)}${card.equipTarget ? '／装備中' : ''}`,
    body: detailMarkup(card),
    actions: [{ label: '閉じる', value: null, cls: 'ghost' }]
  })
}

async function doAttack(targetUid) {
  const atkUid = selectedAttacker
  if (!atkUid) return
  selectedAttacker = null
  busy = true
  renderAll()
  setHint('攻撃中…')
  let result = { ok: false }
  try {
    result = await performAttack(g, 'p', atkUid, targetUid, {
      event: playEvent,
      pickTrap: (traps, attacker, target) => chooseAiTrap(g, traps, attacker, target)
    })
  } catch (err) {
    console.error('[duel] attack failed', err)
  } finally {
    busy = false
  }
  renderAll()
  if (g.winner) return finishGame()
  if (!result.ok) toast(result.msg || '攻撃できません。')
  setHint('続けて攻撃するか、ターンを終了してください。')
}

async function doDirectAttack() {
  if (!selectedAttacker) return
  await doAttack(null)
}

// ───────────────────────── 演出 ─────────────────────────
function rectOf(selector) {
  const el = document.querySelector(selector)
  return el ? el.getBoundingClientRect() : null
}

function containerFor(side) {
  return side === 'p' ? '#my-monsters' : '#ai-monsters'
}

async function animateAttack(ev) {
  const el = document.querySelector(`${containerFor(ev.side)} [data-uid="${ev.attackerUid}"]`)
  if (!el) return
  const targetEl = ev.targetUid
    ? document.querySelector(`${containerFor(ev.side === 'p' ? 'a' : 'p')} [data-uid="${ev.targetUid}"]`)
    : (ev.side === 'p' ? $('#ai-field') : $('#my-field'))
  const from = el.getBoundingClientRect()
  const to = (targetEl || document.body).getBoundingClientRect()
  const clone = el.cloneNode(true)
  clone.className += ' attack-clone'
  clone.style.cssText = `position:fixed;left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px;z-index:60;pointer-events:none;`
  $('#fx').appendChild(clone)

  const dx = to.left + to.width / 2 - (from.left + from.width / 2)
  const dy = to.top + to.height / 2 - (from.top + from.height / 2)
  const anim = clone.animate([
    { transform: 'translate(0,0) scale(1)', filter: 'brightness(1)' },
    { transform: `translate(${dx * 0.55}px,${dy * 0.55}px) scale(1.12)`, filter: 'brightness(1.7)' },
    { transform: `translate(${dx}px,${dy}px) scale(0.92)`, filter: 'brightness(1.3)' }
  ], { duration: 340, easing: 'cubic-bezier(.4,0,.9,.4)' })
  try { await anim.finished } catch { /* noop */ }
  clone.remove()

  const impact = document.createElement('div')
  impact.className = 'impact'
  impact.style.cssText = `position:fixed;left:${to.left + to.width / 2}px;top:${to.top + to.height / 2}px;`
  $('#fx').appendChild(impact)
  setTimeout(() => impact.remove(), 500)
  $('#duel').classList.add('shake')
  setTimeout(() => $('#duel').classList.remove('shake'), 260)
}

async function burstZone(side, zone, color = '#e9c46a') {
  const el = document.querySelector(`${containerFor(side)} [data-zone="${zone}"]`)
  if (!el) return
  const r = el.getBoundingClientRect()
  const burst = document.createElement('div')
  burst.className = 'burst'
  burst.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;--burst:${color};`
  $('#fx').appendChild(burst)
  await sleep(420)
  burst.remove()
}

function damageFlash(side, amount) {
  const bar = side === 'a' ? $('.opponent-bar') : $('.player-bar')
  bar.classList.add('hit')
  setTimeout(() => bar.classList.remove('hit'), 420)
  const anchor = side === 'a' ? rectOf('#ai-lp') : rectOf('#my-lp')
  if (!anchor) return
  const num = document.createElement('div')
  num.className = 'dmg-num'
  num.textContent = `-${amount}`
  num.style.cssText = `left:${anchor.left + anchor.width / 2}px;top:${anchor.top}px;`
  $('#fx').appendChild(num)
  setTimeout(() => num.remove(), 1100)
}

async function playEvent(ev) {
  if (ev.type === 'attack') {
    Sfx.attack()
    await animateAttack(ev)
    renderAll()
    await sleep(140)
  } else if (ev.type === 'clash') {
    // 攻撃演出に内包
  } else if (ev.type === 'trap') {
    Sfx.trap()
    toast(`${ev.result?.trap?.name || '罠カード'} 発動！`, 1600)
    renderAll()
    await sleep(720)
  } else if (ev.type === 'destroy') {
    Sfx.destroy()
    await burstZone(ev.side, ev.zone, '#ff7a52')
    renderAll()
    await sleep(170)
  } else if (ev.type === 'damage') {
    renderAll()
    damageFlash(ev.side, ev.amount)
    Sfx.hit()
    await sleep(460)
  }
}

// ───────────────────────── 罠プロンプト ─────────────────────────
async function pickPlayerTrap(traps, attacker, target) {
  if (!traps.length) return null
  const body = `<p class="note">${attacker.name}（ATK ${attacker.atk}）の攻撃！</p>
    <div class="pick-list">${traps.map(t => `<div class="trap-item"><b>${t.name}</b><p>${t.text}</p></div>`).join('')}</div>`
  const actions = traps.map(t => ({ label: `${t.name} を発動`, value: t.uid, cls: 'primary' }))
  actions.push({ label: '発動しない', value: null, cls: 'ghost' })
  const v = await openModal({
    title: '罠カードを発動しますか？',
    sub: `攻撃力 ${attacker.atk}${target ? ' / 対象あり' : ' / 直接攻撃'}`,
    body,
    actions
  })
  return traps.find(t => t.uid === v) || null
}

// ───────────────────────── ターン進行 ─────────────────────────
function startGame() {
  g = createGame()
  busy = false
  selectedAttacker = null
  pending = null
  finished = false
  justSummoned = null
  $('#over').classList.add('hidden')
  $('#title').classList.add('hidden')
  $('#duel').classList.remove('hidden')
  document.body.classList.add('in-duel')
  renderAll()
  setHint('あなたのターン。手札のカードを選んで召喚・発動しましょう。')
  Sfx.draw()
  turnBanner('YOUR TURN', 'あなたのターン')
}

function endMyTurn() {
  if (!g || busy || g.active !== 'p' || g.winner) return
  if (pending) { resolvePending(null); return }
  busy = true
  selectedAttacker = null
  g.battleMode = false
  endTurn(g)
  renderAll()
  setHint('相手のターン…')
  aiTurnFlow()
}

async function aiTurnFlow() {
  beginTurn(g)
  Sfx.draw()
  renderAll()
  turnBanner('RIVAL TURN', '闇の決闘者', 'rival')
  await sleep(620)
  if (g.winner) return finishGame()

  try {
    await runAiTurn(g, {
      sleep,
      render: renderAll,
      event: playEvent,
      pickTrap: pickPlayerTrap
    })
  } catch (err) {
    console.error('[duel] ai turn failed', err)
  }

  if (g.winner) return finishGame()
  endTurn(g)
  beginTurn(g)
  Sfx.draw()
  busy = false
  selectedAttacker = null
  renderAll()
  setHint('あなたのターン。手札のカードを選んでください。')
  turnBanner('YOUR TURN', 'あなたのターン')
  if (g.winner) finishGame()
}

async function finishGame() {
  if (finished) return
  finished = true
  busy = true
  selectedAttacker = null
  pending = null
  renderAll()
  await sleep(900)
  const win = g.winner === 'p'
  $('#over-title').textContent = win ? '勝利' : '敗北'
  $('#over-title').className = win ? 'win' : 'lose'
  $('#over-sub').textContent = win
    ? '決闘の伝説に、新たな名前が刻まれた。'
    : '闇はまだ深い。デッキを組み直して再挑戦しよう。'
  $('#over').classList.remove('hidden')
  if (win) Sfx.win(); else Sfx.lose()
}

// ───────────────────────── プレビュー ─────────────────────────
function showPreview(uid) {
  if (window.innerWidth < 1200) return
  const card = cardIndex.get(uid)
  if (!card) return
  const el = $('#preview')
  el.innerHTML = `<div class="preview-inner">${cardMarkup(card)}</div>`
  el.classList.remove('hidden')
}
function hidePreview() {
  $('#preview').classList.add('hidden')
}

// ───────────────────────── 初期化 ─────────────────────────
function renderTitleCards() {
  const ids = ['starDragon', 'crimsonMage', 'holyBarrier']
  const wrap = $('#title-cards')
  if (!wrap) return
  wrap.innerHTML = ids.map((id, i) => {
    const el = document.createElement('div')
    el.className = 'title-card'
    el.dataset.id = id
    el.style.setProperty('--i', i)
    return `<div class="title-card" style="--i:${i}"><div class="card" data-static="${id}"><div class="card-face"></div></div></div>`
  }).join('')
  // 実際のカードで描画
  Promise.all(ids.map(id => import('./cards.js').then(m => m.CARDS[id]))).then(cards => {
    wrap.innerHTML = cards.map((c, i) =>
      `<div class="title-card" style="--i:${i}">${cardMarkup(c)}</div>`
    ).join('')
  })
}

function openGrave(side) {
  const p = g[side]
  const list = p.grave
  const body = list.length
    ? `<div class="pick-list">${list.map(c => `<div class="grave-row">
        <span class="grave-name">${c.name}</span>
        <span class="grave-meta">${c.type === 'monster' ? `ATK ${c.atk} / DEF ${c.def}` : (c.type === 'spell' ? '魔法' : '罠')}</span>
      </div>`).join('')}</div>`
    : `<div class="note">墓地は空です。</div>`
  openModal({
    title: side === 'p' ? '自分の墓地' : '相手の墓地',
    sub: `${list.length} 枚`,
    body,
    actions: [{ label: '閉じる', value: null, cls: 'ghost' }]
  })
}

function bind() {
  $('#btn-start').addEventListener('click', () => { Sfx.click(); startGame() })
  $('#btn-rules').addEventListener('click', () => {
    Sfx.click()
    openModal({
      title: '遊び方',
      sub: 'DUEL LEGENDS',
      body: `<div class="rules">
        <p><b>勝利条件</b>：相手のライフポイントを0にする、または相手の山札を尽きさせる。</p>
        <p><b>召喚</b>：手札のモンスターを1ターンに1体まで召喚／セットできる。レベル5・6は1体、レベル7以上は2体のリリースが必要。</p>
        <p><b>魔法</b>：手札から発動、または伏せてセット。伏せた魔法は次のターン以降、自分のターンに発動できる。罠はセットした次のターン以降、相手の攻撃時に発動できる。</p>
        <p><b>バトル</b>：攻撃表示のモンスターを選び、相手モンスターを攻撃。相手フィールドが空なら直接攻撃。攻撃表示同士は攻撃力、守備表示には守備力で勝負し、差分がダメージになる。</p>
        <p><b>表示形式</b>：召喚したターンは変更不可。以降は1ターンに1度、攻撃／守備を切り替えられる。</p>
      </div>`,
      actions: [{ label: '閉じる', value: null, cls: 'primary' }]
    })
  })
  $('#btn-end').addEventListener('click', () => { Sfx.click(); endMyTurn() })
  $('#btn-battle').addEventListener('click', () => {
    if (!g || busy || g.active !== 'p' || g.winner) return
    g.battleMode = !g.battleMode
    Sfx.click()
    renderAll()
    setHint(g.battleMode ? '攻撃するモンスターを選択してください。' : 'メインフェイズに戻りました。')
  })
  $('#btn-direct').addEventListener('click', () => { Sfx.click(); doDirectAttack() })
  $('#btn-cancel').addEventListener('click', () => { Sfx.click(); cancelSelection() })
  $('#btn-sound').addEventListener('click', () => {
    const muted = Sfx.toggle()
    $('#btn-sound').textContent = muted ? '🔇' : '🔊'
  })
  $('#btn-surrender').addEventListener('click', async () => {
    if (!g || finished) return
    const v = await openModal({
      title: '降参しますか？',
      body: `<div class="note">このデュエルは敗北となります。</div>`,
      actions: [{ label: '降参する', value: 'yes', cls: 'danger' }, { label: '続ける', value: null, cls: 'ghost' }]
    })
    if (v === 'yes') { g.winner = 'a'; addLog(g, 'あなたは降参した。', 'system'); finishGame() }
  })
  $('#btn-grave').addEventListener('click', () => { Sfx.click(); openGrave('p') })
  $('#btn-retry').addEventListener('click', () => { Sfx.click(); startGame() })
  $('#btn-log').addEventListener('click', () => {
    $('#sidebar').classList.toggle('open')
  })

  $('#hand').addEventListener('click', e => {
    const el = e.target.closest('[data-uid]')
    if (el) onHandClick(el.dataset.uid)
  })
  for (const [id, side] of [['#my-monsters', 'p'], ['#ai-monsters', 'a'], ['#my-spells', 'p'], ['#ai-spells', 'a']]) {
    $(id).addEventListener('click', e => {
      const z = e.target.closest('[data-zone]')
      if (!z) return
      onFieldClick(z.dataset.side, z.dataset.kind, Number(z.dataset.zone))
    })
  }
  document.addEventListener('mouseover', e => {
    const el = e.target.closest('.card[data-uid]')
    if (!el) return
    if (el.closest('#hand') || el.closest('.zone') || el.closest('.preview')) showPreview(el.dataset.uid)
  })
  document.addEventListener('mouseout', e => {
    if (e.target.closest('.card[data-uid]')) hidePreview()
  })
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') cancelSelection()
    if (e.key === ' ' && g && g.active === 'p' && !busy) { e.preventDefault(); endMyTurn() }
  })
  window.addEventListener('resize', () => { if (window.innerWidth < 1200) hidePreview() })
}

export function boot() {
  renderTitleCards()
  bind()
  window.__duelState = () => g
  if (new URLSearchParams(location.search).has('debug')) {
    window.__test = { renderAll, playEvent, pickPlayerTrap, startGame, doAttack, doDirectAttack }
  }
}
