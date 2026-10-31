import { createLobby, startDuel, viewFor, applyAction } from "./game.js";
import { createNet } from "./net.js";
import { initUI } from "./ui.js";

/* ------------------------------------------------------------------ *
 *  Bootstrap: one room per page, host is authoritative, guest mirrors.
 *  Online only: state travels over MQTT (WSS).
 * ------------------------------------------------------------------ */

const params = new URLSearchParams(location.search);
const asGuest = params.get("g") === "1";
let room = (params.get("room") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);

if (!room) {
  room = makeRoom();
  params.set("room", room);
  params.delete("g");
  history.replaceState(null, "", location.pathname + "?" + params.toString());
}

const isHost = !asGuest;
const playerId = getPlayerId(isHost ? "h" : "g");
const inviteUrl = `${location.origin}${location.pathname}?room=${encodeURIComponent(room)}&g=1`;

let state = null;
let view = null;
let net = null;
let connected = false;
let netStatus = "connecting";
let hostSeen = 0;
let guestSeen = 0;
let awaiting = false;
let guestBlocked = false;
let fatal = false;
let statusTimer = 0;
let helloTimer = 0;
let notFoundTimer = 0;
let ui;

/* ------------------------------ boot -------------------------------- */

if (isHost) {
  try {
    const saved = JSON.parse(localStorage.getItem("ad:host:" + room) || "null");
    if (saved && saved.v === 1 && saved.room === room && Array.isArray(saved.players)) {
      state = saved;
      state.hostId = playerId;
      state.last = null;
    }
  } catch {
    state = null;
  }
  if (!state) {
    state = createLobby(room, playerId);
    saveHost();
  }
}

ui = initUI({
  onAction: sendAction,
  onLeave: leave
});

ui.setContext(makeCtx());

if (isHost) {
  view = viewFor(state, 0);
  ui.render(view, makeCtx());
  if (!state.started) ui.showWait("host", { room, inviteUrl });
} else {
  ui.showWait("guest", { room, inviteUrl });
}

if (!window.mqtt) {
  fatal = true;
  ui.showFatal("通信ライブラリを読み込めませんでした。ページを再読み込みしてください。");
} else {
  try {
    net = createNet({
      room,
      role: isHost ? "host" : "guest",
      id: playerId,
      onMessage: onMessage,
      onStatus: onNetStatus
    });
    net.connect();
  } catch (e) {
    console.warn(e);
    fatal = true;
    ui.showFatal("通信を開始できませんでした。ページを再読み込みしてください。");
  }
}

statusTimer = setInterval(updateStatus, 2000);
if (!isHost) {
  helloTimer = setInterval(sendHello, 2500);
  notFoundTimer = setTimeout(() => {
    if (!view && !guestBlocked && !fatal) ui.showWait("notfound", { room, inviteUrl });
  }, 9000);
}

window.addEventListener("beforeunload", () => {
  clearInterval(statusTimer);
  clearInterval(helloTimer);
  clearTimeout(notFoundTimer);
});

/* ------------------------------ helpers ----------------------------- */

function makeRoom() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const buf = new Uint32Array(6);
  crypto.getRandomValues(buf);
  for (let i = 0; i < 6; i++) out += alphabet[buf[i] % alphabet.length];
  return out;
}

function getPlayerId(role) {
  const key = "ad:pid:" + role;
  try {
    const old = sessionStorage.getItem(key);
    if (old) return old;
  } catch {}
  const id = "p" + Math.random().toString(36).slice(2, 10);
  try {
    sessionStorage.setItem(key, id);
  } catch {}
  return id;
}

function makeCtx() {
  return {
    isHost,
    room,
    inviteUrl,
    connected,
    netStatus,
    hostFresh: isHost ? true : (Date.now() - hostSeen < 12000),
    guestFresh: Date.now() - guestSeen < 12000
  };
}

function saveHost() {
  if (!isHost || !state) return;
  try {
    localStorage.setItem("ad:host:" + room, JSON.stringify(state));
  } catch {}
}

function updateStatus() {
  const ctx = makeCtx();
  if (!connected) {
    const off = netStatus === "offline";
    ui.setStatus(off ? "オフライン" : netStatus === "reconnecting" ? "再接続中…" : "接続中…", "warn");
  } else if (isHost) {
    if (!state.started) {
      ui.setStatus("相手を待っています", "warn");
    } else if (state.guestId) {
      ui.setStatus(ctx.guestFresh ? "相手オンライン" : "相手の接続待ち", ctx.guestFresh ? "ok" : "warn");
    } else {
      ui.setStatus("相手を待っています", "warn");
    }
  } else {
    ui.setStatus(ctx.hostFresh ? "ホストと同期中" : "ホストの接続待ち", ctx.hostFresh ? "ok" : "warn");
  }
  if (!connected) {
    const off = netStatus === "offline";
    ui.setWaitNet(
      off ? "オフライン・再接続を待っています…" : netStatus === "reconnecting" ? "通信を再接続しています…" : "ブローカーに接続中…",
      "warn"
    );
  } else {
    ui.setWaitNet(isHost ? "オンライン・待機中" : "オンライン", "ok");
  }
  ui.setContext(ctx);
}

function leave() {
  if (isHost) {
    try {
      localStorage.removeItem("ad:host:" + room);
    } catch {}
  }
  location.href = location.pathname;
}

/* ------------------------------ actions ----------------------------- */

function sendAction(action) {
  if (!view) return;
  if (awaiting) return;

  if (!connected) {
    ui.toast("接続を待っています。", "warn");
    return;
  }
  if (!isHost && Date.now() - hostSeen > 12000) {
    ui.toast("ホストの接続を待っています。", "warn");
    return;
  }
  if (view.winner != null && action.a !== "rematch") {
    ui.toast("デュエルは終了しています。", "warn");
    return;
  }
  if (action.a !== "rematch" && action.a !== "surrender" &&
      view.started && view.current !== view.you) {
    ui.toast("あなたのターンではありません。", "warn");
    return;
  }
  if (action.a === "surrender" && view.winner != null) return;

  if (isHost) {
    const r = applyAction(state, 0, action);
    if (!r.ok) {
      ui.toast(r.msg || "操作できません。", "warn");
      return;
    }
    afterHostAction();
  } else {
    awaiting = true;
    ui.setAwaiting(true);
    net.send({ type: "action", room, id: playerId, action });
    setTimeout(() => {
      if (awaiting) {
        awaiting = false;
        ui.setAwaiting(false);
        ui.toast("ホストの応答がありません。もう一度お試しください。", "warn");
      }
    }, 6500);
  }
}

function afterHostAction() {
  saveHost();
  view = viewFor(state, 0);
  ui.setContext(makeCtx());
  ui.render(view, makeCtx());
  if (state.guestId) {
    net.send({ type: "state", room, to: state.guestId, view: viewFor(state, 1) });
  }
  if (state.started) ui.hideWait();
  updateStatus();
}

/* ---------------------------- networking ---------------------------- */

function onNetStatus(s) {
  netStatus = s;
  connected = s === "online";
  if (connected && !isHost) sendHello();
  updateStatus();
}

function sendHello() {
  if (!connected || isHost || guestBlocked) return;
  net.send({ type: "hello", room, id: playerId, lastSeq: view?.seq ?? -1 });
}

function onMessage(msg) {
  if (!msg || msg.v !== 1 || msg.room !== room) return;
  if (isHost) onHostMessage(msg);
  else onGuestMessage(msg);
}

function onHostMessage(msg) {
  if (msg.type === "hello") {
    const now = Date.now();
    const prevSeen = state.guestSeen || 0;

    if (state.guestId && state.guestId !== msg.id && now - prevSeen < 15000) {
      net.send({ type: "reject", room, to: msg.id, reason: "full" });
      return;
    }

    const isNew = state.guestId !== msg.id;
    if (isNew) {
      state.guestId = msg.id;
      state.guestSeen = now;
      if (!state.started) startDuel(state);
      saveHost();
      view = viewFor(state, 0);
      ui.setContext(makeCtx());
      ui.render(view, makeCtx());
      ui.hideWait();
    } else {
      state.guestSeen = now;
    }
    guestSeen = now;

    if (msg.lastSeq === state.seq && state.started) {
      net.send({ type: "ack", room, to: msg.id, seq: state.seq });
    } else {
      net.send({ type: "state", room, to: msg.id, view: viewFor(state, 1) });
    }
    updateStatus();
    return;
  }

  if (msg.type === "action") {
    if (msg.id !== state.guestId) return;
    guestSeen = Date.now();
    state.guestSeen = guestSeen;
    const r = applyAction(state, 1, msg.action);
    if (!r.ok) {
      net.send({ type: "error", room, to: state.guestId, message: r.msg || "操作できません。" });
      return;
    }
    afterHostAction();
  }
}

function onGuestMessage(msg) {
  if (msg.to && msg.to !== playerId) return;

  if (msg.type === "state") {
    if (!msg.view || msg.view.room !== room) return;
    hostSeen = Date.now();
    awaiting = false;
    guestBlocked = false;
    view = msg.view;
    ui.setAwaiting(false);
    ui.setContext(makeCtx());
    ui.render(view, makeCtx());
    ui.hideWait();
    updateStatus();
    return;
  }

  if (msg.type === "ack") {
    hostSeen = Date.now();
    updateStatus();
    return;
  }

  if (msg.type === "reject") {
    guestBlocked = true;
    ui.showWait("full", { room, inviteUrl });
    return;
  }

  if (msg.type === "error") {
    awaiting = false;
    ui.setAwaiting(false);
    ui.toast(msg.message || "操作できません。", "warn");
  }
}
