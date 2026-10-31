import { CARDS, tributeCount } from './cards.js'
import { newDuel, beginDuel, applyAction, viewFor } from './game.js'
import { Net, makeRoomCode, makeId, BROKERS, brokerById } from './net.js'
import { sfx } from './audio.js'

const $ = sel => document.querySelector(sel)
const $$ = sel => Array.from(document.querySelectorAll(sel))
const clamp = (n, a, b) => Math.max(a, Math.min(b, n))

const params = new URLSearchParams(location.search)
const roomParam = (params.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
const brokerParam = params.get('b') || ''
const role = roomParam ? 'guest' : 'host'
const room = roomParam || makeRoomCode()
const myId = makeId()
const preferredBroker = brokerById(brokerParam) ? BROKERS.indexOf(brokerById(brokerParam)) : 0
function currentLink() {
  const id = net?.broker?.id || BROKERS[preferredBroker].id
  return `${location.origin}${location.pathname}?room=${room}&b=${id}`
}

const el = {
  roomCode: $('#roomCode'), turnNo: $('#turnNo'), phaseName: $('#phaseName'), turnPill: $('#turnPill'),
  phaseRail: $('#phaseRail'), waiting: $('#waitingBanner'), waitingText: $('#waitingText'),
  oppName: $('#oppName'), oppLp: $('#oppLp'), oppLpFill: $('#oppLpFill'), oppHand: $('#oppHand'),
  oppDeck: $('#oppDeck'), oppGrave: $('#oppGrave'), oppHandRow: $('#oppHandRow'),
  youName: $('#youName'), youLp: $('#youLp'), youLpFill: $('#youLpFill'), youHand: $('#youHand'),
  youDeck: $('#youDeck'), youGrave: $('#youGrave'), turnFlag: $('#turnFlag'),
  oppRow: $('#oppRow'), myRow: $('#myRow'), board: $('#board'),
  hand: $('#hand'), hint: $('#hint'), actionBtns: $('#actionBtns'),
  logTicker: $('#logTicker'), logText: $('#logText'),
  inviteModal: $('#inviteModal'), inviteCode: $('#inviteCode'), inviteLink: $('#inviteLink'), inviteStatus: $('#inviteStatus'),
  menuModal: $('#menuModal'), soundState: $('#soundState'), tiltState: $('#tiltState'), connInfo: $('#connInfo'),
  rulesModal: $('#rulesModal'), logModal: $('#logModal'), logList: $('#logList'),
  confirmModal: $('#confirmModal'), resultModal: $('#resultModal'), resultTitle: $('#resultTitle'),
  resultReason: $('#resultReason'), resultStats: $('#resultStats'), resultEyebrow: $('#resultEyebrow'),
  rematchBtn: $('#rematchBtn'), rematchNote: $('#rematchNote'),
  sheetModal: $('#sheetModal'), sheetBody: $('#sheetBody'),
  offlineModal: $('#offlineModal'), offlineReason: $('#offlineReason'),
  boot: $('#bootVeil'), bootText: $('#bootText'), toast: $('#toast')
}

let engine = role === 'host' ? newDuel(room, myId, Date.now()) : null
let view = null
let net = null
let conn = 'boot'
let mySeat = role === 'host' ? 0 : 1
let lastSeq = -1
let lastEv = -1
let firstPaint = true
let sheet = null
let target = null
let tribute = null
let resultOpen = false
let pending = false
let pendingTimer = null
let lastLog = ''
let lastLp = [null, null]
let tiltOn = localStorage.getItem('ad_tilt') === 'on'
let orientBound = false
let bootTimer = null
let resultTimer = null

/* ---------------- state helpers ---------------- */

function hostView() {
  const v = viewFor(engine, 0)
  v.hostOnline = true
  v.guestOnline = !!net?.guestOnline
  return v
}

function opponentSeat() { return 1 - mySeat }
function opponentOnline() {
  if (!view) return false
  return mySeat === 0 ? !!view.guestOnline : !!view.hostOnline
}
function seatName(seat) {
  if (seat === mySeat) return 'あなた'
  return view?.names?.[seat] || (seat === 0 ? 'ホスト' : 'ゲスト')
}
function phaseLabel(phase) {
  return phase === 'battle' ? 'バトル' : phase === 'over' ? '終了' : phase === 'draw' ? 'ドロー' : 'メイン'
}
function refreshHost() {
  view = hostView()
  el.roomCode.textContent = room
}
function publishGuestView() {
  if (role !== 'host' || !net?.connected) return
  const v = viewFor(engine, 1)
  v.hostOnline = true
  v.guestOnline = !!net.guestOnline
  net.publishView(v)
}

/* ---------------- rendering ---------------- */

function cardHTML(cardId, opts = {}) {
  const c = CARDS[cardId]
  if (!c) return ''
  const spell = c.kind === 'spell'
  const atk = opts.atk ?? c.atk
  const def = opts.def ?? c.def
  const boosted = opts.mod > 0
  return `<div class="card ${spell ? 'spell' : ''} ${opts.sel ? 'sel' : ''} ${boosted ? 'boosted' : ''} ${opts.cls || ''}"${opts.uid ? ` data-uid="${opts.uid}"` : ''}>
    <div class="card-head"><span class="lvl">${spell ? '魔法' : 'Lv' + c.lv}</span><span class="race">${spell ? 'MAGIC' : c.race}</span></div>
    <div class="card-name">${c.name}</div>
    <div class="card-glyph">${c.glyph}</div>
    ${spell
      ? `<div class="card-stats spellline"><b>魔法 ・ 1ターン1回</b></div>`
      : `<div class="card-stats"><span><i>ATK</i><b>${atk}</b></span><span><i>DEF</i><b>${def}</b></span></div>`}
  </div>`
}

function backHTML(uid) {
  return `<div class="card back"${uid ? ` data-uid="${uid}"` : ''}>
    <div class="back-glyph">氷</div><div class="back-tag">SET</div>
  </div>`
}

function zoneHTML(p, z, slot) {
  const isMine = p === mySeat
  const classes = ['zone']
  if (slot) classes.push('selectable')
  if (slot && isTargetable(p, z, slot)) classes.push('valid')
  if (tribute && isMine && slot && tribute.chosen.includes(slot.uid)) classes.push('tribute')
  let inner
  if (!slot) inner = `<span class="empty">空き</span>`
  else if (slot.faceDown) inner = backHTML(slot.uid)
  else inner = cardHTML(slot.card, {
    uid: slot.uid,
    atk: slot.atk,
    def: slot.def,
    mod: slot.mod,
    sel: isMine && ((sheet?.kind === 'field' && sheet.uid === slot.uid) || (target?.kind === 'attack' && target.uid === slot.uid))
  })
  return `<div class="${classes.join(' ')}" data-zone="${p}-${z}" data-uid="${slot?.uid || ''}">${inner}<span class="zone-no">${z + 1}</span></div>`
}

function isTargetable(p, z, slot) {
  if (!target || !view) return false
  const opp = opponentSeat()
  if (target.kind === 'attack') return p === opp && !!slot
  if (target.kind === 'cast') {
    const id = target.cardId
    if (id === 'boost') return p === mySeat && !!slot && !slot.faceDown && slot.pos === 'atk'
    if (id === 'shatter') return p === opp && !!slot && (slot.faceDown || (slot.def ?? 9999) <= 1500)
    if (id === 'gust' || id === 'freeze') return p === opp && !!slot
  }
  return false
}

function renderHeader() {
  if (!view) return
  el.roomCode.textContent = room
  el.turnNo.textContent = view.started ? `TURN ${view.turn}` : 'READY'
  el.phaseName.textContent = view.over ? '終了' : !view.started ? '待機' : phaseLabel(view.phase)
  el.turnPill.classList.toggle('mine', view.started && !view.over && view.active === mySeat)
  el.turnPill.classList.toggle('pulse', false)
  const order = ['draw', 'main', 'battle', 'end']
  const current = !view.started ? -1 : view.over ? 4 : view.phase === 'battle' ? 2 : 1
  $$('#phaseRail span').forEach((span, i) => {
    span.classList.toggle('on', i === current)
    span.classList.toggle('done', i < current)
  })
}

function renderWaiting() {
  if (!view) return
  const started = view.started
  const online = opponentOnline()
  const show = !started || (!online && !view.over)
  el.waiting.hidden = !show
  if (!show) return
  const dot = el.waiting.querySelector('.live-dot')
  if (!started) {
    dot.classList.toggle('off', conn !== 'online')
    el.waitingText.textContent = conn === 'online'
      ? `対戦相手を待っています ・ ルーム ${room}`
      : conn === 'failed' ? 'オンラインに接続できません' : 'オンラインに接続しています…'
  } else {
    dot.classList.add('off')
    el.waitingText.textContent = '相手の接続を待っています…'
  }
}

function setLp(node, value, fill, max, changed) {
  node.textContent = String(value)
  fill.style.width = `${clamp((value / max) * 100, 0, 100)}%`
  if (changed) {
    const wrap = node.closest('.lp')
    wrap.classList.remove('bump')
    void wrap.offsetWidth
    wrap.classList.add('bump')
    setTimeout(() => wrap.classList.remove('bump'), 500)
  }
}

function renderSides() {
  const opp = opponentSeat()
  const me = mySeat
  el.oppName.textContent = view.names[opp]
  el.youName.textContent = view.names[me]
  const oppLpChanged = lastLp[opp] !== null && lastLp[opp] !== view.lp[opp]
  const youLpChanged = lastLp[me] !== null && lastLp[me] !== view.lp[me]
  setLp(el.oppLp, view.lp[opp], el.oppLpFill, 4000, oppLpChanged)
  setLp(el.youLp, view.lp[me], el.youLpFill, 4000, youLpChanged)
  lastLp = [view.lp[0], view.lp[1]]
  el.oppHand.textContent = view.hands[opp].count
  el.youHand.textContent = view.hands[me].count
  el.oppDeck.textContent = view.decks[opp]
  el.youDeck.textContent = view.decks[me]
  el.oppGrave.textContent = view.graves[opp]
  el.youGrave.textContent = view.graves[me]
  el.oppHandRow.innerHTML = Array.from({ length: Math.min(view.hands[opp].count, 9) }, () => '<i></i>').join('')
  el.turnFlag.textContent = view.over ? 'デュエル終了' : !view.started ? '待機中' : view.active === me ? 'あなたのターン' : '相手のターン'
  el.turnFlag.classList.toggle('on', view.started && !view.over && view.active === me)
}

function renderBoard() {
  const opp = opponentSeat()
  el.oppRow.innerHTML = view.field[opp].map((slot, z) => zoneHTML(opp, z, slot)).join('')
  el.myRow.innerHTML = view.field[mySeat].map((slot, z) => zoneHTML(mySeat, z, slot)).join('')
  el.oppRow.classList.toggle('opp-row', true)
}

function renderHand() {
  if (!view) return
  const cards = view.hands[mySeat].cards
  const scroll = el.hand.scrollLeft
  if (!cards) {
    el.hand.innerHTML = `<div class="hand-empty">手札を同期しています</div>`
    return
  }
  if (!cards.length) {
    el.hand.innerHTML = `<div class="hand-empty">手札がありません</div>`
    return
  }
  el.hand.innerHTML = cards.map((id, i) => {
    const selected = sheet?.kind === 'hand' && sheet.handIndex === i
    return `<div class="hand-slot" data-hand="${i}" style="height:100%;flex:0 0 auto;display:flex">${cardHTML(id, { sel: selected })}</div>`
  }).join('')
  el.hand.scrollLeft = scroll
}

function btn(label, act, cls = '', disabled = false) {
  return `<button class="btn ${cls}" data-act="${act}"${disabled ? ' disabled' : ''}>${label}</button>`
}

function renderFooter() {
  if (!view) return
  let hint = ''
  let buttons = ''
  const me = mySeat
  const myTurn = view.started && !view.over && view.active === me
  const online = opponentOnline()

  if (tribute) {
    const n = tribute.chosen.length
    hint = `<b>生贄を選択</b> ・ ${n}/${tribute.need}体`
    buttons = `${btn('キャンセル', 'tribute-cancel', 'ghost')}${btn(tribute.faceDown ? 'セットする' : '召喚する', 'tribute-ok', 'primary', n !== tribute.need)}`
  } else if (target) {
    hint = target.kind === 'attack' ? '<b>攻撃対象を選択</b>' : '<b>魔法の対象を選択</b>'
    const direct = target.kind === 'attack' && view.field[opponentSeat()].every(x => !x)
    buttons = `${btn('キャンセル', 'cancel-target', 'ghost')}${direct ? btn('直接攻撃', 'direct', 'attack') : ''}`
  } else if (!view.started) {
    hint = '対戦相手が参加すると、自動でデュエルが始まります。'
    buttons = `${btn('遊び方', 'rules', 'ghost')}${btn('招待する', 'invite', 'primary')}`
  } else if (view.over) {
    hint = view.winner === me ? '<b>あなたの勝利</b> ・ 結果を確認できます' : '<b>敗北</b> ・ 結果を確認できます'
    buttons = `${btn('結果', 'show-result', 'ghost')}${mySeat === 0 ? btn('再戦する', 'rematch', 'primary') : btn('待機中', 'none', 'primary', true)}`
  } else if (!online) {
    hint = '相手の接続を待っています。'
    buttons = btn('招待する', 'invite', 'ghost')
  } else if (!myTurn) {
    hint = `相手のターンです ・ ${phaseLabel(view.phase)}`
    buttons = btn('ログ', 'log', 'ghost')
  } else if (view.phase === 'main') {
    hint = `メイン ・ 召喚 ${view.summonUsed[me] ? '済' : '可'} ・ 魔法 ${view.spellUsed[me] ? '済' : '可'}`
    if (view.turn === 1) hint += ' ・ 先攻1ターン目はバトル不可'
    buttons = `${btn('ターン終了', 'end', 'ghost')}${btn('バトルへ', 'battle', 'primary', view.turn === 1)}`
  } else if (view.phase === 'battle') {
    hint = 'バトル ・ 攻撃するモンスターを選択'
    buttons = btn('ターン終了', 'end', 'primary')
  } else {
    hint = 'デュエル進行中'
  }
  if (pending) hint += ' ・ 同期中…'
  el.hint.innerHTML = hint
  el.actionBtns.innerHTML = buttons
}

function logLine(entry) {
  if (entry.p < 0) return entry.text
  return `${entry.p === mySeat ? 'あなた' : view.names[entry.p]}：${entry.text}`
}

function renderLog() {
  if (!view?.log?.length) {
    el.logText.textContent = '—'
    return
  }
  const line = logLine(view.log[view.log.length - 1])
  if (line !== lastLog) {
    lastLog = line
    el.logText.textContent = line
    el.logTicker.classList.remove('flash')
    void el.logTicker.offsetWidth
    el.logTicker.classList.add('flash')
  }
  if (!el.logModal.hidden) renderLogList()
}

function renderLogList() {
  if (!view) return
  el.logList.innerHTML = view.log.map(entry => {
    const cls = entry.p < 0 ? 'sys' : entry.p === mySeat ? 'me' : 'opp'
    return `<div class="${cls}">${logLine(entry)}</div>`
  }).join('')
  el.logList.scrollTop = el.logList.scrollHeight
}

function render() {
  if (!view) return
  renderHeader()
  renderWaiting()
  renderSides()
  renderBoard()
  renderHand()
  renderFooter()
  renderLog()
  if (el.inviteModal.hidden === false) updateInvite()
  if (!el.menuModal.hidden) updateMenu()
  if (!el.resultModal.hidden) updateResult()
  maybeResult()
}

/* ---------------- animations ---------------- */

function animate(events) {
  if (!events?.length) return
  const fresh = events.filter(e => e.id > lastEv)
  if (!fresh.length) return
  lastEv = fresh[fresh.length - 1].id
  fresh.forEach((event, i) => {
    setTimeout(() => playEvent(event), i * 130)
  })
}

function findUid(uid) {
  return el.board.querySelector(`[data-uid="${uid}"]`)
}

function zoneEl(p, z) {
  return el.board.querySelector(`[data-zone="${p}-${z}"]`)
}

function playEvent(event) {
  const me = mySeat
  if (event.type === 'summon') {
    findUid(event.uid)?.classList.add('spawn')
    sfx.play('summon')
  } else if (event.type === 'set') {
    findUid(event.uid)?.classList.add('spawn')
    sfx.play('set')
  } else if (event.type === 'flip' || event.type === 'position') {
    findUid(event.uid)?.classList.add('spawn')
    sfx.play('set')
  } else if (event.type === 'cast') {
    sfx.play('cast')
    const z = zoneEl(event.targetP, event.zone)
    if (z) {
      z.classList.add('hitflash')
      setTimeout(() => z.classList.remove('hitflash'), 360)
    }
  } else if (event.type === 'attack') {
    sfx.play('attack')
    findUid(event.uid)?.classList.add('lunge')
    const z = zoneEl(event.targetP, event.targetZone)
    if (z) {
      z.classList.add('impact')
      setTimeout(() => z.classList.remove('impact'), 360)
    }
    el.board.closest('#app').classList.add('shake')
    setTimeout(() => el.board.closest('#app').classList.remove('shake'), 360)
    setTimeout(() => sfx.play('hit'), 150)
  } else if (event.type === 'destroy') {
    shards(event.p, event.zone)
  } else if (event.type === 'damage') {
    sfx.play('damage')
    const node = event.p === me ? el.youLp : el.oppLp
    const r = node.getBoundingClientRect()
    floatText(`-${event.amount}`, r.left + r.width / 2, r.top - 4)
    const app = el.board.closest('#app')
    app.classList.add('flash')
    setTimeout(() => app.classList.remove('flash'), 320)
  } else if (event.type === 'turn') {
    sfx.play('turn')
    el.turnPill.classList.remove('pulse')
    void el.turnPill.offsetWidth
    el.turnPill.classList.add('pulse')
    setTimeout(() => el.turnPill.classList.remove('pulse'), 650)
  } else if (event.type === 'begin') {
    sfx.play('turn')
  } else if (event.type === 'over') {
    setTimeout(() => {
      showResult()
      sfx.play(event.winner === me ? 'win' : 'lose')
    }, 650)
  }
}

function floatText(text, x, y, cls = '') {
  const node = document.createElement('div')
  node.className = `float ${cls}`
  node.textContent = text
  node.style.left = `${x}px`
  node.style.top = `${y}px`
  document.body.appendChild(node)
  setTimeout(() => node.remove(), 1000)
}

function shards(p, z) {
  const zEl = zoneEl(p, z)
  if (!zEl) return
  const r = zEl.getBoundingClientRect()
  let layer = document.querySelector('.shards')
  if (!layer) {
    layer = document.createElement('div')
    layer.className = 'shards'
    document.body.appendChild(layer)
  }
  for (let i = 0; i < 9; i++) {
    const shard = document.createElement('i')
    shard.className = 'shard'
    shard.style.left = `${r.left + r.width / 2}px`
    shard.style.top = `${r.top + r.height / 2}px`
    shard.style.setProperty('--dx', `${(Math.random() - 0.5) * 120}px`)
    shard.style.setProperty('--dy', `${(Math.random() - 0.6) * 120}px`)
    shard.style.setProperty('--rot', `${(Math.random() - 0.5) * 360}deg`)
    layer.appendChild(shard)
    setTimeout(() => shard.remove(), 700)
  }
  sfx.play('hit')
}

/* ---------------- actions ---------------- */

function toast(message, isError = false) {
  el.toast.textContent = message
  el.toast.classList.toggle('error', isError)
  el.toast.classList.add('show')
  clearTimeout(toast.timer)
  toast.timer = setTimeout(() => el.toast.classList.remove('show'), 2400)
}

function canAct() {
  if (!view) return false
  if (!view.started) { toast('対戦相手を待っています'); return false }
  if (view.over) { toast('デュエルは終了しています'); return false }
  if (view.active !== mySeat) { toast('あなたのターンではありません', true); return false }
  if (!opponentOnline()) { toast('相手の接続を待っています', true); return false }
  return true
}

function sendAction(action) {
  if (!canAct()) return false
  sfx.play('tap')
  if (role === 'host') {
    hostApply(mySeat, action)
  } else {
    pending = true
    clearTimeout(pendingTimer)
    pendingTimer = setTimeout(() => { pending = false; renderFooter() }, 3000)
    if (!net?.sendAction({ ...action, actionId: makeId() })) { pending = false; renderFooter() }
    else renderFooter()
  }
  sheet = null
  target = null
  tribute = null
  closeSheet()
  render()
  return true
}

function surrender() {
  if (!view) return
  if (!view.started) { toast('デュエルはまだ始まっていません', true); return }
  if (view.over) { toast('デュエルは終了しています', true); return }
  sfx.play('tap')
  if (role === 'host') {
    hostApply(mySeat, { t: 'surrender' })
  } else {
    pending = true
    clearTimeout(pendingTimer)
    pendingTimer = setTimeout(() => { pending = false; renderFooter() }, 3000)
    if (!net?.sendAction({ t: 'surrender', actionId: makeId() })) { pending = false; renderFooter() }
    else renderFooter()
  }
  sheet = null
  target = null
  tribute = null
  closeSheet()
  render()
}

function rematch() {
  if (role !== 'host' || mySeat !== 0) return
  if (!view?.over) return
  sfx.play('tap')
  hostApply(0, { t: 'rematch' })
}

function hostApply(seat, action) {
  const result = applyAction(engine, seat, action)
  if (!result.ok) {
    toast(result.error, true)
    return false
  }
  if (action.t === 'rematch') {
    resultOpen = false
    el.resultModal.hidden = true
    lastLp = [null, null]
  }
  refreshHost()
  render()
  animate(view.events)
  publishGuestView()
  return true
}

function onGuestView(incoming) {
  if (!incoming || incoming.room !== room) return
  if (incoming.guestId && incoming.guestId !== myId && incoming.guestOnline) {
    hideBoot()
    el.offlineReason.textContent = 'このルームは満室です。別のルームを作成してください。'
    el.offlineModal.hidden = false
    return
  }
  if (incoming.seq < lastSeq) return
  if (incoming.seq === lastSeq) {
    if (view) {
      view.hostOnline = net?.hostOnline ?? view.hostOnline
      renderWaiting()
    }
    return
  }
  const first = lastSeq === -1
  lastSeq = incoming.seq
  view = incoming
  view.hostOnline = !!net?.hostOnline
  view.guestOnline = true
  pending = false
  hideBoot()
  el.offlineModal.hidden = true
  render()
  if (first) {
    lastEv = view.ev
    if (view.events?.length) animate(view.events)
  } else {
    animate(view.events)
  }
}

/* ---------------- sheets ---------------- */

function openSheet(html) {
  el.sheetBody.innerHTML = html
  el.sheetModal.hidden = false
}

function closeSheet() {
  el.sheetModal.hidden = true
  sheet = null
  if (view) render()
}

function openHandSheet(index) {
  if (!view?.hands[mySeat].cards) return
  const id = view.hands[mySeat].cards[index]
  if (!id) return
  const c = CARDS[id]
  sheet = { kind: 'hand', handIndex: index }
  target = null
  tribute = null
  const myTurn = view.started && !view.over && view.active === mySeat
  const main = myTurn && view.phase === 'main'
  const req = c.kind === 'monster' ? tributeCount(c.lv) : 0
  const fieldCount = view.field[mySeat].filter(Boolean).length
  const canSummon = main && !view.summonUsed[mySeat] && fieldCount + 1 - req <= 4 && fieldCount >= req
  const canSpell = main && c.kind === 'spell' && !view.spellUsed[mySeat]
  let actions = ''
  if (c.kind === 'monster') {
    if (canSummon) {
      actions += `<button class="btn primary" data-sact="summon">${req ? `生贄${req}体で召喚` : '攻撃表示で召喚'}</button>`
      actions += `<button class="btn ghost" data-sact="set">${req ? `生贄${req}体でセット` : '裏側守備でセット'}</button>`
    } else {
      actions += `<p class="sheet-note">${!myTurn ? 'あなたのターンではありません。' : view.phase !== 'main' ? 'メインフェイズではありません。' : view.summonUsed[mySeat] ? 'このターンはもう召喚・セットしています。' : fieldCount < req ? `生贄が${req}体必要です。` : 'モンスターゾーンが足りません。'}</p>`
    }
  } else {
    if (canSpell) actions += `<button class="btn primary" data-sact="cast">${c.kind === 'spell' && id !== 'heal' ? '発動して対象を選択' : '発動する'}</button>`
    else actions += `<p class="sheet-note">${!myTurn ? 'あなたのターンではありません。' : view.phase !== 'main' ? 'メインフェイズではありません。' : 'このターンはもう魔法を使っています。'}</p>`
  }
  actions += `<button class="btn ghost" data-sact="close">閉じる</button>`
  const stats = c.kind === 'monster'
    ? `<div class="sheet-stats"><span>ATK<b>${c.atk}</b></span><span>DEF<b>${c.def}</b></span></div>`
    : `<div class="sheet-stats"><span>種類<b>魔法</b></span></div>`
  openSheet(`
    <div class="sheet-top">
      <div class="sheet-preview">${cardHTML(id)}</div>
      <div class="sheet-info">
        <div class="eyebrow">${c.kind === 'spell' ? 'MAGIC CARD' : 'MONSTER CARD'}</div>
        <div class="sheet-title">${c.name}</div>
        <div class="sheet-meta">${c.kind === 'spell' ? '魔法 ・ 1ターンに1回' : `Lv${c.lv} ・ ${c.race}`}</div>
        ${stats}
      </div>
    </div>
    <p class="sheet-text">${c.text}</p>
    <div class="sheet-actions">${actions}</div>
  `)
}

function openFieldSheet(uid) {
  const p = mySeat
  const z = view.field[p].findIndex(x => x && x.uid === uid)
  if (z < 0) return
  const slot = view.field[p][z]
  const c = CARDS[slot.card]
  sheet = { kind: 'field', uid, p, z }
  target = null
  tribute = null
  const myTurn = view.started && !view.over && view.active === mySeat
  const main = myTurn && view.phase === 'main'
  const battle = myTurn && view.phase === 'battle'
  const canAttack = battle && !slot.faceDown && slot.pos === 'atk' && !slot.attacked && !slot.changed && view.turn > 1
  let actions = ''
  if (slot.faceDown && main) actions += `<button class="btn primary" data-sact="flip">反転召喚（攻撃表示）</button>`
  if (!slot.faceDown && main && !slot.changed) {
    if (slot.pos === 'atk') actions += `<button class="btn ghost" data-sact="pos-def">守備表示に変更</button>`
    else actions += `<button class="btn ghost" data-sact="pos-atk">攻撃表示に変更</button>`
  }
  if (canAttack) actions += `<button class="btn attack" data-sact="attack">このモンスターで攻撃</button>`
  if (!actions) {
    actions += `<p class="sheet-note">${!myTurn ? 'あなたのターンではありません。' : slot.faceDown ? 'このカードは裏側守備表示です。' : slot.changed ? 'このターンは表示形式を変更済みです。' : slot.attacked ? 'このモンスターはもう攻撃しました。' : '現在できる操作はありません。'}</p>`
  }
  actions += `<button class="btn ghost" data-sact="close">閉じる</button>`
  openSheet(`
    <div class="sheet-top">
      <div class="sheet-preview">${cardHTML(slot.card, { atk: slot.atk, def: slot.def, mod: slot.mod })}</div>
      <div class="sheet-info">
        <div class="eyebrow">${slot.faceDown ? 'SET MONSTER' : slot.pos === 'atk' ? 'ATTACK POSITION' : 'DEFENSE POSITION'}</div>
        <div class="sheet-title">${c.name}</div>
        <div class="sheet-meta">Lv${c.lv} ・ ${c.race} ・ ${slot.faceDown ? '裏側守備' : slot.pos === 'atk' ? '攻撃表示' : '守備表示'}</div>
        <div class="sheet-stats"><span>ATK<b>${slot.atk ?? c.atk}</b></span><span>DEF<b>${slot.def ?? c.def}</b></span></div>
      </div>
    </div>
    <p class="sheet-text">${c.text}</p>
    <div class="sheet-actions">${actions}</div>
  `)
}

function openOpponentSheet(p, z) {
  const slot = view.field[p][z]
  if (!slot) return
  sheet = { kind: 'opponent', uid: slot.uid, p, z }
  target = null
  tribute = null
  if (slot.faceDown) {
    openSheet(`
      <div class="eyebrow">OPPONENT SET CARD</div>
      <div class="sheet-title">裏側守備表示</div>
      <p class="sheet-text">相手のセットカードです。攻撃するまで正体は分かりません。</p>
      <div class="sheet-actions"><button class="btn ghost" data-sact="close">閉じる</button></div>
    `)
    return
  }
  const c = CARDS[slot.card]
  openSheet(`
    <div class="sheet-top">
      <div class="sheet-preview">${cardHTML(slot.card, { atk: slot.atk, def: slot.def, mod: slot.mod })}</div>
      <div class="sheet-info">
        <div class="eyebrow">OPPONENT MONSTER</div>
        <div class="sheet-title">${c.name}</div>
        <div class="sheet-meta">Lv${c.lv} ・ ${c.race} ・ ${slot.pos === 'atk' ? '攻撃表示' : '守備表示'}</div>
        <div class="sheet-stats"><span>ATK<b>${slot.atk ?? c.atk}</b></span><span>DEF<b>${slot.def ?? c.def}</b></span></div>
      </div>
    </div>
    <p class="sheet-text">${c.text}</p>
    <div class="sheet-actions"><button class="btn ghost" data-sact="close">閉じる</button></div>
  `)
}

/* ---------------- result ---------------- */

function maybeResult() {
  if (!view?.over) {
    if (resultOpen) {
      resultOpen = false
      el.resultModal.hidden = true
    }
    return
  }
  if (resultOpen) return
  resultOpen = true
  clearTimeout(resultTimer)
  resultTimer = setTimeout(showResult, 750)
}

function updateResult() {
  if (!view) return
  const win = view.winner === mySeat
  el.resultModal.querySelector('.modal').classList.toggle('lose', !win)
  el.resultTitle.textContent = win ? '勝利' : '敗北'
  el.resultEyebrow.textContent = win ? 'YOU WIN' : 'YOU LOSE'
  el.resultReason.textContent = view.reason || (win ? '相手を打ち破りました。' : 'デュエルに敗れました。')
  el.resultStats.innerHTML = `<span>あなたのLP<b>${view.lp[mySeat]}</b></span><span>相手のLP<b>${view.lp[opponentSeat()]}</b></span>`
  el.rematchBtn.hidden = mySeat !== 0
  el.rematchNote.textContent = mySeat === 0 ? '同じメンバーで、もう一度デュエルできます。' : 'ホストが再戦を開始するまでお待ちください。'
}

function showResult() {
  if (!view?.over) return
  updateResult()
  el.resultModal.hidden = false
}

/* ---------------- invite / menu ---------------- */

function updateInvite() {
  el.inviteCode.textContent = room
  el.inviteLink.value = currentLink()
  const online = opponentOnline()
  el.inviteStatus.textContent = view?.over ? 'デュエルは終了しました' : view?.started ? (online ? '対戦中です' : '相手の接続を待っています') : (conn === 'online' ? '対戦相手を待っています' : 'オンラインに接続しています…')
}

function updateMenu() {
  el.soundState.textContent = sfx.enabled ? 'ON' : 'OFF'
  el.tiltState.textContent = tiltOn ? 'ON' : 'OFF'
  el.connInfo.textContent = `接続: ${conn === 'online' ? 'オンライン' : conn === 'reconnecting' ? '再接続中' : conn === 'failed' ? 'オフライン' : '接続中'} ・ ${net?.brokerLabel || '—'} ・ ルーム ${room}`
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(currentLink())
    toast('招待リンクをコピーしました')
  } catch {
    el.inviteLink.focus()
    el.inviteLink.select()
    try { document.execCommand('copy'); toast('招待リンクをコピーしました') } catch { toast('リンクを選択してコピーしてください', true) }
  }
}

async function toggleTilt() {
  if (tiltOn) {
    tiltOn = false
    localStorage.setItem('ad_tilt', 'off')
    window.removeEventListener('deviceorientation', onOrient)
    el.board.style.setProperty('--rx', '4deg')
    el.board.style.setProperty('--ry', '0deg')
    toast('傾き操作をオフにしました')
    updateMenu()
    return
  }
  if (typeof DeviceOrientationEvent === 'undefined') {
    toast('この端末は傾き操作に対応していません', true)
    return
  }
  try {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      const permission = await DeviceOrientationEvent.requestPermission()
      if (permission !== 'granted') { toast('傾き操作の許可が必要です', true); return }
    }
    if (!orientBound) {
      window.addEventListener('deviceorientation', onOrient)
      orientBound = true
    }
    tiltOn = true
    localStorage.setItem('ad_tilt', 'on')
    toast('端末を傾けて盤面を動かせます')
    updateMenu()
  } catch {
    toast('傾き操作を有効にできませんでした', true)
  }
}

let orientRaf = 0
function onOrient(e) {
  if (!tiltOn) return
  if (orientRaf) return
  orientRaf = requestAnimationFrame(() => {
    orientRaf = 0
    const gamma = clamp(e.gamma || 0, -28, 28)
    const beta = clamp((e.beta || 45) - 45, -28, 28)
    el.board.style.setProperty('--ry', `${(gamma * 0.2).toFixed(2)}deg`)
    el.board.style.setProperty('--rx', `${(4 - beta * 0.1).toFixed(2)}deg`)
  })
}

/* ---------------- boot / net ---------------- */

function hideBoot() {
  clearTimeout(bootTimer)
  el.boot.classList.add('hide')
  setTimeout(() => { el.boot.hidden = true }, 600)
}

function setStatus(status) {
  conn = status
  if (status === 'failed') {
    hideBoot()
    el.offlineModal.hidden = false
    el.offlineReason.textContent = 'オンライン専用です。通信環境を確認して再接続してください。'
  }
  if (status === 'online' && view) {
    el.offlineModal.hidden = true
    if (role === 'host') { refreshHost(); publishGuestView() }
  }
  renderWaiting()
  updateMenu()
}

function startNet() {
  net = new Net({
    room, role, myId, brokerIndex: preferredBroker,
    onStatus: setStatus,
    onView: onGuestView,
    onAct: message => {
      if (message.t === 'hello') handleHello(message)
      else handleGuestAction(message)
    },
    onPresence: presence => {
      if (presence.guest !== undefined) {
        if (net) net.guestOnline = presence.guest
        if (role === 'host') { refreshHost(); render(); publishGuestView() }
      }
      if (presence.host !== undefined) {
        if (view) { view.hostOnline = presence.host; renderWaiting(); renderFooter() }
      }
    },
    onError: message => toast(message, true),
    onConnect: () => {
      if (role === 'host') {
        refreshHost()
        publishGuestView()
        render()
      } else {
        net.sendHello()
      }
    }
  })
  net.connect()
}

function handleHello(message) {
  if (!message.from) return
  const known = engine.guestId
  if (known && known !== message.from && net.guestOnline) {
    net.sendError(message.from, 'このルームは満室です')
    return
  }
  if (known !== message.from) engine.guestId = message.from
  net.guestOnline = true
  net.guestSeen = Date.now()
  if (!engine.started) beginDuel(engine)
  refreshHost()
  render()
  animate(view.events)
  publishGuestView()
}

const seenActions = new Set()
function handleGuestAction(message) {
  if (!engine.guestId || message.from !== engine.guestId) return
  if (message.actionId) {
    if (seenActions.has(message.actionId)) return
    seenActions.add(message.actionId)
    if (seenActions.size > 300) seenActions.delete(seenActions.values().next().value)
  }
  const result = applyAction(engine, 1, message)
  if (!result.ok) {
    net.sendError(message.from, result.error)
    return
  }
  refreshHost()
  render()
  animate(view.events)
  publishGuestView()
}

/* ---------------- snow ---------------- */

function startSnow() {
  const canvas = $('#snow')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  let w = 0, h = 0, dpr = 1
  let flakes = []
  let raf = 0
  let t = 0
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    w = window.innerWidth
    h = window.innerHeight
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const count = reduce ? 30 : w < 600 ? 46 : 80
    flakes = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.9 + 0.5,
      vy: Math.random() * 0.45 + 0.15,
      vx: Math.random() * 0.3 - 0.15,
      a: Math.random() * 0.5 + 0.2,
      p: Math.random() * Math.PI * 2
    }))
  }
  function frame() {
    if (document.hidden) { raf = 0; return }
    t += 0.006
    ctx.clearRect(0, 0, w, h)
    for (const f of flakes) {
      if (!reduce) {
        f.y += f.vy
        f.x += f.vx + Math.sin(t + f.p) * 0.16
        if (f.y > h + 4) { f.y = -4; f.x = Math.random() * w }
        if (f.x > w + 4) f.x = -4
        if (f.x < -4) f.x = w + 4
      }
      ctx.beginPath()
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(214, 245, 255, ${f.a})`
      ctx.fill()
    }
    raf = requestAnimationFrame(frame)
  }
  resize()
  window.addEventListener('resize', resize)
  if (!reduce) raf = requestAnimationFrame(frame)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !raf && !reduce) raf = requestAnimationFrame(frame)
  })
}

/* ---------------- events ---------------- */

document.addEventListener('click', e => {
  const actBtn = e.target.closest('[data-act]')
  if (actBtn) {
    handleAct(actBtn.dataset.act)
    return
  }
  const sact = e.target.closest('[data-sact]')
  if (sact) {
    handleSheetAct(sact.dataset.sact)
    return
  }
  const hand = e.target.closest('[data-hand]')
  if (hand) {
    sfx.play('tap')
    openHandSheet(Number(hand.dataset.hand))
    return
  }
  const zone = e.target.closest('[data-zone]')
  if (zone) {
    const [p, z] = zone.dataset.zone.split('-').map(Number)
    onZone(p, z)
    return
  }
  if (e.target.classList.contains('scrim')) {
    const id = e.target.id
    if (id === 'resultModal' || id === 'offlineModal') return
    if (id === 'sheetModal') closeSheet()
    else e.target.hidden = true
  }
})

function handleAct(act) {
  if (act === 'invite') {
    updateInvite()
    el.inviteModal.hidden = false
    return
  }
  if (act === 'menu') {
    updateMenu()
    el.menuModal.hidden = false
    return
  }
  if (act === 'close') {
    closeAll()
    return
  }
  if (act === 'copy') { copyLink(); return }
  if (act === 'open-tab') { window.open(currentLink(), '_blank', 'noopener'); return }
  if (act === 'sound') { sfx.toggle(); updateMenu(); return }
  if (act === 'tilt') { toggleTilt(); return }
  if (act === 'rules') { el.rulesModal.hidden = false; el.menuModal.hidden = true; return }
  if (act === 'log') { renderLogList(); el.logModal.hidden = false; el.menuModal.hidden = true; return }
  if (act === 'surrender') { el.confirmModal.hidden = false; el.menuModal.hidden = true; return }
  if (act === 'surrender-confirm') {
    el.confirmModal.hidden = true
    surrender()
    return
  }
  if (act === 'newroom') {
    if (net) net.disconnect()
    location.href = location.pathname
    return
  }
  if (act === 'retry') {
    el.offlineModal.hidden = true
    location.reload()
    return
  }
  if (act === 'rematch') {
    rematch()
    return
  }
  if (act === 'show-result') { showResult(); return }
  if (act === 'battle') { sendAction({ t: 'battle' }); return }
  if (act === 'end') { sendAction({ t: 'end' }); return }
  if (act === 'direct') {
    if (target?.kind === 'attack') sendAction({ t: 'attack', uid: target.uid, targetUid: null })
    return
  }
  if (act === 'cancel-target') { target = null; render(); return }
  if (act === 'tribute-cancel') { tribute = null; render(); return }
  if (act === 'tribute-ok') {
    if (!tribute || tribute.chosen.length !== tribute.need) return
    const action = { t: tribute.faceDown ? 'set' : 'summon', handIndex: tribute.handIndex, tributes: tribute.chosen.slice() }
    sendAction(action)
    return
  }
  if (act === 'none') return
}

function handleSheetAct(act) {
  if (act === 'close') { closeSheet(); return }
  if (!sheet) return
  if (act === 'summon' || act === 'set') {
    const index = sheet.handIndex
    const id = view.hands[mySeat].cards[index]
    const req = tributeCount(CARDS[id].lv)
    if (req > 0) {
      tribute = { handIndex: index, need: req, chosen: [], faceDown: act === 'set' }
      closeSheet()
      render()
      toast(`生贄にするモンスターを${req}体選択`)
      return
    }
    sendAction({ t: act, handIndex: index, tributes: [] })
    return
  }
  if (act === 'cast') {
    const index = sheet.handIndex
    const id = view.hands[mySeat].cards[index]
    if (id === 'heal') {
      sendAction({ t: 'cast', handIndex: index })
    } else {
      target = { kind: 'cast', handIndex: index, cardId: id }
      closeSheet()
      render()
      toast('対象のモンスターを選択')
    }
    return
  }
  if (act === 'flip') {
    sendAction({ t: 'position', uid: sheet.uid, pos: 'atk' })
    return
  }
  if (act === 'pos-def') {
    sendAction({ t: 'position', uid: sheet.uid, pos: 'def' })
    return
  }
  if (act === 'pos-atk') {
    sendAction({ t: 'position', uid: sheet.uid, pos: 'atk' })
    return
  }
  if (act === 'attack') {
    target = { kind: 'attack', uid: sheet.uid }
    closeSheet()
    render()
    const oppHas = view.field[opponentSeat()].some(Boolean)
    toast(oppHas ? '攻撃対象を選択' : '直接攻撃できます')
    return
  }
}

function onZone(p, z) {
  if (!view) return
  const slot = view.field[p][z]
  if (target) {
    if (!slot) return
    if (!isTargetable(p, z, slot)) { toast('その対象には選べません', true); return }
    if (target.kind === 'attack') {
      sendAction({ t: 'attack', uid: target.uid, targetUid: slot.uid })
    } else if (target.kind === 'cast') {
      sendAction({ t: 'cast', handIndex: target.handIndex, targetUid: slot.uid })
    }
    return
  }
  if (tribute) {
    if (p !== mySeat || !slot) return
    const i = tribute.chosen.indexOf(slot.uid)
    if (i >= 0) tribute.chosen.splice(i, 1)
    else if (tribute.chosen.length < tribute.need) tribute.chosen.push(slot.uid)
    else { toast(`生贄は${tribute.need}体までです`, true); return }
    sfx.play('tap')
    render()
    return
  }
  if (!slot) return
  sfx.play('tap')
  if (p === mySeat) openFieldSheet(slot.uid)
  else openOpponentSheet(p, z)
}

function closeAll() {
  $$('.scrim').forEach(scrim => {
    if (scrim.id === 'offlineModal' || scrim.id === 'resultModal') return
    scrim.hidden = true
  })
  sheet = null
  target = null
  tribute = null
  render()
}

window.addEventListener('pagehide', () => { if (net) net.disconnect() })
window.addEventListener('beforeunload', () => { if (net) net.disconnect() })

/* ---------------- init ---------------- */

el.roomCode.textContent = room
el.inviteCode.textContent = room
el.inviteLink.value = currentLink()
el.bootText.textContent = role === 'guest' ? `ルーム ${room} に接続しています` : 'ルームを生成しています'
startSnow()
if (tiltOn) {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission !== 'function') {
    window.addEventListener('deviceorientation', onOrient)
    orientBound = true
  } else {
    tiltOn = false
  }
}

if (role === 'host') {
  refreshHost()
  render()
  requestAnimationFrame(() => hideBoot())
} else {
  bootTimer = setTimeout(() => {
    hideBoot()
    if (!view) {
      el.offlineReason.textContent = 'ホストが見つかりません。ルームコードを確認するか、新しいルームを作成してください。'
      el.offlineModal.hidden = false
    }
  }, 12000)
}

startNet()

// A small, deliberately read-only debug surface for automated checks.
Object.defineProperty(window, '__arctic', {
  value: {
    get room() { return room },
    get role() { return role },
    get seat() { return mySeat },
    get connected() { return conn },
    get view() { return view },
    get engine() { return role === 'host' ? engine : null }
  }
})
