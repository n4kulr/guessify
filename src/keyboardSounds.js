// Soft mechanical key clicks (Web Audio, no assets).
// Same sound everywhere you type: invite code, guesses, nickname, feedback, charts…

let ctx = null;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

function resume() {
  const c = ensure();
  if (c?.state === "suspended") c.resume().catch(() => {});
  return c;
}

function noiseBurst({ dur, gain, freq, Q = 1.2 }) {
  const c = resume();
  if (!c) return;
  const now = c.currentTime;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const env = 1 - i / len;
    data[i] = (Math.random() * 2 - 1) * env * env;
  }

  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = Q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(c.destination);
  src.start(now);
  src.stop(now + dur + 0.01);
}

function tick({ freq, dur, gain, type = "square" }) {
  const c = resume();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

/** One mechanical keypress. Slightly random so rapid typing doesn't drone. */
export function playKeyClick(kind = "type") {
  const jitter = () => 0.88 + Math.random() * 0.28;

  if (kind === "backspace") {
    noiseBurst({ dur: 0.028, gain: 0.045 * jitter(), freq: 900 * jitter(), Q: 0.9 });
    tick({ freq: 140 * jitter(), dur: 0.035, gain: 0.028, type: "triangle" });
    return;
  }

  if (kind === "enter") {
    noiseBurst({ dur: 0.04, gain: 0.055, freq: 700, Q: 1.1 });
    tick({ freq: 190, dur: 0.05, gain: 0.035, type: "square" });
    setTimeout(() => tick({ freq: 150, dur: 0.04, gain: 0.022, type: "triangle" }), 35);
    return;
  }

  // Normal character — short “clack” + tiny tonal body
  noiseBurst({
    dur: 0.022,
    gain: 0.05 * jitter(),
    freq: 2200 * jitter(),
    Q: 1.6,
  });
  noiseBurst({
    dur: 0.035,
    gain: 0.028 * jitter(),
    freq: 480 * jitter(),
    Q: 0.7,
  });
  tick({
    freq: 210 * jitter(),
    dur: 0.028,
    gain: 0.018,
    type: "triangle",
  });
}

const SKIP_KEYS = new Set([
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "Tab",
  "Escape",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "CapsLock",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "Insert",
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
  "F6",
  "F7",
  "F8",
  "F9",
  "F10",
  "F11",
  "F12",
]);

const SKIP_INPUT_TYPES = new Set([
  "checkbox",
  "radio",
  "range",
  "button",
  "submit",
  "reset",
  "file",
  "color",
  "hidden",
  "image",
]);

function isTypingField(t) {
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable) return true;
  const tag = t.tagName;
  if (tag === "TEXTAREA") return true;
  if (tag !== "INPUT") return false;
  const type = (t.getAttribute("type") || "text").toLowerCase();
  return !SKIP_INPUT_TYPES.has(type);
}

/**
 * Attach once — same click SFX on every text field (invite code, guesses,
 * nickname, feedback, chart search, …).
 * Prefers `beforeinput` (mobile / IME friendly); keydown is the fallback.
 * Returns cleanup.
 */
export function attachKeyboardSounds(root = document) {
  // beforeinput + keydown can both fire for one keystroke — play once.
  let handledByBeforeInput = false;

  function onBeforeInput(e) {
    if (!isTypingField(e.target)) return;
    const it = e.inputType || "";
    if (!it) return;

    if (it.startsWith("delete")) {
      playKeyClick("backspace");
      handledByBeforeInput = true;
    } else if (it === "insertLineBreak" || it === "insertParagraph") {
      playKeyClick("enter");
      handledByBeforeInput = true;
    } else if (it.startsWith("insert")) {
      // insertText, insertFromPaste, insertCompositionText, …
      playKeyClick("type");
      handledByBeforeInput = true;
    } else {
      return;
    }
    queueMicrotask(() => {
      handledByBeforeInput = false;
    });
  }

  function onKeyDown(e) {
    if (handledByBeforeInput) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (SKIP_KEYS.has(e.key)) return;
    if (!isTypingField(e.target)) return;

    if (e.key === "Backspace" || e.key === "Delete") {
      playKeyClick("backspace");
      return;
    }
    if (e.key === "Enter") {
      playKeyClick("enter");
      return;
    }
    if (e.key === "Process" || e.key === "Dead") return;
    if (e.key.length === 1) playKeyClick("type");
  }

  // Capture so nested stopPropagation on bubble can't mute typing SFX.
  root.addEventListener("beforeinput", onBeforeInput, true);
  root.addEventListener("keydown", onKeyDown, true);
  return () => {
    root.removeEventListener("beforeinput", onBeforeInput, true);
    root.removeEventListener("keydown", onKeyDown, true);
  };
}
