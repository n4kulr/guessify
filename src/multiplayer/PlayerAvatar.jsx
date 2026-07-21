import { peepSrc } from "./constants.js";

/** Peep face on a mini vinyl disc. */
export default function PlayerAvatar({ avatar, size = 40, className = "" }) {
  const peep = avatar?.peep || 1;
  const color = avatar?.color || "#e2b714";
  const label = Math.round(size * 0.48);

  return (
    <span
      className={`mp-avatar ${className}`}
      style={{
        width: size,
        height: size,
        "--mp-label": color,
        "--mp-label-size": `${label}px`,
      }}
    >
      <span className="mp-avatar-label">
        <img src={peepSrc(peep)} alt="" draggable={false} />
      </span>
    </span>
  );
}
