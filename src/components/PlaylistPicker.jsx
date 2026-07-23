import { useEffect, useMemo, useState } from "react";
import ChartCdSpindle from "./ChartCdSpindle.jsx";
import PlaylistCdShelf from "./PlaylistCdShelf.jsx";

const YOURS_PREVIEW = 6;

/** Teaser CDs behind the login blur (logged-out picker). */
const TEASER_SHELF = [
  { id: "t1", name: "Liked Songs", liked: true, owned: true, total: 128 },
  { id: "t2", name: "Release Radar", owned: true, total: 30 },
  { id: "t3", name: "Discover Weekly", owned: true, total: 30 },
  { id: "t4", name: "On Repeat", owned: true, total: 30 },
  { id: "t5", name: "Daily Mix 1", owned: true, total: 50 },
  { id: "t6", name: "Road Trip", owned: true, total: 42 },
];

const CHART_PACKS = [
  { tag: "pop", label: "Pop", blurb: "chart pop", about: "Catchy, radio-friendly songs with big choruses.", artists: ["Dua Lipa", "Sabrina Carpenter", "Olivia Rodrigo", "The Weeknd", "Taylor Swift", "Harry Styles", "Billie Eilish", "Ariana Grande"] },
  { tag: "2000s", label: "2000s", blurb: "decade pack", about: "Hits and radio staples from the 2000s.", artists: ["Beyoncé", "Linkin Park", "Rihanna", "The Killers", "Eminem", "Coldplay", "Usher", "OutKast"] },
  { tag: "2010s", label: "2010s", blurb: "decade pack", about: "Hits from the 2010s, when streaming took over.", artists: ["Adele", "Drake", "Lorde", "Post Malone", "Rihanna", "Ed Sheeran", "Kendrick Lamar", "Lana Del Rey"] },
  { tag: "hip-hop", label: "Hip-hop", blurb: "raps & beats", about: "Rapped verses over beats, from boom-bap to trap.", artists: ["Kendrick Lamar", "Drake", "Travis Scott", "Nicki Minaj", "J. Cole", "Tyler, the Creator", "Cardi B", "Future"] },
  { tag: "rnb", label: "R&B", blurb: "smooth cuts", about: "Smooth singing over midtempo grooves.", artists: ["SZA", "Frank Ocean", "Usher", "Summer Walker", "The Weeknd", "H.E.R.", "Brent Faiyaz", "Giveon"] },
  { tag: "rock", label: "Rock", blurb: "guitars up", about: "Guitar-based music with riffs and loud choruses.", artists: ["Foo Fighters", "Arctic Monkeys", "Queen", "Paramore", "The Strokes", "Red Hot Chili Peppers", "Muse", "Nirvana"] },
  { tag: "indie", label: "Indie", blurb: "left of center", about: "Alternative rock and pop outside the mainstream charts.", artists: ["Tame Impala", "Phoebe Bridgers", "Vampire Weekend", "Clairo", "Arcade Fire", "The 1975", "Mac DeMarco", "Japanese Breakfast"] },
  { tag: "electronic", label: "Electronic", blurb: "synths", about: "Synth- and beat-driven music made with machines and computers.", artists: ["Flume", "Disclosure", "Deadmau5", "Fred again..", "Skrillex", "ODESZA", "Aphex Twin", "Kaytranada"] },
  { tag: "jazz", label: "Jazz", blurb: "late night", about: "Improvised music rooted in swing, blues, and standards.", artists: ["Miles Davis", "Norah Jones", "Kamasi Washington", "Esperanza Spalding", "John Coltrane", "Billie Holiday", "Robert Glasper", "Snarky Puppy"] },
  { tag: "soul", label: "Soul", blurb: "warm grooves", about: "Heartfelt vocals over warm, rhythmic arrangements.", artists: ["Aretha Franklin", "Amy Winehouse", "Leon Bridges", "Alicia Keys", "Marvin Gaye", "Anderson .Paak", "Lauryn Hill", "Al Green"] },
  { tag: "metal", label: "Metal", blurb: "loud & proud", about: "Loud, heavy music with distorted guitars and intense drums.", artists: ["Metallica", "Gojira", "Slipknot", "Ghost", "Iron Maiden", "Tool", "Bring Me the Horizon", "Sleep Token"] },
  { tag: "punk", label: "Punk", blurb: "fast & raw", about: "Short, fast rock songs with raw energy and simple chords.", artists: ["Green Day", "The Offspring", "IDLES", "Amyl and the Sniffers", "Blink-182", "Ramones", "Paramore", "Turnstile"] },
  { tag: "folk", label: "Folk", blurb: "acoustic tales", about: "Acoustic songwriting focused on stories and melody.", artists: ["Bon Iver", "Mumford & Sons", "Joni Mitchell", "Fleet Foxes", "Bob Dylan", "Simon & Garfunkel", "Noah Kahan", "Iron & Wine"] },
  { tag: "classical", label: "Classical", blurb: "orchestral", about: "Orchestral and piano works from the Western classical tradition.", artists: ["Beethoven", "Bach", "Debussy", "Hans Zimmer", "Mozart", "Chopin", "Vivaldi", "Philip Glass"] },
  { tag: "reggae", label: "Reggae", blurb: "riddim", about: "Jamaican music with a skanking guitar rhythm and prominent bass.", artists: ["Bob Marley", "Toots & the Maytals", "Protoje", "Chronixx", "Peter Tosh", "Burning Spear", "Koffee", "Damian Marley"] },
  { tag: "country", label: "Country", blurb: "story songs", about: "Story songs with steel guitar, fiddle, and a Southern twang.", artists: ["Luke Combs", "Kacey Musgraves", "Johnny Cash", "Zach Bryan", "Dolly Parton", "Chris Stapleton", "Shania Twain", "Morgan Wallen"] },
  { tag: "house", label: "House", blurb: "four on the floor", about: "Dance music built on a steady four-on-the-floor kick.", artists: ["Disclosure", "Peggy Gou", "Calvin Harris", "Kerri Chandler", "Fisher", "Duke Dumont", "Frankie Knuckles", "Purple Disco Machine"] },
  { tag: "techno", label: "Techno", blurb: "warehouse", about: "Dark, repetitive electronic dance music for warehouses and clubs.", artists: ["Charlotte de Witte", "Amelie Lens", "Richie Hawtin", "Carl Cox", "Jeff Mills", "Nina Kraviz", "Adam Beyer", "Peggy Gou"] },
  { tag: "k-pop", label: "K-pop", blurb: "idol charts", about: "Korean pop with polished production and very catchy hooks.", artists: ["BTS", "BLACKPINK", "NewJeans", "Stray Kids", "TWICE", "EXO", "IU", "aespa"] },
  { tag: "afrobeats", label: "Afrobeats", blurb: "global pulse", about: "West African pop with danceable rhythms and melodic vocals.", artists: ["Wizkid", "Burna Boy", "Tems", "Rema", "Davido", "Asake", "Ayra Starr", "Tiwa Savage"] },
  { tag: "latin", label: "Latin", blurb: "ritmo", about: "Music from Latin America and Spain — reggaeton, salsa, and related styles.", artists: ["Bad Bunny", "Shakira", "J Balvin", "Rosalía", "Karol G", "Daddy Yankee", "Peso Pluma", "Rauw Alejandro"] },
  { tag: "blues", label: "Blues", blurb: "bent notes", about: "Guitar music built around bent notes and songs about hard times.", artists: ["B.B. King", "Buddy Guy", "Gary Clark Jr.", "Hozier", "Stevie Ray Vaughan", "Muddy Waters", "Joe Bonamassa", "Eric Clapton"] },
  { tag: "90s", label: "90s", blurb: "decade pack", about: "Hits from the 1990s across pop, rock, hip-hop, and R&B.", artists: ["Spice Girls", "Nirvana", "TLC", "Oasis", "Mariah Carey", "2Pac", "Radiohead", "Destiny's Child"] },
  { tag: "disco", label: "Disco", blurb: "dancefloor", about: "Seventies dance music with four-on-the-floor beats and lush arrangements.", artists: ["ABBA", "Donna Summer", "Bee Gees", "Daft Punk", "Chic", "Gloria Gaynor", "KC and the Sunshine Band", "Sister Sledge"] },
];

export default function PlaylistPicker({ onPick, needsLogin = false }) {
  const [data, setData] = useState(null); // { playlists, liked }
  const [error, setError] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [note, setNote] = useState(null);
  const [showAllYours, setShowAllYours] = useState(false);
  const [chartQuery, setChartQuery] = useState("");
  const [yoursView, setYoursView] = useState("cds"); // cds | list

  useEffect(() => {
    if (needsLogin) return;
    fetch("/api/playlists", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setData)
      .catch(() => setError("Couldn't load your playlists."));
  }, [needsLogin]);

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

  function toggleYoursView() {
    setYoursView((v) => (v === "cds" ? "list" : "cds"));
  }

  if (!needsLogin) {
    if (error) return <div className="panel">{error}</div>;
    if (!data) return <div className="loader">loading your playlists…</div>;
  }

  const cdsMode = yoursView === "cds";

  return (
    <div className="picker">
      <div className="picker-heading">
        {!needsLogin && yours.length > 0 && (
          <button
            type="button"
            className="view-toggle"
            aria-pressed={cdsMode}
            aria-label={cdsMode ? "Switch to button list" : "Switch to CD shelf"}
            onClick={toggleYoursView}
          >
            {cdsMode ? "CD" : "Button"}
          </button>
        )}
        <h2 className="section-title">Pick a record…</h2>
      </div>
      <p className="section-sub">Your Spotify playlists only.</p>

      {needsLogin && (
        <div className="error-banner shelf-spotify-warn" role="note">
          Login won’t work unless I’ve added your Spotify email — Spotify
          locked third-party apps to an allowlist in Feb 2026. Drop your
          Spotify email in feedback (bottom-right) and I’ll whitelist you.
        </div>
      )}

      {note && <div className="error-banner">{note}</div>}

      {needsLogin ? (
        <div className="shelf-gate">
          <a className="btn btn-big btn-spotify shelf-login" href="/api/login">
            <svg
              className="spotify-logo"
              viewBox="0 0 24 24"
              width="22"
              height="22"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
              />
            </svg>
            Log in with Spotify
          </a>
          <div className="shelf-locked" aria-hidden="true">
            <PlaylistCdShelf
              playlists={TEASER_SHELF}
              loadingId={null}
              onChoose={() => {}}
            />
          </div>
        </div>
      ) : yours.length === 0 ? (
        <p className="section-sub">
          No owned playlists found — make one on Spotify, or describe one below.
        </p>
      ) : (
        <>
          {cdsMode ? (
            <PlaylistCdShelf
              playlists={yours}
              loadingId={loadingId}
              onChoose={chooseYours}
            />
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
                        <img src={p.cover} alt="" className="record-cover" draggable={false} />
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
        </>
      )}

      <div className="chart-search-block">
        <h3 className="picker-section-title">or describe it!</h3>
        <p className="section-sub chart-search-sub">(artist/era/album)</p>
        <form className="chart-search" onSubmit={submitChartSearch}>
          <div className="join-code-row">
            <label className="chart-search-field">
              {!chartQuery && (
                <span className="chart-search-ph" aria-hidden="true">
                  <span className="chart-search-ph-main">type your pick…</span>
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
