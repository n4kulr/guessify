/** Curated CD packs — shown with a “pack” badge in the dropdown. */
export const CHART_PACK_TAGS = [
  "pop", "2000s", "2010s", "hip-hop", "rnb", "rock", "indie", "electronic",
  "jazz", "soul", "metal", "punk", "folk", "classical", "reggae", "country",
  "house", "techno", "k-pop", "afrobeats", "latin", "blues", "90s", "disco",
];

/**
 * Extra bases Last.fm often has tracks for, but that aren’t on the CD shelf.
 * Typing a prefix (e.g. “mala”) expands these with decade suffixes.
 */
export const CHART_REGION_SEEDS = [
  "malayalam",
  "tamil",
  "hindi",
  "telugu",
  "punjabi",
  "kannada",
  "bollywood",
  "mollywood",
  "kollywood",
  "tollywood",
  "korean",
  "japanese",
  "mandarin",
  "cantonese",
  "arabic",
  "french",
  "spanish",
  "portuguese",
  "brazilian",
  "afrobeat",
  "afrobeats",
  "amapiano",
  "dancehall",
  "soca",
  "gospel",
  "christian",
  "lo-fi",
  "lofi",
  "phonk",
  "hyperpop",
  "city pop",
  "j-pop",
  "j-rock",
  "anime",
  "ost",
];

export const CHART_ERA_SUFFIXES = ["90s", "2000s", "2010s", "2020s"];

function norm(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 64);
}

function matchesPrefix(name, q) {
  if (!q) return false;
  if (name.startsWith(q)) return true;
  // “mala” → “malayalam”, also match after spaces: “k pop” vs “k-pop”
  const compact = name.replace(/[\s-]+/g, "");
  const qCompact = q.replace(/[\s-]+/g, "");
  return compact.startsWith(qCompact) || name.includes(q);
}

/**
 * Build chart tag suggestions for a typed query.
 * @param {string} query
 * @param {{ name: string }[]} [remote] Last.fm tag.search hits
 * @returns {{ name: string, pack: boolean }[]}
 */
export function buildChartSuggestions(query, remote = []) {
  const q = norm(query);
  if (q.length < 1) return [];

  const packSet = new Set(CHART_PACK_TAGS);
  const out = [];
  const seen = new Set();

  function add(raw, { pack = false } = {}) {
    const name = norm(raw);
    if (!name || seen.has(name)) return;
    seen.add(name);
    out.push({ name, pack: pack || packSet.has(name) });
  }

  // 1) CD packs that match
  for (const tag of CHART_PACK_TAGS) {
    if (matchesPrefix(tag, q)) add(tag, { pack: true });
  }

  // 2) Regional / extra seeds that match, plus decade compounds
  for (const seed of CHART_REGION_SEEDS) {
    if (!matchesPrefix(seed, q)) continue;
    add(seed);
    // Only expand single-token bases (not “city pop”) into “seed 2000s”
    if (!seed.includes(" ")) {
      for (const era of CHART_ERA_SUFFIXES) add(`${seed} ${era}`);
    }
  }

  // 3) Last.fm hits (and expand single-word ones the same way)
  for (const hit of remote) {
    const name = norm(hit?.name);
    if (!name || !matchesPrefix(name, q)) continue;
    add(name);
    if (!name.includes(" ")) {
      for (const era of CHART_ERA_SUFFIXES) add(`${name} ${era}`);
    }
  }

  // Prefer tags that start with the query, then shorter names.
  out.sort((a, b) => {
    const aStart = a.name.startsWith(q) ? 0 : 1;
    const bStart = b.name.startsWith(q) ? 0 : 1;
    if (aStart !== bStart) return aStart - bStart;
    if (a.pack !== b.pack) return a.pack ? -1 : 1;
    return a.name.length - b.name.length || a.name.localeCompare(b.name);
  });

  return out.slice(0, 10);
}
