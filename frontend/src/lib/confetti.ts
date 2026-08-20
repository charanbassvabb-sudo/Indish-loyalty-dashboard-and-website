/**
 * Minimal canvas confetti burst — no external library. Spawns a fixed,
 * full-viewport canvas, animates a couple hundred particles under gravity
 * with a bit of drag and spin, then removes itself. Pass `emoji` to burst
 * text glyphs (e.g. naan bread for the Konami-code easter egg) instead of
 * rectangles.
 */

interface ConfettiOptions {
  count?: number;
  colors?: string[];
  originX?: number; // 0-1, viewport fraction
  originY?: number; // 0-1, viewport fraction
  spread?: number; // radians
  emoji?: string[];
}

const DEFAULT_COLORS = ["#4b6ee1", "#d9ad55", "#7c5cff", "#f4e6c8", "#5aa8a0"];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  size: number;
  color: string;
  glyph?: string;
  life: number;
}

export function burstConfetti(options: ConfettiOptions = {}) {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const {
    count = 160,
    colors = DEFAULT_COLORS,
    originX = 0.5,
    originY = 0.4,
    spread = Math.PI * 0.55,
    emoji,
  } = options;

  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;inset:0;z-index:9999;pointer-events:none;width:100vw;height:100vh;";
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }
  ctx.scale(dpr, dpr);

  const originPx = { x: window.innerWidth * originX, y: window.innerHeight * originY };
  const particles: Particle[] = Array.from({ length: count }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread * 2;
    const speed = 6 + Math.random() * 9;
    return {
      x: originPx.x,
      y: originPx.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
      size: emoji ? 14 + Math.random() * 10 : 5 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      glyph: emoji ? emoji[Math.floor(Math.random() * emoji.length)] : undefined,
      life: 1,
    };
  });

  const gravity = 0.32;
  const drag = 0.992;
  let running = true;
  const start = performance.now();

  function frame(now: number) {
    if (!running) return;
    const elapsed = now - start;
    ctx!.clearRect(0, 0, canvas.width, canvas.height);

    let alive = false;
    for (const p of particles) {
      p.vx *= drag;
      p.vy = p.vy * drag + gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.vr;
      p.life = Math.max(0, 1 - elapsed / 3200);
      if (p.y < window.innerHeight + 40 && p.life > 0) alive = true;

      ctx!.save();
      ctx!.globalAlpha = p.life;
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rotation);
      if (p.glyph) {
        ctx!.font = `${p.size}px serif`;
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.fillText(p.glyph, 0, 0);
      } else {
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
      }
      ctx!.restore();
    }

    if (alive && elapsed < 4000) {
      requestAnimationFrame(frame);
    } else {
      running = false;
      canvas.remove();
    }
  }

  requestAnimationFrame(frame);

  // Safety net in case the tab is backgrounded and rAF stalls.
  window.setTimeout(() => {
    running = false;
    canvas.remove();
  }, 5000);
}
