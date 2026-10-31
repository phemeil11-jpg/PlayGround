import { CARD_DEFS, RARITY } from './cards.js'
import {
  createDuel,
  applyAction,
  effectiveAtk,
  effectiveDef,
  canAttack,
  canChangePosition,
  validTargets,
  aiNextAction
} from './engine.js'
import { OnlineRoom } from './online.js'
import { SnowScene, Sfx, shatter, impact, floatText, ghostCard } from './fx.js'

const $ = selector => document.querySelector(selector)
const dom = {
  app: $('#app'),
  stage: $('#stage'),
  snow: $('#snow'),
  hud: $('#hud'),
  roomBtn: $('#roomBtn'),
  roomCode: $('#roomCode'),
  linkState: $('#linkState'),
  linkText: $('#linkText'),
  tiltBtn: $('#tiltBtn'),
  soundBtn: $('#soundBtn'),
  oppBar: $('#oppBar'),
  myBar: $('#myBar'),
  oppName: $('#oppName'),
  oppTag: $('#oppTag'),
  myName: $('#myName'),
  myTag: $('#myTag'),
  oppLp: $('#oppLp'),
  myLp: $('#myLp'),
  oppLpBar: $('#oppLpBar'),
  myLpBar: $('#myLpBar'),
  oppHandCount: $('#oppHandCount'),
  myHandCount: $('#myHandCount'),
  oppDeckCount: $('#oppDeckCount'),
  myDeckCount: $('#myDeckCount'),
  oppHand: $('#oppHand'),
  myHand: $('#myHand'),
  oppBoard: $('#oppBoard'),
  myBoard: $('#myBoard'),
  boardShell: $('#boardShell'),
  boardRound: $('#boardRound'),
  boardHint: $('#boardHint'),
  deckCount: $('#deckCount'),
  turnOwner: $('#turnOwner'),
  turnNo: $('#turnNo'),
  phaseLabel: $('#phaseLabel'),
  turnOrb: $('#turnOrb'),
  battleReadout: $('#battleReadout'),
  actionBar: $('#actionBar'),
  logList: $('#logList'),
  logRoom: $('#logRoom'),
  ticker: $('#ticker'),
  tickerText: $('#tickerText'),
  turnBanner: $('#turnBanner'),
  intro: $('#intro'),
  introRoom: $('#introRoom'),
  fxLayer: $('#fxLayer'),
  roomModal: $('#roomModal'),
  roomClose: $('#roomClose'),
  modalRoom: $('#modalRoom'),
  modalStatus: $('#modalStatus'),
  nameInput: $('#nameInput'),
  inviteInput: $('#inviteInput'),
  copyBtn: $('#copyBtn'),
  joinBtn: $('#joinBtn'),
  myRoomBtn: $('#myRoomBtn'),
  joinInput: $('#joinInput'),
  joinGo: $('#joinGo'),
  surrenderBtn: $('#surrenderBtn'),
  rematchBtn: $('#rematchBtn'),
  result: $('#result'),
  resultKicker: $('#resultKicker'),
  resultTitle: $('#resultTitle'),
  resultText: $('#resultText'),
  resultRematch: $('#resultRematch'),
  resultRoom: $('#resultRoom'),
  toast: $('#toast'),
  waiting: $('#waiting'),
  waitingText: $('#waitingText'),
  hostFallback: $('#hostFallback')
}

const safeGet = key => {
  try { return localStorage.getItem(key) } catch { return null }
}
const safeSet = (key, value) => {
  try { localStorage.setItem(key, value) } catch {}
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function randomCode(length = 6) {
  const bytes = new Uint8Array(length)
  if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes)
  else for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256)
  return Array.from(bytes, byte => ALPHABET[byte % ALPHABET.length]).join('')
}

const params = new URLSearchParams(location.search)
const urlRoom = (params.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)

let myPid = safeGet('arctic.pid')
if (!myPid) {
  myPid = `p${randomCode(10).toLowerCase()}`
  safeSet('arctic.pid', myPid)
}

let myName = safeGet('arctic.name') || '旅人'
let ownRoom = safeGet('arctic.room')
if (!ownRoom) {
  ownRoom = randomCode(6)
  safeSet('arctic.room', ownRoom)
}
ownRoom = ownRoom.toUpperCase()

let role = urlRoom && urlRoom !== ownRoom ? 'guest' : 'host'
let roomCode = (urlRoom || ownRoom).toUpperCase()

const scene = new SnowScene(dom.snow)
const sfx = new Sfx()

let state = role === 'host'
  ? createDuel({ mode: 'ai', room: roomCode, hostName: myName })
  : null

const ui = {
  selected: null,
  attackMode: false,
  placement: 'summon',
  pending: false,
  initial: true,
  seen: new Set(),
  prevLp: [4000, 4000],
  prevHand: [[], []],
  prevBoard: [[null, null, null, null], [null, null, null, null]],
  logRendered: 0,
  logFirstAt: null,
  lastEventId: 0,
  winnerShown: false,
  aiToken: 0,
  aiTimer: null,
  battleTimer: null,
  toastTimer: null,
  turnTimer: null,
  linkLive: false,
  guestSeen: 0,
  hostSeen: 0,
  waitTimer: null,
  hostLostNotified: false,
  nameSaveTimer: null
}

const viewSeat = () => (role === 'host' ? 0 : 1)
const opponentSeat = () => 1 - viewSeat()

const online = new OnlineRoom({
  room: roomCode,
  pid: myPid,
  name: myName,
  role,
  onMessage: handleMessage,
  onStatus: handleStatus
})

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function pad(n) {
  return String(n).padStart(2, '0')
}

function pushLog(target, text, tone = 'system') {
  target.log.push({ text, tone, at: Date.now() })
  if (target.log.length > 42) target.log.splice(0, target.log.length - 42)
}

function showToast(text, ms = 2300) {
  dom.toast.textContent = text
  dom.toast.classList.add('show')
  clearTimeout(ui.toastTimer)
  ui.toastTimer = setTimeout(() => dom.toast.classList.remove('show'), ms)
}

function haptic(pattern = 8) {
  try { navigator.vibrate?.(pattern) } catch {}
}

function cardEl(uid) {
  return document.querySelector(`.card[data-uid="${uid}"]`)
}

function zoneEl(seat, zone) {
  return document.querySelector(`.zone[data-seat="${seat}"][data-zone="${zone}"]`)
}

function barEl(seat) {
  return seat === viewSeat() ? dom.myBar : dom.oppBar
}

function barRect(seat) {
  return barEl(seat).getBoundingClientRect()
}

function zoneRect(seat, zone) {
  const z = zoneEl(seat, zone)
  return z ? z.getBoundingClientRect() : null
}

function resetUiForDuel() {
  cancelAI()
  ui.selected = null
  ui.attackMode = false
  ui.placement = 'summon'
  ui.pending = false
  ui.initial = true
  ui.seen.clear()
  ui.prevLp = [4000, 4000]
  ui.prevHand = [[], []]
  ui.prevBoard = [[null, null, null, null], [null, null, null, null]]
  ui.logRendered = 0
  ui.logFirstAt = null
  ui.lastEventId = 0
  ui.winnerShown = false
  ui.hostLostNotified = false
  dom.result.hidden = true
  dom.battleReadout.classList.remove('show')
  dom.logList.replaceChildren()
  dom.waiting.hidden = true
}

function cancelAI() {
  ui.aiToken += 1
  clearTimeout(ui.aiTimer)
  ui.aiTimer = null
}

function inviteUrl() {
  return `${location.origin === 'null' ? '' : location.origin}${location.pathname}?room=${roomCode}`
}

/* ------------------------------------------------------------------ */
/* Online                                                              */
/* ------------------------------------------------------------------ */

function handleStatus(status) {
  ui.linkLive = status === 'live'
  dom.linkState.dataset.state = status === 'live' ? 'live' : status === 'down' ? 'down' : 'retry'
  dom.linkText.textContent = status === 'live' ? 'LIVE' : status === 'down' ? 'LINK DOWN' : 'LINK…'
  if (status === 'live') {
    online.setMeta({ guestId: state?.guestId || null, mode: state?.mode || 'ai' })
    online.sendHello()
    if (role === 'host' && state) publishState()
  }
  renderRoom()
}

function publishState() {
  if (role !== 'host' || !state || state.mode !== 'online' || !state.guestId) return
  online.setMeta({ guestId: state.guestId, mode: state.mode })
  online.publish({ type: 'state', state })
}

function handleMessage(msg) {
  if (!msg || msg.from === myPid) return
  if (role === 'guest') {
    if (msg.role === 'host') {
      ui.hostSeen = Date.now()
      if (msg.type === 'hello' && !state) online.sendHello()
    }
    if ((msg.type === 'state' || msg.type === 'welcome') && msg.state) {
      applyRemoteState(msg.state)
      ui.hostSeen = Date.now()
      return
    }
    if (msg.type === 'full') {
      showToast('このルームは満員です。別のルームコードを試してください。', 3600)
      return
    }
    if (msg.type === 'error') {
      ui.pending = false
      renderActionBar()
      showToast(msg.message || '操作を受理できませんでした。')
      return
    }
    if (msg.type === 'hostBye') {
      showToast('ホストが退出しました。再接続を待っています。', 3600)
    }
    return
  }

  // Host
  if (msg.type === 'hello' || (msg.type === 'beat' && msg.role === 'guest')) {
    handleGuestHello(msg)
    return
  }
  if (msg.type === 'intent') {
    handleIntent(msg)
    return
  }
  if (msg.type === 'rematch') {
    if (state?.mode === 'online') startNewDuel('online')
    return
  }
  if (msg.type === 'bye') {
    if (state?.guestId === msg.from) dropGuest(msg.from)
  }
}

function handleGuestHello(msg) {
  if (!state) return
  ui.guestSeen = Date.now()
  if (state.guestId && state.guestId !== msg.from) {
    online.publish({ type: 'full' })
    return
  }
  if (state.guestId === msg.from) {
    if (msg.name && msg.name !== state.players[1].name) {
      state.players[1].name = msg.name
      render()
    }
    online.setMeta({ guestId: msg.from, mode: 'online' })
    online.publish({ type: 'welcome', state })
    return
  }

  cancelAI()
  state = createDuel({
    mode: 'online',
    guestId: msg.from,
    guestName: msg.name || '対戦者',
    room: roomCode,
    hostName: myName
  })
  pushLog(state, `対戦者「${state.players[1].name}」が入室。`, 'system')
  online.setMeta({ guestId: msg.from, mode: 'online' })
  ui.guestSeen = Date.now()
  resetUiForDuel()
  render()
  publishState()
  online.publish({ type: 'welcome', state })
  showToast('対戦者が入室しました。新しいデュエルを開始します。', 3200)
  showTurnBanner('ONLINE DUEL', false)
}

function handleIntent(msg) {
  if (!state || state.mode !== 'online' || state.guestId !== msg.from) return
  ui.guestSeen = Date.now()
  const action = msg.action
  if (!action || typeof action !== 'object') return
  if (action.type === 'rename') {
    const name = String(action.name || '').trim().slice(0, 14)
    if (name) {
      state.players[1].name = name
      render()
      publishState()
    }
    return
  }
  if (state.active !== 1) {
    online.publish({ type: 'error', message: 'あなたのターンではありません。' })
    return
  }
  const result = applyAction(state, 1, action)
  if (!result.ok) {
    online.publish({ type: 'error', message: result.error })
    return
  }
  afterAction()
}

function applyRemoteState(next) {
  if (!next || typeof next !== 'object' || !next.players) return
  // A rematch restarts seq at 1, so only compare seq within the same duel.
  const sameDuel = state && next.startedAt === state.startedAt
  if (sameDuel && next.seq < state.seq) return
  if (!sameDuel) resetUiForDuel()
  state = next
  ui.pending = false
  ui.hostSeen = Date.now()
  dom.waiting.hidden = true
  if (state.guestId !== myPid && state.mode === 'ai') {
    online.sendHello()
  }
  render()
  if (state.winner !== null) {
    setTimeout(showResult, 750)
  }
}

function dropGuest(id) {
  if (!state || state.guestId !== id) return
  state.guestId = null
  state.mode = 'ai'
  state.players[1].name = '北極の守護者'
  state.players[1].tag = 'AI WARDEN'
  pushLog(state, '対戦者の接続が切れました。AIが引き継ぎます。', 'system')
  online.setMeta({ guestId: null, mode: 'ai' })
  ui.pending = false
  render()
  showToast('対戦者の接続が切れました。AIが引き継ぎます。', 3200)
  if (state.active === 1 && state.winner === null) scheduleAI(1000)
}

/* ------------------------------------------------------------------ */
/* Duel actions                                                        */
/* ------------------------------------------------------------------ */

function dispatchAction(action) {
  if (!state || state.winner !== null) return
  if (role === 'guest') {
    if (state.active !== 1) {
      showToast('あなたのターンではありません。')
      return
    }
    if (!ui.linkLive) {
      showToast('ホストへの接続を待っています。')
      return
    }
    ui.pending = true
    online.publish({ type: 'intent', action })
    renderActionBar()
    setTimeout(() => {
      if (ui.pending) {
        ui.pending = false
        renderActionBar()
      }
    }, 3200)
    return
  }
  if (state.active !== 0) {
    showToast('あなたのターンではありません。')
    return
  }
  const result = applyAction(state, 0, action)
  if (!result.ok) {
    showToast(result.error)
    return
  }
  haptic(action.type === 'attack' ? 14 : 8)
  afterAction()
}

function afterAction() {
  render()
  publishState()
  if (state.winner !== null) {
    setTimeout(showResult, 850)
    return
  }
  if (state.mode === 'ai' && state.active === 1) scheduleAI()
}

function scheduleAI(delay = 950) {
  cancelAI()
  if (role !== 'host' || !state || state.mode !== 'ai' || state.winner !== null || state.active !== 1) return
  const token = ui.aiToken
  ui.aiTimer = setTimeout(() => runAIStep(token), delay)
}

function runAIStep(token) {
  if (token !== ui.aiToken || !state || state.mode !== 'ai' || state.winner !== null || state.active !== 1) return
  const action = aiNextAction(state)
  if (!action) return
  const result = applyAction(state, 1, action)
  if (!result.ok) {
    applyAction(state, 1, { type: 'endTurn' })
    afterAction()
    return
  }
  render()
  if (state.winner !== null) {
    setTimeout(showResult, 850)
    return
  }
  if (action.type === 'endTurn') return
  scheduleAI(980)
}

function startNewDuel(mode) {
  cancelAI()
  const guestId = mode === 'online' ? (state?.guestId || null) : null
  const guestName = mode === 'online' ? (state?.players[1].name || '対戦者') : ''
  if (mode === 'online' && !guestId) mode = 'ai'
  state = createDuel({
    mode,
    guestId,
    guestName,
    room: roomCode,
    hostName: myName
  })
  if (mode === 'online') pushLog(state, '再戦を開始。', 'system')
  online.setMeta({ guestId, mode })
  resetUiForDuel()
  render()
  publishState()
  showToast(mode === 'online' ? '再戦を開始しました。' : '新しいデュエルを開始しました。', 2400)
}

function rematch() {
  if (role === 'guest') {
    online.publish({ type: 'rematch' })
    showToast('再戦を要求しました。ホストの応答を待っています。', 2800)
    return
  }
  const mode = state?.mode === 'online' && state.guestId ? 'online' : 'ai'
  startNewDuel(mode)
}

function performAttack(targetZone) {
  if (!ui.selected || ui.selected.kind !== 'monster') return
  const { zone } = ui.selected
  dispatchAction({ type: 'attack', zone, targetZone })
  ui.selected = null
  ui.attackMode = false
  render()
}

function performSummon(zone) {
  if (!ui.selected || ui.selected.kind !== 'hand') return
  dispatchAction({
    type: 'summon',
    uid: ui.selected.uid,
    zone,
    faceDown: ui.placement === 'set'
  })
  ui.selected = null
  ui.attackMode = false
  render()
}

function performPosition(pos) {
  if (!ui.selected || ui.selected.kind !== 'monster') return
  const { zone } = ui.selected
  dispatchAction({ type: 'changePos', zone, pos })
  ui.selected = null
  ui.attackMode = false
  render()
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

function render() {
  if (!state) {
    renderWaiting()
    return
  }
  const meSeat = viewSeat()
  const oppSeat = opponentSeat()
  if (state.active !== meSeat || state.winner !== null) {
    ui.selected = null
    ui.attackMode = false
  }

  const oldRects = new Map()
  const oldCards = new Map()
  document.querySelectorAll('.zone .card[data-uid]').forEach(el => {
    oldRects.set(el.dataset.uid, el.getBoundingClientRect())
    oldCards.set(el.dataset.uid, el.cloneNode(true))
  })

  renderBars(meSeat, oppSeat)
  renderBoard(oppSeat, dom.oppBoard)
  renderBoard(meSeat, dom.myBoard)
  renderHand(meSeat)
  renderOppHand(oppSeat)
  renderCenter(meSeat, oppSeat)
  renderActionBar()
  renderLog()
  renderRoom()

  processEvent(oldRects, oldCards)

  ui.prevLp = [state.players[0].lp, state.players[1].lp]
  ui.prevHand = [state.players[0].hand.slice(), state.players[1].hand.slice()]
  ui.prevBoard = [state.players[0].board.slice(), state.players[1].board.slice()]
  ui.initial = false
  document.body.dataset.ready = '1'
}

function renderBars(meSeat, oppSeat) {
  const me = state.players[meSeat]
  const opp = state.players[oppSeat]
  dom.myName.textContent = me.name
  dom.oppName.textContent = opp.name
  dom.myTag.textContent = role === 'guest' ? 'YOU / GUEST' : role === 'host' ? 'YOU / HOST' : 'YOU'
  dom.oppTag.textContent = state.mode === 'online' ? 'ONLINE DUELIST' : 'AI WARDEN'
  dom.myHandCount.textContent = me.hand.length
  dom.oppHandCount.textContent = opp.hand.length
  dom.myDeckCount.textContent = me.deck.length
  dom.oppDeckCount.textContent = opp.deck.length
  setLp(dom.myLp, dom.myLpBar, me.lp, ui.prevLp[meSeat], meSeat)
  setLp(dom.oppLp, dom.oppLpBar, opp.lp, ui.prevLp[oppSeat], oppSeat)
  dom.myBar.classList.toggle('is-active', state.active === meSeat && state.winner === null)
  dom.oppBar.classList.toggle('is-active', state.active === oppSeat && state.winner === null)
}

function setLp(valueEl, barEl, lp, prev, seat) {
  const from = Number.isFinite(prev) ? prev : lp
  if (ui.initial) {
    valueEl.textContent = String(lp)
  } else if (from !== lp) {
    tweenNumber(valueEl, from, lp, 620)
    const bar = barEl.parentElement
    if (from > lp) {
      bar.classList.remove('hit')
      void bar.offsetWidth
      bar.classList.add('hit')
      setTimeout(() => bar.classList.remove('hit'), 620)
    } else if (from < lp) {
      bar.classList.remove('healed')
      void bar.offsetWidth
      bar.classList.add('healed')
      setTimeout(() => bar.classList.remove('healed'), 760)
    }
  } else {
    valueEl.textContent = String(lp)
  }
  barEl.style.width = `${Math.max(0, Math.min(100, (lp / 4000) * 100))}%`
  barEl.classList.toggle('low', lp <= 1000)
  valueEl.classList.toggle('low', lp <= 1000)
}

function tweenNumber(el, from, to, duration) {
  const start = performance.now()
  const delta = to - from
  const tick = now => {
    const t = Math.min(1, (now - start) / duration)
    const eased = 1 - Math.pow(1 - t, 3)
    el.textContent = String(Math.round(from + delta * eased))
    if (t < 1) requestAnimationFrame(tick)
    else el.textContent = String(to)
  }
  requestAnimationFrame(tick)
}

function buildCard(uid, location) {
  const card = state.cards[uid]
  const def = CARD_DEFS[card.def]
  const rarity = RARITY[def.rarity] || RARITY[1]
  const el = document.createElement('button')
  el.type = 'button'
  el.className = `card card--${location} card--${rarity.tone}`
  el.dataset.uid = uid
  el.style.setProperty('--hue', String(def.hue))
  el.style.setProperty('--sheen-delay', `${(uid.charCodeAt(1) % 8) * 0.4}s`)
  el.innerHTML = `
    <span class="card-inner">
      <span class="card-face">
        <span class="card-head">
          <span class="card-title"><span class="card-name"></span><span class="card-en"></span></span>
          <span class="card-pos"></span>
        </span>
        <span class="card-sigil"><b></b></span>
        <span class="card-effect"></span>
        <span class="card-stats">
          <span class="stat stat--atk"><i>ATK</i><b></b></span>
          <span class="stat stat--def"><i>DEF</i><b></b></span>
        </span>
      </span>
      <span class="card-back"><b>ARCTIC</b><i>DUEL</i></span>
    </span>`
  el._refs = {
    name: el.querySelector('.card-name'),
    en: el.querySelector('.card-en'),
    pos: el.querySelector('.card-pos'),
    sigil: el.querySelector('.card-sigil b'),
    effect: el.querySelector('.card-effect'),
    atk: el.querySelector('.stat--atk b'),
    def: el.querySelector('.stat--def b')
  }
  el._refs.name.textContent = def.name
  el._refs.en.textContent = def.en
  el._refs.sigil.textContent = def.kanji
  el._refs.effect.textContent = def.text
  updateCard(el, card)
  el.addEventListener('animationend', () => {
    el.classList.remove('card-enter', 'card-summon', 'card-draw', 'card-deal', 'card-flip')
  }, { once: true })
  return el
}

function updateCard(el, card) {
  const def = CARD_DEFS[card.def]
  const atk = effectiveAtk(card)
  const defv = effectiveDef(card)
  el.classList.toggle('face-down', card.faceDown)
  el.classList.toggle('is-spent', card.attacked && !card.faceDown)
  el.classList.toggle('is-boosted', (card.atkBoost || 0) > 0)
  el._refs.pos.textContent = card.faceDown ? 'SET' : card.pos === 'atk' ? 'ATK' : 'DEF'
  el._refs.pos.classList.toggle('def', card.faceDown || card.pos === 'def')
  el._refs.atk.textContent = String(atk)
  el._refs.def.textContent = String(defv)
  el._refs.effect.textContent = def.text
  const selected = ui.selected && ui.selected.kind === 'monster' && ui.selected.uid === card.uid
  el.classList.toggle('selected', Boolean(selected))
  el.setAttribute(
    'aria-label',
    card.faceDown
      ? 'セットされたカード'
      : `${def.name} ATK ${atk} DEF ${defv} ${card.pos === 'atk' ? '攻撃表示' : '守備表示'}`
  )
}

function renderBoard(seat, container) {
  container.dataset.seat = String(seat)
  const board = state.players[seat].board
  for (let zone = 0; zone < 4; zone++) {
    let z = container.querySelector(`.zone[data-zone="${zone}"]`)
    if (!z) {
      z = document.createElement('div')
      z.className = 'zone'
      z.dataset.zone = String(zone)
      z.dataset.seat = String(seat)
      z.innerHTML = `<span class="slot-no">SLOT ${pad(zone + 1)}</span><span class="slot-hint">EMPTY</span>`
      container.appendChild(z)
    }
    z.dataset.seat = String(seat)
    const uid = board[zone]
    const prevUid = z.dataset.uid || ''
    if ((uid || '') !== prevUid) {
      z.replaceChildren()
      z.dataset.uid = uid || ''
      if (uid) {
        const el = buildCard(uid, 'board')
        z.appendChild(el)
        if (ui.initial) {
          el.classList.add('card-deal')
          el.style.setProperty('--deal-delay', `${(seat === viewSeat() ? 0.18 : 0.28) + zone * 0.07}s`)
        } else if (ui.prevHand[seat]?.includes(uid)) {
          el.classList.add('card-summon')
        } else {
          el.classList.add('card-enter')
        }
      } else {
        z.innerHTML = `<span class="slot-no">SLOT ${pad(zone + 1)}</span><span class="slot-hint">EMPTY</span>`
      }
    }
    if (uid) {
      const el = z.querySelector('.card')
      if (el) updateCard(el, state.cards[uid])
    }
    const hint = z.querySelector('.slot-hint')
    const mine = seat === viewSeat()
    const myTurn = state.active === viewSeat() && state.winner === null
    const canPlace = mine && myTurn && !uid && ui.selected?.kind === 'hand'
    const targetable = !mine && ui.attackMode && Boolean(uid)
    const directTarget = !mine && ui.attackMode && !uid && validTargets(state, viewSeat()).direct
    z.classList.toggle('can-place', canPlace)
    z.classList.toggle('targetable', targetable)
    z.classList.toggle('direct-target', directTarget)
    const selectedMonster = ui.selected?.kind === 'monster' && ui.selected.uid === uid
    z.classList.toggle('is-selected', Boolean(selectedMonster))
    z.classList.toggle('is-attacked', Boolean(uid && state.cards[uid].attacked && mine && !state.cards[uid].faceDown))
    if (hint) {
      if (canPlace) hint.textContent = ui.placement === 'set' ? 'SET' : 'PLACE'
      else if (targetable) hint.textContent = 'TARGET'
      else if (directTarget) hint.textContent = 'DIRECT'
      else hint.textContent = 'EMPTY'
    }
  }
}

function renderHand(seat) {
  const hand = state.players[seat].hand
  const existing = new Map()
  dom.myHand.querySelectorAll('.card[data-uid]').forEach(el => existing.set(el.dataset.uid, el))
  for (const [uid, el] of existing) {
    if (!hand.includes(uid)) el.remove()
  }
  const n = hand.length
  const mid = (n - 1) / 2
  const narrow = window.innerWidth < 720
  const baseOverlap = n > 7 ? (narrow ? 22 : 26) : n > 6 ? (narrow ? 19 : 23) : n > 5 ? (narrow ? 17 : 21) : (narrow ? 15 : 18)
  const laidOut = []
  hand.forEach((uid, index) => {
    let el = existing.get(uid)
    const isNew = !el
    if (!el) {
      el = buildCard(uid, 'hand')
      dom.myHand.appendChild(el)
    }
    dom.myHand.appendChild(el)
    updateCard(el, state.cards[uid])
    el.style.setProperty('--rot', `${(index - mid) * 3.4}deg`)
    el.style.setProperty('--lift', `${Math.abs(index - mid) * 1.8}px`)
    el.style.setProperty('--z', String(index + 1))
    const selected = ui.selected?.kind === 'hand' && ui.selected.uid === uid
    el.classList.toggle('selected', Boolean(selected))
    if (isNew) {
      if (ui.initial) {
        el.classList.add('card-deal')
        el.style.setProperty('--deal-delay', `${0.28 + index * 0.075}s`)
      } else {
        el.classList.add('card-draw')
        sfx.draw()
      }
    }
    laidOut.push(el)
  })

  // Keep the fan inside the hand even when it grows past the base overlap.
  const cardWidth = laidOut[0]?.offsetWidth || 0
  const available = dom.myHand.clientWidth - 20
  const needed = n > 1 && cardWidth ? (n * cardWidth - available) / (n - 1) : 0
  const overlap = Math.max(baseOverlap, Math.ceil(needed))
  laidOut.forEach(el => el.style.setProperty('--overlap', `${overlap}px`))
}

function renderOppHand(seat) {
  const n = state.players[seat].hand.length
  const prev = Number(dom.oppHand.dataset.count || 0)
  if (dom.oppHand.dataset.count === String(n) && !ui.initial) return
  dom.oppHand.replaceChildren()
  const mid = (n - 1) / 2
  for (let i = 0; i < n; i++) {
    const back = document.createElement('span')
    back.className = 'hand-back'
    back.style.setProperty('--rot', `${(i - mid) * 2.6}deg`)
    back.style.setProperty('--lift', `${Math.abs(i - mid) * 1.2}px`)
    back.style.setProperty('--delay', `${-i * 0.35}s`)
    if (!ui.initial && prev < n && i === n - 1) back.classList.add('draw-in')
    dom.oppHand.appendChild(back)
  }
  dom.oppHand.dataset.count = String(n)
}

function renderCenter(meSeat, oppSeat) {
  const myTurn = state.active === meSeat && state.winner === null
  dom.turnOwner.textContent = myTurn ? 'YOUR TURN' : '相手のターン'
  dom.turnNo.textContent = `TURN ${pad(state.turn)}`
  dom.phaseLabel.textContent = state.winner !== null ? 'END' : ui.attackMode ? 'BATTLE' : 'MAIN'
  dom.turnOrb.classList.toggle('is-opp', !myTurn)
  dom.boardRound.textContent = `ROUND ${pad(state.turn)}`
  dom.deckCount.textContent = `DECK ${state.players[meSeat].deck.length}`
  let hint = '手札を選び、スロットへ配置'
  if (state.winner !== null) hint = 'DUEL END'
  else if (!myTurn) hint = state.mode === 'ai' ? 'AI WARDEN 思考中' : `${state.players[oppSeat].name} のターン`
  else if (ui.attackMode) hint = '攻撃対象を選択'
  else if (ui.selected?.kind === 'hand') hint = '空きスロットを選択'
  else if (ui.selected?.kind === 'monster') hint = '攻撃 / 表示形式'
  dom.boardHint.textContent = hint
  dom.boardShell.classList.toggle('is-my-turn', myTurn)
}

function actionButton(label, act, className = 'act') {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = className
  btn.dataset.act = act
  btn.textContent = label
  return btn
}

function actionHint(text) {
  const span = document.createElement('span')
  span.className = 'act-hint'
  span.textContent = text
  return span
}

function renderActionBar() {
  dom.actionBar.replaceChildren()
  if (!state) return
  const myTurn = state.active === viewSeat() && state.winner === null

  if (state.winner !== null) {
    dom.actionBar.appendChild(actionHint('デュエル終了'))
    dom.actionBar.appendChild(actionButton('再戦', 'rematch', 'act act--primary'))
    dom.actionBar.appendChild(actionButton('ルーム', 'room'))
    return
  }

  if (role === 'guest' && ui.pending) {
    dom.actionBar.appendChild(actionHint('ホストに送信中…'))
    return
  }

  if (!myTurn) {
    if (state.mode === 'ai' && state.active === 1) {
      const hint = actionHint('北極の守護者が思考中')
      hint.classList.add('thinking')
      dom.actionBar.appendChild(hint)
    } else {
      dom.actionBar.appendChild(actionHint(`${state.players[opponentSeat()].name} のターン`))
    }
    return
  }

  if (ui.attackMode) {
    dom.actionBar.appendChild(actionHint('攻撃対象を選択'))
    if (validTargets(state, viewSeat()).direct) {
      dom.actionBar.appendChild(actionButton('直接攻撃', 'direct', 'act act--primary'))
    }
    dom.actionBar.appendChild(actionButton('キャンセル', 'cancel'))
    return
  }

  if (ui.selected?.kind === 'hand') {
    const card = state.cards[ui.selected.uid]
    const def = CARD_DEFS[card.def]
    dom.actionBar.appendChild(actionHint(`${def.name} — 配置方法`))
    dom.actionBar.appendChild(
      actionButton('召喚 ATK', 'summon-mode', `act${ui.placement === 'summon' ? ' act--primary' : ''}`)
    )
    dom.actionBar.appendChild(
      actionButton('セット DEF', 'set-mode', `act${ui.placement === 'set' ? ' act--primary' : ''}`)
    )
    dom.actionBar.appendChild(actionButton('キャンセル', 'cancel'))
    return
  }

  if (ui.selected?.kind === 'monster') {
    const { seat, zone } = ui.selected
    const uid = state.players[seat].board[zone]
    if (!uid) {
      ui.selected = null
      renderActionBar()
      return
    }
    const card = state.cards[uid]
    const def = CARD_DEFS[card.def]
    dom.actionBar.appendChild(actionHint(`${def.name}  ATK ${effectiveAtk(card)} / DEF ${effectiveDef(card)}`))
    if (canAttack(state, seat, zone)) {
      dom.actionBar.appendChild(actionButton('攻撃', 'attack', 'act act--primary'))
    }
    if (canChangePosition(state, seat, zone)) {
      dom.actionBar.appendChild(
        actionButton(card.faceDown ? '表にする' : card.pos === 'atk' ? '守備へ' : '攻撃へ', card.faceDown ? 'pos-def' : card.pos === 'atk' ? 'pos-def' : 'pos-atk')
      )
    }
    dom.actionBar.appendChild(actionButton('キャンセル', 'cancel'))
    return
  }

  dom.actionBar.appendChild(actionHint('手札を選択 → 召喚 / セット'))
  dom.actionBar.appendChild(actionButton('ターン終了', 'end-turn', 'act act--gold'))
}

function renderLog() {
  const log = state.log
  const firstAt = log[0]?.at || null
  if (ui.logRendered === 0 || ui.logFirstAt !== firstAt || dom.logList.children.length > log.length) {
    dom.logList.replaceChildren()
    ui.logRendered = 0
  }
  for (let i = ui.logRendered; i < log.length; i++) {
    const entry = document.createElement('div')
    entry.className = `log-entry ${log[i].tone || 'system'}`
    entry.textContent = log[i].text
    dom.logList.appendChild(entry)
  }
  ui.logRendered = log.length
  ui.logFirstAt = firstAt
  dom.logList.scrollTop = dom.logList.scrollHeight
  dom.tickerText.textContent = log[log.length - 1]?.text || ''
}

function renderRoom() {
  dom.roomCode.textContent = roomCode
  dom.modalRoom.textContent = roomCode
  dom.introRoom.textContent = roomCode
  dom.logRoom.textContent = roomCode
  if (document.activeElement !== dom.inviteInput) dom.inviteInput.value = inviteUrl()
  if (document.activeElement !== dom.nameInput) dom.nameInput.value = myName
  let status = ''
  if (role === 'host') {
    if (state?.mode === 'online') status = `ONLINE / 対戦者: ${state.players[1].name}`
    else status = 'ONLINE / AI GUARDIAN 待機中'
  } else {
    status = state ? 'ONLINE / HOST と対戦中' : 'HOST に接続中'
  }
  const link = ui.linkLive ? 'LINK LIVE' : dom.linkState.dataset.state === 'down' ? 'LINK DOWN' : 'LINK RETRY'
  dom.modalStatus.textContent = `${status}  —  ${link}`
}

function renderWaiting() {
  dom.waiting.hidden = false
  dom.waitingText.textContent = `ルーム ${roomCode} に接続中。ホストの応答を待っています。`
  if (ui.waitTimer && Date.now() - ui.waitTimer > 6000) {
    dom.hostFallback.hidden = false
    dom.waitingText.textContent = `ルーム ${roomCode} のホストが見つかりません。この端末で主催できます。`
  }
}

/* ------------------------------------------------------------------ */
/* Event animation                                                     */
/* ------------------------------------------------------------------ */

function processEvent(oldRects, oldCards) {
  const ev = state.lastEvent
  if (!ev || ev.id <= ui.lastEventId) return
  ui.lastEventId = ev.id
  if (ev.type === 'start') return

  if (ev.type === 'attack') {
    const attackerEl = cardEl(ev.uid) || oldCards.get(ev.uid)
    const attackerRect = oldRects.get(ev.uid) || (attackerEl && cardEl(ev.uid)?.getBoundingClientRect())
    const targetRect = ev.targetUid
      ? oldRects.get(ev.targetUid) || cardEl(ev.targetUid)?.getBoundingClientRect()
      : barRect(1 - ev.seat)
    if (attackerEl && targetRect) ghostCard(attackerEl, targetRect, attackerRect)
    showBattleReadout(ev)
    sfx.attack()
    setTimeout(() => {
      if (targetRect) {
        const cx = targetRect.left + targetRect.width / 2
        const cy = targetRect.top + targetRect.height / 2
        impact(cx, cy, ev.result === 'reflect' ? '#ff9bb3' : '#9fe8ff')
        shatter(cx, cy, ev.result === 'reflect' ? '#ff9bb3' : '#bff4ff', 14)
      }
      for (const uid of ev.destroyed || []) {
        const rect = oldRects.get(uid)
        if (rect) shatter(rect.left + rect.width / 2, rect.top + rect.height / 2, '#d8f8ff', 20)
      }
      if (ev.damage?.amount) {
        const rect = barRect(ev.damage.seat)
        floatText(rect.left + rect.width / 2, rect.top + rect.height / 2, `-${ev.damage.amount}`, 'damage')
      }
      if (ev.burn?.amount) {
        const rect = barRect(ev.burn.seat)
        floatText(rect.left + rect.width / 2, rect.top + rect.height / 2, `-${ev.burn.amount}`, 'damage')
      }
      screenShake()
      sfx.damage()
    }, 330)
    if (ev.winner !== null) setTimeout(showResult, 1050)
    return
  }

  if (ev.type === 'summon') {
    sfx.summon()
    const rect = zoneRect(ev.seat, ev.zone)
    if (rect) {
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      impact(cx, cy, ev.faceDown ? '#b58cff' : '#9fe8ff')
      shatter(cx, cy, ev.faceDown ? '#c9b6ff' : '#bff4ff', 12)
      if (ev.effect?.kind === 'heal') floatText(cx, cy, `+${ev.effect.amount}`, 'heal')
      if (ev.effect?.kind === 'burn') floatText(cx, cy, `${ev.effect.amount} DMG`, 'damage')
      if (ev.effect?.kind === 'boost') floatText(cx, cy, `ATK +${ev.effect.amount}`, 'gold')
    }
    if (ev.effect?.kind === 'heal') {
      const rect = barRect(ev.seat)
      floatText(rect.left + rect.width / 2, rect.top + rect.height / 2, `+${ev.effect.amount}`, 'heal')
      sfx.heal()
    }
    if (ev.effect?.kind === 'burn') {
      const rect = barRect(1 - ev.seat)
      floatText(rect.left + rect.width / 2, rect.top + rect.height / 2, `-${ev.effect.amount}`, 'damage')
      sfx.damage()
    }
    if (ev.winner !== null) setTimeout(showResult, 850)
    return
  }

  if (ev.type === 'position') {
    const el = cardEl(ev.uid)
    if (el) {
      el.classList.remove('card-flip')
      void el.offsetWidth
      el.classList.add('card-flip')
      setTimeout(() => el.classList.remove('card-flip'), 600)
    }
    sfx.click()
    return
  }

  if (ev.type === 'turn') {
    showTurnBanner(ev.seat === viewSeat() ? 'YOUR TURN' : '相手のターン', ev.seat !== viewSeat())
    sfx.turn()
    if (ev.drawn) sfx.draw()
    if (ev.winner !== null) setTimeout(showResult, 850)
    return
  }

  if (ev.type === 'surrender') {
    showResult()
  }
}

function showBattleReadout(ev) {
  const targetLabel = ev.direct
    ? 'DIRECT'
    : `${ev.targetPos === 'atk' ? 'ATK' : 'DEF'} ${ev.targetPos === 'atk' ? ev.targetAtk : ev.targetDefValue}`
  const result =
    ev.result === 'direct'
      ? `DIRECT / ${ev.damage?.amount || 0} DAMAGE`
      : ev.result === 'destroy'
        ? `DESTROYED / ${ev.damage?.amount || 0} DAMAGE`
        : ev.result === 'reflect'
          ? `REFLECT / ${ev.damage?.amount || 0} DAMAGE`
          : ev.result === 'mutual'
            ? 'MUTUAL DESTRUCTION'
            : 'BLOCKED'
  showReadout('BATTLE / 攻守表', [
    ['ATK', String(ev.attackerAtk), 'br-atk'],
    ['VS', targetLabel, 'br-def']
  ], ev.burn ? `${result} / BURN ${ev.burn.amount}` : result)
}

function showCardReadout(card) {
  const def = CARD_DEFS[card.def]
  const atk = card.faceDown ? '?' : String(effectiveAtk(card))
  const defv = card.faceDown ? '?' : String(effectiveDef(card))
  showReadout('ENEMY CARD / 攻守表', [
    ['NAME', def.name, 'br-atk'],
    ['ATK / DEF', `${atk} / ${defv}`, 'br-def']
  ], card.faceDown ? 'SET CARD' : def.text)
}

function showReadout(title, rows, result, ms = 2500) {
  clearTimeout(ui.battleTimer)
  dom.battleReadout.replaceChildren()
  const t = document.createElement('div')
  t.className = 'br-title'
  t.textContent = title
  dom.battleReadout.appendChild(t)
  const row = document.createElement('div')
  row.className = 'br-row'
  rows.forEach(([label, value, cls]) => {
    const cell = document.createElement('span')
    cell.className = cls
    cell.textContent = `${label} ${value}`
    row.appendChild(cell)
  })
  dom.battleReadout.appendChild(row)
  const r = document.createElement('div')
  r.className = 'br-result'
  r.textContent = result
  dom.battleReadout.appendChild(r)
  dom.battleReadout.classList.add('show')
  ui.battleTimer = setTimeout(() => dom.battleReadout.classList.remove('show'), ms)
}

function showTurnBanner(text, isOpp) {
  clearTimeout(ui.turnTimer)
  dom.turnBanner.querySelector('b').textContent = text
  dom.turnBanner.classList.toggle('is-opp', Boolean(isOpp))
  dom.turnBanner.classList.remove('show')
  void dom.turnBanner.offsetWidth
  dom.turnBanner.classList.add('show')
  ui.turnTimer = setTimeout(() => dom.turnBanner.classList.remove('show'), 1500)
}

function screenShake() {
  dom.stage.classList.remove('shake')
  void dom.stage.offsetWidth
  dom.stage.classList.add('shake')
  setTimeout(() => dom.stage.classList.remove('shake'), 450)
}

function showResult() {
  if (!state || state.winner === null || ui.winnerShown) return
  ui.winnerShown = true
  const won = state.winner === viewSeat()
  dom.resultKicker.textContent = won ? 'DUEL WON' : 'DUEL LOST'
  dom.resultTitle.textContent = won ? '勝利' : '敗北'
  dom.resultTitle.classList.toggle('lose', !won)
  const reason =
    state.reason === 'deckout'
      ? '山札が尽きました。'
      : state.reason === 'surrender'
        ? '降参により決着。'
        : 'LPが0になりました。'
  dom.resultText.textContent = `${reason}  TURN ${pad(state.turn)}`
  dom.result.hidden = false
  if (won) sfx.win()
  else sfx.lose()
}

/* ------------------------------------------------------------------ */
/* Interaction                                                         */
/* ------------------------------------------------------------------ */

function onHandClick(uid) {
  if (!state || state.winner !== null) return
  if (state.active !== viewSeat()) {
    showToast('あなたのターンではありません。')
    return
  }
  if (ui.selected?.kind === 'hand' && ui.selected.uid === uid) {
    ui.selected = null
    ui.attackMode = false
    render()
    return
  }
  ui.selected = { kind: 'hand', uid }
  ui.attackMode = false
  ui.placement = 'summon'
  sfx.click()
  render()
}

function onZoneClick(seat, zone) {
  if (!state || state.winner !== null) return
  const uid = state.players[seat].board[zone]
  if (ui.attackMode) {
    if (seat !== viewSeat()) {
      if (uid) performAttack(zone)
      else if (validTargets(state, viewSeat()).direct) performAttack(null)
      else showToast('モンスターがいるスロットを選択してください。')
    }
    return
  }
  if (ui.selected?.kind === 'hand') {
    if (seat !== viewSeat()) {
      showToast('自分のスロットを選択してください。')
      return
    }
    if (uid) {
      showToast('空きスロットを選択してください。')
      return
    }
    performSummon(zone)
    return
  }
  if (uid) {
    if (seat === viewSeat()) {
      ui.selected = { kind: 'monster', seat, zone, uid }
      ui.attackMode = false
      sfx.click()
      render()
    } else {
      showCardReadout(state.cards[uid])
      sfx.click()
    }
    return
  }
  if (ui.selected) {
    ui.selected = null
    render()
  }
}

function handleActionButton(act) {
  switch (act) {
    case 'cancel':
      ui.selected = null
      ui.attackMode = false
      render()
      break
    case 'summon-mode':
      ui.placement = 'summon'
      render()
      break
    case 'set-mode':
      ui.placement = 'set'
      render()
      break
    case 'attack':
      if (ui.selected?.kind === 'monster') {
        ui.attackMode = true
        render()
      }
      break
    case 'direct':
      performAttack(null)
      break
    case 'pos-atk':
      performPosition('atk')
      break
    case 'pos-def':
      performPosition('def')
      break
    case 'end-turn':
      dispatchAction({ type: 'endTurn' })
      ui.selected = null
      ui.attackMode = false
      render()
      break
    case 'rematch':
      rematch()
      break
    case 'room':
      openRoom()
      break
  }
}

/* ------------------------------------------------------------------ */
/* Room modal                                                          */
/* ------------------------------------------------------------------ */

function openRoom() {
  dom.roomModal.hidden = false
  dom.nameInput.value = myName
  dom.joinInput.value = ''
  dom.surrenderBtn.dataset.armed = ''
  dom.surrenderBtn.textContent = '降参'
  renderRoom()
}

function closeRoom() {
  dom.roomModal.hidden = true
}

async function copyInvite() {
  const text = inviteUrl()
  try {
    await navigator.clipboard.writeText(text)
    showToast('招待リンクをコピーしました。')
  } catch {
    dom.inviteInput.focus()
    dom.inviteInput.select()
    try {
      document.execCommand('copy')
      showToast('招待リンクをコピーしました。')
    } catch {
      showToast('コピーできませんでした。リンクを長押ししてください。', 3200)
    }
  }
}

function joinRoom() {
  const code = dom.joinInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
  if (code.length < 4) {
    showToast('4文字以上のルームコードを入力してください。')
    return
  }
  location.href = `${location.pathname}?room=${code}`
}

function saveName() {
  const name = (dom.nameInput.value || '').trim().slice(0, 14) || '旅人'
  myName = name
  safeSet('arctic.name', name)
  online.setName(name)
  if (!state) return
  if (role === 'host') {
    state.players[0].name = name
    render()
    publishState()
  } else {
    state.players[1].name = name
    render()
    online.publish({ type: 'intent', action: { type: 'rename', name } })
  }
}

function armSurrender() {
  if (dom.surrenderBtn.dataset.armed !== '1') {
    dom.surrenderBtn.dataset.armed = '1'
    dom.surrenderBtn.textContent = '本当に降参'
    setTimeout(() => {
      if (!dom.roomModal.hidden) {
        dom.surrenderBtn.dataset.armed = ''
        dom.surrenderBtn.textContent = '降参'
      }
    }, 2800)
    return
  }
  closeRoom()
  if (role === 'guest') {
    online.publish({ type: 'intent', action: { type: 'surrender' } })
  } else if (state) {
    const result = applyAction(state, 0, { type: 'surrender' })
    if (result.ok) afterAction()
  }
}

/* ------------------------------------------------------------------ */
/* Tilt, pointer, sound, keyboard                                      */
/* ------------------------------------------------------------------ */

let tiltOn = false
let motionHandler = null

async function toggleTilt() {
  if (tiltOn) {
    tiltOn = false
    if (motionHandler) window.removeEventListener('deviceorientation', motionHandler)
    motionHandler = null
    scene.setTilt(0, 0)
    document.documentElement.style.setProperty('--tiltX', '0deg')
    document.documentElement.style.setProperty('--tiltY', '0deg')
    dom.tiltBtn.textContent = '傾き OFF'
    showToast('傾き操作をオフにしました。')
    return
  }
  const DME = window.DeviceMotionEvent
  try {
    if (DME && typeof DME.requestPermission === 'function') {
      const permission = await DME.requestPermission()
      if (permission !== 'granted') {
        dom.tiltBtn.textContent = '傾き NG'
        showToast('モーションアクセスが許可されませんでした。')
        return
      }
    }
  } catch {
    dom.tiltBtn.textContent = '傾き NG'
    showToast('モーションアクセスを開始できませんでした。')
    return
  }
  motionHandler = event => {
    const gamma = Math.max(-35, Math.min(35, event.gamma || 0))
    const beta = Math.max(0, Math.min(90, event.beta || 45))
    const gx = gamma / 35
    const gy = (beta - 45) / 35
    scene.setTilt(gx, gy)
    document.documentElement.style.setProperty('--tiltX', `${(-gy * 3.2).toFixed(2)}deg`)
    document.documentElement.style.setProperty('--tiltY', `${(gx * 4.2).toFixed(2)}deg`)
  }
  window.addEventListener('deviceorientation', motionHandler)
  tiltOn = true
  dom.tiltBtn.textContent = '傾き ON'
  showToast('端末を傾けて視差を操作できます。')
}

function setupPointerParallax() {
  let raf = 0
  let lastX = 0
  let lastY = 0
  window.addEventListener('pointermove', event => {
    if (tiltOn || event.pointerType === 'touch') return
    lastX = (event.clientX / window.innerWidth - 0.5) * 2
    lastY = (event.clientY / window.innerHeight - 0.5) * 2
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      document.documentElement.style.setProperty('--tiltX', `${(-lastY * 1.4).toFixed(2)}deg`)
      document.documentElement.style.setProperty('--tiltY', `${(lastX * 2.2).toFixed(2)}deg`)
      scene.setTilt(lastX * 0.35, lastY * 0.35)
    })
  }, { passive: true })
}

function setupKeyboard() {
  window.addEventListener('keydown', event => {
    const tag = event.target?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return
    if (event.key === 'Escape') {
      if (!dom.roomModal.hidden) closeRoom()
      else {
        ui.selected = null
        ui.attackMode = false
        render()
      }
      return
    }
    if (!state) return
    if (event.key.toLowerCase() === 'e' && state.active === viewSeat()) {
      dispatchAction({ type: 'endTurn' })
      ui.selected = null
      ui.attackMode = false
      render()
      return
    }
    if (/^[1-7]$/.test(event.key)) {
      const index = Number(event.key) - 1
      const hand = state.players[viewSeat()].hand
      if (hand[index]) onHandClick(hand[index])
      return
    }
    if (event.key.toLowerCase() === 'a' && ui.selected?.kind === 'monster' && canAttack(state, viewSeat(), ui.selected.zone)) {
      ui.attackMode = true
      render()
    }
  })
}

/* ------------------------------------------------------------------ */
/* Presence / boot                                                     */
/* ------------------------------------------------------------------ */

function presenceCheck() {
  if (role === 'host' && state?.mode === 'online' && state.guestId && ui.linkLive) {
    if (Date.now() - ui.guestSeen > 15000) dropGuest(state.guestId)
  }
  if (role === 'guest' && state && ui.linkLive) {
    if (Date.now() - ui.hostSeen > 15000) {
      if (!ui.hostLostNotified) {
        ui.hostLostNotified = true
        showToast('ホストとの接続が切れました。再接続中。', 3200)
      }
      online.sendHello()
    } else {
      ui.hostLostNotified = false
    }
  }
}

function becomeHost() {
  if (role === 'host') return
  role = 'host'
  ownRoom = roomCode
  safeSet('arctic.room', ownRoom)
  online.role = 'host'
  online.setMeta({ guestId: null, mode: 'ai' })
  state = createDuel({ mode: 'ai', room: roomCode, hostName: myName })
  resetUiForDuel()
  dom.waiting.hidden = true
  history.replaceState(null, '', location.pathname)
  render()
  publishState()
  showToast('この端末でルームを主催します。', 2600)
}

function wireEvents() {
  dom.roomBtn.addEventListener('click', openRoom)
  dom.roomClose.addEventListener('click', closeRoom)
  dom.roomModal.addEventListener('click', event => {
    if (event.target === dom.roomModal) closeRoom()
  })
  dom.copyBtn.addEventListener('click', copyInvite)
  dom.joinBtn.addEventListener('click', joinRoom)
  dom.joinGo.addEventListener('click', joinRoom)
  dom.joinInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') joinRoom()
  })
  dom.myRoomBtn.addEventListener('click', () => {
    if (role === 'guest') location.href = location.pathname
    else showToast('既に自分のルームです。')
  })
  dom.nameInput.addEventListener('change', saveName)
  dom.surrenderBtn.addEventListener('click', armSurrender)
  dom.rematchBtn.addEventListener('click', () => {
    closeRoom()
    rematch()
  })
  dom.tiltBtn.addEventListener('click', toggleTilt)
  dom.soundBtn.addEventListener('click', async () => {
    if (sfx.enabled) {
      sfx.disable()
      dom.soundBtn.textContent = '音 OFF'
      showToast('サウンドをオフにしました。')
    } else {
      await sfx.enable()
      dom.soundBtn.textContent = sfx.enabled ? '音 ON' : '音 NG'
      if (sfx.enabled) {
        sfx.click()
        showToast('サウンドをオンにしました。')
      }
    }
  })

  dom.myHand.addEventListener('click', event => {
    const card = event.target.closest('.card[data-uid]')
    if (card) onHandClick(card.dataset.uid)
  })

  dom.boardShell.addEventListener('click', event => {
    const z = event.target.closest('.zone')
    if (!z) return
    onZoneClick(Number(z.dataset.seat), Number(z.dataset.zone))
  })

  dom.actionBar.addEventListener('click', event => {
    const btn = event.target.closest('button[data-act]')
    if (btn) handleActionButton(btn.dataset.act)
  })

  dom.resultRematch.addEventListener('click', () => {
    dom.result.hidden = true
    rematch()
  })
  dom.resultRoom.addEventListener('click', openRoom)

  dom.hostFallback.addEventListener('click', becomeHost)

  window.addEventListener('pagehide', () => {
    if (role === 'guest') online.publish({ type: 'bye' })
  })
}

function boot() {
  dom.introRoom.textContent = roomCode
  dom.roomCode.textContent = roomCode
  dom.soundBtn.textContent = '音 OFF'
  dom.tiltBtn.textContent = '傾き OFF'
  wireEvents()
  setupPointerParallax()
  setupKeyboard()

  if (state) {
    pushLog(state, '北極の守護者が対戦相手として待機。', 'system')
    render()
  } else {
    renderWaiting()
    ui.waitTimer = Date.now()
    setTimeout(() => {
      if (role === 'guest' && !state) renderWaiting()
    }, 6500)
  }

  online.start()
  setInterval(presenceCheck, 5000)
  setInterval(() => {
    if (role === 'host' && state?.mode === 'online' && state.guestId) publishState()
  }, 3500)

  window.__arctic = {
    get state() { return state },
    get ui() { return ui },
    get role() { return role },
    roomCode,
    online,
    act(action, seat = 0) {
      if (!state) return { ok: false, error: 'no duel' }
      const result = applyAction(state, seat, action)
      if (result.ok) afterAction()
      return result
    },
    dispatch: dispatchAction,
    rematch,
    render,
    becomeHost
  }
}

boot()
