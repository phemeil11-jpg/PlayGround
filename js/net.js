const BROKER = "wss://broker.emqx.io:8084/mqtt";
const PREFIX = "arcticduel/v1";

export function createNet({ room, role, id, onMessage, onStatus }) {
  if (!window.mqtt) throw new Error("mqtt unavailable");

  const ownTopic = `${PREFIX}/${room}/${role === "host" ? "h" : "g"}`;
  const otherTopic = `${PREFIX}/${room}/${role === "host" ? "g" : "h"}`;

  let client = null;
  let connected = false;
  let closed = false;

  function connect() {
    client = window.mqtt.connect(BROKER, {
      clientId: "ad_" + (role === "host" ? "h" : "g") + "_" + room + "_" + id,
      clean: true,
      reconnectPeriod: 2000,
      connectTimeout: 12000,
      keepalive: 30,
      protocolVersion: 4,
      resubscribe: true
    });

    client.on("connect", () => {
      connected = true;
      client.subscribe(ownTopic, { qos: 0 }, () => {});
      onStatus("online");
    });

    client.on("reconnect", () => {
      connected = false;
      if (!closed) onStatus("reconnecting");
    });

    client.on("offline", () => {
      connected = false;
      if (!closed) onStatus("offline");
    });

    client.on("close", () => {
      connected = false;
      if (!closed) onStatus("reconnecting");
    });

    client.on("error", (err) => {
      console.warn("[mqtt]", err?.message || err);
    });

    client.on("message", (topic, payload) => {
      if (topic !== ownTopic) return;
      try {
        const msg = JSON.parse(payload.toString());
        if (msg && msg.v === 1) onMessage(msg);
      } catch {
        /* ignore malformed packets */
      }
    });
  }

  function send(msg) {
    if (!client || !connected) return false;
    try {
      client.publish(otherTopic, JSON.stringify({ v: 1, ...msg }), { qos: 0 });
      return true;
    } catch {
      return false;
    }
  }

  function close() {
    closed = true;
    connected = false;
    try {
      client?.end(true);
    } catch {}
  }

  return {
    connect,
    send,
    close,
    get connected() {
      return connected;
    }
  };
}
