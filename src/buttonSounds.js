// UI button clicks (Web Audio, no assets).
// Recipes match public/mocks/buttons.html — rising = go, falling = back.

const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;

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

function tone(ac, { type, freq, freqEnd, start, dur, gain = 0.06 }) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (freqEnd != null && freqEnd !== freq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), start + dur);
  }
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

const SOUNDS = {
  "play-solo"(ac, t0) {
    const step = 0.045;
    tone(ac, { type: "triangle", freq: C5, start: t0, dur: step, gain: 0.1 });
    tone(ac, { type: "triangle", freq: G5, start: t0 + step, dur: step, gain: 0.1 });
  },
  "host-party"(ac, t0) {
    const step = 0.11 / 3;
    [E5, G5, C6].forEach((f, i) => {
      tone(ac, {
        type: "triangle",
        freq: f,
        start: t0 + i * step,
        dur: step * 1.1,
        gain: 0.095,
      });
    });
  },
  "play-online"(ac, t0) {
    tone(ac, {
      type: "square",
      freq: 500,
      freqEnd: 800,
      start: t0,
      dur: 0.06,
      gain: 0.05,
    });
  },
  spotify(ac, t0) {
    tone(ac, {
      type: "sine",
      freq: 420,
      freqEnd: 560,
      start: t0,
      dur: 0.08,
      gain: 0.055,
    });
  },
  skip(ac, t0) {
    tone(ac, {
      type: "sawtooth",
      freq: 400,
      freqEnd: 300,
      start: t0,
      dur: 0.045,
      gain: 0.028,
    });
  },
  guess(ac, t0) {
    tone(ac, {
      type: "triangle",
      freq: 600,
      freqEnd: 850,
      start: t0,
      dur: 0.06,
      gain: 0.075,
    });
  },
  "guess-deny"(ac, t0) {
    tone(ac, { type: "sine", freq: 180, start: t0, dur: 0.03, gain: 0.02 });
  },
  "transport-play"(ac, t0) {
    tone(ac, {
      type: "sine",
      freq: 380,
      freqEnd: 460,
      start: t0,
      dur: 0.04,
      gain: 0.05,
    });
  },
  "transport-pause"(ac, t0) {
    tone(ac, {
      type: "sine",
      freq: 460,
      freqEnd: 380,
      start: t0,
      dur: 0.04,
      gain: 0.05,
    });
  },
  "next-song"(ac, t0) {
    tone(ac, {
      type: "triangle",
      freq: 500,
      freqEnd: 750,
      start: t0,
      dur: 0.07,
      gain: 0.08,
    });
  },
  "see-results"(ac, t0) {
    tone(ac, { type: "sine", freq: 500, start: t0, dur: 0.055, gain: 0.05 });
  },
  "play-again"(ac, t0) {
    tone(ac, {
      type: "square",
      freq: 500,
      freqEnd: 800,
      start: t0,
      dur: 0.08,
      gain: 0.055,
    });
  },
  "pick-playlist"(ac, t0) {
    tone(ac, { type: "sine", freq: 480, start: t0, dur: 0.055, gain: 0.045 });
  },
  "back-home"(ac, t0) {
    tone(ac, {
      type: "sine",
      freq: 500,
      freqEnd: 350,
      start: t0,
      dur: 0.07,
      gain: 0.05,
    });
  },
  "change-playlist"(ac, t0) {
    tone(ac, {
      type: "sine",
      freq: 420,
      freqEnd: 300,
      start: t0,
      dur: 0.045,
      gain: 0.03,
    });
  },
  cancel(ac, t0) {
    tone(ac, {
      type: "triangle",
      freq: 450,
      freqEnd: 300,
      start: t0,
      dur: 0.06,
      gain: 0.05,
    });
  },
  "copy-link"(ac, t0) {
    tone(ac, { type: "sine", freq: 700, start: t0, dur: 0.025, gain: 0.045 });
    tone(ac, {
      type: "sine",
      freq: 900,
      start: t0 + 0.025,
      dur: 0.025,
      gain: 0.045,
    });
  },
  "load-more"(ac, t0) {
    tone(ac, { type: "sine", freq: 350, start: t0, dur: 0.035, gain: 0.022 });
  },
  join(ac, t0) {
    tone(ac, {
      type: "triangle",
      freq: 550,
      freqEnd: 800,
      start: t0,
      dur: 0.07,
      gain: 0.07,
    });
  },
  "start-party"(ac, t0) {
    const step = 0.12 / 3;
    [C5, E5, G5].forEach((f, i) => {
      tone(ac, {
        type: "square",
        freq: f,
        start: t0 + i * step,
        dur: step * 1.15,
        gain: 0.05,
      });
    });
  },
  "send-feedback"(ac, t0) {
    tone(ac, {
      type: "sine",
      freq: 440,
      freqEnd: 620,
      start: t0,
      dur: 0.09,
      gain: 0.05,
    });
  },
  "share-score"(ac, t0) {
    // Same warmth family as host-party, shorter
    tone(ac, {
      type: "triangle",
      freq: E5,
      freqEnd: G5,
      start: t0,
      dur: 0.09,
      gain: 0.08,
    });
  },
  debug(ac, t0) {
    const osc = ac.createOscillator();
    const osc2 = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "square";
    osc2.type = "square";
    osc.frequency.setValueAtTime(440, t0);
    osc2.frequency.setValueAtTime(446, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.028, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
    osc.connect(g);
    osc2.connect(g);
    g.connect(ac.destination);
    osc.start(t0);
    osc2.start(t0);
    osc.stop(t0 + 0.07);
    osc2.stop(t0 + 0.07);
  },
  default(ac, t0) {
    tone(ac, { type: "sine", freq: 500, start: t0, dur: 0.04, gain: 0.04 });
  },
};

export function playButtonSound(name) {
  const fn = SOUNDS[name] || SOUNDS.default;
  const ac = resume();
  if (!ac) return;
  fn(ac, ac.currentTime);
}

function labelOf(el) {
  return (el.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Map a clicked control to a sound id (or null to stay silent). */
export function resolveButtonSound(el) {
  if (!el || typeof el.closest !== "function") return null;
  const btn = el.closest(
    "button, a.btn, [role='button'].btn, .guess-transport-switch"
  );
  if (!btn) return null;

  // Don't SFX vinyl platter / theme chips / volume / plain peep swatches.
  if (btn.classList.contains("theme-btn") || btn.classList.contains("volume-btn") || btn.classList.contains("theme-mode-btn")) {
    return null;
  }
  if (btn.classList.contains("profile-peep-swatch")) return null;
  if (btn.classList.contains("user-menu-btn")) return null;
  if (btn.classList.contains("media-mode-btn")) return null;
  if (btn.classList.contains("guess-hint-link")) return null;
  if (btn.classList.contains("feedback-about-btn")) return null;

  const t = labelOf(btn);

  if (btn.classList.contains("guess-transport-switch")) {
    // Capture fires before React toggles — is-playing means about to pause.
    return btn.classList.contains("is-playing")
      ? "transport-pause"
      : "transport-play";
  }

  if (btn.disabled || btn.getAttribute("aria-disabled") === "true") {
    return btn.classList.contains("btn-guess") ? "guess-deny" : null;
  }

  if (btn.classList.contains("btn-skip")) return "skip";
  if (btn.classList.contains("btn-guess")) return "guess";
  if (btn.classList.contains("btn-multi")) {
    if (t.includes("share")) return "share-score";
    return "host-party";
  }
  if (btn.classList.contains("btn-spotify")) return "spotify";
  if (btn.classList.contains("feedback-send")) return "send-feedback";
  if (btn.classList.contains("debug-fab") || t === "debug") return "debug";
  if (btn.classList.contains("btn-ghost") || t.includes("load more")) {
    return "load-more";
  }

  if (btn.classList.contains("btn-online")) {
    if (t.includes("pick another") || t.includes("playlist")) return "pick-playlist";
    return "play-online";
  }

  if (btn.classList.contains("btn-play")) {
    if (btn.classList.contains("is-voted") || t.includes("see results")) {
      return "see-results";
    }
    if (t.includes("next song")) return "next-song";
    if (t.includes("play again")) return "play-again";
    if (t.includes("back home") || t.includes("go home")) return "back-home";
    if (t.includes("start party")) return "start-party";
    if (
      t.includes("join party") ||
      t === "join" ||
      t.includes("open lobby") ||
      t.includes("find a room")
    ) {
      return "join";
    }
    if (t.includes("play solo") || /\bsolo\b/.test(t)) return "play-solo";
    // howto / generic primary
    return "play-solo";
  }

  if (btn.classList.contains("btn-mini") || btn.classList.contains("btn")) {
    if (t.includes("copy")) return "copy-link";
    if (
      t.includes("cancel") ||
      t.includes("leave") ||
      t.includes("end party") ||
      t.includes("← leave") ||
      t.includes("← end")
    ) {
      return "cancel";
    }
    if (t.includes("change playlist") || t.startsWith("←")) {
      return "change-playlist";
    }
    if (btn.classList.contains("btn-mini")) return "change-playlist";
    if (
      btn.classList.contains("btn") &&
      !btn.classList.contains("btn-big") &&
      !btn.classList.contains("btn-play")
    ) {
      return "default";
    }
  }

  return null;
}

/** Document-level click SFX. Returns cleanup. */
export function attachButtonSounds(root = document) {
  function onPointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    const name = resolveButtonSound(e.target);
    if (!name) return;
    playButtonSound(name);
  }

  // pointerdown + capture: fires before React handlers; works for transport toggle.
  root.addEventListener("pointerdown", onPointerDown, true);
  return () => root.removeEventListener("pointerdown", onPointerDown, true);
}
