// Tiny WebAudio synth for UI feedback. No audio files, no external requests.

const STORE_KEY = 'duel-legends-sound';

export class DuelAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.enabled = true;
    try {
      this.enabled = localStorage.getItem(STORE_KEY) !== 'off';
    } catch {}
  }

  init() {
    if (!this.enabled) return;
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.42;
    this.master.connect(this.ctx.destination);
    this.noiseBuffer = this.makeNoise();
  }

  makeNoise() {
    const length = Math.floor(this.ctx.sampleRate * 1.2);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = white * 0.6 + last * 0.4;
    }
    return buffer;
  }

  toggle() {
    this.enabled = !this.enabled;
    try { localStorage.setItem(STORE_KEY, this.enabled ? 'on' : 'off'); } catch {}
    if (this.enabled) this.init();
    return this.enabled;
  }

  tone({ freq = 440, freqEnd = null, type = 'sine', dur = 0.15, gain = 0.2, delay = 0, attack = 0.005 }) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise({ dur = 0.3, gain = 0.2, type = 'lowpass', freq = 1200, freqEnd = null, delay = 0, q = 1 }) {
    if (!this.enabled || !this.ctx || !this.noiseBuffer) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t0 + dur);
    filter.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  play(name) {
    if (!this.enabled) return;
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    const now = this.ctx.state;
    if (now === 'suspended') this.ctx.resume().catch(() => {});
    switch (name) {
      case 'click':
        this.tone({ freq: 620, freqEnd: 760, type: 'square', dur: 0.05, gain: 0.045 });
        break;
      case 'select':
        this.tone({ freq: 880, type: 'triangle', dur: 0.08, gain: 0.06 });
        this.tone({ freq: 1320, type: 'sine', dur: 0.12, gain: 0.04, delay: 0.03 });
        break;
      case 'error':
        this.tone({ freq: 220, freqEnd: 150, type: 'sawtooth', dur: 0.18, gain: 0.07 });
        break;
      case 'draw':
        this.noise({ dur: 0.22, gain: 0.05, type: 'highpass', freq: 900, freqEnd: 2600 });
        this.tone({ freq: 480, freqEnd: 720, type: 'triangle', dur: 0.14, gain: 0.05 });
        break;
      case 'summon':
        this.tone({ freq: 180, freqEnd: 420, type: 'sawtooth', dur: 0.4, gain: 0.07 });
        this.tone({ freq: 360, freqEnd: 900, type: 'triangle', dur: 0.45, gain: 0.06, delay: 0.03 });
        this.noise({ dur: 0.5, gain: 0.05, type: 'bandpass', freq: 700, freqEnd: 2200, q: 1.2 });
        break;
      case 'attack':
        this.noise({ dur: 0.28, gain: 0.14, type: 'bandpass', freq: 2400, freqEnd: 400, q: 0.7 });
        this.tone({ freq: 700, freqEnd: 120, type: 'sawtooth', dur: 0.2, gain: 0.05 });
        break;
      case 'damage':
        this.tone({ freq: 120, freqEnd: 42, type: 'sine', dur: 0.45, gain: 0.3 });
        this.noise({ dur: 0.35, gain: 0.16, type: 'lowpass', freq: 700, freqEnd: 120 });
        break;
      case 'destroy':
        this.noise({ dur: 0.5, gain: 0.14, type: 'highpass', freq: 2200, freqEnd: 300 });
        this.tone({ freq: 280, freqEnd: 60, type: 'square', dur: 0.3, gain: 0.06 });
        break;
      case 'spell':
        [523, 659, 784, 1046].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.4, gain: 0.05, delay: i * 0.06 }));
        this.noise({ dur: 0.6, gain: 0.06, type: 'bandpass', freq: 1800, freqEnd: 5200, q: 1.5 });
        break;
      case 'trap':
        this.tone({ freq: 300, freqEnd: 90, type: 'sawtooth', dur: 0.35, gain: 0.1 });
        [784, 587, 392].forEach((f, i) => this.tone({ freq: f, type: 'square', dur: 0.25, gain: 0.045, delay: i * 0.08 }));
        break;
      case 'heal':
        [659, 880, 1174].forEach((f, i) => this.tone({ freq: f, type: 'sine', dur: 0.5, gain: 0.06, delay: i * 0.07 }));
        break;
      case 'turn':
        this.tone({ freq: 220, type: 'sine', dur: 0.9, gain: 0.08 });
        this.tone({ freq: 330, type: 'sine', dur: 0.9, gain: 0.05, delay: 0.02 });
        break;
      case 'win':
        [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.8, gain: 0.09, delay: i * 0.11 }));
        break;
      case 'lose':
        [392, 330, 262, 196].forEach((f, i) => this.tone({ freq: f, type: 'sawtooth', dur: 0.9, gain: 0.06, delay: i * 0.16 }));
        break;
      default:
        this.tone({ freq: 520, type: 'sine', dur: 0.06, gain: 0.04 });
    }
  }
}
