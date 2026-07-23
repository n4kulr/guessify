import { useEffect, useMemo, useState } from "react";
import ChartCdSpindle from "./ChartCdSpindle.jsx";

const YOURS_PREVIEW = 6;

const CHART_PACKS = [
  { tag: "pop", label: "Pop", blurb: "chart pop", about: "Catchy, radio-friendly songs with big choruses.", artists: ["Dua Lipa", "Sabrina Carpenter", "Olivia Rodrigo", "The Weeknd"] },
  { tag: "hip-hop", label: "Hip-hop", blurb: "raps & beats", about: "Rapped verses over beats, from boom-bap to trap.", artists: ["Kendrick Lamar", "Drake", "Travis Scott", "Nicki Minaj"] },
  { tag: "rnb", label: "R&B", blurb: "smooth cuts", about: "Smooth singing over midtempo grooves.", artists: ["SZA", "Frank Ocean", "Usher", "Summer Walker"] },
  { tag: "rock", label: "Rock", blurb: "guitars up", about: "Guitar-based music with riffs and loud choruses.", artists: ["Foo Fighters", "Arctic Monkeys", "Queen", "Paramore"] },
  { tag: "indie", label: "Indie", blurb: "left of center", about: "Alternative rock and pop outside the mainstream charts.", artists: ["Tame Impala", "Phoebe Bridgers", "Vampire Weekend", "Clairo"] },
  { tag: "electronic", label: "Electronic", blurb: "synths", about: "Synth- and beat-driven music made with machines and computers.", artists: ["Flume", "Disclosure", "Deadmau5", "Fred again.."] },
  { tag: "jazz", label: "Jazz", blurb: "late night", about: "Improvised music rooted in swing, blues, and standards.", artists: ["Miles Davis", "Norah Jones", "Kamasi Washington", "Esperanza Spalding"] },
  { tag: "soul", label: "Soul", blurb: "warm grooves", about: "Heartfelt vocals over warm, rhythmic arrangements.", artists: ["Aretha Franklin", "Amy Winehouse", "Leon Bridges", "Alicia Keys"] },
  { tag: "metal", label: "Metal", blurb: "loud & proud", about: "Loud, heavy music with distorted guitars and intense drums.", artists: ["Metallica", "Gojira", "Slipknot", "Ghost"] },
  { tag: "punk", label: "Punk", blurb: "fast & raw", about: "Short, fast rock songs with raw energy and simple chords.", artists: ["Green Day", "The Offspring", "IDLES", "Amyl and the Sniffers"] },
  { tag: "folk", label: "Folk", blurb: "acoustic tales", about: "Acoustic songwriting focused on stories and melody.", artists: ["Bon Iver", "Mumford & Sons", "Joni Mitchell", "Fleet Foxes"] },
  { tag: "classical", label: "Classical", blurb: "orchestral", about: "Orchestral and piano works from the Western classical tradition.", artists: ["Beethoven", "Bach", "Debussy", "Hans Zimmer"] },
  { tag: "reggae", label: "Reggae", blurb: "riddim", about: "Jamaican music with a skanking guitar rhythm and prominent bass.", artists: ["Bob Marley", "Toots & the Maytals", "Protoje", "Chronixx"] },
  { tag: "country", label: "Country", blurb: "story songs", about: "Story songs with steel guitar, fiddle, and a Southern twang.", artists: ["Luke Combs", "Kacey Musgraves", "Johnny Cash", "Zach Bryan"] },
  { tag: "house", label: "House", blurb: "four on the floor", about: "Dance music built on a steady four-on-the-floor kick.", artists: ["Disclosure", "Peggy Gou", "Calvin Harris", "Kerri Chandler"] },
  { tag: "techno", label: "Techno", blurb: "warehouse", about: "Dark, repetitive electronic dance music for warehouses and clubs.", artists: ["Charlotte de Witte", "Amelie Lens", "Richie Hawtin", "Carl Cox"] },
  { tag: "k-pop", label: "K-pop", blurb: "idol charts", about: "Korean pop with polished production and very catchy hooks.", artists: ["BTS", "BLACKPINK", "NewJeans", "Stray Kids"] },
  { tag: "afrobeats", label: "Afrobeats", blurb: "global pulse", about: "West African pop with danceable rhythms and melodic vocals.", artists: ["Wizkid", "Burna Boy", "Tems", "Rema"] },
  { tag: "latin", label: "Latin", blurb: "ritmo", about: "Music from Latin America and Spain — reggaeton, salsa, and related styles.", artists: ["Bad Bunny", "Shakira", "J Balvin", "Rosalía"] },
  { tag: "blues", label: "Blues", blurb: "bent notes", about: "Guitar music built around bent notes and songs about hard times.", artists: ["B.B. King", "Buddy Guy", "Gary Clark Jr.", "Hozier"] },
  { tag: "90s", label: "90s", blurb: "decade pack", about: "Hits from the 1990s across pop, rock, hip-hop, and R&B.", artists: ["Spice Girls", "Nirvana", "TLC", "Oasis"] },
  { tag: "2000s", label: "2000s", blurb: "decade pack", about: "Hits and radio staples from the 2000s.", artists: ["Beyoncé", "Linkin Park", "Rihanna", "The Killers"] },
  { tag: "2010s", label: "2010s", blurb: "decade pack", about: "Hits from the 2010s, when streaming took over.", artists: ["Adele", "Drake", "Lorde", "Post Malone"] },
  { tag: "disco", label: "Disco", blurb: "dancefloor", about: "Seventies dance music with four-on-the-floor beats and lush arrangements.", artists: ["ABBA", "Donna Summer", "Bee Gees", "Daft Punk"] },
];

export default function PlaylistPicker({ onPick, onBack }) {
  const [data, setData] = useState(null); // { playlists, liked }
  const [error, setError] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [note, setNote] = useState(null);
  const [showAllYours, setShowAllYours] = useState(false);
  const [chartQuery, setChartQuery] = useState("");

  useEffect(() => {
    fetch("/api/playlists", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setData)
      .catch(() => setError("Couldn't load your playlists."));
  }, []);

  // Liked Songs first, then owned playlists only (locked ones can't be played).
  const yours = useMemo(() => {
    if (!data) return [];
    const list = [];
    if (data.liked && data.liked.total > 0) {
      list.push({
        id: "liked",
        liked: true,
        owned: true,
        name: "Liked Songs",
        owner: "you",
        cover: data.liked.cover,
        total: data.liked.total,
      });
    }
    const owned = (data.playlists || [])
      .filter((p) => p.owned)
      .sort((a, b) => a.name.localeCompare(b.name));
    return list.concat(owned);
  }, [data]);

  const visibleYours = showAllYours ? yours : yours.slice(0, YOURS_PREVIEW);
  const hiddenYours = Math.max(0, yours.length - YOURS_PREVIEW);

  async function chooseYours(p) {
    if (!p.owned) return;
    setLoadingId(p.id);
    setNote(null);
    try {
      const url = p.liked ? "/api/liked" : `/api/playlist/${p.id}`;
      const res = await fetch(url, { credentials: "include" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "failed");
      if (d.playableCount < 2) {
        setNote(`"${p.name}" needs at least 2 tracks to play. Try another.`);
        setLoadingId(null);
        return;
      }
      onPick(d);
    } catch (err) {
      setNote(err.message || "Couldn't load that playlist. Try another.");
      setLoadingId(null);
    }
  }

  async function chooseChart(tag) {
    const clean = String(tag || "").trim();
    if (!clean) return;
    const id = `chart:${clean.toLowerCase()}`;
    setLoadingId(id);
    setNote(null);
    try {
      const res = await fetch(
        `/api/charts?tag=${encodeURIComponent(clean)}&limit=30`,
        { credentials: "include" }
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "failed");
      if (d.playableCount < 2) {
        setNote(`“${clean}” needs at least 2 tracks. Try another tag.`);
        setLoadingId(null);
        return;
      }
      onPick(d);
    } catch (err) {
      setNote(err.message || "Couldn't load that chart. Try another tag.");
      setLoadingId(null);
    }
  }

  function submitChartSearch(e) {
    e.preventDefault();
    chooseChart(chartQuery);
  }

  if (error) return <div className="panel">{error}</div>;
  if (!data) return <div className="loader">loading your playlists…</div>;

  return (
    <div className="picker">
      {onBack && (
        <button className="btn btn-mini picker-back" onClick={onBack}>
          ← home
        </button>
      )}
      <h2 className="section-title">Pick a record…</h2>
      <p className="section-sub">Your Spotify playlists only.</p>

      {note && <div className="error-banner">{note}</div>}

      {yours.length === 0 ? (
        <p className="section-sub">
          No owned playlists found — make one on Spotify, or describe one below.
        </p>
      ) : (
        <>
          <div className="playlists">
            {visibleYours.map((p) => (
              <button
                key={p.id}
                className={`record-card ${p.liked ? "liked-card" : ""}`}
                onClick={() => chooseYours(p)}
                disabled={loadingId !== null}
              >
                <div className="record-art">
                  {p.liked ? (
                    <div className="record-cover record-cover--liked">♥</div>
                  ) : p.cover ? (
                    <img src={p.cover} alt="" className="record-cover" />
                  ) : (
                    <div className="record-cover record-cover--empty">♪</div>
                  )}
                </div>
                <div className="record-meta">
                  <span className="record-name">{p.name}</span>
                  <span className="record-count">{p.total} tracks</span>
                </div>
                {loadingId === p.id && (
                  <span className="record-loading">loading…</span>
                )}
              </button>
            ))}
          </div>
          {hiddenYours > 0 && !showAllYours && (
            <button
              type="button"
              className="btn btn-ghost picker-more"
              onClick={() => setShowAllYours(true)}
            >
              show {hiddenYours} more
            </button>
          )}
          {showAllYours && yours.length > YOURS_PREVIEW && (
            <button
              type="button"
              className="btn btn-ghost picker-more"
              onClick={() => setShowAllYours(false)}
            >
              show less
            </button>
          )}
        </>
      )}

      <div className="chart-search-block">
        <h3 className="picker-section-title">or describe it!</h3>
        <form className="chart-search" onSubmit={submitChartSearch}>
          <div className="join-code-row">
            <label className="chart-search-field">
              {!chartQuery && (
                <span className="chart-search-ph" aria-hidden="true">
                  <span className="chart-search-ph-main">type your pick…</span>
                  {" "}
                  <span className="chart-search-ph-hint">(artist/era/album)</span>
                </span>
              )}
              <input
                className="guess-input join-code-input chart-search-input"
                placeholder=""
                value={chartQuery}
                onChange={(e) => setChartQuery(e.target.value)}
                disabled={loadingId !== null}
                autoCorrect="off"
                spellCheck={false}
                aria-label="type your pick, artist, era, or album"
              />
            </label>
            <button
              type="submit"
              className="btn btn-play"
              disabled={loadingId !== null || !chartQuery.trim()}
            >
              {loadingId?.startsWith("chart:") ? "…" : "play"}
            </button>
          </div>
        </form>
      </div>

      <ChartCdSpindle
        packs={CHART_PACKS}
        loadingId={loadingId}
        onChoose={chooseChart}
      />
    </div>
  );
}
