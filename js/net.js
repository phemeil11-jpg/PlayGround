/* POLARIS — zero-dependency MQTT-over-WebSocket room link.
   Hosts a private room topic on a public broker; no application server. */

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081/mqtt',
];

function mqttString(value) {
  const bytes = textEncoder.encode(value);
  return [bytes.length >> 8 & 255, bytes.length & 255, ...bytes];
}

function remainingLength(n) {
  const out = [];
  do {
    let digit = n % 128;
    n = Math.floor(n / 128);
    if (n > 0) digit |= 128;
    out.push(digit);
  } while (n > 0);
  return out;
}

function packet(type, flags, body) {
  return new Uint8Array([(type << 4) | flags, ...remainingLength(body.length), ...body]);
}

function connectPacket(clientId) {
  return packet(1, 0, [...mqttString('MQTT'), 4, 2, 0, 30, ...mqttString(clientId)]);
}

function subscribePacket(topic, id = 1) {
  return packet(8, 2, [id >> 8, id & 255, ...mqttString(topic), 0]);
}

function publishPacket(topic, payload, retain = false) {
  const body = [...mqttString(topic), ...textEncoder.encode(payload)];
  return packet(3, retain ? 1 : 0, body);
}

function pingPacket() {
  return new Uint8Array([0xc0, 0]);
}

function randomId(prefix = 'p') {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return prefix + Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 12);
}

export function roomTopic(room) {
  return `polaris/v3/${String(room || 'room').toLowerCase()}`;
}

export class RoomLink {
  constructor({ room, isHost, name, onStatus, onMessage, onOnline }) {
    this.room = String(room || '').toUpperCase();
    this.isHost = Boolean(isHost);
    this.name = name || (isHost ? '極夜の主' : '北の挑戦者');
    this.topic = roomTopic(this.room);
    this.peerId = randomId(isHost ? 'h' : 'g');
    this.onStatus = onStatus || (() => {});
    this.onMessage = onMessage || (() => {});
    this.onOnline = onOnline || (() => {});
    this.ws = null;
    this.buffer = new Uint8Array(0);
    this.connected = false;
    this.closed = false;
    this.brokerIndex = 0;
    this.failures = 0;
    this.reconnectTimer = 0;
    this.connackTimer = 0;
    this.pingTimer = 0;
    this.retry = 0;
  }

  connect() {
    if (this.closed || this.ws) return;
    const broker = BROKERS[this.brokerIndex % BROKERS.length];
    this.onStatus({ status: 'linking', broker, detail: '接続中' });
    let ws;
    try {
      ws = new WebSocket(broker, ['mqtt']);
    } catch (error) {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => {
      if (this.ws !== ws) return;
      try { ws.send(connectPacket(this.peerId)); } catch {}
      clearTimeout(this.connackTimer);
      this.connackTimer = setTimeout(() => {
        if (this.connected) return;
        try { ws.close(); } catch {}
      }, 6000);
    };
    ws.onmessage = (event) => {
      if (this.ws !== ws) return;
      try { this.consume(new Uint8Array(event.data)); } catch (error) { console.warn('mqtt parse', error); }
    };
    ws.onerror = () => {};
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      const wasConnected = this.connected;
      this.connected = false;
      clearTimeout(this.connackTimer);
      clearInterval(this.pingTimer);
      if (this.closed) return;
      this.failures++;
      if (!wasConnected) this.brokerIndex++;
      this.onStatus({ status: 'lost', detail: wasConnected ? '再接続中' : '回線を探索中', broker });
      this.scheduleReconnect();
    };
  }

  scheduleReconnect() {
    if (this.closed || this.reconnectTimer) return;
    this.retry = Math.min(8, this.retry + 1);
    const wait = Math.min(9000, 700 * this.retry);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = 0;
      this.connect();
    }, wait);
  }

  consume(chunk) {
    const merged = new Uint8Array(this.buffer.length + chunk.length);
    merged.set(this.buffer);
    merged.set(chunk, this.buffer.length);
    this.buffer = merged;

    while (this.buffer.length >= 2) {
      let multiplier = 1;
      let remaining = 0;
      let index = 1;
      let complete = false;
      for (; index < this.buffer.length && index <= 4; index++) {
        const digit = this.buffer[index];
        remaining += (digit & 127) * multiplier;
        multiplier *= 128;
        if ((digit & 128) === 0) { complete = true; index++; break; }
      }
      if (!complete) return;
      if (this.buffer.length < index + remaining) return;
      const raw = this.buffer.slice(0, index + remaining);
      this.buffer = this.buffer.slice(index + remaining);
      this.handlePacket(raw, index);
    }
  }

  handlePacket(raw, headerLength) {
    const type = raw[0] >> 4;
    if (type === 2) {
      const returnCode = raw[headerLength + 1];
      if (returnCode !== 0) {
        try { this.ws?.close(); } catch {}
        return;
      }
      this.connected = true;
      this.failures = 0;
      this.retry = 0;
      clearTimeout(this.connackTimer);
      this.onStatus({ status: 'online', broker: BROKERS[this.brokerIndex % BROKERS.length], detail: '接続済み' });
      try { this.ws?.send(subscribePacket(this.topic)); } catch {}
      clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => this.ping(), 20000);
      setTimeout(() => this.onOnline(), 80);
      return;
    }
    if (type === 3) this.handlePublish(raw, headerLength);
  }

  handlePublish(raw, headerLength) {
    const flags = raw[0] & 15;
    const qos = (flags >> 1) & 3;
    let pos = headerLength;
    const topicLength = (raw[pos] << 8) | raw[pos + 1];
    pos += 2;
    const topic = textDecoder.decode(raw.slice(pos, pos + topicLength));
    pos += topicLength;
    if (qos > 0) pos += 2;
    if (topic !== this.topic) return;
    let message;
    try {
      message = JSON.parse(textDecoder.decode(raw.slice(pos)));
    } catch { return; }
    if (!message || message.from === this.peerId) return;
    try { this.onMessage(message); } catch (error) { console.warn('room message', error); }
  }

  ping() {
    if (!this.connected || !this.ws) return;
    try { this.ws.send(pingPacket()); } catch {}
  }

  send(message) {
    if (!this.connected || !this.ws) return false;
    try {
      this.ws.send(publishPacket(this.topic, JSON.stringify({ ...message, from: this.peerId })));
      return true;
    } catch {
      return false;
    }
  }

  sendState(state) {
    return this.send({ t: 'state', seq: state.eventSeq || 0, state });
  }

  sendAction(action) {
    return this.send({ t: 'action', action });
  }

  join() {
    return this.send({ t: 'join', name: this.name, role: 'guest' });
  }

  presence() {
    return this.send({
      t: this.isHost ? 'presence' : 'guestPresence',
      name: this.name,
      role: this.isHost ? 'host' : 'guest',
    });
  }

  setName(name) {
    this.name = name;
    this.send({ t: 'name', name });
  }

  close() {
    this.closed = true;
    clearTimeout(this.connackTimer);
    clearTimeout(this.reconnectTimer);
    clearInterval(this.pingTimer);
    try { this.ws?.close(); } catch {}
    this.ws = null;
  }
}

export function roomCode() {
  const alphabet = 'ACDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}
