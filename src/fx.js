/** Tiny UI feedback — no deps. Respects prefers-reduced-motion. */

function reducedMotion() {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

/** Brief horizontal shake on an element (add `.is-shaking` in CSS). */
export function shakeEl(el) {
  if (!el || reducedMotion()) return;
  el.classList.remove("is-shaking");
  void el.offsetWidth;
  el.classList.add("is-shaking");
  const done = () => {
    el.classList.remove("is-shaking");
    el.removeEventListener("animationend", done);
  };
  el.addEventListener("animationend", done);
}

/**
 * Confetti from both side edges.
 * @param {"full"|"light"} power — title win vs artist-only
 */
export function fireConfetti(power = "full") {
  if (typeof document === "undefined" || reducedMotion()) return;

  const count = power === "full" ? 72 : 26;
  const canvas = document.createElement("canvas");
  canvas.className = "fx-confetti";
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "9999",
  });
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0;
  let h = 0;
  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();

  const colors = [
    getComputedStyle(document.documentElement).getPropertyValue("--main-color").trim() || "#e2b714",
    "#fff",
    "#f7768e",
    "#7aa2f7",
    "#9ece6a",
    "#bb9af7",
  ];

  const parts = [];
  for (let i = 0; i < count; i++) {
    const fromLeft = i % 2 === 0;
    parts.push({
      x: fromLeft ? -8 : w + 8,
      y: h * (0.15 + Math.random() * 0.55),
      vx: (fromLeft ? 1 : -1) * (3 + Math.random() * 7),
      vy: -2 - Math.random() * 6,
      g: 0.12 + Math.random() * 0.1,
      r: 3 + Math.random() * 4,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: colors[i % colors.length],
      life: 1,
    });
  }

  const start = performance.now();
  const dur = power === "full" ? 2200 : 1400;

  function frame(now) {
    const t = now - start;
    if (t > dur) {
      canvas.remove();
      return;
    }
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life = 1 - t / dur;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8);
      ctx.restore();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
