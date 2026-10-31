import {
  activateSpell, addLog, performAttack, setSpellCard, summonMonster, tributeNeeded
} from './engine.js'

const defaultSleep = ms => new Promise(r => setTimeout(r, ms))

function bestAtk(player) {
  return Math.max(0, ...player.monsters.filter(Boolean).map(m => m.atk))
}

export function chooseAiTrap(g, traps, attacker, target) {
  if (!traps || !traps.length) return null
  // この攻撃でAIが受けるライフダメージの見積もり
  let incoming = 0
  if (!target) incoming = attacker.atk
  else if (target.position !== 'defense') incoming = Math.max(0, attacker.atk - target.atk)

  const find = id => traps.find(t => t.id === id)
  const lethal = g.a.lp <= incoming
  if (lethal) return find('counterMirror') || find('ruinPit') || traps[0]
  if (attacker.atk >= 2400) return find('ruinPit') || find('counterMirror') || null
  if (attacker.atk >= 1900) return find('counterMirror') || find('ruinPit') || null
  if (incoming >= 1500) return find('ruinPit') || find('counterMirror') || traps[0]
  return null
}

export async function runAiTurn(g, hooks = {}) {
  const sleep = hooks.sleep || defaultSleep
  const render = hooks.render || (() => {})
  const event = hooks.event || (async () => {})
  const pickTrap = hooks.pickTrap
  const me = g.a
  const foe = g.p

  await sleep(520)
  if (g.winner) return

  const act = async (fn, wait = 460) => {
    fn()
    render()
    await sleep(wait)
  }

  // 1. 罠を伏せる
  const trapCards = [...me.hand].filter(c => c.type === 'trap')
  for (const t of trapCards) {
    if (g.winner) return
    if (me.spells.filter(Boolean).length >= 4) break
    if (Math.random() < 0.22 && trapCards.length > 1) continue
    await act(() => setSpellCard(g, 'a', t.uid))
  }

  // 2. 召喚
  if (!g.normalSummoned && !g.winner) {
    const handMonsters = me.hand.filter(c => c.type === 'monster')
    const field = me.monsters.filter(Boolean)
    let plan = null

    const bigs = handMonsters.filter(c => tributeNeeded(c.level) > 0).sort((a, b) => b.atk - a.atk)
    for (const big of bigs) {
      const need = tributeNeeded(big.level)
      if (field.length < need) continue
      const pool = field.filter(m => m.summonedTurn < g.turn && !(m.equips || []).length)
      if (pool.length < need) continue
      const weakest = [...pool].sort((x, y) => (x.atk + x.def) - (y.atk + y.def)).slice(0, need)
      if (big.atk >= bestAtk(me) + 400) {
        plan = { card: big, tributes: weakest.map(m => m.uid), set: false }
        break
      }
    }

    if (!plan) {
      const smalls = handMonsters
        .filter(c => tributeNeeded(c.level) === 0)
        .sort((a, b) => (b.atk + b.def) - (a.atk + a.def))
      if (smalls.length) {
        const c = smalls[0]
        const threatened = foe.monsters.some(m => m && !m.faceDown && m.atk > c.atk) ||
          (foe.monsters.some(Boolean) && field.length === 0)
        const set = c.def >= c.atk + 100 && (threatened || c.atk < 1400)
        plan = { card: c, tributes: [], set }
      }
    }

    if (plan) {
      await act(() => summonMonster(g, 'a', plan.card.uid, { tributes: plan.tributes, set: plan.set }), 700)
    }
  }

  // 3. 魔法
  const spells = [...me.hand].filter(c => c.type === 'spell')
  for (const s of spells) {
    if (g.winner) return
    const card = me.hand.find(c => c.uid === s.uid)
    if (!card) continue
    let used = false

    if (card.id === 'knowledgeFount') {
      if (me.hand.length <= 5 && me.deck.length >= 2) { activateSpell(g, 'a', card.uid); used = true }
    } else if (card.id === 'healingLight') {
      if (me.lp <= 5800) { activateSpell(g, 'a', card.uid); used = true }
    } else if (card.id === 'destructionStorm') {
      const targets = foe.monsters.filter(Boolean).sort((x, y) => y.atk - x.atk)
      if (targets.length && targets[0].atk >= bestAtk(me) - 200) {
        activateSpell(g, 'a', card.uid, targets[0].uid)
        used = true
      }
    } else if (card.id === 'magicSword') {
      const own = me.monsters.filter(m => m && !m.faceDown && !(m.equips || []).length)
        .sort((x, y) => y.atk - x.atk)[0]
      if (own && me.spells.filter(Boolean).length < 5) {
        activateSpell(g, 'a', card.uid, own.uid)
        used = true
      }
    } else if (card.id === 'revivalRite') {
      const rev = me.grave.filter(c => c.type === 'monster').sort((x, y) => y.atk - x.atk)[0]
      if (rev && me.monsters.some(z => !z) && me.monsters.filter(Boolean).length < 2) {
        activateSpell(g, 'a', card.uid, rev.uid)
        used = true
      }
    }

    if (used) {
      addLog(g, '相手の魔法が発動した。', 'spell')
      render()
      await sleep(560)
    }
  }

  // 4. バトル
  let guard = 0
  while (!g.winner && guard++ < 12) {
    const attackers = me.monsters
      .filter(m => m && !m.faceDown && m.position === 'attack' && !m.hasAttacked)
    if (!attackers.length) break
    const enemies = foe.monsters.filter(Boolean)

    if (!enemies.length) {
      const attacker = attackers.sort((a, b) => b.atk - a.atk)[0]
      const res = await performAttack(g, 'a', attacker.uid, null, { event, pickTrap })
      render()
      await sleep(400)
      if (!res.ok) break
      continue
    }

    let best = null
    for (const attacker of attackers) {
      for (const t of enemies) {
        let score
        if (t.faceDown) {
          score = attacker.atk > 1900 ? 320 : -140
        } else if (t.position === 'defense') {
          if (attacker.atk > t.def) score = 640 + t.def
          else if (attacker.atk === t.def) score = 30
          else score = -560
        } else {
          if (attacker.atk > t.atk) score = 420 + (attacker.atk - t.atk)
          else if (attacker.atk === t.atk) score = -50
          else score = -680
        }
        if (!best || score > best.score) best = { attacker, target: t, score }
      }
    }

    if (!best || best.score <= 0) break

    const res = await performAttack(g, 'a', best.attacker.uid, best.target.uid, { event, pickTrap })
    render()
    await sleep(380)
    if (!res.ok) break
  }

  if (!g.winner) addLog(g, '相手はターンを終了した。', 'info')
}
