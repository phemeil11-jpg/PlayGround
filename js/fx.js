const TAU = Math.PI * 2;
const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function withAlpha(hex, alpha) {
  const clean = String(hex).replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const value = parseInt(full || 'ffffff', 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
}

export class FX {
  constructor(canvas, layer) {
    this.canvas = canvas;
    this.layer = layer;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.beams = [];
    this.rings = [];
    this.slashes = [];
    this.running = false;
    this.last = 0;
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this._resize = this._resize.bind(this);
    this._loop = this._loop.bind(this);
    window.addEventListener('resize', this._resize, { passive: true });
    window.addEventListener('orientationchange', this._resize, { passive: true });
    this._resize();
  }

  _resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  rect(el) {
    if (!el) return { x: this.width / 2, y: this.height / 2, w: 0, h: 0 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, left: r.left, top: r.top };
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this._loop);
  }

  _loop(now) {
    if (!this.running) return;
    const dt = Math.min(48, now - this.last) / 1000;
    this.last = now;
    this._update(dt);
    this._render();
    if (this.particles.length || this.beams.length || this.rings.length || this.slashes.length) {
      requestAnimationFrame(this._loop);
    } else {
      this.running = false;
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  _update(dt) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= 0.985;
      p.life -= dt;
      if (p.spin) p.rot += p.spin * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const b of this.beams) b.life -= dt;
    this.beams = this.beams.filter((b) => b.life > 0);
    for (const r of this.rings) {
      r.life -= dt;
      r.radius += r.speed * dt;
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const s of this.slashes) s.life -= dt;
    this.slashes = this.slashes.filter((s) => s.life > 0);
  }

  _render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const r of this.rings) {
      const t = clamp(r.life / r.maxLife, 0, 1);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, TAU);
      ctx.strokeStyle = withAlpha(r.color, t * 0.9);
      ctx.lineWidth = Math.max(0.8, r.width * t);
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 18;
      ctx.stroke();
    }
    for (const b of this.beams) {
      const progress = 1 - b.life / b.maxLife;
      const alpha = Math.sin(Math.min(1, progress) * Math.PI) * 0.95;
      const dx = b.x2 - b.x1;
      const dy = b.y2 - b.y1;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const segments = 13;
      const jitter = Math.min(22, len * 0.07);
      const points = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const wobble = Math.sin(t * Math.PI) * (Math.random() - 0.5) * jitter * 2;
        points.push([b.x1 + dx * t + nx * wobble, b.y1 + dy * t + ny * wobble]);
      }
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.strokeStyle = withAlpha(b.color, alpha * 0.9);
      ctx.lineWidth = b.width;
      ctx.lineCap = 'round';
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 24;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.8})`;
      ctx.lineWidth = Math.max(1, b.width * 0.25);
      ctx.shadowBlur = 10;
      ctx.stroke();
    }
    for (const s of this.slashes) {
      const t = 1 - s.life / s.maxLife;
      const alpha = (1 - t) * 0.9;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.beginPath();
      ctx.arc(0, 0, s.radius, -0.9 + t * 0.8, 0.9 + t * 0.8);
      ctx.strokeStyle = withAlpha(s.color, alpha);
      ctx.lineWidth = s.width * (1 - t * 0.6);
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 22;
      ctx.stroke();
      ctx.restore();
    }
    for (const p of this.particles) {
      const t = clamp(p.life / p.maxLife, 0, 1);
      const alpha = t * p.alpha;
      if (p.kind === 'spark') {
        ctx.strokeStyle = withAlpha(p.color, alpha);
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.028, p.y - p.vy * 0.028);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.stroke();
      } else if (p.kind === 'shard') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = withAlpha(p.color, alpha);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(-p.size, -p.size * 0.35, p.size * 2, p.size * 0.7);
        ctx.restore();
      } else {
        ctx.fillStyle = withAlpha(p.color, alpha);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.glow ? 16 : 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.35 + t * 0.65), 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  burst(x, y, color = '#e8c36a', { count = 18, speed = 200, gravity = 40, size = 2.2, life = 0.7, shards = false, spread = TAU, angle = -Math.PI / 2 } = {}) {
    for (let i = 0; i < count; i++) {
      const a = angle + rand(-spread / 2, spread / 2);
      const v = rand(speed * 0.25, speed);
      const l = rand(life * 0.55, life);
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: l, maxLife: l, size: rand(size * 0.5, size * 1.3),
        color: Array.isArray(color) ? color[Math.floor(Math.random() * color.length)] : color,
        gravity, alpha: rand(0.55, 1), kind: shards && Math.random() > 0.55 ? 'shard' : (Math.random() > 0.6 ? 'spark' : 'dot'),
        rot: rand(0, TAU), spin: rand(-8, 8), glow: true,
      });
    }
    this.start();
  }

  ring(x, y, color = '#e8c36a', { radius = 10, max = 90, speed = 180, width = 3, life = 0.45 } = {}) {
    this.rings.push({ x, y, radius, color, speed, width, life, maxLife: life });
    this.start();
  }

  beam(fromEl, toEl, color = '#8fe9ff', { width = 5, duration = 0.32 } = {}) {
    const a = this.rect(fromEl);
    const b = this.rect(toEl);
    return this.beamPoints(a.x, a.y, b.x, b.y, color, { width, duration });
  }

  beamPoints(x1, y1, x2, y2, color = '#8fe9ff', { width = 5, duration = 0.32 } = {}) {
    this.beams.push({ x1, y1, x2, y2, color, width, life: duration, maxLife: duration });
    this.start();
    return new Promise((resolve) => setTimeout(resolve, duration * 900));
  }

  slash(el, color = '#ffd27a', { radius = 46, rot = 0.4, width = 5 } = {}) {
    const r = this.rect(el);
    this.slashes.push({ x: r.x, y: r.y, radius, color, rot, width, life: 0.4, maxLife: 0.4 });
    this.start();
  }

  text(x, y, text, color = '#fff3c4', { size = 26, cls = '', drift = 58 } = {}) {
    const el = document.createElement('div');
    el.className = `float-text ${cls}`;
    el.textContent = text;
    el.style.setProperty('--c', color);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.fontSize = `${size}px`;
    el.style.setProperty('--drift', `${drift}px`);
    this.layer.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  shake(target, amount = 9, duration = 380) {
    if (!target || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    target.classList.remove('screen-shake');
    void target.offsetWidth;
    target.style.setProperty('--shake', `${amount}px`);
    target.style.setProperty('--shake-time', `${duration}ms`);
    target.classList.add('screen-shake');
    setTimeout(() => target.classList.remove('screen-shake'), duration + 40);
  }

  flash(color = '#ff5f6d', strength = 0.28) {
    const el = document.createElement('div');
    el.className = 'fx-flash';
    el.style.background = `radial-gradient(circle at 50% 45%, ${withAlpha(color, strength)} 0%, transparent 68%)`;
    this.layer.appendChild(el);
    setTimeout(() => el.remove(), 480);
  }

  dustFrom(el, color = '#e8c36a', count = 22) {
    const r = this.rect(el);
    this.burst(r.x, r.y, color, { count, speed: 230, gravity: 120, size: 2, life: 0.9, shards: true });
  }
}
