/* ==========================================================================
   REALISTIC CANVAS SNOW ENGINE — ULTRA-SMOOTH HIGH-PERFORMANCE EDITION
   Batched multi-plane depth, wind turbulence, and GPU-efficient particle system
   ========================================================================== */

export class SnowEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.particles = [];
    this.animationFrameId = null;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.wind = 0.2;
    this.windTarget = 0.2;
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isPaused = false;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Scale particle count based on screen width
    const baseCount = this.width < 768 ? 60 : 130;
    const count = this.isReducedMotion ? 20 : baseCount;

    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createFlake(true));
    }

    // Gentle wind variation cycle
    setInterval(() => {
      this.windTarget = (Math.random() - 0.45) * 0.8;
    }, 4000);

    // Visibility change listener to conserve CPU when tab is hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else if (!this.isPaused) {
        this.resume();
      }
    });

    this.render();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    if (this.canvas) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }
  }

  pause() {
    this.isPaused = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  resume() {
    this.isPaused = false;
    if (!this.animationFrameId) {
      this.render();
    }
  }

  createFlake(randomY = false) {
    // 3 Depth planes: 0 = background (tiny, slow), 1 = midground (crisp), 2 = foreground (large, soft)
    const layer = Math.random() < 0.2 ? 2 : Math.random() < 0.6 ? 1 : 0;
    let radius, speed, opacity;

    if (layer === 2) {
      // Foreground: large, fast, soft alpha
      radius = Math.random() * 2.0 + 2.4;
      speed = Math.random() * 1.5 + 1.8;
      opacity = Math.random() * 0.25 + 0.65;
    } else if (layer === 1) {
      // Midground: crisp, medium
      radius = Math.random() * 1.4 + 1.2;
      speed = Math.random() * 1.0 + 1.1;
      opacity = Math.random() * 0.35 + 0.5;
    } else {
      // Background: tiny, slow crystalline
      radius = Math.random() * 0.9 + 0.6;
      speed = Math.random() * 0.6 + 0.6;
      opacity = Math.random() * 0.2 + 0.3;
    }

    return {
      x: Math.random() * this.width,
      y: randomY ? Math.random() * this.height : -15,
      radius,
      speed,
      opacity,
      layer,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: Math.random() * 0.02 + 0.01
    };
  }

  render() {
    if (this.isPaused) return;

    this.ctx.clearRect(0, 0, this.width, this.height);

    // Smoothly interpolate wind
    this.wind += (this.windTarget - this.wind) * 0.02;

    // High-performance batched rendering by layer:
    // 1 draw call per depth plane instead of 160 separate save/restore/shadow cycles
    const layers = [[], [], []];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      p.sway += p.swaySpeed;
      p.x += Math.sin(p.sway) * 0.5 + this.wind * (p.layer + 1);
      p.y += p.speed;

      // Wrap around edges
      if (p.y > this.height + 10) {
        this.particles[i] = this.createFlake(false);
      }
      if (p.x > this.width + 10) {
        p.x = -10;
      } else if (p.x < -10) {
        p.x = this.width + 10;
      }

      layers[p.layer].push(p);
    }

    // Layer 0: Background flakes (soft, translucent)
    if (layers[0].length > 0) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
      this.ctx.beginPath();
      for (let i = 0; i < layers[0].length; i++) {
        const p = layers[0][i];
        this.ctx.moveTo(p.x + p.radius, p.y);
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      }
      this.ctx.fill();
    }

    // Layer 1: Midground flakes (crisp, radiant)
    if (layers[1].length > 0) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      this.ctx.beginPath();
      for (let i = 0; i < layers[1].length; i++) {
        const p = layers[1][i];
        this.ctx.moveTo(p.x + p.radius, p.y);
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      }
      this.ctx.fill();
    }

    // Layer 2: Foreground flakes (large, bold snow flurry)
    if (layers[2].length > 0) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      this.ctx.beginPath();
      for (let i = 0; i < layers[2].length; i++) {
        const p = layers[2][i];
        this.ctx.moveTo(p.x + p.radius, p.y);
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      }
      this.ctx.fill();
    }

    this.animationFrameId = requestAnimationFrame(() => this.render());
  }

  destroy() {
    cancelAnimationFrame(this.animationFrameId);
  }
}
