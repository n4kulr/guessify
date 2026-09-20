/**
 * Floating −pts flash (skip / hint). `token` remounts the animation.
 * A zero cost isn't a penalty — say so rather than flashing "−0".
 */
export default function PenaltyPop({ token, pts, className = "", onDone }) {
  if (!token) return null;
  const free = !Number(pts);
  return (
    <span
      key={token}
      className={`penalty-pop${free ? " penalty-pop--free" : ""}${className ? ` ${className}` : ""}`}
      onAnimationEnd={onDone}
      aria-hidden="true"
    >
      {free ? "free" : `−${pts}`}
    </span>
  );
}
