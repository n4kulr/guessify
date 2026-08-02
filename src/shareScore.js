import { formatSolveSec } from "./gameStats.js";
import { getThemePalette } from "./themes.js";

/**
 * End-of-game share text + Wrapped-style PNG + native share / download.
 * Links guessify.uk so OG art rides along when text is posted.
 */

const SHARE_URL = "https://guessify.uk";

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
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const c = grabTheme();
  const font = '"Lexend Deca", system-ui, -apple-system, sans-serif';

  // Atmosphere
  const grad = ctx.createLinearGradient(0, 0, W * 0.2, H);
  grad.addColorStop(0, c.subAlt);
  grad.addColorStop(0.4, c.bg);
  grad.addColorStop(1, c.subAlt);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = c.main;
  ctx.globalAlpha = 0.12;
  ctx.beginPath();
  ctx.arc(W * 0.85, H * 0.12, 420, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W * 0.1, H * 0.78, 360, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Brand
  ctx.fillStyle = c.main;
  ctx.font = `700 64px ${font}`;
  ctx.fillText("guessify", 88, 160);

  let subtitle = "solo wrap";
  if (mode === "online") subtitle = place ? `#${place} online` : "online race";
  if (mode === "party") subtitle = name ? `party · ${name}` : "party wrap";
  ctx.fillStyle = c.sub;
  ctx.font = `600 36px ${font}`;
  ctx.fillText(subtitle, 88, 220);

  if (playlistName) {
    ctx.fillStyle = c.text;
    ctx.font = `500 32px ${font}`;
    const pl =
      playlistName.length > 36 ? `${playlistName.slice(0, 34)}…` : playlistName;
    ctx.fillText(pl, 88, 280);
  }

  // Hero score
  ctx.fillStyle = c.text;
  ctx.font = `800 240px ${font}`;
  ctx.fillText(String(score), 88, 560);
  ctx.fillStyle = c.sub;
  ctx.font = `600 44px ${font}`;
  ctx.fillText(maxScore ? `of ${maxScore} pts` : "pts", 88, 630);

  // Stat chips
  const chips = [];
  if (accuracy != null) chips.push({ k: "accuracy", v: `${Math.round(accuracy * 100)}%` });
  if (fastestMs != null) chips.push({ k: "fastest", v: formatSolveSec(fastestMs) });
  if (bestStreak != null) chips.push({ k: "streak", v: String(bestStreak) });
  if (artistsClaimed != null && artistsTotal != null) {
    chips.push({ k: "artists", v: `${artistsClaimed}/${artistsTotal}` });
  }

  let chipY = 740;
  const chipW = (W - 88 * 2 - 24) / 2;
  chips.slice(0, 4).forEach((chip, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 88 + col * (chipW + 24);
    const y = chipY + row * 140;
    ctx.fillStyle = c.subAlt;
    roundRect(ctx, x, y, chipW, 112, 20);
    ctx.fill();
    ctx.fillStyle = c.sub;
    ctx.font = `600 28px ${font}`;
    ctx.fillText(chip.k.toUpperCase(), x + 32, y + 42);
    ctx.fillStyle = c.text;
    ctx.font = `700 48px ${font}`;
    ctx.fillText(chip.v, x + 32, y + 92);
  });

  // Mini replay
  const rows = Array.isArray(timeline) ? timeline.slice(0, 5) : [];
  if (rows.length) {
    const baseY = chipY + Math.ceil(Math.min(chips.length, 4) / 2) * 140 + 80;
    ctx.fillStyle = c.sub;
    ctx.font = `600 28px ${font}`;
    ctx.fillText("REPLAY", 88, baseY);
    rows.forEach((row, i) => {
      const y = baseY + 40 + i * 72;
      ctx.fillStyle = c.sub;
      ctx.font = `500 28px ${font}`;
      ctx.fillText(`R${row.round}`, 88, y + 28);
      const trackX = 180;
      const trackW = W - trackX - 200;
      ctx.fillStyle = c.subAlt;
      roundRect(ctx, trackX, y, trackW, 22, 6);
      ctx.fill();
      if (row.won) {
        const pct = Math.max(0.08, Math.min(1, (row.barPct || 0) / 100));
        ctx.fillStyle = c.main;
        roundRect(ctx, trackX, y, trackW * pct, 22, 6);
        ctx.fill();
        ctx.fillStyle = c.text;
        ctx.font = `600 28px ${font}`;
        ctx.fillText(formatSolveSec(row.wallMs), trackX + trackW + 24, y + 22);
      } else {
        ctx.fillStyle = c.sub;
        ctx.font = `500 28px ${font}`;
        ctx.fillText("miss", trackX + trackW + 24, y + 22);
      }
    });
  }

  // Footer
  ctx.fillStyle = c.main;
  ctx.font = `700 40px ${font}`;
  ctx.fillText("guessify.uk", 88, H - 100);
  ctx.fillStyle = c.sub;
  ctx.font = `500 28px ${font}`;
  ctx.fillText("name that song", 88, H - 52);

  return canvas;
}

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
