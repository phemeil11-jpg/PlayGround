import { CARDS, DECK_LIST, card } from "./data.js";

/* ------------------------------------------------------------------ *
 *  Host-authoritative game state.
 *  Every mutation returns {ok, msg} and bumps state.seq + state.last.
 * ------------------------------------------------------------------ */

let uidCounter = 0;
function uid() {
  uidCounter = (uidCounter + 1) % 1e9;
  return "u" + uidCounter.toString(36) + Math.random().toString(36).slice(2, 6);
}

function randomInt(n) {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] % n;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function makeCard(cid) {
  const d = card(cid);
  const base = { uid: uid(), cid };
  if (d.t === "m") {
    return { ...base, atk: d.atk, def: d.def, pos: "atk", attacked: false, summonedTurn: 0, changedTurn: 0 };
  }
  return { ...base, faceDown: false, setTurn: 0 };
}

function makeDeck() {
  return shuffle(DECK_LIST.map(makeCard));
}

function makePlayer(name) {
  return {
    name,
    lp: 4000,
    deck: [],
    hand: [],
    grave: [],
    monsters: [null, null, null, null],
    spells: [null, null, null, null],
    summonUsed: false
  };
}

export function createLobby(room, hostId) {
  return {
    v: 1,
    room,
    hostId,
    guestId: null,
    guestSeen: 0,
    seq: 0,
    started: false,
    turn: 0,
    current: 0,
    winner: null,
    battleLocked: false,
    match: 0,
    players: [makePlayer("氷の主"), makePlayer("雪の旅人")],
    log: [],
    last: null
  };
}

export function addLog(state, text) {
  state.log.push({ n: Math.max(1, state.turn), text });
  if (state.log.length > 100) state.log.splice(0, state.log.length - 100);
}

export function startDuel(state, first = 0) {
  state.started = true;
  state.turn = 1;
  state.current = first;
  state.winner = null;
  state.battleLocked = false;
  state.log = [];
  state.last = null;

  for (const p of state.players) {
    p.lp = 4000;
    p.deck = makeDeck();
    p.hand = p.deck.splice(-5);
    p.grave = [];
    p.monsters = [null, null, null, null];
    p.spells = [null, null, null, null];
    p.summonUsed = false;
  }

  addLog(state, `デュエル開始。先攻は${state.players[first].name}。`);
  addLog(state, `--- ${state.players[first].name}のターン（1）---`);
  state.seq++;
  return state;
}

export function resetDuel(state) {
  state.match = (state.match || 0) + 1;
  const first = (state.match - 1) % 2;
  return startDuel(state, first);
}

/* ------------------------------- view ------------------------------- */

function handView(c) {
  return { uid: c.uid, cid: c.cid };
}

function monView(m) {
  return {
    uid: m.uid,
    cid: m.cid,
    atk: m.atk,
    def: m.def,
    pos: m.pos,
    attacked: m.attacked,
    summonedTurn: m.summonedTurn,
    changedTurn: m.changedTurn
  };
}

function spellView(t) {
  return { uid: t.uid, cid: t.cid, faceDown: t.faceDown, setTurn: t.setTurn };
}

export function viewFor(state, pi) {
  return {
    v: 1,
    room: state.room,
    seq: state.seq,
    started: state.started,
    turn: state.turn,
    current: state.current,
    winner: state.winner,
    battleLocked: state.battleLocked,
    you: pi,
    last: state.last,
    players: state.players.map((p, i) => ({
      name: p.name,
      lp: p.lp,
      handCount: p.hand.length,
      deckCount: p.deck.length,
      grave: p.grave.map((c) => c.cid),
      hand: i === pi ? p.hand.map(handView) : null,
      monsters: p.monsters.map((m) => (m ? monView(m) : null)),
      spells: p.spells.map((t) => (t ? (i === pi ? spellView(t) : { faceDown: !!t.faceDown }) : null)),
      summonUsed: p.summonUsed
    })),
    log: state.log.slice(-32)
  };
}

/* ------------------------------ helpers ----------------------------- */

function validZone(z) {
  return Number.isInteger(z) && z >= 0 && z < 4;
}

function findHand(p, uidValue) {
  return p.hand.findIndex((c) => c.uid === uidValue);
}

function findTrap(state, ownerPi, fxs) {
  const p = state.players[ownerPi];
  for (let i = 0; i < 4; i++) {
    const t = p.spells[i];
    if (t && t.faceDown && t.setTurn < state.turn && fxs.includes(card(t.cid).fx)) {
      return { zone: i, c: t };
    }
  }
  return null;
}

function useTrap(state, ownerPi, zone, t) {
  const p = state.players[ownerPi];
  p.spells[zone] = null;
  t.faceDown = false;
  p.grave.push(t);
}

function destroyMonster(state, ownerPi, zone) {
  const p = state.players[ownerPi];
  const m = p.monsters[zone];
  if (m) {
    p.monsters[zone] = null;
    p.grave.push(m);
  }
  return m;
}

function bestGraveMonster(p) {
  let best = -1;
  for (let i = 0; i < p.grave.length; i++) {
    const c = p.grave[i];
    if (card(c.cid).t !== "m") continue;
    if (best < 0) {
      best = i;
      continue;
    }
    const a = c.atk ?? card(c.cid).atk;
    const b = p.grave[best].atk ?? card(p.grave[best].cid).atk;
    if (a > b) best = i;
  }
  return best;
}

function drawCards(p, n) {
  let got = 0;
  for (let i = 0; i < n; i++) {
    if (!p.deck.length) break;
    p.hand.push(p.deck.pop());
    got++;
  }
  return got;
}

function finish(state, last) {
  state.seq++;
  state.last = {
    seq: state.seq,
    a: "none",
    by: null,
    zone: null,
    target: null,
    dmg: 0,
    dmgTo: null,
    text: "",
    ...(last || {})
  };
  return { ok: true };
}

function bad(msg) {
  return { ok: false, msg };
}

function isTurn(state, pi) {
  return state.started && state.winner == null && state.current === pi;
}

/* ------------------------------ actions ----------------------------- */

export function applyAction(state, pi, action) {
  if (!state || !state.started) return bad("デュエルはまだ始まっていません。");
  if (!action || typeof action !== "object") return bad("操作が不正です。");

  /* surrender is always available */
  if (action.a === "surrender") {
    if (state.winner != null) return bad("デュエルは終了しています。");
    state.winner = 1 - pi;
    addLog(state, `${state.players[pi].name}が降参。${state.players[state.winner].name}の勝利！`);
    return finish(state, { a: "win", by: state.winner, dmgTo: pi, text: "降参" });
  }

  /* rematch only after a result */
  if (action.a === "rematch") {
    if (state.winner == null) return bad("デュエルはまだ終わっていません。");
    resetDuel(state);
    return { ok: true };
  }

  if (state.winner != null) return bad("デュエルは終了しています。");
  if (!isTurn(state, pi)) return bad("あなたのターンではありません。");

  const p = state.players[pi];
  const o = state.players[1 - pi];

  switch (action.a) {
    /* ---------------- summon ---------------- */
    case "summon": {
      if (p.summonUsed) return bad("このターンはもう召喚しています。");
      if (!validZone(action.zone)) return bad("召喚先が不正です。");
      if (p.monsters[action.zone]) return bad("そのゾーンにはモンスターがいます。");
      const idx = findHand(p, action.handUid);
      if (idx < 0) return bad("そのカードは手札にありません。");
      const c = p.hand[idx];
      const d = card(c.cid);
      if (d.t !== "m") return bad("モンスターカードではありません。");

      p.hand.splice(idx, 1);
      c.pos = "atk";
      c.attacked = false;
      c.summonedTurn = state.turn;
      c.changedTurn = 0;
      p.monsters[action.zone] = c;
      p.summonUsed = true;
      addLog(state, `${p.name}は「${d.n}」を召喚。`);

      const pit = findTrap(state, 1 - pi, ["pit"]);
      if (pit) {
        const mon = p.monsters[action.zone];
        if (mon && mon.atk >= 1500) {
          useTrap(state, 1 - pi, pit.zone, pit.c);
          destroyMonster(state, pi, action.zone);
          addLog(state, `「雪崩の落とし穴」が発動！ 「${d.n}」を破壊。`);
          return finish(state, {
            a: "trap", by: 1 - pi, zone: pit.zone, target: action.zone, text: "雪崩の落とし穴"
          });
        }
      }
      return finish(state, { a: "summon", by: pi, zone: action.zone, text: d.n });
    }

    /* ---------------- set trap ---------------- */
    case "set": {
      if (!validZone(action.zone)) return bad("セット先が不正です。");
      if (p.spells[action.zone]) return bad("そのゾーンにはカードがあります。");
      const idx = findHand(p, action.handUid);
      if (idx < 0) return bad("そのカードは手札にありません。");
      const c = p.hand[idx];
      const d = card(c.cid);
      if (d.t !== "tr") return bad("罠カードではありません。");

      p.hand.splice(idx, 1);
      c.faceDown = true;
      c.setTurn = state.turn;
      p.spells[action.zone] = c;
      addLog(state, `${p.name}は魔法・罠ゾーンにカードをセット。`);
      return finish(state, { a: "set", by: pi, zone: action.zone, text: d.n });
    }

    /* ---------------- change position ---------------- */
    case "change": {
      if (!validZone(action.zone)) return bad("対象が不正です。");
      const m = p.monsters[action.zone];
      if (!m) return bad("モンスターがいません。");
      if (m.summonedTurn === state.turn) return bad("召喚したターンは表示形式を変更できません。");
      if (m.changedTurn === state.turn) return bad("このターンはもう表示形式を変更しています。");
      if (m.attacked) return bad("攻撃したモンスターは表示形式を変更できません。");
      m.pos = m.pos === "atk" ? "def" : "atk";
      m.changedTurn = state.turn;
      addLog(state, `${p.name}は「${card(m.cid).n}」を${m.pos === "atk" ? "攻撃" : "守備"}表示に変更。`);
      return finish(state, { a: "change", by: pi, zone: action.zone, text: card(m.cid).n });
    }

    /* ---------------- activate spell ---------------- */
    case "spell": {
      const idx = findHand(p, action.handUid);
      if (idx < 0) return bad("そのカードは手札にありません。");
      const c = p.hand[idx];
      const d = card(c.cid);
      if (d.t !== "s") return bad("魔法カードではありません。");

      if (d.fx === "destroy") {
        if (!validZone(action.targetZone) || !o.monsters[action.targetZone]) {
          return bad("相手モンスターを対象に選んでください。");
        }
      }
      if (d.fx === "revive") {
        if (!validZone(action.zone) || p.monsters[action.zone]) {
          return bad("自分の空きモンスターゾーンを選んでください。");
        }
        if (bestGraveMonster(p) < 0) return bad("墓地にモンスターがいません。");
      }
      if (d.fx === "boost" && !p.monsters.some(Boolean)) {
        return bad("自分のモンスターがいません。");
      }

      p.hand.splice(idx, 1);
      p.grave.push(c);

      if (d.fx === "draw2") {
        const got = drawCards(p, 2);
        addLog(state, `${p.name}は「強欲な氷晶」を発動。${got}枚ドロー。`);
      } else if (d.fx === "heal") {
        p.lp += 1000;
        addLog(state, `${p.name}は「極光の加護」を発動。ライフを1000回復。`);
      } else if (d.fx === "destroy") {
        const target = o.monsters[action.targetZone];
        const tn = target ? card(target.cid).n : "モンスター";
        destroyMonster(state, 1 - pi, action.targetZone);
        addLog(state, `${p.name}は「砕氷の一撃」を発動！ 「${tn}」を破壊。`);
      } else if (d.fx === "boost") {
        let n = 0;
        for (const m of p.monsters) {
          if (m) {
            m.atk += 500;
            n++;
          }
        }
        addLog(state, `${p.name}は「猛吹雪の号令」を発動。${n}体のATKが500アップ。`);
      } else if (d.fx === "revive") {
        const gi = bestGraveMonster(p);
        const mon = p.grave.splice(gi, 1)[0];
        mon.pos = "def";
        mon.attacked = false;
        mon.summonedTurn = state.turn;
        mon.changedTurn = state.turn;
        p.monsters[action.zone] = mon;
        addLog(state, `${p.name}は「北極の蘇生」を発動！ 「${card(mon.cid).n}」を守備表示で特殊召喚。`);
      }

      return finish(state, {
        a: "spell", by: pi, zone: action.zone ?? null, target: action.targetZone ?? null, text: d.n
      });
    }

    /* ---------------- attack ---------------- */
    case "attack": {
      if (!validZone(action.zone)) return bad("攻撃するモンスターを選んでください。");
      const attacker = p.monsters[action.zone];
      if (!attacker) return bad("攻撃するモンスターがいません。");
      if (attacker.pos !== "atk") return bad("守備表示のモンスターは攻撃できません。");
      if (attacker.attacked) return bad("このモンスターはこのターン攻撃済みです。");
      if (state.battleLocked) return bad("このターンの攻撃は終了しています。");

      const direct = action.targetZone == null;
      if (direct) {
        if (o.monsters.some(Boolean)) return bad("相手モンスターがいるため直接攻撃できません。");
      } else {
        if (!validZone(action.targetZone) || !o.monsters[action.targetZone]) {
          return bad("攻撃対象がいません。");
        }
      }

      attacker.attacked = true;

      /* attack-reaction traps: first set trap from the left resolves */
      const trap = findTrap(state, 1 - pi, ["mirror", "wall"]);
      if (trap) {
        const fx = card(trap.c.cid).fx;
        useTrap(state, 1 - pi, trap.zone, trap.c);
        if (fx === "mirror") {
          destroyMonster(state, pi, action.zone);
          addLog(state, `「氷鏡の罠」が発動！ 攻撃を無効にし、「${card(attacker.cid).n}」を破壊。`);
        } else {
          state.battleLocked = true;
          addLog(state, `「吹雪の防壁」が発動！ 攻撃を無効にし、このターンの攻撃を終了。`);
        }
        return finish(state, {
          a: "trap", by: 1 - pi, zone: trap.zone, target: action.zone, dmg: 0, dmgTo: pi,
          text: fx === "mirror" ? "氷鏡の罠" : "吹雪の防壁"
        });
      }

      let dmg = 0;
      let dmgTo = null;
      let text = "";

      if (direct) {
        dmg = attacker.atk;
        o.lp = Math.max(0, o.lp - dmg);
        dmgTo = 1 - pi;
        addLog(state, `${p.name}の「${card(attacker.cid).n}」が直接攻撃！ ${o.name}に${dmg}ダメージ。`);
      } else {
        const target = o.monsters[action.targetZone];
        const atk = attacker.atk;

        if (target.pos === "atk") {
          if (atk > target.atk) {
            dmg = atk - target.atk;
            o.lp = Math.max(0, o.lp - dmg);
            dmgTo = 1 - pi;
            destroyMonster(state, 1 - pi, action.targetZone);
            addLog(state, `「${card(attacker.cid).n}」が「${card(target.cid).n}」を攻撃。${dmg}ダメージを与え、破壊。`);
          } else if (atk < target.atk) {
            dmg = target.atk - atk;
            p.lp = Math.max(0, p.lp - dmg);
            dmgTo = pi;
            destroyMonster(state, pi, action.zone);
            addLog(state, `「${card(target.cid).n}」の反撃！ 「${card(attacker.cid).n}」を破壊し、${dmg}ダメージ。`);
          } else {
            destroyMonster(state, 1 - pi, action.targetZone);
            destroyMonster(state, pi, action.zone);
            addLog(state, `「${card(attacker.cid).n}」と「${card(target.cid).n}」が相打ち。`);
          }
        } else {
          if (atk > target.def) {
            destroyMonster(state, 1 - pi, action.targetZone);
            addLog(state, `「${card(attacker.cid).n}」が守備表示の「${card(target.cid).n}」を破壊。`);
          } else if (atk < target.def) {
            dmg = target.def - atk;
            p.lp = Math.max(0, p.lp - dmg);
            dmgTo = pi;
            destroyMonster(state, pi, action.zone);
            addLog(state, `守備表示の「${card(target.cid).n}」に阻まれ、「${card(attacker.cid).n}」が破壊。${dmg}ダメージ。`);
          } else {
            addLog(state, `「${card(attacker.cid).n}」と守備表示の「${card(target.cid).n}」が拮抗。`);
          }
        }
      }

      if (o.lp <= 0) state.winner = pi;
      else if (p.lp <= 0) state.winner = 1 - pi;
      if (state.winner != null) {
        addLog(state, `${state.players[state.winner].name}の勝利！`);
      }

      return finish(state, {
        a: "attack", by: pi, zone: action.zone, target: direct ? null : action.targetZone,
        dmg, dmgTo, text
      });
    }

    /* ---------------- end turn ---------------- */
    case "end": {
      state.current = 1 - pi;
      state.turn++;
      state.battleLocked = false;

      const np = state.players[state.current];
      np.summonUsed = false;
      for (const m of np.monsters) if (m) m.attacked = false;

      addLog(state, `--- ${np.name}のターン（${state.turn}）---`);

      if (np.deck.length === 0) {
        state.winner = pi;
        addLog(state, `${np.name}の山札が尽きた。${state.players[pi].name}の勝利！`);
        return finish(state, { a: "win", by: pi, dmgTo: state.current, text: "山札切れ" });
      }

      np.hand.push(np.deck.pop());
      addLog(state, `${np.name}は1枚ドロー。`);
      return finish(state, { a: "turn", by: state.current, text: np.name });
    }

    default:
      return bad("不明な操作です。");
  }
}
