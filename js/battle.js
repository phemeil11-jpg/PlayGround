'use strict';

/* ============================================================
   Duel mechanics — summons, spells, traps, battle
   ============================================================ */

function drawCard(sideKey) {
  const side = S[sideKey];
  if (!side.deck.length) {
    log(`${sideLabel(sideKey)}のデッキが尽きた！`, sideKey);
    finishDuel(other(sideKey));
    return null;
  }
  const c = side.deck.pop();
  side.hand.push(c);
  if (sideKey === 'you') log(`<b>${c.name}</b> をドロー`, 'you');
  else log('相手がカードをドロー', 'foe');
  Sfx.draw();
  return c;
}

function dealDamage(sideKey, amount) {
  if (amount <= 0 || S.over) return;
  const side = S[sideKey];
  const real = Math.min(side.lp, amount);
  side.lp = Math.max(0, side.lp - amount);
  if (sideKey === 'foe') S.stats.damage += real;
  floatDamage(sideKey, real);
  screenShake();
  Sfx.hit();
  renderHUD();
  if (side.lp <= 0) checkEnd();
}

async function destroyMonster(sideKey, idx, opts = {}) {
  const side = S[sideKey];
  const z = side.monsters[idx];
  if (!z) return null;
  const card = z.card;
  const el = cardElAt(sideKey, 'monster', idx);
  const rect = el ? el.getBoundingClientRect() : null;
  if (el) el.classList.add('dying');
  if (rect) FX.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, card.hue || 40, 28);
  side.monsters[idx] = null;
  side.grave.push(card);
  Sfx.destroy();
  if (!opts.silent) log(`<b>${card.name}</b> は破壊された`, sideKey);
  await sleep(250);
  render();
  return card;
}

async function massDestroyMonsters(sideKey) {
  const side = S[sideKey];
  let any = false;
  for (let i = 0; i < 5; i++) {
    const z = side.monsters[i];
    if (!z) continue;
    any = true;
    const el = cardElAt(sideKey, 'monster', i);
    const rect = el ? el.getBoundingClientRect() : null;
    if (el) el.classList.add('dying');
    if (rect) FX.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, z.card.hue || 40, 26);
    side.grave.push(z.card);
    side.monsters[i] = null;
  }
  if (any) { Sfx.destroy(); screenShake(); await sleep(280); render(); }
  return any;
}

async function massDestroyTraps(sideKey) {
  const side = S[sideKey];
  let any = false;
  for (let i = 0; i < 5; i++) {
    const z = side.spells[i];
    if (!z) continue;
    any = true;
    burstAt(sideKey, 'spell', i, 45, 20);
    side.grave.push(z.card);
    side.spells[i] = null;
  }
  if (any) { Sfx.destroy(); await sleep(240); render(); }
  return any;
}

async function summonCard(sideKey, card, pos, tributeIdxs) {
  const side = S[sideKey];
  const hi = side.hand.findIndex(c => c.uid === card.uid);
  if (hi < 0) return false;
  if ((card.tribute || 0) !== tributeIdxs.length) return false;
  const idx = [2, 1, 3, 0, 4].find(i => !side.monsters[i]);
  if (idx === undefined) return false;

  tributeIdxs.forEach(i => {
    const z = side.monsters[i];
    if (z) { side.grave.push(z.card); side.monsters[i] = null; }
  });
  side.hand.splice(hi, 1);
  const defense = pos === 'defense';
  side.monsters[idx] = { card, pos: defense ? 'defense' : 'attack', set: defense, attacked: false, atkMod: 0 };
  side.normalSummoned = true;
  side.stats = side.stats || {};
  S.stats.summons++;
  log(`<b>${card.name}</b> を${defense ? '裏側守備表示でセット' : '召喚'}！`, sideKey);
  Sfx.summon();
  render();
  animateSummon(sideKey, idx, card.hue);
  await sleep(430);
  if (S.over) return true;
  await triggerSummonTraps(sideKey, idx);
  render();
  return true;
}

async function triggerSummonTraps(summonerKey, idx) {
  const zone = S[summonerKey].monsters[idx];
  if (!zone || effAtk(zone) < 1000) return false;
  const oppKey = other(summonerKey);
  const opp = S[oppKey];
  const ti = opp.spells.findIndex(z => z && z.card.kind === 'trap' && z.card.id === 'pit' && z.set && z.turnSet < S.turn);
  if (ti < 0) return false;
  const trap = opp.spells[ti];
  trap.set = false; trap.revealed = true;
  render();
  burstAt(oppKey, 'spell', ti, 195, 24);
  Sfx.trap();
  log(`罠カード発動！ <b>${trap.card.name}</b>`, oppKey);
  await sleep(700);
  if (!S[summonerKey].monsters[idx]) return false;
  log(`召喚された <b>${zone.card.name}</b> は穴に落ちた！`, oppKey);
  await destroyMonster(summonerKey, idx);
  if (opp.spells[ti] === trap) { opp.grave.push(trap.card); opp.spells[ti] = null; }
  render();
  await sleep(220);
  return true;
}

function setTrapCard(sideKey, card) {
  const side = S[sideKey];
  const hi = side.hand.findIndex(c => c.uid === card.uid);
  if (hi < 0) return false;
  const idx = [2, 1, 3, 0, 4].find(i => !side.spells[i]);
  if (idx === undefined) return false;
  side.hand.splice(hi, 1);
  side.spells[idx] = { card, set: true, turnSet: S.turn, revealed: false };
  log(`<b>${card.name}</b> をセット`, sideKey);
  Sfx.click();
  render();
  burstAt(sideKey, 'spell', idx, 45, 14);
  return true;
}

function findBestGraveMonster(side) {
  let best = null, bi = -1;
  side.grave.forEach((c, i) => {
    if (c.kind === 'monster' && (!best || c.atk > best.atk)) { best = c; bi = i; }
  });
  return { card: best, idx: bi };
}

async function activateSpell(sideKey, card) {
  const side = S[sideKey], foe = S[other(sideKey)];
  const hi = side.hand.findIndex(c => c.uid === card.uid);
  if (hi < 0) return false;
  side.hand.splice(hi, 1);
  side.grave.push(card);
  log(`<b>${card.name}</b> を発動！`, sideKey);
  Sfx.trap();
  render();
  await sleep(300);

  switch (card.id) {
    case 'pot': {
      for (let i = 0; i < 2; i++) {
        if (S.over) break;
        const c = drawCard(sideKey);
        if (!c) break;
      }
      break;
    }
    case 'hole': {
      flashScreen();
      log('フィールド上のモンスターが全て呑み込まれる！', sideKey);
      await massDestroyMonsters('you');
      await massDestroyMonsters('foe');
      break;
    }
    case 'bolt': {
      flashScreen();
      await massDestroyMonsters(other(sideKey));
      break;
    }
    case 'storm': {
      flashScreen();
      await massDestroyTraps('you');
      await massDestroyTraps('foe');
      break;
    }
    case 'cyclon': {
      const ti = foe.spells.findIndex(z => z);
      if (ti >= 0) {
        const target = foe.spells[ti];
        burstAt(other(sideKey), 'spell', ti, 158, 26);
        log(`<b>${target.card.name}</b> を破壊！`, sideKey);
        foe.spells[ti] = null;
        foe.grave.push(target.card);
        Sfx.destroy();
        render();
        await sleep(250);
      }
      break;
    }
    case 'reborn': {
      const pick = findBestGraveMonster(side);
      if (pick.card) {
        const idx = [2, 1, 3, 0, 4].find(i => !side.monsters[i]);
        if (idx !== undefined) {
          side.grave.splice(pick.idx, 1);
          side.monsters[idx] = { card: pick.card, pos: 'attack', set: false, attacked: false, atkMod: 0 };
          log(`<b>${pick.card.name}</b> が蘇った！`, sideKey);
          Sfx.summon();
          render();
          animateSummon(sideKey, idx, pick.card.hue);
          await sleep(420);
        }
      }
      break;
    }
    case 'axe': {
      let best = null;
      side.monsters.forEach(z => { if (z && !z.set && (!best || effAtk(z) > effAtk(best))) best = z; });
      if (best) {
        best.atkMod = (best.atkMod || 0) + 1000;
        log(`<b>${best.card.name}</b> の攻撃力が1000アップ！`, sideKey);
        Sfx.summon();
        render();
        await sleep(300);
      }
      break;
    }
  }
  render();
  return true;
}

async function triggerAttackTraps(attKey, defKey, attIdx) {
  const def = S[defKey];
  const ready = def.spells.map((z, i) => ({ z, i }))
    .filter(o => o.z && o.z.card.kind === 'trap' && o.z.set && o.z.turnSet < S.turn);
  if (!ready.length) return false;
  const find = id => ready.find(o => o.z.card.id === id);
  const attackers = S[attKey].monsters.filter(z => z && z.pos === 'attack').length;
  const pick = (attackers >= 2 && find('mirror')) || find('cylind') || find('blast') || find('mirror');
  if (!pick) return false;

  const { z, i } = pick;
  z.set = false; z.revealed = true;
  render();
  burstAt(defKey, 'spell', i, 45, 28);
  Sfx.trap();
  log(`罠カード発動！ <b>${z.card.name}</b>`, defKey);
  await sleep(720);

  let negated = true;
  if (z.card.id === 'mirror') {
    flashScreen();
    log('聖なるバリアが攻撃を跳ね返す！', defKey);
    for (let k = 0; k < 5; k++) {
      const m = S[attKey].monsters[k];
      if (m && m.pos === 'attack' && !m.set) await destroyMonster(attKey, k);
    }
  } else if (z.card.id === 'cylind') {
    const attacker = S[attKey].monsters[attIdx];
    if (attacker) {
      const dmg = effAtk(attacker);
      log(`攻撃を無効にし <b>${dmg}</b> ダメージを反射！`, defKey);
      flashScreen();
      dealDamage(attKey, dmg);
    }
  } else if (z.card.id === 'blast') {
    if (S[attKey].monsters[attIdx]) {
      log('炸裂装甲が攻撃モンスターを粉砕！', defKey);
      flashScreen();
      await destroyMonster(attKey, attIdx);
    }
  } else {
    negated = false;
  }

  if (def.spells[i] === z) { def.grave.push(z.card); def.spells[i] = null; }
  render();
  await sleep(280);
  return negated;
}

async function resolveAttack(attKey, defKey, attIdx, targetType, defIdx) {
  if (S.over) return;
  const att = S[attKey], def = S[defKey];
  let az = att.monsters[attIdx];
  if (!az || az.attacked || az.pos !== 'attack' || az.set) return;

  S.attacker = null;
  render();
  log(`<b>${az.card.name}</b> の攻撃！`, attKey);
  Sfx.attack();
  const ac = cardElAt(attKey, 'monster', attIdx);
  if (ac) ac.classList.add('attacking');
  await sleep(240);
  if (S.over) return;

  const negated = await triggerAttackTraps(attKey, defKey, attIdx);
  if (S.over) return;
  az = att.monsters[attIdx];
  if (negated || !az) { if (az) az.attacked = true; render(); return; }

  const atk = effAtk(az);
  if (targetType === 'direct') {
    log('ダイレクトアタック！', attKey);
    flashScreen();
    dealDamage(defKey, atk);
    await sleep(420);
  } else {
    const dz = def.monsters[defIdx];
    if (!dz) { az.attacked = true; render(); return; }
    const isDefense = dz.set || dz.pos === 'defense';
    const defStat = isDefense ? effDef(dz) : effAtk(dz);
    log(`<b>${az.card.name}</b> vs <b>${dz.card.name}</b>`, attKey);
    flashScreen();
    await sleep(300);

    if (atk > defStat) {
      if (isDefense) {
        log('守備モンスターを撃破！', attKey);
        await destroyMonster(defKey, defIdx);
      } else {
        const diff = atk - defStat;
        log(`<b>${dz.card.name}</b> を撃破！ ${diff} ダメージ`, attKey);
        await destroyMonster(defKey, defIdx, { silent: true });
        dealDamage(defKey, diff);
      }
    } else if (atk < defStat) {
      if (isDefense) {
        const diff = defStat - atk;
        log(`攻撃は弾かれた… ${diff} ダメージ`, attKey);
        dealDamage(attKey, diff);
      } else {
        const diff = defStat - atk;
        log(`返り討ち！ ${diff} ダメージ`, attKey);
        await destroyMonster(attKey, attIdx);
        dealDamage(attKey, diff);
      }
    } else {
      if (isDefense) {
        log('攻撃は防がれた。', attKey);
      } else {
        log('相打ち！ 両者破壊', attKey);
        await destroyMonster(defKey, defIdx);
        await destroyMonster(attKey, attIdx);
      }
    }
  }
  const still = att.monsters[attIdx];
  if (still) still.attacked = true;
  render();
}

function startTurn(sideKey, first = false) {
  if (!S || S.over) return;
  S.active = sideKey;
  S.turn++;
  const side = S[sideKey];
  side.normalSummoned = false;
  side.monsters.forEach(z => { if (z) z.attacked = false; });
  S.selected = null; S.attacker = null; S.pendingSummon = null; S.tributes = [];
  S.busy = sideKey === 'foe';
  render();
  if (!first) {
    banner(sideKey === 'you' ? 'YOUR TURN' : 'OPPONENT TURN', sideKey === 'foe');
    const c = drawCard(sideKey);
    if (!c || S.over) { render(); return; }
  }
  render();
  if (sideKey === 'foe') setTimeout(() => aiTurn(), 900);
}

function endTurn() {
  if (!S || S.over || S.busy || S.active !== 'you') return;
  S.selected = null; S.attacker = null; S.pendingSummon = null; S.tributes = [];
  S.busy = true;
  render();
  log('ターン終了', 'you');
  setTimeout(() => { if (!S.over) { S.busy = false; startTurn('foe'); } }, 340);
}
