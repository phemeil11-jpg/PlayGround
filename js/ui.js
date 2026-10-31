import { CARDS, card } from "./data.js";

/* ------------------------------------------------------------------ *
 *  DOM / rendering / input. No images, no icon fonts.
 * ------------------------------------------------------------------ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const ELEMENT_NAME = { water: "水", light: "光", dark: "闇", wind: "風", earth: "地" };
const TYPE_NAME = { m: "モンスター", s: "魔法", tr: "罠" };
const FX_LABEL = {
  draw2: "2ドロー", heal: "1000回復", destroy: "1体破壊", boost: "ATK+500",
  revive: "守備蘇生", mirror: "攻撃無効", wall: "攻撃終了", pit: "召喚破壊"
};

let sendAction = () => {};
let onLeave = () => { location.href = location.pathname; };

let view = null;
let ctx = {
  isHost: true, room: "", inviteUrl: "", connected: false, netStatus: "connecting",
  hostFresh: false, guestFresh: false
};
let myIndex = 0;
let selected = null;
let awaiting = false;
let lastAnimSeq = -1;
let firstRender = true;
let resultDismissed = false;
let resultShownFor = null;
let soundOn = readSoundPref();
let tiltOn = false;
let audio = null;
let toastTimer = null;
let waitMode = null;
let snowWind = 0;
let snowCtx = null, snowW = 0, snowH = 0, snowRaf = 0;
let flakes = [];
let els = {};

/* ------------------------------- init ------------------------------- */

export function initUI(opts = {}) {
  sendAction = opts.onAction || (() => {});
  onLeave = opts.onLeave || (() => { location.href = location.pathname; });

  cacheEls();
  buildBoard();
  buildRules();
  bindEvents();
  initSnow();
  updateSoundButton();
  updateTiltButton();
  return api;
}

function cacheEls() {
  els = {
    meLp: $("#meLp"), meMeta: $("#meMeta"), meBar: $("#meBar"),
    oppLp: $("#oppLp"), oppMeta: $("#oppMeta"), oppBar: $("#oppBar"),
    turn: $("#turn"), status: $("#status"), roomLabel: $("#roomLabel"),
    board: $("#board"), zones: $("#zones"), hand: $("#hand"),
    hint: $("#hint"), actionBtns: $("#actionBtns"),
    toast: $("#toast"),
    wait: $("#wait"), waitPanel: $("#waitPanel"),
    over: $("#over"), resultPanel: $("#resultPanel"),
    rules: $("#rules"), rulesBody: $("#rulesBody"),
    logmodal: $("#logmodal"), logBody: $("#logBody"),
    menu: $("#menu"), menuInfo: $("#menuInfo"),
    detail: $("#detail"), detailPanel: $("#detailPanel"),
    inviteBtn: $("#inviteBtn"), menuBtn: $("#menuBtn")
  };
}

function buildBoard() {
  const frag = document.createDocumentFragment();
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const z = document.createElement("div");
      z.className = "zone" + (row === 0 || row === 3 ? " spell" : " monster");
      z.dataset.row = String(row);
      z.dataset.col = String(col);
      z.dataset.owner = "";
      z.dataset.kind = row === 0 || row === 3 ? "spells" : "monsters";
      z.dataset.zone = String(col);
      z.setAttribute("role", "button");
      z.tabIndex = 0;
      frag.appendChild(z);
    }
  }
  els.zones.appendChild(frag);
}

function buildRules() {
  const monsterRows = Object.values(CARDS).filter((d) => d.t === "m").map((d) => `
    <div class="cardlist-item"><b>${esc(d.n)}</b>
      <span>Lv${d.lv} / ${ELEMENT_NAME[d.el] || ""}</span>
      <span class="st">攻${d.atk} 守${d.def}</span>
    </div>`).join("");
  const spellRows = Object.values(CARDS).filter((d) => d.t !== "m").map((d) => `
    <div class="cardlist-item"><b>${esc(d.n)}</b>
      <span>${TYPE_NAME[d.t]}</span>
      <span>${esc(d.txt)}</span>
    </div>`).join("");

  els.rulesBody.innerHTML = `
    <h3>勝利条件</h3>
    <p>相手のライフを0にする。または相手の山札が尽きた状態で相手がドローする。降参でも決着。</p>

    <h3>フィールド</h3>
    <p>各プレイヤーは横4マス・縦2マス。手前の段がモンスターゾーン、奥の段が魔法・罠ゾーン。相手のモンスターと自分のモンスターが向かい合います。</p>

    <h3>ターンの流れ</h3>
    <ul>
      <li>ドロー（先攻の最初のターンはなし）</li>
      <li>メイン：召喚1回、魔法発動、罠セット、表示形式変更</li>
      <li>バトル：攻撃表示のモンスターで1体ずつ攻撃</li>
      <li>ターン終了で相手に手番を渡す</li>
    </ul>

    <h3>召喚と表示形式</h3>
    <p>手札のモンスターを自分の空きモンスターゾーンへ置くと召喚。1ターンに1体。召喚したターンは表示形式を変更できません。</p>
    <p>攻撃表示はATK、守備表示はDEFで戦います。守備表示は攻撃できません。表示形式は1ターンに1回、攻撃していないモンスターなら変更できます。</p>

    <h3>戦闘</h3>
    <ul>
      <li>攻撃表示同士：ATKが高い方が勝ち、差が相手へのダメージ。同じなら相打ち。</li>
      <li>守備表示への攻撃：ATKがDEFを超えれば破壊、ただしダメージなし。DEFが高ければ攻撃側が破壊され、差が自分へのダメージ。</li>
      <li>相手モンスターがいない時だけ直接攻撃。ATK分のダメージ。</li>
    </ul>

    <h3>魔法</h3>
    <p>手札から発動して墓地へ。対象が必要な魔法は対象をタップします。</p>
    <div class="cardlist">${spellRows}</div>

    <h3>罠</h3>
    <p>自分の魔法・罠ゾーンにセット。セットしたターンは発動せず、次の相手ターンから条件を満たすと自動発動します。複数ある場合は左から1枚だけ発動。</p>

    <h3>モンスター一覧</h3>
    <div class="cardlist">${monsterRows}</div>

    <h3>操作</h3>
    <p>手札をタップして選択 → 光っているゾーンをタップ。自分のモンスターをタップして相手モンスターをタップすると攻撃。もう一度タップで選択解除。メニューから音・傾き・降参・退出を操作できます。</p>
  `;
}

/* ------------------------------ helpers ----------------------------- */

function me() { return view ? view.players[myIndex] : null; }
function opp() { return view ? view.players[1 - myIndex] : null; }

function isMyTurn() {
  return !!(view && view.started && view.winner == null && view.current === view.you &&
    ctx.connected && (ctx.isHost || ctx.hostFresh) && !awaiting);
}

function handCard(uidValue) {
  return (me()?.hand || []).find((c) => c.uid === uidValue) || null;
}

function canChange(m) {
  return !!(view && m && m.summonedTurn !== view.turn && m.changedTurn !== view.turn && !m.attacked);
}

function canAttack(m) {
  return !!(view && m && m.pos === "atk" && !m.attacked && !view.battleLocked);
}

function hasGraveMonster(p) {
  return !!(p && (p.grave || []).some((cid) => card(cid).t === "m"));
}

function zoneCardEl(owner, kind, zone) {
  return els.zones.querySelector(
    `.zone[data-owner="${owner}"][data-kind="${kind}"][data-zone="${zone}"] .card`
  );
}

function updateRoomLabel() {
  const room = ctx.room || view?.room || "";
  els.roomLabel.textContent = "ROOM " + (room || "----");
}

/* ------------------------------ render ------------------------------ */

function render(v, c) {
  const seqChanged = !view || v.seq !== view.seq;
  if (c) ctx = c;
  view = v;
  myIndex = v.you ?? 0;

  if (seqChanged) selected = null;
  if (v.winner == null) {
    resultDismissed = false;
    resultShownFor = null;
  }

  renderHeader();
  renderZones();
  renderHand();
  renderActions();
  renderOverlayState();
  updateRoomLabel();
  updateMenuInfo();

  if (seqChanged && !firstRender) animateLast();
  if (firstRender) {
    lastAnimSeq = v.last?.seq ?? -1;
    firstRender = false;
  }
}

function renderHeader() {
  if (!view) return;
  const m = me();
  const o = opp();
  if (!m || !o) return;

  els.meLp.textContent = String(m.lp);
  els.oppLp.textContent = String(o.lp);
  els.meBar.style.width = clamp(m.lp / 4000 * 100, 0, 100) + "%";
  els.oppBar.style.width = clamp(o.lp / 4000 * 100, 0, 100) + "%";
  els.meMeta.textContent = `手${m.handCount}・山${m.deckCount}・墓${m.grave.length}`;
  els.oppMeta.textContent = `手${o.handCount}・山${o.deckCount}・墓${o.grave.length}`;

  let text = "待機中";
  let tone = "";
  if (view.started) {
    if (view.winner != null) {
      text = "デュエル終了";
      tone = "opp";
    } else if (view.current === myIndex) {
      text = "あなたのターン";
      tone = "my";
    } else {
      text = "相手のターン";
      tone = "opp";
    }
  }
  els.turn.textContent = text;
  els.turn.className = "turn" + (tone ? " " + tone : "");
}

function renderZones() {
  const zs = els.zones.children;
  for (let i = 0; i < zs.length; i++) {
    const row = Math.floor(i / 4);
    const col = i % 4;
    const z = zs[i];
    const owner = row < 2 ? 1 - myIndex : myIndex;
    const kind = row === 0 || row === 3 ? "spells" : "monsters";
    const c = view?.players?.[owner]?.[kind]?.[col] || null;

    z.dataset.owner = String(owner);
    z.dataset.kind = kind;
    z.dataset.zone = String(col);
    z.className = "zone " + (kind === "spells" ? "spell" : "monster");
    if (isValidZone(owner, kind, col)) z.classList.add("valid");
    if (isTargetZone(owner, kind, col)) z.classList.add("target");
    z.innerHTML = c ? zoneCardHTML(c, kind, owner === myIndex) : "";
  }
}

function zoneCardHTML(c, kind, mine) {
  if (kind === "spells") {
    if (c.faceDown) {
      if (mine && c.cid) {
        const d = card(c.cid);
        return `<div class="card back ownset" aria-label="セットした${esc(d.n)}">
          <span class="backmark">罠</span>
          <span class="setname">${esc(d.n)}</span>
        </div>`;
      }
      return `<div class="card back" aria-label="セットされたカード"><span class="backmark">SET</span></div>`;
    }
    if (!c.cid) return `<div class="card back"><span class="backmark">SET</span></div>`;
    const d = card(c.cid);
    return `<div class="card el-${d.el}"><div class="cname">${esc(d.n)}</div>
      <div class="cstats"><span class="ctype">${TYPE_NAME[d.t]}</span></div></div>`;
  }

  const d = card(c.cid);
  const isDef = c.pos === "def";
  return `<div class="card el-${d.el} ${isDef ? "defpos" : ""}" data-uid="${esc(c.uid)}" aria-label="${esc(d.n)}">
    <div class="cname">${esc(d.n)}</div>
    <div class="cstats"><span class="atk">攻${c.atk}</span><span class="def">守${c.def}</span></div>
    <span class="badge">${isDef ? "守" : "攻"}</span>
  </div>`;
}

function isValidZone(owner, kind, zone) {
  if (!view || !selected || !isMyTurn()) return false;
  const m = me();
  const o = opp();
  if (!m || !o) return false;

  if (selected.type === "hand") {
    const hc = handCard(selected.uid);
    if (!hc) return false;
    const d = card(hc.cid);
    if (d.t === "m") return owner === myIndex && kind === "monsters" && !m.monsters[zone];
    if (d.t === "tr") return owner === myIndex && kind === "spells" && !m.spells[zone];
    if (d.t === "s" && d.fx === "revive") {
      return owner === myIndex && kind === "monsters" && !m.monsters[zone] && hasGraveMonster(m);
    }
    return false;
  }

  if (selected.type === "monster") {
    const myMon = me()?.monsters?.[selected.zone];
    return canAttack(myMon) && owner !== myIndex && kind === "monsters" && !!o.monsters[zone];
  }
  return false;
}

function isTargetZone(owner, kind, zone) {
  if (!view || !selected || !isMyTurn()) return false;
  if (selected.type === "hand") {
    const hc = handCard(selected.uid);
    if (!hc) return false;
    const d = card(hc.cid);
    return d.t === "s" && d.fx === "destroy" &&
      owner !== myIndex && kind === "monsters" && !!opp()?.monsters?.[zone];
  }
  if (selected.type === "monster") {
    const myMon = me()?.monsters?.[selected.zone];
    return canAttack(myMon) && owner !== myIndex && kind === "monsters" && !!opp()?.monsters?.[zone];
  }
  return false;
}

function renderHand() {
  if (!view) {
    els.hand.innerHTML = "";
    return;
  }
  const hand = me()?.hand || [];
  const scroll = els.hand.scrollLeft;
  const scrollTop = els.hand.scrollTop;
  if (!hand.length) {
    els.hand.innerHTML = `<div class="handempty">手札はありません</div>`;
    return;
  }
  els.hand.innerHTML = hand.map(handCardHTML).join("");
  els.hand.scrollLeft = scroll;
  els.hand.scrollTop = scrollTop;
}

function handCardHTML(c) {
  const d = card(c.cid);
  const isM = d.t === "m";
  const meta = isM ? `Lv${d.lv}・${ELEMENT_NAME[d.el] || ""}` : TYPE_NAME[d.t];
  const stats = isM
    ? `<span class="atk">攻 ${d.atk}</span><span class="def">守 ${d.def}</span>`
    : `<span class="ctype">${FX_LABEL[d.fx] || TYPE_NAME[d.t]}</span>`;
  const sel = selected?.type === "hand" && selected.uid === c.uid ? " selected" : "";
  return `<button type="button" class="card handcard el-${d.el}${sel}" data-hand="${esc(c.uid)}" aria-label="${esc(d.n)}：${esc(d.txt)}">
    <div class="cname">${esc(d.n)}</div>
    <div class="cmeta">${meta}</div>
    <div class="ctext">${esc(d.txt)}</div>
    <div class="cstats">${stats}</div>
  </button>`;
}

function renderActions() {
  let hint = "カードを選んでください。";
  const acts = [];

  if (!view) {
    hint = "接続中…";
    acts.push({ act: "end", label: "待機中", disabled: true });
  } else if (!view.started) {
    hint = "相手の参加を待っています。";
    acts.push({ act: "end", label: "待機中", disabled: true });
  } else if (view.winner != null) {
    hint = "デュエルは終了しました。再戦できます。";
    acts.push({ act: "rematch", label: "再戦", cls: "primary" });
    acts.push({ act: "result", label: "結果" });
  } else if (awaiting) {
    hint = "ホストと同期中…";
    acts.push({ act: "end", label: "同期中", disabled: true });
  } else if (!ctx.connected) {
    hint = "接続を待っています…";
    acts.push({ act: "end", label: "接続待ち", disabled: true });
  } else if (!ctx.isHost && !ctx.hostFresh) {
    hint = "ホストの接続を待っています…";
    acts.push({ act: "end", label: "接続待ち", disabled: true });
  } else if (!isMyTurn()) {
    hint = `${opp()?.name || "相手"}のターンです。`;
    acts.push({ act: "end", label: "ターン終了", disabled: true });
  } else if (selected?.type === "hand") {
    const hc = handCard(selected.uid);
    if (!hc) {
      selected = null;
      return renderActions();
    }
    const d = card(hc.cid);
    hint = `「${d.n}」${d.txt}`;
    if (d.t === "m") {
      hint += me()?.monsters?.some((x) => !x)
        ? " 自分の空きモンスターゾーンをタップ。"
        : " 空きモンスターゾーンがありません。";
    } else if (d.t === "tr") {
      hint += me()?.spells?.some((x) => !x)
        ? " 自分の空き魔法・罠ゾーンをタップ。"
        : " 空き魔法・罠ゾーンがありません。";
    } else if (d.fx === "destroy") {
      hint += opp()?.monsters?.some(Boolean)
        ? " 相手モンスターをタップ。"
        : " 相手モンスターがいません。";
    } else if (d.fx === "revive") {
      hint += hasGraveMonster(me())
        ? " 自分の空きモンスターゾーンをタップ。"
        : " 墓地にモンスターがいません。";
    } else if (d.fx === "boost" && !me()?.monsters?.some(Boolean)) {
      hint += " 自分のモンスターがいません。";
    } else {
      hint += " 「発動」をタップ。";
    }

    if (d.t === "s" && d.fx !== "destroy" && d.fx !== "revive") {
      const disabled = d.fx === "boost" && !me()?.monsters?.some(Boolean);
      acts.push({ act: "activate", label: "発動", cls: "primary", disabled });
    }
    acts.push({ act: "cancel", label: "キャンセル" });
    acts.push({ act: "end", label: "ターン終了" });
  } else if (selected?.type === "monster") {
    const m = me()?.monsters?.[selected.zone];
    if (!m) {
      selected = null;
      return renderActions();
    }
    const d = card(m.cid);
    hint = `「${d.n}」 攻${m.atk} / 守${m.def}`;
    if (m.attacked) hint += " ・攻撃済み";
    else if (m.pos === "def") hint += " ・守備表示";
    else if (view.battleLocked) hint += " ・このターンの攻撃は終了";
    else if (opp()?.monsters?.every((x) => !x)) {
      hint += " ・直接攻撃できます。";
      acts.push({ act: "direct", label: "直接攻撃", cls: "primary" });
    } else {
      hint += " ・相手モンスターをタップで攻撃。";
    }
    if (canChange(m)) {
      acts.push({ act: "change", label: m.pos === "atk" ? "守備表示に" : "攻撃表示に" });
    }
    acts.push({ act: "cancel", label: "キャンセル" });
    acts.push({ act: "end", label: "ターン終了" });
  } else {
    hint = "手札を選ぶか、自分のモンスターをタップ。";
    acts.push({ act: "end", label: "ターン終了", cls: "primary" });
  }

  els.hint.textContent = hint;
  els.actionBtns.innerHTML = acts.map((b) =>
    `<button type="button" class="btn ${b.cls || ""}" data-act="${b.act}" ${b.disabled ? "disabled" : ""}>${esc(b.label)}</button>`
  ).join("");
}

function renderOverlayState() {
  if (!view) return;
  if (view.started) hideWait();
  if (view.winner != null) {
    if (resultShownFor !== view.seq && !resultDismissed) {
      resultShownFor = view.seq;
      showResult();
    }
  } else {
    hideResult();
  }
}

/* ------------------------------ overlays ---------------------------- */

function showWait(mode, data = {}) {
  waitMode = mode;
  const room = data.room || ctx.room || view?.room || "";
  const invite = data.inviteUrl || ctx.inviteUrl || "";

  if (mode === "host") {
    els.waitPanel.innerHTML = `
      <div class="pname">YOUR ROOM</div>
      <div class="roomcode">${esc(room)}</div>
      <p>あなたのルームを開設しました。<br>招待リンクを相手に送ってください。</p>
      <div class="linkbox">${esc(invite)}</div>
      <div class="btnrow">
        <button class="btn primary" data-wait="copy" type="button">招待リンクをコピー</button>
        <button class="btn" data-wait="tab" type="button">別タブで参加</button>
      </div>
      <div class="spinner" aria-hidden="true"></div>
      <p class="small wait-net" data-waitnet>接続中…</p>
      <p class="small">相手の参加を待っています…</p>
      <div class="btnrow"><button class="btn tiny" data-wait="rules" type="button">ルール</button></div>
    `;
  } else if (mode === "guest") {
    els.waitPanel.innerHTML = `
      <div class="pname">ROOM</div>
      <div class="roomcode">${esc(room)}</div>
      <p>ホストに接続しています…</p>
      <div class="spinner" aria-hidden="true"></div>
      <p class="small wait-net" data-waitnet>接続中…</p>
      <p class="small">招待リンクを開いたままお待ちください。</p>
      <div class="btnrow"><button class="btn tiny" data-wait="rules" type="button">ルール</button></div>
    `;
  } else if (mode === "notfound") {
    els.waitPanel.innerHTML = `
      <div class="pname">ROOM</div>
      <div class="roomcode">${esc(room)}</div>
      <p>ホストが見つかりません。</p>
      <p class="small">ホストがページを開いているか、通信がつながっているか確認してください。</p>
      <div class="btnrow">
        <button class="btn primary" data-wait="retry" type="button">再接続</button>
        <button class="btn" data-wait="newroom" type="button">自分のルームを作る</button>
      </div>
      <div class="btnrow"><button class="btn tiny" data-wait="rules" type="button">ルール</button></div>
    `;
  } else if (mode === "full") {
    els.waitPanel.innerHTML = `
      <div class="pname">ROOM</div>
      <div class="roomcode">${esc(room)}</div>
      <p>このルームは満員です。</p>
      <p class="small">別のルームを作るか、ホストに空きを確認してください。</p>
      <div class="btnrow"><button class="btn primary" data-wait="newroom" type="button">自分のルームを作る</button></div>
    `;
  } else {
    els.waitPanel.innerHTML = `
      <div class="pname">CONNECTION</div>
      <p>${esc(data.message || "接続できませんでした。")}</p>
      <div class="btnrow"><button class="btn primary" data-wait="reload" type="button">再読み込み</button></div>
    `;
  }

  els.wait.classList.remove("hidden");
}

function hideWait() {
  els.wait.classList.add("hidden");
}

function showResult() {
  if (!view) return;
  const win = view.winner === myIndex;
  const m = me();
  const o = opp();
  let reason = "";
  if (view.last?.text === "降参") {
    reason = view.last.dmgTo === myIndex ? "あなたが降参しました。" : "相手が降参しました。";
  } else if (view.last?.text === "山札切れ") {
    reason = view.last.dmgTo === myIndex ? "あなたの山札が尽きました。" : "相手の山札が尽きました。";
  }
  els.resultPanel.innerHTML = `
    <div class="result-title ${win ? "win" : "lose"}">${win ? "勝利" : "敗北"}</div>
    <div class="result-sub">${win ? "北極の頂点に立ちました。" : "雪原に敗れました。"}${reason ? "<br>" + esc(reason) : ""}</div>
    <div class="result-stats">
      <div>あなたのLP<b>${m?.lp ?? 0}</b></div>
      <div>相手のLP<b>${o?.lp ?? 0}</b></div>
      <div>ターン<b>${view.turn}</b></div>
    </div>
    <div class="btnrow">
      <button class="btn primary" data-result="rematch" type="button">再戦</button>
      <button class="btn" data-result="view" type="button">盤面を見る</button>
    </div>
    <div class="btnrow"><button class="btn tiny" data-result="menu" type="button">メニュー</button></div>
  `;
  els.over.classList.remove("hidden");
}

function hideResult() {
  els.over.classList.add("hidden");
}

function openOverlay(name) {
  const map = { rules: els.rules, logmodal: els.logmodal, menu: els.menu, detail: els.detail };
  const el = map[name];
  if (!el) return;
  if (name === "logmodal") renderLog();
  if (name === "menu") updateMenuInfo();
  el.classList.remove("hidden");
}

function closeOverlay(name) {
  const map = { rules: els.rules, logmodal: els.logmodal, menu: els.menu, detail: els.detail };
  map[name]?.classList.add("hidden");
}

function closeTop() {
  if (!els.detail.classList.contains("hidden")) return closeOverlay("detail");
  if (!els.rules.classList.contains("hidden")) return closeOverlay("rules");
  if (!els.logmodal.classList.contains("hidden")) return closeOverlay("logmodal");
  if (!els.menu.classList.contains("hidden")) return closeOverlay("menu");
  if (!els.over.classList.contains("hidden")) {
    resultDismissed = true;
    return hideResult();
  }
}

function renderLog() {
  const log = view?.log || [];
  els.logBody.innerHTML = log.length
    ? log.slice().reverse().map((l) =>
      `<div class="log-line"><span class="ln">T${l.n}</span><span class="lt">${esc(l.text)}</span></div>`
    ).join("")
    : `<p class="small">まだログがありません。</p>`;
}

function updateMenuInfo() {
  if (!els.menuInfo) return;
  const status = ctx.connected
    ? (ctx.isHost ? (ctx.guestFresh ? "相手オンライン" : "相手の接続待ち") : (ctx.hostFresh ? "ホストと同期中" : "ホストの接続待ち"))
    : (ctx.netStatus === "offline" ? "オフライン" : ctx.netStatus === "reconnecting" ? "再接続中" : "接続中");
  els.menuInfo.innerHTML =
    `ROOM <b>${esc(ctx.room || view?.room || "")}</b><br>` +
    `${ctx.isHost ? "あなたがホストです。" : "ゲストとして参加中。"} / ${esc(status)}<br>` +
    `<span style="color:#6f9db5">${esc(ctx.inviteUrl || "")}</span>`;
  updateSoundButton();
  updateTiltButton();
}

function showDetail(owner, kind, zone) {
  if (!view) return;
  const c = view.players?.[owner]?.[kind]?.[zone];
  if (!c) return;
  if (kind === "spells" && c.faceDown && owner !== myIndex) {
    toast("セットされたカードです。");
    return;
  }
  const d = card(c.cid);
  const isM = d.t === "m";
  const stats = isM
    ? `<div class="detail-stats"><span class="atk">攻 ${c.atk}</span><span class="def">守 ${c.def}</span><span>${c.pos === "atk" ? "攻撃表示" : "守備表示"}</span></div>`
    : `<div class="detail-type">${TYPE_NAME[d.t]}</div>`;
  els.detailPanel.innerHTML = `
    <div class="detail-card card el-${d.el} ${isM && c.pos === "def" ? "defpos" : ""}">
      <div class="cname">${esc(d.n)}</div>
      <div class="cstats">${isM ? `<span class="atk">攻 ${c.atk}</span><span class="def">守 ${c.def}</span>` : `<span class="ctype">${TYPE_NAME[d.t]}</span>`}</div>
    </div>
    <div class="detail-name">${esc(d.n)}</div>
    ${stats}
    <div class="detail-text">${esc(d.txt)}</div>
    <div class="btnrow"><button class="btn" data-close="detail" type="button">閉じる</button></div>
  `;
  openOverlay("detail");
}

/* ------------------------------- toast ------------------------------ */

function toast(text, tone = "") {
  els.toast.textContent = text;
  els.toast.className = "show" + (tone ? " " + tone : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.className = "";
  }, 2300);
}

/* ------------------------------- events ----------------------------- */

function bindEvents() {
  els.zones.addEventListener("click", onZoneClick);
  els.zones.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onZoneClick(e);
    }
  });
  els.hand.addEventListener("click", onHandClick);
  els.actionBtns.addEventListener("click", onActionClick);
  els.inviteBtn.addEventListener("click", copyInvite);
  els.menuBtn.addEventListener("click", openMenu);
  els.waitPanel.addEventListener("click", onWaitClick);
  els.resultPanel.addEventListener("click", onResultClick);
  els.menu.addEventListener("click", onMenuClick);

  document.addEventListener("click", (e) => {
    const close = e.target.closest("[data-close]");
    if (close) closeOverlay(close.dataset.close);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeTop();
  });

  window.addEventListener("pointerdown", initAudio, { capture: true, once: true });
  window.addEventListener("resize", resizeSnow);
  window.addEventListener("orientationchange", () => setTimeout(resizeSnow, 250));
}

function onZoneClick(e) {
  if (!view) return;
  if (!ctx.connected) {
    toast("接続を待っています。", "warn");
    return;
  }
  if (!ctx.isHost && !ctx.hostFresh) {
    toast("ホストの接続を待っています。", "warn");
    return;
  }
  const z = e.target.closest(".zone");
  if (!z) return;
  const owner = Number(z.dataset.owner);
  const kind = z.dataset.kind;
  const zone = Number(z.dataset.zone);
  const c = view.players?.[owner]?.[kind]?.[zone] || null;
  const myTurn = isMyTurn();

  if (selected?.type === "hand") {
    const hc = handCard(selected.uid);
    if (!hc) {
      selected = null;
      return;
    }
    const d = card(hc.cid);
    if (!myTurn) {
      toast("あなたのターンではありません。", "warn");
      return;
    }

    if (d.t === "m") {
      if (owner === myIndex && kind === "monsters" && !c) {
        doAction({ a: "summon", handUid: hc.uid, zone });
      } else {
        toast("自分の空きモンスターゾーンを選んでください。");
      }
      return;
    }
    if (d.t === "tr") {
      if (owner === myIndex && kind === "spells" && !c) {
        doAction({ a: "set", handUid: hc.uid, zone });
      } else {
        toast("自分の空き魔法・罠ゾーンを選んでください。");
      }
      return;
    }
    if (d.t === "s") {
      if (d.fx === "destroy") {
        if (owner !== myIndex && kind === "monsters" && c) {
          doAction({ a: "spell", handUid: hc.uid, targetZone: zone });
        } else {
          toast("相手モンスターを選んでください。");
        }
      } else if (d.fx === "revive") {
        if (!hasGraveMonster(me())) {
          toast("墓地にモンスターがいません。", "warn");
          return;
        }
        if (owner === myIndex && kind === "monsters" && !c) {
          doAction({ a: "spell", handUid: hc.uid, zone });
        } else {
          toast("自分の空きモンスターゾーンを選んでください。");
        }
      } else {
        toast("「発動」ボタンを押してください。");
      }
      return;
    }
  }

  if (selected?.type === "monster") {
    if (!myTurn) {
      toast("あなたのターンではありません。", "warn");
      return;
    }
    if (owner !== myIndex && kind === "monsters" && c) {
      const m = me()?.monsters?.[selected.zone];
      if (!canAttack(m)) {
        const msg = !m ? "攻撃するモンスターがいません。"
          : m.attacked ? "このモンスターはこのターン攻撃済みです。"
          : m.pos === "def" ? "守備表示のモンスターは攻撃できません。"
          : "このターンの攻撃は終了しています。";
        toast(msg, "warn");
        return;
      }
      doAction({ a: "attack", zone: selected.zone, targetZone: zone });
      return;
    }
    if (owner === myIndex && kind === "monsters") {
      selectMonster(zone);
      return;
    }
    toast("相手モンスターを選んでください。");
    return;
  }

  if (owner === myIndex && kind === "monsters" && c) {
    selectMonster(zone);
    return;
  }
  if (c) showDetail(owner, kind, zone);
}

function onHandClick(e) {
  if (!view) return;
  const el = e.target.closest("[data-hand]");
  if (!el) return;
  const uidValue = el.dataset.hand;
  if (selected?.type === "hand" && selected.uid === uidValue) {
    selected = null;
  } else {
    selected = { type: "hand", uid: uidValue };
  }
  sfx("tap");
  renderZones();
  renderHand();
  renderActions();
}

function selectMonster(zone) {
  if (!view) return;
  if (selected?.type === "monster" && selected.zone === zone) {
    selected = null;
  } else {
    selected = { type: "monster", zone };
  }
  sfx("tap");
  renderZones();
  renderHand();
  renderActions();
}

function onActionClick(e) {
  const b = e.target.closest("[data-act]");
  if (!b || b.disabled) return;
  const act = b.dataset.act;

  if (act === "cancel") return clearSelection();
  if (act === "end") return doAction({ a: "end" });
  if (act === "change" && selected?.type === "monster") {
    return doAction({ a: "change", zone: selected.zone });
  }
  if (act === "direct" && selected?.type === "monster") {
    return doAction({ a: "attack", zone: selected.zone, targetZone: null });
  }
  if (act === "activate" && selected?.type === "hand") {
    const hc = handCard(selected.uid);
    if (hc) doAction({ a: "spell", handUid: hc.uid });
    return;
  }
  if (act === "rematch") {
    return sendAction({ a: "rematch" });
  }
  if (act === "result") {
    if (view?.winner != null) {
      resultDismissed = false;
      resultShownFor = null;
      showResult();
    } else {
      toast("デュエルはまだ終わっていません。");
    }
  }
}

function doAction(action) {
  selected = null;
  renderZones();
  renderHand();
  renderActions();
  sendAction(action);
}

function clearSelection() {
  selected = null;
  if (view) {
    renderZones();
    renderHand();
    renderActions();
  }
}

/* ------------------------------ overlays ---------------------------- */

function openMenu() {
  updateMenuInfo();
  els.menu.classList.remove("hidden");
}

function onMenuClick(e) {
  const b = e.target.closest("[data-menu]");
  if (!b) return;
  const act = b.dataset.menu;

  if (act === "rules") {
    closeOverlay("menu");
    return openOverlay("rules");
  }
  if (act === "log") {
    closeOverlay("menu");
    return openOverlay("logmodal");
  }
  if (act === "result") {
    closeOverlay("menu");
    if (view?.winner != null) {
      resultDismissed = false;
      resultShownFor = null;
      showResult();
    } else {
      toast("デュエルはまだ終わっていません。");
    }
    return;
  }
  if (act === "copy") return copyInvite();
  if (act === "sound") return toggleSound();
  if (act === "tilt") return toggleTilt();
  if (act === "surrender") {
    closeOverlay("menu");
    if (view?.winner != null) return toast("デュエルは終了しています。");
    if (confirm("降参しますか？")) sendAction({ a: "surrender" });
    return;
  }
  if (act === "rematch") {
    closeOverlay("menu");
    if (view?.winner == null) return toast("デュエルはまだ終わっていません。");
    return sendAction({ a: "rematch" });
  }
  if (act === "leave") {
    closeOverlay("menu");
    if (confirm("退出しますか？")) onLeave();
  }
}

function onWaitClick(e) {
  const b = e.target.closest("[data-wait]");
  if (!b) return;
  const act = b.dataset.wait;
  if (act === "copy") return copyInvite();
  if (act === "tab") {
    if (ctx.inviteUrl) window.open(ctx.inviteUrl, "_blank", "noopener");
    return;
  }
  if (act === "rules") return openOverlay("rules");
  if (act === "newroom") {
    location.href = location.pathname;
    return;
  }
  if (act === "retry" || act === "reload") location.reload();
}

function onResultClick(e) {
  const b = e.target.closest("[data-result]");
  if (!b) return;
  const act = b.dataset.result;
  if (act === "rematch") {
    hideResult();
    sendAction({ a: "rematch" });
    return;
  }
  if (act === "view") {
    resultDismissed = true;
    hideResult();
    return;
  }
  if (act === "menu") {
    hideResult();
    openMenu();
  }
}

/* ------------------------------- copy ------------------------------- */

function copyInvite() {
  const url = ctx.inviteUrl || "";
  if (!url) return toast("招待リンクがありません。", "warn");
  copyText(url);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("コピーしました。");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      toast("コピーしました。");
    } catch {
      toast("コピーできませんでした。", "bad");
    }
    ta.remove();
  }
}

/* ------------------------------- audio ------------------------------ */

function initAudio() {
  if (audio) {
    if (audio.state === "suspended") audio.resume().catch(() => {});
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    audio = new AC();
  } catch {
    audio = null;
  }
}

function note(freq, dur, type = "sine", gain = 0.04, slide = null, delay = 0) {
  if (!audio) return;
  const t = audio.currentTime + 0.006 + delay;
  const o = audio.createOscillator();
  const g = audio.createGain();
  o.type = type;
  o.frequency.setValueAtTime(Math.max(30, freq), t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(audio.destination);
  o.start(t);
  o.stop(t + dur + 0.03);
}

function sfx(kind) {
  if (!soundOn) return;
  initAudio();
  if (!audio) return;
  if (audio.state === "suspended") audio.resume().catch(() => {});

  if (kind === "tap") note(620, 0.06, "sine", 0.025, 760);
  else if (kind === "summon") note(180, 0.26, "triangle", 0.05, 360);
  else if (kind === "attack") note(190, 0.2, "sawtooth", 0.05, 70);
  else if (kind === "hit") note(90, 0.24, "square", 0.05, 45);
  else if (kind === "trap") {
    note(880, 0.09, "triangle", 0.04, 660);
    note(440, 0.14, "triangle", 0.035, 520, 0.1);
  } else if (kind === "spell") note(520, 0.16, "sine", 0.04, 1040);
  else if (kind === "turn") note(440, 0.08, "sine", 0.025, 520);
  else if (kind === "draw") note(780, 0.05, "sine", 0.02, 900);
  else if (kind === "win") {
    [523, 659, 784, 1046].forEach((f, i) => note(f, 0.2, "triangle", 0.04, null, i * 0.1));
  }
}

function toggleSound() {
  soundOn = !soundOn;
  try {
    localStorage.setItem("ad:sound", soundOn ? "1" : "0");
  } catch {}
  updateSoundButton();
  if (soundOn) sfx("tap");
}

function updateSoundButton() {
  const b = $("#soundBtn");
  if (!b) return;
  b.textContent = soundOn ? "音 ON" : "音 OFF";
  b.classList.toggle("primary", soundOn);
}

function readSoundPref() {
  try {
    return localStorage.getItem("ad:sound") !== "0";
  } catch {
    return true;
  }
}

/* -------------------------------- tilt ------------------------------ */

async function toggleTilt() {
  if (tiltOn) {
    tiltOn = false;
    window.removeEventListener("deviceorientation", onTilt, true);
    applyTilt(0, 0);
    updateTiltButton();
    toast("傾き操作 OFF");
    return;
  }

  try {
    if (typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function") {
      const res = await DeviceOrientationEvent.requestPermission();
      if (res !== "granted") {
        toast("傾きの許可が必要です。", "warn");
        return;
      }
    }
    if (typeof DeviceOrientationEvent === "undefined") {
      toast("この端末は傾きに対応していません。", "warn");
      return;
    }
    tiltOn = true;
    window.addEventListener("deviceorientation", onTilt, true);
    updateTiltButton();
    toast("傾き操作 ON");
    sfx("tap");
  } catch {
    toast("傾きを有効にできませんでした。", "warn");
  }
}

function onTilt(e) {
  const gamma = clamp(e.gamma || 0, -30, 30);
  const beta = clamp((e.beta || 45) - 45, -30, 30);
  const tx = gamma / 30 * 12;
  const ty = beta / 30 * 12;
  snowWind = tx * 0.05;
  applyTilt(tx, ty);
}

function applyTilt(tx, ty) {
  $$("[data-depth]").forEach((el) => {
    const d = parseFloat(el.dataset.depth) || 0;
    el.style.transform = `translate3d(${(tx * d).toFixed(2)}px,${(ty * d).toFixed(2)}px,0)`;
  });
  if (els.board) {
    els.board.style.transform = `perspective(1400px) rotateX(${(ty * 0.12).toFixed(2)}deg) rotateY(${(-tx * 0.12).toFixed(2)}deg)`;
  }
}

function updateTiltButton() {
  const b = $("#tiltBtn");
  if (!b) return;
  b.textContent = tiltOn ? "傾き ON" : "傾き OFF";
  b.classList.toggle("primary", tiltOn);
}

/* ------------------------------- snow ------------------------------- */

function initSnow() {
  const canvas = $("#snow");
  if (!canvas) return;
  snowCtx = canvas.getContext("2d");
  resizeSnow();
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const count = reduced ? 26 : 74;
  flakes = Array.from({ length: count }, () => ({
    x: Math.random() * Math.max(1, window.innerWidth),
    y: Math.random() * Math.max(1, window.innerHeight),
    r: Math.random() * 1.5 + 0.35,
    vx: (Math.random() - 0.5) * 0.16,
    vy: Math.random() * 0.34 + 0.1,
    o: Math.random() * 0.5 + 0.22
  }));
  snowLoop();
}

function resizeSnow() {
  if (!snowCtx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  snowW = window.innerWidth;
  snowH = window.innerHeight;
  const canvas = snowCtx.canvas;
  canvas.width = Math.floor(snowW * dpr);
  canvas.height = Math.floor(snowH * dpr);
  canvas.style.width = snowW + "px";
  canvas.style.height = snowH + "px";
  snowCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function snowLoop() {
  if (!snowCtx) return;
  snowCtx.clearRect(0, 0, snowW, snowH);
  snowCtx.fillStyle = "#e2f8ff";
  for (const f of flakes) {
    f.x += f.vx + snowWind;
    f.y += f.vy;
    if (f.y > snowH + 5) {
      f.y = -5;
      f.x = Math.random() * snowW;
    }
    if (f.x > snowW + 5) f.x = -5;
    if (f.x < -5) f.x = snowW + 5;
    snowCtx.globalAlpha = f.o;
    snowCtx.beginPath();
    snowCtx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    snowCtx.fill();
  }
  snowCtx.globalAlpha = 1;
  snowRaf = requestAnimationFrame(snowLoop);
}

/* ----------------------------- animation ---------------------------- */

function animateLast() {
  const last = view?.last;
  if (!last || last.seq === lastAnimSeq) return;
  lastAnimSeq = last.seq;

  if (last.a === "attack") {
    const atk = zoneCardEl(last.by, "monsters", last.zone);
    const target = last.target != null ? zoneCardEl(1 - last.by, "monsters", last.target) : null;
    if (atk) atk.classList.add("lunge");
    if (target) target.classList.add("hit");
    sfx("attack");
    if (last.dmg > 0) {
      setTimeout(() => {
        sfx("hit");
        showDamage(last.dmg, last.dmgTo);
        shakeLp(last.dmgTo);
      }, 170);
    }
    setTimeout(() => {
      atk?.classList.remove("lunge");
      target?.classList.remove("hit");
    }, 680);
    return;
  }

  if (last.a === "summon") {
    const el = zoneCardEl(last.by, "monsters", last.zone);
    if (el) {
      el.classList.add("pop");
      setTimeout(() => el.classList.remove("pop"), 440);
    }
    sfx("summon");
    return;
  }

  if (last.a === "set") {
    flashZone(last.by, "spells", last.zone);
    sfx("trap");
    return;
  }

  if (last.a === "trap") {
    flashZone(last.by, "spells", last.zone);
    sfx("trap");
    if (last.text) toast(last.text);
    return;
  }

  if (last.a === "spell") {
    sfx("spell");
    if (last.text) toast(last.text);
    return;
  }

  if (last.a === "change") {
    sfx("tap");
    return;
  }

  if (last.a === "turn") {
    sfx("turn");
    els.turn.classList.add("flash");
    setTimeout(() => els.turn.classList.remove("flash"), 520);
    return;
  }

  if (last.a === "win") sfx("win");
}

function flashZone(owner, kind, zone) {
  const el = els.zones.querySelector(
    `.zone[data-owner="${owner}"][data-kind="${kind}"][data-zone="${zone}"]`
  );
  if (!el) return;
  el.classList.add("flash");
  setTimeout(() => el.classList.remove("flash"), 620);
}

function showDamage(amount, who) {
  if (who == null) return;
  const target = who === myIndex ? els.meLp : els.oppLp;
  const r = target.getBoundingClientRect();
  const el = document.createElement("div");
  el.className = "dmgfloat";
  el.textContent = "-" + amount;
  el.style.left = (r.left + r.width / 2) + "px";
  el.style.top = (r.top - 4) + "px";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1150);
}

function shakeLp(who) {
  if (who == null) return;
  const el = who === myIndex ? els.meLp : els.oppLp;
  el.classList.add("hit");
  setTimeout(() => el.classList.remove("hit"), 520);
}

/* -------------------------------- api ------------------------------- */

function setStatus(text, tone = "") {
  els.status.textContent = text;
  els.status.dataset.tone = tone;
}

function setWaitNet(text, tone = "") {
  const el = els.waitPanel?.querySelector("[data-waitnet]");
  if (!el) return;
  el.textContent = text;
  el.dataset.tone = tone;
}

function setContext(c) {
  const prev = ctx;
  ctx = { ...ctx, ...c };
  updateRoomLabel();
  updateMenuInfo();
  if (view && (prev.isHost !== ctx.isHost || prev.hostFresh !== ctx.hostFresh || prev.connected !== ctx.connected)) {
    renderActions();
  }
}

function setAwaiting(b) {
  awaiting = !!b;
  if (view) renderActions();
}

const api = {
  render,
  setContext,
  setStatus,
  setWaitNet,
  setAwaiting,
  toast,
  showWait,
  hideWait,
  showResult,
  hideResult,
  showFatal: (message) => showWait("error", { message }),
  clearSelection,
  openMenu
};
