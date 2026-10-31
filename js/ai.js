'use strict';

/* ============================================================
   Opponent AI
   ============================================================ */

function aiSide() { return S.foe; }
function aiStrongest(list) {
  return list.reduce((m, z) => (z && !z.set ? Math.max(m, effAtk(z)) : m), 0);
}

async function aiSummon() {
  const ai = S.foe, you = S.you;
  if (ai.normalSummoned) return;
  if (!ai.monsters.some(z => !z)) return;
  const owned = ai.monsters.map((z, i) => (z ? { z, i } : null)).filter(Boolean);
  const hand = ai.hand.filter(c => c.kind === 'monster');
  if (!hand.length) return;
  const strongestYou = aiStrongest(you.monsters);
  const maxOwn = owned.reduce((m, o) => Math.max(m, effAtk(o.z)), 0);

  let best = null;
  for (const c of hand) {
    const need = c.tribute || 0;
    if (need > owned.length) continue;
    const tribs = [...owned].sort((a, b) => effAtk(a.z) - effAtk(b.z)).slice(0, need);
    const tributeAtk = tribs.reduce((s, o) => s + effAtk(o.z), 0);
    if (need > 0) {
      const worth = c.atk > maxOwn + (need === 2 ? 350 : 100) || c.atk > strongestYou + 120;
      if (!worth) continue;
    }
    let score = c.atk + c.level * 8 - tributeAtk * .25;
    if (c.atk > strongestYou) score += 160;
    if (!best || score > best.score) best = { c, need, tribs: tribs.map(o => o.i), score };
  }
  if (!best) return;

  let pos = 'attack';
  if (best.need === 0 && best.c.atk < strongestYou && best.c.def >= best.c.atk) pos = 'defense';
  if (best.c.atk < 1300 && strongestYou > best.c.atk) pos = 'defense';
  if (ai.lp < 2200 && best.c.atk < strongestYou) pos = 'defense';
  await summonCard('foe', best.c, pos, best.tribs);
}

async function aiSpellPhase() {
  const ai = S.foe, you = S.you;
  const has = id => ai.hand.find(c => c.id === id);
  const youMon = you.monsters.filter(Boolean);
  const aiMon = ai.monsters.filter(Boolean);
  const youStrong = aiStrongest(you.monsters);
  const aiStrong = aiStrongest(ai.monsters);
  const youTraps = you.spells.filter(Boolean).length;

  let c = has('bolt');
  if (c && youMon.length && (youMon.length >= 2 || youStrong > aiStrong)) {
    await activateSpell('foe', c); await sleep(360); if (S.over) return;
  }
  c = has('hole');
  if (c && youMon.length >= 2 && youMon.length > aiMon.length) {
    await activateSpell('foe', c); await sleep(360); if (S.over) return;
  }
  c = has('storm');
  if (c && youTraps >= 1 && (youTraps >= 2 || Math.random() < .5)) {
    await activateSpell('foe', c); await sleep(360); if (S.over) return;
  }
  c = has('cyclon');
  if (c && youTraps >= 1) {
    await activateSpell('foe', c); await sleep(300); if (S.over) return;
  }
}

async function aiSupportSpells() {
  const ai = S.foe;
  const has = id => ai.hand.find(c => c.id === id);
  let c = has('reborn');
  if (c && findBestGraveMonster(ai).card && ai.monsters.some(z => !z)) {
    await activateSpell('foe', c); await sleep(320); if (S.over) return;
  }
  c = has('axe');
  if (c && ai.monsters.some(z => z && !z.set)) {
    await activateSpell('foe', c); await sleep(260); if (S.over) return;
  }
}

async function aiAttackPhase() {
  for (let idx = 0; idx < 5; idx++) {
    if (S.over) return;
    const z = S.foe.monsters[idx];
    if (!z || z.attacked || z.pos !== 'attack' || z.set) continue;
    const atk = effAtk(z);

    if (!S.you.monsters.some(Boolean)) {
      await resolveAttack('foe', 'you', idx, 'direct');
      await sleep(430);
      continue;
    }

    let best = null;
    S.you.monsters.forEach((t, tidx) => {
      if (!t) return;
      if (t.set) {
        if (atk >= 2100) {
          const score = 280;
          if (!best || score > best.score) best = { tidx, score };
        }
        return;
      }
      const defStat = t.pos === 'defense' ? effDef(t) : effAtk(t);
      if (atk < defStat) return;
      if (atk === defStat) {
        if (t.pos === 'defense') return;
        if (S.foe.monsters.filter(Boolean).length < S.you.monsters.filter(Boolean).length) return;
      }
      const score = (t.pos === 'defense' ? 180 : 400) + Math.max(0, atk - defStat);
      if (!best || score > best.score) best = { tidx, score };
    });
    if (best) {
      await resolveAttack('foe', 'you', idx, 'monster', best.tidx);
      await sleep(430);
    }
  }
}

async function aiTurn() {
  if (!S || S.over) return;
  S.busy = true;
  S.selected = null; S.attacker = null;
  render();
  await sleep(520);
  if (S.over) return;

  // Pot of Greed first — card advantage is always correct.
  for (let guard = 0; guard < 2; guard++) {
    const pot = S.foe.hand.find(c => c.id === 'pot');
    if (!pot) break;
    await activateSpell('foe', pot);
    await sleep(340);
    if (S.over) return;
  }

  // Set traps.
  let setCount = 0;
  for (const t of S.foe.hand.filter(c => c.kind === 'trap')) {
    if (setCount >= 2) break;
    if (S.foe.spells.filter(Boolean).length >= 3) break;
    if (setTrapCard('foe', t)) { setCount++; await sleep(240); }
  }

  await aiSpellPhase();
  if (S.over) return;

  await aiSummon();
  await sleep(300);
  if (S.over) return;

  await aiSupportSpells();
  if (S.over) return;

  await aiAttackPhase();
  if (S.over) return;

  await sleep(420);
  S.busy = false;
  startTurn('you');
}
