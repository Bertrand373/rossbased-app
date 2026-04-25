// GoldenSmoke.js - TITANTRACK
// Atmospheric canvas background for Tracker, Timeline, and Landing.
// Scene library — palette + tuning presets share the same Wisp engine.
// Pure canvas — no dependencies, minimal CPU footprint.
//
// Scene resolution priority (first match wins):
//   1. URL param ?scene=ember|golden|violet|jade|dawn|stars  (dev override)
//   2. `scene` prop                                          (production: from userData)
//   3. DEFAULT_SCENE = 'golden'
//
// Theme awareness: each scene defines `palette` (dark) and `paletteLight` (parchment).
// Canvas observes the html [data-theme] attribute and re-inits on theme change.

import React, { useRef, useEffect, useState } from 'react';

// =============================================================================
// SCENE LIBRARY
// =============================================================================
// Each wisp scene defines:
//   - count / accentCount: particle population
//   - sizeMult / speedMult / opacityMult: motion + scale tuning
//   - palette / paletteLight: 5 RGB stops for the radial gradient (alpha is scaled per-stop)
//   - baseGrad / baseGradLight: bottom-up (or top-down) ambient warmth tint
//
// Light-mode palettes are deeper, more saturated inks — illuminated-manuscript style —
// designed to read on parchment (#f4ede0), not pure white.
//
// 'stars' is its own type — pinpoints, slow parallax drift, no base warmth.
// In light mode, star pinpoints become warm-ink dots instead of white.

const SCENES = {
  ember: {
    type: 'wisp',
    count: 14,
    accentCount: 6,
    sizeMult: 0.85,
    speedMult: 0.55,
    opacityMult: 1.0,
    palette: [
      [168, 80, 32],
      [139, 62, 26],
      [120, 50, 18],
      [95, 35, 10],
      [70, 22, 5],
    ],
    paletteLight: [
      [180, 80, 28],
      [150, 65, 22],
      [120, 50, 15],
      [90, 35, 10],
      [60, 22, 5],
    ],
    baseGrad: { direction: 'bottom', stops: [[120, 50, 18, 0.085], [90, 35, 10, 0.02], [0, 0, 0, 0]] },
    baseGradLight: { direction: 'bottom', stops: [[150, 65, 22, 0.085], [110, 45, 12, 0.025], [0, 0, 0, 0]] },
  },

  golden: {
    type: 'wisp',
    count: 20,
    accentCount: 10,
    sizeMult: 1.0,
    speedMult: 1.0,
    opacityMult: 1.0,
    palette: [
      [212, 175, 55],
      [205, 165, 45],
      [190, 145, 30],
      [170, 120, 15],
      [150, 100, 10],
    ],
    paletteLight: [
      [160, 130, 5],
      [140, 110, 8],
      [115, 90, 10],
      [85, 65, 10],
      [55, 40, 10],
    ],
    baseGrad: { direction: 'bottom', stops: [[212, 175, 55, 0.06], [180, 130, 20, 0.015], [0, 0, 0, 0]] },
    baseGradLight: { direction: 'bottom', stops: [[140, 110, 8, 0.06], [115, 90, 10, 0.018], [0, 0, 0, 0]] },
  },

  violet: {
    type: 'wisp',
    count: 18,
    accentCount: 8,
    sizeMult: 1.1,
    speedMult: 1.2,
    opacityMult: 1.05,
    palette: [
      [184, 134, 229],
      [150, 95, 205],
      [107, 58, 160],
      [75, 38, 120],
      [50, 22, 85],
    ],
    paletteLight: [
      [120, 75, 175],
      [100, 60, 155],
      [80, 45, 130],
      [60, 30, 100],
      [40, 18, 70],
    ],
    baseGrad: { direction: 'bottom', stops: [[107, 58, 160, 0.06], [75, 38, 120, 0.018], [0, 0, 0, 0]] },
    baseGradLight: { direction: 'bottom', stops: [[80, 45, 130, 0.06], [60, 30, 100, 0.018], [0, 0, 0, 0]] },
  },

  jade: {
    type: 'wisp',
    count: 14,
    accentCount: 6,
    sizeMult: 1.2,
    speedMult: 0.5,
    opacityMult: 0.85,
    palette: [
      [120, 175, 145],
      [91, 138, 115],
      [60, 105, 85],
      [40, 75, 58],
      [22, 45, 32],
    ],
    paletteLight: [
      [60, 115, 90],
      [50, 95, 75],
      [38, 80, 62],
      [28, 60, 45],
      [18, 40, 30],
    ],
    baseGrad: { direction: 'bottom', stops: [[60, 105, 85, 0.05], [40, 75, 58, 0.015], [0, 0, 0, 0]] },
    baseGradLight: { direction: 'bottom', stops: [[50, 95, 75, 0.05], [38, 80, 62, 0.015], [0, 0, 0, 0]] },
  },

  dawn: {
    type: 'wisp',
    count: 10,
    accentCount: 4,
    sizeMult: 0.95,
    speedMult: 0.7,
    opacityMult: 0.95,
    palette: [
      [244, 200, 150],
      [232, 175, 130],
      [205, 130, 90],
      [165, 90, 55],
      [120, 60, 30],
    ],
    paletteLight: [
      [205, 130, 75],
      [180, 110, 60],
      [155, 90, 48],
      [125, 70, 36],
      [95, 50, 24],
    ],
    // Dawn glows from the TOP — sun-on-horizon feel, not coals from below
    baseGrad: { direction: 'top', stops: [[244, 200, 150, 0.08], [232, 175, 130, 0.025], [0, 0, 0, 0]] },
    baseGradLight: { direction: 'top', stops: [[205, 130, 75, 0.08], [180, 110, 60, 0.025], [0, 0, 0, 0]] },
  },

  stars: {
    type: 'stars',
    starCount: 90,
    shootingStarIntervalMs: [25000, 60000],
    starColor: [255, 250, 240],          // dark-mode: bright off-white pinpoints
    starColorLight: [58, 46, 28],         // light-mode: warm-ink dots on parchment
  },
};

const SCENE_KEYS = Object.keys(SCENES);
const DEFAULT_SCENE = 'golden';

export const isValidScene = (key) => Boolean(key && SCENES[key]);
export const SCENE_LIST = SCENE_KEYS;
export const DEFAULT_SCENE_KEY = DEFAULT_SCENE;

// Display metadata for the picker UI. Order here = picker order.
export const SCENE_META = [
  { key: 'golden', label: 'Golden Smoke', tag: 'Origin temple. Warm, abundant.' },
  { key: 'ember',  label: 'Ember Mist',   tag: 'Sparse coals. Slow, deliberate.' },
  { key: 'violet', label: 'Violet Flame', tag: 'Alchemical. Taller, faster.' },
  { key: 'jade',   label: 'Jade Mist',    tag: 'Mineral stillness. Wide, calm.' },
  { key: 'dawn',   label: 'Dawn',         tag: 'Glow from the horizon.' },
  { key: 'stars',  label: 'Starfield',    tag: 'Pinpoints. Cosmic order.' },
];

// Swatch colors for the picker thumbnails — sampled from each palette's brightest stop.
// Used at full alpha so the swatch reads clearly even when the wisp itself is subtle.
export const SCENE_SWATCH = {
  golden: { dark: 'rgb(212, 175, 55)',  light: 'rgb(160, 130, 5)'   },
  ember:  { dark: 'rgb(168, 80, 32)',   light: 'rgb(180, 80, 28)'   },
  violet: { dark: 'rgb(184, 134, 229)', light: 'rgb(120, 75, 175)'  },
  jade:   { dark: 'rgb(120, 175, 145)', light: 'rgb(60, 115, 90)'   },
  dawn:   { dark: 'rgb(244, 200, 150)', light: 'rgb(205, 130, 75)'  },
  stars:  { dark: 'rgb(255, 250, 240)', light: 'rgb(58, 46, 28)'    },
};

const resolveSceneKey = (sceneProp) => {
  if (typeof window !== 'undefined') {
    try {
      const param = new URLSearchParams(window.location.search).get('scene');
      if (isValidScene(param)) return param;
    } catch (_) {}
  }
  if (isValidScene(sceneProp)) return sceneProp;
  return DEFAULT_SCENE;
};

const readThemeAttr = () => {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') || 'dark';
};

// =============================================================================
// WISP — radial smoke cloud, drifts up with sine wobble
// =============================================================================

class Wisp {
  constructor(W, H, isAccent, scene) {
    this.isAccent = isAccent;
    this.scene = scene;
    this.reset(W, H, false);
  }

  reset(W, H, fromBottom) {
    const sc = this.scene;
    this.x = Math.random() * W;
    this.y = fromBottom ? H + Math.random() * 100 : Math.random() * H;
    this.originX = this.x;

    const accentSize = this.isAccent ? 0.45 : 1;
    this.width = (Math.random() * 140 + 120) * accentSize * sc.sizeMult;
    this.height = this.width * (Math.random() * 0.5 + 1.2);

    const accentSpeed = this.isAccent ? 1.15 : 1;
    this.speedY = -(Math.random() * 0.25 + 0.08) * accentSpeed * sc.speedMult;

    this.wobbleAmp = Math.random() * 60 + 20;
    this.wobbleFreq = Math.random() * 0.004 + 0.001;
    this.phase = Math.random() * Math.PI * 2;

    const accentOpacity = this.isAccent ? 1.2 : 1;
    this.opacity = (Math.random() * 0.07 + 0.04) * accentOpacity * sc.opacityMult;

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

  draw(ctx, palette) {
    const scale = 1 + Math.sin(this.scalePhase) * 0.15;
    const alpha = this.opacity * this.life;
    if (alpha < 0.002) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(scale, scale);

    const hw = this.width * 0.5;
    const hh = this.height * 0.5;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, hw);
    grad.addColorStop(0,    `rgba(${palette[0][0]}, ${palette[0][1]}, ${palette[0][2]}, ${alpha})`);
    grad.addColorStop(0.2,  `rgba(${palette[1][0]}, ${palette[1][1]}, ${palette[1][2]}, ${alpha * 0.7})`);
    grad.addColorStop(0.45, `rgba(${palette[2][0]}, ${palette[2][1]}, ${palette[2][2]}, ${alpha * 0.35})`);
    grad.addColorStop(0.7,  `rgba(${palette[3][0]}, ${palette[3][1]}, ${palette[3][2]}, ${alpha * 0.12})`);
    grad.addColorStop(1,    `rgba(${palette[4][0]}, ${palette[4][1]}, ${palette[4][2]}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// =============================================================================
// STAR — pinpoint with twinkle, very slow parallax drift
// =============================================================================

class Star {
  constructor(W, H) {
    this.reset(W, H, false);
  }

  reset(W, H, fromEdge) {
    this.x = fromEdge ? -10 : Math.random() * W;
    this.y = Math.random() * H;
    this.size = Math.random() * 1.2 + 0.5;
    this.baseOpacity = Math.random() * 0.5 + 0.35;
    this.twinklePhase = Math.random() * Math.PI * 2;
    this.twinkleSpeed = Math.random() * 0.015 + 0.005;
    this.driftX = Math.random() * 0.04 + 0.01;
  }

  update(W) {
    this.x += this.driftX;
    this.twinklePhase += this.twinkleSpeed;
    if (this.x > W + 10) this.x = -10;
  }

  draw(ctx, color) {
    const alpha = this.baseOpacity * (0.6 + Math.sin(this.twinklePhase) * 0.4);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
    ctx.fill();
  }
}

class ShootingStar {
  constructor(W, H) {
    const fromTop = Math.random() < 0.5;
    this.x = Math.random() * W * 0.6 + W * 0.2;
    this.y = fromTop ? -20 : Math.random() * H * 0.4;
    const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;
    const speed = 8 + Math.random() * 4;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1;
    this.fade = 0.012;
    this.trail = [];
  }

  update() {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 18) this.trail.shift();
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.fade;
  }

  draw(ctx, color) {
    if (this.life <= 0) return;
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const a = (i / this.trail.length) * this.life * 0.7;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${a})`;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(this.x, this.y, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${this.life})`;
    ctx.fill();
  }

  isDead(W, H) {
    return this.life <= 0 || this.x > W + 50 || this.y > H + 50;
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

const GoldenSmoke = ({ scene: sceneProp }) => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const shootingStarsRef = useRef([]);
  const rafRef = useRef(null);

  // Track theme attribute on <html> so we can re-init the canvas with light/dark palettes
  const [theme, setTheme] = useState(readThemeAttr);
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const observer = new MutationObserver(() => setTheme(readThemeAttr()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const sceneKey = resolveSceneKey(sceneProp);
    const scene = SCENES[sceneKey];
    const isLight = theme === 'light';
    const activePalette = isLight && scene.paletteLight ? scene.paletteLight : scene.palette;
    const activeBaseGrad = isLight && scene.baseGradLight ? scene.baseGradLight : scene.baseGrad;
    const activeStarColor = isLight && scene.starColorLight ? scene.starColorLight : scene.starColor;

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
      const particles = [];

      if (scene.type === 'stars') {
        for (let i = 0; i < scene.starCount; i++) particles.push(new Star(W, H));
      } else {
        for (let i = 0; i < scene.count; i++) particles.push(new Wisp(W, H, false, scene));
        for (let i = 0; i < scene.accentCount; i++) particles.push(new Wisp(W, H, true, scene));
      }

      particlesRef.current = particles;
      shootingStarsRef.current = [];
    };

    const drawBaseGrad = (W, H) => {
      if (!activeBaseGrad) return;
      const { direction, stops } = activeBaseGrad;
      const grad = direction === 'top'
        ? ctx.createLinearGradient(0, 0, 0, H * 0.75)
        : ctx.createLinearGradient(0, H, 0, H * 0.25);
      grad.addColorStop(0,    `rgba(${stops[0][0]}, ${stops[0][1]}, ${stops[0][2]}, ${stops[0][3]})`);
      grad.addColorStop(0.35, `rgba(${stops[1][0]}, ${stops[1][1]}, ${stops[1][2]}, ${stops[1][3]})`);
      grad.addColorStop(1,    `rgba(${stops[2][0]}, ${stops[2][1]}, ${stops[2][2]}, ${stops[2][3]})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    };

    let nextShootingStarAt = 0;
    const scheduleNextShootingStar = () => {
      const [min, max] = scene.shootingStarIntervalMs || [25000, 60000];
      nextShootingStarAt = performance.now() + min + Math.random() * (max - min);
    };
    if (scene.type === 'stars') scheduleNextShootingStar();

    const render = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      ctx.clearRect(0, 0, W, H);

      drawBaseGrad(W, H);

      if (scene.type === 'stars') {
        particlesRef.current.forEach(s => { s.update(W); s.draw(ctx, activeStarColor); });

        if (performance.now() >= nextShootingStarAt) {
          shootingStarsRef.current.push(new ShootingStar(W, H));
          scheduleNextShootingStar();
        }
        shootingStarsRef.current = shootingStarsRef.current.filter(s => !s.isDead(W, H));
        shootingStarsRef.current.forEach(s => { s.update(); s.draw(ctx, activeStarColor); });
      } else {
        particlesRef.current.forEach(w => { w.update(W, H); w.draw(ctx, activePalette); });
      }

      rafRef.current = requestAnimationFrame(render);
    };

    init();
    render();

    window.addEventListener('resize', init);
    return () => {
      window.removeEventListener('resize', init);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [sceneProp, theme]);

  return (
    <canvas
      ref={canvasRef}
      className="golden-smoke"
      aria-hidden="true"
    />
  );
};

export default GoldenSmoke;
