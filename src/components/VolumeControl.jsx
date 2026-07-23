import { useEffect, useRef, useState } from "react";
import { getVolume, setVolume, subscribeVolume } from "../volume.js";

function SpeakerIcon({ level }) {
  // level: 0 muted, 1 low, 2 high
  return (
    <svg
      className="volume-ico"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M3 9v6h4l5 4V5L7 9H3z"
      />
      {level === 0 ? (
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          d="M16 9l5 5M21 9l-5 5"
        />
      ) : (
        <>
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            d="M14.5 9.5a3.2 3.2 0 010 5"
          />
          {level >= 2 && (
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              d="M17 7.5a6 6 0 010 9"
            />
          )}
        </>
      )}
    </svg>
  );
}

export default function VolumeControl() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(() => getVolume());
  const ref = useRef(null);

  useEffect(() => subscribeVolume(setValue), []);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const level = value <= 0.001 ? 0 : value < 0.45 ? 1 : 2;
  const pct = Math.round(value * 100);

  return (
    <div className={`volume-control${open ? " is-open" : ""}`} ref={ref}>
      <div className="volume-tray" aria-hidden={!open}>
        <div className="volume-panel">
          <input
            className="volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={value}
            tabIndex={open ? 0 : -1}
            aria-label="Volume"
            aria-valuetext={`${pct}%`}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </div>
      </div>
      <button
        type="button"
        className="volume-btn"
        title={level === 0 ? "unmute" : "volume"}
        aria-expanded={open}
        aria-label={`Volume ${pct}%`}
        onClick={() => setOpen((o) => !o)}
        onContextMenu={(e) => {
          e.preventDefault();
          setVolume(value > 0.001 ? 0 : 0.7);
        }}
      >
        <SpeakerIcon level={level} />
      </button>
    </div>
  );
}
