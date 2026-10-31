import { CARDS, DECKS } from './cards.js'

export const START_LP = 8000
export const ZONE_COUNT = 5

export const otherSide = side => (side === 'p' ? 'a' : 'p')
export const sideName = side => (side === 'p' ? 'あなた' : '相手')
export const tributeNeeded = level => (level >= 7 ? 2 : level >= 5 ? 1 : 0)

let uidSeq = 0

function shuffle(list) {
  const a = list.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeCard(id) {
  const def = CARDS[id]
  return { uid: `u${++uidSeq}`, id, ...def }
}

function makePlayer(name) {
  return {
    name,
    lp: START_LP,
    deck: [],
    hand: [],
    monsters: Array(ZONE_COUNT).fill(null),
    spells: Array(ZONE_COUNT).fill(null),
    grave: []
  }
}

export function addLog(g, text, kind = 'info') {
  g.log.push({ text, kind, turn: g.turn })
  if (g.log.length > 120) g.log.shift()
}

export function createGame() {
  uidSeq = 0
  const g = {
    turn: 1,
    active: 'p',
    winner: null,
    normalSummoned: false,
    battleMode: false,
    uid: 0,
    log: [],
    p: makePlayer('あなた'),
    a: makePlayer('闇の決闘者')
  }
  g.p.deck = shuffle(DECKS.p)
  g.a.deck = shuffle(DECKS.a)
  drawCards(g, 'p', 5, true)
  drawCards(g, 'a', 5, true)
  addLog(g, 'デュエル開始！ 先攻はあなた。', 'system')
  return g
}

export function drawCards(g, side, n = 1, silent = false) {
  const p = g[side]
  const out = []
  for (let i = 0; i < n; i++) {
    if (p.deck.length === 0) {
      g.winner = otherSide(side)
      addLog(g, `${sideName(side)}の山札が尽きた！`, 'system')
      break
    }
    const card = makeCard(p.deck.pop())
    p.hand.push(card)
    out.push(card)
  }
  if (out.length && !silent) {
    addLog(g, `${sideName(side)}はカードを${out.length}枚ドローした。`, 'draw')
  }
  return out
}

export function beginTurn(g) {
  if (g.winner) return []
  addLog(g, `── ターン ${g.turn}：${sideName(g.active)} ──`, 'turn')
  return drawCards(g, g.active, 1)
}

export function endTurn(g) {
  if (g.winner) return
  g.active = otherSide(g.active)
  g.turn += 1
  g.normalSummoned = false
  g.battleMode = false
  const p = g[g.active]
  for (const m of p.monsters) if (m) m.hasAttacked = false
}

export function findMonster(g, side, uid) {
  return g[side].monsters.find(m => m && m.uid === uid) || null
}

export function monsterIndex(g, side, uid) {
  return g[side].monsters.findIndex(m => m && m.uid === uid)
}

export function damagePlayer(g, side, amount, source = '') {
  if (g.winner || amount <= 0) return
  const p = g[side]
  p.lp = Math.max(0, p.lp - amount)
  addLog(g, `${sideName(side)}に ${amount} ダメージ${source ? `（${source}）` : ''}`, 'damage')
  if (p.lp <= 0) {
    g.winner = otherSide(side)
    addLog(g, `${sideName(otherSide(side))}の勝利！`, 'system')
  }
}

export function healPlayer(g, side, amount) {
  const p = g[side]
  p.lp = Math.min(99999, p.lp + amount)
  addLog(g, `${sideName(side)}は ${amount} ライフを回復した。`, 'heal')
}

function sendMonsterToGrave(g, side, zone, destroyed = false) {
  const p = g[side]
  const m = p.monsters[zone]
  if (!m) return null
  p.monsters[zone] = null
  for (let i = 0; i < p.spells.length; i++) {
    const s = p.spells[i]
    if (s && s.equipTarget === m.uid) {
      p.grave.push(s)
      p.spells[i] = null
    }
  }
  p.grave.push(m)
  if (destroyed && m.effect === 'drawOnDestroy') {
    addLog(g, `${m.name} の効果でカードを1枚ドロー。`, 'effect')
    drawCards(g, side, 1)
  }
  return m
}

export function destroyMonster(g, side, uid) {
  const zi = monsterIndex(g, side, uid)
  if (zi < 0) return null
  const card = g[side].monsters[zi]
  addLog(g, `${card.name} は破壊された。`, 'destroy')
  return sendMonsterToGrave(g, side, zi, true)
}

export function releaseMonster(g, side, uid) {
  const zi = monsterIndex(g, side, uid)
  if (zi < 0) return null
  return sendMonsterToGrave(g, side, zi, false)
}

function triggerSummonEffect(g, side, card) {
  if (card.effect === 'burn400') {
    addLog(g, `${card.name} の効果発動！ 相手に400ダメージ。`, 'effect')
    damagePlayer(g, otherSide(side), 400, card.name)
  } else if (card.effect === 'heal1000') {
    addLog(g, `${card.name} の効果発動！ 1000ライフ回復。`, 'effect')
    healPlayer(g, side, 1000)
  }
}

export function summonMonster(g, side, uid, { tributes = [], set = false } = {}) {
  const p = g[side]
  if (g.winner) return { ok: false }
  if (g.normalSummoned) return { ok: false, msg: 'このターンはすでに召喚している。' }
  const hi = p.hand.findIndex(c => c.uid === uid)
  if (hi < 0) return { ok: false, msg: '手札にない。' }
  const card = p.hand[hi]
  if (card.type !== 'monster') return { ok: false, msg: 'モンスターではない。' }
  const need = tributeNeeded(card.level)
  if (tributes.length !== need) return { ok: false, msg: `リリースが ${need} 体必要。` }
  for (const t of tributes) {
    if (monsterIndex(g, side, t) < 0) return { ok: false, msg: 'リリース対象が不正。' }
  }
  const free = p.monsters.findIndex(z => !z)
  if (free < 0) return { ok: false, msg: 'モンスターゾーンが埋まっている。' }

  for (const t of tributes) releaseMonster(g, side, t)
  p.hand.splice(hi, 1)
  card.faceDown = !!set
  card.position = set ? 'defense' : 'attack'
  card.summonedTurn = g.turn
  card.changedTurn = 0
  card.hasAttacked = false
  card.equips = []
  p.monsters[free] = card
  g.normalSummoned = true
  addLog(g, `${sideName(side)}は ${card.name} を${set ? 'セット' : '召喚'}した。`, 'summon')
  if (!set) triggerSummonEffect(g, side, card)
  return { ok: true, card, zone: free }
}

export function setSpellCard(g, side, uid) {
  const p = g[side]
  const hi = p.hand.findIndex(c => c.uid === uid)
  if (hi < 0) return { ok: false, msg: '手札にない。' }
  const card = p.hand[hi]
  if (card.type === 'monster') return { ok: false, msg: 'モンスターはセットできない。' }
  const slot = p.spells.findIndex(z => !z)
  if (slot < 0) return { ok: false, msg: '魔法・罠ゾーンが埋まっている。' }
  p.hand.splice(hi, 1)
  card.faceDown = true
  card.setTurn = g.turn
  card.equipTarget = null
  p.spells[slot] = card
  addLog(g, `${sideName(side)}はカードを1枚セットした。`, 'set')
  return { ok: true, card, zone: slot }
}

export function activateSpell(g, side, uid, targetUid = null) {
  const p = g[side]
  if (g.winner) return { ok: false }
  const hi = p.hand.findIndex(c => c.uid === uid)
  if (hi < 0) return { ok: false, msg: '手札にない。' }
  const card = p.hand[hi]
  if (card.type !== 'spell') return { ok: false, msg: '魔法カードではない。' }
  const foe = g[otherSide(side)]

  if (card.id === 'destructionStorm') {
    if (!targetUid) return { ok: false, msg: '対象を選択してください。' }
    const t = foe.monsters.find(m => m && m.uid === targetUid)
    if (!t) return { ok: false, msg: '対象が存在しない。' }
    p.hand.splice(hi, 1)
    p.grave.push(card)
    addLog(g, `${sideName(side)}は 破壊の嵐 を発動！`, 'spell')
    destroyMonster(g, otherSide(side), t.uid)
    return { ok: true }
  }

  if (card.id === 'magicSword') {
    const t = g[side].monsters.find(m => m && m.uid === targetUid)
    if (!t) return { ok: false, msg: '対象を選択してください。' }
    const slot = p.spells.findIndex(z => !z)
    if (slot < 0) return { ok: false, msg: '魔法・罠ゾーンが埋まっている。' }
    p.hand.splice(hi, 1)
    card.faceDown = false
    card.equipTarget = t.uid
    card.setTurn = 0
    p.spells[slot] = card
    t.atk += 1000
    t.equips = [...(t.equips || []), card.uid]
    addLog(g, `${t.name} に 魔力の剣 を装備。攻撃力+1000！`, 'spell')
    return { ok: true }
  }

  if (card.id === 'revivalRite') {
    const gi = p.grave.findIndex(c => c.uid === targetUid && c.type === 'monster')
    if (gi < 0) return { ok: false, msg: '墓地にモンスターが必要。' }
    const slot = p.monsters.findIndex(z => !z)
    if (slot < 0) return { ok: false, msg: 'モンスターゾーンが埋まっている。' }
    const rev = p.grave.splice(gi, 1)[0]
    p.hand.splice(hi, 1)
    p.grave.push(card)
    rev.position = 'defense'
    rev.faceDown = false
    rev.summonedTurn = g.turn
    rev.hasAttacked = false
    rev.changedTurn = 0
    rev.equips = []
    p.monsters[slot] = rev
    addLog(g, `${sideName(side)}は 蘇生の儀 を発動！ ${rev.name} を守備表示で特殊召喚。`, 'spell')
    return { ok: true }
  }

  if (card.id === 'knowledgeFount') {
    p.hand.splice(hi, 1)
    p.grave.push(card)
    addLog(g, `${sideName(side)}は 知識の泉 を発動！`, 'spell')
    drawCards(g, side, 2)
    return { ok: true }
  }
  if (card.id === 'healingLight') {
    p.hand.splice(hi, 1)
    p.grave.push(card)
    addLog(g, `${sideName(side)}は 癒しの光 を発動！`, 'spell')
    healPlayer(g, side, 1000)
    return { ok: true }
  }
  return { ok: false, msg: 'このカードは使用できない。' }
}

export function activateSetSpell(g, side, uid, targetUid = null) {
  const p = g[side]
  if (g.winner) return { ok: false }
  const zi = p.spells.findIndex(s => s && s.uid === uid && s.type === 'spell')
  if (zi < 0) return { ok: false, msg: '発動できる魔法カードがない。' }
  const card = p.spells[zi]
  if (!card.faceDown) return { ok: false, msg: 'すでに発動中。' }
  if (card.setTurn >= g.turn) return { ok: false, msg: 'セットしたターンは発動できない。' }

  // 一度手札に戻して通常の発動処理を再利用する
  p.spells[zi] = null
  card.faceDown = false
  p.hand.push(card)
  const res = activateSpell(g, side, uid, targetUid)
  if (!res.ok) {
    const hi = p.hand.findIndex(c => c.uid === uid)
    if (hi >= 0) p.hand.splice(hi, 1)
    card.faceDown = true
    p.spells[zi] = card
    return res
  }
  return res
}

export function changePosition(g, side, uid) {
  const m = findMonster(g, side, uid)
  if (!m) return { ok: false }
  if (m.summonedTurn === g.turn) return { ok: false, msg: '召喚したターンは表示形式を変更できない。' }
  if (m.changedTurn === g.turn) return { ok: false, msg: 'このターンはすでに変更した。' }
  if (m.faceDown) {
    m.faceDown = false
    m.position = 'attack'
    m.changedTurn = g.turn
    addLog(g, `${sideName(side)}は ${m.name} を反転召喚した。`, 'summon')
    return { ok: true }
  }
  m.position = m.position === 'attack' ? 'defense' : 'attack'
  m.changedTurn = g.turn
  addLog(g, `${m.name} を${m.position === 'attack' ? '攻撃表示' : '守備表示'}に変更。`, 'info')
  return { ok: true }
}

function activateTrap(g, side, trapUid, attacker, attackerSide) {
  const p = g[side]
  const zi = p.spells.findIndex(s => s && s.uid === trapUid)
  if (zi < 0) return null
  const trap = p.spells[zi]
  p.spells[zi] = null
  trap.faceDown = false
  p.grave.push(trap)
  addLog(g, `${sideName(side)}は罠カード ${trap.name} を発動！`, 'trap')

  if (trap.id === 'holyBarrier') {
    addLog(g, '攻撃を無効にした！', 'trap')
    return { kind: 'negate', trap }
  }
  if (trap.id === 'ruinPit') {
    addLog(g, `${attacker.name} を破壊し、攻撃を無効にした！`, 'trap')
    const ai = monsterIndex(g, attackerSide, attacker.uid)
    if (ai >= 0) sendMonsterToGrave(g, attackerSide, ai, true)
    return { kind: 'destroy', trap, attacker }
  }
  if (trap.id === 'counterMirror') {
    addLog(g, `攻撃を跳ね返し、${attacker.atk} ダメージ！`, 'trap')
    damagePlayer(g, attackerSide, attacker.atk, '反撃の鏡')
    return { kind: 'reflect', trap, amount: attacker.atk }
  }
  return { kind: 'none', trap }
}

export async function performAttack(g, side, attackerUid, targetUid, hooks = {}) {
  const event = hooks.event || (async () => {})
  const defSide = otherSide(side)
  if (g.winner) return { ok: false }
  const atk = findMonster(g, side, attackerUid)
  if (!atk) return { ok: false, msg: '攻撃モンスターがいない。' }
  if (atk.faceDown || atk.position !== 'attack') return { ok: false, msg: '攻撃表示ではない。' }
  if (atk.hasAttacked) return { ok: false, msg: 'このモンスターは攻撃済み。' }
  const defender = g[defSide]
  const target = targetUid ? defender.monsters.find(m => m && m.uid === targetUid) : null
  if (!target && defender.monsters.some(Boolean)) return { ok: false, msg: '攻撃対象を選択してください。' }

  const traps = defender.spells.filter(s => s && s.type === 'trap' && s.faceDown && s.setTurn < g.turn)
  if (traps.length && hooks.pickTrap) {
    const choice = await hooks.pickTrap(traps, atk, target)
    if (choice) {
      atk.hasAttacked = true
      const result = activateTrap(g, defSide, choice.uid, atk, side)
      await event({ type: 'trap', side: defSide, result })
      return { ok: true, trapped: true }
    }
  }

  atk.hasAttacked = true
  await event({ type: 'attack', side, attackerUid: atk.uid, targetUid: target ? target.uid : null, attacker: atk })

  if (!target) {
    const dmg = atk.atk
    await event({ type: 'clash', side, attackerUid: atk.uid, targetUid: null, direct: true })
    damagePlayer(g, defSide, dmg, atk.name)
    await event({ type: 'damage', side: defSide, amount: dmg })
    return { ok: true, direct: true, amount: dmg }
  }

  if (target.faceDown) {
    target.faceDown = false
    target.position = 'defense'
  }
  const targetZone = monsterIndex(g, defSide, target.uid)
  const attackerZone = monsterIndex(g, side, atk.uid)
  const defPos = target.position === 'defense'
  await event({ type: 'clash', side, attackerUid: atk.uid, targetUid: target.uid, defense: defPos })

  if (defPos) {
    if (atk.atk > target.def) {
      const fallen = target
      addLog(g, `${atk.name} が ${fallen.name} を打ち破った！`, 'battle')
      sendMonsterToGrave(g, defSide, targetZone, true)
      await event({ type: 'destroy', side: defSide, zone: targetZone, card: fallen })
      return { ok: true, destroyed: fallen }
    }
    if (atk.atk < target.def) {
      const dmg = target.def - atk.atk
      addLog(g, `${atk.name} は跳ね返された！`, 'battle')
      damagePlayer(g, side, dmg, target.name)
      await event({ type: 'damage', side, amount: dmg })
      return { ok: true, reflected: dmg }
    }
    addLog(g, '攻撃は通らなかった。', 'battle')
    return { ok: true }
  }

  const a = atk.atk
  const d = target.atk
  if (a > d) {
    const fallen = target
    addLog(g, `${atk.name} が ${fallen.name} を破壊！ ${a - d} ダメージ！`, 'battle')
    sendMonsterToGrave(g, defSide, targetZone, true)
    await event({ type: 'destroy', side: defSide, zone: targetZone, card: fallen })
    damagePlayer(g, defSide, a - d, atk.name)
    await event({ type: 'damage', side: defSide, amount: a - d })
    return { ok: true, destroyed: fallen, amount: a - d }
  }
  if (a < d) {
    const fallen = atk
    addLog(g, `${atk.name} は ${target.name} に敗れた！ ${d - a} ダメージ！`, 'battle')
    sendMonsterToGrave(g, side, attackerZone, true)
    await event({ type: 'destroy', side, zone: attackerZone, card: fallen })
    damagePlayer(g, side, d - a, target.name)
    await event({ type: 'damage', side, amount: d - a })
    return { ok: true, destroyed: fallen, amount: d - a }
  }

  addLog(g, '相打ち！ 両者ともに破壊された。', 'battle')
  sendMonsterToGrave(g, defSide, targetZone, true)
  await event({ type: 'destroy', side: defSide, zone: targetZone, card: target })
  sendMonsterToGrave(g, side, attackerZone, true)
  await event({ type: 'destroy', side, zone: attackerZone, card: atk })
  return { ok: true, mutual: true }
}
