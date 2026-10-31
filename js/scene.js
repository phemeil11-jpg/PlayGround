/* POLARIS — the living Arctic. Canvas only: aurora, stars, snow, ice.
   No image assets anywhere. */

const TAU = Math.PI * 2;

function rand(min, max) { return min + Math.random() * (max - min); }

export class ArcticScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
    this.stars = [];
    this.snow = [];
    this.ribbons = [];
    this.mountains = [];
    this.tx = 0;
    this.ty = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.time = 0;
    this.reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.running = true;
    this.last = 0;
    this.mountainCanvas = document.createElement('canvas');
    this.resize = this.resize.bind(this);
    this.frame = this.frame.bind(this);
    this.resize();
    addEventListener('resize', this.resize, { passive: true });
    addEventListener('pointermove', (event) => {
      this.targetX = (event.clientX / innerWidth - 0.5) * 2;
      this.targetY = (event.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      this.running = !document.hidden;
      if (this.running) requestAnimationFrame(this.frame);
    });
    requestAnimationFrame(this.frame);
  }

  setTilt(x, y) {
    this.targetX = Math.max(-1, Math.min(1, x));
    this.targetY = Math.max(-1, Math.min(1, y));
  }

  setReduceMotion(value) {
    this.reduceMotion = Boolean(value);
  }

  resize() {
    const w = innerWidth;
    const h = innerHeight;
    this.dpr = Math.min(2, devicePixelRatio || 1);
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.stars = Array.from({ length: w < 600 ? 110 : 190 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h * 0.62,
      r: rand(0.35, 1.5),
      a: rand(0.18, 0.9),
      speed: rand(0.3, 1.3),
      phase: rand(0, TAU),
    }));

    this.snow = Array.from({ length: w < 600 ? 70 : 120 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: rand(0.7, 2.6),
      speed: rand(6, 26),
      drift: rand(-6, 6),
      phase: rand(0, TAU),
      depth: rand(0.3, 1),
    }));

    this.ribbons = [
      { base: 0.24, amp: 0.085, freq: 1.35, speed: 0.055, width: 150, hue: '160,255,225', alpha: 0.055 },
      { base: 0.32, amp: 0.12, freq: 0.95, speed: 0.042, width: 190, hue: '130,210,255', alpha: 0.06 },
      { base: 0.42, amp: 0.09, freq: 1.7, speed: 0.06, width: 120, hue: '175,150,255', alpha: 0.05 },
      { base: 0.52, amp: 0.06, freq: 2.2, speed: 0.035, width: 90, hue: '120,255,205', alpha: 0.035 },
    ];

    this.mountains = [
      this.ridge(0.58, 0.22, 9, '#0a1a2a', '#06101d', 0.5),
      this.ridge(0.7, 0.3, 7, '#0c2233', '#071521', 0.8),
      this.ridge(0.86, 0.34, 5, '#0e2b3d', '#081a27', 1),
    ];
    this.paintMountains();
  }

  ridge(baseY, amp, peaks, top, bottom, parallax) {
    const points = [];
    const count = peaks * 2 + 1;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const spike = i % 2 === 0 ? rand(0.55, 1) : rand(0.05, 0.3);
      points.push({
        x: t,
        y: baseY - amp * spike * (1 - Math.pow(Math.abs(t - 0.5) * 1.35, 2)),
      });
    }
    return { points, top, bottom, parallax };
  }

  paintMountains() {
    const c = this.mountainCanvas;
    c.width = Math.round(this.w * this.dpr);
    c.height = Math.round(this.h * this.dpr);
    const g = c.getContext('2d');
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (const ridge of this.mountains) {
      const gradient = g.createLinearGradient(0, this.h * 0.55, 0, this.h);
      gradient.addColorStop(0, ridge.top);
      gradient.addColorStop(1, ridge.bottom);
      g.beginPath();
      g.moveTo(-40, this.h);
      for (const point of ridge.points) {
        g.lineTo(point.x * (this.w + 80) - 40, point.y * this.h);
      }
      g.lineTo(this.w + 40, this.h);
      g.closePath();
      g.fillStyle = gradient;
      g.fill();
      g.strokeStyle = 'rgba(150, 230, 255, 0.09)';
      g.lineWidth = 1;
      g.stroke();
      // snow line highlights
      g.beginPath();
      for (let i = 0; i < ridge.points.length; i++) {
        const p = ridge.points[i];
        const x = p.x * (this.w + 80) - 40;
        const y = p.y * this.h;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.strokeStyle = 'rgba(205, 245, 255, 0.14)';
      g.stroke();
    }
  }

  drawSky() {
    const { ctx, w, h } = this;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#04070f');
    sky.addColorStop(0.32, '#071323');
    sky.addColorStop(0.62, '#0a2033');
    sky.addColorStop(0.82, '#0b2a3d');
    sky.addColorStop(1, '#06121e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    const glow = ctx.createRadialGradient(w * 0.76, h * 0.16, 0, w * 0.76, h * 0.16, Math.max(w, h) * 0.42);
    glow.addColorStop(0, 'rgba(88, 184, 218, 0.14)');
    glow.addColorStop(0.35, 'rgba(44, 88, 130, 0.08)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  }

  drawMoon() {
    const { ctx, w, h } = this;
    const x = w * 0.79 + this.tx * 8;
    const y = h * 0.13 + this.ty * 5;
    const r = Math.min(w, h) * 0.045;
    const halo = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 7);
    halo.addColorStop(0, 'rgba(226, 248, 255, 0.22)');
    halo.addColorStop(0.18, 'rgba(178, 228, 255, 0.09)');
    halo.addColorStop(1, 'rgba(150, 220, 255, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, r * 7, 0, TAU);
    ctx.fill();

    const disc = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    disc.addColorStop(0, '#f4fbff');
    disc.addColorStop(0.6, '#d8edf7');
    disc.addColorStop(1, '#9fc4d6');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();

    ctx.fillStyle = 'rgba(95, 135, 155, 0.18)';
    ctx.beginPath();
    ctx.arc(x - r * 0.28, y + r * 0.12, r * 0.22, 0, TAU);
    ctx.arc(x + r * 0.34, y - r * 0.18, r * 0.14, 0, TAU);
    ctx.arc(x + r * 0.1, y + r * 0.42, r * 0.1, 0, TAU);
    ctx.fill();
  }

  drawStars(t) {
    const { ctx } = this;
    for (const star of this.stars) {
      const twinkle = this.reduceMotion ? 1 : 0.6 + Math.sin(t * star.speed + star.phase) * 0.4;
      const x = star.x + this.tx * 4;
      const y = star.y + this.ty * 2;
      ctx.globalAlpha = star.a * twinkle;
      ctx.fillStyle = star.r > 1.15 ? '#d9f6ff' : '#a9d8ef';
      ctx.beginPath();
      ctx.arc(x, y, star.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawAurora(t) {
    const { ctx, w, h } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const ribbon of this.ribbons) {
      const points = 34;
      const baseY = h * ribbon.base + this.ty * 6;
      const amp = h * ribbon.amp;
      const shift = this.reduceMotion ? 0 : t * ribbon.speed;
      const gradient = ctx.createLinearGradient(0, baseY - amp * 1.8, 0, baseY + amp * 1.8);
      gradient.addColorStop(0, `rgba(${ribbon.hue}, 0)`);
      gradient.addColorStop(0.45, `rgba(${ribbon.hue}, ${ribbon.alpha})`);
      gradient.addColorStop(0.55, `rgba(${ribbon.hue}, ${ribbon.alpha})`);
      gradient.addColorStop(1, `rgba(${ribbon.hue}, 0)`);
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const p = i / points;
        const x = p * w + this.tx * 10;
        const y = baseY
          + Math.sin(p * TAU * ribbon.freq + shift + ribbon.base * 10) * amp
          + Math.sin(p * TAU * ribbon.freq * 0.47 - shift * 0.7) * amp * 0.55
          + Math.sin(p * 9.7 + shift * 0.4) * 4;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = gradient;
      ctx.lineCap = 'round';
      ctx.lineWidth = ribbon.width;
      ctx.globalAlpha = 0.65;
      ctx.stroke();
      ctx.lineWidth = ribbon.width * 0.35;
      ctx.globalAlpha = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  drawMountains() {
    const { ctx } = this;
    const x = this.tx * 16;
    const y = this.ty * 6;
    ctx.drawImage(this.mountainCanvas, x - 8, y - 4, this.w + 16, this.h + 8);
  }

  drawSnow(dt, t) {
    const { ctx, w, h } = this;
    for (const flake of this.snow) {
      if (!this.reduceMotion) {
        flake.y += flake.speed * dt * flake.depth;
        flake.x += (flake.drift + Math.sin(t * 0.7 + flake.phase) * 9) * dt * flake.depth + this.tx * 2;
        if (flake.y > h + 8) { flake.y = -8; flake.x = Math.random() * w; }
        if (flake.x < -10) flake.x = w + 10;
        if (flake.x > w + 10) flake.x = -10;
      }
      ctx.globalAlpha = 0.12 + flake.depth * 0.4;
      ctx.fillStyle = '#e8fbff';
      ctx.beginPath();
      ctx.arc(flake.x, flake.y, flake.r * flake.depth, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawMist(t) {
    const { ctx, w, h } = this;
    const y = h * 0.78;
    const fog = ctx.createLinearGradient(0, y - h * 0.05, 0, h);
    fog.addColorStop(0, 'rgba(122, 190, 210, 0)');
    fog.addColorStop(0.6, 'rgba(104, 168, 190, 0.055)');
    fog.addColorStop(1, 'rgba(5, 13, 22, 0.42)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, y - h * 0.05, w, h - y + h * 0.05);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const band = ctx.createRadialGradient(w * 0.3 + Math.sin(t * 0.03) * w * 0.1, h * 0.82, 0, w * 0.3, h * 0.82, w * 0.55);
    band.addColorStop(0, 'rgba(124, 219, 235, 0.035)');
    band.addColorStop(1, 'rgba(124, 219, 235, 0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, h * 0.6, w, h * 0.4);
    ctx.restore();
  }

  frame(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now;
    this.time += dt;
    const t = this.time;

    this.tx += (this.targetX - this.tx) * 0.035;
    this.ty += (this.targetY - this.ty) * 0.035;

    this.drawSky();
    this.drawStars(t);
    this.drawMoon();
    this.drawAurora(t);
    this.drawMountains();
    this.drawSnow(dt, t);
    this.drawMist(t);
    requestAnimationFrame(this.frame);
  }
}
