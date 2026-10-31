// Tiny room layer over public MQTT/WebSocket brokers.
// The host is authoritative. Guests send intents; the host broadcasts state.

const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt'
]
const PREFIX = 'arcticduel/v2'

export class OnlineRoom {
  constructor({ room, pid, name, role, onMessage, onStatus }) {
    this.room = room
    this.pid = pid
    this.name = name
    this.role = role
    this.onMessage = onMessage
    this.onStatus = onStatus
    this.client = null
    this.connected = false
    this.brokerIndex = 0
    this.meta = { guestId: null, mode: 'ai' }
    this.attempt = 0
    this.closed = false
    this.heartbeat = null
    this.retryTimer = null
    this.connectTimer = null
  }

  topic() {
    return `${PREFIX}/${this.room}/msg`
  }

  start() {
    this.closed = false
    this.connect()
    this.heartbeat = setInterval(() => {
      if (this.connected) {
        this.publish({ type: 'beat', ...this.meta })
      }
    }, 4500)
  }

  connect() {
    if (this.closed) return
    if (!window.mqtt) {
      this.onStatus?.('down')
      return
    }
    const url = BROKERS[this.brokerIndex % BROKERS.length]
    this.onStatus?.(this.attempt === 0 ? 'connecting' : 'retry')
    const clientId = `ad_${this.pid.slice(0, 10)}_${Math.random().toString(36).slice(2, 7)}`
    let client
    try {
      client = window.mqtt.connect(url, {
        clientId,
        clean: true,
        connectTimeout: 7000,
        reconnectPeriod: 0,
        keepalive: 30,
        protocolVersion: 4
      })
    } catch {
      this.scheduleRetry()
      return
    }
    this.client = client
    let settled = false
    this.connectTimer = setTimeout(() => {
      if (settled) return
      settled = true
      try { client.end(true) } catch {}
      this.scheduleRetry()
    }, 8000)

    client.on('connect', () => {
      if (settled) return
      settled = true
      clearTimeout(this.connectTimer)
      this.connected = true
      this.attempt = 0
      this.onStatus?.('live')
      client.subscribe(`${PREFIX}/${this.room}/#`, { qos: 0 }, () => {
        this.sendHello()
      })
    })

    client.on('message', (_topic, payload) => {
      let msg
      try {
        msg = JSON.parse(payload.toString())
      } catch {
        return
      }
      if (!msg || msg.from === this.pid) return
      this.onMessage?.(msg)
    })

    client.on('error', () => {
      if (!this.connected) this.onStatus?.('retry')
    })

    client.on('close', () => {
      if (this.closed) return
      this.connected = false
      this.onStatus?.('retry')
      this.scheduleRetry()
    })
  }

  scheduleRetry() {
    if (this.closed || this.retryTimer) return
    this.attempt += 1
    this.brokerIndex += 1
    const delay = Math.min(12000, 800 * Math.pow(1.5, Math.min(6, this.attempt)))
    this.onStatus?.('retry')
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      try { this.client?.end(true) } catch {}
      this.connect()
    }, delay)
  }

  publish(payload) {
    if (!this.connected || !this.client) return false
    const body = {
      ...payload,
      from: this.pid,
      name: this.name,
      role: this.role,
      at: Date.now()
    }
    this.client.publish(this.topic(), JSON.stringify(body), { qos: 0, retain: false })
    return true
  }

  sendHello(extra = {}) {
    this.publish({ type: 'hello', ...this.meta, ...extra })
  }

  setMeta(meta) {
    this.meta = { ...this.meta, ...meta }
  }

  setName(name) {
    this.name = name
  }

  destroy() {
    this.closed = true
    clearInterval(this.heartbeat)
    clearTimeout(this.retryTimer)
    clearTimeout(this.connectTimer)
    try { this.client?.end(true) } catch {}
    this.connected = false
  }
}
