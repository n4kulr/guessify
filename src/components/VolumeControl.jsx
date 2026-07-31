import { useEffect, useRef, useState } from "react";
import { getVolume, setVolume, subscribeVolume } from "../volume.js";
import { MuteIcon, VolumeLowIcon, VolumeHighIcon } from "./icons.jsx";

function SpeakerIcon({ level }) {
  // level: 0 muted, 1 low, 2 high
  const Icon = level === 0 ? MuteIcon : level === 1 ? VolumeLowIcon : VolumeHighIcon;
  return <Icon className="volume-ico" width="16" height="16" />;
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
