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
    this.y = fromBottom ? H + Math.random() * 100 : Math.random() * H;
    this.originX = this.x;

    const sizeMult = this.isAccent ? 0.45 : 1;
    // Much larger, more elongated — smoke clouds, not orbs
    this.width = (Math.random() * 140 + 120) * sizeMult;
    this.height = this.width * (Math.random() * 0.5 + 1.2);

    const speedMult = this.isAccent ? 1.15 : 1;
    this.speedY = -(Math.random() * 0.25 + 0.08) * speedMult;

    this.wobbleAmp = Math.random() * 60 + 20;
    this.wobbleFreq = Math.random() * 0.004 + 0.001;
    this.phase = Math.random() * Math.PI * 2;

    const opacityMult = this.isAccent ? 1.2 : 1;
    this.opacity = (Math.random() * 0.07 + 0.04) * opacityMult;

    this.rotation = (Math.random() - 0.5) * 0.6;
    this.rotSpeed = (Math.random() - 0.5) * 0.0003;
    this.scalePhase = Math.random() * Math.PI * 2;
    this.life = 1;
  }

  update(W, H) {
    this.y += this.speedY;
    this.phase += this.wobbleFreq;
    this.x = this.originX + Math.sin(this.phase) * this.wobbleAmp;
    this.rotation += this.rotSpeed;
    this.scalePhase += 0.003;

    const ny = this.y / H;
    if (ny < 0.1) this.life = Math.max(0, ny / 0.1);
    else if (ny > 0.9) this.life = Math.max(0, (1 - ny) / 0.1);
    else this.life = 1;

    if (this.y < -this.height * 2) this.reset(W, H, true);
  }

  draw(ctx) {
    const scale = 1 + Math.sin(this.scalePhase) * 0.15;
    const alpha = this.opacity * this.life;
    if (alpha < 0.002) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(scale, scale);

    const hw = this.width * 0.5;
    const hh = this.height * 0.5;

    // Soft diffuse cloud — very gradual falloff, no hard center
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, hw);
    grad.addColorStop(0, `rgba(212, 175, 55, ${alpha})`);
    grad.addColorStop(0.2, `rgba(205, 165, 45, ${alpha * 0.7})`);
    grad.addColorStop(0.45, `rgba(190, 145, 30, ${alpha * 0.35})`);
    grad.addColorStop(0.7, `rgba(170, 120, 15, ${alpha * 0.12})`);
    grad.addColorStop(1, 'rgba(150, 100, 10, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2);
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
      canvas.width = window.innerWidth * DPR;
      canvas.height = window.innerHeight * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };

    const init = () => {
      resize();
      const W = window.innerWidth;
      const H = window.innerHeight;
      const wisps = [];
      for (let i = 0; i < 20; i++) wisps.push(new Wisp(W, H, false));
      for (let i = 0; i < 10; i++) wisps.push(new Wisp(W, H, true));
      wispsRef.current = wisps;
    };

    const render = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      ctx.clearRect(0, 0, W, H);

      // Subtle base warmth from bottom
      const baseGrad = ctx.createLinearGradient(0, H, 0, H * 0.25);
      baseGrad.addColorStop(0, 'rgba(212, 175, 55, 0.06)');
      baseGrad.addColorStop(0.35, 'rgba(180, 130, 20, 0.015)');
      baseGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = baseGrad;
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
