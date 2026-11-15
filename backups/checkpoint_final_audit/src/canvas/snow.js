/* ==========================================================================
   REALISTIC CANVAS SNOW ENGINE
   Multi-plane depth, wind turbulence, and mobile-optimized particle system
   ========================================================================== */

export class SnowEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.animationFrameId = null;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.wind = 0.2;
    this.windTarget = 0.2;
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Scale particle count based on screen width
    const baseCount = this.width < 768 ? 70 : 160;
    const count = this.isReducedMotion ? 25 : baseCount;

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
        cancelAnimationFrame(this.animationFrameId);
      } else {
        this.render();
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

  createFlake(randomY = false) {
    // 3 Depth planes: 0 = background (tiny, slow), 1 = midground (crisp), 2 = foreground (large, soft blur)
    const layer = Math.random() < 0.2 ? 2 : Math.random() < 0.6 ? 1 : 0;
    let radius, speed, opacity, blur;

    if (layer === 2) {
      // Foreground: large, fast, gentle blur
      radius = Math.random() * 2.2 + 2.5;
      speed = Math.random() * 1.5 + 1.8;
      opacity = Math.random() * 0.35 + 0.45;
      blur = 1.5;
    } else if (layer === 1) {
      // Midground: crisp, medium
      radius = Math.random() * 1.6 + 1.2;
      speed = Math.random() * 1.0 + 1.1;
      opacity = Math.random() * 0.45 + 0.5;
      blur = 0;
    } else {
      // Background: tiny, slow crystalline
      radius = Math.random() * 1.0 + 0.6;
      speed = Math.random() * 0.6 + 0.6;
      opacity = Math.random() * 0.3 + 0.25;
      blur = 0;
    }

    return {
      x: Math.random() * this.width,
      y: randomY ? Math.random() * this.height : -15,
      radius,
      speed,
      opacity,
      blur,
      layer,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: Math.random() * 0.02 + 0.01
    };
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Smoothly interpolate wind
    this.wind += (this.windTarget - this.wind) * 0.02;

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

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
      if (p.blur > 0) {
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        this.ctx.shadowBlur = p.blur * 2;
      }
      this.ctx.fill();
      this.ctx.restore();
    }

    this.animationFrameId = requestAnimationFrame(() => this.render());
  }

  destroy() {
    cancelAnimationFrame(this.animationFrameId);
  }
}
