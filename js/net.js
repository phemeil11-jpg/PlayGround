// ARCTIC DUEL — online room transport.
// PeerJS (public cloud) carries cross-device play. BroadcastChannel keeps
// same-browser tabs in the same room when the signalling cloud is unreachable.

const PEER_PREFIX = 'arcticduel-v1';
const PROBE_DELAY = 420;
const PEER_TIMEOUT = 8000;
const LOCAL_TIMEOUT = 2600;

function randomId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function peerIdFor(room) {
  return `${PEER_PREFIX}-${String(room).toLowerCase()}`;
}

function channelName(room) {
  return `arcticduel-room-${String(room).toUpperCase()}`;
}

export class Net {
  constructor({
    room, name, role = 'host',
    onState, onWelcome, onStatus, onAction, onHumanJoin, onHumanLeave,
    onJoinFailed, onDisconnected, onAutoGuest,
  }) {
    this.room = String(room).toUpperCase();
    this.name = name || 'DUELIST';
    this.role = role;
    this.id = randomId();
    this.since = Date.now();
    this.onState = onState || (() => {});
    this.onWelcome = onWelcome || (() => {});
    this.onStatus = onStatus || (() => {});
    this.onAction = onAction || (() => {});
    this.onHumanJoin = onHumanJoin || (() => {});
    this.onHumanLeave = onHumanLeave || (() => {});
    this.onJoinFailed = onJoinFailed || (() => {});
    this.onDisconnected = onDisconnected || (() => {});
    this.onAutoGuest = onAutoGuest || (() => {});

    this.peer = null;
    this.conn = null;
    this.bc = null;
    this.hostTabId = null;
    this.guestTabId = null;
    this.humanConnected = false;
    this.transport = null;
    this.latestState = null;
    this.closed = false;
    this.probeTimer = null;
    this.guestPeerTimer = null;
    this.localJoinTimer = null;
    this.peerReady = false;
    this.peerFailed = false;
    this.joinFailed = false;
    this.disconnected = false;
    this.guestName = 'CHALLENGER';
    this.lastGuestSeen = 0;
    this.presenceTimer = null;
  }

  startPresence() {
    if (this.presenceTimer) return;
    this.presenceTimer = setInterval(() => this.presenceTick(), 3000);
  }

  presenceTick() {
    if (this.closed || this.role !== 'host' || !this.humanConnected) return;
    const now = Date.now();
    if (now - this.lastGuestSeen > 12000) {
      this.handleGuestGone(this.transport);
      return;
    }
    this.send(this.transport === 'peer' ? 'peer' : 'local', { t: 'ping', at: now });
  }

  status(state, detail = '') {
    if (!this.closed) this.onStatus({ state, detail, role: this.role, room: this.room });
  }

  post(message) {
    if (!this.bc) return;
    try {
      this.bc.postMessage({ v: 1, room: this.room, from: this.id, ...message });
    } catch { /* channel may be closing */ }
  }

  openChannel() {
    if (typeof BroadcastChannel === 'undefined') return;
    this.bc = new BroadcastChannel(channelName(this.room));
    this.bc.onmessage = event => this.handleLocal(event.data);
  }

  // ---------- host ----------

  startHost() {
    this.role = 'host';
    this.openChannel();
    this.status('connecting');
    this.startPresence();
    this.post({ t: 'probe' });
    this.probeTimer = setTimeout(() => {
      this.probeTimer = null;
      if (this.closed || this.role !== 'host') return;
      this.startHostPeer();
    }, PROBE_DELAY);
  }

  startHostPeer() {
    if (this.closed || typeof window === 'undefined' || !window.Peer) {
      this.status('local', 'peerjs missing');
      return;
    }
    try {
      this.peer = new window.Peer(peerIdFor(this.room), { debug: 0 });
    } catch {
      this.status('local', 'peerjs init failed');
      return;
    }
    const failTimer = setTimeout(() => {
      if (!this.peerReady && !this.closed) this.status('local', 'signalling timeout');
    }, PEER_TIMEOUT);
    this.peer.on('open', () => {
      this.peerReady = true;
      clearTimeout(failTimer);
      if (this.closed) return;
      this.status(this.humanConnected ? 'live' : 'waiting');
    });
    this.peer.on('connection', conn => this.acceptPeerGuest(conn));
    this.peer.on('error', error => {
      const type = error?.type || '';
      if (type === 'unavailable-id') {
        this.status('local', 'room id busy');
      } else if (type !== 'peer-unavailable' && !this.closed) {
        this.status(this.humanConnected ? 'live' : 'local', type || 'peer error');
      }
    });
    this.peer.on('disconnected', () => {
      if (!this.closed && !this.peer?.destroyed) {
        try { this.peer.reconnect(); } catch { /* ignore */ }
      }
    });
  }

  acceptPeerGuest(conn) {
    if (this.closed) { try { conn.close(); } catch {} return; }
    if (this.humanConnected && this.transport === 'peer' && this.conn && this.conn.open) {
      try { conn.send({ t: 'full' }); conn.close(); } catch {}
      return;
    }
    this.conn = conn;
    this.transport = 'peer';
    conn.on('open', () => {
      if (!this.closed) this.status('live');
    });
    conn.on('data', data => this.handleGuestData(data, 'peer'));
    conn.on('close', () => this.handleGuestGone('peer'));
    conn.on('error', () => this.handleGuestGone('peer'));
  }

  handleGuestData(data, transport) {
    if (!data || typeof data !== 'object' || this.closed) return;
    if (data.t === 'hello') {
      const sameGuest = this.humanConnected && data.tabId && data.tabId === this.guestTabId;
      const firstHuman = !this.humanConnected;
      if (!firstHuman && !sameGuest) {
        try { this.conn?.send({ t: 'full' }); this.conn?.close(); } catch {}
        return;
      }
      this.guestName = String(data.name || 'CHALLENGER').slice(0, 18);
      this.guestTabId = data.tabId || this.guestTabId;
      this.transport = 'peer';
      this.humanConnected = true;
      this.lastGuestSeen = Date.now();
      this.status('live');
      this.send('peer', { t: 'welcome', state: this.latestState, hostName: this.name, room: this.room });
      if (firstHuman) this.onHumanJoin({ name: this.guestName, transport: 'peer' });
      return;
    }
    if (data.t === 'action' && this.humanConnected) {
      this.lastGuestSeen = Date.now();
      this.onAction({ action: data.action, transport });
      return;
    }
    if (data.t === 'pong') {
      this.lastGuestSeen = Date.now();
      return;
    }
    if (data.t === 'leave') this.handleGuestGone(transport);
  }

  handleGuestGone(transport) {
    if (!this.humanConnected) return;
    if (this.transport && transport && this.transport !== transport) return;
    const name = this.guestName;
    this.humanConnected = false;
    this.transport = null;
    this.guestTabId = null;
    if (this.conn) {
      try { this.conn.close(); } catch {}
      this.conn = null;
    }
    this.status('waiting');
    this.onHumanLeave({ name });
  }

  switchToGuest(hostId) {
    if (this.humanConnected) return false;
    clearTimeout(this.probeTimer);
    this.probeTimer = null;
    try { this.peer?.destroy(); } catch {}
    this.peer = null;
    this.peerReady = false;
    try { this.bc?.close(); } catch {}
    this.bc = null;
    this.role = 'guest';
    this.hostTabId = hostId;
    this.openChannel();
    this.status('connecting', 'existing room');
    this.onAutoGuest({ hostId, room: this.room });
    this.post({ t: 'join', to: hostId, name: this.name, tabId: this.id });
    this.startGuestPeer();
    this.localJoinTimer = setTimeout(() => this.tryLocalJoin(), LOCAL_TIMEOUT);
    return true;
  }

  handleLocal(data) {
    if (!data || data.v !== 1 || data.room !== this.room || data.from === this.id || this.closed) return;

    if (this.role === 'host') {
      if (data.t === 'probe') {
        this.post({ t: 'host-here', to: data.from, hostId: this.id, name: this.name, since: this.since });
        return;
      }
      if (data.t === 'host-here') {
        const older = data.since < this.since || (data.since === this.since && data.hostId < this.id);
        if (older && !this.humanConnected && this.role === 'host') this.switchToGuest(data.hostId);
        return;
      }
      if (data.t === 'join') {
        if (this.humanConnected && this.transport === 'peer') {
          this.post({ t: 'full', to: data.from });
          return;
        }
        if (this.humanConnected && this.guestTabId && this.guestTabId !== data.from) {
          this.post({ t: 'full', to: data.from });
          return;
        }
        const firstHuman = !this.humanConnected;
        this.guestTabId = data.from;
        this.guestName = String(data.name || 'CHALLENGER').slice(0, 18);
        this.humanConnected = true;
        this.lastGuestSeen = Date.now();
        this.transport = 'local';
        this.post({ t: 'welcome', to: data.from, state: this.latestState, hostName: this.name, room: this.room });
        if (firstHuman) this.onHumanJoin({ name: this.guestName, transport: 'local' });
        this.status('live');
        return;
      }
      if (data.t === 'action' && this.humanConnected && data.from === this.guestTabId) {
        this.lastGuestSeen = Date.now();
        this.onAction({ action: data.action, transport: 'local' });
        return;
      }
      if (data.t === 'pong' && data.from === this.guestTabId) {
        this.lastGuestSeen = Date.now();
        return;
      }
      if (data.t === 'leave' && data.from === this.guestTabId) {
        this.handleGuestGone('local');
      }
      return;
    }

    // guest
    if (data.t === 'host-here' && (!data.to || data.to === this.id)) {
      this.hostTabId = data.hostId;
      this.post({ t: 'join', to: this.hostTabId, name: this.name, tabId: this.id });
      return;
    }
    if (data.t === 'welcome' && (!data.to || data.to === this.id)) {
      if (this.humanConnected && this.transport === 'peer') return;
      if (this.humanConnected && this.transport === 'local') {
        this.onState(data.state, { transport: 'local' });
        return;
      }
      this.transport = 'local';
      this.hostTabId = data.to || this.hostTabId;
      this.humanConnected = true;
      this.status('guest-live');
      this.onWelcome({ state: data.state, hostName: data.hostName, transport: 'local' });
      return;
    }
    if (data.t === 'state' && (!data.to || data.to === this.id)) {
      if (this.transport === 'peer') return;
      this.transport = 'local';
      if (!this.hostTabId) this.hostTabId = data.from;
      this.humanConnected = true;
      this.status('guest-live');
      this.onState(data.state, { transport: 'local' });
      return;
    }
    if (data.t === 'full' && (!data.to || data.to === this.id)) {
      this.failJoin('この部屋は満員です。');
      return;
    }
    if (data.t === 'host-gone') {
      this.lostHost('ホストの部屋が閉じました。');
    }
  }

  send(transport, payload) {
    if (transport === 'peer') {
      try {
        if (this.conn && this.conn.open) this.conn.send(payload);
      } catch { /* ignore */ }
      return;
    }
    const to = this.role === 'host' ? this.guestTabId : this.hostTabId;
    this.post({ ...payload, to });
  }

  broadcastState(snapshot) {
    this.latestState = snapshot;
    if (this.role !== 'host' || !this.humanConnected) return;
    if (this.transport === 'peer') this.send('peer', { t: 'state', state: snapshot });
    else this.send('local', { t: 'state', state: snapshot });
  }

  // ---------- guest ----------

  startGuest() {
    this.role = 'guest';
    this.openChannel();
    this.status('connecting');
    this.post({ t: 'probe' });
    this.localJoinTimer = setTimeout(() => this.tryLocalJoin(), LOCAL_TIMEOUT);
    this.startGuestPeer();
  }

  startGuestPeer() {
    if (typeof window === 'undefined' || !window.Peer) return;
    try {
      this.peer = new window.Peer(undefined, { debug: 0 });
    } catch {
      return;
    }
    const timeout = setTimeout(() => {
      if (!this.humanConnected && !this.closed) this.tryLocalJoin();
    }, PEER_TIMEOUT);
    this.peer.on('open', () => {
      if (this.closed || this.humanConnected) return;
      try {
        const conn = this.peer.connect(peerIdFor(this.room), { reliable: true, metadata: { name: this.name } });
        this.conn = conn;
        conn.on('open', () => {
          try { conn.send({ t: 'hello', name: this.name, tabId: this.id }); } catch {}
        });
        conn.on('data', data => this.handleHostData(data));
        conn.on('close', () => this.guestLinkLost());
        conn.on('error', () => this.guestLinkLost());
      } catch { /* ignore */ }
    });
    this.peer.on('error', error => {
      if (error?.type === 'peer-unavailable') {
        this.peerFailed = true;
        this.tryLocalJoin();
        setTimeout(() => {
          if (!this.humanConnected && !this.closed) this.failJoin('ホストが見つかりません。');
        }, 2600);
      } else if (!this.humanConnected && error?.type !== 'network') {
        this.tryLocalJoin();
      }
    });
    this.guestPeerTimer = timeout;
  }

  tryLocalJoin() {
    if (this.closed || this.humanConnected) return;
    if (this.bc) {
      this.post({ t: 'probe' });
      setTimeout(() => {
        if (!this.closed && !this.humanConnected) {
          this.post({ t: 'join', name: this.name, tabId: this.id });
        }
      }, 280);
    } else if (!this.humanConnected && !this.closed) {
      this.failJoin('この端末では通信対戦を開始できません。');
    }
  }

  handleHostData(data) {
    if (!data || typeof data !== 'object' || this.closed) return;
    if (data.t === 'ping') {
      this.send(this.transport === 'peer' ? 'peer' : 'local', { t: 'pong' });
      return;
    }
    if (data.t === 'welcome') {
      if (this.humanConnected && this.transport === 'local') return;
      this.humanConnected = true;
      this.transport = 'peer';
      clearTimeout(this.localJoinTimer);
      clearTimeout(this.guestPeerTimer);
      this.status('guest-live');
      this.onWelcome({ state: data.state, hostName: data.hostName, transport: 'peer' });
      return;
    }
    if (data.t === 'state') {
      if (this.transport === 'local') return;
      this.humanConnected = true;
      this.transport = 'peer';
      this.status('guest-live');
      this.onState(data.state, { transport: 'peer' });
      return;
    }
    if (data.t === 'full') {
      this.failJoin('この部屋は満員です。');
    }
  }

  guestLinkLost() {
    if (this.closed || this.transport !== 'peer') return;
    this.lostHost('ホストとの接続が切れました。');
  }

  failJoin(message) {
    if (this.closed || this.humanConnected || this.joinFailed) return;
    this.joinFailed = true;
    this.onJoinFailed(message);
  }

  lostHost(message) {
    if (this.closed || this.disconnected) return;
    this.disconnected = true;
    this.onDisconnected(message);
  }

  sendAction(action) {
    if (this.role !== 'guest' || this.closed) return false;
    if (this.transport === 'peer' && this.conn?.open) {
      this.conn.send({ t: 'action', action });
      return true;
    }
    if (this.bc && this.hostTabId) {
      this.post({ t: 'action', to: this.hostTabId, action });
      return true;
    }
    return false;
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.probeTimer);
    clearTimeout(this.guestPeerTimer);
    clearTimeout(this.localJoinTimer);
    clearInterval(this.presenceTimer);
    this.presenceTimer = null;
    if (this.role === 'guest') {
      try {
        if (this.transport === 'peer' && this.conn?.open) this.conn.send({ t: 'leave' });
        else this.post({ t: 'leave' });
      } catch {}
      if (this.hostTabId) this.post({ t: 'leave' });
    } else {
      this.post({ t: 'host-gone' });
    }
    try { this.conn?.close(); } catch {}
    try { this.peer?.destroy(); } catch {}
    try { this.bc?.close(); } catch {}
    this.conn = null;
    this.peer = null;
    this.bc = null;
  }
}
