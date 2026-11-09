import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDragScroll } from "../useDragScroll.js";

const TONES = [
  "clear", "white", "black", "grey", "smoke", "amber", "slate", "frost",
  "blue", "purple", "yellowed",
];

/** Notes for the curated shelf, matched case-insensitively by playlist name. */
const PLAYLIST_NOTES = {
  "nakul's favs": "songs ive liked at some point of my life - from 2017 to today",
  "beats": "rap songs?",
  "not beats": "not rap songs?",
  "beat switch": "what da title says",
  "calm": "calms me down",
  "cultural roots": "representing kerala",
};

function notesFor(name) {
  return PLAYLIST_NOTES[String(name || "").trim().toLowerCase()] || null;
}

function toneOf(i) {
  return TONES[i % TONES.length];
}

function topArtists(tracks, limit = 24) {
  const out = [];
  for (const t of tracks || []) {
    for (const a of t.artists || []) {
      if (!a || out.includes(a)) continue;
      out.push(a);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/** Horizontal jewel-case shelf for Spotify playlists (covers face out). */
export default function PlaylistCdShelf({ playlists, loadingId, onChoose }) {
  const busy = loadingId !== null;
  const [picked, setPicked] = useState(null);
  const [preview, setPreview] = useState(null); // { artists, loading }
  const previewCache = useRef(new Map());
  const scrollRef = useRef(null);
  const trayRef = useRef(null);
  const rowRef = useRef(null);
  useDragScroll(scrollRef);

  const pickedPlaylist = picked
    ? playlists.find((p) => p.id === picked) || null
    : null;
  const pickedIndex = pickedPlaylist
    ? playlists.findIndex((p) => p.id === pickedPlaylist.id)
    : -1;
  const panelOpen = Boolean(pickedPlaylist);

  useLayoutEffect(() => {
    const tray = trayRef.current;
    const row = rowRef.current;
    if (!tray || !row) return;
    function syncSize() {
      const peek = 16;
      const inset = peek / 2;
      row.style.setProperty("--shelf-panel-top", `${inset}px`);
      row.style.setProperty(
        "--shelf-panel-h",
        `${Math.max(0, tray.offsetHeight - peek)}px`
      );
      row.style.setProperty("--shelf-panel-side", `${inset}px`);
      row.style.setProperty(
        "--shelf-panel-w",
        `${Math.max(0, tray.offsetWidth - peek)}px`
      );
    }
    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(tray);
    window.addEventListener("resize", syncSize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncSize);
    };
  }, [panelOpen, playlists.length]);

  useEffect(() => {
    if (!pickedPlaylist) {
      setPreview(null);
      return;
    }
    const cached = previewCache.current.get(pickedPlaylist.id);
    if (cached) {
      setPreview({ loading: false, artists: cached });
      return;
    }

    let cancelled = false;
    setPreview({ loading: true, artists: [] });
    const url = pickedPlaylist.liked
      ? "/api/liked"
      : `/api/playlist/${pickedPlaylist.id}`;

    fetch(url, { credentials: "include" })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancelled) return;
        const artists = ok ? topArtists(d.tracks) : [];
        if (ok) previewCache.current.set(pickedPlaylist.id, artists);
        setPreview({ loading: false, artists });
      })
      .catch(() => {
        if (!cancelled) setPreview({ loading: false, artists: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [pickedPlaylist]);

  function selectPack(id) {
    if (busy) return;
    setPicked((cur) => (cur === id ? null : id));
  }

  function putBack() {
    setPicked(null);
  }

  function confirmPlay() {
    if (!pickedPlaylist || busy) return;
    onChoose(pickedPlaylist);
  }

  const panelClass = ["shelf-panel", panelOpen ? "is-open" : ""]
    .filter(Boolean)
    .join(" ");
  const artists = preview?.artists || [];
  const notes = pickedPlaylist ? notesFor(pickedPlaylist.name) : null;

  return (
    <div
      ref={rowRef}
      className={`shelf-row${panelOpen ? " is-picking" : ""}`}
    >
      <figure
        className="shelf-tray"
        ref={trayRef}
        aria-label="Your playlists as CDs"
      >
        <div className="shelf-tray-inner">
          <ul className="shelf-cases" ref={scrollRef}>
            {playlists.map((p, i) => {
              const selected = picked === p.id || loadingId === p.id;
              const out = picked && picked !== p.id;
              const tone = toneOf(i);
              return (
                <li
                  key={p.id}
                  className={`shelf-slot${out ? " is-out" : ""}`}
                >
                  <button
                    type="button"
                    className={`shelf-case cd-spine--${tone}${selected ? " is-selected" : ""}`}
                    onClick={() => selectPack(p.id)}
                    disabled={busy}
                    aria-label={p.name}
                    title={p.name}
                  >
                    <span className="shelf-spine">{p.name}</span>
                    <span className="shelf-face">
                      {p.liked ? (
                        <span className="shelf-face-fallback liked">♥</span>
                      ) : p.cover ? (
                        <img src={p.cover} alt="" draggable={false} />
                      ) : (
                        <span className="shelf-face-fallback">♪</span>
                      )}
                      <span className="shelf-hinge" aria-hidden="true" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="shelf-tray-footer">
          <figcaption className="shelf-tray-caption">your shelf</figcaption>
          <p className="shelf-tray-hint">swipe / drag for more</p>
        </div>
      </figure>

      <aside
        className={panelClass}
        aria-hidden={!panelOpen}
        aria-live="polite"
      >
        {pickedPlaylist && pickedIndex >= 0 ? (
          <div
            className={[
              "cd-insert",
              "shelf-insert",
              `cd-spine--${toneOf(pickedIndex)}`,
            ].join(" ")}
          >
            <div className="cd-insert-head">
              <h2 className="cd-insert-title">
                {pickedPlaylist.name}
              </h2>
              <p className="cd-insert-meta">
                {pickedPlaylist.total} tracks · {notes || "burned for you"}
              </p>
            </div>
            <div className="cd-insert-body shelf-insert-body">
              {preview?.loading ? (
                <p className="cd-insert-feat">Loading…</p>
              ) : artists.length > 0 ? (
                <div className="cd-insert-feat-block">
                  <p className="cd-insert-feat">Featuring</p>
                  <ol className="cd-insert-tracks">
                    {artists.map((name, i) => (
                      <li key={name}>
                        <span className="n">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span>{name}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
            <div className="cd-insert-actions">
              <button
                type="button"
                className="cd-insert-back"
                onClick={putBack}
                disabled={busy}
              >
                Put Back
              </button>
              <button
                type="button"
                className="cd-insert-play"
                onClick={confirmPlay}
                disabled={busy}
              >
                {loadingId === pickedPlaylist.id ? "…" : "► Put in Player"}
              </button>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
