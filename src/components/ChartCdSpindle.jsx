const SPINE_TONES = ["clear", "white", "black", "grey", "smoke", "amber", "slate", "frost"];

/** Top-down CD storage tray — thin jewel-case spines only. */
export default function ChartCdSpindle({ packs, loadingId, onChoose }) {
  const busy = loadingId !== null;

  return (
    <figure className="cd-tray" aria-label="Chart packs as a CD storage box">
      <div className="cd-tray-inner">
        <ul className="cd-spines">
          {packs.map((pack, i) => {
            const id = `chart:${pack.tag}`;
            const selected = loadingId === id;
            const tone = SPINE_TONES[i % SPINE_TONES.length];
            return (
              <li key={pack.tag} className="cd-spine-slot">
                <button
                  type="button"
                  className={`cd-spine cd-spine--${tone}${selected ? " is-selected" : ""}`}
                  onClick={() => onChoose(pack.tag)}
                  disabled={busy}
                  aria-label={pack.label}
                  title={pack.label}
                >
                  <span className="cd-spine-title">
                    {selected ? "…" : pack.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <figcaption className="cd-tray-caption">cd case</figcaption>
    </figure>
  );
}
