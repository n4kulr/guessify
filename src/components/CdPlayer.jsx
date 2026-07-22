import { useEffect, useRef, useState } from "react";
import { playCassetteButton } from "../cassetteSounds.js";

const TRACKS = [
  {
    title: "Marvin's Room",
    artist: "Drake",
    cover:
      "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/d2/53/62/d2536245-b94c-b3fd-7168-9512f655f6d4/00602527899091.rgb.jpg/300x300bb.jpg",
  },
  {
    title: "It's Nice To Have A Friend",
    artist: "Taylor Swift",
    cover:
      "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/49/3d/ab/493dab54-f920-9043-6181-80993b8116c9/19UMGIM53909.rgb.jpg/300x300bb.jpg",
  },
  {
    title: "House of Balloons",
    artist: "The Weeknd",
    cover:
      "https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/31/18/fa/3118fab0-90ea-2ae5-cf6c-bc64054ab9e3/21UMGIM21449.rgb.jpg/300x300bb.jpg",
  },
  {
    title: "Thinkin Bout You",
    artist: "Frank Ocean",
    cover:
      "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/04/f8/63/04f863fc-2852-604f-c910-a97ac069506b/12UMGIM40339.rgb.jpg/300x300bb.jpg",
  },
  {
    title: "Lovers Rock",
    artist: "TV Girl",
    cover:
      "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/3d/09/0c/3d090c87-f02b-3c3c-cedf-603cc900082f/888174780955_cover.jpg/300x300bb.jpg",
  },
];

function isDesktop() {
  return window.matchMedia("(min-width: 821px)").matches;
}

/** Desktop-only peek CD player — expands on click, no backdrop dim. */
export default function CdPlayer() {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [trackIdx, setTrackIdx] = useState(0);
  const [dragX, setDragX] = useState(0);
  const drag = useRef({ active: false, startX: 0, dx: 0 });
  const track = TRACKS[trackIdx];

  useEffect(() => {
    if (!open) setDragX(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function openPlayer() {
    if (!isDesktop()) return;
    if (!open) setOpen(true);
  }

  function closePlayer() {
    setOpen(false);
    setDragX(0);
  }

  function onShellClick() {
    if (!isDesktop()) return;
    if (!open) setOpen(true);
  }

  function tapControl(i, e) {
    e.stopPropagation();
    playCassetteButton(i);
    if (i === 0) {
      setTrackIdx((n) => (n - 1 + TRACKS.length) % TRACKS.length);
    } else if (i === 1) {
      setPlaying(true);
    } else if (i === 2) {
      setPlaying(false);
    } else if (i === 3) {
      setTrackIdx((n) => (n + 1) % TRACKS.length);
    }
  }

  function onPointerDown(e) {
    if (!open || !isDesktop()) return;
    if (e.target.closest?.(".cd-ctrl")) return;
    drag.current = { active: true, startX: e.clientX, dx: 0 };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onPointerMove(e) {
    if (!drag.current.active) return;
    const dx = Math.max(0, e.clientX - drag.current.startX);
    drag.current.dx = dx;
    setDragX(dx);
  }

  function onPointerUp() {
    if (!drag.current.active) return;
    const dx = drag.current.dx;
    drag.current.active = false;
    if (dx > 88) closePlayer();
    else setDragX(0);
  }

  const dragStyle =
    open && dragX > 0
      ? { transform: `translateX(${dragX}px)`, transition: "none" }
      : undefined;

  return (
    <div className="cd-dock">
      <div
        className={`cd-player${open ? " cd-player--open" : " cd-player--peek"}`}
        style={dragStyle}
        onClick={onShellClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="presentation"
      >
        <div className="cd-peek-tab" aria-hidden="true">
          cd
        </div>

        <div className="cd-shell">
          <div className="cd-head">
            <span className="cd-brand">guessify</span>
            <span className="cd-mode">{playing ? "play" : "pause"}</span>
          </div>

          <div className={`cd-disc-wrap${playing ? " is-spinning" : ""}`}>
            <div className="cd-disc">
              <img
                key={track.cover}
                className="cd-art"
                src={track.cover}
                alt=""
                draggable={false}
                decoding="async"
              />
              <span className="cd-hub" aria-hidden="true" />
            </div>
          </div>

          <div className="cd-lcd">
            <span className="cd-lcd-track">
              {String(trackIdx + 1).padStart(2, "0")}
            </span>
            <div className="cd-lcd-meta">
              <span className="cd-lcd-title">{track.title}</span>
              <span className="cd-lcd-artist">{track.artist}</span>
            </div>
          </div>

          <div className="cd-controls">
            {[
              { i: 0, label: "previous", icon: "⏮" },
              { i: 1, label: "play", icon: "▶" },
              { i: 2, label: "pause", icon: "⏸" },
              { i: 3, label: "next", icon: "⏭" },
            ].map((c) => (
              <button
                key={c.label}
                type="button"
                className={`cd-ctrl${(c.i === 1 && playing) || (c.i === 2 && !playing) ? " is-active" : ""}`}
                aria-label={c.label}
                onClick={(e) => tapControl(c.i, e)}
              >
                {c.icon}
              </button>
            ))}
          </div>

          {open && (
            <button
              type="button"
              className="cd-close"
              aria-label="Close CD player"
              onClick={(e) => {
                e.stopPropagation();
                closePlayer();
              }}
            >
              tuck away
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
