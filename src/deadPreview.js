/**
 * Swap a no-preview track for another from the same playlist/chart pool
 * without advancing the round index.
 */

/** @param {{ id?: string }[]} pool @param {Set<string>} usedIds @param {string|null|undefined} currentId */
export function nextSpareTrack(pool, usedIds, currentId) {
  for (const t of pool || []) {
    const id = t?.id;
    if (!id || id === currentId || usedIds.has(id)) continue;
    return t;
  }
  return null;
}
