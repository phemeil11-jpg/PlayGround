/* 極夜遊戯 — client-only online layer.
   MQTT over WebSocket gives every tab/device in the same room a shared
   message bus. The earliest participant hosts; late joiners become guests.
   No server of our own is required, so the static build stays fully online. */

const BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt';
const TOPIC_ROOT = 'polar-duel/v3';
const KEEPALIVE = 30;
const HEARTBEAT = 1800;
const GUEST_TIMEOUT = 8200;
const HOST_TIMEOUT = 8200;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function makeRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(5);
  if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < 5; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  let code = '';
  for (let i = 0; i < 5; i += 1) code += alphabet[bytes[i] % alphabet.length];
  return code;
}

function randomId(length = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(length);
  if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  let out = '';
  for (let i = 0; i < length; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function utf8(text) {
  return encoder.encode(text);
}

function stringField(text) {
  const bytes = utf8(text);
  return new Uint8Array([bytes.length >> 8, bytes.length & 255, ...bytes]);
}

function varint(value) {
  const out = [];
  let rest = value;
  do {
    let byte = rest % 128;
    rest = Math.floor(rest / 128);
    if (rest > 0) byte |= 128;
    out.push(byte);
  } while (rest > 0);
  return new Uint8Array(out);
}

function packet(header, payload) {
  const length = varint(payload.length);
  const out = new Uint8Array(1 + length.length + payload.length);
  out[0] = header;
  out.set(length, 1);
  out.set(payload, 1 + length.length);
  return out;
}

function concat(...arrays) {
  const total = arrays.reduce((sum, item) => sum + item.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const item of arrays) {
    out.set(item, offset);
    offset += item.length;
  }
  return out;
}

function connectPacket(clientId) {
  const variable = concat(
    stringField('MQTT'),
    new Uint8Array([4, 0x02, 0, KEEPALIVE]),
    stringField(clientId),
  );
  return packet(0x10, variable);
}

function subscribePacket(topic, id = 1) {
  const variable = concat(
    new Uint8Array([id >> 8, id & 255]),
    stringField(topic),
    new Uint8Array([0]),
  );
  return packet(0x82, variable);
}

function publishPacket(topic, bytes) {
  return packet(0x30, concat(stringField(topic), bytes));
}

function readRemaining(bytes, offset) {
  let multiplier = 1;
  let value = 0;
  let index = offset;
  let digit;
  do {
    if (index >= bytes.length) return null;
    digit = bytes[index];
    index += 1;
    value += (digit & 127) * multiplier;
    multiplier *= 128;
    if (multiplier > 128 * 128 * 128 * 128) return null;
  } while (digit & 128);
  return { value, index };
}

export function createNet({ room, onStatus, onMessage, onPeerChange, onRole, onLog, onFull }) {
  const clientId = `${room}-${randomId(8)}`;
  const topic = `${TOPIC_ROOT}/${room}`;
  const state = {
    broker: false,
    peer: false,
    role: 'host',
    hostId: '',
    guestId: '',
    hostSince: 0,
    lastHostAt: 0,
    lastGuestAt: 0,
    full: false,
    destroyed: false,
    lastError: '',
  };
  let ws = null;
  let buffer = new Uint8Array(0);
  let connectTimer = 0;
  let electionTimer = 0;
  let claimTimer = 0;
  let heartbeatTimer = 0;
  let monitorTimer = 0;
  let reconnectTimer = 0;
  let reconnectAttempt = 0;
  let myClaim = 0;
  let earliestClaim = null;
  let helloAt = 0;
  let subscribed = false;

  const say = (text, kind = 'info') => onLog?.(text, kind);

  function status(kind, text) {
    if (state.destroyed) return;
    onStatus?.({ state: kind, text, role: state.role, connected: state.peer, broker: state.broker });
  }

  function setRole(next) {
    if (state.role === next) return;
    state.role = next;
    onRole?.(next);
  }

  function setPeer(next) {
    if (state.peer === next) return;
    state.peer = next;
    onPeerChange?.(next);
  }

  function rawSend(bytes) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
      ws.send(bytes);
      return true;
    } catch (error) {
      state.lastError = error?.message || 'send failed';
      return false;
    }
  }

  function publish(message) {
    if (!state.broker) return false;
    const body = { ...message, from: clientId, room };
    return rawSend(publishPacket(topic, utf8(JSON.stringify(body))));
  }

  /* ------------------------------------------------------------------------
     Incoming application messages
     ------------------------------------------------------------------------ */
  function receive(text) {
    let message;
    try { message = JSON.parse(text); } catch { return; }
    if (!message || typeof message !== 'object' || message.room !== room) return;
    if (message.from === clientId) return;
    const now = Date.now();

    if (state.full && message.t !== 'full') return;

    if (message.t === 'full') {
      if (message.to && message.to !== clientId) return;
      // Another host already has a guest. Stay playable locally, but stop
      // announcing and ignore the room so two hosts cannot fight over it.
      state.full = true;
      state.hostId = '';
      state.guestId = '';
      state.role = 'host';
      clearPresenceTimers();
      setPeer(false);
      status('full', 'ルームは満員です');
      onFull?.();
      return;
    }

    switch (message.t) {
      case 'hello': {
        if (state.role !== 'host' || !state.hostSince) return;
        if (state.guestId && state.guestId !== message.from) {
          publish({ t: 'full', to: message.from });
          return;
        }
        // Answer the greeting, but wait for the guest heartbeat before telling
        // the app a duel exists. Starting too early would send the welcome
        // state while the newcomer still thinks it is a host.
        state.guestId = message.from;
        state.lastGuestAt = now;
        publish({ t: 'host', to: message.from, at: state.hostSince });
        break;
      }
      case 'host': {
        if (state.role === 'host') {
          // Before the election finishes hostSince is 0 and this client is not
          // an authority yet; ignore other candidates instead of answering.
          if (!state.hostSince) {
            const candidateAt = Number(message.at) || 0;
            if (candidateAt) becomeGuest(message.from);
            return;
          }
          // Two tabs can win the election at once. The earlier host keeps the
          // room; the newcomer demotes itself and asks for a welcome state.
          const otherAt = Number(message.at) || 0;
          if (otherAt && (otherAt < state.hostSince || (otherAt === state.hostSince && message.from < clientId))) {
            becomeGuest(message.from);
          } else {
            publish({ t: 'host', at: state.hostSince });
          }
          return;
        }
        const first = !state.hostId;
        const wasGuest = state.role === 'guest';
        state.hostId = message.from;
        state.lastHostAt = now;
        if (!wasGuest) {
          clearElection();
          setRole('guest');
          say('既存のホストに接続した。', 'good');
        }
        if (first || !wasGuest) status('connected', 'ホストに接続しました');
        setPeer(true);
        break;
      }
      case 'claim': {
        if (state.role === 'host' && state.hostSince) {
          // Host is already established; tell the newcomer who owns the room.
          publish({ t: 'host', at: state.hostSince });
          return;
        }
        if (!earliestClaim || message.at < earliestClaim.at || (message.at === earliestClaim.at && message.from < earliestClaim.from)) {
          earliestClaim = { at: message.at || 0, from: message.from };
        }
        break;
      }
      case 'guest': {
        if (state.role === 'host' && state.hostSince && (!state.guestId || state.guestId === message.from)) {
          state.guestId = message.from;
          state.lastGuestAt = now;
          if (!state.peer) {
            status('connected', '対戦者が接続しました');
            setPeer(true);
          }
        }
        break;
      }
      case 'bye': {
        if (message.from === state.guestId) {
          state.guestId = '';
          setPeer(false);
          status('waiting', '対戦者が退出しました');
          say('対戦者が退出した。ホログラムが席を引き継ぐ。', 'warn');
        }
        if (message.from === state.hostId) {
          state.hostId = '';
          setPeer(false);
          status('retry', 'ホストが退出しました');
          scheduleElection(2400);
        }
        break;
      }
      case 'action':
      case 'rematch': {
        if (state.role === 'host' && message.from === state.guestId) {
          state.lastGuestAt = now;
          onMessage?.(message);
        }
        break;
      }
      case 'welcome':
      case 'state':
      case 'refuse': {
        if (state.role === 'host') return;
        if (message.to && message.to !== clientId) return;
        state.hostId = message.from;
        state.lastHostAt = now;
        if (state.role !== 'guest') setRole('guest');
        status('connected', 'オンライン接続中');
        setPeer(true);
        onMessage?.(message);
        break;
      }
      default:
        break;
    }
  }

  /* ------------------------------------------------------------------------
     Presence, election and heartbeats
     ------------------------------------------------------------------------ */
  function clearElection() {
    if (electionTimer) { clearTimeout(electionTimer); electionTimer = 0; }
    if (claimTimer) { clearTimeout(claimTimer); claimTimer = 0; }
  }

  function clearPresenceTimers() {
    clearElection();
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = 0; }
    if (monitorTimer) { clearInterval(monitorTimer); monitorTimer = 0; }
  }

  function announceHost() {
    publish({ t: 'host', at: state.hostSince });
  }

  function startHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => {
      if (state.destroyed || !state.broker) return;
      if (state.role === 'host' && !state.full) announceHost();
      else if (state.role === 'guest' && state.hostId) publish({ t: 'guest', to: state.hostId });
    }, HEARTBEAT);
  }

  function becomeHost() {
    clearElection();
    state.hostId = '';
    state.guestId = '';
    state.hostSince = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    setRole('host');
    setPeer(false);
    status('waiting', 'ルーム開放中 · 対戦者待機');
    announceHost();
    startHeartbeat();
    if (!monitorTimer) monitorTimer = setInterval(() => {
      if (state.destroyed) return;
      if (state.role === 'host' && state.guestId && Date.now() - state.lastGuestAt > GUEST_TIMEOUT) {
        state.guestId = '';
        setPeer(false);
        status('waiting', '対戦者を待っています');
        say('対戦者の応答が途切れた。ホログラムが席を引き継ぐ。', 'warn');
      }
      if (state.role === 'guest' && state.hostId && Date.now() - state.lastHostAt > HOST_TIMEOUT) {
        state.hostId = '';
        setPeer(false);
        status('retry', 'ホストとの接続が切れました');
        scheduleElection(1800);
      }
    }, 1100);
  }

  function becomeGuest(hostId) {
    clearElection();
    state.hostId = hostId;
    state.lastHostAt = Date.now();
    setRole('guest');
    setPeer(true);
    status('connected', 'ホストに接続しています');
    startHeartbeat();
    if (!monitorTimer) monitorTimer = setInterval(() => {
      if (state.destroyed) return;
      if (state.role === 'guest' && state.hostId && Date.now() - state.lastHostAt > HOST_TIMEOUT) {
        state.hostId = '';
        setPeer(false);
        status('retry', 'ホストとの接続が切れました');
        scheduleElection(1800);
      }
    }, 1100);
    publish({ t: 'hello' });
    publish({ t: 'guest', to: hostId });
  }

  function scheduleElection(delay = 1200) {
    if (state.destroyed || !state.broker || state.full) return;
    clearElection();
    status(state.role === 'guest' ? 'retry' : 'starting', state.role === 'guest' ? 'ホストを探しています' : 'ルームを開いています');
    publish({ t: 'hello' });
    helloAt = Date.now();
    electionTimer = setTimeout(() => {
      electionTimer = 0;
      if (state.destroyed || !state.broker) return;
      if (state.peer && state.hostId) return;
      myClaim = Date.now() * 1000 + Math.floor(Math.random() * 1000);
      earliestClaim = null;
      publish({ t: 'claim', at: myClaim });
      claimTimer = setTimeout(() => {
        claimTimer = 0;
        if (state.destroyed || !state.broker) return;
        if (state.hostId) { becomeGuest(state.hostId); return; }
        if (earliestClaim && (earliestClaim.at < myClaim || (earliestClaim.at === myClaim && earliestClaim.from < clientId))) {
          becomeGuest(earliestClaim.from);
          return;
        }
        becomeHost();
      }, 780);
    }, delay);
  }

  /* ------------------------------------------------------------------------
     MQTT transport
     ------------------------------------------------------------------------ */
  function handlePacket(header, payload) {
    const type = header >> 4;
    if (type === 2) {
      // CONNACK
      if (payload.length >= 2 && payload[1] !== 0) {
        state.lastError = `CONNACK ${payload[1]}`;
        try { ws.close(); } catch { /* noop */ }
        return;
      }
      state.broker = true;
      reconnectAttempt = 0;
      if (!subscribed) {
        subscribed = true;
        rawSend(subscribePacket(topic));
      }
      status('waiting', 'ルームに接続しました');
      scheduleElection(1000);
      return;
    }
    if (type === 3) {
      // PUBLISH
      if (payload.length < 2) return;
      const topicLength = (payload[0] << 8) | payload[1];
      if (payload.length < 2 + topicLength) return;
      const qos = (header >> 1) & 0x03;
      let offset = 2 + topicLength;
      if (qos > 0) offset += 2;
      if (payload.length < offset) return;
      receive(decoder.decode(payload.subarray(offset)));
      return;
    }
    if (type === 9) {
      // SUBACK
      if (payload.length >= 2 && payload[payload.length - 1] === 0x80) {
        state.lastError = 'SUBACK failed';
      }
      return;
    }
    // PINGRESP / PUBACK need no work.
  }

  function onSocketMessage(event) {
    const chunk = new Uint8Array(event.data);
    buffer = concat(buffer, chunk);
    let guard = 0;
    while (buffer.length >= 2 && guard < 80) {
      guard += 1;
      const remaining = readRemaining(buffer, 1);
      if (!remaining) return;
      const total = remaining.index + remaining.value;
      if (buffer.length < total) return;
      const header = buffer[0];
      const payload = buffer.slice(remaining.index, total);
      buffer = buffer.slice(total);
      handlePacket(header, payload);
    }
  }

  function openSocket() {
    if (state.destroyed) return;
    if (connectTimer) { clearTimeout(connectTimer); connectTimer = 0; }
    buffer = new Uint8Array(0);
    subscribed = false;
    status('starting', 'オンラインシグナルに接続中');
    let socket;
    try {
      socket = new WebSocket(BROKER_URL, 'mqtt');
    } catch (error) {
      state.lastError = error?.message || 'WebSocket unavailable';
      status('error', 'オンラインに接続できません');
      scheduleReconnect();
      return;
    }
    socket.binaryType = 'arraybuffer';
    ws = socket;
    socket.onopen = () => {
      if (state.destroyed || ws !== socket) return;
      rawSend(connectPacket(clientId));
      connectTimer = setTimeout(() => {
        if (!state.broker && ws === socket) {
          state.lastError = 'CONNACK timeout';
          try { socket.close(); } catch { /* noop */ }
        }
      }, 8000);
    };
    socket.onmessage = event => {
      if (state.destroyed || ws !== socket) return;
      onSocketMessage(event);
    };
    socket.onerror = () => {
      state.lastError = 'WebSocket error';
    };
    socket.onclose = () => {
      if (ws !== socket) return;
      ws = null;
      const wasBroker = state.broker;
      state.broker = false;
      subscribed = false;
      setPeer(false);
      state.hostId = '';
      state.guestId = '';
      clearPresenceTimers();
      if (state.destroyed) return;
      status('retry', 'オンラインを再接続中');
      if (wasBroker) say('オンライン回線が切れた。再接続する。', 'warn');
      scheduleReconnect();
    };
  }

  function scheduleReconnect() {
    if (state.destroyed || reconnectTimer) return;
    reconnectAttempt += 1;
    const delay = Math.min(15000, 1800 + reconnectAttempt * 1100);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = 0;
      if (state.destroyed) return;
      openSocket();
    }, delay);
  }

  function connect() {
    openSocket();
  }

  if (typeof addEventListener === 'function') {
    addEventListener('pagehide', () => {
      if (!state.destroyed) destroy();
    });
  }

  function send(message) {
    if (!state.broker) return false;
    const out = { ...message };
    if (state.role === 'host' && state.guestId && ['welcome', 'state', 'refuse', 'full'].includes(out.t)) {
      out.to = state.guestId;
    }
    return publish(out);
  }

  function reconnectNow() {
    if (state.destroyed) return;
    clearPresenceTimers();
    if (ws) {
      try { ws.close(); } catch { /* noop */ }
    }
    openSocket();
  }

  function destroy() {
    state.destroyed = true;
    publish({ t: 'bye' });
    clearPresenceTimers();
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = 0; }
    if (connectTimer) { clearTimeout(connectTimer); connectTimer = 0; }
    setPeer(false);
    try { ws?.close(); } catch { /* noop */ }
    ws = null;
  }

  return {
    start: connect,
    send,
    broadcast: send,
    destroy,
    reconnectNow,
    getRole: () => state.role,
    getPeerId: () => (state.role === 'host' ? state.guestId : state.hostId),
    isConnected: () => state.peer,
    isBrokerConnected: () => state.broker,
    isFull: () => state.full,
    getLastError: () => state.lastError,
    room,
  };
}
