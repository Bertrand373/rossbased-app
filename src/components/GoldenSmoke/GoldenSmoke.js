// GoldenSmoke.js - TITANTRACK
// Atmospheric golden smoke background for Tracker tab
// Pure canvas animation — no dependencies, minimal CPU footprint

import React, { useRef, useEffect } from 'react';

class Wisp {
  constructor(W, H, isAccent) {
    this.isAccent = isAccent;
    this.reset(W, H, false);
  }

  reset(W, H, fromBottom) {
    this.x = Math.random() * W;
    this.y = fromBottom ? H + Math.random() * 80 : Math.random() * H;
    this.originX = this.x;

    const sizeMult = this.isAccent ? 0.3 : 1;
    this.width = (Math.random() * 80 + 90) * sizeMult;
    this.height = this.width * (Math.random() * 0.8 + 0.8);

    const speedMult = this.isAccent ? 1.2 : 1;
    this.speedY = -(Math.random() * 0.3 + 0.12) * speedMult;

    this.wobbleAmp = Math.random() * 50 + 15;
    this.wobbleFreq = Math.random() * 0.006 + 0.002;
    this.phase = Math.random() * Math.PI * 2;

    const opacityMult = this.isAccent ? 1.4 : 1;
    this.opacity = (Math.random() * 0.1 + 0.1) * opacityMult;

    this.rotation = (Math.random() - 0.5) * 0.4;
    this.rotSpeed = (Math.random() - 0.5) * 0.0005;
    this.scalePhase = Math.random() * Math.PI * 2;
    this.life = 1;
  }

  update(W, H) {
    this.y += this.speedY;
    this.phase += this.wobbleFreq;
    this.x = this.originX + Math.sin(this.phase) * this.wobbleAmp;
    this.rotation += this.rotSpeed;
    this.scalePhase += 0.004;

    const ny = this.y / H;
    if (ny < 0.12) this.life = Math.max(0, ny / 0.12);
    else if (ny > 0.88) this.life = Math.max(0, (1 - ny) / 0.12);
    else this.life = 1;

    if (this.y < -this.height * 2) this.reset(W, H, true);
  }

  draw(ctx) {
    const scale = 1 + Math.sin(this.scalePhase) * 0.2;
    const alpha = this.opacity * this.life;
    if (alpha < 0.003) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(scale, scale);

    const hw = this.width * 0.5;
    const hh = this.height * 0.5;

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, hw);
    grad.addColorStop(0, `rgba(225, 190, 60, ${alpha * 1.2})`);
    grad.addColorStop(0.25, `rgba(212, 175, 55, ${alpha * 0.8})`);
    grad.addColorStop(0.55, `rgba(190, 145, 30, ${alpha * 0.35})`);
    grad.addColorStop(1, 'rgba(160, 110, 10, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hot center
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, hw * 0.25);
    coreGrad.addColorStop(0, `rgba(255, 220, 100, ${alpha * 0.6})`);
    coreGrad.addColorStop(1, 'rgba(255, 220, 100, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, hw * 0.3, hh * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

const GoldenSmoke = () => {
  const canvasRef = useRef(null);
  const wispsRef = useRef([]);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const DPR = Math.min(window.devicePixelRatio, 2);

    const resize = () => {
      canvas.width = canvas.offsetWidth * DPR;
      canvas.height = canvas.offsetHeight * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };

    const init = () => {
      resize();
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      const wisps = [];
      // Main wisps
      for (let i = 0; i < 18; i++) wisps.push(new Wisp(W, H, false));
      // Accent wisps — smaller, sharper
      for (let i = 0; i < 10; i++) wisps.push(new Wisp(W, H, true));
      wispsRef.current = wisps;
    };

    const render = () => {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);

      // Base gradient warmth
      const baseGrad = ctx.createLinearGradient(0, H, 0, H * 0.2);
      baseGrad.addColorStop(0, 'rgba(212, 175, 55, 0.08)');
      baseGrad.addColorStop(0.4, 'rgba(180, 130, 20, 0.024)');
      baseGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, W, H);

      // Center ambient warmth
      const cg = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, W * 0.5);
      cg.addColorStop(0, 'rgba(212, 175, 55, 0.05)');
      cg.addColorStop(0.5, 'rgba(180, 140, 30, 0.015)');
      cg.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = cg;
      ctx.fillRect(0, 0, W, H);

      wispsRef.current.forEach(w => {
        w.update(W, H);
        w.draw(ctx);
      });

      rafRef.current = requestAnimationFrame(render);
    };

    init();
    render();

    window.addEventListener('resize', init);
    return () => {
      window.removeEventListener('resize', init);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="golden-smoke"
      aria-hidden="true"
    />
  );
};

export default GoldenSmoke;
