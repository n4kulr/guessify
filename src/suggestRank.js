import { similarity } from "./match.js";

export const SUGGEST_OUT = 6;
export const SUGGEST_FETCH = 30;

/** Tiny nudge toward the record that's playing — tie-breaker only, never spoils alone. */
const ROUND_ARTIST_BOOST = 0.06;
const PREFIX_BOOST = 0.04;

/** Fold accents so "Daniel", "DanièL", "Đảniël" share one dedupe bucket. */
export function asciiFold(s = "") {
  return String(s)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseListeners(raw) {
  const n = Number.parseInt(String(raw ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** ~0.43 @ 1k scrobbles, ~0.86 @ 1M, ~1.0 @ 10M+. */
export function popularityScore(listeners) {
  return Math.log10(Math.max(1, listeners)) / 7;
}

/** Collapse "SZA feat. …" / "Drake & …" to one catalogue row. */
function artistDedupeKey(name) {
  const n = asciiFold(name);
  if (!n) return "";
  const head = n.split(/\s+(?:feat|featuring|with)\s+/)[0];
  return head.trim() || n;
}

function titleDedupeKey(name) {
  return asciiFold(name);
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
  const t = asciiFold(text);
  const q = asciiFold(query);
  if (!t || !q || q.length < 2) return 0;
  if (t.startsWith(q)) return PREFIX_BOOST;
  if (q.length >= 3 && t.includes(q)) return PREFIX_BOOST * 0.4;
  return 0;
}

function catalogueScore(listeners, index, name, q, roundArtists) {
  const rank = (SUGGEST_FETCH - index) / SUGGEST_FETCH;
  return (
    popularityScore(listeners) * 1.35 +
    rank * 0.12 +
    prefixBoost(name, q) +
    roundArtistBoost(name, roundArtists)
  );
}

function keepRow(prev, next) {
  if (!prev) return true;
  if (next.listeners > prev.listeners) return true;
  if (next.listeners < prev.listeners) return false;
  return next.score > prev.score;
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
    const key = titleDedupeKey(name);
    if (!key) return;
    const listeners = parseListeners(row?.listeners);
    const score = catalogueScore(listeners, index, name, q, roundArtists);

    const next = {
      name: name.slice(0, 160),
      artist: artist ? artist.slice(0, 120) : null,
      listeners,
      score,
    };
    const prev = best.get(key);
    if (keepRow(prev, next)) best.set(key, next);
  });

  return [...best.values()]
    .sort((a, b) => b.score - a.score || b.listeners - a.listeners)
    .slice(0, SUGGEST_OUT)
    .map(({ name, artist }) => ({ name, artist }));
}

/** One row per artist; diacritic dupes collapse; popularity breaks ties. */
export function rankArtistSuggestions(raw = [], query = "", roundArtists = []) {
  const q = String(query || "").trim();
  const best = new Map();

  raw.forEach((row, index) => {
    const name = String(row?.name || "").trim();
    if (!name) return;
    const key = artistDedupeKey(name);
    if (!key) return;
    const listeners = parseListeners(row?.listeners);
    const score = catalogueScore(listeners, index, name, q, roundArtists);

    const next = {
      name: name.slice(0, 120),
      listeners,
      score,
    };
    const prev = best.get(key);
    if (keepRow(prev, next)) best.set(key, next);
  });

  return [...best.values()]
    .sort((a, b) => b.score - a.score || b.listeners - a.listeners)
    .slice(0, SUGGEST_OUT)
    .map(({ name }) => ({ name }));
}
