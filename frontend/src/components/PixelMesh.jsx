import React, { useEffect, useRef } from 'react';

const CELL = 6;
const GAP = 2;
const STEP = CELL + GAP;
const GREENS = ['#2f7a3e', '#3f9a4f', '#5cb56b', '#8fd39a'];
const RADIUS = 110;
const WAVE_SPEED = 9;
const WAVE_WIDTH = 46;
const WAVE_LIFE = 1100;

const seeded = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const setupCanvas = (canvas, w, h) => {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
};

const gradientWeight = (rnd, x, y, cols, rows) => {
  const t = y / rows;
  const density = Math.pow(1 - t, 2.2) * 0.5 + 0.012;
  const checker = (x + y) % 2 === 0;
  if (rnd() > density * (checker ? 1 : 0.55)) return null;
  return { alpha: 0.22 + (1 - t) * 0.42, shade: Math.min(GREENS.length - 1, Math.floor(rnd() * GREENS.length * (0.6 + t))) };
};

const radialWeight = (rnd, x, y, cols, rows) => {
  if (rnd() > 0.96) return null;
  const dx = (x / cols - 0.5) * 2;
  const dy = (y / rows - 0.5) * 2;
  const fade = Math.max(0, 1 - Math.pow(Math.sqrt(dx * dx + dy * dy), 3.2));
  if (fade <= 0.02) return null;
  return { alpha: (0.78 + rnd() * 0.22) * fade, shade: Math.floor(rnd() * GREENS.length) };
};

const buildParticles = (w, h, dense) => {
  const rnd = seeded(dense ? 2026 : 1907);
  const weight = dense ? radialWeight : gradientWeight;
  const cols = Math.ceil(w / STEP);
  const rows = Math.ceil(h / STEP);
  const list = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const res = weight(rnd, x, y, cols, rows);
      if (!res) continue;
      list.push({ ox: x * STEP, oy: y * STEP, px: x * STEP, py: y * STEP, vx: 0, vy: 0, color: GREENS[res.shade], alpha: res.alpha });
    }
  }
  return list;
};

const useRippleMesh = (ref, dense) => {
  useEffect(() => {
    const canvas = ref.current;
    const target = dense ? canvas.parentElement : null;
    let ctx, particles = [], w = 0, h = 0;
    const mouse = { x: -9999, y: -9999 };
    let waves = [];

    const rebuild = () => {
      w = target ? target.clientWidth : window.innerWidth;
      h = target ? target.clientHeight : window.innerHeight;
      ctx = setupCanvas(canvas, w, h);
      particles = buildParticles(w, h, dense);
    };
    rebuild();

    const toLocal = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e) => { const p = toLocal(e); mouse.x = p.x; mouse.y = p.y; };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    const onClick = (e) => {
      const p = toLocal(e);
      if (p.x < 0 || p.y < 0 || p.x > w || p.y > h) return;
      waves.push({ x: p.x, y: p.y, t0: performance.now() });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseout', onLeave);
    window.addEventListener('mousedown', onClick);
    const ro = target ? new ResizeObserver(rebuild) : null;
    if (ro) ro.observe(target); else window.addEventListener('resize', rebuild);

    let raf;
    const tick = () => {
      const now = performance.now();
      waves = waves.filter((wv) => now - wv.t0 < WAVE_LIFE);
      const rings = waves.map((wv) => {
        const age = now - wv.t0;
        return { x: wv.x, y: wv.y, r: age * WAVE_SPEED / 16.7, k: (1 - age / WAVE_LIFE) * 6 };
      });
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        const dx = p.px - mouse.x, dy = p.py - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < RADIUS) {
          const f = (1 - dist / RADIUS) * 3.2;
          p.vx += (dx / dist) * f; p.vy += (dy / dist) * f;
        }
        for (const rg of rings) {
          const rx = p.px - rg.x, ry = p.py - rg.y;
          const rd = Math.sqrt(rx * rx + ry * ry) || 1;
          const band = Math.abs(rd - rg.r);
          if (band < WAVE_WIDTH) {
            const f = (1 - band / WAVE_WIDTH) * rg.k;
            p.vx += (rx / rd) * f; p.vy += (ry / rd) * f;
          }
        }
        p.vx += (p.ox - p.px) * 0.06; p.vy += (p.oy - p.py) * 0.06;
        p.vx *= 0.82; p.vy *= 0.82;
        p.px += p.vx; p.py += p.vy;
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.px), Math.round(p.py), CELL, CELL);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect(); else window.removeEventListener('resize', rebuild);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseout', onLeave);
      window.removeEventListener('mousedown', onClick);
    };
  }, [ref, dense]);
};

export const PixelMesh = ({ dense = false, className = 'pixel-mesh', testId = 'pixel-mesh-bg' }) => {
  const ref = useRef(null);
  useRippleMesh(ref, dense);
  return <canvas ref={ref} data-testid={testId} aria-hidden="true" className={className} />;
};

export default PixelMesh;
