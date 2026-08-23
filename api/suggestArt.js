/** iTunes artwork for suggest rows — Last.fm search has no real covers. */

export async function itunesRows(params) {
  const url = `https://itunes.apple.com/search?${new URLSearchParams({
    country: "US",
    ...params,
  })}`;
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) return [];
  const data = await r.json();
  return Array.isArray(data.results) ? data.results : [];
}

function artUrl(url) {
  if (!url) return null;
  return String(url).replace(/100x100bb\.jpg$/, "200x200bb.jpg");
}

function normLoose(s = "") {
  return String(s)
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreTitle(want, got) {
  const a = normLoose(want);
  const b = normLoose(got);
  if (!a || !b) return 0;
  if (a === b) return 10;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (
    shorter.length >= 5 &&
    longer.startsWith(shorter) &&
    longer.length - shorter.length <= 2
  ) {
    return 7;
  }
  return 0;
}

function scoreArtist(want, got) {
  const a = normLoose(want);
  const b = normLoose(got);
  if (!a || !b) return 0;
  if (a === b) return 8;
  if (b.includes(a) || a.includes(b)) {
    if (Math.min(a.length, b.length) >= 4) return 5;
  }
  return 0;
}

function pickTrackArtwork(rows, title, artist) {
  let best = null;
  let bestScore = 0;
  for (const row of rows) {
    if (!row?.artworkUrl100) continue;
    let score = scoreTitle(title, row.trackName);
    if (score <= 0) continue;
    if (artist) {
      const artistScore = scoreArtist(artist, row.artistName || "");
      if (artistScore <= 0) continue;
      score += artistScore;
    }
    if (score > bestScore) {
      bestScore = score;
      best = row.artworkUrl100;
    }
  }
  return artUrl(best);
}

function pickArtistArtwork(rows, name) {
  let best = null;
  let bestScore = 0;
  for (const row of rows) {
    if (!row?.artworkUrl100) continue;
    const score = scoreArtist(name, row.artistName || "");
    if (score > bestScore) {
      bestScore = score;
      best = row.artworkUrl100;
    }
  }
  return artUrl(best);
}

export async function enrichTrackCovers(items, q) {
  if (!items.length) return items;
  const rows = await itunesRows({
    term: q,
    media: "music",
    entity: "song",
    limit: "25",
  });
  const out = items.map((item) => ({
    ...item,
    cover: pickTrackArtwork(rows, item.name, item.artist),
  }));
  await Promise.all(
    out
      .filter((item) => !item.cover)
      .map(async (item) => {
        const term = [item.artist, item.name].filter(Boolean).join(" ");
        if (!term) return;
        const extra = await itunesRows({
          term,
          media: "music",
          entity: "song",
          limit: "8",
        });
        item.cover = pickTrackArtwork(extra, item.name, item.artist);
      })
  );
  return out;
}

export async function enrichArtistCovers(items, q) {
  if (!items.length) return items;
  const rows = await itunesRows({
    term: q,
    entity: "musicArtist",
    limit: "15",
  });
  return items.map((item) => ({
    ...item,
    cover: pickArtistArtwork(rows, item.name),
  }));
}
