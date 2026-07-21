import { peepSrc } from "./constants.js";

/** Open Peeps bust filling a colored circle. */
export default function PlayerAvatar({ avatar, size = 40, className = "" }) {
  const peep = avatar?.peep || 1;
  const color = avatar?.color || "#e2b714";

  return (
    <span
      className={`mp-avatar ${className}`}
      style={{
        width: size,
        height: size,
        background: color,
      }}
    >
      <img src={peepSrc(peep)} alt="" draggable={false} />
    </span>
  );
}
