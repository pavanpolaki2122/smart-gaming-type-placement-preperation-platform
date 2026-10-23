// Active Orange 3D Ember Particle Canvas Graphics for CodeStreak

class EmberBackground {
  constructor() {
    this.canvas = document.getElementById("particles-canvas");
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    this.particles = [];
    this.particleCount = 55;
    this.mouse = { x: null, y: null };

    this.resize();
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("mousemove", (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    this.init();
    this.animate();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  init() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2.5 + 1,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: -Math.random() * 0.8 - 0.2, // Floats upward like embers
        opacity: Math.random() * 0.6 + 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.005,
        color: Math.random() > 0.4 ? "#ff6b00" : (Math.random() > 0.5 ? "#f59e0b" : "#f97316")
      });
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let p of this.particles) {
      p.x += p.speedX;
      p.y += p.speedY;
      p.opacity += Math.sin(Date.now() * p.pulseSpeed) * 0.005;

      // Wrap around
      if (p.y < -10) {
        p.y = this.canvas.height + 10;
        p.x = Math.random() * this.canvas.width;
      }
      if (p.x < -10) p.x = this.canvas.width + 10;
      if (p.x > this.canvas.width + 10) p.x = -10;

      // Draw ember glow
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0.1, Math.min(0.85, p.opacity));
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = p.color;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    requestAnimationFrame(() => this.animate());
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.emberBackground = new EmberBackground();
});
