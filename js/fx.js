// Ambient arctic canvas + lightweight synthesized sound. No external assets.

export class SnowScene {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    this.w = 0
    this.h = 0
    this.flakes = []
    this.stars = []
    this.tiltX = 0
    this.tiltY = 0
    this.targetX = 0
    this.targetY = 0
    this.last = performance.now()
    this.running = true
    this.resize = this.resize.bind(this)
    this.frame = this.frame.bind(this)
    window.addEventListener('resize', this.resize)
    document.addEventListener('visibilitychange', () => {
      this.running = !document.hidden
      if (this.running) {
        this.last = performance.now()
        requestAnimationFrame(this.frame)
      }
    })
    this.resize()
    requestAnimationFrame(this.frame)
  }

  resize() {
    this.w = window.innerWidth
    this.h = window.innerHeight
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    this.canvas.width = Math.floor(this.w * this.dpr)
    this.canvas.height = Math.floor(this.h * this.dpr)
    this.canvas.style.width = `${this.w}px`
    this.canvas.style.height = `${this.h}px`
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this.makeStars()
    this.makeFlakes()
  }

  makeStars() {
    const count = Math.round((this.w * this.h) / 9000)
    this.stars = Array.from({ length: Math.min(190, count) }, () => ({
      x: Math.random() * this.w,
      y: Math.random() * this.h * 0.72,
      r: Math.random() * 1.35 + 0.25,
      a: Math.random() * 0.7 + 0.15,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.7 + 0.2
    }))
  }

  makeFlakes() {
    const count = this.w < 620 ? 110 : 190
    this.flakes = Array.from({ length: count }, () => this.newFlake(true))
  }

  newFlake(initial = false) {
    return {
      x: Math.random() * this.w,
      y: initial ? Math.random() * this.h : -20,
      r: Math.random() * 2.1 + 0.5,
      vy: Math.random() * 0.55 + 0.25,
      vx: Math.random() * 0.35 - 0.175,
      phase: Math.random() * Math.PI * 2,
      alpha: Math.random() * 0.65 + 0.2,
      depth: Math.random() * 0.8 + 0.2
    }
  }

  setTilt(x, y) {
    this.targetX = Math.max(-1, Math.min(1, x))
    this.targetY = Math.max(-1, Math.min(1, y))
  }

  frame(now) {
    if (!this.running) return
    const dt = Math.min(32, now - this.last) / 16.666
    this.last = now
    this.tiltX += (this.targetX - this.tiltX) * 0.04
    this.tiltY += (this.targetY - this.tiltY) * 0.04
    const ctx = this.ctx
    ctx.clearRect(0, 0, this.w, this.h)

    const t = now / 1000
    for (const star of this.stars) {
      const tw = 0.55 + Math.sin(t * star.speed + star.phase) * 0.45
      ctx.globalAlpha = star.a * tw
      ctx.fillStyle = star.r > 1.1 ? '#d9f7ff' : '#ffffff'
      ctx.beginPath()
      ctx.arc(star.x + this.tiltX * 7, star.y + this.tiltY * 4, star.r, 0, Math.PI * 2)
      ctx.fill()
    }

    for (const flake of this.flakes) {
      flake.phase += 0.012 * dt
      flake.y += flake.vy * dt * (0.65 + flake.depth)
      flake.x += (flake.vx + Math.sin(flake.phase) * 0.22 + this.tiltX * 0.9 * flake.depth) * dt
      if (flake.y > this.h + 12) {
        Object.assign(flake, this.newFlake(false))
        flake.x = Math.random() * this.w
      }
      if (flake.x < -20) flake.x = this.w + 20
      if (flake.x > this.w + 20) flake.x = -20
      ctx.globalAlpha = flake.alpha * (0.55 + flake.depth * 0.45)
      ctx.fillStyle = '#e9fbff'
      ctx.beginPath()
      ctx.arc(flake.x, flake.y, flake.r * (0.55 + flake.depth * 0.6), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    requestAnimationFrame(this.frame)
  }
}

let fxLayer = null
function layer() {
  if (!fxLayer) fxLayer = document.getElementById('fxLayer')
  return fxLayer
}

export function shatter(x, y, color = '#bff4ff', count = 16) {
  const host = layer()
  if (!host) return
  for (let i = 0; i < count; i++) {
    const shard = document.createElement('i')
    shard.className = 'shard'
    shard.style.left = `${x}px`
    shard.style.top = `${y}px`
    shard.style.setProperty('--hue', color)
    const angle = Math.random() * Math.PI * 2
    const dist = 30 + Math.random() * 95
    const dx = Math.cos(angle) * dist
    const dy = Math.sin(angle) * dist - 20
    const size = 3 + Math.random() * 7
    shard.style.width = `${size}px`
    shard.style.height = `${size * (0.6 + Math.random())}px`
    host.appendChild(shard)
    const anim = shard.animate([
      { transform: 'translate(-50%, -50%) rotate(0deg) scale(1)', opacity: 0.95 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${Math.random() * 540 - 270}deg) scale(0.15)`, opacity: 0 }
    ], { duration: 620 + Math.random() * 360, easing: 'cubic-bezier(.15,.7,.25,1)' })
    anim.onfinish = () => shard.remove()
  }
}

export function impact(x, y, color = '#9fe8ff') {
  const host = layer()
  if (!host) return
  const ring = document.createElement('i')
  ring.className = 'impact-ring'
  ring.style.left = `${x}px`
  ring.style.top = `${y}px`
  ring.style.borderColor = color
  host.appendChild(ring)
  ring.animate([
    { transform: 'translate(-50%, -50%) scale(0.15)', opacity: 1 },
    { transform: 'translate(-50%, -50%) scale(2.6)', opacity: 0 }
  ], { duration: 520, easing: 'cubic-bezier(.1,.8,.2,1)' }).onfinish = () => ring.remove()

  const flash = document.createElement('i')
  flash.className = 'impact-flash'
  flash.style.left = `${x}px`
  flash.style.top = `${y}px`
  flash.style.background = `radial-gradient(circle, ${color} 0%, transparent 68%)`
  host.appendChild(flash)
  flash.animate([
    { transform: 'translate(-50%, -50%) scale(0.2)', opacity: 0.9 },
    { transform: 'translate(-50%, -50%) scale(1.5)', opacity: 0 }
  ], { duration: 400, easing: 'ease-out' }).onfinish = () => flash.remove()
}

export function floatText(x, y, text, tone = 'damage') {
  const host = layer()
  if (!host) return
  const el = document.createElement('span')
  el.className = `float-text float-text--${tone}`
  el.textContent = text
  el.style.left = `${x}px`
  el.style.top = `${y}px`
  host.appendChild(el)
  el.animate([
    { transform: 'translate(-50%, 0) scale(0.7)', opacity: 0 },
    { transform: 'translate(-50%, -18px) scale(1.12)', opacity: 1, offset: 0.25 },
    { transform: 'translate(-50%, -58px) scale(1)', opacity: 0 }
  ], { duration: 1200, easing: 'cubic-bezier(.15,.75,.25,1)' }).onfinish = () => el.remove()
}

export function ghostCard(sourceEl, targetRect, sourceRect = null) {
  if (!sourceEl) return
  const rect = sourceRect || sourceEl.getBoundingClientRect()
  const ghost = sourceEl.cloneNode(true)
  ghost.classList.add('card-ghost')
  ghost.style.position = 'fixed'
  ghost.style.left = `${rect.left}px`
  ghost.style.top = `${rect.top}px`
  ghost.style.width = `${rect.width}px`
  ghost.style.height = `${rect.height}px`
  ghost.style.zIndex = '90'
  document.body.appendChild(ghost)
  const dx = targetRect.left + targetRect.width / 2 - (rect.left + rect.width / 2)
  const dy = targetRect.top + targetRect.height / 2 - (rect.top + rect.height / 2)
  ghost.animate([
    { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
    { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 24}px) scale(1.14) rotate(${dx > 0 ? 7 : -7}deg)`, opacity: 1, offset: 0.62 },
    { transform: `translate(${dx}px, ${dy}px) scale(0.9) rotate(0deg)`, opacity: 0.15 }
  ], { duration: 470, easing: 'cubic-bezier(.2,.65,.2,1)' }).onfinish = () => ghost.remove()
}

export class Sfx {
  constructor() {
    this.enabled = false
    this.ctx = null
    this.master = null
    this.ambient = null
  }

  async enable() {
    if (this.enabled) return
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    this.ctx = new Ctx()
    await this.ctx.resume()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.24
    this.master.connect(this.ctx.destination)
    this.enabled = true
    this.startWind()
  }

  disable() {
    this.enabled = false
    if (this.ambient) {
      try { this.ambient.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2) } catch {}
      this.ambient = null
    }
    if (this.ctx) {
      try { this.ctx.suspend() } catch {}
    }
  }

  toggle() {
    if (this.enabled) this.disable()
    else this.enable()
    return this.enabled
  }

  startWind() {
    if (!this.ctx) return
    const seconds = 3
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * seconds, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      last = last * 0.985 + white * 0.015
      data[i] = last * 2.8
    }
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 420
    filter.Q.value = 0.4
    const gain = this.ctx.createGain()
    gain.gain.value = 0.045
    src.connect(filter).connect(gain).connect(this.master)
    src.start()
    this.ambient = gain
  }

  tone(freq, dur, type = 'sine', gain = 0.15, slide = null, delay = 0) {
    if (!this.enabled || !this.ctx) return
    const t0 = this.ctx.currentTime + delay
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g).connect(this.master)
    osc.start(t0)
    osc.stop(t0 + dur + 0.03)
  }

  noise(dur = 0.25, gain = 0.12, freq = 900) {
    if (!this.enabled || !this.ctx) return
    const len = Math.floor(this.ctx.sampleRate * dur)
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = freq
    filter.Q.value = 0.7
    const g = this.ctx.createGain()
    g.gain.value = gain
    src.connect(filter).connect(g).connect(this.master)
    src.start()
  }

  click() { this.tone(520, 0.06, 'triangle', 0.045) }
  draw() { this.noise(0.18, 0.045, 1600); this.tone(660, 0.1, 'sine', 0.03) }
  summon() {
    this.tone(330, 0.22, 'sine', 0.08)
    this.tone(495, 0.3, 'sine', 0.06, null, 0.05)
    this.tone(660, 0.4, 'triangle', 0.05, null, 0.11)
    this.noise(0.3, 0.04, 2200)
  }
  attack() { this.noise(0.28, 0.12, 1100); this.tone(220, 0.2, 'sawtooth', 0.05, 80) }
  damage() { this.tone(90, 0.32, 'sine', 0.14, 42); this.noise(0.22, 0.1, 240) }
  heal() { this.tone(523, 0.18, 'sine', 0.05); this.tone(784, 0.3, 'sine', 0.04, null, 0.07) }
  turn() { this.tone(392, 0.2, 'triangle', 0.05); this.tone(587, 0.3, 'triangle', 0.045, null, 0.12) }
  win() {
    ;[392, 494, 587, 784].forEach((f, i) => this.tone(f, 0.55, 'sine', 0.06, null, i * 0.09))
  }
  lose() {
    ;[330, 262, 196].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.06, null, i * 0.13))
  }
}
