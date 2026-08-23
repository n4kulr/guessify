/**
 * Swap a no-preview track for another from the same playlist/chart pool
 * without advancing the round index.
 */
import { shuffle } from "./multiplayer/constants.js";

/** @param {{ id?: string }[]} pool @param {Set<string>} usedIds @param {string|null|undefined} currentId */
export function nextSpareTrack(pool, usedIds, currentId) {
  for (const t of pool || []) {
    const id = t?.id;
    if (!id || id === currentId || usedIds.has(id)) continue;
    return t;
  }
  return null;
}

/**
 * Deal ROUND_COUNT play slots + leftover spares (party host).
 * Spares replace dead previews without burning the round.
 */
export function dealPartyTracks(allTracks, roundCount = 5) {
  const list = (Array.isArray(allTracks) ? allTracks : []).filter(Boolean);
  const shuffled = shuffle(list);
  const n = Math.min(Math.max(0, roundCount), shuffled.length);
  return {
    tracks: shuffled.slice(0, n),
    spareTracks: shuffled.slice(n),
  };
}
