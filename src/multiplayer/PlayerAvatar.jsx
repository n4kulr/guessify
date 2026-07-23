import { peepSrc, PEEP_COUNT } from "./constants.js";

/** Open Peeps bust filling a colored circle. */
export default function PlayerAvatar({ avatar, size = 40, className = "" }) {
  const raw = Number(avatar?.peep);
  const peep =
    Number.isFinite(raw) && raw >= 1 && raw <= PEEP_COUNT ? Math.floor(raw) : 1;
  const color =
    typeof avatar?.color === "string" && /^#[0-9a-fA-F]{6}$/.test(avatar.color)
      ? avatar.color
      : "#e2b714";

  return (
    <span
      className={`mp-avatar ${className}`}
      style={{
        width: size,
        height: size,
        background: color,
      }}
    >
      <img key={peep} src={peepSrc(peep)} alt="" draggable={false} />
    </span>
  );
}
