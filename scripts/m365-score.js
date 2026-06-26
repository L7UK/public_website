// Microsoft 365 "Secure Score" CTA background (Cloud Security Assessment page).
//
// Concept: an abstract gauge that fills to a posture score and settles — a 270°
// bright-purple arc with a glowing leading edge, ringed by Layer 7 trapezoid tick
// marks, the brand mark at its centre. Reads instantly as Microsoft Secure Score,
// the number clients already recognise. Never a round 100%: a real posture score
// with headroom (~71%), breathing gently.
//
// Served as an external module (referenced with `is:inline src`) so it satisfies a
// strict `script-src 'self'` — the site ships no inline executable scripts. The
// site uses no client framework, so this is plain DOM/canvas, not React.
// See docs/deploy.md.

const SLOPE = 16 / 29; // Layer 7 brand angle = slant of the trapezoid edge

const canvas = document.querySelector('[data-score]');

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
  const BRIGHT = hexToRgb(tok('--l7-bright-purple', '#a867f7')); // arc fill / lit ticks
  const SOFT = hexToRgb(tok('--l7-bright-soft', '#c69bfa')); // glow
  const BRIGHT_CSS = `rgb(${BRIGHT.r},${BRIGHT.g},${BRIGHT.b})`;
  const SOFT_CSS = `rgb(${SOFT.r},${SOFT.g},${SOFT.b})`;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Gauge geometry ──
  const A0 = 0.75 * Math.PI; // start angle (lower-left)
  const SWEEP = 1.5 * Math.PI; // 270°, clockwise — open gap at the bottom
  const LINE = 11; // arc stroke width
  const TICKS = 12; // trapezoid tick marks around the arc
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

  let W = 0;
  let H = 0;
  let dpr = 1;
  let cx = 0;
  let cy = 0;
  let R = 168;

  let p = 0; // current score (0..1), eases toward target
  let t = 0; // elapsed seconds (drives the gentle breathing)

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = 0.71 * W; // text sits to the left of the gauge
    cy = 0.52 * H;
    R = Math.max(72, Math.min(126, H * 0.32));
  };

  // Layer 7 trapezoid centred on the current origin, height h. Draw after any
  // translate/rotate. Geometry from the brand mark "M0 0 L47 0 L31 29 L0 29 Z".
  const traceCenteredTrap = (h) => {
    const s = h / 29;
    ctx.beginPath();
    ctx.moveTo(-23.5 * s, -14.5 * s);
    ctx.lineTo(23.5 * s, -14.5 * s);
    ctx.lineTo(7.5 * s, 14.5 * s);
    ctx.lineTo(-23.5 * s, 14.5 * s);
    ctx.closePath();
  };

  const update = (dt) => {
    t += dt;
    const target = 0.71 + Math.sin(t * 0.7) * 0.012; // headroom, breathing
    p += (target - p) * clamp01(dt * 1.8);
  };

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, W, H);

    // Faint diagonal brand rules on the right third, well behind the gauge.
    ctx.lineWidth = 1;
    const x0 = 0.6 * W;
    for (let x = x0; x <= W + H * SLOPE; x += 46) {
      const frac = clamp01((x - x0) / (W - x0));
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - H * SLOPE, H);
      ctx.strokeStyle = `rgba(255,255,255,${(0.012 + frac * 0.078).toFixed(3)})`;
      ctx.stroke();
    }

    // Track — full arc, unfilled.
    ctx.lineCap = 'round';
    ctx.lineWidth = LINE;
    ctx.beginPath();
    ctx.arc(cx, cy, R, A0, A0 + SWEEP);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.stroke();

    // Fill — arc from start to the score, bright purple with a soft glow.
    ctx.beginPath();
    ctx.arc(cx, cy, R, A0, A0 + SWEEP * p);
    ctx.strokeStyle = BRIGHT_CSS;
    ctx.shadowColor = SOFT_CSS;
    ctx.shadowBlur = 20;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Tick marks — trapezoids just outside the arc, tangent to it.
    for (let i = 0; i < TICKS; i++) {
      const frac = i / (TICKS - 1);
      const ang = A0 + SWEEP * frac;
      const passed = frac <= p;
      ctx.save();
      ctx.translate(cx + Math.cos(ang) * (R + 24), cy + Math.sin(ang) * (R + 24));
      ctx.rotate(ang + Math.PI / 2);
      traceCenteredTrap(9);
      if (passed) {
        ctx.fillStyle = BRIGHT_CSS;
        ctx.shadowColor = BRIGHT_CSS;
        ctx.shadowBlur = 8;
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Centre — the brand trapezoid, faint fill + soft outline.
    ctx.save();
    ctx.translate(cx, cy);
    traceCenteredTrap(32);
    ctx.fillStyle = 'rgba(168,103,247,0.10)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = SOFT_CSS;
    ctx.stroke();
    ctx.restore();

    // Leading dot — the live read-head sitting on the arc end.
    const end = A0 + SWEEP * p;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(end) * R, cy + Math.sin(end) * R, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = BRIGHT_CSS;
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  // Warm the scene so the first painted frame is an already-developed gauge —
  // never an empty track, and robust if rAF is delayed (offscreen, capture, PDF).
  const warmUp = () => {
    for (let i = 0; i < 140; i++) update(1 / 60);
    draw();
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
    if (running || reduceMotion) return;
    running = true;
    last = 0;
    rafId = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  };

  resize();
  warmUp();

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      warmUp();
    }, 150);
  });

  if (reduceMotion) {
    // Static, fully-developed gauge — also what print/PDF capture.
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
