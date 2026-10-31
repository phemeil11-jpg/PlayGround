// Tiny synthesized SFX — no audio assets.
class Sfx {
  constructor() {
    this.ctx = null
    this.enabled = localStorage.getItem('ad_sound') !== 'off'
    this.master = null
  }

  _ensure() {
    if (!this.enabled) return null
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return null
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.16
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
    return this.ctx
  }

  toggle() {
    this.enabled = !this.enabled
    localStorage.setItem('ad_sound', this.enabled ? 'on' : 'off')
    if (this.enabled) this.play('tap')
    return this.enabled
  }

  tone(freq, dur, type = 'sine', gain = 0.6, slide = 0, delay = 0) {
    const ctx = this._ensure()
    if (!ctx) return
    const t0 = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g).connect(this.master)
    osc.start(t0)
    osc.stop(t0 + dur + 0.03)
  }

  noise(dur, gain = 0.3, filterFreq = 1200, delay = 0) {
    const ctx = this._ensure()
    if (!ctx) return
    const t0 = ctx.currentTime + delay
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur))
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = filterFreq
    filter.Q.value = 0.7
    const g = ctx.createGain()
    g.gain.value = gain
    src.connect(filter).connect(g).connect(this.master)
    src.start(t0)
  }

  play(name) {
    if (!this.enabled) return
    try {
      if (name === 'tap') {
        this.tone(720, 0.05, 'triangle', 0.25, 120)
      } else if (name === 'draw') {
        this.noise(0.16, 0.18, 2400)
        this.tone(520, 0.09, 'sine', 0.2, 220)
      } else if (name === 'summon') {
        this.tone(220, 0.22, 'sawtooth', 0.18, 90)
        this.tone(440, 0.24, 'triangle', 0.22, 140, 0.03)
        this.tone(660, 0.3, 'sine', 0.18, 200, 0.07)
      } else if (name === 'set') {
        this.tone(180, 0.18, 'triangle', 0.25, -40)
        this.noise(0.12, 0.14, 900)
      } else if (name === 'attack') {
        this.noise(0.18, 0.35, 1800)
        this.tone(340, 0.2, 'sawtooth', 0.3, -260)
      } else if (name === 'hit') {
        this.tone(90, 0.22, 'square', 0.3, -50)
        this.noise(0.2, 0.3, 500)
      } else if (name === 'damage') {
        this.tone(140, 0.26, 'sawtooth', 0.25, -90)
      } else if (name === 'cast') {
        this.tone(880, 0.2, 'sine', 0.2, 420)
        this.tone(1320, 0.26, 'sine', 0.12, 240, 0.05)
      } else if (name === 'turn') {
        this.tone(392, 0.12, 'sine', 0.22)
        this.tone(523, 0.14, 'sine', 0.2, 0, 0.08)
        this.tone(659, 0.2, 'sine', 0.2, 0, 0.16)
      } else if (name === 'win') {
        ;[523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.32, 'sine', 0.22, 0, i * 0.11))
      } else if (name === 'lose') {
        ;[392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.34, 'triangle', 0.2, 0, i * 0.13))
      }
    } catch {}
  }
}

export const sfx = new Sfx()
