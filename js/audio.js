// Tiny procedural sound engine. No audio files required.
const STORE_KEY = 'duel-legacy-muted';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.compressor = null;
    this.noiseBuffer = null;
    this.ambientNodes = null;
    this.muted = false;
    try { this.muted = localStorage.getItem(STORE_KEY) === '1'; } catch { /* ignore */ }
  }

  get ready() { return Boolean(this.ctx); }

  init() {
    if (this.ctx) return this.ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.62;
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 22;
    this.compressor.ratio.value = 8;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    this.master.connect(this.compressor).connect(this.ctx.destination);
    return this.ctx;
  }

  async resume() {
    this.init();
    if (this.ctx?.state === 'suspended') {
      try { await this.ctx.resume(); } catch { /* ignore */ }
    }
    return this.ctx;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    try { localStorage.setItem(STORE_KEY, this.muted ? '1' : '0'); } catch { /* ignore */ }
    if (this.master && this.ctx) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.62, t, 0.04);
    }
    if (this.muted) this.stopAmbient();
    return this.muted;
  }

  toggle() { return this.setMuted(!this.muted); }

  _noise() {
    if (this.noiseBuffer) return this.noiseBuffer;
    const ctx = this.init();
    if (!ctx) return null;
    const length = Math.floor(ctx.sampleRate * 1.2);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
    return buffer;
  }

  _tone({ freq = 440, to = null, type = 'sine', dur = 0.18, gain = 0.15, delay = 0, attack = 0.006, release = 0.12 }) {
    const ctx = this.init();
    if (!ctx || this.muted) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + release + 0.02);
  }

  _noiseBurst({ dur = 0.2, gain = 0.16, type = 'highpass', freq = 900, to = null, q = 1, delay = 0 }) {
    const ctx = this.init();
    const buffer = this._noise();
    if (!ctx || !buffer || this.muted) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(freq, t);
    if (to) filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  play(name) {
    if (this.muted) return;
    switch (name) {
      case 'ui':
        this._tone({ freq: 620, to: 780, type: 'sine', dur: 0.045, gain: 0.06, release: 0.06 });
        break;
      case 'select':
        this._tone({ freq: 880, type: 'triangle', dur: 0.05, gain: 0.05 });
        this._tone({ freq: 1320, type: 'sine', dur: 0.08, gain: 0.03, delay: 0.03 });
        break;
      case 'draw':
        this._noiseBurst({ dur: 0.17, gain: 0.09, type: 'bandpass', freq: 1900, to: 600, q: 0.9 });
        this._tone({ freq: 720, to: 980, type: 'triangle', dur: 0.07, gain: 0.035 });
        break;
      case 'set':
        this._tone({ freq: 200, to: 420, type: 'triangle', dur: 0.08, gain: 0.07 });
        this._noiseBurst({ dur: 0.1, gain: 0.05, type: 'lowpass', freq: 900, to: 300 });
        break;
      case 'summon':
        [196, 246.94, 293.66, 392].forEach((f, i) => {
          this._tone({ freq: f, type: 'sawtooth', dur: 0.42, gain: 0.05, delay: i * 0.035, attack: 0.03, release: 0.25 });
        });
        this._noiseBurst({ dur: 0.5, gain: 0.05, type: 'highpass', freq: 500, to: 2600 });
        this._tone({ freq: 1568, type: 'sine', dur: 0.3, gain: 0.03, delay: 0.16 });
        break;
      case 'special':
        [261.63, 329.63, 392, 523.25].forEach((f, i) => {
          this._tone({ freq: f, type: 'triangle', dur: 0.5, gain: 0.06, delay: i * 0.05, attack: 0.02, release: 0.3 });
        });
        this._noiseBurst({ dur: 0.8, gain: 0.04, type: 'bandpass', freq: 400, to: 3000, q: 0.7 });
        break;
      case 'attack':
        this._noiseBurst({ dur: 0.24, gain: 0.14, type: 'highpass', freq: 2400, to: 500 });
        this._tone({ freq: 330, to: 82, type: 'sawtooth', dur: 0.2, gain: 0.09 });
        break;
      case 'impact':
        this._tone({ freq: 96, to: 44, type: 'sine', dur: 0.32, gain: 0.32 });
        this._noiseBurst({ dur: 0.3, gain: 0.24, type: 'lowpass', freq: 1600, to: 160 });
        this._tone({ freq: 58, type: 'triangle', dur: 0.4, gain: 0.12, delay: 0.02 });
        break;
      case 'damage':
        this._tone({ freq: 260, to: 110, type: 'square', dur: 0.22, gain: 0.075 });
        this._tone({ freq: 196, to: 82, type: 'sawtooth', dur: 0.26, gain: 0.05, delay: 0.04 });
        break;
      case 'trap':
        this._tone({ freq: 1480, to: 220, type: 'square', dur: 0.19, gain: 0.045 });
        this._tone({ freq: 740, type: 'triangle', dur: 0.25, gain: 0.07, delay: 0.03 });
        this._noiseBurst({ dur: 0.22, gain: 0.07, type: 'bandpass', freq: 2400, to: 700, q: 4 });
        break;
      case 'heal':
        this._tone({ freq: 660, type: 'sine', dur: 0.18, gain: 0.07 });
        this._tone({ freq: 990, type: 'sine', dur: 0.26, gain: 0.055, delay: 0.08 });
        break;
      case 'phase':
        this._noiseBurst({ dur: 0.4, gain: 0.045, type: 'bandpass', freq: 500, to: 2200, q: 0.6 });
        this._tone({ freq: 392, to: 523.25, type: 'sine', dur: 0.28, gain: 0.04 });
        break;
      case 'turn':
        this._tone({ freq: 523.25, type: 'sine', dur: 0.22, gain: 0.05 });
        this._tone({ freq: 659.25, type: 'sine', dur: 0.3, gain: 0.04, delay: 0.1 });
        break;
      case 'win':
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
          this._tone({ freq: f, type: 'triangle', dur: 0.6, gain: 0.09, delay: i * 0.13, attack: 0.015, release: 0.5 });
        });
        this._noiseBurst({ dur: 1.2, gain: 0.03, type: 'highpass', freq: 1200, to: 4000 });
        break;
      case 'lose':
        [392, 329.63, 261.63, 196, 146.83].forEach((f, i) => {
          this._tone({ freq: f, type: 'sawtooth', dur: 0.7, gain: 0.06, delay: i * 0.16, attack: 0.03, release: 0.5 });
        });
        break;
      default:
        break;
    }
  }

  startAmbient() {
    const ctx = this.init();
    if (!ctx || this.ambientNodes || this.muted) return;
    const t = ctx.currentTime;
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0.0001, t);
    bus.gain.exponentialRampToValueAtTime(0.035, t + 2.2);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.Q.value = 0.4;
    bus.connect(filter).connect(this.master);
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    const oscC = ctx.createOscillator();
    oscA.type = 'sine'; oscA.frequency.value = 55;
    oscB.type = 'sine'; oscB.frequency.value = 82.41;
    oscC.type = 'triangle'; oscC.frequency.value = 110;
    const gA = ctx.createGain(); gA.gain.value = 0.5;
    const gB = ctx.createGain(); gB.gain.value = 0.28;
    const gC = ctx.createGain(); gC.gain.value = 0.06;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain).connect(bus.gain);
    oscA.connect(gA).connect(bus);
    oscB.connect(gB).connect(bus);
    oscC.connect(gC).connect(bus);
    [oscA, oscB, oscC, lfo].forEach((o) => o.start());
    this.ambientNodes = { bus, oscs: [oscA, oscB, oscC, lfo] };
  }

  stopAmbient() {
    const nodes = this.ambientNodes;
    if (!nodes || !this.ctx) return;
    this.ambientNodes = null;
    const t = this.ctx.currentTime;
    nodes.bus.gain.cancelScheduledValues(t);
    nodes.bus.gain.setTargetAtTime(0.0001, t, 0.35);
    nodes.oscs.forEach((o) => { try { o.stop(t + 1.8); } catch { /* ignore */ } });
  }
}
