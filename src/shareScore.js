import { formatSolveSec } from "./gameStats.js";
import { getThemePalette } from "./themes.js";

/**
 * Share cards + copy for a whole game (Wrapped-style) and for a single round,
 * plus native share / download. Rendering is kept separate from sharing so the
 * preview dialog can show the exact image first.
 * Links guessify.uk so OG art rides along when text is posted.
 */

const SHARE_URL = "https://guessify.uk";
const FONT = '"Lexend Deca", system-ui, -apple-system, sans-serif';

export function scoreSharePayload({
  mode = "solo",
  score = 0,
  maxScore = 0,
  place = 0,
  name = "",
} = {}) {
  if (mode === "solo") {
    return {
      title: "guessify",
      text: `I scored ${score}/${maxScore} on guessify — name that song!\n${SHARE_URL}`,
    };
  }
  if (mode === "online") {
    return {
      title: "guessify",
      text: `Finished #${place} with ${score} pts on guessify — name that song!\n${SHARE_URL}`,
    };
  }
  const who = name ? ` as ${name}` : "";
  return {
    title: "guessify",
    text: `Just wrapped a guessify party${who} — ${score} pts\n${SHARE_URL}`,
  };
}

/** One revealed round, as text. Missed rounds share the answer, not a time. */
export function roundSharePayload({
  title = "",
  artist = "",
  wallMs = null,
  unlockedSec = 0,
} = {}) {
  const song = artist ? `"${title}" — ${artist}` : `"${title}"`;
  const solved = formatSolveSec(wallMs);
  const text =
    solved === "—"
      ? `Couldn't name ${song} on guessify — can you?\n${SHARE_URL}`
      : `Named ${song} in ${solved} off ${unlockedSec}s of audio on guessify\n${SHARE_URL}`;
  return { title: "guessify", text };
}

function grabTheme() {
  const t = getThemePalette();
  return {
    bg: t.bg,
    main: t.main,
    sub: t.sub,
    subAlt: t.subAlt,
    text: t.text,
  };
}

// ---------------------------------------------------------------------------
// Small drawing helpers
// ---------------------------------------------------------------------------

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Set fill colour + font + letter spacing in one call, so the section code below
// stays readable. `spacing` is a number of pixels (0 for normal text).
function setType(ctx, weight, size, color, spacing) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.letterSpacing = `${spacing || 0}px`;
}

// Format a whole number with thousands separators, e.g. 2140 -> "2,140".
function commas(n) {
  return Number(n).toLocaleString("en-US");
}

// A faint concentric-groove disc — the "record" motif for the record-shop theme.
function drawVinyl(ctx, cx, cy, rMin, rMax, rings, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  const step = (rMax - rMin) / rings;
  let r = rMin;
  while (r <= rMax) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    r = r + step;
  }
  // Centre label of the record.
  ctx.globalAlpha = alpha * 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, rMin * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A hairline divider drawn faintly so sections read as separate bands.
function divider(ctx, x, w, y, color) {
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, 2);
  ctx.restore();
}

/** Trim a line until it plus an ellipsis fits maxW. */
function ellipsise(line, maxW, measure) {
  let s = line;
  while (s.length > 1 && measure(`${s}…`) > maxW) {
    s = s.slice(0, -1);
  }
  return `${s.trimEnd()}…`;
}

/**
 * Greedy word wrap for canvas text, capped at maxLines with the last line
 * ellipsised. `measure` is injected so this stays testable without a DOM.
 * Set the font on the context before calling.
 */
export function wrapLines(text, maxW, maxLines, measure) {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return [];

  const all = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next) > maxW) {
      all.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  all.push(line);

  if (all.length <= maxLines) {
    // A single word wider than maxW is the only way a line still overflows.
    return all.map((l) => (measure(l) <= maxW ? l : ellipsise(l, maxW, measure)));
  }
  const kept = all.slice(0, maxLines);
  kept[maxLines - 1] = ellipsise(kept[maxLines - 1], maxW, measure);
  return kept;
}

// ---------------------------------------------------------------------------
// Shared card chrome — both the wrap card and the round card are built on this
// so they read as the same object. Header coords are top-anchored and so are
// height-independent; the footer is measured back from the bottom edge.
// ---------------------------------------------------------------------------

const CARD_W = 1080;
const CARD_M = 100; // page margin — everything hangs off this left edge

function newCard(h) {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = h;
  return canvas;
}

function drawCardChrome(ctx, { h, c, subtitle, playlistName }) {
  const W = CARD_W;
  const M = CARD_M;
  const contentW = W - M * 2;

  // --- Background: vertical gradient + two soft warm blobs ------------------
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, c.subAlt);
  grad.addColorStop(0.45, c.bg);
  grad.addColorStop(1, c.subAlt);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, h);

  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.arc(W * 0.95, h * 0.08, 460, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Vinyl record bleeding off the bottom-right — the signature graphic.
  drawVinyl(ctx, W * 0.9, h * 0.92, 70, 430, 14, c.main, 0.05);

  // --- Header: wordmark + accent underline, subtitle, playlist pill ---------
  setType(ctx, 700, 68, c.main, 0);
  ctx.fillText("guessify", M, 175);
  const wordW = ctx.measureText("guessify").width;
  ctx.fillStyle = c.main;
  roundRect(ctx, M, 198, wordW, 8, 4);
  ctx.fill();

  setType(ctx, 600, 34, c.sub, 0);
  ctx.fillText(subtitle, M, 262);

  if (playlistName) {
    let pl = playlistName;
    if (pl.length > 28) {
      pl = `${pl.slice(0, 26)}…`;
    }
    setType(ctx, 500, 30, c.text, 0);
    const textW = ctx.measureText(pl).width;
    const pillH = 60;
    const pillW = textW + 56 + 40; // text + side padding + room for the dot
    const pillX = W - M - pillW;
    const pillY = 128;
    ctx.fillStyle = c.subAlt;
    roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.fillStyle = c.main;
    ctx.beginPath();
    ctx.arc(pillX + 34, pillY + pillH / 2, 9, 0, Math.PI * 2);
    ctx.fill();
    setType(ctx, 500, 30, c.text, 0);
    ctx.fillText(pl, pillX + 62, pillY + 40);
  }

  divider(ctx, M, contentW, 320, c.sub);
  return contentW;
}

function drawCardFooter(ctx, { h, c }) {
  const W = CARD_W;
  const M = CARD_M;
  divider(ctx, M, W - M * 2, h - 120, c.sub);

  const footY = h - 52;
  setType(ctx, 700, 44, c.main, 0);
  ctx.fillText("guessify.uk", M, footY);

  setType(ctx, 500, 30, c.sub, 0);
  const tag = "name that song";
  const tagW = ctx.measureText(tag).width;
  ctx.fillText(tag, W - M - tagW, footY);

  ctx.letterSpacing = "0px"; // leave the context clean
}

// ---------------------------------------------------------------------------
// Replay data prep — bar length is speed RELATIVE to the player's own fastest
// win, so a full bar always means "your best round" and shorter bars read as
// "slower than that". Self-normalising: no magic round-length constant needed.
// ---------------------------------------------------------------------------

function prepReplayRows(timeline) {
  const rows = (Array.isArray(timeline) ? timeline : []).slice(0, 5);

  // Find the fastest winning wall time in the set.
  let fastestWon = Infinity;
  for (const row of rows) {
    if (row.won && row.wallMs > 0 && row.wallMs < fastestWon) {
      fastestWon = row.wallMs;
    }
  }

  return rows.map((row) => {
    let frac = 0;
    let isFastest = false;
    if (row.won && row.wallMs > 0 && fastestWon !== Infinity) {
      frac = fastestWon / row.wallMs; // 1.0 for the best round, less for slower ones
      if (frac > 1) {
        frac = 1;
      }
      if (frac < 0.06) {
        frac = 0.06; // keep a sliver visible even for very slow wins
      }
      if (row.wallMs === fastestWon) {
        isFastest = true;
      }
    }
    return {
      round: row.round,
      won: row.won,
      wallMs: row.wallMs,
      frac,
      isFastest,
    };
  });
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------

/**
 * Spotify Wrapped–style story card (1080×1920).
 * @returns {HTMLCanvasElement}
 */
export function renderShareCard(opts = {}) {
  const {
    mode = "solo",
    score = 0,
    maxScore = 0,
    place = 0,
    name = "",
    accuracy = null,
    fastestMs = null,
    bestStreak = null,
    artistsClaimed = null,
    artistsTotal = null,
    playlistName = "",
    timeline = [],
  } = opts;

  const W = CARD_W;
  const H = 1920;
  const M = CARD_M;

  const canvas = newCard(H);
  const ctx = canvas.getContext("2d");
  const c = grabTheme();

  let subtitle = "solo wrap";
  if (mode === "online") {
    if (place) {
      subtitle = `#${place} online`;
    } else {
      subtitle = "online race";
    }
  }
  if (mode === "party") {
    if (name) {
      subtitle = `party · ${name}`;
    } else {
      subtitle = "party wrap";
    }
  }

  const contentW = drawCardChrome(ctx, { h: H, c, subtitle, playlistName });

  // --- Hero score ----------------------------------------------------------
  setType(ctx, 600, 30, c.main, 3);
  ctx.fillText("YOUR SCORE", M, 440);

  setType(ctx, 800, 260, c.text, 0);
  ctx.fillText(commas(score), M, 700);

  setType(ctx, 600, 42, c.sub, 0);
  if (maxScore) {
    ctx.fillText(`of ${commas(maxScore)} pts`, M, 762);
  } else {
    ctx.fillText("pts", M, 762);
  }

  divider(ctx, M, contentW, 820, c.sub);

  // --- Stat chips (2×2) ----------------------------------------------------
  const chips = [];
  if (accuracy != null) {
    chips.push({ k: "accuracy", v: `${Math.round(accuracy * 100)}%` });
  }
  if (fastestMs != null) {
    chips.push({ k: "fastest", v: formatSolveSec(fastestMs) });
  }
  if (bestStreak != null) {
    chips.push({ k: "streak", v: String(bestStreak) });
  }
  if (artistsClaimed != null && artistsTotal != null) {
    chips.push({ k: "artists", v: `${artistsClaimed}/${artistsTotal}` });
  }

  const chipGap = 24;
  const chipW = (contentW - chipGap) / 2;
  const chipH = 150;
  const chipY = 900;
  chips.slice(0, 4).forEach((chip, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = M + col * (chipW + chipGap);
    const y = chipY + row * (chipH + chipGap);

    ctx.fillStyle = c.subAlt;
    roundRect(ctx, x, y, chipW, chipH, 24);
    ctx.fill();

    // accent tick — the little mark that anchors the chip
    ctx.fillStyle = c.main;
    roundRect(ctx, x + 40, y + 36, 44, 6, 3);
    ctx.fill();

    setType(ctx, 600, 26, c.sub, 2);
    ctx.fillText(chip.k.toUpperCase(), x + 40, y + 86);

    setType(ctx, 700, 54, c.text, 0);
    ctx.fillText(chip.v, x + 40, y + 132);
  });

  divider(ctx, M, contentW, 1280, c.sub);

  // --- Mini replay ---------------------------------------------------------
  const rows = prepReplayRows(timeline);
  if (rows.length) {
    setType(ctx, 600, 30, c.main, 3);
    ctx.fillText("REPLAY", M, 1350);

    setType(ctx, 500, 26, c.sub, 0);
    const note = "bar = speed vs your best";
    const noteW = ctx.measureText(note).width;
    ctx.fillText(note, W - M - noteW, 1350);

    const trackX = M + 150;
    const trackRight = W - M - 170;
    const trackW = trackRight - trackX;
    const rowTop0 = 1400;
    const rowH = 74;

    rows.forEach((row, i) => {
      const top = rowTop0 + i * rowH;
      const mid = top + 11; // track is 22px tall

      // win / miss indicator dot
      if (row.won) {
        ctx.fillStyle = c.main;
        ctx.beginPath();
        ctx.arc(M + 8, mid, 8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = c.sub;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(M + 8, mid, 7, 0, Math.PI * 2);
        ctx.stroke();
      }

      setType(ctx, 500, 30, c.sub, 0);
      ctx.fillText(`R${row.round}`, M + 34, mid + 10);

      // full track = the 100% reference (your fastest round)
      ctx.fillStyle = c.subAlt;
      roundRect(ctx, trackX, top, trackW, 22, 6);
      ctx.fill();

      // faint cap marker at the 100% end
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = c.main;
      roundRect(ctx, trackRight - 4, top, 4, 22, 2);
      ctx.fill();
      ctx.restore();

      if (row.won) {
        ctx.fillStyle = c.main;
        roundRect(ctx, trackX, top, trackW * row.frac, 22, 6);
        ctx.fill();

        // highlight the best round by colouring its time in the accent
        let timeColor = c.text;
        if (row.isFastest) {
          timeColor = c.main;
        }
        setType(ctx, 600, 30, timeColor, 0);
        ctx.fillText(formatSolveSec(row.wallMs), trackRight + 24, mid + 10);
      } else {
        setType(ctx, 500, 30, c.sub, 0);
        ctx.fillText("missed", trackRight + 24, mid + 10);
      }
    });
  }

  drawCardFooter(ctx, { h: H, c });
  return canvas;
}

/**
 * Single-round card (1080×1350) — same chrome as the wrap card, one song.
 * No cover art: an external image would taint the canvas and toBlob would
 * throw, so the record motif carries the artwork instead.
 * @returns {HTMLCanvasElement}
 */
export function renderRoundCard(opts = {}) {
  const {
    title = "",
    artist = "",
    wallMs = null,
    unlockedSec = 0,
    round = 0,
    playlistName = "",
  } = opts;

  const H = 1350;
  const M = CARD_M;

  const canvas = newCard(H);
  const ctx = canvas.getContext("2d");
  const c = grabTheme();

  const contentW = drawCardChrome(ctx, {
    h: H,
    c,
    subtitle: round ? `record ${round}` : "one round",
    playlistName,
  });

  const solved = formatSolveSec(wallMs);
  const won = solved !== "—";

  setType(ctx, 600, 30, c.main, 3);
  ctx.fillText(won ? "NAMED IT IN" : "COULDN'T NAME IT", M, 440);

  if (won) {
    setType(ctx, 800, 200, c.text, 0);
    ctx.fillText(solved, M, 660);
    setType(ctx, 600, 42, c.sub, 0);
    ctx.fillText(`off ${unlockedSec}s of audio`, M, 726);
  } else {
    setType(ctx, 800, 140, c.text, 0);
    ctx.fillText("missed", M, 640);
    setType(ctx, 600, 42, c.sub, 0);
    ctx.fillText(`${unlockedSec}s of audio unlocked`, M, 726);
  }

  divider(ctx, M, contentW, 800, c.sub);

  setType(ctx, 600, 30, c.main, 3);
  ctx.fillText("THE SONG", M, 880);

  setType(ctx, 700, 76, c.text, 0);
  const titleLines = wrapLines(title, contentW, 2, (s) => ctx.measureText(s).width);
  titleLines.forEach((line, i) => ctx.fillText(line, M, 970 + i * 88));

  setType(ctx, 500, 44, c.sub, 0);
  const [artistLine] = wrapLines(artist, contentW, 1, (s) => ctx.measureText(s).width);
  if (artistLine) {
    ctx.fillText(artistLine, M, 970 + titleLines.length * 88 + 14);
  }

  drawCardFooter(ctx, { h: H, c });
  return canvas;
}

// ---------------------------------------------------------------------------
// Share / download
// ---------------------------------------------------------------------------

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}

/**
 * Share an already-rendered card. Split from the renderers so the preview
 * dialog can show the user the exact image before any of this runs — nothing
 * leaves the app without the user seeing it first.
 * @returns {"shared"|"copied"|"downloaded"|"cancelled"|"prompt"}
 */
export async function shareCanvas(canvas, { text = "", filename } = {}) {
  const name = filename || "guessify-wrap.png";
  let file = null;
  try {
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (blob) {
      file = new File([blob], name, { type: "image/png" });
    }
  } catch {
    /* canvas unavailable / tainted */
  }

  if (
    file &&
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      // Files only — iOS hides "Save Image" when text/url ride along.
      await navigator.share({ files: [file] });
      return "shared";
    } catch (e) {
      if (e?.name === "AbortError") return "cancelled";
    }
  }

  if (file) {
    downloadBlob(file, name);
  }

  try {
    await navigator.clipboard.writeText(text);
    return file ? "downloaded" : "copied";
  } catch {
    window.prompt("Copy this:", text);
    return "prompt";
  }
}

/**
 * Share plain text — the fallback when a card can't be rendered at all.
 * @returns {"shared"|"copied"|"cancelled"|"prompt"}
 */
export async function shareText(text) {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (e) {
      if (e?.name === "AbortError") return "cancelled";
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    window.prompt("Copy this:", text);
    return "prompt";
  }
}

export function isNoPreviewError(err) {
  return err?.message === "no preview";
}
