/* ==========================================================================
   STARRY SKY & SHOOTING STAR CANVAS ENGINE
   ========================================================================== */

export class SkyStarsEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.stars = [];
    this.shootingStars = [];
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.animationFrameId = null;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Populate stars in upper half of sky
    const count = this.width < 768 ? 90 : 180;
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * (this.height * 0.65),
        radius: Math.random() * 1.2 + 0.4,
        baseAlpha: Math.random() * 0.5 + 0.3,
        twinkleSpeed: Math.random() * 0.03 + 0.01,
        phase: Math.random() * Math.PI * 2,
        color: Math.random() < 0.2 ? '#fef08a' : Math.random() < 0.3 ? '#bae6fd' : '#ffffff'
      });
    }

    // Spawn an occasional shooting star every 12 to 24 seconds
    this.scheduleShootingStar();
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

  scheduleShootingStar() {
    const delay = Math.random() * 12000 + 12000;
    setTimeout(() => {
      this.spawnShootingStar();
      this.scheduleShootingStar();
    }, delay);
  }

  spawnShootingStar() {
    const startX = Math.random() * (this.width * 0.7);
    const startY = Math.random() * (this.height * 0.3);
    const length = Math.random() * 80 + 90;
    const speed = Math.random() * 8 + 10;
    const angle = (Math.PI / 4) + (Math.random() - 0.5) * 0.2;

    this.shootingStars.push({
      x: startX,
      y: startY,
      len: length,
      speed,
      angle,
      alpha: 1,
      decay: 0.016
    });
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw twinkling stars
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      s.phase += s.twinkleSpeed;
      const alpha = s.baseAlpha + Math.sin(s.phase) * 0.25;

      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = s.color;
      this.ctx.globalAlpha = Math.max(0.1, Math.min(1, alpha));
      this.ctx.fill();
    }

    // Draw shooting stars
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const ss = this.shootingStars[i];
      const endX = ss.x - Math.cos(ss.angle) * ss.len;
      const endY = ss.y - Math.sin(ss.angle) * ss.len;

      const grad = this.ctx.createLinearGradient(ss.x, ss.y, endX, endY);
      grad.addColorStop(0, `rgba(255, 255, 255, ${ss.alpha})`);
      grad.addColorStop(0.3, `rgba(254, 240, 138, ${ss.alpha * 0.7})`);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      this.ctx.beginPath();
      this.ctx.moveTo(ss.x, ss.y);
      this.ctx.lineTo(endX, endY);
      this.ctx.strokeStyle = grad;
      this.ctx.lineWidth = 1.8;
      this.ctx.globalAlpha = ss.alpha;
      this.ctx.stroke();

      ss.x += Math.cos(ss.angle) * ss.speed;
      ss.y += Math.sin(ss.angle) * ss.speed;
      ss.alpha -= ss.decay;

      if (ss.alpha <= 0) {
        this.shootingStars.splice(i, 1);
      }
    }

    this.ctx.globalAlpha = 1;
    this.animationFrameId = requestAnimationFrame(() => this.render());
  }

  destroy() {
    cancelAnimationFrame(this.animationFrameId);
  }
}
