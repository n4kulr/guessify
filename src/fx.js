/** Tiny UI feedback — CSS confetti (no deps). Respects prefers-reduced-motion. */

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

function r(a, b) {
  return a + Math.random() * (b - a);
}

function pick(a) {
  return a[(Math.random() * a.length) | 0];
}

/** Theme palette from current CSS variables. */
function themeColors() {
  const cs = getComputedStyle(document.documentElement);
  const grab = (name) => cs.getPropertyValue(name).trim();
  const main = grab("--main-color") || "#e2b714";
  const text = grab("--text-color") || "#d1d0c5";
  const err = grab("--error-color") || "#ca4754";
  const sub = grab("--sub-color") || "#646669";
  const subAlt = grab("--sub-alt-color") || "#2c2e31";
  return [main, text, err, sub, main, text, err, subAlt];
}

function ensureStage() {
  let stage = document.getElementById("fx-confetti-stage");
  if (stage) return stage;
  stage = document.createElement("div");
  stage.id = "fx-confetti-stage";
  stage.className = "fx-confetti-stage";
  stage.setAttribute("aria-hidden", "true");
  document.body.appendChild(stage);
  return stage;
}

function buildPiece(colors) {
  const shell = document.createElement("div");
  const piece = document.createElement("div");
  piece.className = "fx-piece";
  const face = document.createElement("div");
  face.className = "fx-face";
  face.style.background = pick(colors);

  const kind = Math.random();
  if (kind < 0.22) {
    const s = r(7, 11);
    face.style.width = `${s}px`;
    face.style.height = `${s}px`;
    face.style.borderRadius = "50%";
  } else if (kind < 0.45) {
    face.style.width = `${r(11, 20)}px`;
    face.style.height = `${r(2.5, 4)}px`;
    face.style.borderRadius = "2px";
  } else {
    face.style.width = `${r(6, 11)}px`;
    face.style.height = `${r(8, 15)}px`;
    face.style.borderRadius = "1px";
  }

  face.style.animationDuration = `${r(0.35, 1.1)}s`;
  face.style.animationDirection = Math.random() < 0.5 ? "normal" : "reverse";
  face.style.setProperty("--rx", Math.random().toFixed(2));
  face.style.setProperty("--ry", Math.random().toFixed(2));

  piece.appendChild(face);
  shell.appendChild(piece);
  return { shell, piece };
}

function stageH(stage) {
  return stage.clientHeight || window.innerHeight;
}

/** Song correct — from below, shoot up then fall. */
function burstBelow(stage, colors, n = 110) {
  const h = stageH(stage);
  for (let i = 0; i < n; i++) {
    const p = buildPiece(colors);
    const s = p.shell;
    s.className = "fx-shell fx-burst";
    const dur = r(1.9, 3.1);
    s.style.setProperty("--dur", `${dur}s`);
    s.style.left = `${r(4, 96)}%`;
    s.style.top = "100%";
    s.style.setProperty("--dx", `${r(-80, 80)}px`);
    s.style.setProperty("--peak", `${-r(h * 0.45, h * 0.95)}px`);
    s.style.setProperty("--drop", `${-r(h * 0.05, h * 0.35)}px`);
    const delay = `${r(0, 0.18)}s`;
    s.style.animationDelay = delay;
    p.piece.style.animationDelay = delay;
    s.addEventListener("animationend", (e) => {
      if (e.animationName === "fx-fade") s.remove();
    });
    stage.appendChild(s);
  }
}

/** Game over — slow drizzle across the top. */
function drizzleTop(stage, colors, n = 90) {
  const h = stageH(stage);
  for (let i = 0; i < n; i++) {
    const p = buildPiece(colors);
    const s = p.shell;
    s.className = "fx-shell fx-fall";
    s.style.left = `${r(-2, 100)}%`;
    s.style.top = "-24px";
    s.style.setProperty("--dur", `${r(4.5, 8.5)}s`);
    s.style.setProperty("--drop", `${h + 60}px`);
    s.style.setProperty("--sway", `${r(1.8, 3.6)}s`);
    s.style.setProperty("--sx", `${r(10, 34)}px`);
    s.style.animationDelay = `${r(0, 0.9)}s`;
    p.piece.style.animationDelay = s.style.animationDelay;
    p.piece.addEventListener("animationend", () => s.remove());
    stage.appendChild(s);
  }
}

/**
 * @param {"title"|"victory"|"full"} mode
 *   title   — from below (song correct)
 *   victory — drizzle from top (game over)
 */
export function fireConfetti(mode = "title") {
  if (typeof document === "undefined" || reducedMotion()) return;

  const kind = mode === "full" ? "title" : mode;
  const stage = ensureStage();
  const colors = themeColors();

  if (kind === "victory") drizzleTop(stage, colors, 100);
  else burstBelow(stage, colors, 120);
}
