import { normalize, similarity } from "./match.js";

export const SUGGEST_OUT = 6;
export const SUGGEST_FETCH = 30;

/** Tiny nudge toward the record that's playing — tie-breaker only, never spoils alone. */
const ROUND_ARTIST_BOOST = 0.06;
const PREFIX_BOOST = 0.04;

function normArtist(name) {
  return normalize(String(name || ""));
}

/** Collapse "SZA feat. …" / "Drake & …" to one catalogue row. */
function artistDedupeKey(name) {
  const n = normArtist(name);
  if (!n) return "";
  const head = n.split(/\s+(?:feat|featuring|with)\s+/)[0];
  return head.trim() || n;
}

function normTitle(name) {
  return normalize(String(name || ""));
}

/** 0–1: how well the catalogue row matches what's on the turntable. */
export function roundArtistBoost(artist, roundArtists = []) {
  if (!artist || !roundArtists?.length) return 0;
  let best = 0;
  for (const r of roundArtists) {
    if (!r) continue;
    best = Math.max(best, similarity(artist, r));
  }
  if (best >= 0.85) return ROUND_ARTIST_BOOST;
  if (best >= 0.65) return ROUND_ARTIST_BOOST * 0.35;
  return 0;
}

function prefixBoost(text, query) {
  const t = normTitle(text);
  const q = normTitle(query);
  if (!t || !q || q.length < 2) return 0;
  if (t.startsWith(q)) return PREFIX_BOOST;
  if (q.length >= 3 && t.includes(q)) return PREFIX_BOOST * 0.4;
  return 0;
}

/**
 * Collapse noisy Last.fm track rows (same title many times — e.g. four
 * "Doves in the Wind" by SZA), keep one row per normalized title, rank the rest.
 */
export function rankTrackSuggestions(raw = [], query = "", roundArtists = []) {
  const q = String(query || "").trim();
  const best = new Map();

  raw.forEach((row, index) => {
    const name = String(row?.name || "").trim();
    if (!name) return;
    const artist = String(row?.artist || "").trim();
    const key = normTitle(name);
    if (!key) return;

    const rank = (SUGGEST_FETCH - index) / SUGGEST_FETCH;
    const score =
      rank +
      roundArtistBoost(artist, roundArtists) +
      prefixBoost(name, q);

    const prev = best.get(key);
    if (!prev || score > prev.score) {
      best.set(key, {
        name: name.slice(0, 160),
        artist: artist ? artist.slice(0, 120) : null,
        cover: row?.cover || null,
        score,
      });
    }
  });

  return [...best.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, SUGGEST_OUT)
    .map(({ name, artist, cover }) => ({ name, artist, cover: cover || null }));
}

/** One row per artist name; same slight round-artist nudge for tie-breaks. */
export function rankArtistSuggestions(raw = [], query = "", roundArtists = []) {
  const q = String(query || "").trim();
  const best = new Map();

  raw.forEach((row, index) => {
    const name = String(row?.name || "").trim();
    if (!name) return;
    const key = artistDedupeKey(name);
    if (!key) return;

    const rank = (SUGGEST_FETCH - index) / SUGGEST_FETCH;
    const score =
      rank +
      roundArtistBoost(name, roundArtists) +
      prefixBoost(name, q);

    const prev = best.get(key);
    if (!prev || score > prev.score) {
      best.set(key, {
        name: name.slice(0, 120),
        cover: row?.cover || null,
        score,
      });
    }
  });

  return [...best.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, SUGGEST_OUT)
    .map(({ name, cover }) => ({ name, cover: cover || null }));
}
