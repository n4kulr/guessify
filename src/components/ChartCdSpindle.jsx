const TONES = [
  "clear", "white", "black", "grey", "smoke", "amber", "slate", "frost",
  "blue", "purple", "yellowed",
];
const FONTS = ["", "hand", "serif", "mono", "thin", "condensed"];
const HISTORIES = [
  ["new"],
  ["used"],
  ["faded"],
  ["used", "cracked"],
  ["faded", "cracked"],
  ["used", "sticker"],
  ["new"],
  ["used"],
  ["faded"],
  ["cracked"],
];
const WIDTHS = [0.82, 0.9, 0.95, 1, 1.05, 1.1, 1.15, 1.22];
const TILTS = [-0.5, -0.3, 0, 0, 0, 0.2, 0.4, 0.55];
const DEPTHS = [0, 0, 0, 1, 2, -1, -2];

const STICKERS = [
  null,
  { kind: "round", text: "★", cls: "star", x: "22%", y: "12%", rot: 8 },
  { kind: "price", text: "$4.99", x: "14%", y: "70%", rot: 6 },
  { kind: "square", text: "MIX", x: "18%", y: "16%", rot: -4 },
  { kind: "lib", text: "LIVE", x: "12%", y: "78%", rot: 2 },
  { kind: "round", text: "♥", cls: "heart", x: "28%", y: "20%", rot: -10 },
  { kind: "square", text: "NEW", x: "20%", y: "10%", rot: 3 },
  { kind: "square", text: "2008", x: "10%", y: "58%", rot: -11, peel: true },
  { kind: "price", text: "$2.50", x: "24%", y: "22%", rot: 9, peel: true },
  { kind: "lib", text: "VOL.2", x: "16%", y: "74%", rot: -2 },
  null,
  { kind: "round", text: "★", cls: "star", x: "30%", y: "14%", rot: 0 },
];

/** Deterministic wear/personality per index (stable across renders). */
function spineMeta(i) {
  return {
    tone: TONES[i % TONES.length],
    font: FONTS[i % FONTS.length],
    history: HISTORIES[i % HISTORIES.length],
    wScale: WIDTHS[i % WIDTHS.length],
    tilt: TILTS[(i * 3) % TILTS.length],
    depth: DEPTHS[(i * 5) % DEPTHS.length],
    sticker: STICKERS[i % STICKERS.length],
    titleTilt: i % 7 === 3,
  };
}

/** Top-down CD storage tray — worn jewel-case spines (genre labels unchanged). */
export default function ChartCdSpindle({ packs, loadingId, onChoose }) {
  const busy = loadingId !== null;

  return (
    <figure className="cd-tray" aria-label="Chart packs as a CD storage box">
      <div className="cd-tray-inner">
        <ul className="cd-spines">
          {packs.map((pack, i) => {
            const id = `chart:${pack.tag}`;
            const selected = loadingId === id;
            const meta = spineMeta(i);
            const histCls = meta.history.map((h) => `cd-spine--${h}`).join(" ");
            const fontCls = meta.font ? `cd-spine--font-${meta.font}` : "";
            const tiltCls = meta.titleTilt ? "cd-spine--title-tilt" : "";

            return (
              <li
                key={pack.tag}
                className={`cd-spine-slot${selected ? " is-out" : ""}`}
              >
                <button
                  type="button"
                  className={`cd-spine cd-spine--${meta.tone} ${histCls} ${fontCls} ${tiltCls}${selected ? " is-selected" : ""}`.trim()}
                  style={{
                    "--w-scale": meta.wScale,
                    "--tilt": `${meta.tilt}deg`,
                    "--depth": `${meta.depth}px`,
                  }}
                  onClick={() => onChoose(pack.tag)}
                  disabled={busy}
                  aria-label={pack.label}
                  title={pack.label}
                >
                  <span className="cd-spine-title">
                    {selected ? "…" : pack.label}
                  </span>
                  {pack.blurb ? (
                    <span className="cd-spine-sub">{pack.blurb}</span>
                  ) : null}
                  {meta.history.includes("cracked") ? (
                    <span className="cd-crack" aria-hidden="true" />
                  ) : null}
                  {meta.sticker ? (
                    <span
                      className={`cd-sticker cd-sticker--${meta.sticker.kind}${
                        meta.sticker.cls ? ` ${meta.sticker.cls}` : ""
                      }${meta.sticker.peel ? " cd-sticker--peel" : ""}`}
                      style={{
                        left: meta.sticker.x,
                        top: meta.sticker.y,
                        transform: `rotate(${meta.sticker.rot || 0}deg)`,
                      }}
                      aria-hidden="true"
                    >
                      {meta.sticker.text}
                    </span>
                  ) : null}
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
