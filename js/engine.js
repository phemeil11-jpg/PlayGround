import { CARD_DEFS, deckList } from './cards.js'

let uidCounter = 0
function nextUid() {
  uidCounter += 1
  return `u${uidCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

const MAX_LP = 4000
const MAX_LOG = 42

export function effectiveAtk(card) {
  const def = CARD_DEFS[card.def]
  return def.atk + (card.atkBoost || 0)
}

export function effectiveDef(card) {
  const def = CARD_DEFS[card.def]
  return def.def + (card.defBoost || 0)
}

export function cardOf(state, uid) {
  return uid ? state.cards[uid] : null
}

export function cardsOnBoard(state, seat) {
  const out = []
  state.players[seat].board.forEach((uid, zone) => {
    if (uid) out.push({ uid, zone, card: state.cards[uid], def: CARD_DEFS[state.cards[uid].def] })
  })
  return out
}

export function canAttack(state, seat, zone) {
  if (state.winner !== null || state.active !== seat) return false
  const uid = state.players[seat].board[zone]
  if (!uid) return false
  const card = state.cards[uid]
  return !card.faceDown && card.pos === 'atk' && !card.attacked
}

export function canChangePosition(state, seat, zone) {
  if (state.winner !== null || state.active !== seat) return false
  const uid = state.players[seat].board[zone]
  if (!uid) return false
  const card = state.cards[uid]
  if (card.summonedTurn === state.turn) return false
  if (!card.faceDown && card.changed) return false
  return true
}

export function validTargets(state, seat) {
  const opp = 1 - seat
  const occupied = state.players[opp].board
    .map((uid, zone) => (uid ? zone : -1))
    .filter(zone => zone >= 0)
  return { zones: occupied, direct: occupied.length === 0 }
}

export function createDuel({ mode = 'ai', guestId = null, guestName = '', room = '', hostName = '旅人' } = {}) {
  const state = {
    v: 1,
    seq: 0,
    room,
    mode,
    guestId,
    guestName,
    turn: 1,
    active: 0,
    phase: 'main',
    winner: null,
    reason: '',
    startedAt: Date.now(),
    players: [
      {
        name: hostName || '旅人',
        tag: 'YOU',
        lp: MAX_LP,
        deck: [],
        hand: [],
        board: [null, null, null, null],
        grave: [],
        summoned: false
      },
      {
        name: mode === 'online' ? (guestName || '対戦者') : '北極の守護者',
        tag: mode === 'online' ? 'ONLINE DUELIST' : 'AI WARDEN',
        lp: MAX_LP,
        deck: [],
        hand: [],
        board: [null, null, null, null],
        grave: [],
        summoned: false
      }
    ],
    cards: {},
    log: [],
    lastEvent: { id: 0, type: 'start' }
  }

  for (let seat = 0; seat < 2; seat++) {
    const p = state.players[seat]
    const defs = deckList()
    shuffle(defs)
    for (const defId of defs) {
      const uid = nextUid()
      state.cards[uid] = {
        uid,
        def: defId,
        owner: seat,
        zone: null,
        pos: 'atk',
        faceDown: false,
        attacked: false,
        changed: false,
        atkBoost: 0,
        defBoost: 0,
        summonedTurn: 0,
        destroyed: false
      }
      p.deck.push(uid)
    }
  }

  for (let i = 0; i < 5; i++) {
    drawCard(state, 0, true)
    drawCard(state, 1, true)
  }

  state.seq = 1
  state.lastEvent = { id: 1, type: 'start', firstSeat: 0 }
  addLog(state, `ルーム ${room || 'LOCAL'} に参加。`, 'system')
  addLog(state, 'デュエル開始。先攻はあなた。', 'system')
  addLog(state, '初期手札を5枚ドロー。', 'system')
  return state
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

function addLog(state, text, tone = 'system') {
  state.log.push({ text, tone, at: Date.now() })
  if (state.log.length > MAX_LOG) state.log.splice(0, state.log.length - MAX_LOG)
}

function commit(state, event) {
  state.seq += 1
  state.lastEvent = { id: state.seq, ...event }
  return { ok: true, event: state.lastEvent }
}

function drawCard(state, seat, silent = false) {
  const p = state.players[seat]
  if (!p.deck.length) {
    if (state.winner === null) {
      state.winner = 1 - seat
      state.reason = 'deckout'
      addLog(state, `${p.name} は山札からドローできず、デュエルに敗北。`, 'system')
    }
    return null
  }
  const uid = p.deck.pop()
  p.hand.push(uid)
  if (!silent) {
    addLog(state, `${p.name} が1枚ドロー。`, seat === 0 ? 'you' : 'opp')
  }
  return uid
}

function destroyCard(state, uid) {
  const card = state.cards[uid]
  if (!card) return
  const p = state.players[card.owner]
  if (card.zone !== null && p.board[card.zone] === uid) p.board[card.zone] = null
  p.grave.push(uid)
  card.destroyed = true
  card.zone = null
  card.faceDown = false
}

function dealDamage(state, seat, amount) {
  if (amount <= 0) return 0
  const p = state.players[seat]
  const before = p.lp
  p.lp = Math.max(0, p.lp - amount)
  if (p.lp <= 0 && state.winner === null) {
    state.winner = 1 - seat
    state.reason = 'lp'
  }
  return before - p.lp
}

function heal(state, seat, amount) {
  const p = state.players[seat]
  const before = p.lp
  p.lp = Math.min(MAX_LP, p.lp + amount)
  return p.lp - before
}

function triggerSummon(state, seat, card) {
  const def = CARD_DEFS[card.def]
  if (!def.effect) return null
  if (def.effect === 'summonHeal') {
    const amount = heal(state, seat, def.effectValue)
    addLog(state, `「${def.name}」の効果：LPを${amount}回復。`, seat === 0 ? 'you' : 'opp')
    return { kind: 'heal', amount }
  }
  if (def.effect === 'summonBurn') {
    const amount = dealDamage(state, 1 - seat, def.effectValue)
    addLog(state, `「${def.name}」の効果：相手に${amount}ダメージ。`, seat === 0 ? 'you' : 'opp')
    return { kind: 'burn', amount }
  }
  if (def.effect === 'summonBoost') {
    card.atkBoost = (card.atkBoost || 0) + def.effectValue
    addLog(state, `「${def.name}」の効果：ATK+${def.effectValue}。`, seat === 0 ? 'you' : 'opp')
    return { kind: 'boost', amount: def.effectValue }
  }
  return null
}

function fail(error) {
  return { ok: false, error }
}

export function applyAction(state, seat, action) {
  if (!action || typeof action !== 'object') return fail('不明な操作です。')
  if (state.winner !== null) return fail('デュエルは終了しています。')
  if (state.active !== seat) return fail('あなたのターンではありません。')
  const p = state.players[seat]
  const opp = state.players[1 - seat]

  if (action.type === 'summon') {
    const idx = p.hand.indexOf(action.uid)
    if (idx < 0) return fail('そのカードは手札にありません。')
    const zone = Number(action.zone)
    if (!(zone >= 0 && zone < 4)) return fail('スロットが不正です。')
    if (p.board[zone]) return fail('そのスロットは使用中です。')
    if (p.summoned) return fail('このターンは既に召喚しています。')
    const card = state.cards[action.uid]
    const def = CARD_DEFS[card.def]
    p.hand.splice(idx, 1)
    p.board[zone] = card.uid
    card.owner = seat
    card.zone = zone
    card.faceDown = Boolean(action.faceDown)
    card.pos = card.faceDown ? 'def' : 'atk'
    card.attacked = false
    card.changed = false
    card.summonedTurn = state.turn
    p.summoned = true
    let effect = null
    if (card.faceDown) {
      addLog(state, `${p.name} は「${def.name}」をセット。`, seat === 0 ? 'you' : 'opp')
    } else {
      effect = triggerSummon(state, seat, card)
      addLog(state, `${p.name} は「${def.name}」を召喚。`, seat === 0 ? 'you' : 'opp')
    }
    return commit(state, {
      type: 'summon',
      seat,
      zone,
      uid: card.uid,
      def: card.def,
      faceDown: card.faceDown,
      effect,
      winner: state.winner
    })
  }

  if (action.type === 'changePos') {
    const zone = Number(action.zone)
    const uid = p.board[zone]
    if (!uid) return fail('そのスロットは空です。')
    const card = state.cards[uid]
    const def = CARD_DEFS[card.def]
    if (card.summonedTurn === state.turn) return fail('召喚したターンは表示形式を変更できません。')
    if (!card.faceDown && card.changed) return fail('このモンスターは既に表示形式を変更しました。')
    const next = action.pos === 'atk' ? 'atk' : 'def'
    if (!card.faceDown && card.pos === next) return fail('既にその表示形式です。')
    const from = card.faceDown ? 'set' : card.pos
    card.faceDown = false
    card.pos = next
    card.changed = true
    addLog(state, `${p.name} は「${def.name}」を${next === 'atk' ? '攻撃' : '守備'}表示に変更。`, seat === 0 ? 'you' : 'opp')
    return commit(state, { type: 'position', seat, zone, uid, from, to: next, winner: state.winner })
  }

  if (action.type === 'attack') {
    const zone = Number(action.zone)
    const uid = p.board[zone]
    if (!uid) return fail('攻撃するモンスターがいません。')
    const attacker = state.cards[uid]
    const attackerDef = CARD_DEFS[attacker.def]
    if (attacker.faceDown || attacker.pos !== 'atk') return fail('攻撃表示のモンスターで攻撃してください。')
    if (attacker.attacked) return fail('このモンスターは既に攻撃しました。')
    const oppCards = cardsOnBoard(state, 1 - seat)
    let targetZone = action.targetZone === null || action.targetZone === undefined ? null : Number(action.targetZone)
    let targetUid = null
    let target = null
    let targetDef = null
    if (oppCards.length) {
      if (targetZone === null) return fail('攻撃対象を選択してください。')
      targetUid = opp.board[targetZone]
      if (!targetUid) return fail('そのスロットは空です。')
      target = state.cards[targetUid]
      targetDef = CARD_DEFS[target.def]
    } else {
      if (targetZone !== null) return fail('相手モンスターは存在しません。')
    }

    const atk = effectiveAtk(attacker)
    const destroyed = []
    let damage = null
    let burn = null
    let result = 'direct'
    let targetAtk = null
    let targetDefValue = null
    let targetPos = null

    if (!target) {
      let amount = atk
      if (attackerDef.effect === 'directBonus') amount += attackerDef.effectValue
      const actual = dealDamage(state, 1 - seat, amount)
      damage = { seat: 1 - seat, amount: actual }
      addLog(state, `${p.name} の「${attackerDef.name}」が直接攻撃。${actual}ダメージ。`, seat === 0 ? 'you' : 'opp')
    } else {
      if (target.faceDown) {
        target.faceDown = false
        target.pos = 'def'
      }
      targetPos = target.pos
      targetAtk = effectiveAtk(target)
      targetDefValue = effectiveDef(target)
      if (targetPos === 'atk') {
        if (atk > targetAtk) {
          result = 'destroy'
          destroyed.push(targetUid)
          const actual = dealDamage(state, 1 - seat, atk - targetAtk)
          damage = { seat: 1 - seat, amount: actual }
          addLog(state, `「${attackerDef.name}」が「${targetDef.name}」を破壊。${actual}ダメージ。`, seat === 0 ? 'you' : 'opp')
        } else if (atk < targetAtk) {
          result = 'reflect'
          destroyed.push(uid)
          const actual = dealDamage(state, seat, targetAtk - atk)
          damage = { seat, amount: actual }
          addLog(state, `「${attackerDef.name}」が「${targetDef.name}」に敗北。${actual}ダメージ。`, seat === 0 ? 'you' : 'opp')
        } else {
          result = 'mutual'
          destroyed.push(uid, targetUid)
          addLog(state, `「${attackerDef.name}」と「${targetDef.name}」が相打ち。`, 'system')
        }
      } else {
        if (atk > targetDefValue) {
          result = 'destroy'
          destroyed.push(targetUid)
          if (attackerDef.effect === 'pierce') {
            const actual = dealDamage(state, 1 - seat, atk - targetDefValue)
            damage = { seat: 1 - seat, amount: actual }
            addLog(state, `「${attackerDef.name}」が「${targetDef.name}」を破壊。貫通${actual}ダメージ。`, seat === 0 ? 'you' : 'opp')
          } else {
            addLog(state, `「${attackerDef.name}」が「${targetDef.name}」を破壊。`, seat === 0 ? 'you' : 'opp')
          }
        } else if (atk < targetDefValue) {
          result = 'reflect'
          const actual = dealDamage(state, seat, targetDefValue - atk)
          damage = { seat, amount: actual }
          addLog(state, `「${attackerDef.name}」の攻撃を「${targetDef.name}」が防いだ。${actual}ダメージ。`, seat === 0 ? 'you' : 'opp')
        } else {
          result = 'block'
          addLog(state, `「${attackerDef.name}」の攻撃を「${targetDef.name}」が完全に防いだ。`, 'system')
        }
      }
    }

    attacker.attacked = true

    for (const deadUid of destroyed) {
      const dead = state.cards[deadUid]
      const deadDef = CARD_DEFS[dead.def]
      destroyCard(state, deadUid)
      if (deadDef.effect === 'destroyBurn') {
        const burnSeat = 1 - dead.owner
        const actual = dealDamage(state, burnSeat, deadDef.effectValue)
        burn = { seat: burnSeat, amount: actual, source: deadDef.name }
        addLog(state, `「${deadDef.name}」の効果：${actual}ダメージ。`, dead.owner === 0 ? 'you' : 'opp')
      }
    }

    if (state.winner !== null && state.reason === 'lp') {
      addLog(state, `${state.players[state.winner].name} の勝利。`, 'system')
    }

    return commit(state, {
      type: 'attack',
      seat,
      zone,
      uid,
      targetUid,
      targetZone,
      direct: !target,
      attackerDef: attacker.def,
      attackerAtk: atk,
      targetDef: target ? target.def : null,
      targetAtk,
      targetDefValue,
      targetPos,
      destroyed,
      damage,
      burn,
      result,
      winner: state.winner
    })
  }

  if (action.type === 'endTurn') {
    addLog(state, `${p.name} はターンを終了。`, seat === 0 ? 'you' : 'opp')
    const event = beginTurn(state, 1 - seat)
    return commit(state, event)
  }

  if (action.type === 'surrender') {
    state.winner = 1 - seat
    state.reason = 'surrender'
    addLog(state, `${p.name} が降参。${state.players[1 - seat].name} の勝利。`, 'system')
    return commit(state, { type: 'surrender', seat, winner: state.winner })
  }

  return fail('不明な操作です。')
}

function beginTurn(state, seat) {
  state.turn += 1
  state.active = seat
  state.phase = 'main'
  for (const player of state.players) {
    player.summoned = false
    for (const uid of player.board) {
      if (!uid) continue
      const card = state.cards[uid]
      card.attacked = false
      card.changed = false
    }
  }
  const drawn = drawCard(state, seat)
  addLog(state, `TURN ${state.turn} — ${state.players[seat].name} のターン。`, seat === 0 ? 'you' : 'opp')
  return {
    type: 'turn',
    seat,
    turn: state.turn,
    drawn,
    winner: state.winner,
    reason: state.reason
  }
}

export function aiNextAction(state) {
  if (state.winner !== null || state.active !== 1) return null
  const p = state.players[1]
  const opp = state.players[0]
  const oppCards = cardsOnBoard(state, 0)
  const myCards = cardsOnBoard(state, 1)
  const oppMaxAtk = oppCards.reduce((max, entry) => Math.max(max, effectiveAtk(entry.card)), 0)

  if (!p.summoned) {
    const empty = p.board.map((uid, zone) => (uid ? -1 : zone)).filter(zone => zone >= 0)
    if (empty.length) {
      const hand = p.hand.map(uid => {
        const card = state.cards[uid]
        return { uid, card, def: CARD_DEFS[card.def] }
      })
      if (hand.length) {
        const bestAtk = [...hand].sort((a, b) => b.def.atk - a.def.atk)[0]
        const bestDef = [...hand].sort((a, b) => b.def.def - a.def.def)[0]
        let faceDown = false
        if (p.lp <= 1200 && bestDef.def >= 1700) faceDown = true
        else if (oppCards.length && bestAtk.def.atk < oppMaxAtk && bestDef.def > bestAtk.def.atk + 200) faceDown = true
        else if (!oppCards.length && bestAtk.def.atk <= 1200 && bestDef.def >= 1800) faceDown = true
        const chosen = faceDown ? bestDef : bestAtk
        const zone = chooseAiZone(p, faceDown)
        return { type: 'summon', uid: chosen.uid, zone, faceDown }
      }
    }
  }

  for (const entry of myCards) {
    const { card, def, zone } = entry
    if (card.summonedTurn === state.turn || card.changed) continue
    const atk = effectiveAtk(card)
    const defv = effectiveDef(card)
    if (card.faceDown) {
      if (atk >= 1700 && (atk > oppMaxAtk || !oppCards.length)) {
        return { type: 'changePos', zone, pos: 'atk' }
      }
    } else if (card.pos === 'def') {
      if (atk >= 1800 && (atk > oppMaxAtk || !oppCards.length)) {
        return { type: 'changePos', zone, pos: 'atk' }
      }
    } else if (card.pos === 'atk' && oppCards.length) {
      if (atk < oppMaxAtk && defv > atk && defv >= 1800 && !card.attacked) {
        return { type: 'changePos', zone, pos: 'def' }
      }
    }
  }

  const attackers = myCards
    .filter(entry => !entry.card.faceDown && entry.card.pos === 'atk' && !entry.card.attacked)
    .sort((a, b) => effectiveAtk(b.card) - effectiveAtk(a.card))

  for (const entry of attackers) {
    const atk = effectiveAtk(entry.card)
    const def = entry.def
    if (!oppCards.length) {
      return { type: 'attack', zone: entry.zone, targetZone: null }
    }
    let best = null
    for (const target of oppCards) {
      const tPos = target.card.faceDown ? 'def' : target.card.pos
      const tAtk = effectiveAtk(target.card)
      const tDef = effectiveDef(target.card)
      let score = -9999
      if (tPos === 'atk') {
        if (atk > tAtk) score = (atk - tAtk) + tAtk * 0.45 + 180
        else if (atk === tAtk) score = tAtk * 0.55 - atk * 0.35
        else score = -(tAtk - atk) - atk * 0.5
      } else {
        if (atk > tDef) score = tDef * 0.4 + 90
        else if (atk === tDef) score = 0
        else score = -(tDef - atk)
        if (target.card.faceDown) score += atk >= 2200 ? 100 : -140
        if (def.effect === 'pierce' && atk > tDef) score += (atk - tDef) * 0.7
      }
      if (def.effect === 'destroyBurn' && (tPos === 'atk' ? atk > tAtk : atk > tDef)) score += 80
      if (score > (best ? best.score : -9999)) best = { targetZone: target.zone, score }
    }
    if (best && best.score > 0) {
      return { type: 'attack', zone: entry.zone, targetZone: best.targetZone }
    }
  }

  return { type: 'endTurn' }
}

function chooseAiZone(player, defensive) {
  const empty = player.board.map((uid, zone) => (uid ? -1 : zone)).filter(zone => zone >= 0)
  if (!empty.length) return 0
  if (defensive) return empty[empty.length - 1]
  return empty[Math.floor(empty.length / 2)]
}

export function describeAction(state, seat, action) {
  if (!action) return ''
  const p = state.players[seat]
  if (action.type === 'summon') {
    const card = state.cards[action.uid]
    return card ? `${p.name}: ${CARD_DEFS[card.def].name} を${action.faceDown ? 'セット' : '召喚'}` : ''
  }
  if (action.type === 'attack') {
    const card = state.cards[state.players[seat].board[action.zone]]
    return card ? `${p.name}: ${CARD_DEFS[card.def].name} で攻撃` : ''
  }
  if (action.type === 'changePos') return `${p.name}: 表示形式変更`
  if (action.type === 'endTurn') return `${p.name}: ターン終了`
  return ''
}
