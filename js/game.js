// Arctic Duel — authoritative duel engine (pure, serializable).
import { CARDS, DECK, tributeCount } from './cards.js'

export const LP_START = 4000
export const ZONES = 4
const HAND_START = 5

const err = error => ({ ok: false, error })

function rnd(s) {
  s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0
  return s.rng / 4294967296
}

function shuffle(s, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd(s) * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

let uidCounter = 0
const newUid = () => `u${(uidCounter++).toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`

export function atkOf(slot) {
  return slot ? CARDS[slot.card].atk + (slot.mod || 0) : 0
}
export function defOf(slot) {
  return slot ? CARDS[slot.card].def : 0
}

function log(s, p, text) {
  s.log.push({ p, text })
  if (s.log.length > 40) s.log.splice(0, s.log.length - 40)
}

function ev(s, type, data = {}) {
  s.ev += 1
  const event = { id: s.ev, type, ...data }
  s.lastEvent = event
  s.batch.push(event)
  if (s.batch.length > 16) s.batch.shift()
  return event
}

function draw(s, p, n = 1) {
  for (let i = 0; i < n; i++) {
    if (!s.deck[p].length) return false
    s.hand[p].push(s.deck[p].pop())
  }
  return true
}

export function newDuel(room, hostId, seed) {
  const s = {
    v: 2,
    room,
    hostId,
    guestId: null,
    rng: (seed >>> 0) || 0x9e3779b9,
    seq: 0,
    ev: 0,
    names: ['ホスト', 'ゲスト'],
    started: false,
    over: false,
    winner: null,
    reason: '',
    turn: 1,
    active: 0,
    phase: 'main',
    lp: [LP_START, LP_START],
    deck: [[], []],
    hand: [[], []],
    grave: [[], []],
    field: [[null, null, null, null], [null, null, null, null]],
    summonUsed: [false, false],
    spellUsed: [false, false],
    log: [],
    lastEvent: null,
    batch: []
  }
  s.deck[0] = shuffle(s, DECK.slice())
  s.deck[1] = shuffle(s, DECK.slice())
  draw(s, 0, HAND_START)
  draw(s, 1, HAND_START)
  log(s, -1, 'ルームが作成されました。対戦相手を待っています。')
  return s
}

export function beginDuel(s) {
  if (s.started || s.over) return
  s.started = true
  s.phase = 'main'
  s.turn = 1
  s.active = 0
  s.seq += 1
  s.batch = []
  log(s, -1, 'デュエル開始。先攻はホストです。')
  log(s, 0, '先攻1ターン目は攻撃できません。')
  ev(s, 'begin')
}

function finish(s, winner, reason) {
  s.over = true
  s.phase = 'over'
  s.winner = winner
  s.reason = reason
  s.seq += 1
  log(s, -1, `${winner === 0 ? s.names[0] : s.names[1]}の勝利 — ${reason}`)
  ev(s, 'over', { winner, reason })
}

function destroy(s, p, zone, reason = '破壊') {
  const slot = s.field[p][zone]
  if (!slot) return
  s.grave[p].push(slot.card)
  s.field[p][zone] = null
  ev(s, 'destroy', { p, zone, card: slot.card, reason })
}

function findSlot(s, p, uid) {
  return s.field[p].findIndex(x => x && x.uid === uid)
}

function damage(s, p, amount) {
  if (amount <= 0) return
  s.lp[p] = Math.max(0, s.lp[p] - amount)
  ev(s, 'damage', { p, amount })
  if (s.lp[p] <= 0) finish(s, 1 - p, 'ライフポイントが0になりました')
}

function removeTributes(s, p, uids) {
  for (const uid of uids) {
    const z = findSlot(s, p, uid)
    if (z >= 0) {
      s.grave[p].push(s.field[p][z].card)
      s.field[p][z] = null
    }
  }
}

function placeMonster(s, p, cardId, pos, faceDown, zone) {
  const slot = { uid: newUid(), card: cardId, pos, faceDown, attacked: false, changed: false, mod: 0 }
  s.field[p][zone] = slot
  return slot
}

function firstEmpty(s, p) {
  return s.field[p].findIndex(x => !x)
}

function validateSummon(s, p, a) {
  if (s.over) return 'デュエルは終了しています'
  if (!s.started) return '対戦相手を待っています'
  if (s.active !== p) return 'あなたのターンではありません'
  if (s.phase !== 'main') return 'メインフェイズではありません'
  if (s.summonUsed[p]) return 'このターンはもう召喚・セットしています'
  const cardId = s.hand[p][a.handIndex]
  const card = CARDS[cardId]
  if (!card || card.kind !== 'monster') return 'モンスターカードではありません'
  const req = tributeCount(card.lv)
  const tributes = Array.isArray(a.tributes) ? a.tributes : []
  if (tributes.length !== req) return `生贄が${req}体必要です`
  if (new Set(tributes).size !== tributes.length) return '生贄が重複しています'
  for (const uid of tributes) if (findSlot(s, p, uid) < 0) return '生贄の対象が不正です'
  const occupied = s.field[p].filter(Boolean).length
  if (occupied - req + 1 > ZONES) return 'モンスターゾーンが足りません'
  return null
}

function applySummon(s, p, a, faceDown) {
  const error = validateSummon(s, p, a)
  if (error) return err(error)
  const cardId = s.hand[p].splice(a.handIndex, 1)[0]
  const card = CARDS[cardId]
  const req = tributeCount(card.lv)
  if (req) removeTributes(s, p, a.tributes)
  const zone = firstEmpty(s, p)
  const slot = placeMonster(s, p, cardId, faceDown ? 'def' : 'atk', faceDown, zone)
  s.summonUsed[p] = true
  s.seq += 1
  if (faceDown) {
    log(s, p, 'モンスターを裏側守備表示でセットした。')
    ev(s, 'set', { p, zone, uid: slot.uid })
  } else {
    log(s, p, `${card.name}を召喚した（ATK ${card.atk}）。`)
    ev(s, 'summon', { p, zone, uid: slot.uid, card: cardId })
  }
  return { ok: true }
}

function spellNeedsTarget(cardId) {
  return cardId !== 'heal'
}

function validateCast(s, p, a) {
  if (s.over) return 'デュエルは終了しています'
  if (!s.started) return '対戦相手を待っています'
  if (s.active !== p) return 'あなたのターンではありません'
  if (s.phase !== 'main') return 'メインフェイズではありません'
  if (s.spellUsed[p]) return 'このターンはもう魔法を使っています'
  const cardId = s.hand[p][a.handIndex]
  const card = CARDS[cardId]
  if (!card || card.kind !== 'spell') return '魔法カードではありません'
  if (!spellNeedsTarget(cardId)) return null
  const targetP = cardId === 'boost' ? p : 1 - p
  const z = findSlot(s, targetP, a.targetUid)
  if (z < 0) return '対象を選択してください'
  const slot = s.field[targetP][z]
  if (cardId === 'boost') {
    if (slot.faceDown || slot.pos !== 'atk') return '攻撃表示の自分モンスターを対象にしてください'
  }
  if (cardId === 'shatter' && defOf(slot) > 1500) return '守備力1500以下のモンスターを対象にしてください'
  return null
}

function applyCast(s, p, a) {
  const error = validateCast(s, p, a)
  if (error) return err(error)
  const cardId = s.hand[p][a.handIndex]
  const card = CARDS[cardId]
  s.hand[p].splice(a.handIndex, 1)
  s.grave[p].push(cardId)
  s.spellUsed[p] = true
  s.seq += 1
  const targetP = cardId === 'boost' ? p : 1 - p
  const z = a.targetUid ? findSlot(s, targetP, a.targetUid) : -1
  const slot = z >= 0 ? s.field[targetP][z] : null
  ev(s, 'cast', { p, card: cardId, targetUid: slot?.uid || null, zone: z, targetP })
  if (cardId === 'boost') {
    slot.mod = (slot.mod || 0) + 700
    log(s, p, `「${card.name}」を発動。${CARDS[slot.card].name}のATKが700アップ。`)
  } else if (cardId === 'heal') {
    s.lp[p] = Math.min(9999, s.lp[p] + 1000)
    log(s, p, `「${card.name}」を発動。LPを1000回復した。`)
  } else if (cardId === 'shatter') {
    log(s, p, `「${card.name}」を発動。${CARDS[slot.card].name}を破壊した。`)
    destroy(s, targetP, z, '魔法')
  } else if (cardId === 'gust') {
    const name = CARDS[slot.card].name
    s.hand[targetP].push(slot.card)
    s.field[targetP][z] = null
    log(s, p, `「${card.name}」を発動。${name}を手札に戻した。`)
    ev(s, 'bounce', { p: targetP, zone: z, card: slot.card })
  } else if (cardId === 'freeze') {
    slot.faceDown = false
    slot.pos = 'def'
    slot.changed = true
    log(s, p, `「${card.name}」を発動。${CARDS[slot.card].name}を守備表示にした。`)
  }
  return { ok: true }
}

function endTurn(s) {
  for (const row of s.field) for (const slot of row) if (slot) slot.mod = 0
  const next = 1 - s.active
  s.active = next
  s.turn += 1
  s.phase = 'main'
  s.summonUsed[next] = false
  s.spellUsed[next] = false
  for (const slot of s.field[next]) {
    if (slot) {
      slot.attacked = false
      slot.changed = false
    }
  }
  s.seq += 1
  if (!draw(s, next, 1)) {
    finish(s, 1 - next, '山札が尽きました')
    return
  }
  log(s, -1, `${s.turn}ターン目 — ${next === 0 ? s.names[0] : s.names[1]}のターン。`)
  ev(s, 'turn', { active: next, turn: s.turn })
}

export function applyAction(s, p, a) {
  if (!a || typeof a.t !== 'string') return err('不正な操作です')
  s.batch = []
  if (a.t === 'surrender') {
    if (s.over) return err('デュエルは終了しています')
    if (!s.started) return err('デュエルはまだ始まっていません')
    finish(s, 1 - p, '降参')
    return { ok: true }
  }
  if (a.t === 'rematch') {
    if (p !== 0) return err('再戦はホストのみ開始できます')
    resetDuel(s)
    return { ok: true }
  }
  if (a.t === 'summon') return applySummon(s, p, a, false)
  if (a.t === 'set') return applySummon(s, p, a, true)
  if (a.t === 'cast') return applyCast(s, p, a)
  if (a.t === 'battle') {
    if (s.over) return err('デュエルは終了しています')
    if (!s.started) return err('対戦相手を待っています')
    if (s.active !== p) return err('あなたのターンではありません')
    if (s.phase !== 'main') return err('メインフェイズではありません')
    if (s.turn === 1) return err('先攻1ターン目はバトルできません')
    s.phase = 'battle'
    s.seq += 1
    log(s, -1, 'バトルフェイズ。')
    ev(s, 'battle')
    return { ok: true }
  }
  if (a.t === 'end') {
    if (s.over) return err('デュエルは終了しています')
    if (!s.started) return err('対戦相手を待っています')
    if (s.active !== p) return err('あなたのターンではありません')
    if (s.phase !== 'main' && s.phase !== 'battle') return err('今はターンを終了できません')
    endTurn(s)
    return { ok: true }
  }
  if (a.t === 'position') {
    if (s.over) return err('デュエルは終了しています')
    if (s.active !== p) return err('あなたのターンではありません')
    if (s.phase !== 'main') return err('メインフェイズではありません')
    const z = findSlot(s, p, a.uid)
    if (z < 0) return err('モンスターが見つかりません')
    const slot = s.field[p][z]
    if (slot.faceDown) {
      if (a.pos !== 'atk') return err('裏側のカードは反転召喚のみ可能です')
      slot.faceDown = false
      slot.pos = 'atk'
      slot.changed = true
      s.seq += 1
      log(s, p, `${CARDS[slot.card].name}を反転召喚した。`)
      ev(s, 'flip', { p, zone: z, uid: slot.uid })
      return { ok: true }
    }
    if (slot.changed) return err('このターンはもう表示形式を変更しています')
    if (slot.pos === a.pos) return err('すでにその表示形式です')
    slot.pos = a.pos
    slot.changed = true
    s.seq += 1
    log(s, p, `${CARDS[slot.card].name}を${a.pos === 'atk' ? '攻撃' : '守備'}表示にした。`)
    ev(s, 'position', { p, zone: z, uid: slot.uid, pos: a.pos })
    return { ok: true }
  }
  if (a.t === 'attack') {
    if (s.over) return err('デュエルは終了しています')
    if (s.active !== p) return err('あなたのターンではありません')
    if (s.phase !== 'battle') return err('バトルフェイズではありません')
    if (s.turn === 1) return err('先攻1ターン目は攻撃できません')
    const az = findSlot(s, p, a.uid)
    if (az < 0) return err('攻撃するモンスターを選択してください')
    const attacker = s.field[p][az]
    if (attacker.faceDown || attacker.pos !== 'atk') return err('攻撃表示のモンスターしか攻撃できません')
    if (attacker.attacked) return err('このモンスターはもう攻撃しています')
    if (attacker.changed) return err('表示形式を変更したモンスターは攻撃できません')
    const opp = 1 - p
    const hasMonsters = s.field[opp].some(Boolean)
    let tz = -1
    if (a.targetUid) {
      tz = findSlot(s, opp, a.targetUid)
      if (tz < 0) return err('攻撃対象が不正です')
    } else if (hasMonsters) {
      return err('攻撃対象を選択してください')
    }
    attacker.attacked = true
    s.seq += 1
    const target = tz >= 0 ? s.field[opp][tz] : null
    const A = atkOf(attacker)
    log(s, p, `${CARDS[attacker.card].name}（ATK ${A}）で${target ? CARDS[target.card].name : '相手プレイヤー'}を攻撃。`)
    ev(s, 'attack', {
      p, zone: az, uid: attacker.uid, targetUid: target?.uid || null,
      targetP: opp, targetZone: tz, atk: A
    })
    if (!target) {
      damage(s, opp, A)
      if (!s.over) log(s, -1, `相手に${A}のダメージ。`)
      return { ok: true }
    }
    if (target.faceDown) target.faceDown = false
    const D = target.pos === 'atk' ? atkOf(target) : defOf(target)
    if (target.pos === 'atk') {
      if (A > D) {
        const dmg = A - D
        log(s, -1, `ATK ${A} vs ATK ${D} — ${CARDS[target.card].name}を破壊。`)
        destroy(s, opp, tz, '戦闘')
        damage(s, opp, dmg)
      } else if (A < D) {
        const dmg = D - A
        log(s, -1, `ATK ${A} vs ATK ${D} — ${CARDS[attacker.card].name}が破壊。`)
        destroy(s, p, az, '戦闘')
        damage(s, p, dmg)
      } else {
        log(s, -1, `ATK ${A} 同士の相打ち。`)
        destroy(s, p, az, '戦闘')
        destroy(s, opp, tz, '戦闘')
      }
    } else {
      if (A > D) {
        log(s, -1, `ATK ${A} vs DEF ${D} — ${CARDS[target.card].name}を破壊。`)
        destroy(s, opp, tz, '戦闘')
      } else if (A < D) {
        const dmg = D - A
        log(s, -1, `ATK ${A} vs DEF ${D} — ${CARDS[attacker.card].name}が破壊。`)
        destroy(s, p, az, '戦闘')
        damage(s, p, dmg)
      } else {
        log(s, -1, `ATK ${A} vs DEF ${D} — 互いに破壊されなかった。`)
      }
    }
    return { ok: true }
  }
  return err('不明な操作です')
}

export function resetDuel(s) {
  const host = s.hostId
  const guest = s.guestId
  const room = s.room
  const seed = (Math.random() * 0xffffffff) >>> 0
  const fresh = newDuel(room, host, seed)
  fresh.guestId = guest
  fresh.started = true
  fresh.log = []
  log(fresh, -1, '再戦。デュエル開始。先攻はホストです。')
  fresh.seq = s.seq + 1
  fresh.ev = s.ev + 1
  fresh.lastEvent = { id: fresh.ev, type: 'begin' }
  fresh.batch = [fresh.lastEvent]
  Object.assign(s, fresh)
}

// Redacted, viewer-specific snapshot. Never leaks the opponent's hand or set cards.
export function viewFor(s, viewer) {
  const field = s.field.map((row, p) =>
    row.map(slot => {
      if (!slot) return null
      if (p !== viewer && slot.faceDown) {
        return { uid: slot.uid, hidden: true, pos: 'def', faceDown: true, attacked: slot.attacked, changed: slot.changed }
      }
      return {
        uid: slot.uid,
        card: slot.card,
        pos: slot.pos,
        faceDown: slot.faceDown,
        attacked: slot.attacked,
        changed: slot.changed,
        mod: slot.mod || 0,
        atk: atkOf(slot),
        def: defOf(slot)
      }
    })
  )
  return {
    v: 2,
    room: s.room,
    seq: s.seq,
    ev: s.ev,
    started: s.started,
    over: s.over,
    winner: s.winner,
    reason: s.reason,
    turn: s.turn,
    active: s.active,
    phase: s.phase,
    lp: s.lp.slice(),
    hands: [
      { count: s.hand[0].length, cards: viewer === 0 ? s.hand[0].slice() : null },
      { count: s.hand[1].length, cards: viewer === 1 ? s.hand[1].slice() : null }
    ],
    decks: [s.deck[0].length, s.deck[1].length],
    graves: [s.grave[0].length, s.grave[1].length],
    field,
    summonUsed: s.summonUsed.slice(),
    spellUsed: s.spellUsed.slice(),
    names: s.names.slice(),
    hostId: s.hostId,
    guestId: s.guestId,
    mySeat: viewer,
    log: s.log.slice(-24),
    lastEvent: s.lastEvent,
    events: (s.batch || []).slice(-16)
  }
}
