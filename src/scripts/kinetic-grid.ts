// KineticGrid: cuadrícula decorativa que se deforma hacia el puntero y ondula con cada clic.
// Port en vanilla JS del componente KineticGrid de React, con su paleta original (blanco sobre
// #161618, azul 74,158,255 al activarse), limitado a su contenedor en vez de a toda la ventana.
// Uso: un contenedor con `data-kinetic-grid` que incluya un `<canvas data-kinetic-canvas>`.
// Opciones por atributo: data-cell-size, data-influence-radius, data-max-warp, data-ripple-speed.

interface Point {
  x: number;
  y: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  born: number;
}

const OFF = -9999;
const MAX_DPR = 2;
const TAU = Math.PI * 2;
const LERP_SPEED = 0.08;
const DOT_SPACING = 28;
const NODE_BASE_RADIUS = 1.8;
const NODE_ACTIVE_RADIUS = 3.2;
const WAVE_WIDTH = 55;
type Color = { r: number; g: number; b: number; a: number };
const LINE_BASE: Color = { r: 255, g: 255, b: 255, a: 0.13 };
const LINE_ACTIVE: Color = { r: 74, g: 158, b: 255, a: 0.9 };
const NODE_BASE: Color = { r: 255, g: 255, b: 255, a: 0.2 };
const NODE_ACTIVE: Color = { r: 74, g: 158, b: 255, a: 1 };
const GLOW = "74,158,255";
const RIPPLE = "100,180,255";
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerpColor = (base: Color, active: Color, t: number) =>
  `rgba(${Math.round(lerp(base.r, active.r, t))},${Math.round(lerp(base.g, active.g, t))},${Math.round(lerp(base.b, active.b, t))},${lerp(base.a, active.a, t).toFixed(3)})`;
const num = (el: HTMLElement, key: string, fallback: number): number => {
  const value = Number(el.dataset[key]);
  return el.dataset[key] !== undefined && Number.isFinite(value) ? value : fallback;
};

function initKineticGrid(host: HTMLElement): void {
  const canvas = host.querySelector<HTMLCanvasElement>("canvas[data-kinetic-canvas]");
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;

  const cellSize = num(host, "cellSize", 56);
  const influence = num(host, "influenceRadius", 260);
  const maxWarp = num(host, "maxWarp", 24);
  const rippleSpeed = num(host, "rippleSpeed", 400);

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mouse: Point = { x: OFF, y: OFF };
  const target: Point = { x: OFF, y: OFF };
  let ripples: Ripple[] = [];
  let width = 0;
  let height = 0;
  let raf = 0;
  let visible = true;

  // Desplazamiento de un nodo por el puntero y por las ondas; los bordes quedan fijos.
  const warp = (gx: number, gy: number, col: number, row: number, cols: number, rows: number) => {
    const edge = 1.5;
    const colPin = Math.min(col / edge, (cols - 1 - col) / edge, 1);
    const rowPin = Math.min(row / edge, (rows - 1 - row) / edge, 1);
    const pin = colPin * colPin * rowPin * rowPin;

    const dx = gx - mouse.x;
    const dy = gy - mouse.y;
    const dist = Math.hypot(dx, dy);
    const proximity = Math.max(0, 1 - dist / influence) * pin;

    let rx = 0;
    let ry = 0;
    for (const r of ripples) {
      const rdx = gx - r.x;
      const rdy = gy - r.y;
      const diff = Math.hypot(rdx, rdy) - r.radius;
      if (Math.abs(diff) >= WAVE_WIDTH) continue;
      const strength = (1 - Math.abs(diff) / WAVE_WIDTH) * r.opacity * 18 * pin;
      const angle = Math.atan2(rdy, rdx);
      const sign = diff < 0 ? 1 : -1;
      rx += Math.cos(angle) * strength * sign;
      ry += Math.sin(angle) * strength * sign;
    }

    if (dist < influence && dist > 0 && pin > 0) {
      const t = dist / influence;
      const eased = (1 - t) * (1 - t) * Math.min(1, dist / 60);
      const amount = eased * maxWarp * pin;
      const angle = Math.atan2(dy, dx);
      return { x: gx - Math.cos(angle) * amount + rx, y: gy - Math.sin(angle) * amount + ry, proximity };
    }
    return { x: gx + rx, y: gy + ry, proximity };
  };

  const draw = (now: number) => {
    ctx.clearRect(0, 0, width, height);

    // Textura estática de puntos de fondo.
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let x = DOT_SPACING / 2; x < width; x += DOT_SPACING) {
      for (let y = DOT_SPACING / 2; y < height; y += DOT_SPACING) {
        ctx.beginPath();
        ctx.arc(x, y, 0.7, 0, TAU);
        ctx.fill();
      }
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i]!;
      const age = (now - r.born) / 1000;
      r.radius = Math.max(0, age * rippleSpeed);
      r.opacity = Math.max(0, 1 - age * 1.2);
      if (r.opacity <= 0) ripples.splice(i, 1);
    }

    const cols = Math.max(2, Math.ceil(width / cellSize)) + 1;
    const rows = Math.max(2, Math.ceil(height / cellSize)) + 1;
    const cellW = width / (cols - 1);
    const cellH = height / (rows - 1);

    const pts: Array<Array<ReturnType<typeof warp>>> = [];
    for (let row = 0; row < rows; row++) {
      const line: Array<ReturnType<typeof warp>> = [];
      for (let col = 0; col < cols; col++) line.push(warp(col * cellW, row * cellH, col, row, cols, rows));
      pts.push(line);
    }

    const seg = (a: ReturnType<typeof warp>, b: ReturnType<typeof warp>) => {
      const t = smooth((a.proximity + b.proximity) / 2);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = lerpColor(LINE_BASE, LINE_ACTIVE, t);
      ctx.lineWidth = lerp(0.8, 1.5, t);
      ctx.stroke();
    };
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols - 1; col++) seg(pts[row]![col]!, pts[row]![col + 1]!);
    for (let col = 0; col < cols; col++) for (let row = 0; row < rows - 1; row++) seg(pts[row]![col]!, pts[row + 1]![col]!);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const p = pts[row]![col]!;
        const t = smooth(p.proximity);
        const radius = lerp(NODE_BASE_RADIUS, NODE_ACTIVE_RADIUS, t);
        if (t > 0.3) {
          const glow = radius + lerp(0, 6, (t - 0.3) / 0.7);
          const gradient = ctx.createRadialGradient(p.x, p.y, radius * 0.5, p.x, p.y, glow);
          gradient.addColorStop(0, `rgba(${GLOW},${(t * 0.3).toFixed(3)})`);
          gradient.addColorStop(1, `rgba(${GLOW},0)`);
          ctx.beginPath();
          ctx.arc(p.x, p.y, glow, 0, TAU);
          ctx.fillStyle = gradient;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, TAU);
        ctx.fillStyle = lerpColor(NODE_BASE, NODE_ACTIVE, t);
        ctx.fill();
      }
    }

    for (const r of ripples) {
      ctx.beginPath();
      ctx.arc(r.x, r.y, Math.max(0, r.radius), 0, TAU);
      ctx.strokeStyle = `rgba(${RIPPLE},${(r.opacity * 0.28).toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  };

  const tick = (now: number) => {
    raf = 0;
    if (!visible || document.hidden) return;
    mouse.x = lerp(mouse.x, target.x, LERP_SPEED);
    mouse.y = lerp(mouse.y, target.y, LERP_SPEED);
    draw(now);
    // Se duerme cuando el puntero ya salió y no quedan ondas vivas.
    if (ripples.length > 0 || target.x !== OFF || mouse.x > OFF / 2) raf = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (!raf && !reduceMotion.matches) raf = requestAnimationFrame(tick);
  };

  const resize = () => {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(performance.now());
  };

  host.addEventListener("pointermove", (e) => {
    if (reduceMotion.matches) return;
    const rect = host.getBoundingClientRect();
    target.x = e.clientX - rect.left;
    target.y = e.clientY - rect.top;
    if (mouse.x === OFF) {
      mouse.x = target.x;
      mouse.y = target.y;
    }
    wake();
  });
  host.addEventListener("pointerleave", () => {
    target.x = OFF;
    target.y = OFF;
    wake();
  });
  host.addEventListener("click", (e) => {
    if (reduceMotion.matches) return;
    const rect = host.getBoundingClientRect();
    ripples.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, radius: 0, opacity: 1, born: performance.now() });
    wake();
  });
  document.addEventListener("visibilitychange", () => !document.hidden && wake());
  reduceMotion.addEventListener("change", () => {
    ripples = [];
    wake();
    resize();
  });

  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(
    ([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) wake();
    },
    { threshold: 0 },
  ).observe(host);

  resize();
}

document.querySelectorAll<HTMLElement>("[data-kinetic-grid]").forEach(initKineticGrid);

export {};
