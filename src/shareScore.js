import { formatSolveSec } from "./gameStats.js";
import { getThemePalette } from "./themes.js";

/**
 * End-of-game share text + Wrapped-style PNG + native share / download.
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

  const W = 1080;
  const H = 1920;
  const M = 100; // page margin — everything hangs off this left edge
  const contentW = W - M * 2;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const c = grabTheme();

  // --- Background: vertical gradient + two soft warm blobs ------------------
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, c.subAlt);
  grad.addColorStop(0.45, c.bg);
  grad.addColorStop(1, c.subAlt);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.arc(W * 0.95, H * 0.08, 460, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Vinyl record bleeding off the bottom-right — the signature graphic.
  drawVinyl(ctx, W * 0.9, H * 0.92, 70, 430, 14, c.main, 0.05);

  // --- Header: wordmark + accent underline, subtitle, playlist pill ---------
  setType(ctx, 700, 68, c.main, 0);
  ctx.fillText("guessify", M, 175);
  const wordW = ctx.measureText("guessify").width;
  ctx.fillStyle = c.main;
  roundRect(ctx, M, 198, wordW, 8, 4);
  ctx.fill();

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

  // --- Footer (anchored to the bottom) -------------------------------------
  divider(ctx, M, contentW, 1800, c.sub);

  const footY = 1868;
  setType(ctx, 700, 44, c.main, 0);
  ctx.fillText("guessify.uk", M, footY);

  setType(ctx, 500, 30, c.sub, 0);
  const tag = "name that song";
  const tagW = ctx.measureText(tag).width;
  ctx.fillText(tag, W - M - tagW, footY);

  ctx.letterSpacing = "0px"; // leave the context clean
  return canvas;
}

// ---------------------------------------------------------------------------
// Share / download (unchanged)
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

/** @returns {"shared"|"copied"|"downloaded"|"cancelled"|"prompt"} */
export async function shareScore(opts) {
  const { title, text } = scoreSharePayload(opts);
  let file = null;
  try {
    const canvas = renderShareCard(opts);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (blob) {
      file = new File([blob], "guessify-wrap.png", { type: "image/png" });
    }
  } catch {
    /* canvas / theme unavailable */
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
    downloadBlob(file, "guessify-wrap.png");
  }

  try {
    await navigator.clipboard.writeText(text);
    return file ? "downloaded" : "copied";
  } catch {
    window.prompt("Copy this:", text);
    return "prompt";
  }
}

export function isNoPreviewError(err) {
  return err?.message === "no preview";
}
