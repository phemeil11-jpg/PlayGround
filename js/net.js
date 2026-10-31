// Arctic Duel — serverless online transport (public MQTT brokers, room topics).

export const BROKERS = [
  { id: 'emqx', label: 'EMQX', url: 'wss://broker.emqx.io:8084/mqtt' },
  { id: 'hivemq', label: 'HiveMQ', url: 'wss://broker.hivemq.com:8884/mqtt' }
]

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function makeRoomCode() {
  let out = ''
  const buf = new Uint32Array(5)
  crypto.getRandomValues(buf)
  for (let i = 0; i < 5; i++) out += ALPHABET[buf[i] % ALPHABET.length]
  return out
}

export function makeId() {
  const buf = new Uint8Array(6)
  crypto.getRandomValues(buf)
  return Array.from(buf, b => b.toString(36).padStart(2, '0')).join('').slice(0, 10)
}

export function brokerById(id) {
  return BROKERS.find(b => b.id === id) || null
}

export class Net {
  constructor(opts) {
    this.room = opts.room
    this.role = opts.role
    this.myId = opts.myId
    this.brokerIndex = opts.brokerIndex ?? 0
    this.onStatus = opts.onStatus || (() => {})
    this.onView = opts.onView || (() => {})
    this.onAct = opts.onAct || (() => {})
    this.onPresence = opts.onPresence || (() => {})
    this.onError = opts.onError || (() => {})
    this.onConnect = opts.onConnect || (() => {})
    this.base = `ygoarctic/v2/${this.room}`
    this.client = null
    this.connected = false
    this.broker = null
    this.guestOnline = false
    this.hostOnline = false
    this.heartbeat = null
    this.guestSeen = 0
    this.hostSeen = 0
    this.closed = false
  }

  get brokerLabel() {
    return this.broker?.label || '—'
  }

  async connect() {
    const order = [this.brokerIndex, ...BROKERS.map((_, i) => i).filter(i => i !== this.brokerIndex)]
    for (const index of order) {
      if (this.closed) return
      try {
        await this._tryBroker(index)
        return
      } catch (error) {
        console.warn(`broker ${BROKERS[index].label} failed`, error?.message || error)
      }
    }
    this.onStatus('failed')
  }

  _tryBroker(index) {
    const broker = BROKERS[index]
    return new Promise((resolve, reject) => {
      let settled = false
      let client
      try {
        client = window.mqtt.connect(broker.url, {
          clientId: `ad_${this.role}_${this.myId}_${Math.floor(Math.random() * 1e6)}`,
          clean: true,
          keepalive: 30,
          reconnectPeriod: 0,
          connectTimeout: 7000,
          protocolVersion: 4,
          will: {
            topic: `${this.base}/${this.role === 'host' ? 'host' : 'guest'}`,
            payload: JSON.stringify({ online: false, id: this.myId, at: Date.now() }),
            qos: 1,
            retain: true
          }
        })
      } catch (error) {
        reject(error)
        return
      }
      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        try { client.end(true) } catch {}
        reject(new Error('timeout'))
      }, 8000)
      client.on('connect', () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        this._attach(client, index)
        resolve()
      })
      client.on('error', error => {
        if (settled) {
          if (this.client === client) this.onError(error?.message || String(error))
          return
        }
        settled = true
        clearTimeout(timer)
        try { client.end(true) } catch {}
        reject(error)
      })
    })
  }

  _attach(client, index) {
    this.client = client
    this.connected = true
    this.broker = BROKERS[index]
    const goOnline = () => {
      if (this.client !== client || this.closed) return
      this.connected = true
      this.onStatus('online')
      client.subscribe(this.role === 'host'
        ? [`${this.base}/act`, `${this.base}/guest`]
        : [`${this.base}/view`, `${this.base}/host`, `${this.base}/err`], { qos: 1 })
      this._presence(true)
      this.onConnect()
    }
    client.on('connect', goOnline)
    client.on('close', () => {
      if (this.client !== client || this.closed) return
      this.connected = false
      this.onStatus('reconnecting')
      this._scheduleRetry()
    })
    client.on('offline', () => {
      if (this.client !== client || this.closed) return
      this.connected = false
      this.onStatus('reconnecting')
      this._scheduleRetry()
    })
    client.on('message', (topic, payload) => {
      if (this.client !== client) return
      let msg
      try { msg = JSON.parse(payload.toString()) } catch { return }
      if (!msg || typeof msg !== 'object') return
      if (topic === `${this.base}/view`) {
        if (this.role !== 'guest') return
        this.onView(msg)
      } else if (topic === `${this.base}/act`) {
        if (this.role !== 'host') return
        if (msg.from === this.myId) return
        this.onAct(msg)
      } else if (topic === `${this.base}/host`) {
        if (this.role !== 'guest') return
        this.hostOnline = !!msg.online
        this.hostSeen = msg.at || Date.now()
        this.onPresence({ host: this.hostOnline })
      } else if (topic === `${this.base}/guest`) {
        if (this.role !== 'host') return
        this.guestOnline = !!msg.online
        this.guestSeen = msg.at || Date.now()
        this.onPresence({ guest: this.guestOnline })
      } else if (topic === `${this.base}/err`) {
        if (this.role !== 'guest') return
        if (msg.to && msg.to !== this.myId) return
        this.onError(msg.msg || '同期エラー')
      }
    })

    goOnline()
    clearInterval(this.heartbeat)
    this.heartbeat = setInterval(() => {
      this._presence(true)
      this._checkStale()
    }, 9000)
  }

  _scheduleRetry() {
    if (this.retryTimer || this.closed) return
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      if (this.closed || this.connected || !this.client) return
      try { this.client.reconnect() } catch {}
    }, 2500)
  }

  _presence(online) {
    if (!this.client || !this.connected) return
    const topic = `${this.base}/${this.role === 'host' ? 'host' : 'guest'}`
    this.client.publish(topic, JSON.stringify({ online, id: this.myId, at: Date.now() }), { qos: 1, retain: true })
  }

  _checkStale() {
    const now = Date.now()
    if (this.role === 'guest' && this.hostOnline && now - this.hostSeen > 32000) {
      this.hostOnline = false
      this.onPresence({ host: false })
    }
    if (this.role === 'host' && this.guestOnline && now - this.guestSeen > 32000) {
      this.guestOnline = false
      this.onPresence({ guest: false })
    }
  }

  publishView(view) {
    if (!this.client || !this.connected || this.role !== 'host') return
    this.client.publish(`${this.base}/view`, JSON.stringify(view), { qos: 1, retain: true })
  }

  sendAction(action) {
    if (!this.client || !this.connected) {
      this.onError('オンライン接続が切れています')
      return false
    }
    this.client.publish(`${this.base}/act`, JSON.stringify({ ...action, from: this.myId, role: 'guest', at: Date.now() }), { qos: 1 })
    return true
  }

  sendHello() {
    if (!this.client || !this.connected) return
    this.client.publish(`${this.base}/act`, JSON.stringify({ t: 'hello', from: this.myId, at: Date.now() }), { qos: 1 })
  }

  sendError(to, message) {
    if (!this.client || !this.connected) return
    this.client.publish(`${this.base}/err`, JSON.stringify({ to, msg: message, from: this.myId, at: Date.now() }), { qos: 0 })
  }

  disconnect() {
    this.closed = true
    clearInterval(this.heartbeat)
    if (this.client) {
      try {
        this._presence(false)
        this.client.end(true)
      } catch {}
    }
  }
}
