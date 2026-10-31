/* POLARIS — tiny WebAudio soundscape. All sounds are synthesised. */

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = false;
    this.wind = null;
    this.noiseBuffer = null;
  }

  async enable() {
    if (!this.ctx) this.build();
    this.enabled = true;
    try { await this.ctx.resume(); } catch {}
    if (this.wind) {
      try { this.wind.gain.setTargetAtTime(0.018, this.ctx.currentTime, 1.2); } catch {}
    }
    return true;
  }

  disable() {
    this.enabled = false;
    if (this.ctx) {
      try { this.ctx.suspend(); } catch {}
    }
  }

  build() {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    this.ctx = new AudioCtor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(this.ctx.destination);

    const length = Math.floor(this.ctx.sampleRate * 2.4);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.985 + white * 0.015;
      data[i] = last * 3.2;
    }
    this.noiseBuffer = buffer;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    filter.Q.value = 0.6;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start();
    this.wind = { source, filter, gain };
  }

  tone(freq, duration, { type = 'sine', gain = 0.05, slide = 0, delay = 0 } = {}) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + duration);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(amp);
    amp.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  noise(duration, { gain = 0.05, freq = 900, q = 0.8, delay = 0 } = {}) {
    if (!this.enabled || !this.ctx || !this.noiseBuffer) return;
    const t0 = this.ctx.currentTime + delay;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.playbackRate.value = 1.6;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(120, freq * 0.35), t0 + duration);
    filter.Q.value = q;
    const amp = this.ctx.createGain();
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    source.connect(filter);
    filter.connect(amp);
    amp.connect(this.master);
    source.start(t0);
    source.stop(t0 + duration + 0.03);
  }

  play(name) {
    if (!this.enabled || !this.ctx) return;
    switch (name) {
      case 'select':
        this.tone(880, 0.07, { type: 'sine', gain: 0.018 });
        break;
      case 'place':
        this.tone(420, 0.12, { type: 'triangle', gain: 0.035, slide: -80 });
        this.tone(840, 0.18, { type: 'sine', gain: 0.015, delay: 0.04 });
        break;
      case 'draw':
        this.noise(0.16, { gain: 0.018, freq: 2200, q: 1.4 });
        this.tone(1200, 0.08, { type: 'sine', gain: 0.012, delay: 0.02 });
        break;
      case 'summon':
        this.tone(96, 0.55, { type: 'sine', gain: 0.09, slide: -30 });
        this.tone(523, 0.4, { type: 'triangle', gain: 0.022, delay: 0.05 });
        this.tone(784, 0.5, { type: 'sine', gain: 0.015, delay: 0.12 });
        break;
      case 'attack':
        this.noise(0.34, { gain: 0.06, freq: 1800, q: 0.7 });
        this.tone(220, 0.22, { type: 'sawtooth', gain: 0.025, slide: -120 });
        break;
      case 'hit':
        this.tone(62, 0.4, { type: 'sine', gain: 0.13, slide: -26 });
        this.noise(0.22, { gain: 0.055, freq: 420, q: 0.8 });
        break;
      case 'heal':
        [523, 659, 784].forEach((f, i) => this.tone(f, 0.42, { type: 'sine', gain: 0.028, delay: i * 0.07 }));
        break;
      case 'trap':
        this.tone(330, 0.3, { type: 'square', gain: 0.022, slide: 260 });
        this.tone(660, 0.44, { type: 'triangle', gain: 0.02, delay: 0.08 });
        break;
      case 'spell':
        [392, 587, 880].forEach((f, i) => this.tone(f, 0.5, { type: 'sine', gain: 0.024, delay: i * 0.06 }));
        break;
      case 'turn':
        this.tone(196, 0.7, { type: 'sine', gain: 0.04 });
        this.tone(392, 0.7, { type: 'sine', gain: 0.02, delay: 0.03 });
        break;
      case 'win':
        [261, 329, 392, 523, 659].forEach((f, i) => this.tone(f, 1.2, { type: 'sine', gain: 0.035, delay: i * 0.1 }));
        break;
      case 'lose':
        [220, 174, 146, 110].forEach((f, i) => this.tone(f, 1.1, { type: 'triangle', gain: 0.03, delay: i * 0.12 }));
        break;
      case 'error':
        this.tone(160, 0.15, { type: 'square', gain: 0.02 });
        break;
      default:
        break;
    }
  }
}
