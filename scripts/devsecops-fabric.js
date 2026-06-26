// DevSecOps "Woven fabric" CTA background (Secure Cloud Engineering page).
//
// Concept: security is the fabric, not a checkpoint. A dense, sheared lattice of
// Layer 7 trapezoid marks fills the band; a single bright delivery thread weaves
// through it at speed, lighting each mark it passes near and leaving a fading
// soft-purple trail. The mesh is everywhere; delivery runs straight through it.
//
// Served as an external module (referenced with `is:inline src`) so it satisfies a
// strict `script-src 'self'` — the site ships no inline executable scripts.
// See docs/deploy.md.

const SLOPE = 16 / 29; // Layer 7 brand angle = slant of the trapezoid edge

const canvas = document.querySelector('[data-fabric]');

if (canvas) {
  const ctx = canvas.getContext('2d');

  // ── Brand tokens (read once from :root so colours stay single-sourced) ──
  const root = getComputedStyle(document.documentElement);
  const tok = (name, fallback) => root.getPropertyValue(name).trim() || fallback;
  const hexToRgb = (hex) => {
    const h = hex.replace('#', '');
    const full =
      h.length === 3
        ? h
            .split('')
            .map((c) => c + c)
            .join('')
        : h;
    const int = parseInt(full, 16);
    return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
  };
  const rgba = ({ r, g, b }, a) => `rgba(${r},${g},${b},${a})`;
  const INK = tok('--l7-dark-purple', '#140a23'); // scene background
  const BRIGHT = hexToRgb(tok('--l7-bright-purple', '#a867f7')); // mark glow / head halo
  const SOFT = hexToRgb(tok('--l7-bright-soft', '#c69bfa')); // thread trail
  const BRIGHT_CSS = `rgb(${BRIGHT.r},${BRIGHT.g},${BRIGHT.b})`;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Lattice ──
  const GX = 96; // column step
  const GY = 84; // row step
  const MARK_H = 18; // mark height (px)
  const FALLOFF = 90; // glow radius (px)
  let W = 0;
  let H = 0;
  let dpr = 1;
  let marks = [];

  const buildLattice = () => {
    marks = [];
    const cols = Math.ceil(W / GX) + 2;
    const rows = Math.ceil(H / GY) + 2;
    for (let row = -1; row <= rows; row++) {
      const shear = row * GY * SLOPE; // align rows to the brand angle
      const stagger = row % 2 === 0 ? 0 : GX / 2; // break the square grid
      for (let col = -1; col <= cols; col++) {
        marks.push({ x: col * GX + stagger - shear, y: row * GY, glow: 0 });
      }
    }
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildLattice();
  };

  // Trapezoid mark centred on (cx, cy): top-left at (x,y), height h.
  const traceMark = (cx, cy, h) => {
    const s = h / 29;
    const wTop = 47 * s;
    const x = cx - wTop / 2;
    const y = cy - h / 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + wTop, y);
    ctx.lineTo(x + 31 * s, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  };

  // ── Delivery thread ──
  const SPEED = 240; // px/s, left→right
  const TRAIL_MAX = 46;
  const head = { x: -40, y: 0 };
  let trail = [];
  let t = 0; // elapsed seconds (drives the weave)

  const weaveY = () => 0.5 * H + Math.sin(t * 1.5) * 0.26 * H + Math.sin(t * 0.6) * 0.08 * H;

  const applyGlow = (k) => {
    for (const m of marks) {
      const dx = m.x - head.x;
      const dy = m.y - head.y;
      const target = Math.exp(-(dx * dx + dy * dy) / (FALLOFF * FALLOFF));
      m.glow += (target - m.glow) * k;
    }
  };

  const update = (dt) => {
    t += dt;
    head.x += SPEED * dt;
    head.y = weaveY();
    if (head.x > W + 40) {
      head.x = -40; // recycle to the left, clearing the trail
      trail = [];
    }
    trail.push({ x: head.x, y: head.y });
    if (trail.length > TRAIL_MAX) trail.shift();
    applyGlow(Math.min(1, dt * 10));
  };

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, W, H);

    // Lattice — thin outline always; bright fill + glow where the thread is near.
    ctx.lineWidth = 1;
    for (const m of marks) {
      traceMark(m.x, m.y, MARK_H);
      if (m.glow > 0.02) {
        ctx.fillStyle = rgba(BRIGHT, 0.5 * m.glow);
        ctx.shadowColor = BRIGHT_CSS;
        ctx.shadowBlur = 16 * m.glow;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.strokeStyle = `rgba(255,255,255,${(0.05 + 0.1 * m.glow).toFixed(3)})`;
      ctx.stroke();
    }

    // Trail — width + alpha ramp 0→full toward the head.
    ctx.lineCap = 'round';
    for (let i = 1; i < trail.length; i++) {
      const p = i / (trail.length - 1); // 0 tail → 1 head
      const a = trail[i - 1];
      const b = trail[i];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineWidth = 0.5 + p * 3.5;
      ctx.strokeStyle = rgba(SOFT, p * 0.9);
      ctx.stroke();
    }

    // Head — white dot with a bright-purple halo.
    ctx.beginPath();
    ctx.arc(head.x, head.y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = BRIGHT_CSS;
    ctx.shadowBlur = 22;
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  // ── rAF loop (delta-time, clamped) ──
  let last = 0;
  let rafId = 0;
  let running = false;

  const frame = (now) => {
    if (!running) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    update(dt);
    draw();
    rafId = requestAnimationFrame(frame);
  };
  const start = () => {
    if (running) return;
    running = true;
    last = 0;
    rafId = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  };

  // Reduced motion: settle the glows around a parked thread and hold one frame.
  const staticFrame = () => {
    head.x = 0.52 * W;
    head.y = 0.5 * H;
    trail = [];
    for (let i = 0; i <= TRAIL_MAX; i++) {
      const p = i / TRAIL_MAX;
      trail.push({ x: head.x - (1 - p) * 150, y: head.y });
    }
    for (let i = 0; i < 80; i++) applyGlow(0.2);
    draw();
  };

  resize();
  head.y = 0.5 * H;

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      if (reduceMotion) staticFrame();
    }, 150);
  });

  if (reduceMotion) {
    staticFrame();
  } else if ('IntersectionObserver' in window) {
    // Pause when the band is offscreen — keeps it off the CPU/GPU budget.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) e.isIntersecting ? start() : stop();
      },
      { threshold: 0 }
    );
    io.observe(canvas);
  } else {
    start();
  }
}
