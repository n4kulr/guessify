/** Icon toggle: vinyl ↔ cassette display preference. */
export default function MediaModeToggle({ mode, onChange }) {
  return (
    <div className="media-mode-toggle" role="group" aria-label="Display style">
      <button
        type="button"
        className={`media-mode-btn ${mode === "vinyl" ? "is-active" : ""}`}
        aria-pressed={mode === "vinyl"}
        aria-label="Vinyl display"
        title="Vinyl"
        onClick={() => onChange("vinyl")}
      >
        <VinylIcon />
      </button>
      <button
        type="button"
        className={`media-mode-btn ${mode === "cassette" ? "is-active" : ""}`}
        aria-pressed={mode === "cassette"}
        aria-label="Cassette display"
        title="Cassette"
        onClick={() => onChange("cassette")}
      >
        <CassetteIcon />
      </button>
    </div>
  );
}

function VinylIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.92" />
      <circle
        cx="12"
        cy="12"
        r="7.2"
        fill="none"
        stroke="var(--bg-color)"
        strokeWidth="1.1"
        opacity="0.35"
      />
      <circle
        cx="12"
        cy="12"
        r="4.4"
        fill="none"
        stroke="var(--bg-color)"
        strokeWidth="1.1"
        opacity="0.35"
      />
      <circle cx="12" cy="12" r="2.4" fill="var(--bg-color)" />
      <circle cx="12" cy="12" r="0.7" fill="currentColor" />
    </svg>
  );
}

function CassetteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <rect
        x="2.5"
        y="5.5"
        width="19"
        height="13"
        rx="2.2"
        fill="currentColor"
        opacity="0.92"
      />
      <rect
        x="5.5"
        y="8"
        width="13"
        height="5.5"
        rx="1"
        fill="var(--bg-color)"
        opacity="0.85"
      />
      <circle cx="8.5" cy="10.75" r="1.55" fill="currentColor" />
      <circle cx="15.5" cy="10.75" r="1.55" fill="currentColor" />
      <rect
        x="6"
        y="15.2"
        width="12"
        height="1.6"
        rx="0.5"
        fill="var(--bg-color)"
        opacity="0.55"
      />
    </svg>
  );
}
