/** Top-down CD spindle with orbiting chart-pack labels (CSS-mostly). */
export default function ChartCdSpindle({ packs, loadingId, onChoose }) {
  const n = packs.length;
  const busy = loadingId !== null;

  return (
    <figure
      className="cd-spindle"
      style={{ "--cd-n": n }}
      aria-label="Chart packs on a CD spindle"
    >
      <div className="cd-spindle-stage">
        <div className="cd-disc" tabIndex={0} aria-hidden="true">
          <div className="cd-disc-tray" />
          <div className="cd-disc-body">
            <div className="cd-disc-iris" />
            <div className="cd-disc-grooves" />
            <div className="cd-disc-sheen" />
            <div className="cd-disc-hole">
              <div className="cd-disc-hub" />
            </div>
          </div>
        </div>

        <ul className="cd-orbit">
          {packs.map((pack, i) => {
            const id = `chart:${pack.tag}`;
            const active = loadingId === id;
            return (
              <li
                key={pack.tag}
                className={`cd-orbit-item${active ? " is-loading" : ""}`}
                style={{ "--cd-i": i, "--cd-delay": `${0.08 + i * 0.05}s` }}
              >
                <span className="cd-spoke" aria-hidden="true" />
                <button
                  type="button"
                  className="cd-orbit-label"
                  onClick={() => onChoose(pack.tag)}
                  disabled={busy}
                  title={pack.blurb}
                  aria-label={`${pack.label}: ${pack.blurb}`}
                >
                  <span className="cd-orbit-dot" aria-hidden="true" />
                  <span className="cd-orbit-text">
                    {active ? "…" : pack.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <figcaption className="cd-spindle-caption">pick a disc</figcaption>
    </figure>
  );
}
